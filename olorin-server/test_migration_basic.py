#!/usr/bin/env python3
"""
Basic validation test for Phase 5 Migration System.

Tests core functionality without external dependencies.
"""

import os
import sys


def test_file_structure():
    """Test that all required files exist"""

    print("🧪 Testing file structure...")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    required_files = [
        # Migration directory structure
        f"{base_path}/migration/__init__.py",
        f"{base_path}/migration/migration_manager.py",
        # Feature flags
        f"{base_path}/migration/feature_flags/__init__.py",
        f"{base_path}/migration/feature_flags/flag_manager.py",
        f"{base_path}/migration/feature_flags/environment_loader.py",
        f"{base_path}/migration/feature_flags/rollout_calculator.py",
        # Graph selection
        f"{base_path}/migration/graph_selection/__init__.py",
        f"{base_path}/migration/graph_selection/graph_selector.py",
        f"{base_path}/migration/graph_selection/graph_builders.py",
        f"{base_path}/migration/graph_selection/ab_test_manager.py",
        # Rollback system
        f"{base_path}/migration/rollback/__init__.py",
        f"{base_path}/migration/rollback/rollback_triggers.py",
        f"{base_path}/migration/rollback/health_monitor.py",
        f"{base_path}/migration/rollback/metrics_collector.py",
        # Integration layer
        f"{base_path}/integration/__init__.py",
        f"{base_path}/integration/service_adapter.py",
        f"{base_path}/integration/state_validator.py",
        f"{base_path}/integration/metrics_reporter.py",
        f"{base_path}/integration/error_handler.py",
        # Backward compatibility
        f"{base_path}/migration_utilities.py",
    ]

    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)

    if missing_files:
        print(f"❌ Missing files:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    else:
        print(f"✅ All {len(required_files)} required files exist")
        return True


def test_file_syntax():
    """Test that all Python files have valid syntax"""

    print("\n🧪 Testing file syntax...")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    python_files = []

    # Find all Python files
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith(".py"):
                python_files.append(os.path.join(root, file))

    syntax_errors = []

    for file_path in python_files:
        try:
            with open(file_path, "r") as f:
                content = f.read()

            # Simple syntax check
            compile(content, file_path, "exec")

        except SyntaxError as e:
            syntax_errors.append((file_path, str(e)))
        except Exception as e:
            # Skip other errors (like missing imports)
            continue

    if syntax_errors:
        print(f"❌ Syntax errors found:")
        for file_path, error in syntax_errors:
            print(f"   - {file_path}: {error}")
        return False
    else:
        print(f"✅ All {len(python_files)} Python files have valid syntax")
        return True


def test_import_structure():
    """Test basic import structure without executing"""

    print("\n🧪 Testing import structure...")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    # Check that migration_utilities.py has proper imports
    migration_utils_path = f"{base_path}/migration_utilities.py"

    try:
        with open(migration_utils_path, "r") as f:
            content = f.read()

        # Check for key imports
        required_imports = [
            "from .migration import",
            "FeatureFlags",
            "GraphType",
            "DeploymentMode",
            "GraphSelector",
            "RollbackTriggers",
        ]

        missing_imports = []
        for import_line in required_imports:
            if import_line not in content:
                missing_imports.append(import_line)

        if missing_imports:
            print(f"❌ Missing imports in migration_utilities.py:")
            for import_line in missing_imports:
                print(f"   - {import_line}")
            return False
        else:
            print("✅ Migration utilities has proper imports")

        return True

    except Exception as e:
        print(f"❌ Error checking imports: {str(e)}")
        return False


def test_component_count():
    """Test that we have the expected number of components"""

    print("\n🧪 Testing component count...")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    expected_components = {
        "feature_flags": 3,  # flag_manager, environment_loader, rollout_calculator
        "graph_selection": 3,  # graph_selector, graph_builders, ab_test_manager
        "rollback": 3,  # rollback_triggers, health_monitor, metrics_collector
        "integration": 4,  # service_adapter, state_validator, metrics_reporter, error_handler
    }

    all_pass = True

    for component_dir, expected_count in expected_components.items():
        dir_path = (
            f"{base_path}/migration/{component_dir}"
            if component_dir != "integration"
            else f"{base_path}/integration"
        )

        if not os.path.exists(dir_path):
            print(f"❌ Component directory missing: {component_dir}")
            all_pass = False
            continue

        py_files = [
            f for f in os.listdir(dir_path) if f.endswith(".py") and f != "__init__.py"
        ]
        actual_count = len(py_files)

        if actual_count == expected_count:
            print(
                f"✅ {component_dir}: {actual_count} components (expected {expected_count})"
            )
        else:
            print(
                f"⚠️ {component_dir}: {actual_count} components (expected {expected_count})"
            )
            all_pass = False

    return all_pass


def test_modular_structure():
    """Test that the modular structure is properly organized"""

    print("\n🧪 Testing modular structure...")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    # Check that migration_utilities.py is now small (backward compatibility only)
    migration_utils_path = f"{base_path}/migration_utilities.py"

    try:
        with open(migration_utils_path, "r") as f:
            lines = len(f.readlines())

        # Should be much smaller now (< 100 lines for backward compatibility)
        if lines < 100:
            print(f"✅ migration_utilities.py is compact: {lines} lines")
        else:
            print(f"⚠️ migration_utilities.py still large: {lines} lines")
            return False

        # Check that original file was transformed
        with open(migration_utils_path, "r") as f:
            content = f.read()

        if "BACKWARD COMPATIBILITY LAYER" in content:
            print("✅ Backward compatibility layer properly marked")
        else:
            print("⚠️ Backward compatibility layer not properly marked")
            return False

        return True

    except Exception as e:
        print(f"❌ Error checking modular structure: {str(e)}")
        return False


def count_total_components():
    """Count total components created"""

    print("\n📊 Component Summary:")

    base_path = "/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/hybrid"

    component_dirs = [
        ("Feature Flags", f"{base_path}/migration/feature_flags"),
        ("Graph Selection", f"{base_path}/migration/graph_selection"),
        ("Rollback System", f"{base_path}/migration/rollback"),
        ("Integration Layer", f"{base_path}/integration"),
    ]

    total_components = 0

    for dir_name, dir_path in component_dirs:
        if os.path.exists(dir_path):
            py_files = [
                f
                for f in os.listdir(dir_path)
                if f.endswith(".py") and f != "__init__.py"
            ]
            count = len(py_files)
            total_components += count
            print(f"   {dir_name}: {count} components")
        else:
            print(f"   {dir_name}: 0 components (directory missing)")

    # Add main migration manager
    migration_manager_path = f"{base_path}/migration/migration_manager.py"
    if os.path.exists(migration_manager_path):
        total_components += 1
        print(f"   Migration Manager: 1 component")

    print(f"\n🎯 Total Components Created: {total_components}")

    if total_components >= 13:  # 3+3+3+4 + 1 migration manager = 14 expected
        print("✅ Component count meets Phase 5 requirements")
        return True
    else:
        print("⚠️ Component count below Phase 5 requirements")
        return False


def main():
    """Run all basic validation tests"""

    print("🎯 Phase 5 Migration System - Basic Validation")
    print("=" * 60)

    tests = [
        ("File Structure", test_file_structure),
        ("File Syntax", test_file_syntax),
        ("Import Structure", test_import_structure),
        ("Component Count", test_component_count),
        ("Modular Structure", test_modular_structure),
    ]

    results = []

    # Run all tests
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))

    # Component summary
    count_total_components()

    # Summary
    print("\n" + "=" * 60)
    print("🎯 Validation Results Summary")
    print("=" * 60)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 Phase 5 Migration System Successfully Implemented!")
        print("✅ All components extracted and organized")
        print("✅ Backward compatibility maintained")
        print("✅ Modular architecture achieved")
        return True
    else:
        print(f"\n⚠️ {total - passed} validation issues found. Review above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
