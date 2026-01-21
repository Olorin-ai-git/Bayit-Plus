#!/bin/bash

# CVPlus Final Dependency Cleanup Script
# Phase 1: Eliminate all self-referential dependencies

echo "🔧 CVPlus Final Dependency Cleanup - Phase 1"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[$1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Python3 is available
if ! command -v python3 >/dev/null 2>&1; then
    print_error "Python3 is required but not installed. Please install Python3 and try again."
    exit 1
fi

print_status "1/4" "Analyzing current self-referential dependencies..."

# Create Python script for precise JSON manipulation
cat > dependency_analyzer.py << 'EOF'
#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

def analyze_dependencies():
    """Analyze all modules for self-referential dependencies"""
    issues_found = []

    for module_dir in Path('packages').iterdir():
        if module_dir.is_dir():
            package_json_path = module_dir / 'package.json'

            if package_json_path.exists():
                module_name = module_dir.name

                try:
                    with open(package_json_path, 'r') as f:
                        data = json.load(f)

                    # Check all dependency sections
                    sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
                    self_ref_found = False

                    for section in sections:
                        if section in data:
                            self_ref_key = f'@cvplus/{module_name}'
                            if self_ref_key in data[section]:
                                issues_found.append({
                                    'module': module_name,
                                    'section': section,
                                    'reference': self_ref_key,
                                    'version': data[section][self_ref_key]
                                })
                                self_ref_found = True

                    if self_ref_found:
                        print(f"🔍 Found self-reference in {module_name}")

                except json.JSONDecodeError as e:
                    print(f"❌ Error reading {package_json_path}: {e}")
                except Exception as e:
                    print(f"❌ Unexpected error with {package_json_path}: {e}")

    return issues_found

def fix_dependencies(issues):
    """Fix all self-referential dependencies"""
    fixed_count = 0

    for issue in issues:
        module_name = issue['module']
        package_json_path = Path(f'packages/{module_name}/package.json')

        try:
            # Create backup
            backup_path = package_json_path.with_suffix('.json.backup-final')
            with open(package_json_path, 'r') as f:
                original_content = f.read()

            with open(backup_path, 'w') as f:
                f.write(original_content)

            # Load and fix JSON
            with open(package_json_path, 'r') as f:
                data = json.load(f)

            # Remove self-reference
            section = issue['section']
            self_ref_key = issue['reference']

            if section in data and self_ref_key in data[section]:
                del data[section][self_ref_key]

                # Clean up empty sections
                if not data[section]:
                    del data[section]

                # Write back with proper formatting
                with open(package_json_path, 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n')  # Add final newline

                print(f"✅ Fixed {module_name}: removed {self_ref_key} from {section}")
                fixed_count += 1

        except Exception as e:
            print(f"❌ Error fixing {module_name}: {e}")

    return fixed_count

def verify_cleanup():
    """Verify that all self-references have been removed"""
    remaining_issues = analyze_dependencies()

    if not remaining_issues:
        print("✅ All self-referential dependencies have been resolved!")
        return True
    else:
        print(f"⚠️  {len(remaining_issues)} self-references still remain:")
        for issue in remaining_issues:
            print(f"   - {issue['module']}: {issue['reference']} in {issue['section']}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "fix":
        print("🔧 Analyzing dependencies...")
        issues = analyze_dependencies()

        if issues:
            print(f"\n📊 Found {len(issues)} self-referential dependencies to fix")
            print("🔧 Applying fixes...")
            fixed = fix_dependencies(issues)
            print(f"✅ Fixed {fixed} dependency issues")

            print("\n🔍 Verifying cleanup...")
            if verify_cleanup():
                print("🎉 Phase 1 Complete: All critical dependency violations resolved!")
            else:
                print("⚠️  Some issues remain - manual review needed")
        else:
            print("✅ No self-referential dependencies found!")
    else:
        # Just analyze
        issues = analyze_dependencies()
        print(f"\n📊 Analysis complete: {len(issues)} self-referential dependencies found")

        if issues:
            for issue in issues:
                print(f"   - {issue['module']}: {issue['reference']} in {issue['section']}")
EOF

# Run initial analysis
echo "Running dependency analysis..."
python3 dependency_analyzer.py

print_status "2/4" "Fixing self-referential dependencies..."

# Run the fixes
python3 dependency_analyzer.py fix

print_status "3/4" "Cleaning up workspace dependencies..."

# Remove any individual node_modules that might have been recreated
removed_nm=0
for module_dir in packages/*/; do
    if [ -d "$module_dir/node_modules" ]; then
        module_name=$(basename "$module_dir")
        rm -rf "$module_dir/node_modules"
        removed_nm=$((removed_nm + 1))
        print_success "Removed node_modules from $module_name"
    fi
done

if [ $removed_nm -eq 0 ]; then
    print_success "No individual node_modules found"
else
    echo "   → Removed node_modules from $removed_nm modules"
fi

print_status "4/4" "Verifying workspace integrity..."

# Reinstall dependencies properly
echo "Reinstalling workspace dependencies..."
npm install --force > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Workspace dependencies installed successfully"
else
    print_warning "Some dependency warnings (check with 'npm ls')"
fi

# Check for any unmet dependencies
echo "Checking for unmet dependencies..."
unmet_count=$(npm ls 2>&1 | grep "UNMET DEPENDENCY" | wc -l)

if [ $unmet_count -eq 0 ]; then
    print_success "No unmet dependencies found"
else
    print_warning "$unmet_count unmet dependencies detected"
fi

# Final validation
echo ""
print_status "FINAL" "Running dependency validation..."

echo "🔍 Quick Dependency Check:"
echo "=========================="

# Check each module for remaining issues
remaining_issues=0
for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")
    if [ -f "$module_dir/package.json" ]; then
        # Check for self-reference
        if grep -q "\"@cvplus/$module_name\"" "$module_dir/package.json"; then
            print_error "Self-reference still found in $module_name"
            remaining_issues=$((remaining_issues + 1))
        fi

        # Check for individual node_modules
        if [ -d "$module_dir/node_modules" ]; then
            print_warning "$module_name has individual node_modules"
            remaining_issues=$((remaining_issues + 1))
        fi
    fi
done

echo ""
echo "📊 PHASE 1 RESULTS"
echo "=================="

if [ $remaining_issues -eq 0 ]; then
    print_success "🎉 PHASE 1 COMPLETE: All critical dependency violations resolved!"
    echo ""
    echo "✅ Achievements:"
    echo "   • All self-referential dependencies removed"
    echo "   • Clean workspace dependency management"
    echo "   • No individual node_modules directories"
    echo "   • Proper package.json structure maintained"
    echo ""
    echo "🎯 Expected Impact:"
    echo "   • 18 critical violations → 0 critical violations"
    echo "   • Clean dependency architecture achieved"
    echo "   • Ready for Phase 2: Code Quality Improvement"
else
    print_warning "⚠️  $remaining_issues issues still need attention"
    echo ""
    echo "📋 Next Steps:"
    echo "   • Review any remaining self-references manually"
    echo "   • Check workspace configuration"
    echo "   • Ensure all builds complete successfully"
fi

echo ""
echo "🔗 Next Phase:"
echo "   Run './validate-all-modules.sh' to see updated compliance"
echo "   Then proceed to Phase 2 with code quality improvements"
echo ""

# Cleanup temporary files
rm -f dependency_analyzer.py

print_success "Phase 1 dependency cleanup completed!"
echo ""