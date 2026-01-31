/**
 * Helper script to identify missing keys in locale files compared to en.json
 * Run: node _translate_helper.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const en = JSON.parse(readFileSync(join(__dirname, 'en.json'), 'utf8'));
const enKeys = flattenKeys(en);

for (const lang of ['hi', 'ta', 'bn']) {
  const locale = JSON.parse(readFileSync(join(__dirname, `${lang}.json`), 'utf8'));
  const localeKeys = flattenKeys(locale);
  const missing = enKeys.filter(k => !localeKeys.includes(k));
  const extra = localeKeys.filter(k => !enKeys.includes(k));

  console.log(`\n=== ${lang}.json ===`);
  console.log(`EN keys: ${enKeys.length}`);
  console.log(`${lang} keys: ${localeKeys.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Extra: ${extra.length}`);

  // Show top-level sections missing
  const missingSections = new Set();
  missing.forEach(k => missingSections.add(k.split('.')[0]));
  console.log(`Missing sections: ${[...missingSections].join(', ')}`);
}
