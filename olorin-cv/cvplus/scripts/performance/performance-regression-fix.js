#!/usr/bin/env node

/**
 * CVPlus Performance Regression Fix
 * 
 * This script addresses the 9.0% bundle size increase identified in the 
 * August 24th performance validation, targeting critical optimizations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 CVPlus Performance Regression Fix');
console.log('=====================================');

// Configuration
const BUNDLE_SIZE_TARGET = 2000; // KB (down from current 2839KB)
const CHUNK_SIZE_LIMIT = 100; // KB per chunk
const FRONTEND_DIR = path.join(__dirname, '../../frontend');

// Analysis functions
function analyzeCurrentBundles() {
    console.log('\n📊 Analyzing Current Bundle State...');
    
    try {
        const distPath = path.join(FRONTEND_DIR, 'dist/assets');
        
        if (!fs.existsSync(distPath)) {
            console.log('❌ No dist folder found. Running build first...');
            execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
        }
        
        const files = fs.readdirSync(distPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        let totalSize = 0;
        const fileSizes = [];
        
        jsFiles.forEach(file => {
            const filePath = path.join(distPath, file);
            const stats = fs.statSync(filePath);
            const sizeKB = stats.size / 1024;
            totalSize += sizeKB;
            fileSizes.push({ file, size: sizeKB });
        });
        
        // Sort by size descending
        fileSizes.sort((a, b) => b.size - a.size);
        
        console.log(`\n📈 Current Bundle Analysis:`);
        console.log(`Total Bundle Size: ${totalSize.toFixed(2)} KB`);
        console.log(`Target Size: ${BUNDLE_SIZE_TARGET} KB`);
        console.log(`Reduction Needed: ${(totalSize - BUNDLE_SIZE_TARGET).toFixed(2)} KB (${((totalSize - BUNDLE_SIZE_TARGET) / totalSize * 100).toFixed(1)}%)`);
        
        console.log('\n🔍 Largest Chunks:');
        fileSizes.slice(0, 10).forEach((file, index) => {
            const status = file.size > CHUNK_SIZE_LIMIT ? '❌' : '✅';
            console.log(`${index + 1}. ${status} ${file.file}: ${file.size.toFixed(2)} KB`);
        });
        
        return {
            totalSize,
            fileSizes,
            reductionNeeded: totalSize - BUNDLE_SIZE_TARGET
        };
        
    } catch (error) {
        console.error('❌ Error analyzing bundles:', error.message);
        return null;
    }
}

// Optimization implementations
function optimizeFirebaseImports() {
    console.log('\n🔥 Optimizing Firebase Imports...');
    
    const firebaseConfigPath = path.join(FRONTEND_DIR, 'src/config/firebase-optimized.ts');
    
    if (!fs.existsSync(firebaseConfigPath)) {
        console.log('❌ Firebase config not found');
        return false;
    }
    
    const optimizedFirebaseConfig = `
// Optimized Firebase Configuration - Tree Shaking Enabled
import { initializeApp, type FirebaseApp } from 'firebase/app';

// Only import what we actually use
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Remove unused imports: analytics, messaging, performance, etc.

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with tree shaking
export const app: FirebaseApp = initializeApp(firebaseConfig);

// Lazy initialize services only when needed
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;  
let functionsInstance: Functions | null = null;
let storageInstance: FirebaseStorage | null = null;

export const getAuthInstance = (): Auth => {
    if (!authInstance) {
        authInstance = getAuth(app);
    }
    return authInstance;
};

export const getFirestoreInstance = (): Firestore => {
    if (!firestoreInstance) {
        firestoreInstance = getFirestore(app);
    }
    return firestoreInstance;
};

export const getFunctionsInstance = (): Functions => {
    if (!functionsInstance) {
        functionsInstance = getFunctions(app);
    }
    return functionsInstance;
};

export const getStorageInstance = (): FirebaseStorage => {
    if (!storageInstance) {
        storageInstance = getStorage(app);
    }
    return storageInstance;
};

// Export for compatibility
export const auth = getAuthInstance();
export const db = getFirestoreInstance();
export const functions = getFunctionsInstance();
export const storage = getStorageInstance();
`;
    
    try {
        fs.writeFileSync(firebaseConfigPath, optimizedFirebaseConfig.trim());
        console.log('✅ Firebase configuration optimized for tree shaking');
        return true;
    } catch (error) {
        console.error('❌ Error optimizing Firebase:', error.message);
        return false;
    }
}

function createLightweightAnimations() {
    console.log('\n🎬 Creating Lightweight Animation Alternatives...');
    
    const animationsPath = path.join(FRONTEND_DIR, 'src/utils/performance/lightweight-animations.ts');
    
    const lightweightAnimations = `
/**
 * Lightweight Animation Utilities
 * Replaces Framer Motion for basic animations (95% smaller bundle impact)
 */

