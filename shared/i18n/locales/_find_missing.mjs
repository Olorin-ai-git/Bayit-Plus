import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const it = JSON.parse(fs.readFileSync('it.json', 'utf8'));

function getMissingKeys(enObj, itObj, prefix = '') {
  const missing = [];
  if (enObj === null || enObj === undefined) return missing;

  for (const key of Object.keys(enObj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
      if (!itObj || !itObj[key]) {
        missing.push(fullKey + ' (entire section)');
      } else {
        missing.push(...getMissingKeys(enObj[key], itObj[key], fullKey));
      }
    } else {
      if (!itObj || !(key in itObj)) {
        missing.push(fullKey);
      }
    }
  }
  return missing;
}

const missing = getMissingKeys(en, it);
console.log('Total missing:', missing.length);
console.log('Missing keys:');
missing.forEach(m => console.log('  ' + m));
