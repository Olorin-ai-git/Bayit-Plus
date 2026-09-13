import { subscriptionResponseSchema, creditBalanceSchema } from '../subscriptionResponse';

test('the backend no-subscription envelope is a valid free account', () => {
  expect(subscriptionResponseSchema.parse({ subscription: null }).subscription).toBeNull();
});

test('the backend paid envelope preserves its real plan and renewal fields', () => {
  const subscription = { id: 'subscription-id', plan: 'Premium', status: 'active', billingPeriod: 'monthly', currentPeriodEnd: '2026-10-10T00:00:00Z', cancelAtPeriodEnd: false };
  expect(subscriptionResponseSchema.parse({ subscription }).subscription).toMatchObject({ plan: 'Premium', status: 'active', currentPeriodEnd: subscription.currentPeriodEnd });
});

test.each([{}, null, { subscription: {} }, { subscription: { plan: null } }, { plan_name: 'Premium' }])('malformed subscription data is rejected instead of being labeled free: %j', value => {
  expect(subscriptionResponseSchema.safeParse(value).success).toBe(false);
});

test('credit balances require usable numeric fields while allowing server metadata', () => {
  expect(creditBalanceSchema.parse({ remaining_credits: 4, total_credits: 10, user_id: 'account' })).toEqual({ remaining_credits: 4, total_credits: 10 });
  expect(creditBalanceSchema.safeParse({ remaining_credits: '4', total_credits: 10 }).success).toBe(false);
});
