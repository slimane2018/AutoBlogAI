import { Worker, QueueScheduler, Queue } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '@/lib/prisma';
import { fetchNeuronBrief } from './services/neuronwriter';
import { generateOutline, generateArticle } from './services/openai';
import { decrypt } from './utils/crypto';
import { publishPost, uploadMedia, createTagIfNotExists } from './services/wordpress';
import { processImageBuffer } from './services/imageProcessor';
import fetch from 'node-fetch';

const connection = new IORedis(process.env.REDIS_URL!);
new QueueScheduler('content-generation', { connection });
const publishQueue = new Queue('content-generation', { connection });

const worker = new Worker(
  'content-generation',
  async job => {
    console.log(`Processing job ${job.id} ${job.name}`);
    if (job.name === 'pipeline:start') {
      const { keywordId, neuronWriterAccountId, websiteId } = job.data as any;
      const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
      if (!keyword) throw new Error('Keyword not found');

      // 1. Fetch NeuronWriter brief
      const brief = await fetchNeuronBrief(neuronWriterAccountId, keyword.keyword);
      const briefRecord = await prisma.brief.create({
        data: {
          neuronWriterId: brief.id,
          keywordId: keyword.id,
          targetKeyword: brief.targetKeyword,
          nlpTerms: brief.nlpTerms as any,
          competitorHeadings: brief.competitorHeadings as any,
          recommendedWords: brief.recommendedWords,
          searchIntent: brief.searchIntent,
          questions: brief.questions as any,
          internalLinks: brief.internalLinks as any,
          rawResponse: brief.raw,
        },
      });
      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: 'BRIEF_RETRIEVED' } });

      // 2. Generate outline
      const outlineResult = await generateOutline(brief);
      const outline = await prisma.outline.create({ data: { keywordId: keyword.id, sections: outlineResult.sections as any } });
      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: 'OUTLINE_CREATED' } });

      // 3. Generate article
      const articleResult = await generateArticle({ brief, outline: outlineResult });

      const article = await prisma.article.create({
        data: {
          title: articleResult.title,
          seoTitle: articleResult.seoTitle,
          slug: articleResult.slug,
          metaDescription: articleResult.metaDescription,
          content: articleResult.html,
          wordCount: articleResult.wordCount,
          readability: articleResult.readability,
          status: 'DRAFT',
          websiteId: websiteId,
          keywordId: keyword.id,
          outlineId: outline.id,
        },
      });

      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: 'ARTICLE_GENERATED' } });

      console.log(`Article ${article.id} created for keyword ${keyword.keyword}`);
    }

    if (job.name === 'publish:article') {
      const { articleId, websiteId, publishAs, categories = [], tags = [], featuredImageIndex } = job.data as any;
      const article = await prisma.article.findUnique({ where: { id: articleId }, include: { images: true } });
      if (!article) throw new Error('Article not found');
      const website = await prisma.website.findUnique({ where: { id: websiteId } });
      if (!website) throw new Error('Website not found');

      // decrypt WP password
      const wpPassword = decrypt(website.applicationPassword);
      try {
        // upload featured image if present
        let featuredMediaId: number | undefined;
        if (article.images && article.images.length > 0) {
          const idx = typeof featuredImageIndex === 'number' ? featuredImageIndex : 0;
          const img = article.images[idx];
          if (img) {
            const res = await fetch(img.url);
            if (res.ok) {
              const buf = Buffer.from(await res.arrayBuffer());
              // process image
              const processed = await processImageBuffer(buf);
              const mime = 'image/jpeg';
              const filename = `featured-${article.slug}.jpg`;
              const upload = await uploadMedia(website.siteUrl, website.username, wpPassword, processed as any, filename, mime);
              featuredMediaId = upload.id;
            }
          }
        }

        // ensure tags exist (tags array may be numeric IDs or strings)
        const tagIds: number[] = [];
        for (const t of tags) {
          if (typeof t === 'number') tagIds.push(t);
          else if (typeof t === 'string') {
            const id = await createTagIfNotExists(website.siteUrl, website.username, wpPassword, t);
            tagIds.push(id);
          }
        }

        const post = {
          title: article.title,
          content: article.content,
          status: publishAs === 'publish' ? 'publish' : 'draft',
          excerpt: article.metaDescription || undefined,
          featured_media: featuredMediaId,
          categories: Array.isArray(categories) ? categories : [],
          tags: tagIds,
        };

        const published = await publishPost(website.siteUrl, website.username, wpPassword, post);

        await prisma.publishingLog.create({ data: { articleId: article.id, websiteId: website.id, status: 'SUCCESS', remoteId: String(published.id), response: published } });
        await prisma.article.update({ where: { id: article.id }, data: { status: 'PUBLISHED' } });
      } catch (err: any) {
        console.error('Publish failed', err);
        await prisma.publishingLog.create({ data: { articleId: article.id, websiteId: website.id, status: 'FAILED', message: err.message, response: { error: err.message } } });
        await prisma.article.update({ where: { id: article.id }, data: { status: 'FAILED' } });
        throw err; // allow BullMQ to retry according to queue policy
      }
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Job failed ${job?.id} ${job?.name}`, err);
});

console.log('Worker started');
