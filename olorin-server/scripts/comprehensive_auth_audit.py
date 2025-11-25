"""
Comprehensive API Authorization Audit
Analyzes all FastAPI endpoints for authentication and authorization
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set


@dataclass
class Endpoint:
    """Represents an API endpoint"""

    file_path: str
    method: str
    path: str
    function_name: str
    line_number: int
    has_auth: bool
    auth_type: str
    is_public: bool
    public_reason: str


class ComprehensiveAuthAuditor:
    """Comprehensive audit of API authorization"""

    AUTH_PATTERNS = [
        r"Depends\(get_current_user\)",
        r"Depends\(get_current_active_user\)",
        r"Depends\(require_read\)",
        r"Depends\(require_write\)",
        r"Depends\(require_admin\)",
        r"Depends\(require_scopes\)",
        r"current_user:\s*User\s*=\s*Depends\(",
    ]

    PUBLIC_INDICATORS = {
        "health": "Health check endpoint",
        "auth": "Authentication endpoint",
        "options": "CORS preflight",
        "docs": "API documentation",
        "openapi": "OpenAPI spec",
        "/api-docs": "API documentation",
    }

    def __init__(self, router_dir: Path):
        self.router_dir = router_dir
        self.endpoints: List[Endpoint] = []
        self.errors: List[str] = []

    def audit_all_routers(self) -> None:
        """Scan all router files"""
        router_files = []

        for path in self.router_dir.rglob("*.py"):
            if "__pycache__" in str(path):
                continue
            if path.name.startswith("__"):
                continue
            if "test" in str(path):
                continue
            if "models" in path.parts:
                continue
            if "handlers" in path.parts and "test_scenario" in path.name:
                continue

            router_files.append(path)

        for router_file in sorted(router_files):
            self._audit_file(router_file)

    def _audit_file(self, file_path: Path) -> None:
        """Audit a single file"""
        try:
            content = file_path.read_text()
            self._find_endpoints(content, str(file_path))
        except Exception as e:
            self.errors.append(f"Error reading {file_path}: {e}")

    def _find_endpoints(self, content: str, file_path: str) -> None:
        """Find all endpoint definitions"""
        lines = content.split("\n")

        for i, line in enumerate(lines, 1):
            endpoint_match = re.search(
                r"@\w+\.(get|post|put|delete|patch|options)\s*\(", line
            )

            if endpoint_match:
                method = endpoint_match.group(1).upper()
                path = self._extract_path(line, lines, i)
                func_name = self._extract_function_name(lines, i)

                has_auth, auth_type = self._check_authentication(lines, i, func_name)

                is_public, public_reason = self._is_public_endpoint(
                    path, method, file_path
                )

                endpoint = Endpoint(
                    file_path=file_path,
                    method=method,
                    path=path or "unknown",
                    function_name=func_name or "unknown",
                    line_number=i,
                    has_auth=has_auth,
                    auth_type=auth_type,
                    is_public=is_public,
                    public_reason=public_reason,
                )

                self.endpoints.append(endpoint)

    def _extract_path(self, line: str, lines: List[str], line_num: int) -> str:
        """Extract path from decorator"""
        path_match = re.search(r'["\']([/\w{}\-_]+)["\']', line)
        if path_match:
            return path_match.group(1)

        for offset in range(1, min(5, len(lines) - line_num)):
            next_line = lines[line_num + offset - 1]
            path_match = re.search(r'["\']([/\w{}\-_]+)["\']', next_line)
            if path_match:
                return path_match.group(1)

        return "unknown"

    def _extract_function_name(self, lines: List[str], line_num: int) -> str:
        """Extract function name"""
        for offset in range(0, min(10, len(lines) - line_num)):
            line = lines[line_num + offset - 1]
            func_match = re.search(r"(async\s+)?def\s+(\w+)\s*\(", line)
            if func_match:
                return func_match.group(2)
        return "unknown"

    def _check_authentication(
        self, lines: List[str], line_num: int, func_name: str
    ) -> tuple:
        """Check if endpoint has authentication"""
        func_start = line_num
        for i in range(line_num, min(line_num + 20, len(lines))):
            line = lines[i - 1]

            if re.search(r"(async\s+)?def\s+\w+\s*\(", line):
                func_start = i
                break

        func_body = "\n".join(lines[func_start - 1 : func_start + 10])

        for pattern in self.AUTH_PATTERNS:
            if re.search(pattern, func_body):
                if "require_admin" in pattern:
                    return True, "admin"
                elif "require_write" in pattern:
                    return True, "write"
                elif "require_read" in pattern:
                    return True, "read"
                elif "require_scopes" in pattern:
                    return True, "scoped"
                else:
                    return True, "authenticated"

        return False, "none"

    def _is_public_endpoint(self, path: str, method: str, file_path: str) -> tuple:
        """Determine if endpoint should be public"""
        path_lower = path.lower()
        file_lower = file_path.lower()

        if method == "OPTIONS":
            return True, "CORS preflight"

        for indicator, reason in self.PUBLIC_INDICATORS.items():
            if indicator in path_lower or indicator in file_lower:
                return True, reason

        return False, ""

    def generate_report(self) -> Dict:
        """Generate audit report"""
        protected = []
        unprotected = []
        public = []

        for ep in self.endpoints:
            if ep.is_public:
                public.append(ep)
            elif ep.has_auth:
                protected.append(ep)
            else:
                unprotected.append(ep)

        return {
            "total": len(self.endpoints),
            "protected": protected,
            "unprotected": unprotected,
            "public": public,
            "errors": self.errors,
            "summary": {
                "protected_count": len(protected),
                "unprotected_count": len(unprotected),
                "public_count": len(public),
                "admin_endpoints": len(
                    [e for e in protected if e.auth_type == "admin"]
                ),
                "write_endpoints": len(
                    [e for e in protected if e.auth_type == "write"]
                ),
                "read_endpoints": len([e for e in protected if e.auth_type == "read"]),
            },
        }

    def print_report(self) -> None:
        """Print formatted report"""
        report = self.generate_report()
        summary = report["summary"]

        print("=" * 90)
        print("COMPREHENSIVE API AUTHORIZATION AUDIT")
        print("=" * 90)
        print()

        print("SUMMARY")
        print("-" * 90)
        print(f"Total Endpoints Analyzed: {report['total']}")
        print(f"  ✓ Protected (Auth Required): {summary['protected_count']}")
        print(f"    - Admin Access: {summary['admin_endpoints']}")
        print(f"    - Write Access: {summary['write_endpoints']}")
        print(f"    - Read Access: {summary['read_endpoints']}")
        print(f"  ⚠ Unprotected (NO AUTH): {summary['unprotected_count']}")
        print(f"  ℹ Public (Expected): {summary['public_count']}")
        print()

        if report["unprotected"]:
            print("⚠️  CRITICAL: UNPROTECTED ENDPOINTS REQUIRE IMMEDIATE ATTENTION")
            print("=" * 90)
            for ep in report["unprotected"]:
                print(f"\n[{ep.method}] {ep.path}")
                print(f"  📁 File: {ep.file_path}:{ep.line_number}")
                print(f"  🔧 Function: {ep.function_name}()")
                print(f"  🚨 Status: NO AUTHENTICATION - SECURITY RISK")
                print(f"  ✅ Required: Add Depends(require_read/write/admin)")
            print()

        if report["protected"]:
            print("✅ PROTECTED ENDPOINTS (Sample)")
            print("-" * 90)
            for ep in report["protected"][:15]:
                auth_badge = {
                    "admin": "🔐 ADMIN",
                    "write": "✏️ WRITE",
                    "read": "👁️ READ",
                    "scoped": "🔒 SCOPED",
                    "authenticated": "🔑 AUTH",
                }.get(ep.auth_type, "🔒 AUTH")

                print(f"[{ep.method}] {ep.path} - {auth_badge}")
                print(f"  📁 {ep.file_path}:{ep.line_number}")
            if len(report["protected"]) > 15:
                print(
                    f"\n  ... and {len(report['protected']) - 15} more protected endpoints"
                )
            print()

        if report["public"]:
            print("ℹ️  PUBLIC ENDPOINTS (Expected)")
            print("-" * 90)
            for ep in report["public"][:10]:
                print(f"[{ep.method}] {ep.path} - {ep.public_reason}")
                print(f"  📁 {ep.file_path}:{ep.line_number}")
            if len(report["public"]) > 10:
                print(f"\n  ... and {len(report['public']) - 10} more public endpoints")
            print()

        if report["errors"]:
            print("⚠️  ERRORS ENCOUNTERED")
            print("-" * 90)
            for error in report["errors"]:
                print(f"  • {error}")
            print()

        if report["unprotected"]:
            print("=" * 90)
            print("RECOMMENDATIONS")
            print("=" * 90)
            print("1. Add authentication to all unprotected endpoints:")
            print("   - Use Depends(require_read) for read-only operations")
            print("   - Use Depends(require_write) for create/update operations")
            print("   - Use Depends(require_admin) for administrative operations")
            print()
            print("2. Example fix:")
            print("   @router.post('/endpoint')")
            print("   async def my_endpoint(")
            print("       data: MyModel,")
            print("       current_user: User = Depends(require_write)  # Add this")
            print("   ):")
            print()
            print("3. Import required dependencies:")
            print(
                "   from app.security.auth import User, require_read, require_write, require_admin"
            )
            print()

        print("=" * 90)


def main():
    """Run comprehensive authorization audit"""
    script_dir = Path(__file__).parent
    server_dir = script_dir.parent
    router_dir = server_dir / "app" / "router"

    if not router_dir.exists():
        print(f"Error: Router directory not found: {router_dir}")
        return 1

    auditor = ComprehensiveAuthAuditor(router_dir)
    auditor.audit_all_routers()
    auditor.print_report()

    report = auditor.generate_report()
    return 1 if report["unprotected"] else 0


if __name__ == "__main__":
    exit(main())
