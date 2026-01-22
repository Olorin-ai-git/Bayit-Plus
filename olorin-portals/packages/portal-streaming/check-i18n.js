const en = require('./src/i18n/locales/en.json');
const he = require('./src/i18n/locales/he.json');

const getKeys = (obj, prefix = '') => {
  let keys = [];
  for (const k in obj) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
};

const enKeys = getKeys(en).sort();
const heKeys = getKeys(he).sort();
const missing = enKeys.filter(k => !heKeys.includes(k));
const extra = heKeys.filter(k => !enKeys.includes(k));

console.log('English keys:', enKeys.length);
console.log('Hebrew keys:', heKeys.length);

if (missing.length) {
  console.log('\nMissing in Hebrew:');
  missing.forEach(k => console.log('  -', k));
}

if (extra.length) {
  console.log('\nExtra in Hebrew:');
  extra.forEach(k => console.log('  +', k));
}

if (!missing.length && !extra.length) {
  console.log('\n✅ All translation keys match!');
}
