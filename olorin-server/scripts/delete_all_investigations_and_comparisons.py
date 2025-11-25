#!/usr/bin/env python3
"""
Delete all investigations and comparisons from database and registry.

WARNING: This will permanently delete:
- All investigations from investigation_states table
- All comparisons from workspace registry
- Optionally: investigation logs, artifacts, and reports

This is irreversible!
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.investigation_state import InvestigationState
from app.persistence import IN_MEMORY_INVESTIGATIONS
from app.persistence.database import get_db_session
from app.service.investigation.workspace_registry import get_registry
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def delete_all_investigations(delete_files: bool = False):
    """
    Delete all investigations from database and in-memory cache.

    Args:
        delete_files: If True, also delete investigation log folders and artifacts
    """
    print("🗑️  Deleting all investigations...\n")

    # Count before deletion
    with get_db_session() as db:
        count_before = db.query(InvestigationState).count()
        print(f"   Found {count_before} investigation(s) in database")

    # Delete from database
    deleted_count = 0
    try:
        with get_db_session() as db:
            # Get all investigation IDs before deletion (for file cleanup)
            investigation_ids = [
                inv.investigation_id
                for inv in db.query(InvestigationState.investigation_id).all()
            ]

            # Delete all investigations
            deleted_count = db.query(InvestigationState).delete()
            db.commit()

            print(f"   ✅ Deleted {deleted_count} investigation(s) from database")

            # Optionally delete files
            if delete_files and investigation_ids:
                print(f"\n   🗂️  Deleting investigation files...")
                from app.service.logging.investigation_folder_manager import (
                    get_folder_manager,
                )

                folder_manager = get_folder_manager()

                deleted_folders = 0
                for inv_id in investigation_ids:
                    try:
                        inv_folder = folder_manager.get_investigation_folder(inv_id)
                        if inv_folder and inv_folder.exists():
                            import shutil

                            shutil.rmtree(inv_folder)
                            deleted_folders += 1
                    except Exception as e:
                        logger.warning(
                            f"Failed to delete folder for investigation {inv_id}: {e}"
                        )

                print(f"   ✅ Deleted {deleted_folders} investigation folder(s)")

    except Exception as e:
        logger.error(
            f"Failed to delete investigations from database: {e}", exc_info=True
        )
        print(f"   ❌ Error deleting investigations: {e}")
        return False

    # Clear in-memory cache
    in_memory_count = len(IN_MEMORY_INVESTIGATIONS)
    IN_MEMORY_INVESTIGATIONS.clear()
    print(f"   ✅ Cleared {in_memory_count} investigation(s) from in-memory cache")

    return True


def delete_all_comparisons(delete_files: bool = False):
    """
    Delete all comparisons from workspace registry.

    Args:
        delete_files: If True, also delete comparison report files
    """
    print("\n🗑️  Deleting all comparisons...\n")

    registry = get_registry()

    try:
        with registry._get_connection() as conn:
            cursor = conn.cursor()

            # Count before deletion
            cursor.execute("SELECT COUNT(*) FROM comparisons")
            count_before = cursor.fetchone()[0]
            print(f"   Found {count_before} comparison(s) in registry")

            # Get comparison IDs and paths before deletion (for file cleanup)
            cursor.execute("SELECT comparison_id, canonical_path FROM comparisons")
            comparisons = cursor.fetchall()

            # Delete all comparisons
            cursor.execute("DELETE FROM comparisons")
            deleted_count = cursor.rowcount

            # Also delete from audit log
            cursor.execute("DELETE FROM audit_log WHERE resource_type = 'comparison'")
            audit_deleted = cursor.rowcount

            print(f"   ✅ Deleted {deleted_count} comparison(s) from registry")
            print(f"   ✅ Deleted {audit_deleted} comparison audit log entry/entries")

            # Also delete all investigations and files from registry
            cursor.execute("SELECT COUNT(*) FROM investigations")
            inv_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM files")
            file_count = cursor.fetchone()[0]

            if inv_count > 0 or file_count > 0:
                print(
                    f"\n   Found {inv_count} investigation(s) and {file_count} file(s) in registry"
                )
                cursor.execute("DELETE FROM investigations")
                deleted_inv = cursor.rowcount
                cursor.execute("DELETE FROM files")
                deleted_files = cursor.rowcount
                cursor.execute(
                    "DELETE FROM audit_log WHERE resource_type IN ('investigation', 'file')"
                )
                deleted_audit = cursor.rowcount

                print(f"   ✅ Deleted {deleted_inv} investigation(s) from registry")
                print(f"   ✅ Deleted {deleted_files} file(s) from registry")
                print(f"   ✅ Deleted {deleted_audit} audit log entry/entries")

            # Optionally delete comparison report files
            if delete_files and comparisons:
                print(f"\n   🗂️  Deleting comparison report files...")
                deleted_files_count = 0

                for comp_id, canonical_path in comparisons:
                    try:
                        if canonical_path:
                            comp_path = Path(canonical_path)
                            if comp_path.exists():
                                if comp_path.is_file():
                                    comp_path.unlink()
                                    deleted_files_count += 1
                                elif comp_path.is_dir():
                                    import shutil

                                    shutil.rmtree(comp_path)
                                    deleted_files_count += 1
                    except Exception as e:
                        logger.warning(
                            f"Failed to delete comparison file {canonical_path}: {e}"
                        )

                print(
                    f"   ✅ Deleted {deleted_files_count} comparison file(s)/folder(s)"
                )

    except Exception as e:
        logger.error(f"Failed to delete comparisons from registry: {e}", exc_info=True)
        print(f"   ❌ Error deleting comparisons: {e}")
        return False

    return True


def delete_all_files():
    """Delete all investigation and comparison files from filesystem."""
    print("\n🗑️  Deleting all investigation and comparison files...\n")

    from app.config.file_organization_config import FileOrganizationConfig

    config = FileOrganizationConfig()

    deleted_count = 0

    # Delete investigation folders
    logs_dir = config.logs_base_dir / "investigations"
    if logs_dir.exists():
        try:
            import shutil

            for folder in logs_dir.iterdir():
                if folder.is_dir():
                    shutil.rmtree(folder)
                    deleted_count += 1
            print(f"   ✅ Deleted {deleted_count} investigation log folder(s)")
        except Exception as e:
            logger.warning(f"Failed to delete investigation log folders: {e}")

    # Delete comparison reports
    comparisons_dir = config.artifacts_base_dir / "comparisons"
    if comparisons_dir.exists():
        try:
            import shutil

            comp_count = 0
            for item in comparisons_dir.rglob("*"):
                if item.is_file():
                    item.unlink()
                    comp_count += 1
                elif item.is_dir() and not any(item.iterdir()):
                    item.rmdir()
            print(f"   ✅ Deleted {comp_count} comparison file(s)")
        except Exception as e:
            logger.warning(f"Failed to delete comparison files: {e}")

    # Delete investigation artifacts
    artifacts_dir = config.artifacts_base_dir / "investigations"
    if artifacts_dir.exists():
        try:
            import shutil

            artifact_count = 0
            for item in artifacts_dir.rglob("*"):
                if item.is_file():
                    item.unlink()
                    artifact_count += 1
            print(f"   ✅ Deleted {artifact_count} investigation artifact file(s)")
        except Exception as e:
            logger.warning(f"Failed to delete investigation artifacts: {e}")


def main():
    """Main deletion function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Delete all investigations and comparisons",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
