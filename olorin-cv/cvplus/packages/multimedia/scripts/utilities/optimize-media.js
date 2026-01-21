#!/usr/bin/env node

/**
 * CVPlus Multimedia Optimization Utility
 * Optimizes media files for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    section: (msg) => console.log(`${colors.magenta}🎬 ${msg}${colors.reset}`)
};

class MediaOptimizer {
    constructor() {
        this.mediaDir = path.join(process.cwd(), 'src');
        this.outputDir = path.join(process.cwd(), 'optimized-media');
        this.stats = {
            processed: 0,
            optimized: 0,
            errors: 0,
            originalSize: 0,
            optimizedSize: 0
        };
    }

    async initialize() {
        log.section('Initializing Media Optimization');
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            log.info('Created output directory');
        }
    }

    async optimizeImages() {
        log.section('Optimizing Images');
        
        // Find image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const imageFiles = this.findFilesByExtensions(this.mediaDir, imageExtensions);
        
        for (const imageFile of imageFiles) {
            try {
                await this.optimizeImage(imageFile);
                this.stats.optimized++;
            } catch (error) {
                log.error(`Failed to optimize image: ${imageFile}`);
                this.stats.errors++;
            }
            this.stats.processed++;
        }
        
        log.success(`Processed ${imageFiles.length} images`);
    }

    async optimizeImage(imagePath) {
        const relativePath = path.relative(this.mediaDir, imagePath);
        const outputPath = path.join(this.outputDir, relativePath);
        const outputDir = path.dirname(outputPath);
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const originalSize = fs.statSync(imagePath).size;
        this.stats.originalSize += originalSize;
        
        // Use Sharp for image optimization (if available)
        try {
            const sharp = require('sharp');
            
            await sharp(imagePath)
                .jpeg({ quality: 85, progressive: true })
                .png({ quality: 85, compressionLevel: 6 })
                .webp({ quality: 85 })
                .toFile(outputPath);
                
            const optimizedSize = fs.statSync(outputPath).size;
            this.stats.optimizedSize += optimizedSize;
            
            const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
            log.info(`Optimized ${relativePath} - ${savings}% smaller`);
            
        } catch (error) {
            // Fallback: copy original file
            fs.copyFileSync(imagePath, outputPath);
            this.stats.optimizedSize += originalSize;
            log.warning(`Sharp not available, copied original: ${relativePath}`);
        }
    }

    async validateMediaProcessors() {
        log.section('Validating Media Processors');
        
        const validators = [
            this.validateFFmpeg,
            this.validateSharp,
            this.validateImageSize,
            this.validateMusicMetadata
        ];
        
        for (const validator of validators) {
            try {
                await validator.call(this);
            } catch (error) {
                log.error(`Validation failed: ${error.message}`);
                this.stats.errors++;
            }
        }
    }

    async validateFFmpeg() {
        try {
            execSync('ffmpeg -version', { stdio: 'pipe' });
            log.success('FFmpeg is available');
        } catch (error) {
            log.warning('FFmpeg not available - video processing limited');
        }
    }

    async validateSharp() {
        try {
            require('sharp');
            log.success('Sharp is available for image processing');
        } catch (error) {
            log.warning('Sharp not available - image optimization limited');
        }
    }

    async validateImageSize() {
        try {
            require('image-size');
            log.success('Image-size is available for metadata extraction');
        } catch (error) {
            log.warning('Image-size not available - metadata extraction limited');
        }
    }

    async validateMusicMetadata() {
        try {
            require('music-metadata');
            log.success('Music-metadata is available for audio processing');
        } catch (error) {
            log.warning('Music-metadata not available - audio processing limited');
        }
    }

    findFilesByExtensions(directory, extensions) {
        const files = [];
        
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (extensions.includes(path.extname(item).toLowerCase())) {
                    files.push(fullPath);
                }
            }
        };
        
        scanDirectory(directory);
        return files;
    }

    generateReport() {
        log.section('Optimization Report');
        
        console.log('📊 Statistics:');
        console.log(`   Files processed: ${this.stats.processed}`);
        console.log(`   Files optimized: ${this.stats.optimized}`);
        console.log(`   Errors: ${this.stats.errors}`);
        
        if (this.stats.originalSize > 0) {
            const totalSavings = this.stats.originalSize - this.stats.optimizedSize;
            const savingsPercent = (totalSavings / this.stats.originalSize * 100).toFixed(1);
            
            console.log('💾 Size Analysis:');
            console.log(`   Original size: ${this.formatFileSize(this.stats.originalSize)}`);
            console.log(`   Optimized size: ${this.formatFileSize(this.stats.optimizedSize)}`);
            console.log(`   Total savings: ${this.formatFileSize(totalSavings)} (${savingsPercent}%)`);
        }
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    async run() {
        try {
            await this.initialize();
            await this.validateMediaProcessors();
            await this.optimizeImages();
            this.generateReport();
            
            log.success('Media optimization completed successfully!');
            process.exit(0);
            
        } catch (error) {
            log.error(`Optimization failed: ${error.message}`);
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const optimizer = new MediaOptimizer();
    optimizer.run();
}

module.exports = MediaOptimizer;