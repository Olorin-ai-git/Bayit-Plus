import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TestRenderer, { act } from 'react-test-renderer';
import { LineChart } from 'recharts';
import OverviewTab from '../tabs/OverviewTab';
import TimelineTab from '../tabs/TimelineTab';
import CategoriesTab from '../tabs/CategoriesTab';
import TopSpendersTab from '../tabs/TopSpendersTab';
import MetricsGrid from '../MetricsGrid';
import PLSummary from '../PLSummary';
import RealTimeStatusBadge from '../RealTimeStatusBadge';
import { costOverviewSchema, costBreakdownSchema, sumCosts, costShare } from '@/services/adminApi/costData';

const idle = { loading: {}, errors: {} };
const zeroBreakdown = costBreakdownSchema.parse({ ai_costs: { stt: '0' }, infrastructure_costs: { gcp: '0' }, thirdparty_costs: { stripe: '0' }, total_permanent: 0, total_transient: 0, total_platform: 0 });

test('cost parsing preserves zero and treats invalid/missing values as unknown', () => {
  const data = costOverviewSchema.parse({ revenue: '0', total_costs: '', profit_loss: false, profit_margin: Infinity });
  expect(data.revenue).toBe(0);
  expect(data.total_costs).toBeNull();
  expect(data.profit_loss).toBeNull();
  expect(data.profit_margin).toBeNull();
  expect(data.cost_per_minute).toBeNull();
  expect(sumCosts({ known: 1, missing: null })).toBeNull();
  expect(sumCosts({ measured: 0 })).toBe(0);
  expect(costShare(0, 10)).toBe(0);
  expect(costShare(0, 0)).toBeNull();
});

test('overview renders measured zeros without substitute spend', () => {
  const { container } = render(<OverviewTab dashboard={{ ...idle, data: { breakdown: zeroBreakdown } }} />);
  expect(screen.getAllByText('$0')).toHaveLength(3);
  expect(container).not.toHaveTextContent('5,230');
  expect(container).not.toHaveTextContent('4,120');
  expect(container).not.toHaveTextContent('2,390');
});

test('overview cannot chart or assign percentages to missing totals', () => {
  render(<OverviewTab dashboard={{ ...idle, data: {} }} />);
  expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
});

test('timeline passes only supplied points and signed values to the chart', () => {
  let tree: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<TimelineTab dashboard={{ ...idle, data: { timeline: [{ date: '2026-09-10T00:00:00Z', revenue: 0, total_cost: 7, profit_loss: -7 }] } }} />); });
  try {
    const points = tree!.root.findByType(LineChart).props.data;
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(expect.objectContaining({ revenue: 0, cost: 7, profit: -7 }));
  } finally { act(() => tree!.unmount()); }
});

test('missing and empty timelines never fabricate points', () => {
  const { rerender } = render(<TimelineTab dashboard={{ ...idle, data: {} }} />);
  expect(screen.getByText('Unknown')).toBeInTheDocument();
  expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  rerender(<TimelineTab dashboard={{ ...idle, data: { timeline: [] } }} />);
  expect(screen.getByText('No data available')).toBeInTheDocument();
  expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
});

test('category amounts remain unknown until supplied and measured zero remains zero', () => {
  const { container, rerender } = render(<CategoriesTab dashboard={{ ...idle, data: {} }} />);
  expect(container).not.toHaveTextContent('8,120');
  expect(container).not.toHaveTextContent('6,620');
  expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  rerender(<CategoriesTab dashboard={{ ...idle, data: { breakdown: zeroBreakdown } }} />);
  expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(2);
});

test('rankings never substitute users when the backend has no result', () => {
  const { container, rerender } = render(<TopSpendersTab dashboard={{ ...idle, data: {} }} />);
  expect(screen.getByText('Unknown')).toBeInTheDocument();
  expect(container).not.toHaveTextContent('a3f2b1');
  rerender(<TopSpendersTab dashboard={{ ...idle, data: { topSpenders: { spenders: [] } } }} />);
  expect(screen.getByText('No data available')).toBeInTheDocument();
});

test('metrics preserve real cost-per-minute zero and leave unsupported YTD/rate unknown', () => {
  render(<MetricsGrid data={costOverviewSchema.parse({ revenue: 7, cost_per_minute: 0 })} />);
  expect(screen.getByText('$0')).toBeInTheDocument();
  expect(screen.getAllByText('Unknown')).toHaveLength(3);
});

test('P&L retains a loss sign and handles absent figures', () => {
  const { rerender } = render(<PLSummary data={costOverviewSchema.parse({ profit_loss: -7, revenue: 0, total_costs: 7, profit_margin: 0 })} />);
  expect(screen.getByText('$-7')).toBeInTheDocument();
  rerender(<PLSummary data={null} />);
  expect(screen.getAllByText(/Unknown/)).toHaveLength(4);
});

test('freshness comes from the server timestamp rather than elapsed local time', () => {
  const { container, rerender } = render(<RealTimeStatusBadge />);
  expect(container).toHaveTextContent('Updated: Unknown');
  rerender(<RealTimeStatusBadge lastUpdated="2026-09-10T00:00:00Z" />);
  expect(container).toHaveTextContent(new Date('2026-09-10T00:00:00Z').toLocaleString('en'));
  expect(container).not.toHaveTextContent('Just now');
});
