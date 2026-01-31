import fs from 'fs';

const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('hi.json', 'utf8'));

function findMissing(enObj, hiObj, path = '') {
  const missing = [];
  for (const key of Object.keys(enObj)) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in hiObj)) {
      missing.push({ path: newPath, value: enObj[key] });
    } else if (typeof enObj[key] === 'object' && !Array.isArray(enObj[key])) {
      missing.push(...findMissing(enObj[key], hiObj[key] || {}, newPath));
    }
  }
  return missing;
}

const missing = findMissing(en, hi);
console.log(JSON.stringify(missing, null, 2));
