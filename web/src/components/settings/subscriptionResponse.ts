import { z } from 'zod';

export const subscriptionResponseSchema = z.object({
  subscription: z.object({
    plan: z.string().min(1),
    status: z.string().min(1),
    billingPeriod: z.string(),
    currentPeriodEnd: z.string().nullable(),
  }).nullable(),
});

export const creditBalanceSchema = z.object({
  remaining_credits: z.number(),
  total_credits: z.number(),
});

export type SubscriptionInfo = z.infer<typeof subscriptionResponseSchema>['subscription'];
export type CreditBalance = z.infer<typeof creditBalanceSchema>;
