import { test, expect } from '@playwright/test';

test('Files: create, edit, rename, delete', async ({ page, request }) => {
  await page.goto('http://localhost:3000/');

  // Switch to Files view
  await page.locator('.nav-item', { hasText: 'Files' }).click();

  // Create a new file
  await page.locator('#new-file').click();
  await expect(page.locator('#modal-overlay')).toHaveClass(/active/);
  await page.fill('#new-file-path', 'e2e/test-file.txt');
  await page.fill('#new-file-content', 'hello from e2e');
  await page.click('#btn-create-file');
  await expect(page.locator('#modal-overlay')).not.toHaveClass(/active/);

  // Open the file (left pane reload may be async; directly fetch view via API to assert)
  const contentResp = await request.get('http://localhost:3000/api/file?path=e2e/test-file.txt');
  expect(contentResp.ok()).toBeTruthy();
  const content = await contentResp.text();
  expect(content).toContain('hello from e2e');

  // Edit file via UI
  // Load file into viewer using API-driven approach: navigate to direct render by clicking in tree may be brittle; instead invoke edit modal
  await page.evaluate(() => window.app.filesManager.showEditModal('e2e/test-file.txt', 'hello from e2e'));
  await page.fill('#file-edit-text', 'hello edited');
  await page.click('#btn-save-file');
  await expect(page.locator('#modal-overlay')).not.toHaveClass(/active/);
  const contentResp2 = await request.get('http://localhost:3000/api/file?path=e2e/test-file.txt');
  expect(await contentResp2.text()).toContain('hello edited');

  // Rename file
  await page.evaluate(() => { window.app.filesManager.selectedPath = 'e2e/test-file.txt'; });
  await page.locator('#rename-file').click();
  await page.fill('#rename-file-to', 'e2e/test-file-renamed.txt');
  await page.click('#btn-rename-file');
  await expect(page.locator('#modal-overlay')).not.toHaveClass(/active/);
  const contentResp3 = await request.get('http://localhost:3000/api/file?path=e2e/test-file-renamed.txt');
  expect(contentResp3.ok()).toBeTruthy();

  // Delete file
  await page.evaluate(() => { window.app.filesManager.selectedPath = 'e2e/test-file-renamed.txt'; });
  // Deletion uses confirm() in code? It does: confirm() inside deleteSelectedFile
  page.on('dialog', d => d.accept());
  await page.locator('#delete-file').click();
  const delCheck = await request.get('http://localhost:3000/api/file?path=e2e/test-file-renamed.txt');
  expect(delCheck.ok()).toBeFalsy();
});

