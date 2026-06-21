import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "@/lib/prisma";
import { decrypt } from "@/utils/crypto";
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method not allowed");
  }

  const { accountId, keyword } = req.body;
  if (!accountId || !keyword) return res.status(400).json({ error: "accountId and keyword required" });

  const account = await prisma.neuronWriterAccount.findUnique({ where: { id: accountId } });
  if (!account) return res.status(404).json({ error: "NeuronWriter account not found" });

  const apiKey = decrypt(account.apiKey);

  try {
    // Call NeuronWriter API to create/fetch a brief - placeholder example
    const resp = await fetch("https://api.neuronwriter.com/v1/briefs", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "NeuronWriter API error", detail: text });
    }
    const json = await resp.json();

    // store brief reference
    const brief = await prisma.brief.create({
      data: {
        neuronWriterId: json.id,
        keyword: {
          create: { keyword, project: { connect: { id: null } } },
        } as any,
        rawResponse: json,
      },
    });

    return res.status(200).json({ brief });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
