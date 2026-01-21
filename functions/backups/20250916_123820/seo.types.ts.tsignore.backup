// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsexport interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  alternateUrls?: AlternateUrl[];
  openGraph: OpenGraphMetadata;
  twitterCard: TwitterCardMetadata;
  structuredData: StructuredDataSchema[];
  customMeta: MetaTag[];
  robots: RobotsDirectives;
  languageCode: string;
  region?: string;
}

export interface AlternateUrl {
  href: string;
  hreflang: string;
  media?: string;
}

export interface OpenGraphMetadata {
  title: string;
  description: string;
  type: 'profile' | 'website' | 'article';
  url: string;
  image: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  locale: string;
  siteName: string;
  profile?: OpenGraphProfile;
  article?: OpenGraphArticle;
}

export interface OpenGraphProfile {
  firstName: string;
  lastName: string;
  username?: string;
  gender?: string;
}

export interface OpenGraphArticle {
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export interface TwitterCardMetadata {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  app?: TwitterAppCard;
  player?: TwitterPlayerCard;
}

export interface TwitterAppCard {
  nameIphone?: string;
  idIphone?: string;
  urlIphone?: string;
  nameIpad?: string;
  idIpad?: string;
  urlIpad?: string;
  nameGoogleplay?: string;
  idGoogleplay?: string;
  urlGoogleplay?: string;
  country?: string;
}

export interface TwitterPlayerCard {
  url: string;
  width: number;
  height: number;
  stream?: string;
  streamContentType?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  httpEquiv?: string;
  content: string;
  charset?: string;
}

export interface RobotsDirectives {
  index: boolean;
  follow: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  notranslate?: boolean;
  unavailableAfter?: string;
  crawlDelay?: number;
}

export interface StructuredDataSchema {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

export interface PersonSchema extends StructuredDataSchema {
  '@type': 'Person';
  name: string;
  givenName?: string;
  familyName?: string;
  additionalName?: string;
  alternateName?: string;
  description?: string;
  url?: string;
  image?: string | ImageObject[];
  jobTitle?: string;
  worksFor?: Organization;
  knowsAbout?: string | string[];
  knowsLanguage?: Language | Language[];
  nationality?: Country;
  birthDate?: string;
  birthPlace?: Place;
  homeLocation?: Place;
  workLocation?: Place;
  alumniOf?: EducationalOrganization | EducationalOrganization[];
  hasOccupation?: Occupation;
  memberOf?: Organization | Organization[];
  award?: string | string[];
  honorificPrefix?: string;
  honorificSuffix?: string;
  telephone?: string;
  email?: string;
  faxNumber?: string;
  address?: PostalAddress;
  sameAs?: string | string[];
  seeks?: Demand;
  owns?: OwnershipInfo | Product[];
  publishingPrinciples?: string | CreativeWork;
}

export interface Organization {
  '@type': 'Organization';
  name: string;
  url?: string;
  logo?: string | ImageObject;
  description?: string;
  address?: PostalAddress;
  telephone?: string;
  email?: string;
  foundingDate?: string;
  founder?: Person[];
  employee?: Person[];
  member?: Person | Organization;
  parentOrganization?: Organization;
  subOrganization?: Organization[];
  department?: Organization[];
  brand?: Brand;
  sameAs?: string[];
}

export interface ImageObject {
  '@type': 'ImageObject';
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  thumbnail?: string;
  contentUrl?: string;
  encodingFormat?: string;
  contentSize?: string;
}

export interface Language {
  '@type': 'Language';
  name: string;
  alternateName?: string;
}

export interface Country {
  '@type': 'Country';
  name: string;
}

export interface Place {
  '@type': 'Place';
  name?: string;
  address?: PostalAddress;
  geo?: GeoCoordinates;
}

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string | Country;
}

export interface GeoCoordinates {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface EducationalOrganization {
  '@type': 'EducationalOrganization';
  name: string;
  url?: string;
  logo?: string | ImageObject;
  description?: string;
  address?: PostalAddress;
  telephone?: string;
  email?: string;
  foundingDate?: string;
  hasCredential?: EducationalOccupationalCredential[];
}

export interface EducationalOccupationalCredential {
  '@type': 'EducationalOccupationalCredential';
  name: string;
  description?: string;
  credentialCategory?: string;
  dateCreated?: string;
  validFrom?: string;
  validIn?: Place;
  recognizedBy?: Organization;
  competencyRequired?: string[];
}

export interface Occupation {
  '@type': 'Occupation';
  name: string;
  description?: string;
  occupationalCategory?: string;
  skills?: string | string[];
  qualifications?: string;
  responsibilities?: string;
  experienceRequirements?: string;
  educationRequirements?: EducationalOccupationalCredential[];
}

export interface Demand {
  '@type': 'Demand';
  name?: string;
  description?: string;
  itemOffered?: Product | Service;
  priceSpecification?: PriceSpecification;
  availabilityStarts?: string;
  availabilityEnds?: string;
  availableAtOrFrom?: Place;
}

export interface Product {
  '@type': 'Product';
  name: string;
  description?: string;
  brand?: Brand;
  manufacturer?: Organization;
  image?: string | ImageObject[];
  url?: string;
  sku?: string;
  model?: string;
  category?: string;
}

export interface Service {
  '@type': 'Service';
  name: string;
  description?: string;
  provider?: Organization | Person;
  serviceType?: string;
  category?: string;
  areaServed?: Place | string;
}

export interface Brand {
  '@type': 'Brand';
  name: string;
  logo?: string | ImageObject;
  url?: string;
  description?: string;
}

export interface PriceSpecification {
  '@type': 'PriceSpecification';
  price: number | string;
  priceCurrency: string;
  minPrice?: number;
  maxPrice?: number;
  valueAddedTaxIncluded?: boolean;
}

export interface OwnershipInfo {
  '@type': 'OwnershipInfo';
  ownedFrom?: string;
  ownedThrough?: string;
  typeOfGood?: Product;
}

export interface CreativeWork {
  '@type': 'CreativeWork';
  name: string;
  description?: string;
  author?: Person | Organization;
  publisher?: Organization;
  datePublished?: string;
  dateModified?: string;
  url?: string;
  image?: string | ImageObject[];
  license?: string;
  copyrightHolder?: Person | Organization;
  copyrightYear?: number;
}

export interface Person {
  '@type': 'Person';
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  worksFor?: Organization;
}

export interface SEOOptimizationResult {
  metadata: SEOMetadata;
  optimizedContent: OptimizedContent;
  performanceMetrics: PerformanceMetrics;
  recommendations: SEOTechnicalRecommendation[];
  technicalAudit: TechnicalAudit;
  competitorAnalysis?: CompetitorAnalysis;
  estimatedImpact: ImpactEstimate;
  implementationPlan: ImplementationStep[];
}

export interface OptimizedContent {
  title: string;
  description: string;
  headings: HeadingStructure;
  bodyContent: string;
  imageAltTexts: ImageAltText[];
  linkTitles: LinkTitle[];
  readabilityScore: number;
  keywordDensity: KeywordDensityMap;
}

export interface HeadingStructure {
  h1: string;
  h2: string[];
  h3: string[];
  h4?: string[];
  h5?: string[];
  h6?: string[];
}

export interface ImageAltText {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
}

export interface LinkTitle {
  href: string;
  title: string;
  anchor: string;
  external: boolean;
}

export interface KeywordDensityMap {
  [keyword: string]: {
    count: number;
    density: number;
    positions: number[];
    context: string[];
  };
}

export interface PerformanceMetrics {
  pageSpeed: PageSpeedMetrics;
  coreWebVitals: CoreWebVitals;
  accessibility: AccessibilityMetrics;
  seoScore: number;
  mobileOptimization: MobileOptimizationScore;
}

export interface PageSpeedMetrics {
  desktop: PageSpeedScore;
  mobile: PageSpeedScore;
}

export interface PageSpeedScore {
  score: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  ttfb: number; // Time to First Byte
  opportunities: OptimizationOpportunity[];
}

export interface CoreWebVitals {
  lcp: VitalMetric;
  fid: VitalMetric;
  cls: VitalMetric;
  fcp: VitalMetric;
  ttfb: VitalMetric;
}

export interface VitalMetric {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  percentile: number;
}

export interface AccessibilityMetrics {
  score: number;
  violations: AccessibilityViolation[];
  passes: AccessibilityPass[];
}

export interface AccessibilityViolation {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityPass {
  rule: string;
  description: string;
}

export interface AccessibilityNode {
  target: string;
  html: string;
  failureSummary: string;
}

export interface MobileOptimizationScore {
  score: number;
  issues: MobileIssue[];
  usabilityScore: number;
}

export interface MobileIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface SEOTechnicalRecommendation {
  category: 'content' | 'technical' | 'performance' | 'user-experience' | 'social';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  implementation: string;
  resources?: string[];
  timelineWeeks: number;
}

export interface TechnicalAudit {
  htmlValidation: ValidationResult;
  cssValidation: ValidationResult;
  jsValidation: ValidationResult;
  securityHeaders: SecurityHeadersAudit;
  httpsImplementation: HTTPSAudit;
  canonicalization: CanonicalizationAudit;
  robotsTxt: RobotsTxtAudit;
  sitemap: SitemapAudit;
  internalLinking: InternalLinkingAudit;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  recommendation: string;
}

export interface SecurityHeadersAudit {
  score: number;
  headers: SecurityHeader[];
  missing: string[];
  recommendations: string[];
}

export interface SecurityHeader {
  name: string;
  value: string;
  secure: boolean;
  recommendation?: string;
}

export interface HTTPSAudit {
  implemented: boolean;
  certificate: CertificateInfo;
  redirects: RedirectChain[];
  mixedContent: MixedContentIssue[];
}

export interface CertificateInfo {
  valid: boolean;
  issuer: string;
  expiryDate: string;
  daysUntilExpiry: number;
  keySize: number;
  signatureAlgorithm: string;
}

export interface RedirectChain {
  from: string;
  to: string;
  statusCode: number;
  type: 'permanent' | 'temporary';
}

export interface MixedContentIssue {
  type: 'image' | 'script' | 'stylesheet' | 'iframe' | 'other';
  url: string;
  line?: number;
  severity: 'error' | 'warning';
}

export interface CanonicalizationAudit {
  canonicalImplemented: boolean;
  canonicalUrl?: string;
  issues: CanonicalizationIssue[];
  duplicateContent: DuplicateContentIssue[];
}

export interface CanonicalizationIssue {
  type: 'missing' | 'multiple' | 'invalid' | 'chain';
  description: string;
  recommendation: string;
}

export interface DuplicateContentIssue {
  url: string;
  similarity: number;
  recommendation: string;
}

export interface RobotsTxtAudit {
  exists: boolean;
  valid: boolean;
  accessible: boolean;
  directives: RobotsDirective[];
  issues: RobotsIssue[];
  sitemapReferences: string[];
}

export interface RobotsDirective {
  userAgent: string;
  rules: RobotsRule[];
}

export interface RobotsRule {
  directive: 'allow' | 'disallow' | 'crawl-delay' | 'sitemap';
  value: string;
}

export interface RobotsIssue {
  type: 'syntax' | 'accessibility' | 'directive' | 'security';
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SitemapAudit {
  exists: boolean;
  valid: boolean;
  accessible: boolean;
  urls: SitemapUrl[];
  issues: SitemapIssue[];
  statistics: SitemapStatistics;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  accessible: boolean;
  statusCode?: number;
}

export interface SitemapIssue {
  type: 'invalid-url' | 'inaccessible' | 'format' | 'size' | 'outdated';
  url?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SitemapStatistics {
  totalUrls: number;
  accessibleUrls: number;
  errorUrls: number;
  lastModified: string;
  fileSize: number;
}

export interface InternalLinkingAudit {
  linkCount: number;
  internalLinks: InternalLink[];
  brokenLinks: BrokenLink[];
  orphanedPages: string[];
  linkDepth: LinkDepthAnalysis;
  anchorTextAnalysis: AnchorTextAnalysis;
}

export interface InternalLink {
  from: string;
  to: string;
  anchorText: string;
  title?: string;
  nofollow: boolean;
}

export interface BrokenLink {
  from: string;
  to: string;
  statusCode: number;
  error: string;
}

export interface LinkDepthAnalysis {
  maxDepth: number;
  averageDepth: number;
  depthDistribution: { [depth: number]: number };
}

export interface AnchorTextAnalysis {
  distribution: { [text: string]: number };
  overOptimization: OverOptimizedAnchor[];
  genericTexts: string[];
}

export interface OverOptimizedAnchor {
  anchorText: string;
  count: number;
  percentage: number;
  risk: 'high' | 'medium' | 'low';
}

export interface CompetitorAnalysis {
  competitors: CompetitorData[];
  marketGaps: MarketGap[];
  opportunityAreas: OpportunityArea[];
  benchmarkMetrics: BenchmarkMetrics;
}

export interface CompetitorData {
  domain: string;
  name: string;
  title: string;
  metaDescription: string;
  keywordOverlap: KeywordOverlap[];
  contentTopics: string[];
  backlinks: number;
  estimatedTraffic: number;
  domainAuthority: number;
  socialSignals: SocialSignals;
  strengths: string[];
  weaknesses: string[];
}

export interface KeywordOverlap {
  keyword: string;
  yourRanking?: number;
  competitorRanking: number;
  searchVolume: number;
  difficulty: number;
}

export interface SocialSignals {
  shares: number;
  likes: number;
  comments: number;
  mentions: number;
  platforms: SocialPlatformData[];
}

export interface SocialPlatformData {
  platform: string;
  followers: number;
  engagement: number;
  posts: number;
}

export interface MarketGap {
  category: string;
  description: string;
  opportunity: string;
  difficulty: 'low' | 'medium' | 'high';
  timeToCapture: number; // in weeks
}

export interface OpportunityArea {
  area: string;
  description: string;
  potentialImpact: 'high' | 'medium' | 'low';
  competitorGap: boolean;
  actionRequired: string[];
}

export interface BenchmarkMetrics {
  averagePageSpeed: number;
  averageSEOScore: number;
  averageContentLength: number;
  averageKeywordDensity: number;
  averageSocialShares: number;
  averageBacklinks: number;
}

export interface ImpactEstimate {
  trafficIncrease: TrafficImpactEstimate;
  rankingImprovement: RankingImpactEstimate;
  conversionImpact: ConversionImpactEstimate;
  timeframe: TimeframeEstimate;
  confidenceLevel: number;
}

export interface TrafficImpactEstimate {
  currentTraffic: number;
  projectedIncrease: number;
  percentageIncrease: number;
  organicGrowth: number;
  referralGrowth: number;
  directGrowth: number;
}

export interface RankingImpactEstimate {
  currentAverageRanking: number;
  projectedImprovement: number;
  keywordMovements: KeywordMovement[];
  newKeywordOpportunities: number;
}

export interface KeywordMovement {
  keyword: string;
  currentRanking?: number;
  projectedRanking: number;
  searchVolume: number;
  trafficPotential: number;
}

export interface ConversionImpactEstimate {
  currentConversionRate: number;
  projectedImprovement: number;
  leadIncrease: number;
  revenueImpact?: number;
  costPerAcquisition?: number;
}

export interface TimeframeEstimate {
  quickWins: number; // in weeks
  mediumTermResults: number; // in weeks
  longTermResults: number; // in weeks
  fullImpactRealized: number; // in weeks
}

export interface ImplementationStep {
  phase: number;
  title: string;
  description: string;
  tasks: ImplementationTask[];
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  dependencies: string[];
  deliverables: string[];
  successMetrics: string[];
}

export interface ImplementationTask {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  skillsRequired: string[];
  resources: string[];
  acceptanceCriteria: string[];
}

export interface OptimizationOpportunity {
  category: string;
  title: string;
  description: string;
  potentialImprovement: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: number;
}