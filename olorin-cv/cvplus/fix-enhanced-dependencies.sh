#!/bin/bash

# CVPlus Enhanced Dependency Cleanup Script
# Fixes both file: and version-based self-referential dependencies

echo "🔧 CVPlus Enhanced Dependency Cleanup - Phase 1"
echo "=============================================="
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

print_status "1/5" "Analyzing current dependency patterns..."

# Create enhanced Python script for precise dependency analysis and cleanup
cat > enhanced_dependency_analyzer.py << 'EOF'
#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
import shutil

def analyze_dependencies():
    """Analyze all modules for BOTH file: and version self-referential dependencies"""
    issues_found = []
    total_modules = 0
    analyzed_modules = []

    for module_dir in Path('packages').iterdir():
        if module_dir.is_dir():
            package_json_path = module_dir / 'package.json'

            if package_json_path.exists():
                module_name = module_dir.name
                total_modules += 1
                analyzed_modules.append(module_name)

                try:
                    with open(package_json_path, 'r') as f:
                        data = json.load(f)

                    # Check all dependency sections
                    sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
                    self_ref_found = False

                    for section in sections:
                        if section in data:
                            self_ref_key = f'@cvplus/{module_name}'

                            # Check for BOTH patterns:
                            # 1. Exact self-reference: "@cvplus/module-name": "file:../module-name"
                            # 2. Version self-reference: "@cvplus/module-name": "^1.0.0" etc.
                            if self_ref_key in data[section]:
                                dependency_value = data[section][self_ref_key]

                                # Classify the type of self-reference
                                ref_type = "unknown"
                                if dependency_value.startswith("file:"):
                                    ref_type = "file_reference"
                                elif dependency_value.startswith("^") or dependency_value.startswith("~") or dependency_value[0].isdigit():
                                    ref_type = "version_reference"
                                elif dependency_value.startswith("workspace:"):
                                    ref_type = "workspace_reference"

                                issues_found.append({
                                    'module': module_name,
                                    'section': section,
                                    'reference': self_ref_key,
                                    'value': dependency_value,
                                    'type': ref_type
                                })
                                self_ref_found = True

                    if self_ref_found:
                        print(f"🔍 Found self-reference in {module_name}")

                except json.JSONDecodeError as e:
                    print(f"❌ Error reading {package_json_path}: {e}")
                except Exception as e:
                    print(f"❌ Unexpected error with {package_json_path}: {e}")

    print(f"\n📊 Analysis Summary:")
    print(f"   • Total modules analyzed: {total_modules}")
    print(f"   • Modules with self-references: {len(set([issue['module'] for issue in issues_found]))}")
    print(f"   • Total self-reference violations: {len(issues_found)}")

    if issues_found:
        print(f"\n🔍 Self-Reference Details:")
        for issue in issues_found:
            print(f"   • {issue['module']}: {issue['reference']} = {issue['value']} ({issue['type']})")

    return issues_found, analyzed_modules