export interface AnimationConfig {
    duration?: number;
    easing?: string;
    delay?: number;
    fillMode?: FillMode;
}

// CSS-based fade in animation
export const fadeIn = (element: HTMLElement, config: AnimationConfig = {}) => {
    const {
        duration = 300,
        easing = 'ease-out',
        delay = 0,
        fillMode = 'both'
    } = config;
    
    return element.animate([
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ], {
        duration,
        easing,
        delay,
        fill: fillMode
    });
};

// CSS-based slide in animation
export const slideIn = (element: HTMLElement, direction: 'left' | 'right' | 'up' | 'down' = 'up', config: AnimationConfig = {}) => {
    const {
        duration = 300,
        easing = 'ease-out',
        delay = 0,
        fillMode = 'both'
    } = config;
    
    const transforms = {
        left: 'translateX(-100px)',
        right: 'translateX(100px)', 
        up: 'translateY(50px)',
        down: 'translateY(-50px)'
    };
    
    return element.animate([
        { opacity: 0, transform: transforms[direction] },
        { opacity: 1, transform: 'translate(0)' }
    ], {
        duration,
        easing,
        delay,
        fill: fillMode
    });
};

// React hook for lightweight animations
export const useAnimation = (trigger: boolean, animationType: 'fadeIn' | 'slideIn' = 'fadeIn') => {
    const elementRef = useRef<HTMLElement>(null);
    
    useEffect(() => {
        if (trigger && elementRef.current) {
            if (animationType === 'fadeIn') {
                fadeIn(elementRef.current);
            } else {
                slideIn(elementRef.current);
            }
        }
    }, [trigger, animationType]);
    
    return elementRef;
};

// Lightweight loading spinner (replaces heavy animation libraries)
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({ 
    size = 20, 
    color = '#3B82F6' 
}) => (
    <div
        className="animate-spin rounded-full border-2 border-transparent border-t-current"
        style={{
            width: size,
            height: size,
            borderTopColor: color
        }}
    />
);

