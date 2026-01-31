import fs from 'fs';

function findMissing(en, fr, prefix = '') {
  const missing = [];
  for (const key of Object.keys(en)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
      if (!fr[key] || typeof fr[key] !== 'object') {
        missing.push({ key: fullKey, type: 'section' });
      } else {
        missing.push(...findMissing(en[key], fr[key], fullKey));
      }
    } else if (!(key in (fr || {}))) {
      missing.push({ key: fullKey, type: 'key' });
    }
  }
  return missing;
}

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('fr.json', 'utf8'));
const missing = findMissing(en, fr);
const sections = {};
missing.forEach(m => {
  const section = m.key.split('.')[0];
  sections[section] = (sections[section] || 0) + 1;
});
console.log('Missing by section:');
Object.entries(sections).sort((a,b) => b[1]-a[1]).slice(0,20).forEach(([s,c]) => console.log('  ' + s + ':', c));
console.log('Total missing:', missing.length);
