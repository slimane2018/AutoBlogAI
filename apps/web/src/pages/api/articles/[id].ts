import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: 'missing id' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  const article = await prisma.article.findUnique({ where: { id }, include: { images: true, keyword: true } });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  return res.status(200).json(article);
}
