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

  if (req.method === 'GET') {
    const sites = await prisma.website.findMany({ where: { userId: user.id } });
    const safe = sites.map(s => ({ id: s.id, siteUrl: s.siteUrl, username: s.username, verified: s.verified, createdAt: s.createdAt }));
    return res.status(200).json(safe);
  }

  if (req.method === 'POST') {
    const { siteUrl, username, applicationPassword, name } = req.body;
    if (!siteUrl || !username || !applicationPassword) return res.status(400).json({ error: 'siteUrl, username and applicationPassword required' });

    // verify the site by calling /wp-json/wp/v2/users/me
    let verified = false;
    try {
      const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
      const resp = await fetch(url, { headers: { Authorization: wpAuthHeader(username, applicationPassword) } });
      verified = resp.ok;
    } catch (err) {
      verified = false;
    }

    const encrypted = encrypt(applicationPassword);
    const existing = await prisma.website.findFirst({ where: { siteUrl, userId: user.id } });
    if (existing) {
      const updated = await prisma.website.update({ where: { id: existing.id }, data: { username, applicationPassword: encrypted, verified } });
      return res.status(200).json({ id: updated.id });
    }

    const site = await prisma.website.create({ data: { siteUrl, username, applicationPassword: encrypted, verified, name, userId: user.id } });
    return res.status(201).json({ id: site.id });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method not allowed');
}
