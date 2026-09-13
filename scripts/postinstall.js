const { execFileSync } = require('node:child_process');

try {
  require.resolve('patch-package');
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    process.exit(0);
  }
  throw error;
}

execFileSync(process.execPath, [require.resolve('patch-package')], { stdio: 'inherit' });
