import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const ta = JSON.parse(fs.readFileSync('ta.json', 'utf8'));

function findMissing(en, ta, prefix = '') {
  const missing = [];
  for (const key in en) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!ta[key] || typeof ta[key] !== 'object') {
        missing.push(fullKey);
      } else {
        missing.push(...findMissing(en[key], ta[key], fullKey));
      }
    } else if (!(key in ta)) {
      missing.push(fullKey);
    }
  }
  return missing;
}

const missing = findMissing(en, ta);
console.log('Missing keys (first 150):');
missing.slice(0, 150).forEach(k => console.log(k));
console.log(`Total: ${missing.length}`);
