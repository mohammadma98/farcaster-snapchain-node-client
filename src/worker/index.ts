import { FeedWorker } from '../lib/sync/feed-worker';

const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';
const maxCasts = parseInt(process.env.MAX_FEED_CASTS || '1000', 10);
const pollIntervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '2500', 10);

console.log(`[Worker Entrypoint] Initializing Sovereign Feed Indexer (Node: ${nodeUrl}, Max: ${maxCasts} casts)...`);

const worker = new FeedWorker({
  nodeUrl,
  maxCasts,
  pollIntervalMs,
});

worker.start().catch((err) => {
  console.error('[Worker Entrypoint] Fatal startup failure:', err);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log(`[Worker Entrypoint] Caught ${sig}, terminating worker...`);
    await worker.stop();
    process.exit(0);
  });
}
