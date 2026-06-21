import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);
const queue = new Queue('content-generation', { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'POST') {
    const { keyword, neuronWriterAccountId, websiteId, projectId } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword required' });

    // create or reuse a project - for now pick the first or create a default
    let project = null;
    if (projectId) project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      const existing = await prisma.project.findFirst({ where: { userId: user.id } });
      if (existing) project = existing;
      else project = await prisma.project.create({ data: { name: 'Default', userId: user.id } });
    }

    const keywordRecord = await prisma.keyword.create({ data: { keyword, projectId: project.id } });

    await queue.add('pipeline:start', { keywordId: keywordRecord.id, neuronWriterAccountId, websiteId, userId: user.id, projectId: project.id });

    return res.status(201).json({ id: keywordRecord.id });
  }
  res.setHeader('Allow', ['POST']);
  res.status(405).end('Method not allowed');
}
