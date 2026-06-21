import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';
import { encrypt } from '@/utils/crypto';
import fetch from 'node-fetch';

function wpAuthHeader(username: string, appPassword: string) {
  return 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { articleId, websiteId, publishAs = 'publish', categories, tags, featuredImageIndex } = req.body;
  if (!articleId || !websiteId) return res.status(400).json({ error: 'articleId and websiteId required' });

  // basic validation
  if (categories && !Array.isArray(categories)) return res.status(400).json({ error: 'categories must be array' });
  if (tags && !Array.isArray(tags)) return res.status(400).json({ error: 'tags must be array' });

  // ensure article & website exist
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return res.status(404).json({ error: 'Article not found' });
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return res.status(404).json({ error: 'Website not found' });

  const queue = new (await import('bullmq')).Queue('content-generation', { connection: new (await import('ioredis')).default(process.env.REDIS_URL) });
  await queue.add('publish:article', { articleId, websiteId, publishAs, categories: categories || [], tags: tags || [], featuredImageIndex }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });

  return res.status(202).json({ message: 'Publish job enqueued' });
}
