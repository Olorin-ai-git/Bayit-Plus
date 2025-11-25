"""
API Authorization Audit Script
Scans all FastAPI routers and analyzes authentication/authorization patterns
"""

import ast
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set


@dataclass
class EndpointInfo:
    """Information about an API endpoint"""

    file_path: str
    method: str
    path: str
    function_name: str
    line_number: int
    has_auth_dependency: bool
    has_scope_check: bool
    dependencies: List[str]
    is_options: bool
    is_health_check: bool


class AuthAuditor:
    """Audits FastAPI routers for authentication and authorization"""

    AUTH_DEPENDENCIES = {
        "get_current_user",
        "get_current_active_user",
        "require_scopes",
        "verify_token",
        "authenticate_user",
    }

    PUBLIC_PATHS = {
        "/health",
        "/health/",
        "/docs",
        "/openapi.json",
        "/auth/login",
        "/auth/token",
    }

    def __init__(self, router_dir: Path):
        self.router_dir = router_dir
        self.endpoints: List[EndpointInfo] = []
        self.errors: List[str] = []

    def audit_all_routers(self) -> None:
        """Scan all router files"""
        router_files = []

        for root, _, files in os.walk(self.router_dir):
            for file in files:
                if file.endswith(".py") and not file.startswith("__"):
                    if "test" not in root and "models" not in root:
                        router_files.append(Path(root) / file)

        for router_file in router_files:
            self._audit_router_file(router_file)

    def _audit_router_file(self, file_path: Path) -> None:
        """Audit a single router file"""
        try:
            with open(file_path, "r") as f:
                content = f.read()

            tree = ast.parse(content)
            self._analyze_ast(tree, str(file_path))

        except SyntaxError as e:
            self.errors.append(f"Syntax error in {file_path}: {e}")
        except Exception as e:
            self.errors.append(f"Error analyzing {file_path}: {e}")

    def _analyze_ast(self, tree: ast.AST, file_path: str) -> None:
        """Analyze AST for route decorators and dependencies"""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                self._analyze_function(node, file_path)

    def _analyze_function(self, node: ast.FunctionDef, file_path: str) -> None:
        """Analyze a function for route decorator"""
        route_info = self._extract_route_info(node)

        if not route_info:
            return

        method, path = route_info
        dependencies = self._extract_dependencies(node)

        has_auth = any(dep in self.AUTH_DEPENDENCIES for dep in dependencies)
        has_scope = "require_scopes" in dependencies
        is_options = method.lower() == "options"
        is_health = "/health" in path.lower()

        endpoint = EndpointInfo(
            file_path=file_path,
            method=method.upper(),
            path=path,
            function_name=node.name,
            line_number=node.lineno,
            has_auth_dependency=has_auth,
            has_scope_check=has_scope,
            dependencies=dependencies,
            is_options=is_options,
            is_health_check=is_health,
        )

        self.endpoints.append(endpoint)

    def _extract_route_info(self, node: ast.FunctionDef) -> Optional[tuple]:
        """Extract HTTP method and path from route decorator"""
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Attribute):
                    method = decorator.func.attr
                    if method in ["get", "post", "put", "delete", "patch", "options"]:
                        path = self._extract_path_from_decorator(decorator)
                        if path:
                            return (method, path)
        return None

    def _extract_path_from_decorator(self, decorator: ast.Call) -> Optional[str]:
        """Extract path argument from decorator"""
        if decorator.args:
            first_arg = decorator.args[0]
            if isinstance(first_arg, ast.Constant):
                return first_arg.value
        return None

    def _extract_dependencies(self, node: ast.FunctionDef) -> List[str]:
        """Extract dependency names from function parameters"""
        dependencies = []

        for arg in node.args.args:
            if hasattr(arg, "annotation"):
                dep_name = self._extract_dependency_name(arg.annotation)
                if dep_name:
                    dependencies.append(dep_name)

        return dependencies

    def _extract_dependency_name(self, annotation) -> Optional[str]:
        """Extract dependency function name from type annotation"""
        if isinstance(annotation, ast.Call):
            if isinstance(annotation.func, ast.Name):
                if annotation.func.id == "Depends":
                    if annotation.args:
                        arg = annotation.args[0]
                        if isinstance(arg, ast.Name):
                            return arg.id
                        elif isinstance(arg, ast.Call):
                            if isinstance(arg.func, ast.Name):
                                return arg.func.id
        return None

    def generate_report(self) -> Dict:
        """Generate comprehensive audit report"""
        unprotected_endpoints = []
        protected_endpoints = []
        public_endpoints = []

        for endpoint in self.endpoints:
            is_public = (
                endpoint.is_options
                or endpoint.is_health_check
                or any(pub in endpoint.path for pub in self.PUBLIC_PATHS)
                or "/auth/" in endpoint.path
            )

            if is_public:
                public_endpoints.append(endpoint)
            elif endpoint.has_auth_dependency:
                protected_endpoints.append(endpoint)
            else:
                unprotected_endpoints.append(endpoint)

        return {
            "total_endpoints": len(self.endpoints),
            "protected_endpoints": len(protected_endpoints),
            "unprotected_endpoints": len(unprotected_endpoints),
            "public_endpoints": len(public_endpoints),
            "endpoints_with_scope_checks": len(
                [e for e in self.endpoints if e.has_scope_check]
            ),
            "unprotected_details": unprotected_endpoints,
            "protected_details": protected_endpoints,
            "public_details": public_endpoints,
            "errors": self.errors,
        }

    def print_report(self) -> None:
        """Print formatted audit report"""
        report = self.generate_report()

        print("=" * 80)
        print("API AUTHORIZATION AUDIT REPORT")
        print("=" * 80)
        print()

        print("SUMMARY:")
        print(f"  Total Endpoints: {report['total_endpoints']}")
        print(f"  Protected (Auth Required): {report['protected_endpoints']}")
        print(f"  Unprotected (No Auth): {report['unprotected_endpoints']}")
        print(f"  Public (OPTIONS/Health): {report['public_endpoints']}")
        print(f"  With Scope Checks: {report['endpoints_with_scope_checks']}")
        print()

        if report["unprotected_details"]:
            print("UNPROTECTED ENDPOINTS (REQUIRE ATTENTION):")
            print("-" * 80)
            for ep in report["unprotected_details"]:
                print(f"  [{ep.method}] {ep.path}")
                print(f"    File: {ep.file_path}:{ep.line_number}")
                print(f"    Function: {ep.function_name}")
                print(
                    f"    Dependencies: {', '.join(ep.dependencies) if ep.dependencies else 'None'}"
                )
                print()

        if report["protected_details"]:
            print("PROTECTED ENDPOINTS:")
            print("-" * 80)
            for ep in report["protected_details"][:10]:
                scope_indicator = " [SCOPED]" if ep.has_scope_check else ""
                print(f"  [{ep.method}] {ep.path}{scope_indicator}")
                print(f"    File: {ep.file_path}:{ep.line_number}")
                print()
            if len(report["protected_details"]) > 10:
                print(f"  ... and {len(report['protected_details']) - 10} more")
                print()

        if report["errors"]:
            print("ERRORS ENCOUNTERED:")
            print("-" * 80)
            for error in report["errors"]:
                print(f"  {error}")
            print()

        print("=" * 80)


def main():
    """Run the authorization audit"""
    script_dir = Path(__file__).parent
    server_dir = script_dir.parent
    router_dir = server_dir / "app" / "router"

    if not router_dir.exists():
        print(f"Error: Router directory not found: {router_dir}")
        return

    auditor = AuthAuditor(router_dir)
    auditor.audit_all_routers()
    auditor.print_report()


if __name__ == "__main__":
    main()
