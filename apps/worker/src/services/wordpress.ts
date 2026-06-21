import fetch from 'node-fetch';
import prisma from '@/lib/prisma';
import { decrypt } from '../utils/crypto';
import { processImageBuffer } from './imageProcessor';

function wpAuthHeader(username: string, appPassword: string) {
  return 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
}

export async function verifySite(siteUrl: string, username: string, appPassword: string) {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
  const resp = await fetch(url, { headers: { Authorization: wpAuthHeader(username, appPassword) } });
  return resp.ok;
}

export async function uploadMedia(siteUrl: string, username: string, appPassword: string, buffer: Buffer, filename: string, mimeType: string) {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(username, appPassword),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': mimeType,
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress media upload failed: ${text}`);
  }
  return res.json();
}

export async function createTagIfNotExists(siteUrl: string, username: string, appPassword: string, tagName: string) {
  // Attempt to find tag by name
  const base = siteUrl.replace(/\/$/, '');
  const searchRes = await fetch(`${base}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, { headers: { Authorization: wpAuthHeader(username, appPassword) } });
  if (!searchRes.ok) {
    // fallback to create
  } else {
    const items = await searchRes.json();
    const found = items.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
    if (found) return found.id;
  }

  // create
  const createRes = await fetch(`${base}/wp-json/wp/v2/tags`, {
    method: 'POST',
    headers: { Authorization: wpAuthHeader(username, appPassword), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: tagName }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Create tag failed: ${text}`);
  }
  const tagJson = await createRes.json();
  return tagJson.id;
}

export async function publishPost(siteUrl: string, username: string, appPassword: string, post: {
  title: string;
  content: string;
  status?: 'publish' | 'draft';
  excerpt?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: any;
}) {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress publish failed: ${text}`);
  }
  return res.json();
}

export async function updatePost(siteUrl: string, username: string, appPassword: string, remoteId: string | number, post: any) {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts/${remoteId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: wpAuthHeader(username, appPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress update failed: ${text}`);
  }
  return res.json();
}

export async function fetchPublishedPosts(siteUrl: string, username: string, appPassword: string, perPage = 100) {
  const url = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?status=publish&per_page=${perPage}`;
  const res = await fetch(url, { headers: { Authorization: wpAuthHeader(username, appPassword) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WordPress fetch posts failed: ${text}`);
  }
  return res.json();
}
