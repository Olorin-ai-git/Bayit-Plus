import { z } from 'zod';

const amount = z.union([z.number().finite(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number).pipe(z.number().finite())]).nullable().catch(null);
const amounts = z.record(amount).nullable().catch(null);
const timestamp = z.string().datetime({ offset: true }).nullable().catch(null);

export const costOverviewSchema = z.object({
  revenue: amount, total_costs: amount, profit_loss: amount, profit_margin: amount,
  cost_per_minute: amount, period_start: timestamp, period_end: timestamp, last_updated: timestamp,
});
export const costTimelineSchema = z.array(z.object({
  date: z.string().datetime({ offset: true }), revenue: amount, total_cost: amount, profit_loss: amount,
}));
export const costBreakdownSchema = z.object({
  ai_costs: amounts, infrastructure_costs: amounts, thirdparty_costs: amounts,
  total_permanent: amount, total_transient: amount, total_platform: amount,
});
export const userCostSchema = z.object({ ai_costs: amounts, total_cost: amount });
export const topSpendersSchema = z.object({ spenders: z.array(z.object({
  rank: z.number().int().positive(), user_id_hash: z.string(), total_cost_range: z.string(), spend_percentage: amount,
})) });
export type CostOverview = z.infer<typeof costOverviewSchema>;
export type CostBreakdown = z.infer<typeof costBreakdownSchema>;
export type CostTimeline = z.infer<typeof costTimelineSchema>;
export type TopSpenders = z.infer<typeof topSpendersSchema>;

export function sumCosts(values: Record<string, number | null> | null | undefined): number | null {
  if (!values || !Object.keys(values).length || Object.values(values).some(value => value === null)) return null;
  const total = Object.values(values).reduce<number>((sum, value) => sum + value!, 0);
  return Number.isFinite(total) ? total : null;
}

export function costShare(value: number | null | undefined, total: number | null | undefined): number | null {
  return value != null && total != null && total > 0 ? value / total * 100 : null;
}
