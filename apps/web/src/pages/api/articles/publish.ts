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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  const { articleId, websiteId, publishAs = 'publish' } = req.body;
  if (!articleId || !websiteId) return res.status(400).json({ error: 'articleId and websiteId required' });

  const article = await prisma.article.findUnique({ where: { id: articleId }, include: { keyword: true, images: true } });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return res.status(404).json({ error: 'Website not found' });

  await queue.add('publish:article', { articleId, websiteId, publishAs, userId: user.id });
  return res.status(202).json({ message: 'Publish job enqueued' });
}
