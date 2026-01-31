import fs from 'fs';

const lang = process.argv[2] || 'it';
const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const target = JSON.parse(fs.readFileSync(lang + '.json', 'utf8'));

function findMissing(en, target, prefix = '') {
  const missing = [];
  for (const key of Object.keys(en)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push({ key: fullKey, type: 'section', value: en[key] });
      } else {
        missing.push(...findMissing(en[key], target[key], fullKey));
      }
    } else if (!(key in (target || {}))) {
      missing.push({ key: fullKey, type: 'key', value: en[key] });
    }
  }
  return missing;
}

function countKeys(obj) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

const missing = findMissing(en, target);

// Group by top-level section
const bySection = {};
for (const m of missing) {
  const section = m.key.split('.')[0];
  if (!bySection[section]) bySection[section] = [];
  bySection[section].push(m);
}

console.log(`Missing by section for ${lang}:`);
for (const [section, items] of Object.entries(bySection).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${section}: ${items.length}`);
}
console.log(`Total missing: ${missing.length}`);

const enCount = countKeys(en);
const targetCount = countKeys(target);
console.log(`\nCurrent: ${targetCount}/${enCount} (${((targetCount/enCount)*100).toFixed(1)}%)`);
