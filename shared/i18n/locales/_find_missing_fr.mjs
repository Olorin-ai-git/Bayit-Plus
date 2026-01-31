import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('fr.json', 'utf8'));

function findMissing(en, fr, prefix = '') {
  const missing = [];
  for (const key of Object.keys(en)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!fr[key] || typeof fr[key] !== 'object') {
        missing.push({ key: fullKey, type: 'section', value: en[key] });
      } else {
        missing.push(...findMissing(en[key], fr[key], fullKey));
      }
    } else if (!(key in (fr || {}))) {
      missing.push({ key: fullKey, type: 'key', value: en[key] });
    }
  }
  return missing;
}

const missing = findMissing(en, fr);
missing.forEach(m => {
  if (m.type === 'key') {
    console.log(m.key + ' = ' + JSON.stringify(m.value));
  } else {
    console.log(m.key + ' (section) = ' + JSON.stringify(m.value).substring(0, 200) + '...');
  }
});
console.log('\nTotal missing:', missing.length);
