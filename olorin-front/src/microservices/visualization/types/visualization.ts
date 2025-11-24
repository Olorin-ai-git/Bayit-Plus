// Chart and Visualization Types
export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'polar'
  | 'histogram'
  | 'box'
  | 'violin'
  | 'heatmap'
  | 'treemap'
  | 'sankey'
  | 'funnel'
  | 'gauge'
  | 'waterfall'
  | 'candlestick'
  | 'network'
  | 'timeline'
  | 'gantt'
  | 'map'
  | 'choropleth';

// Data point interface
export interface DataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  size?: number;
  metadata?: Record<string, any>;
}

// Dataset interface
export interface Dataset {
  id: string;
  label: string;
  data: DataPoint[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  hidden?: boolean;
  type?: ChartType;
  yAxisID?: string;
  xAxisID?: string;
  metadata?: Record<string, any>;
}

// Axis configuration
export interface AxisConfig {
  id?: string;
  type: 'linear' | 'logarithmic' | 'category' | 'time' | 'radialLinear';
  position?: 'top' | 'bottom' | 'left' | 'right';
  display?: boolean;
  title?: {
    display: boolean;
    text: string;
    font?: {
      size?: number;
      weight?: string;
      family?: string;
    };
    color?: string;
  };
  min?: number;
  max?: number;
  suggestedMin?: number;
  suggestedMax?: number;
  ticks?: {
    stepSize?: number;
    maxTicksLimit?: number;
    format?: string;
    callback?: (value: any, index: number, values: any[]) => string;
  };
  grid?: {
    display?: boolean;
    color?: string;
    lineWidth?: number;
    drawBorder?: boolean;
    drawOnChartArea?: boolean;
    drawTicks?: boolean;
  };
  time?: {
    unit?: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
    displayFormats?: Record<string, string>;
    tooltipFormat?: string;
  };
}

// Legend configuration
export interface LegendConfig {
  display: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'chartArea';
  align?: 'start' | 'center' | 'end';
  maxHeight?: number;
  maxWidth?: number;
  fullSize?: boolean;
  reverse?: boolean;
  labels?: {
    color?: string;
    font?: {
      size?: number;
      weight?: string;
      family?: string;
    };
    padding?: number;
    usePointStyle?: boolean;
    pointStyle?: string;
    generateLabels?: (chart: any) => any[];
    filter?: (legendItem: any, chartData: any) => boolean;
  };
  onClick?: (event: MouseEvent, legendItem: any, legend: any) => void;
  onHover?: (event: MouseEvent, legendItem: any, legend: any) => void;
  onLeave?: (event: MouseEvent, legendItem: any, legend: any) => void;
}

// Tooltip configuration
export interface TooltipConfig {
  enabled: boolean;
  external?: (context: any) => void;
  mode?: 'point' | 'nearest' | 'index' | 'dataset' | 'x' | 'y';
  intersect?: boolean;
  position?: 'average' | 'nearest';
  callbacks?: {
    beforeTitle?: (tooltipItems: any[]) => string | string[];
    title?: (tooltipItems: any[]) => string | string[];
    afterTitle?: (tooltipItems: any[]) => string | string[];
    beforeBody?: (tooltipItems: any[]) => string | string[];
    beforeLabel?: (tooltipItem: any) => string | string[];
    label?: (tooltipItem: any) => string | string[];
    labelColor?: (tooltipItem: any) => { borderColor: string; backgroundColor: string };
    labelTextColor?: (tooltipItem: any) => string;
    afterLabel?: (tooltipItem: any) => string | string[];
    afterBody?: (tooltipItems: any[]) => string | string[];
    beforeFooter?: (tooltipItems: any[]) => string | string[];
    footer?: (tooltipItems: any[]) => string | string[];
    afterFooter?: (tooltipItems: any[]) => string | string[];
  };
  filter?: (tooltipItem: any, data: any) => boolean;
  itemSort?: (a: any, b: any, data: any) => number;
  backgroundColor?: string;
  titleColor?: string;
  titleFont?: {
    size?: number;
    weight?: string;
    family?: string;
  };
  bodyColor?: string;
  bodyFont?: {
    size?: number;
    weight?: string;
    family?: string;
  };
  footerColor?: string;
  footerFont?: {
    size?: number;
    weight?: string;
    family?: string;
  };
  padding?: number;
  caretPadding?: number;
  caretSize?: number;
  cornerRadius?: number;
  multiKeyBackground?: string;
  displayColors?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

// Chart configuration
export interface ChartConfig {
  type: ChartType;
  datasets: Dataset[];
  labels?: string[];
  title?: {
    display: boolean;
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    font?: {
      size?: number;
      weight?: string;
      family?: string;
    };
    color?: string;
    padding?: number;
  };
  subtitle?: {
    display: boolean;
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    font?: {
      size?: number;
      weight?: string;
      family?: string;
    };
    color?: string;
    padding?: number;
  };
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  yAxes?: AxisConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
  resizeDelay?: number;
  animation?: {
    duration?: number;
    easing?: string;
    onComplete?: () => void;
    onProgress?: (animation: any) => void;
  };
  interaction?: {
    mode?: string;
    intersect?: boolean;
  };
  plugins?: Record<string, any>;
  scales?: Record<string, AxisConfig>;
}

// Visualization theme
export interface VisualizationTheme {
  name: string;
  colors: {
    primary: string[];
    secondary: string[];
    success: string[];
    warning: string[];
    danger: string[];
    info: string[];
    neutral: string[];
    gradient: string[];
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius: number;
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  background: {
    primary: string;
    secondary: string;
    surface: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
  chart: {
    gridColor: string;
    tickColor: string;
    tooltipBackground: string;
    tooltipBorder: string;
    legendColor: string;
  };
}

// Network graph types
export interface NetworkNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  shape?: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
  image?: string;
  borderWidth?: number;
  borderColor?: string;
  font?: {
    size?: number;
    color?: string;
    face?: string;
  };
  physics?: boolean;
  fixed?: {
    x?: boolean;
    y?: boolean;
  };
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  color?: string | {
    color?: string;
    highlight?: string;
    hover?: string;
    inherit?: boolean | string;
    opacity?: number;
  };
  width?: number;
  length?: number;
  dashes?: boolean | number[];
  arrows?: {
    to?: {
      enabled?: boolean;
      type?: string;
      scaleFactor?: number;
    };
    from?: {
      enabled?: boolean;
      type?: string;
      scaleFactor?: number;
    };
  };
  font?: {
    size?: number;
    color?: string;
    face?: string;
    align?: string;
  };
  smooth?: boolean | {
    enabled?: boolean;
    type?: string;
    forceDirection?: string;
    roundness?: number;
  };
  physics?: boolean;
  metadata?: Record<string, any>;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  groups?: {
    [key: string]: {
      color: string;
      shape?: string;
      font?: any;
    };
  };
}

export interface NetworkGraphOptions {
  width?: string;
  height?: string;
  physics?: {
    enabled?: boolean;
    stabilization?: {
      enabled?: boolean;
      iterations?: number;
    };
    barnesHut?: {
      gravitationalConstant?: number;
      centralGravity?: number;
      springLength?: number;
      springConstant?: number;
      damping?: number;
    };
  };
  layout?: {
    randomSeed?: number;
    improvedLayout?: boolean;
    hierarchical?: {
      enabled?: boolean;
      levelSeparation?: number;
      nodeSpacing?: number;
      treeSpacing?: number;
      blockShifting?: boolean;
      edgeMinimization?: boolean;
      parentCentralization?: boolean;
      direction?: 'UD' | 'DU' | 'LR' | 'RL';
      sortMethod?: 'hubsize' | 'directed';
    };
  };
  interaction?: {
    dragNodes?: boolean;
    dragView?: boolean;
    hideEdgesOnDrag?: boolean;
    hideNodesOnDrag?: boolean;
    hover?: boolean;
    hoverConnectedEdges?: boolean;
    keyboard?: {
      enabled?: boolean;
      speed?: {
        x?: number;
        y?: number;
        zoom?: number;
      };
      bindToWindow?: boolean;
    };
    multiselect?: boolean;
    navigationButtons?: boolean;
    selectable?: boolean;
    selectConnectedEdges?: boolean;
    tooltipDelay?: number;
    zoomView?: boolean;
  };
  manipulation?: {
    enabled?: boolean;
    initiallyActive?: boolean;
    addNode?: boolean;
    addEdge?: boolean;
    editNode?: boolean;
    editEdge?: boolean;
    deleteNode?: boolean;
    deleteEdge?: boolean;
  };
}

// Timeline visualization types
export interface TimelineItem {
  id: string;
  start: Date | string;
  end?: Date | string;
  content: string;
  title?: string;
  group?: string;
  className?: string;
  style?: string;
  type?: 'box' | 'point' | 'range' | 'background';
  align?: 'center' | 'left' | 'right';
  editable?: boolean | {
    add?: boolean;
    updateTime?: boolean;
    updateGroup?: boolean;
    remove?: boolean;
  };
  selectable?: boolean;
  metadata?: Record<string, any>;
}

export interface TimelineGroup {
  id: string;
  content: string;
  title?: string;
  className?: string;
  style?: string;
  order?: number;
  subgroupOrder?: string | ((a: any, b: any) => number);
  nestedGroups?: string[];
  showNested?: boolean;
  metadata?: Record<string, any>;
}

export interface TimelineOptions {
  align?: 'center' | 'left' | 'right';
  autoResize?: boolean;
  clickToUse?: boolean;
  dataAttributes?: string | string[];
  editable?: boolean | {
    add?: boolean;
    updateTime?: boolean;
    updateGroup?: boolean;
    remove?: boolean;
    overrideItems?: boolean;
  };
  end?: Date | number | string;
  format?: {
    minorLabels?: {
      millisecond?: string;
      second?: string;
      minute?: string;
      hour?: string;
      weekday?: string;
      day?: string;
      month?: string;
      year?: string;
    };
    majorLabels?: {
      millisecond?: string;
      second?: string;
      minute?: string;
      hour?: string;
      weekday?: string;
      day?: string;
      month?: string;
      year?: string;
    };
  };
  groupOrder?: string | ((a: any, b: any) => number);
  height?: number | string;
  hiddenDates?: Array<{
    start: Date | number | string;
    end: Date | number | string;
    repeat?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }>;
  horizontalScroll?: boolean;
  itemsAlwaysDraggable?: boolean;
  locale?: string;
  locales?: Record<string, any>;
  margin?: {
    axis?: number;
    item?: {
      horizontal?: number;
      vertical?: number;
    };
  };
  max?: Date | number | string;
  maxHeight?: number | string;
  min?: Date | number | string;
  minHeight?: number | string;
  moveable?: boolean;
  multiselect?: boolean;
  orientation?: {
    axis?: 'both' | 'bottom' | 'top';
    item?: 'bottom' | 'top';
  };
  selectable?: boolean;
  showCurrentTime?: boolean;
  showMajorLabels?: boolean;
  showMinorLabels?: boolean;
  stack?: boolean;
  start?: Date | number | string;
  timeAxis?: {
    scale?: 'millisecond' | 'second' | 'minute' | 'hour' | 'weekday' | 'day' | 'month' | 'year';
    step?: number;
  };
  tooltip?: {
    followMouse?: boolean;
    overflowMethod?: 'cap' | 'flip';
  };
  type?: 'box' | 'point' | 'range' | 'background';
  verticalScroll?: boolean;
  width?: string | number;
  zoomable?: boolean;
  zoomKey?: 'altKey' | 'ctrlKey' | 'metaKey';
  zoomMax?: number;
  zoomMin?: number;
}

// Geographic visualization types
export interface GeoDataPoint {
  id: string;
  latitude: number;
  longitude: number;
  value?: number;
  label?: string;
  color?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface GeoRegion {
  id: string;
  name: string;
  code?: string;
  coordinates: number[][][] | number[][][][]; // GeoJSON polygon/multipolygon
  value?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface MapVisualizationOptions {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  projection?: 'mercator' | 'natural-earth' | 'albers-usa' | 'orthographic' | 'stereographic';
  style?: 'street' | 'satellite' | 'terrain' | 'dark' | 'light';
  showControls?: boolean;
  showScale?: boolean;
  showAttribution?: boolean;
  interactive?: boolean;
  colorScale?: {
    domain?: [number, number];
    range?: string[];
    interpolate?: 'linear' | 'log' | 'sqrt' | 'pow';
  };
  legend?: {
    show?: boolean;
    title?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    format?: string;
  };
}

// Heatmap visualization types
export interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  metadata?: Record<string, any>;
}

export interface HeatmapOptions {
  colorScale?: {
    domain?: [number, number];
    range?: string[];
    interpolate?: 'linear' | 'log' | 'sqrt' | 'pow';
  };
  cellSize?: number;
  cellSpacing?: number;
  showLabels?: boolean;
  labelFormat?: string;
  showLegend?: boolean;
  legendTitle?: string;
  tooltipFormat?: string;
}

// Dashboard and layout types
export interface VisualizationWidget {
  id: string;
  title: string;
  description?: string;
  type: 'chart' | 'network' | 'timeline' | 'map' | 'heatmap' | 'table' | 'metric' | 'text';
  config: ChartConfig | NetworkGraphOptions | TimelineOptions | MapVisualizationOptions | HeatmapOptions | any;
  data: any;
  size: {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  position: {
    x: number;
    y: number;
  };
  refreshInterval?: number;
  dataSource?: {
    type: 'api' | 'static' | 'realtime';
    endpoint?: string;
    query?: string;
    parameters?: Record<string, any>;
  };
  filters?: VisualizationFilter[];
  interactions?: {
    drill?: boolean;
    filter?: boolean;
    export?: boolean;
    fullscreen?: boolean;
  };
  theme?: string;
  metadata?: Record<string, any>;
}

export interface VisualizationDashboard {
  id: string;
  title: string;
  description?: string;
  widgets: VisualizationWidget[];
  layout: {
    type: 'grid' | 'freeform';
    columns?: number;
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number];
    autoSize?: boolean;
    verticalCompact?: boolean;
    preventCollision?: boolean;
  };
  filters?: VisualizationFilter[];
  refreshInterval?: number;
  theme?: string;
  isPublic?: boolean;
  permissions?: {
    view?: string[];
    edit?: string[];
    admin?: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Filter and interaction types
export interface VisualizationFilter {
  id: string;
  type: 'date' | 'select' | 'multiselect' | 'range' | 'text' | 'boolean';
  field: string;
  label: string;
  value?: any;
  options?: Array<{
    label: string;
    value: any;
  }>;
  range?: {
    min: number;
    max: number;
    step?: number;
  };
  required?: boolean;
  dependent?: string[]; // IDs of other filters this depends on
  metadata?: Record<string, any>;
}

export interface DrillDownAction {
  type: 'navigate' | 'filter' | 'modal' | 'sidebar';
  target?: string; // URL or widget ID
  parameters?: Record<string, any>;
  filters?: VisualizationFilter[];
}

export interface VisualizationEvent {
  type: 'click' | 'hover' | 'select' | 'filter' | 'drill' | 'export';
  target: string; // widget ID
  data?: any;
  position?: {
    x: number;
    y: number;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

// Export and sharing types
export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'csv' | 'xlsx' | 'json';
  quality?: number; // For image formats
  dimensions?: {
    width: number;
    height: number;
  };
  includeData?: boolean;
  includeConfig?: boolean;
  backgroundColor?: string;
  title?: string;
  description?: string;
  watermark?: string;
}

export interface SharingOptions {
  type: 'public' | 'restricted' | 'private';
  permissions: {
    view?: boolean;
    interact?: boolean;
    download?: boolean;
  };
  expiration?: Date | string;
  password?: string;
  allowedDomains?: string[];
  embedOptions?: {
    width?: number;
    height?: number;
    autoResize?: boolean;
    showControls?: boolean;
    allowFullscreen?: boolean;
  };
}

// Analytics and performance types
export interface VisualizationAnalytics {
  widgetId: string;
  views: number;
  interactions: number;
  averageViewTime: number;
  bounceRate: number;
  popularFilters: Record<string, number>;
  performanceMetrics: {
    loadTime: number;
    renderTime: number;
    dataFetchTime: number;
    errorRate: number;
  };
  userFeedback: {
    rating: number;
    comments: string[];
  };
  dateRange: {
    start: string;
    end: string;
  };
}

export interface VisualizationPerformance {
  widgetId: string;
  metrics: {
    loadTime: number;
    renderTime: number;
    dataSize: number;
    memoryUsage: number;
    updateFrequency: number;
  };
  issues: Array<{
    type: 'performance' | 'error' | 'warning';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
  }>;
  recommendations: string[];
  timestamp: string;
}

// Real-time update types
export interface VisualizationUpdate {
  widgetId: string;
  type: 'data' | 'config' | 'filter' | 'theme';
  data?: any;
  config?: Partial<ChartConfig>;
  filters?: VisualizationFilter[];
  theme?: string;
  timestamp: string;
  source: 'user' | 'system' | 'realtime';
}

// Validation and error types
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface VisualizationError {
  type: 'data' | 'config' | 'render' | 'network' | 'permission';
  message: string;
  details?: any;
  widgetId?: string;
  timestamp: string;
  stack?: string;
  recoverable: boolean;
  suggestions?: string[];
}
