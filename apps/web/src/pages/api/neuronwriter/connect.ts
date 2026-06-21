import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "@/lib/prisma";
import { encrypt } from "@/utils/crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "POST") {
    const { apiKey, name } = req.body;
    if (!apiKey) return res.status(400).json({ error: "apiKey required" });

    const encrypted = encrypt(apiKey);
    const account = await prisma.neuronWriterAccount.create({
      data: {
        userId: user.id,
        apiKey: encrypted,
        name: name || "default",
      },
    });
    return res.status(201).json({ id: account.id });
  }

  if (req.method === "GET") {
    const accounts = await prisma.neuronWriterAccount.findMany({ where: { userId: user.id } });
    // do not return raw keys
    const safe = accounts.map(a => ({ id: a.id, name: a.name, createdAt: a.createdAt }));
    return res.status(200).json(safe);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end("Method not allowed");
}
