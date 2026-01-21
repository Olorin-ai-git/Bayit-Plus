/**
 * CORS Configuration
 * Provides Cross-Origin Resource Sharing settings
 */
export const corsConfig = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://cvplus.app',
        'https://getmycv-ai.web.app',
        'https://getmycv-ai.firebaseapp.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true
};
export default corsConfig;
//# sourceMappingURL=cors.js.map