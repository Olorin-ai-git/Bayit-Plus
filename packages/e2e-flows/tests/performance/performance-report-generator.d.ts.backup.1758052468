/**
 * Performance Report Generator
 * Generates comprehensive HTML and JSON reports from performance test results
 */
export interface PerformanceTestResult {
    testName: string;
    service: string;
    duration: number;
    memoryUsed: number;
    operationsPerSecond: number;
    errorRate: number;
    successRate: number;
    passed: boolean;
    timestamp: Date;
    details: Record<string, any>;
    violations: string[];
}
export interface PerformanceReport {
    summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        overallSuccessRate: number;
        totalDuration: number;
        averageMemoryUsage: number;
        peakMemoryUsage: number;
        averageOperationsPerSecond: number;
        reportGenerated: Date;
    };
    systemInfo: {
        platform: string;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        cpuCount: number;
    };
    testResults: PerformanceTestResult[];
    recommendations: string[];
    performanceTrends: {
        memoryTrend: 'stable' | 'increasing' | 'decreasing';
        performanceTrend: 'stable' | 'improving' | 'degrading';
        riskLevel: 'low' | 'medium' | 'high';
    };
}
export declare class PerformanceReportGenerator {
    private results;
    private outputDir;
    constructor(outputDir?: string);
    /**
     * Add a performance test result
     */
    addResult(result: PerformanceTestResult): void;
    /**
     * Add multiple results from a service
     */
    addServiceResults(serviceName: string, serviceResults: Record<string, any>): void;
    /**
     * Generate complete performance report
     */
    generateReport(): PerformanceReport;
    /**
     * Save report to JSON file
     */
    saveJsonReport(filename?: string): Promise<string>;
    /**
     * Save report to HTML file
     */
    saveHtmlReport(filename?: string): Promise<string>;
    /**
     * Generate dashboard with all reports
     */
    generateDashboard(): Promise<string>;
    private generateSummary;
    private getSystemInfo;
    private generateRecommendations;
    private analyzePerformanceTrends;
    private groupResultsByService;
    private generateHtmlReport;
    private generateDashboard2;
    private ensureOutputDirectory;
}
export default PerformanceReportGenerator;
//# sourceMappingURL=performance-report-generator.d.ts.map