WARNING: This will permanently delete:
- All investigations from investigation_states table
- All comparisons from workspace registry
- Optionally: investigation logs, artifacts, and reports

This is irreversible!
        """,
    )
    parser.add_argument(
        "--files",
        action="store_true",
        help="Also delete investigation and comparison files from filesystem",
    )
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")

    args = parser.parse_args()

    # Confirmation prompt
    if not args.yes:
        print(
            "⚠️  WARNING: This will permanently delete ALL investigations and comparisons!"
        )
        if args.files:
            print("⚠️  This will also delete ALL investigation and comparison files!")
        print()
        response = input("Type 'DELETE ALL' to confirm: ")
        if response != "DELETE ALL":
            print("❌ Deletion cancelled")
            sys.exit(0)
        print()

    # Delete investigations
    if not delete_all_investigations(delete_files=args.files):
        print("\n❌ Failed to delete investigations")
        sys.exit(1)

    # Delete comparisons
    if not delete_all_comparisons(delete_files=args.files):
        print("\n❌ Failed to delete comparisons")
        sys.exit(1)

    # Delete files if requested
    if args.files:
        delete_all_files()

    print("\n✅ All investigations and comparisons deleted successfully!")
    print("   Database records: ✅")
    print("   Registry records: ✅")
    if args.files:
        print("   Filesystem files: ✅")


if __name__ == "__main__":
    main()
