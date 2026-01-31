import fs from 'fs';
const he = JSON.parse(fs.readFileSync('he.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const fix = {
  admin: {
    librarian: {
      logs: {
        emptyState: {
          dailyFeature1: "מהיר",
          dailyFeature2: "מבוסס חוקים",
          dailyFeature3: "מצטבר",
          aiTitle: "ביקורת סוכן AI",
          aiFeature1: "חכם",
          aiFeature2: "אדפטיבי",
          aiFeature3: "מקיף",
          trigger: "הפעל",
          lastRun: "הרצה אחרונה: {{time}}"
        }
      }
    }
  }
};

deepMerge(he, fix);
fs.writeFileSync('he.json', JSON.stringify(he, null, 2) + '\n');
console.log('Fixed final 9 Hebrew keys');
