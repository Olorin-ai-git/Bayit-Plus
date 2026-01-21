/**
 * CORS Configuration
 * Provides Cross-Origin Resource Sharing settings
  */
export interface CorsConfig {
    origin: string[] | string;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
}
export declare const corsConfig: CorsConfig;
export default corsConfig;
//# sourceMappingURL=cors.d.ts.map