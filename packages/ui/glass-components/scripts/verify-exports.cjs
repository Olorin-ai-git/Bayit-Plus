const fs = require('node:fs');
const path = require('node:path');

const packageDirectory = path.resolve(__dirname, '..');
const packageManifest = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8')
);

const targets = new Set();

const collectTargets = (value) => {
  if (typeof value === 'string') {
    targets.add(value);
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(collectTargets);
  }
};

collectTargets(packageManifest.main);
collectTargets(packageManifest.module);
collectTargets(packageManifest.types);
collectTargets(packageManifest.exports);

const missingTargets = [...targets].filter(
  (target) => !fs.existsSync(path.resolve(packageDirectory, target))
);

if (missingTargets.length > 0) {
  process.stderr.write(
    `Package exports reference missing artifacts:\n${missingTargets.join('\n')}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`Verified ${targets.size} package export targets.\n`);
}