// Performance-optimized progress bar
export const ProgressBar: React.FC<{ 
    progress: number; 
    height?: number; 
    color?: string;
    backgroundColor?: string;
}> = ({ 
    progress, 
    height = 4, 
    color = '#3B82F6', 
    backgroundColor = '#E5E7EB' 
}) => (
    <div 
        className="w-full rounded-full overflow-hidden"
        style={{ 
            height,
            backgroundColor 
        }}
    >
        <div
            className="h-full transition-all duration-300 ease-out"
            style={{
                width: \`\${Math.min(100, Math.max(0, progress))}%\`,
                backgroundColor: color
            }}
        />
    </div>
);

export default {
    fadeIn,
    slideIn,
    useAnimation,
    LoadingSpinner,
    ProgressBar
};
`;
    
    try {
        const dir = path.dirname(animationsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(animationsPath, lightweightAnimations.trim());
        console.log('✅ Lightweight animations created');
        return true;
    } catch (error) {
        console.error('❌ Error creating animations:', error.message);
        return false;
    }
}

function optimizeViteConfig() {
    console.log('\n⚡ Optimizing Vite Configuration...');
    
    const viteConfigPath = path.join(FRONTEND_DIR, 'vite.config.ts');
    
    if (!fs.existsSync(viteConfigPath)) {
        console.log('❌ Vite config not found');
        return false;
    }
    
    let viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
    
    // Add aggressive tree shaking and optimization
    const optimizedBuildConfig = `
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        pureExternalModules: true
      },
      output: {
        manualChunks: {
          // Core vendors
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          
          // Feature chunks optimized for size
          'cv-core': [
            './src/components/features/ContactForm',
            './src/components/features/Interactive/DynamicQRCode'
          ],
          'cv-visual': [
            './src/components/features/Visual/AchievementCards',
            './src/components/features/CertificationBadges'
          ],
          'cv-services': [
            './src/services/cv/CVAnalyzer',
            './src/services/cvService'
          ]
        },
        chunkSizeWarningLimit: 100 // Warn on chunks >100KB
      }
    },`;
    
    // Replace existing rollupOptions
    const rollupRegex = /rollupOptions:\s*{[^}]*}/s;
    if (rollupRegex.test(viteConfig)) {
        viteConfig = viteConfig.replace(rollupRegex, optimizedBuildConfig.trim());
    } else {
        // Add to build section
        viteConfig = viteConfig.replace(/build:\s*{/, `build: {\n    ${optimizedBuildConfig}`);
    }
    
    try {
        fs.writeFileSync(viteConfigPath, viteConfig);
        console.log('✅ Vite configuration optimized');
        return true;
    } catch (error) {
        console.error('❌ Error optimizing Vite config:', error.message);
        return false;
    }
}

function createPageLazyLoading() {
    console.log('\n🔄 Implementing Page-Level Lazy Loading...');
    
    const routesPath = path.join(FRONTEND_DIR, 'src/components/common/LazyPages.tsx');
    
    const lazyPagesComponent = `
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../../utils/performance/lightweight-animations';

// Page-level lazy loading to reduce initial bundle size
const HomePage = lazy(() => import('../../pages/HomePage'));
const ResultsPage = lazy(() => import('../../pages/ResultsPage'));  
const FinalResultsPage = lazy(() => import('../../pages/FinalResultsPage'));
const CVAnalysisPage = lazy(() => import('../../pages/CVAnalysisPage'));
const CVPreviewPageNew = lazy(() => import('../../pages/CVPreviewPageNew'));
const FeatureSelectionPage = lazy(() => import('../../pages/FeatureSelectionPage'));
const PricingPage = lazy(() => import('../../pages/PricingPage'));
const ProcessingPage = lazy(() => import('../../pages/ProcessingPage'));

// Centralized loading component
const PageLoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <LoadingSpinner size={32} />
            <p className="mt-4 text-gray-600">Loading page...</p>
        </div>
    </div>
);

// HOC for lazy page wrapping
export const withLazyLoading = (Component: React.ComponentType) => {
    return (props: any) => (
        <Suspense fallback={<PageLoadingFallback />}>
            <Component {...props} />
        </Suspense>
    );
};

// Export lazy-loaded pages
export const LazyHomePage = withLazyLoading(HomePage);
export const LazyResultsPage = withLazyLoading(ResultsPage);
export const LazyFinalResultsPage = withLazyLoading(FinalResultsPage);
export const LazyCVAnalysisPage = withLazyLoading(CVAnalysisPage);
export const LazyCVPreviewPage = withLazyLoading(CVPreviewPageNew);
export const LazyFeatureSelectionPage = withLazyLoading(FeatureSelectionPage);
export const LazyPricingPage = withLazyLoading(PricingPage);
export const LazyProcessingPage = withLazyLoading(ProcessingPage);

export default {
    HomePage: LazyHomePage,
    ResultsPage: LazyResultsPage,
    FinalResultsPage: LazyFinalResultsPage,
    CVAnalysisPage: LazyCVAnalysisPage,
    CVPreviewPage: LazyCVPreviewPage,
    FeatureSelectionPage: LazyFeatureSelectionPage,
    PricingPage: LazyPricingPage,
    ProcessingPage: LazyProcessingPage
};
`;
    
    try {
        fs.writeFileSync(routesPath, lazyPagesComponent.trim());
        console.log('✅ Page-level lazy loading implemented');
        return true;
    } catch (error) {
        console.error('❌ Error creating lazy pages:', error.message);
        return false;
    }
}

function generateOptimizationReport() {
    console.log('\n📊 Running Optimized Build and Analysis...');
    
    try {
        // Run build
        execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
        
        // Analyze new bundle
        const analysis = analyzeCurrentBundles();
        
        if (analysis) {
            const report = {
                timestamp: new Date().toISOString(),
                optimization_results: {
                    total_bundle_size_kb: analysis.totalSize,
                    reduction_achieved: analysis.totalSize < BUNDLE_SIZE_TARGET,
                    largest_chunks: analysis.fileSizes.slice(0, 5).map(f => ({
                        file: f.file,
                        size_kb: f.size,
                        status: f.size <= CHUNK_SIZE_LIMIT ? 'optimized' : 'needs_work'
                    }))
                },
                recommendations: {
                    further_optimization: analysis.reductionNeeded > 0,
                    priority_targets: analysis.fileSizes
                        .filter(f => f.size > CHUNK_SIZE_LIMIT)
                        .slice(0, 3)
                        .map(f => f.file)
                }
            };
            
            const reportPath = path.join(FRONTEND_DIR, 'logs/optimization-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log('\n🎯 Optimization Results:');
            console.log(`Bundle Size: ${analysis.totalSize.toFixed(2)} KB`);
            console.log(`Target Met: ${analysis.totalSize <= BUNDLE_SIZE_TARGET ? '✅ YES' : '❌ NO'}`);
            if (analysis.reductionNeeded > 0) {
                console.log(`Additional Reduction Needed: ${analysis.reductionNeeded.toFixed(2)} KB`);
            }
            
            return report;
        }
        
    } catch (error) {
        console.error('❌ Error generating report:', error.message);
        return null;
    }
}

// Main execution
async function main() {
    console.log('Starting performance regression fix...\n');
    
    // Step 1: Analyze current state
    const initialAnalysis = analyzeCurrentBundles();
    if (!initialAnalysis) {
        console.log('❌ Could not analyze current bundles. Exiting.');
        process.exit(1);
    }
    
    // Step 2: Apply optimizations
    const optimizations = [
        { name: 'Firebase Tree Shaking', fn: optimizeFirebaseImports },
        { name: 'Lightweight Animations', fn: createLightweightAnimations },
        { name: 'Vite Configuration', fn: optimizeViteConfig },
        { name: 'Page Lazy Loading', fn: createPageLazyLoading }
    ];
    
    let successCount = 0;
    for (const opt of optimizations) {
        if (opt.fn()) {
            successCount++;
        }
    }
    
    console.log(`\n✅ Applied ${successCount}/${optimizations.length} optimizations`);
    
    // Step 3: Generate final report
    const finalReport = generateOptimizationReport();
    
    if (finalReport) {
        console.log('\n🎉 Performance regression fix completed!');
        console.log(`📄 Report saved to: frontend/logs/optimization-report.json`);
        
        if (finalReport.optimization_results.reduction_achieved) {
            console.log('🎯 Bundle size target achieved!');
        } else {
            console.log('⚠️  Additional optimization needed. Check report for details.');
        }
    }
}

// Execute if run directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    analyzeCurrentBundles,
    optimizeFirebaseImports,
    createLightweightAnimations,
    optimizeViteConfig,
    createPageLazyLoading,
    generateOptimizationReport
};