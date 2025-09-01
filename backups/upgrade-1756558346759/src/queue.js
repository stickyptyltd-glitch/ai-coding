export async function createQueue() {
  try {
    const { Queue, Worker, QueueEvents } = await import('bullmq');
    const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } };
    const queue = new Queue('chains', connection);
    const events = new QueueEvents('chains', connection);
    return { queue, events, Worker, connection };
  } catch {
    return null; // bullmq not installed
  }
}

