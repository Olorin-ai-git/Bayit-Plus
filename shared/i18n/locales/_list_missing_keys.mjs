import fs from 'fs';

const lang = process.argv[2] || 'hi';
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

const missing = findMissing(en, target);
for (const m of missing) {
  const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value).substring(0, 120);
  console.log(`${m.key} [${m.type}] = ${val}`);
}
