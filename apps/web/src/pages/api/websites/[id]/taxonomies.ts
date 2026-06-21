import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';
import { decrypt } from '@/utils/crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: 'missing website id' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  // fetch categories & tags from WP
  const website = await prisma.website.findUnique({ where: { id } });
  if (!website) return res.status(404).json({ error: 'Website not found' });

  const wpPassword = decrypt(website.applicationPassword);
  try {
    const base = website.siteUrl.replace(/\/$/, '');
    const [catsRes, tagsRes] = await Promise.all([
      fetch(`${base}/wp-json/wp/v2/categories?per_page=100`, { headers: { Authorization: 'Basic ' + Buffer.from(`${website.username}:${wpPassword}`).toString('base64') } }),
      fetch(`${base}/wp-json/wp/v2/tags?per_page=100`, { headers: { Authorization: 'Basic ' + Buffer.from(`${website.username}:${wpPassword}`).toString('base64') } }),
    ]);

    const [catsJson, tagsJson] = await Promise.all([catsRes.json(), tagsRes.json()]);
    return res.status(200).json({ categories: catsJson, tags: tagsJson });
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch taxonomies', detail: err.message });
  }
}
