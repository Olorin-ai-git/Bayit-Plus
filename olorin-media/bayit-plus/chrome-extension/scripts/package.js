/**
 * Chrome Extension Packaging Script
 *
 * Creates ZIP file for Chrome Web Store submission
 * Includes all necessary files and excludes dev/test files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'packages');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get environment from process.env (default to production)
const env = process.env.VITE_ENV || 'production';
const version = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
const outputFileName = `bayit-translator-${env}-v${version}.zip`;
const outputPath = path.join(outputDir, outputFileName);

console.log(`📦 Packaging Chrome Extension...`);
console.log(`   Environment: ${env}`);
console.log(`   Version: ${version}`);
console.log(`   Output: ${outputFileName}`);

// Create zip archive
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Maximum compression
});

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Package created successfully!`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`   Location: ${outputPath}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Test the extension by loading ${outputPath} as unpacked extension`);
  console.log(`   2. Upload to Chrome Web Store: https://chrome.google.com/webstore/devconsole`);
  console.log(`   3. Submit for review`);
});

output.on('error', (err) => {
  console.error('❌ Failed to create package:', err);
  process.exit(1);
});

archive.on('error', (err) => {
  console.error('❌ Archive error:', err);
  process.exit(1);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Warning:', err);
  } else {
    throw err;
  }
});

// Pipe archive to output file
archive.pipe(output);

// Add dist directory contents to archive
if (!fs.existsSync(distDir)) {
  console.error(`❌ Error: dist directory not found at ${distDir}`);
  console.error('   Please run "npm run build:production" first');
  process.exit(1);
}

console.log('\n📁 Adding files to archive...');

// Add all files from dist directory
archive.directory(distDir, false);

// Finalize archive
archive.finalize();
