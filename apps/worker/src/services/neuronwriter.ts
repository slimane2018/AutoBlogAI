import prisma from "@/lib/prisma";
import { decrypt } from "@/utils/crypto";
import fetch from "node-fetch";

export async function fetchNeuronBrief(accountId: string, keyword: string) {
  const account = await prisma.neuronWriterAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("NeuronWriter account not found");
  const apiKey = decrypt(account.apiKey);

  const resp = await fetch("https://api.neuronwriter.com/v1/briefs", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`NeuronWriter error: ${text}`);
  }
  const json = await resp.json();

  // map fields - adapt to real API response
  return {
    id: json.id || json.brief_id || `${keyword}-${Date.now()}`,
    targetKeyword: json.target_keyword || json.targetKeyword || keyword,
    nlpTerms: json.nlp_terms || json.nlpTerms || [],
    competitorHeadings: json.competitor_headings || [],
    recommendedWords: json.recommended_word_count || json.recommendedWords || null,
    searchIntent: json.search_intent || null,
    questions: json.questions || [],
    internalLinks: json.internal_links || [],
    raw: json,
  } as any;
}
