const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = function reviewBuildSha({ mutable = false } = {}) {
  const configured = process.env.BAYIT_BUILD_SHA || process.env.GITHUB_SHA;
  let revision;
  let isCheckout = false;
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    isCheckout = true;
  } catch {
    revision = configured;
  }
  if (configured && revision && configured !== revision) {
    throw new Error('BAYIT_BUILD_SHA/GITHUB_SHA must identify the checked-out source');
  }
  if (revision && !/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error('Review build metadata requires a full Git SHA');
  }
  if (mutable) return null;
  try {
    const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (changes.trim()) return null;
  } catch {
    // Source archives require an explicit revision supplied by the build system.
    if (isCheckout || !configured) return null;
  }
  return revision || null;
};
