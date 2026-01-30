"""Template registry for discovering and validating email templates."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, TemplateSyntaxError

from ..config import EmailSettings


logger = logging.getLogger(__name__)


@dataclass
class TemplateMetadata:
    """Metadata about an email template."""

    name: str
    path: str
    category: str
    description: str


class TemplateRegistry:
    """Registry for discovering and managing email templates."""

    def __init__(self, settings: EmailSettings):
        """Initialize template registry."""
        self.settings = settings
        self.templates: dict[str, TemplateMetadata] = {}
        self._scan_templates()

    def _get_template_dirs(self) -> list[Path]:
        """Get all template search directories as Path objects."""
        core_templates = Path(__file__).parent.parent.parent / "templates"
        dirs = [core_templates]

        for custom_dir in self.settings.EMAIL_TEMPLATE_DIRS:
            path = Path(custom_dir)
            if path.exists():
                dirs.append(path)

        return dirs

    def _scan_templates(self) -> None:
        """Scan template directories for .html.j2 files."""
        template_dirs = self._get_template_dirs()

        for template_dir in template_dirs:
            if not template_dir.exists():
                logger.warning(
                    "Template directory does not exist",
                    extra={"directory": str(template_dir)}
                )
                continue

            for template_file in template_dir.rglob("*.html.j2"):
                self._register_template_file(template_file, template_dir)

        logger.info(
            "Template scan complete",
            extra={"total_templates": len(self.templates)}
        )

    def _register_template_file(self, template_file: Path, base_dir: Path) -> None:
        """Register a single template file."""
        try:
            relative_path = template_file.relative_to(base_dir)
            template_name = str(relative_path)

            category = self._extract_category(relative_path)
            description = self._extract_description(template_file)

            self._validate_template_syntax(template_file)

            metadata = TemplateMetadata(
                name=template_name,
                path=str(template_file),
                category=category,
                description=description
            )

            self.templates[template_name] = metadata

            logger.debug(
                "Template registered",
                extra={
                    "name": template_name,
                    "category": category
                }
            )

        except Exception as exc:
            logger.error(
                "Failed to register template",
                extra={
                    "file": str(template_file),
                    "error": str(exc)
                },
                exc_info=True
            )

    def _extract_category(self, relative_path: Path) -> str:
        """Extract category from template path."""
        if len(relative_path.parts) > 1:
            return relative_path.parts[0]
        return "general"

    def _extract_description(self, template_file: Path) -> str:
        """Extract description from template file comments."""
        try:
            content = template_file.read_text(encoding='utf-8')
            for line in content.split('\n')[:10]:
                if '{#' in line and 'description:' in line.lower():
                    start = line.find('description:') + len('description:')
                    end = line.find('#}', start)
                    if end > start:
                        return line[start:end].strip()
            return ""
        except Exception:
            return ""

    def _validate_template_syntax(self, template_file: Path) -> None:
        """Validate template syntax by attempting to load it."""
        try:
            env = Environment(loader=FileSystemLoader(str(template_file.parent)))
            env.get_template(template_file.name)
        except TemplateSyntaxError as exc:
            logger.error(
                "Template syntax error",
                extra={
                    "file": str(template_file),
                    "line": exc.lineno,
                    "error": exc.message
                }
            )
            raise

    def register_template_dir(self, path: str) -> None:
        """Add platform-specific template directory and scan it."""
        path_obj = Path(path)
        if not path_obj.exists():
            logger.warning(
                "Cannot register non-existent directory",
                extra={"directory": path}
            )
            return

        if path not in self.settings.EMAIL_TEMPLATE_DIRS:
            self.settings.EMAIL_TEMPLATE_DIRS.append(path)

        for template_file in path_obj.rglob("*.html.j2"):
            self._register_template_file(template_file, path_obj)

        logger.info(
            "Template directory registered",
            extra={
                "directory": path,
                "total_templates": len(self.templates)
            }
        )

    def list_templates(self) -> list[TemplateMetadata]:
        """Get list of all registered templates."""
        return list(self.templates.values())

    def get_template(self, name: str) -> Optional[TemplateMetadata]:
        """Get metadata for a specific template."""
        return self.templates.get(name)
