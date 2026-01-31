import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const ja = JSON.parse(fs.readFileSync('ja.json', 'utf8'));

function findMissing(en, ja, prefix = '') {
  const missing = [];
  for (const key of Object.keys(en)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!ja[key] || typeof ja[key] !== 'object') {
        missing.push(fullKey);
      } else {
        missing.push(...findMissing(en[key], ja[key], fullKey));
      }
    } else if (!(key in (ja || {}))) {
      missing.push(fullKey);
    }
  }
  return missing;
}

const missing = findMissing(en, ja);

// Filter to show only admin keys
const adminMissing = missing.filter(k => k.startsWith('admin.'));
console.log('Admin missing keys:');
adminMissing.forEach(k => console.log('  ' + k));
console.log('\nTotal admin missing:', adminMissing.length);

// Show other missing keys
const otherMissing = missing.filter(k => !k.startsWith('admin.'));
console.log('\nOther missing keys:');
otherMissing.forEach(k => console.log('  ' + k));
console.log('\nTotal other missing:', otherMissing.length);
