import fetch from "node-fetch";

const OPENAI_BASE = "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = `You are a professional SEO content writer with expertise in semantic SEO, topical authority, EEAT principles, and human-first content creation.

Write comprehensive articles that:

* Fully satisfy search intent.
* Naturally incorporate NLP entities.
* Use conversational language.
* Avoid AI clichés.
* Include examples.
* Include actionable advice.
* Optimize for featured snippets.
* Optimize for Google Discover.
* Maintain high readability.
* Produce original content.`;

async function openAIChat(messages: any[], maxTokens = 1500) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${txt}`);
  }

  const json = await res.json();
  const choice = json.choices && json.choices[0];
  return choice.message.content;
}

export async function generateOutline(brief: any) {
  const userPrompt = `Given the following brief:\n\n${JSON.stringify(brief, null, 2)}\n\nCreate a detailed article outline as a JSON array of sections with heading, subheadings, and suggested word count for each section. Return only JSON.`;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }];
  const content = await openAIChat(messages, 1000);
  try {
    const sections = JSON.parse(content);
    return { sections };
  } catch (err) {
    // fallback: return as text
    return { sections: [{ heading: "Introduction", brief: content, wordTarget: 200 }] };
  }
}

export async function generateArticle({ brief, outline }: { brief: any; outline: any }) {
  const userPrompt = `Using the brief and outline below, generate a full SEO-optimized article in HTML. Include SEO title and meta description. Include FAQ and conclusion. Output JSON: { title, seoTitle, metaDescription, slug, html, wordCount, readability }. Brief: ${JSON.stringify(brief)} Outline: ${JSON.stringify(outline)}\nReturn only JSON.`;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }];
  const content = await openAIChat(messages, 2000);
  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    return { title: `${brief.targetKeyword} - Article`, seoTitle: brief.targetKeyword, metaDescription: `An article about ${brief.targetKeyword}`, slug: brief.targetKeyword.replace(/\s+/g, "-"), html: `<h1>${brief.targetKeyword}</h1><p>${content}</p>`, wordCount: 0, readability: 0 };
  }
}
