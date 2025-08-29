import { test, expect } from '@playwright/test';

test('Chains: create simple chain and run as job, observe in Jobs UI', async ({ page, request }) => {
  // Create a simple chain via API
  const create = await request.post('http://localhost:3000/api/chains', {
    data: {
      name: 'e2e-simple-chain',
      description: 'E2E log chain',
      steps: [ { tool: 'log', params: { message: 'hello from e2e' } } ]
    }
  });
  expect(create.ok()).toBeTruthy();
  const chain = await create.json();
  expect(chain.id).toBeTruthy();

  // Execute as job via API
  const exec = await request.post(`http://localhost:3000/api/chains/${chain.id}/execute`, {
    data: { asJob: true }
  });
  expect(exec.ok()).toBeTruthy();
  const { jobId } = await exec.json();
  expect(jobId).toBeTruthy();

  // Open UI and navigate to Jobs view
  await page.goto('http://localhost:3000/');
  await page.locator('.nav-item', { hasText: 'Jobs' }).click();

  // Refresh jobs and wait for job to appear (it should complete quickly)
  await page.click('#refresh-jobs');
  await expect(async () => {
    const res = await request.get(`http://localhost:3000/api/jobs/${jobId}`);
    if (!res.ok()) throw new Error('Job not found yet');
    const j = await res.json();
    if (j.status !== 'completed' && j.status !== 'failed') throw new Error('Job not done');
  }).toPass();

  // Ensure the jobs list renders at least one card
  await expect(page.locator('#jobs-list .job-card')).toHaveCountGreaterThan(0);
});

