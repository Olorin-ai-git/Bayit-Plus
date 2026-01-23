/**
 * @olorin/assets - Asset Package Tests
 * Validates that all required assets exist and constants are correct
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  ASSET_PATHS,
  FAVICON_SIZES,
  WIZARD_VARIANTS,
  FAVICON_METADATA,
  WIZARD_LOGO_METADATA,
} from '../src/constants';

const DIST_DIR = path.join(__dirname, '../dist');
const FAVICONS_DIR = path.join(DIST_DIR, 'favicons');
const LOGOS_DIR = path.join(DIST_DIR, 'logos');
const WIZARD_LOGOS_DIR = path.join(LOGOS_DIR, 'wizard');

describe('@olorin/assets - Constants', () => {
  it('should export all favicon sizes', () => {
    expect(FAVICON_SIZES).toEqual([16, 32, 64, 128, 192, 512]);
  });

  it('should export all wizard variants', () => {
    expect(WIZARD_VARIANTS).toEqual(['main', 'fraud', 'streaming', 'radio', 'omen']);
  });

  it('should have correct number of favicon metadata entries', () => {
    expect(FAVICON_METADATA).toHaveLength(8);
  });

  it('should have wizard logo metadata for all variants', () => {
    WIZARD_VARIANTS.forEach((variant) => {
      expect(WIZARD_LOGO_METADATA[variant]).toBeDefined();
      expect(WIZARD_LOGO_METADATA[variant].name).toBeTruthy();
      expect(WIZARD_LOGO_METADATA[variant].alt).toBeTruthy();
    });
  });

  it('should have consistent asset paths structure', () => {
    expect(ASSET_PATHS.favicons).toBeDefined();
    expect(ASSET_PATHS.logos).toBeDefined();
    expect(ASSET_PATHS.logos.wizard).toBeDefined();
  });
});

describe('@olorin/assets - Favicon Files', () => {
  it('should have all favicon size files in dist', () => {
    FAVICON_SIZES.forEach((size) => {
      const faviconPath = path.join(FAVICONS_DIR, `${size}x${size}.png`);
      expect(fs.existsSync(faviconPath)).toBe(true);

      const stats = fs.statSync(faviconPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  it('should have apple-touch-icon in dist', () => {
    const appleTouchIconPath = path.join(FAVICONS_DIR, 'apple-touch-icon.png');
    expect(fs.existsSync(appleTouchIconPath)).toBe(true);

    const stats = fs.statSync(appleTouchIconPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should have favicon.ico in dist', () => {
    const faviconIcoPath = path.join(FAVICONS_DIR, 'favicon.ico');
    expect(fs.existsSync(faviconIcoPath)).toBe(true);

    const stats = fs.statSync(faviconIcoPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should have exactly 8 favicon files', () => {
    const faviconFiles = fs.readdirSync(FAVICONS_DIR);
    expect(faviconFiles).toHaveLength(8);
  });
});

describe('@olorin/assets - Logo Files', () => {
  it('should have all wizard logo variants in dist', () => {
    WIZARD_VARIANTS.forEach((variant) => {
      const logoPath = path.join(WIZARD_LOGOS_DIR, `${variant}.png`);
      expect(fs.existsSync(logoPath)).toBe(true);

      const stats = fs.statSync(logoPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  it('should have exactly 5 wizard logo variants', () => {
    const wizardLogos = fs.readdirSync(WIZARD_LOGOS_DIR);
    expect(wizardLogos).toHaveLength(5);
  });

  it('should have olorin brand logos in dist', () => {
    const olorinLogoPath = path.join(LOGOS_DIR, 'olorin-logo.png');
    const olorinTextLogoPath = path.join(LOGOS_DIR, 'olorin-text-logo.png');

    expect(fs.existsSync(olorinLogoPath)).toBe(true);
    expect(fs.existsSync(olorinTextLogoPath)).toBe(true);

    expect(fs.statSync(olorinLogoPath).size).toBeGreaterThan(0);
    expect(fs.statSync(olorinTextLogoPath).size).toBeGreaterThan(0);
  });
});

describe('@olorin/assets - Package Integrity', () => {
  it('should have dist directory', () => {
    expect(fs.existsSync(DIST_DIR)).toBe(true);
  });

  it('should have compiled TypeScript files', () => {
    const indexJs = path.join(DIST_DIR, 'index.js');
    const constantsJs = path.join(DIST_DIR, 'constants.js');

    expect(fs.existsSync(indexJs)).toBe(true);
    expect(fs.existsSync(constantsJs)).toBe(true);
  });

  it('should have TypeScript declaration files', () => {
    const indexDts = path.join(DIST_DIR, 'index.d.ts');
    const constantsDts = path.join(DIST_DIR, 'constants.d.ts');

    expect(fs.existsSync(indexDts)).toBe(true);
    expect(fs.existsSync(constantsDts)).toBe(true);
  });

  it('should have both CJS and ESM builds', () => {
    const indexCjs = path.join(DIST_DIR, 'index.js');
    const indexEsm = path.join(DIST_DIR, 'index.mjs');

    expect(fs.existsSync(indexCjs)).toBe(true);
    expect(fs.existsSync(indexEsm)).toBe(true);
  });
});

describe('@olorin/assets - Asset Sizes', () => {
  it('should have reasonably sized favicon files', () => {
    // Favicons should be between 1KB and 200KB
    const MIN_SIZE = 1024; // 1KB
    const MAX_SIZE = 200 * 1024; // 200KB

    FAVICON_SIZES.forEach((size) => {
      const faviconPath = path.join(FAVICONS_DIR, `${size}x${size}.png`);
      const stats = fs.statSync(faviconPath);
      expect(stats.size).toBeGreaterThan(MIN_SIZE);
      expect(stats.size).toBeLessThan(MAX_SIZE);
    });
  });

  it('should have reasonably sized logo files', () => {
    // Logos should be between 10KB and 500KB
    const MIN_SIZE = 10 * 1024; // 10KB
    const MAX_SIZE = 500 * 1024; // 500KB

    WIZARD_VARIANTS.forEach((variant) => {
      const logoPath = path.join(WIZARD_LOGOS_DIR, `${variant}.png`);
      const stats = fs.statSync(logoPath);
      expect(stats.size).toBeGreaterThan(MIN_SIZE);
      expect(stats.size).toBeLessThan(MAX_SIZE);
    });
  });
});
