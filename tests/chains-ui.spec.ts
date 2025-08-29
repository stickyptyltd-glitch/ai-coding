import { test, expect } from '@playwright/test';

test('Chains UI: run as job then see in Jobs view', async ({ page, request }) => {
  // Create a chain via API
  const create = await request.post('http://localhost:3000/api/chains', {
    data: {
      name: 'ui-chain-run',
      description: 'UI chain run as job',
      steps: [ { tool: 'log', params: { message: 'ui-run' } } ]
    }
  });
  expect(create.ok()).toBeTruthy();
  const chain = await create.json();

  await page.goto('http://localhost:3000/');
  await page.locator('.nav-item', { hasText: 'Chains' }).click();

  // Find the card by chain id or name and click Run as Job
  const card = page.locator('.chain-card', { hasText: 'ui-chain-run' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /Run as Job/i }).click();

  // Go to Jobs and refresh
  await page.locator('.nav-item', { hasText: 'Jobs' }).click();
  await page.click('#refresh-jobs');

  // Poll job list for completion state
  await expect(async () => {
    const jobs = await (await request.get('http://localhost:3000/api/jobs')).json();
    const found = (jobs.jobs || []).some((j: any) => j.type === 'chain' && (j.status === 'completed' || j.status === 'failed'));
    if (!found) throw new Error('Job not completed yet');
  }).toPass();
});

