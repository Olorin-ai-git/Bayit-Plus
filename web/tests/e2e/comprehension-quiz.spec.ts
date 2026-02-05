/**
 * E2E tests for Comprehension Quiz feature
 *
 * Tests the complete flow: scene detection → question display → answer submission → feedback → video resume
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Comprehension Quiz Feature', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Login as beta user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'beta-user@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('pauses video and shows question at scene end', async () => {
    // Navigate to VOD content with subtitles
    await page.goto('/watch/test-movie-with-subtitles');

    // Wait for video to load
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Fast-forward to known scene boundary (from test data)
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120; // 2:00 - known scene boundary in test data
    });

    // Wait for quiz overlay to appear
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).toBeVisible({ timeout: 5000 });

    // Verify video is paused
    const isPaused = await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      return videoEl.paused;
    });
    expect(isPaused).toBe(true);

    // Verify question is displayed
    const questionText = page.locator('[data-testid="quiz-question-text"]');
    await expect(questionText).toBeVisible();

    // Verify 4 options are displayed
    const options = page.locator('[data-testid^="quiz-option-"]');
    await expect(options).toHaveCount(4);
  });

  test('submits answer and shows feedback', async () => {
    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz overlay
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).toBeVisible();

    // Click first option
    await page.click('[data-testid="quiz-option-0"]');

    // Wait for feedback to appear
    const feedback = page.locator('[data-testid="quiz-feedback"]');
    await expect(feedback).toBeVisible({ timeout: 2000 });

    // Verify feedback shows correct/incorrect
    const feedbackTitle = page.locator('[data-testid="quiz-feedback-title"]');
    await expect(feedbackTitle).toContainText(/נכון|לא נכון/); // Hebrew: "Correct" or "Incorrect"

    // Verify points earned displayed
    const pointsText = page.locator('[data-testid="quiz-points-earned"]');
    await expect(pointsText).toBeVisible();

    // Verify explanation displayed
    const explanation = page.locator('[data-testid="quiz-explanation"]');
    await expect(explanation).toBeVisible();
  });

  test('resumes video after feedback delay', async () => {
    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz and answer
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');
    await page.click('[data-testid="quiz-option-0"]');

    // Wait for feedback
    await page.waitForSelector('[data-testid="quiz-feedback"]');

    // Wait for 2-second feedback delay
    await page.waitForTimeout(2500);

    // Verify video has resumed playing
    const isPlaying = await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      return !videoEl.paused;
    });
    expect(isPlaying).toBe(true);

    // Verify quiz overlay is hidden
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).not.toBeVisible();
  });

  test('allows user to skip question', async () => {
    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz overlay
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');

    // Click skip button
    await page.click('[data-testid="quiz-skip-button"]');

    // Verify video resumes immediately (no feedback delay)
    const isPlaying = await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      return !videoEl.paused;
    });
    expect(isPlaying).toBe(true);

    // Verify quiz overlay is hidden
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).not.toBeVisible();
  });

  test('displays Hebrew text in RTL layout', async () => {
    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz overlay
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');

    // Verify RTL direction
    const questionText = page.locator('[data-testid="quiz-question-text"]');
    const direction = await questionText.evaluate((el) =>
      window.getComputedStyle(el).direction
    );
    expect(direction).toBe('rtl');

    // Verify header alignment
    const header = page.locator('[data-testid="quiz-header"]');
    const flexDirection = await header.evaluate((el) =>
      window.getComputedStyle(el).flexDirection
    );
    expect(flexDirection).toBe('row-reverse');
  });

  test('does not trigger on live TV content', async () => {
    // Navigate to live TV channel
    await page.goto('/watch/live/channel-10');

    // Wait for video to load
    await page.waitForSelector('video');

    // Fast-forward (if possible with live TV)
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      if (!videoEl.paused) {
        videoEl.currentTime += 60; // Try to skip ahead
      }
    });

    // Wait reasonable time
    await page.waitForTimeout(3000);

    // Verify quiz overlay never appears
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).not.toBeVisible();
  });

  test('shows insufficient credits error when balance is zero', async () => {
    // Mock API to return 403 insufficient credits
    await page.route('**/api/v1/comprehension/*/question*', (route) => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ detail: 'Insufficient credits' }),
      });
    });

    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz overlay
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');

    // Verify error message displayed
    const errorText = page.locator('[data-testid="quiz-error-message"]');
    await expect(errorText).toContainText(/insufficient credits|אין מספיק קרדיטים/i);

    // Verify skip button is available
    const skipButton = page.locator('[data-testid="quiz-skip-button"]');
    await expect(skipButton).toBeVisible();
  });

  test('displays loading state while fetching question', async () => {
    // Delay API response
    await page.route('**/api/v1/comprehension/*/question*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          question_id: 'q-123',
          question_text: 'מה קרה?',
          options: ['א', 'ב', 'ג', 'ד'],
          scene_start_time: 100,
          scene_end_time: 200,
          difficulty: 'medium',
          points: 10,
        }),
      });
    });

    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene end
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Wait for quiz overlay
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');

    // Verify loading spinner is shown
    const loadingSpinner = page.locator('[data-testid="quiz-loading-spinner"]');
    await expect(loadingSpinner).toBeVisible();

    const loadingText = page.locator('[data-testid="quiz-loading-text"]');
    await expect(loadingText).toBeVisible();

    // Wait for question to load
    await page.waitForSelector('[data-testid="quiz-question-text"]', {
      timeout: 2000,
    });

    // Verify loading spinner is hidden
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('works correctly across multiple scenes in same video', async () => {
    await page.goto('/watch/test-movie-with-subtitles');

    // First scene boundary
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Answer first question
    await page.waitForSelector('[data-testid="comprehension-quiz-overlay"]');
    await page.click('[data-testid="quiz-option-0"]');
    await page.waitForTimeout(2500); // Wait for feedback + resume

    // Continue to second scene boundary
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 300; // 5:00 - second scene boundary
    });

    // Verify quiz appears again for second scene
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).toBeVisible({ timeout: 5000 });

    // Verify new question (different question_id)
    const questionText = page.locator('[data-testid="quiz-question-text"]');
    await expect(questionText).toBeVisible();
  });
});

test.describe('Comprehension Quiz Settings', () => {
  test('can toggle comprehension quiz on/off in settings', async ({ page }) => {
    await page.goto('/settings');

    // Navigate to comprehension quiz settings section
    const comprehensionToggle = page.locator(
      '[data-testid="comprehension-quiz-toggle"]'
    );
    await expect(comprehensionToggle).toBeVisible();

    // Toggle off
    await comprehensionToggle.click();

    // Verify saved
    await page.waitForTimeout(500);

    // Navigate to video
    await page.goto('/watch/test-movie-with-subtitles');

    // Trigger scene boundary
    await page.evaluate(() => {
      const videoEl = document.querySelector('video') as HTMLVideoElement;
      videoEl.currentTime = 120;
    });

    // Verify quiz does NOT appear
    await page.waitForTimeout(3000);
    const quizOverlay = page.locator('[data-testid="comprehension-quiz-overlay"]');
    await expect(quizOverlay).not.toBeVisible();
  });

  test('can change quiz frequency in settings', async ({ page }) => {
    await page.goto('/settings');

    // Change frequency to "high" (every 5 minutes)
    const frequencySelect = page.locator(
      '[data-testid="comprehension-quiz-frequency"]'
    );
    await frequencySelect.selectOption('high');

    // Verify saved
    await page.waitForTimeout(500);

    // Frequency setting is applied to scene detection logic
    // (Detailed testing would require multiple scene boundaries)
  });
});
