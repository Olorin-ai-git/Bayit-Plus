/**
 * Discover Tab Test Fixtures
 *
 * Exports fixture data and shared auth helpers for Discover tab E2E tests.
 * Fixture data is sourced from test-fixtures.json when available, with
 * sensible test-environment defaults otherwise.
 */

import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FixtureUser {
  id: string;
  email: string;
  subscription_tier: "premium" | "basic" | "free";
  token: string;
}

export interface FixtureContent {
  plexContentId: string;
  youtubeContentId: string;
  liveChannelId: string;
  liveChannelSlug: string;
}

export interface DiscoverFixtures {
  premiumUser: FixtureUser;
  basicUser: FixtureUser;
  content: FixtureContent;
}

function loadFixtures(): DiscoverFixtures {
  const fixturePath = path.resolve(__dirname, "../../test-fixtures.json");
  if (fs.existsSync(fixturePath)) {
    const raw = fs.readFileSync(fixturePath, "utf-8");
    return JSON.parse(raw) as DiscoverFixtures;
  }
  return {
    premiumUser: {
      id: "test-premium-user-123",
      email: "premium@bayitplus.com",
      subscription_tier: "premium",
      token: "test-premium-token",
    },
    basicUser: {
      id: "test-basic-user-456",
      email: "user@bayitplus.com",
      subscription_tier: "basic",
      token: "test-basic-token",
    },
    content: {
      plexContentId:
        process.env.TEST_PLEX_CONTENT_ID || "507f1f77bcf86cd799439011",
      youtubeContentId:
        process.env.TEST_YOUTUBE_CONTENT_ID || "507f1f77bcf86cd799439022",
      liveChannelId: process.env.TEST_LIVE_CHANNEL_ID || "channel-13",
      liveChannelSlug: process.env.TEST_LIVE_CHANNEL_SLUG || "channel-13",
    },
  };
}

export const fixtures: DiscoverFixtures = loadFixtures();

export async function mockAuthPremium(page: Page): Promise<void> {
  const user = fixtures.premiumUser;
  await page.evaluate(
    ({ token, id, email, subscription_tier }) => {
      const mockAuthState = {
        state: {
          token,
          user: { id, email, subscription_tier },
          isAuthenticated: true,
        },
      };
      localStorage.setItem("bayit-auth", JSON.stringify(mockAuthState));
    },
    {
      token: user.token,
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
    },
  );
}

export async function mockAuthBasic(page: Page): Promise<void> {
  const user = fixtures.basicUser;
  await page.evaluate(
    ({ token, id, email, subscription_tier }) => {
      const mockAuthState = {
        state: {
          token,
          user: { id, email, subscription_tier },
          isAuthenticated: true,
        },
      };
      localStorage.setItem("bayit-auth", JSON.stringify(mockAuthState));
    },
    {
      token: user.token,
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
    },
  );
}

export async function setLanguage(page: Page, lang: string): Promise<void> {
  await page.evaluate((language) => {
    localStorage.setItem("bayit-language", language);
    localStorage.setItem("i18nextLng", language);
  }, lang);
}
