// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsexport interface AnalyticsData {
  profileId: string;
  userId: string;
  timeRange: AnalyticsTimeRange;
  metrics: ProfileMetrics;
  dimensions: ProfileDimensions;
  events: AnalyticsEvent[];
  goals: GoalMetrics[];
  funnelData: FunnelAnalysis;
  cohortData?: CohortAnalysis;
  realTimeData: RealTimeMetrics;
  comparativeData?: ComparativeAnalysis;
  customMetrics: CustomMetric[];
  generatedAt: Date;
  nextUpdateAt: Date;
}

export type AnalyticsTimeRange = 
  | 'today' 
  | 'yesterday' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'last_6_months' 
  | 'last_year' 
  | 'this_month' 
  | 'last_month' 
  | 'this_year' 
  | 'custom';

export interface CustomTimeRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

export interface ProfileMetrics {
  overview: OverviewMetrics;
  traffic: TrafficMetrics;
  engagement: EngagementMetrics;
  conversion: ConversionMetrics;
  performance: ProfilePerformanceMetrics;
  social: SocialMetrics;
  seo: SEOMetrics;
}

export interface OverviewMetrics {
  totalViews: number;
  uniqueVisitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  averageSessionDuration: number;
  pagesPerSession: number;
  newVisitorPercentage: number;
  returningVisitorPercentage: number;
  viewsGrowth: GrowthMetric;
  visitorsGrowth: GrowthMetric;
}

export interface GrowthMetric {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  previousPeriod: number;
}

export interface TrafficMetrics {
  sources: TrafficSource[];
  referrers: Referrer[];
  searchKeywords: SearchKeyword[];
  geographicDistribution: GeographicData[];
  deviceBreakdown: DeviceData[];
  browserBreakdown: BrowserData[];
  operatingSystemBreakdown: OSData[];
  utmCampaigns: UTMCampaign[];
}

export interface TrafficSource {
  source: 'direct' | 'organic' | 'referral' | 'social' | 'email' | 'paid' | 'other';
  sessions: number;
  percentage: number;
  bounceRate: number;
  averageSessionDuration: number;
  conversions: number;
  conversionRate: number;
  revenue?: number;
}

export interface Referrer {
  domain: string;
  url?: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  quality: 'high' | 'medium' | 'low';
  firstSeen: Date;
  lastSeen: Date;
}