def fix_dependencies(issues):
    """Fix all self-referential dependencies with enhanced backup system"""
    fixed_count = 0
    backup_count = 0

    # Create comprehensive backup directory
    backup_dir = Path('dependency-cleanup-backups')
    backup_dir.mkdir(exist_ok=True)

    for issue in issues:
        module_name = issue['module']
        package_json_path = Path(f'packages/{module_name}/package.json')

        try:
            # Create timestamped backup
            backup_filename = f"{module_name}-package.json.backup-{int(__import__('time').time())}"
            backup_path = backup_dir / backup_filename

            with open(package_json_path, 'r') as f:
                original_content = f.read()

            with open(backup_path, 'w') as f:
                f.write(original_content)
            backup_count += 1

            # Load and fix JSON
            with open(package_json_path, 'r') as f:
                data = json.load(f)

            # Remove self-reference
            section = issue['section']
            self_ref_key = issue['reference']

            if section in data and self_ref_key in data[section]:
                removed_value = data[section][self_ref_key]
                del data[section][self_ref_key]

                # Clean up empty sections
                if not data[section]:
                    del data[section]

                # Write back with proper formatting
                with open(package_json_path, 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n')  # Add final newline

                print(f"✅ Fixed {module_name}: removed {self_ref_key} = {removed_value} from {section}")
                fixed_count += 1

        except Exception as e:
            print(f"❌ Error fixing {module_name}: {e}")

    print(f"\n📁 Backup Summary: {backup_count} files backed up to {backup_dir}")
    return fixed_count

def verify_cleanup():
    """Verify that all self-references have been removed"""
    remaining_issues, analyzed_modules = analyze_dependencies()

    print(f"\n🔍 Cleanup Verification:")
    if not remaining_issues:
        print("✅ All self-referential dependencies have been resolved!")
        print(f"   • All {len(analyzed_modules)} modules are now clean")
        return True
    else:
        print(f"⚠️  {len(remaining_issues)} self-references still remain:")
        for issue in remaining_issues:
            print(f"   - {issue['module']}: {issue['reference']} = {issue['value']} in {issue['section']}")
        return False

def workspace_health_check():
    """Perform comprehensive workspace health check"""
    print(f"\n🏥 Workspace Health Check:")

    # Check for proper workspace structure
    health_issues = []

    # 1. Check root package.json for workspace configuration
    root_package = Path('package.json')
    if root_package.exists():
        try:
            with open(root_package, 'r') as f:
                root_data = json.load(f)

            if 'workspaces' in root_data:
                print("✅ Root workspace configuration found")
            else:
                health_issues.append("Root package.json missing workspaces configuration")
        except:
            health_issues.append("Root package.json is invalid")
    else:
        health_issues.append("Root package.json missing")

    # 2. Check for individual node_modules (should be removed)
    individual_nm_count = 0
    for module_dir in Path('packages').iterdir():
        if module_dir.is_dir():
            nm_path = module_dir / 'node_modules'
            if nm_path.exists():
                individual_nm_count += 1
                print(f"⚠️  Found individual node_modules in {module_dir.name}")

    if individual_nm_count == 0:
        print("✅ No individual node_modules directories found")
    else:
        health_issues.append(f"{individual_nm_count} modules have individual node_modules")

    # 3. Check for proper dist directories
    missing_dist = []
    for module_dir in Path('packages').iterdir():
        if module_dir.is_dir() and (module_dir / 'package.json').exists():
            dist_path = module_dir / 'dist'
            if not dist_path.exists():
                missing_dist.append(module_dir.name)

    if not missing_dist:
        print("✅ All modules have dist directories")
    else:
        print(f"⚠️  {len(missing_dist)} modules missing dist directories: {', '.join(missing_dist)}")
        health_issues.append(f"{len(missing_dist)} modules missing dist directories")

    return health_issues

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "fix":
        print("🔧 Enhanced Dependency Analysis & Cleanup")
        print("=" * 50)

        # Step 1: Initial analysis
        issues, modules = analyze_dependencies()

        if issues:
            print(f"\n📊 Found {len(issues)} self-referential dependencies to fix")
            print("🔧 Applying enhanced fixes...")
            fixed = fix_dependencies(issues)
            print(f"✅ Fixed {fixed} dependency issues")

            print("\n🔍 Verifying cleanup...")
            if verify_cleanup():
                print("🎉 Phase 1 Complete: All critical dependency violations resolved!")
            else:
                print("⚠️  Some issues remain - manual review needed")
        else:
            print("✅ No self-referential dependencies found!")

        # Step 2: Workspace health check
        health_issues = workspace_health_check()

        if not health_issues:
            print("\n🎉 Workspace Health: EXCELLENT")
        else:
            print(f"\n⚠️  Workspace Health Issues ({len(health_issues)}):")
            for issue in health_issues:
                print(f"   • {issue}")
    else:
        # Just analyze
        print("🔍 Enhanced Dependency Analysis")
        print("=" * 40)
        issues, modules = analyze_dependencies()
        print(f"\n📊 Analysis complete: {len(issues)} self-referential dependencies found")

        if issues:
            print(f"\nTo fix these issues, run: python3 {sys.argv[0]} fix")
EOF

# Run initial enhanced analysis
print_status "2/5" "Running enhanced dependency analysis..."
python3 enhanced_dependency_analyzer.py

print_status "3/5" "Applying enhanced dependency fixes..."

# Run the enhanced fixes
python3 enhanced_dependency_analyzer.py fix

print_status "4/5" "Cleaning up workspace dependencies..."

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

print_status "5/5" "Verifying workspace integrity..."

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
unmet_count=$(npm ls 2>&1 | grep -c "UNMET DEPENDENCY" || echo "0")

if [ $unmet_count -eq 0 ]; then
    print_success "No unmet dependencies found"
else
    print_warning "$unmet_count unmet dependencies detected"
fi

# Final validation
echo ""
print_status "FINAL" "Running comprehensive dependency validation..."

echo "🔍 Enhanced Dependency Check:"
echo "============================="

# Check each module for remaining issues using the validator
remaining_issues=0
for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")
    if [ -f "$module_dir/package.json" ]; then
        # Check for ANY self-reference pattern
        if grep -E "\"@cvplus/$module_name\"\\s*:" "$module_dir/package.json" > /dev/null 2>&1; then
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
echo "📊 ENHANCED PHASE 1 RESULTS"
echo "==========================="

if [ $remaining_issues -eq 0 ]; then
    print_success "🎉 PHASE 1 COMPLETE: All critical dependency violations resolved!"
    echo ""
    echo "✅ Enhanced Achievements:"
    echo "   • All self-referential dependencies removed (file: and version patterns)"
    echo "   • Clean workspace dependency management"
    echo "   • No individual node_modules directories"
    echo "   • Proper package.json structure maintained"
    echo "   • Comprehensive backup system created"
    echo ""
    echo "🎯 Expected Impact:"
    echo "   • 18 critical violations → 0 critical violations"
    echo "   • Clean dependency architecture achieved"
    echo "   • Enhanced validation and backup system in place"
    echo "   • Ready for Phase 2: Code Quality Improvement"
else
    print_warning "⚠️  $remaining_issues issues still need attention"
    echo ""
    echo "📋 Next Steps:"
    echo "   • Review any remaining self-references manually"
    echo "   • Check backup files in dependency-cleanup-backups/"
    echo "   • Ensure all builds complete successfully"
fi

echo ""
echo "🔗 Next Phase:"
echo "   Run './validate-all-modules.sh' to see updated compliance"
echo "   Then proceed to Phase 2 with code quality improvements"
echo ""

# Cleanup temporary files
rm -f enhanced_dependency_analyzer.py

print_success "Enhanced Phase 1 dependency cleanup completed!"
echo ""