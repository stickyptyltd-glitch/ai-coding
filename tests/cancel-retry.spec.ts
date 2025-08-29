import { test, expect } from '@playwright/test';

test('Jobs: failing chain -> retry endpoint returns new job', async ({ request }) => {
  // Create a failing chain: modify non-existent file (continueOnError=false default)
  const create = await request.post('http://localhost:3000/api/chains', {
    data: {
      name: 'failing-chain',
      description: 'Should fail',
      steps: [ { tool: 'modify', params: { target: 'no/such/file.js', instructions: 'noop' } } ]
    }
  });
  expect(create.ok()).toBeTruthy();
  const chain = await create.json();

  // Execute as job
  const exec = await request.post(`http://localhost:3000/api/chains/${chain.id}/execute`, { data: { asJob: true } });
  expect(exec.ok()).toBeTruthy();
  const { jobId } = await exec.json();
  expect(jobId).toBeTruthy();

  // Wait for job to finish (likely failed)
  await expect(async () => {
    const res = await request.get(`http://localhost:3000/api/jobs/${jobId}`);
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    if (j.status !== 'completed' && j.status !== 'failed') throw new Error('not done');
  }).toPass();

  // Retry the job
  const retry = await request.post(`http://localhost:3000/api/jobs/${jobId}/retry`);
  expect(retry.ok()).toBeTruthy();
  const r = await retry.json();
  expect(r.jobId).toBeTruthy();
});

