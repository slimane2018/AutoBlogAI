import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` in development to prevent multiple instances
  // eslint-disable-next-line vars-on-top, no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
