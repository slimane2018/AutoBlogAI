/**
 * small queue helper so server pages can import if needed
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);
export const contentQueue = new Queue('content-generation', { connection });
