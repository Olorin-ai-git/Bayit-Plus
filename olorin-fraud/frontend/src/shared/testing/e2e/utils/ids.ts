import { Page, Response } from '@playwright/test';

export async function extractInvestigationId(page: Page): Promise<string> {
  const urlId = await getInvestigationIdFromUrl(page);
  if (urlId) return urlId;

  const notificationId = await getInvestigationIdFromNotification(page);
  if (notificationId) return notificationId;

  throw new Error('Unable to extract investigation ID from URL or notifications');
}

export async function getInvestigationIdFromUrl(page: Page): Promise<string | null> {
  const url = page.url();

  const matchPatterns = [
    /\/investigation\/([a-f0-9-]+)/i,
    /id[=:]([a-f0-9-]+)/i,
    /investigation[?&]id[=]([a-f0-9-]+)/i,
    /\?id=([a-f0-9-]+)/,
    /#\/([a-f0-9-]+)/,
  ];

  for (const pattern of matchPatterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export async function getInvestigationIdFromResponse(response: Response): Promise<string | null> {
  if (!response.ok()) {
    return null;
  }

  try {
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const json = await response.json();

    const idFields = ['id', 'investigation_id', 'investigationId', 'incident_id'];
    for (const field of idFields) {
      const value = (json as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getInvestigationIdFromNotification(page: Page): Promise<string | null> {
  const notificationSelectors = [
    '[role="alert"]',
    '.toast',
    '.notification',
    '.snackbar',
    '[data-testid="notification"]',
  ];

  for (const selector of notificationSelectors) {
    const element = await page.$(selector);
    if (element) {
      const text = await element.textContent();
      if (text) {
        const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (match?.[0]) {
          return match[0];
        }

        const shortMatch = text.match(/ID[:\s]+([a-f0-9\-]+)/i);
        if (shortMatch?.[1]) {
          return shortMatch[1];
        }
      }
    }
  }

  return null;
}

export function validateInvestigationId(id: string): boolean {
  const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const hexPattern = /^[a-f0-9]+$/i;

  return uuidPattern.test(id) || (hexPattern.test(id) && id.length >= 8);
}
