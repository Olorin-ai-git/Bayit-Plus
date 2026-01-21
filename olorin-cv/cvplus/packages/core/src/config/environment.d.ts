/**
 * Secure Environment Configuration System
 * Provides comprehensive validation, sanitization, and security for environment variables
  */
export declare enum SecurityEventType {
    MISSING_REQUIRED_VAR = "MISSING_REQUIRED_VAR",
    INVALID_FORMAT = "INVALID_FORMAT",
    SUSPICIOUS_VALUE = "SUSPICIOUS_VALUE",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    CONFIG_ACCESS_ATTEMPT = "CONFIG_ACCESS_ATTEMPT"
}
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
interface SecureConfig {
    baseUrl?: string;
    firebase: {
        apiKey?: string;
        authDomain?: string;
        projectId?: string;
        messagingSenderId?: string;
        appId?: string;
    };
    storage: {
        bucketName: string;
    };
    stripe: {
        secretKey?: string;
        webhookSecret?: string;
        pricing: {
            priceIdDev?: string;
            priceIdStaging?: string;
            priceIdProd?: string;
        };
    };
    email: {
        user?: string;
        password?: string;
        from: string;
        sendgridApiKey?: string;
        resendApiKey?: string;
    };
    rag: {
        openaiApiKey?: string;
        pineconeApiKey?: string;
        pineconeEnvironment: string;
        pineconeIndex: string;
    };
    openai: {
        apiKey?: string;
    };
    elevenLabs: {
        apiKey?: string;
        host1VoiceId?: string;
        host2VoiceId?: string;
    };
    videoGeneration: {
        didApiKey?: string;
        synthesiaApiKey?: string;
        heygenApiKey?: string;
        runwaymlApiKey?: string;
        avatars: {
            professional: {
                id?: string;
                voiceId?: string;
            };
            friendly: {
                id?: string;
                voiceId?: string;
            };
            energetic: {
                id?: string;
                voiceId?: string;
            };
        };
    };
    search: {
        serperApiKey?: string;
    };
    features: {
        publicProfiles: {
            baseUrl: string;
        };
        enableVideoGeneration: boolean;
        enablePodcastGeneration: boolean;
        enablePublicProfiles: boolean;
        enableRagChat: boolean;
    };
    redis?: {
        url?: string;
        host?: string;
        port?: number;
        password?: string;
    };
}
export declare const config: SecureConfig;
export declare const environmentUtils: {
    getValidationResult: () => ValidationResult;
    validateConfiguration: () => ValidationResult;
    performHealthCheck: () => {
        status: "healthy" | "degraded" | "unhealthy";
        details: {
            healthPercentage: number;
            healthyServices: string;
            errorCount: number;
            warningCount: number;
        };
    };
    isServiceAvailable: (serviceName: keyof SecureConfig) => boolean;
};
export {};
//# sourceMappingURL=environment.d.ts.map