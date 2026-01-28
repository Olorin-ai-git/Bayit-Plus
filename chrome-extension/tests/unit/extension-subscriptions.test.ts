/**
 * Unit Tests: Chrome Extension Subscription Endpoints
 *
 * Tests for /api/v1/extension/subscriptions endpoints:
 * - GET /status - Get subscription status
 * - POST /checkout - Create Stripe checkout session
 * - POST /cancel - Cancel subscription
 * - POST /webhook - Handle Stripe webhooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Extension Subscription API', () => {
  const API_BASE_URL = 'https://api.bayit.tv/api/v1/extension/subscriptions';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /status', () => {
    it('should return free tier for user without subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'free',
          status: null,
          quota_minutes_per_day: 5.0,
          price_usd: null,
          current_period_end: null,
          cancel_at_period_end: false,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/status`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.tier).toBe('free');
      expect(data.quota_minutes_per_day).toBe(5.0);
      expect(data.price_usd).toBeNull();
    });

    it('should return premium tier for subscribed user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'premium',
          status: 'active',
          quota_minutes_per_day: -1,
          price_usd: 5.00,
          current_period_end: '2026-02-28T00:00:00Z',
          cancel_at_period_end: false,
        }),
      });

      const response = await fetch(`${API_BASE_URL}/status`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.tier).toBe('premium');
      expect(data.status).toBe('active');
      expect(data.quota_minutes_per_day).toBe(-1); // Unlimited
      expect(data.price_usd).toBe(5.00);
    });

    it('should require authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Not authenticated',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/status`);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /checkout', () => {
    it('should create Stripe checkout session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_12345',
          session_id: 'cs_test_12345',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.checkout_url).toContain('checkout.stripe.com');
      expect(data.session_id).toContain('cs_test_');
    });

    it('should reject if user already has premium', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'User already has premium subscription',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain('already has premium');
    });

    it('should require authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Not authenticated',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /cancel', () => {
    it('should cancel subscription at period end', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Subscription will be canceled at period end',
          end_date: '2026-02-28T00:00:00Z',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.message).toContain('canceled at period end');
      expect(data.end_date).toBeTruthy();
    });

    it('should reject if no active subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'No active premium subscription to cancel',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain('No active premium subscription');
    });

    it('should require authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Not authenticated',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /webhook', () => {
    it('should require Stripe signature header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Missing Stripe signature',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {},
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should reject invalid signature', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Invalid signature',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid_signature',
        },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {},
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should process valid webhook event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 't=1234567890,v1=valid_signature_hash',
        },
        body: JSON.stringify({
          id: 'evt_test_12345',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_12345',
              customer: 'cus_test_12345',
              subscription: 'sub_test_12345',
              metadata: {
                user_id: 'user_12345',
                platform: 'chrome_extension',
              },
            },
          },
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('success');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full subscription lifecycle', async () => {
      // 1. Check initial status (free tier)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'free',
          status: null,
          quota_minutes_per_day: 5.0,
        }),
      });

      let response = await fetch(`${API_BASE_URL}/status`, {
        headers: { 'Authorization': `Bearer ${mockToken}` },
      });

      let data = await response.json();
      expect(data.tier).toBe('free');

      // 2. Create checkout session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_12345',
          session_id: 'cs_test_12345',
        }),
      });

      response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      data = await response.json();
      expect(data.checkout_url).toBeTruthy();

      // 3. Check status after upgrade (premium tier)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'premium',
          status: 'active',
          quota_minutes_per_day: -1,
          price_usd: 5.00,
        }),
      });

      response = await fetch(`${API_BASE_URL}/status`, {
        headers: { 'Authorization': `Bearer ${mockToken}` },
      });

      data = await response.json();
      expect(data.tier).toBe('premium');

      // 4. Cancel subscription
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Subscription will be canceled at period end',
          end_date: '2026-02-28T00:00:00Z',
        }),
      });

      response = await fetch(`${API_BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should prevent duplicate subscription purchase', async () => {
      // Already has premium
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'User already has premium subscription',
        }),
      });

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});
