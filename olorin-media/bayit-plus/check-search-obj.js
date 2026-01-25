const he = require('./packages/ui/shared-i18n/locales/he.json');
const en = require('./packages/ui/shared-i18n/locales/en.json');

console.log('=== Hebrew (he.json) ===');
const heKeys = Object.keys(he);
heKeys.forEach((k,i) => {
  if (typeof he[k] === 'object' && he[k] !== null && !Array.isArray(he[k])) {
    if ('controls' in he[k]) {
      console.log(`Found object with 'controls' at key: "${k}" (index: ${i})`);
      console.log('  Has keys:', Object.keys(he[k]).join(', '));
    }
  }
});

console.log('\n=== English (en.json) ===');
const enKeys = Object.keys(en);
enKeys.forEach((k,i) => {
  if (typeof en[k] === 'object' && en[k] !== null && !Array.isArray(en[k])) {
    if ('controls' in en[k]) {
      console.log(`Found object with 'controls' at key: "${k}" (index: ${i})`);
      console.log('  Has keys:', Object.keys(en[k]).join(', '));
    }
  }
});
