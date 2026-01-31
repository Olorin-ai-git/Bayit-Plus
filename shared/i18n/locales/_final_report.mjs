import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));

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

function findMissing(en, target, prefix) {
  prefix = prefix || '';
  let missing = 0;
  for (const key of Object.keys(en)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!target[key] || typeof target[key] !== 'object') { missing++; }
      else { missing += findMissing(en[key], target[key], fullKey); }
    } else if (!(key in (target || {}))) { missing++; }
  }
  return missing;
}

const enCount = countKeys(en);
console.log('English reference: ' + enCount + ' keys\n');
console.log('Language  | Keys    | Coverage | Missing');
console.log('----------|---------|----------|--------');

const langs = ['he', 'en', 'es', 'fr', 'it', 'zh', 'ja', 'hi', 'ta', 'bn'];
for (const lang of langs) {
  try {
    const data = JSON.parse(fs.readFileSync(lang + '.json', 'utf8'));
    const count = countKeys(data);
    const missing = lang === 'en' ? 0 : findMissing(en, data);
    const pct = ((count / enCount) * 100).toFixed(1);
    console.log(lang.padEnd(10) + '| ' + String(count).padEnd(8) + '| ' + (pct + '%').padEnd(9) + '| ' + missing);
  } catch (e) {
    console.log(lang.padEnd(10) + '| ERROR: ' + e.message);
  }
}