export interface SearchKeyword {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  sessions: number;
  conversions: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GeographicData {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  conversionRate: number;
  averageSessionDuration: number;
}

export interface DeviceData {
  category: 'desktop' | 'mobile' | 'tablet';
  deviceType: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  conversionRate: number;
  averageSessionDuration: number;
}

export interface BrowserData {
  browser: string;
  version?: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  performanceScore: number;
}

export interface OSData {
  operatingSystem: string;
  version?: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
}

export interface UTMCampaign {
  campaign: string;
  source: string;
  medium: string;
  term?: string;
  content?: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  cost?: number;
  roas?: number;
}

export interface EngagementMetrics {
  averageTimeOnPage: number;
  scrollDepth: ScrollDepthMetrics;
  clickTracking: ClickTrackingData;
  formInteractions: FormInteractionData;
  mediaEngagement: MediaEngagementData;
  heatmapData: HeatmapData;
  userBehavior: UserBehaviorMetrics;
}

export interface ScrollDepthMetrics {
  average: number;
  distribution: ScrollDepthDistribution;
  milestones: ScrollMilestone[];
}

export interface ScrollDepthDistribution {
  '25%': number;
  '50%': number;
  '75%': number;
  '100%': number;
}

export interface ScrollMilestone {
  depth: number;
  users: number;
  percentage: number;
  averageTime: number;
}

export interface ClickTrackingData {
  totalClicks: number;
  clicksByElement: ClickElement[];
  clickHeatmap: ClickHeatmapPoint[];
  linkClicks: LinkClick[];
  buttonClicks: ButtonClick[];
}

export interface ClickElement {
  element: string;
  selector: string;
  clicks: number;
  percentage: number;
  conversionRate: number;
}

export interface ClickHeatmapPoint {
  x: number;
  y: number;
  clicks: number;
  element: string;
}

export interface LinkClick {
  url: string;
  text: string;
  clicks: number;
  external: boolean;
  destination: string;
}

export interface ButtonClick {
  text: string;
  action: string;
  clicks: number;
  conversionRate: number;
  averageTime: number;
}

export interface FormInteractionData {
  formViews: number;
  formStarts: number;
  formCompletions: number;
  formAbandonments: number;
  completionRate: number;
  averageCompletionTime: number;
  fieldAnalytics: FormFieldAnalytics[];
  abandonmentPoints: AbandonmentPoint[];
}

export interface FormFieldAnalytics {
  fieldName: string;
  fieldType: string;
  interactions: number;
  completions: number;
  averageTime: number;
  errorRate: number;
  commonErrors: string[];
}

export interface AbandonmentPoint {
  fieldName: string;
  abandonmentRate: number;
  position: number;
  commonReasons: string[];
}

export interface MediaEngagementData {
  imageViews: ImageViewData[];
  videoEngagement: VideoEngagementData[];
  audioEngagement: AudioEngagementData[];
  documentDownloads: DocumentDownloadData[];
}

export interface ImageViewData {
  src: string;
  alt: string;
  views: number;
  clickThroughs: number;
  averageViewTime: number;
  loadTime: number;
}

export interface VideoEngagementData {
  src: string;
  title: string;
  views: number;
  plays: number;
  completionRate: number;
  averageWatchTime: number;
  engagementMilestones: VideoMilestone[];
}

export interface VideoMilestone {
  percentage: number;
  viewers: number;
  averageTime: number;
}

export interface AudioEngagementData {
  src: string;
  title: string;
  plays: number;
  completionRate: number;
  averageListenTime: number;
  skipRate: number;
}

export interface DocumentDownloadData {
  filename: string;
  type: string;
  downloads: number;
  uniqueDownloads: number;
  downloadRate: number;
  averageSize: number;
}

export interface HeatmapData {
  clickHeatmap: HeatmapPoint[];
  scrollHeatmap: HeatmapPoint[];
  attentionHeatmap: HeatmapPoint[];
  generated: Date;
  sampleSize: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  element?: string;
  text?: string;
}

export interface UserBehaviorMetrics {
  sessionRecordings: number;
  behaviorFlows: BehaviorFlow[];
  exitPages: ExitPageData[];
  entryPages: EntryPageData[];
  userJourneys: UserJourney[];
}

export interface BehaviorFlow {
  path: string[];
  users: number;
  percentage: number;
  conversionRate: number;
  averageTime: number;
}

export interface ExitPageData {
  page: string;
  exits: number;
  exitRate: number;
  bounceRate: number;
  averageTimeOnPage: number;
}

export interface EntryPageData {
  page: string;
  entrances: number;
  bounceRate: number;
  conversionRate: number;
  averageSessionDuration: number;
}

export interface UserJourney {
  id: string;
  steps: JourneyStep[];
  duration: number;
  converted: boolean;
  conversionType?: string;
  touchpoints: number;
}

export interface JourneyStep {
  page: string;
  timestamp: Date;
  duration: number;
  interactions: number;
  scrollDepth: number;
}

export interface ConversionMetrics {
  goals: Goal[];
  conversions: ConversionData[];
  funnels: ConversionFunnel[];
  attribution: AttributionData;
  valueMetrics: ValueMetrics;
}

export interface Goal {
  id: string;
  name: string;
  type: 'contact' | 'download' | 'signup' | 'view' | 'custom';
  target?: number;
  completions: number;
  conversionRate: number;
  value?: number;
  trends: GoalTrend[];
}

export interface GoalTrend {
  date: string;
  completions: number;
  conversionRate: number;
  value?: number;
}

export interface ConversionData {
  type: string;
  count: number;
  rate: number;
  value: number;
  source: string;
  averageTime: number;
  steps: ConversionStep[];
}

export interface ConversionStep {
  step: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
  averageTime: number;
}

export interface ConversionFunnel {
  name: string;
  steps: FunnelStep[];
  overallConversionRate: number;
  totalValue: number;
  optimization: FunnelOptimization[];
}

export interface FunnelStep {
  name: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
  bottleneck: boolean;
  averageTime: number;
}

export interface FunnelOptimization {
  step: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  potentialImprovement: number;
}

export interface AttributionData {
  firstClick: AttributionModel;
  lastClick: AttributionModel;
  linear: AttributionModel;
  timeDecay: AttributionModel;
  positionBased: AttributionModel;
}

export interface AttributionModel {
  channels: AttributionChannel[];
  totalConversions: number;
  totalValue: number;
}

export interface AttributionChannel {
  channel: string;
  conversions: number;
  percentage: number;
  value: number;
  roas?: number;
}

export interface ValueMetrics {
  totalValue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  revenuePerVisitor: number;
  costPerAcquisition?: number;
  returnOnInvestment?: number;
}

export interface SocialMetrics {
  shares: SocialShareData[];
  mentions: SocialMentionData[];
  engagement: SocialEngagementData;
  influencerReach: InfluencerData[];
  viralCoefficient: number;
}

export interface SocialShareData {
  platform: string;
  shares: number;
  clicks: number;
  impressions: number;
  engagement: number;
  reach: number;
}

export interface SocialMentionData {
  platform: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  reach: number;
  influencerMentions: number;
}

export interface SocialEngagementData {
  totalEngagements: number;
  engagementRate: number;
  shareRate: number;
  commentRate: number;
  likeRate: number;
  viralPotential: number;
}

export interface InfluencerData {
  platform: string;
  influencer: string;
  followers: number;
  engagement: number;
  mentions: number;
  reach: number;
}

export interface ProfilePerformanceMetrics {
  loadTime: number;
  coreWebVitals: CoreWebVitalsData;
  technicalHealth: number;
  mobileOptimization: number;
  accessibilityScore: number;
}

export interface SEOMetrics {
  organicTraffic: number;
  keywordRankings: KeywordRanking[];
  backlinks: BacklinkData;
  visibility: VisibilityMetrics;
  technicalSEO: TechnicalSEOMetrics;
  contentPerformance: ContentPerformanceMetrics;
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  previousPosition?: number;
  change: number;
  searchVolume: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface BacklinkData {
  totalBacklinks: number;
  uniqueDomains: number;
  domainAuthority: number;
  newBacklinks: number;
  lostBacklinks: number;
  qualityScore: number;
  topReferringDomains: ReferringDomain[];
}

export interface ReferringDomain {
  domain: string;
  backlinks: number;
  domainAuthority: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface VisibilityMetrics {
  overallVisibility: number;
  brandedVisibility: number;
  nonBrandedVisibility: number;
  competitorComparison: CompetitorVisibility[];
  trendingKeywords: string[];
}

export interface CompetitorVisibility {
  competitor: string;
  visibility: number;
  keywordOverlap: number;
  gapOpportunities: number;
}

export interface TechnicalSEOMetrics {
  crawlability: number;
  indexability: number;
  siteSpeed: number;
  mobileUsability: number;
  coreWebVitals: CoreWebVitalsData;
  errors: TechnicalError[];
}

export interface CoreWebVitalsData {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  status: 'good' | 'needs-improvement' | 'poor';
}

export interface TechnicalError {
  type: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  pages: string[];
}

export interface ContentPerformanceMetrics {
  totalContent: number;
  averageWordCount: number;
  readabilityScore: number;
  duplicateContent: number;
  thinContent: number;
  topPerformingContent: ContentPerformanceItem[];
}

export interface ContentPerformanceItem {
  url: string;
  title: string;
  traffic: number;
  engagement: number;
  conversions: number;
  socialShares: number;
}

export interface ProfileDimensions {
  timeAnalysis: TimeAnalysis;
  demographic: DemographicData;
  geographic: GeographicAnalysis;
  technology: TechnologyData;
  behavioral: BehavioralData;
}

export interface TimeAnalysis {
  hourlyDistribution: HourlyData[];
  dailyDistribution: DailyData[];
  monthlyDistribution: MonthlyData[];
  seasonalTrends: SeasonalData[];
}

export interface HourlyData {
  hour: number;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface DailyData {
  dayOfWeek: number;
  dayName: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface MonthlyData {
  month: number;
  monthName: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface SeasonalData {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface DemographicData {
  ageGroups: AgeGroupData[];
  genderDistribution: GenderData[];
  incomeGroups: IncomeGroupData[];
  educationLevels: EducationLevelData[];
  occupations: OccupationData[];
}

export interface AgeGroupData {
  ageRange: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
  engagementScore: number;
}

export interface GenderData {
  gender: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
  engagementScore: number;
}

export interface IncomeGroupData {
  incomeRange: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface EducationLevelData {
  level: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface OccupationData {
  occupation: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface GeographicAnalysis {
  countries: CountryData[];
  regions: RegionData[];
  cities: CityData[];
  languages: LanguageData[];
  timeZones: TimeZoneData[];
}

export interface CountryData {
  country: string;
  countryCode: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  conversionRate: number;
}

export interface RegionData {
  region: string;
  country: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface CityData {
  city: string;
  region: string;
  country: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface LanguageData {
  language: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface TimeZoneData {
  timeZone: string;
  sessions: number;
  percentage: number;
  peakHours: number[];
}

export interface TechnologyData {
  browsers: BrowserAnalysis[];
  operatingSystems: OSAnalysis[];
  devices: DeviceAnalysis[];
  screenResolutions: ScreenResolutionData[];
  connectionSpeeds: ConnectionSpeedData[];
}

export interface BrowserAnalysis {
  browser: string;
  version: string;
  sessions: number;
  percentage: number;
  bounceRate: number;
  loadTime: number;
  compatibility: number;
}

export interface OSAnalysis {
  os: string;
  version: string;
  sessions: number;
  percentage: number;
  performanceScore: number;
}

export interface DeviceAnalysis {
  deviceType: string;
  brand?: string;
  model?: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
  averageSessionDuration: number;
}

export interface ScreenResolutionData {
  resolution: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface ConnectionSpeedData {
  speedCategory: 'slow' | 'average' | 'fast';
  sessions: number;
  percentage: number;
  bounceRate: number;
  loadTime: number;
}

export interface BehavioralData {
  visitFrequency: VisitFrequencyData[];
  sessionDuration: SessionDurationData[];
  pageDepth: PageDepthData[];
  interactionPatterns: InteractionPattern[];
  loyaltySegments: LoyaltySegment[];
}

export interface VisitFrequencyData {
  frequency: string;
  visitors: number;
  percentage: number;
  conversionRate: number;
  value: number;
}

export interface SessionDurationData {
  durationRange: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface PageDepthData {
  depthRange: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface InteractionPattern {
  pattern: string;
  occurrences: number;
  percentage: number;
  conversionLikelihood: number;
}

export interface LoyaltySegment {
  segment: string;
  visitors: number;
  percentage: number;
  averageValue: number;
  retention: number;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  metadata: { [key: string]: unknown };
}

export interface GoalMetrics {
  goalId: string;
  name: string;
  type: string;
  completions: number;
  conversionRate: number;
  value: number;
  trends: GoalTrendData[];
  segments: GoalSegmentData[];
}

export interface GoalTrendData {
  period: string;
  completions: number;
  conversionRate: number;
  change: number;
}

export interface GoalSegmentData {
  segment: string;
  completions: number;
  conversionRate: number;
  value: number;
}

export interface FunnelAnalysis {
  funnels: FunnelData[];
  dropOffPoints: DropOffPoint[];
  optimization: FunnelOptimizationSuggestion[];
}

export interface FunnelData {
  name: string;
  steps: FunnelStepData[];
  conversionRate: number;
  totalUsers: number;
  revenue: number;
}

export interface FunnelStepData {
  step: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface DropOffPoint {
  step: string;
  dropOffRate: number;
  commonReasons: string[];
  impact: 'high' | 'medium' | 'low';
}

export interface FunnelOptimizationSuggestion {
  step: string;
  suggestion: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  retentionRates: RetentionData[];
  lifetimeValue: LifetimeValueData[];
}

export interface CohortData {
  cohort: string;
  size: number;
  acquisitionDate: Date;
  retentionRate: number[];
  averageValue: number;
}

export interface RetentionData {
  period: string;
  retentionRate: number;
  churnRate: number;
  reactivationRate: number;
}

export interface LifetimeValueData {
  cohort: string;
  ltv: number;
  averageLifespan: number;
  totalRevenue: number;
}

export interface RealTimeMetrics {
  activeUsers: number;
  activePages: ActivePageData[];
  currentEvents: RealTimeEvent[];
  trafficSources: RealTimeTrafficSource[];
  locations: RealTimeLocation[];
  devices: RealTimeDevice[];
}

export interface ActivePageData {
  page: string;
  activeUsers: number;
  averageTime: number;
}

export interface RealTimeEvent {
  event: string;
  count: number;
  lastOccurred: Date;
}

export interface RealTimeTrafficSource {
  source: string;
  activeUsers: number;
  percentage: number;
}

export interface RealTimeLocation {
  country: string;
  activeUsers: number;
  percentage: number;
}

export interface RealTimeDevice {
  deviceType: string;
  activeUsers: number;
  percentage: number;
}

export interface ComparativeAnalysis {
  periodComparison: PeriodComparison;
  segmentComparison: SegmentComparison[];
  benchmarkComparison?: BenchmarkComparison;
}

export interface PeriodComparison {
  currentPeriod: PeriodData;
  previousPeriod: PeriodData;
  changes: MetricChange[];
}

export interface PeriodData {
  startDate: Date;
  endDate: Date;
  metrics: { [key: string]: number };
}

export interface MetricChange {
  metric: string;
  change: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

export interface SegmentComparison {
  segment: string;
  metrics: { [key: string]: number };
  performance: 'above_average' | 'average' | 'below_average';
}

export interface BenchmarkComparison {
  industry: string;
  metrics: BenchmarkMetric[];
  ranking: number;
  percentile: number;
}

export interface BenchmarkMetric {
  metric: string;
  yourValue: number;
  industryAverage: number;
  industryLeader: number;
  performance: 'leader' | 'above_average' | 'average' | 'below_average';
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  formula: string;
  value: number;
  unit: string;
  trend: number;
  benchmarks?: { [key: string]: number };
}

export interface AnalyticsConfiguration {
  profileId: string;
  trackingEnabled: boolean;
  trackingCode?: string;
  goals: AnalyticsGoal[];
  customDimensions: CustomDimension[];
  filters: AnalyticsFilter[];
  alerts: AnalyticsAlert[];
  reportingSchedule: ReportingSchedule;
  privacySettings: AnalyticsPrivacySettings;
}

export interface AnalyticsGoal {
  id: string;
  name: string;
  type: 'destination' | 'duration' | 'pages' | 'event';
  value?: number;
  active: boolean;
  conditions: GoalCondition[];
}

export interface GoalCondition {
  type: 'equals' | 'begins_with' | 'regex' | 'greater_than' | 'less_than';
  field: string;
  value: string | number;
}

export interface CustomDimension {
  id: string;
  name: string;
  scope: 'hit' | 'session' | 'user' | 'product';
  active: boolean;
}

export interface AnalyticsFilter {
  id: string;
  name: string;
  type: 'include' | 'exclude';
  conditions: FilterCondition[];
  active: boolean;
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

export interface AnalyticsAlert {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  recipients: string[];
  frequency: 'immediate' | 'daily' | 'weekly';
  active: boolean;
}

export interface AlertCondition {
  type: 'threshold' | 'change' | 'anomaly';
  value: number;
  comparison: 'greater_than' | 'less_than' | 'equals' | 'change_by';
}

export interface ReportingSchedule {
  dailyReports: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  customReports: CustomReport[];
  recipients: string[];
  format: 'email' | 'pdf' | 'csv' | 'json';
}

export interface CustomReport {
  id: string;
  name: string;
  metrics: string[];
  dimensions: string[];
  filters: string[];
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'email' | 'pdf' | 'dashboard';
}

export interface AnalyticsPrivacySettings {
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  gdprCompliant: boolean;
  cookieConsent: boolean;
  dataRetention: number; // in days
  exportAllowed: boolean;
  deleteAllowed: boolean;
}