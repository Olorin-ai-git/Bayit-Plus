#!/bin/bash
# CVPlus Core Module - Prepare for Publishing
set -e

echo "📦 CVPlus Core Module - Prepare for Publishing"
echo "=============================================="

# Check if we're in the core directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Must be run from the core module directory (no package.json found)"
    exit 1
fi

if ! grep -q "@cvplus/core" package.json; then
    echo "❌ Error: Must be run from the core module directory (not a core module)"
    exit 1
fi

# Ensure clean working directory
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Error: Working directory is not clean. Please commit all changes."
    exit 1
fi

# Run comprehensive validation
echo "🔍 Running comprehensive validation..."
./scripts/build/validate-build.sh

# Lint check
echo "🧹 Running linting checks..."
npm run lint

# Version check
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📍 Current version: $CURRENT_VERSION"

# Validate package.json exports
echo "📋 Validating package.json exports..."
node -e "
const pkg = require('./package.json');
const fs = require('fs');

console.log('Checking exports...');
for (const [path, exports] of Object.entries(pkg.exports)) {
    if (exports.import && !fs.existsSync(exports.import)) {
        console.error(\`❌ Missing export: \${exports.import}\`);
        process.exit(1);
    }
    if (exports.require && !fs.existsSync(exports.require)) {
        console.error(\`❌ Missing export: \${exports.require}\`);
        process.exit(1);
    }
    if (exports.types && !fs.existsSync(exports.types)) {
        console.error(\`❌ Missing types: \${exports.types}\`);
        process.exit(1);
    }
}
console.log('✅ All exports are valid');
"

# Check for dependency versions
echo "🔗 Checking dependency compatibility..."
echo "   • TypeScript: $(npx tsc --version)"
echo "   • Node.js: $(node --version)"
echo "   • NPM: $(npm --version)"

echo ""
echo "✅ Core module is ready for publishing!"
echo "📝 Next steps:"
echo "   1. Update version if needed: npm version [patch|minor|major]"
echo "   2. Create git tag for release"
echo "   3. Publish to npm registry (if applicable)"
echo "   4. Update dependent modules"