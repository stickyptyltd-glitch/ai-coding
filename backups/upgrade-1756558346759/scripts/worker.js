#!/usr/bin/env node
import { CodingAgent } from "../src/agent.js";
import { ToolChainManager } from "../src/tool-chains.js";

async function main() {
  const queueMod = await import("../src/queue.js");
  const q = await queueMod.createQueue();
  if (!q) {
    console.error("BullMQ not available; install bullmq and set REDIS_URL");
    process.exit(1);
  }
  const agent = new CodingAgent();
  await agent.initialize();
  const manager = new ToolChainManager();
  const worker = new q.Worker("chains", async (job) => {
    const { chainId, variables } = job.data || {};
    const chain = manager.getChain(chainId);
    if (!chain) throw new Error("chain not found");
    if (variables) Object.entries(variables).forEach(([k, v]) => chain.setVariable(k, v));
    await manager.executeChain(chainId, agent, {
      cancelled: () => job.isPaused(),
      onProgress: (p) => job.updateProgress(p)
    });
    return chain.getExecutionSummary();
  }, q.connection);
  worker.on("completed", (job) => console.log("job completed", job.id));
  worker.on("failed", (job, err) => console.error("job failed", job?.id, err.message));
}

main().catch((e) => { console.error(e); process.exit(1); });
