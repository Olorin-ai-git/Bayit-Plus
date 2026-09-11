import { test, expect } from '@playwright/test';

test.describe('Bayit local review evidence', () => {
  test('normal mode does not render or request the review overlay', async ({ page }) => {
    const loaded: string[] = [];
    page.on('request', request => loaded.push(request.url()));
    await page.goto('/login');
    await expect(page.locator('[data-bayit-review-overlay]')).toHaveCount(0);
    expect(loaded.some(url => /reviewoverlay/i.test(url))).toBe(false);
  });

  test('review mode supports responsive keyboard pinning and a local JSON download', async ({ page }) => {
    await page.goto('/login?review=1');
    const panel = page.getByRole('complementary', { name: 'Bayit+ review' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Select element' })).toBeEnabled();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await panel.getByRole('button', { name: 'Select element' }).click();
    await page.keyboard.press('Enter');
    await expect(panel.getByLabel('Severity')).toBeFocused();
    if (page.viewportSize()!.width < 768) {
      const scrollport = await panel.evaluate(element => {
        const body = element.querySelector('.bayit-review-body')!;
        return { panelHeight: element.clientHeight, panelContent: element.scrollHeight,
          bodyHeight: body.clientHeight, bodyContent: body.scrollHeight };
      });
      expect(scrollport.panelContent).toBeGreaterThan(scrollport.panelHeight);
      expect(scrollport.bodyHeight).toBeGreaterThanOrEqual(scrollport.bodyContent);
      const observedLabel = panel.getByLabel('Observed behavior').locator('..');
      await observedLabel.scrollIntoViewIfNeeded();
      const labelBox = await observedLabel.boundingBox();
      const panelBox = await panel.boundingBox();
      expect(labelBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
      expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height);
    }
    await panel.getByLabel('Observed behavior').fill('The real page element is keyboard reachable.');
    await panel.getByLabel('Expected behavior').fill('Selection opens an accessible local review editor.');
    await panel.getByLabel('Remediation or no-code verification').fill('Verified selection, focus, panel bounds and JSON export at this viewport.');
    await panel.getByLabel('Disposition').selectOption('no-code');
    await panel.getByLabel('Finding state').selectOption('verified');
    await panel.getByRole('button', { name: 'Save pin' }).click();
    await expect(panel.getByRole('button', { name: 'Edit pin 1' })).toBeVisible();
    if (page.viewportSize()!.width >= 768) {
      await panel.getByRole('button', { name: 'Move panel left' }).click();
      await expect(panel).toHaveAttribute('data-review-panel-side', 'left');
      const movedBox = await panel.boundingBox();
      expect(movedBox!.x).toBeLessThan(box!.x);
      // Use the actual numbered pin so panel overlap cannot be hidden by list editing.
      await page.locator('.bayit-review-pin').click();
      await expect(panel.getByLabel('Observed behavior')).toHaveValue('The real page element is keyboard reachable.');
      await panel.getByRole('button', { name: 'Cancel' }).click();
      await panel.getByRole('button', { name: 'Move panel right' }).click();
      await expect(panel).toHaveAttribute('data-review-panel-side', 'right');
    } else {
      await expect(panel.getByRole('button', { name: 'Move panel left' })).toHaveCount(0);
    }
    const downloadEvent = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Export evidence' }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^bayit-review-evidence-[a-f0-9]{40}\.json$/);
    await page.reload();
    await expect(panel.getByRole('button', { name: 'Edit pin 1' })).toBeVisible();
    await panel.getByRole('button', { name: 'Delete pin 1' }).click();
    await expect(panel.getByRole('button', { name: 'Edit pin 1' })).toHaveCount(0);
  });
});
