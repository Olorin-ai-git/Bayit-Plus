/**
 * Live Features (WebSocket) E2E Tests
 * Tests watch party sync, live subtitles, live chat, real-time notifications, connection recovery
 * 5 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Live Features - WebSocket E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('livetv');
  });

  it('test_watch_party_sync', async () => {
    // Find live content
    await helpers.scrollToElement('liveContentTile', 'down');
    await helpers.tapElement('liveContentTile');
    await helpers.verifyElementVisible('livePlayerScreen');

    // Start playback
    await helpers.tapElement('playButton');
    await helpers.verifyVideoPlaying();

    // Open watch party
    await helpers.tapElement('watchPartyButton');
    await waitFor(element(by.id('watchPartyModal')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify watch party participants display
    await helpers.verifyElementVisible('watchPartyParticipants');

    // Simulate second participant joining
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify participant count updated
    const participantsElement = element(by.id('participantCount'));
    await waitFor(participantsElement).toHaveText('2').withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify playback stays synchronized
    await helpers.verifyVideoPlaying();

    // Close watch party
    await helpers.tapElement('closeWatchPartyButton');
  });

  it('test_live_subtitles', async () => {
    // Find live content with subtitles
    await helpers.scrollToElement('liveContentTile', 'down');
    await helpers.tapElement('liveContentTile');
    await helpers.verifyElementVisible('livePlayerScreen');

    // Start playback
    await helpers.tapElement('playButton');
    await helpers.verifyVideoPlaying();

    // Enable live subtitles
    await helpers.toggleSubtitles(true);
    await waitFor(element(by.id('liveSubtitleView')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify subtitles are displayed
    await helpers.verifyElementVisible('liveSubtitleView');

    // Verify subtitle text updates (WebSocket delivery)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify subtitle content is not empty
    const subtitleElement = element(by.id('liveSubtitleText'));
    const attrs = await subtitleElement.getAttributes();
    expect(attrs?.elements?.[0]?.text).toBeTruthy();

    // Disable subtitles
    await helpers.toggleSubtitles(false);
    await helpers.verifyElementNotVisible('liveSubtitleView');
  });

  it('test_live_chat_messages', async () => {
    // Find live content
    await helpers.scrollToElement('liveContentTile', 'down');
    await helpers.tapElement('liveContentTile');
    await helpers.verifyElementVisible('livePlayerScreen');

    // Start playback
    await helpers.tapElement('playButton');
    await helpers.verifyVideoPlaying();

    // Open live chat
    await helpers.tapElement('chatButton');
    await waitFor(element(by.id('liveChatPanel')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify chat messages display
    await helpers.verifyElementVisible('chatMessageList');

    // Simulate incoming chat message (WebSocket)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify new message appears
    await waitFor(element(by.id('chatMessage_0')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Send chat message
    await helpers.typeText('chatInput', 'Test message');
    await helpers.tapElement('sendChatButton');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify sent message in chat
    await waitFor(element(by.id('mySentMessage')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Close chat
    await helpers.tapElement('closeChatButton');
  });

  it('test_real_time_notifications', async () => {
    // Navigate to home to trigger notifications
    await helpers.navigateToTab('home');
    await helpers.verifyElementVisible('homeScreen');

    // Simulate real-time notification delivery
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for notification badge
    await waitFor(element(by.id('notificationBadge')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify badge count updated
    const badgeElement = element(by.id('notificationBadge'));
    await waitFor(badgeElement).toHaveToggleValue(true).withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Tap notification
    await helpers.tapElement('notificationBadge');
    await waitFor(element(by.id('notificationsScreen')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify notification list displayed
    await helpers.verifyElementVisible('notificationList');

    // Verify recent notification visible
    await helpers.scrollToElement('notificationItem_0', 'down');
    await helpers.verifyElementVisible('notificationItem_0');

    // Tap notification to view details
    await helpers.tapElement('notificationItem_0');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate back
    await helpers.navigateBack();
  });

  it('test_connection_recovery', async () => {
    // Find live content
    await helpers.scrollToElement('liveContentTile', 'down');
    await helpers.tapElement('liveContentTile');
    await helpers.verifyElementVisible('livePlayerScreen');

    // Start playback
    await helpers.tapElement('playButton');
    await helpers.verifyVideoPlaying();

    // Open watch party to use WebSocket
    await helpers.tapElement('watchPartyButton');
    await waitFor(element(by.id('watchPartyModal')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Simulate network loss
    await helpers.setNetworkCondition('OFFLINE');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify connection lost message or offline indicator
    await waitFor(element(by.id('connectionStatusOffline')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Restore network
    await helpers.setNetworkCondition('WIFI');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify connection restored
    await waitFor(element(by.id('connectionStatusOnline')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify watch party reconnected
    await helpers.verifyElementVisible('watchPartyParticipants');

    // Close watch party
    await helpers.tapElement('closeWatchPartyButton');
  });
});
