import { Worker, QueueScheduler } from "bullmq";
import IORedis from "ioredis";
import prisma from "@/lib/prisma";
import { fetchNeuronBrief } from "./services/neuronwriter";
import { generateOutline, generateArticle } from "./services/openai";

const connection = new IORedis(process.env.REDIS_URL!);
new QueueScheduler("content-generation", { connection });

const worker = new Worker(
  "content-generation",
  async job => {
    console.log(`Processing job ${job.id} ${job.name}`);
    if (job.name === "pipeline:start") {
      const { keywordId, neuronWriterAccountId, websiteId } = job.data as any;
      const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
      if (!keyword) throw new Error("Keyword not found");

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
      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: "BRIEF_RETRIEVED" } });

      // 2. Generate outline
      const outlineResult = await generateOutline(brief);
      const outline = await prisma.outline.create({ data: { keywordId: keyword.id, sections: outlineResult.sections as any } });
      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: "OUTLINE_CREATED" } });

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
          status: "DRAFT",
          websiteId: websiteId,
          keywordId: keyword.id,
          outlineId: outline.id,
        },
      });

      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: "ARTICLE_GENERATED" } });

      console.log(`Article ${article.id} created for keyword ${keyword.keyword}`);
    }
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Job failed ${job?.id} ${job?.name}`, err);
});

console.log("Worker started");
