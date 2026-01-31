// Fix ja.json by removing string values that should be objects and rebuilding them
import fs from 'fs';

const ja = JSON.parse(fs.readFileSync('ja.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('en.json', 'utf8'));

// Delete string values that should be objects
const keysToFix = [
  'admin.billing',
  'admin.settings',
  'admin.users',
  'admin.campaigns',
  'admin.subscriptions',
  'admin.dashboard',
  'admin.refunds',
  'admin.brand',
  'plans.basic',
  'plans.premium',
  'plans.family',
  'podcasts.categories',
  'judaism.shabbat',
  'chatbot.suggestions',
  'support.faq',
  'footer.apps',
  'footer.social',
  'errors.offline'
];

function deleteKey(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    current = current[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  if (current && typeof current[lastKey] === 'string') {
    delete current[lastKey];
    console.log('Deleted string key:', path);
  }
}

for (const key of keysToFix) {
  deleteKey(ja, key);
}

fs.writeFileSync('ja.json', JSON.stringify(ja, null, 2) + '\n');
console.log('Fixed ja.json - removed conflicting string values');
