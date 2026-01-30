"""Jinja2-based email template rendering engine."""

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..config import EmailSettings


logger = logging.getLogger(__name__)


@dataclass
class RenderedEmail:
    """Rendered email template with HTML and plain text versions."""

    html: str
    plain_text: str


class TemplateEngine:
    """Email template rendering engine using Jinja2."""

    def __init__(
        self,
        settings: EmailSettings,
        translate_fn: Optional[Callable[[str], str]] = None
    ):
        """Initialize template engine.

        Args:
            settings: Email configuration with template directories
            translate_fn: Optional translation function for i18n support
        """
        self.settings = settings
        self.translate_fn = translate_fn or self._default_translate

        template_dirs = self._get_template_dirs()
        self.env = Environment(
            loader=FileSystemLoader(template_dirs),
            autoescape=select_autoescape(['html', 'xml', 'jinja2', 'j2']),
            trim_blocks=True,
            lstrip_blocks=True
        )

        self._register_globals()

    def _get_template_dirs(self) -> list[str]:
        """Get all template search directories."""
        core_templates = Path(__file__).parent.parent.parent / "templates"
        dirs = [str(core_templates)]

        for custom_dir in self.settings.EMAIL_TEMPLATE_DIRS:
            if Path(custom_dir).exists():
                dirs.append(custom_dir)
            else:
                logger.warning(
                    "Template directory does not exist",
                    extra={"directory": custom_dir}
                )

        return dirs

    def _register_globals(self) -> None:
        """Register Jinja2 global functions."""
        self.env.globals['t'] = self.translate_fn
        self.env.globals['get_dir'] = self._get_text_direction

    def _default_translate(self, key: str, **kwargs) -> str:
        """Default translation function (passthrough)."""
        return key.format(**kwargs) if kwargs else key

    def _get_text_direction(self, lang: str) -> str:
        """Get text direction for language code.

        Args:
            lang: Language code (e.g., 'en', 'he', 'ar')

        Returns:
            'rtl' for Hebrew, 'ltr' for all others
        """
        rtl_languages = {'he', 'ar', 'fa', 'ur', 'yi'}
        return 'rtl' if lang in rtl_languages else 'ltr'

    def render(self, template_name: str, context: dict) -> RenderedEmail:
        """Render email template with context.

        Args:
            template_name: Template file name (e.g., 'welcome.html.j2')
            context: Template context variables

        Returns:
            RenderedEmail with HTML and plain text content

        Raises:
            jinja2.TemplateNotFound: If template doesn't exist
            jinja2.TemplateError: If template rendering fails
        """
        try:
            template = self.env.get_template(template_name)
            html_content = template.render(context)
            plain_text = self._html_to_plain_text(html_content)

            logger.info(
                "Template rendered successfully",
                extra={
                    "template": template_name,
                    "context_keys": list(context.keys())
                }
            )

            return RenderedEmail(html=html_content, plain_text=plain_text)

        except Exception as exc:
            logger.error(
                "Template rendering failed",
                extra={
                    "template": template_name,
                    "error": str(exc)
                },
                exc_info=True
            )
            raise

    def _html_to_plain_text(self, html: str) -> str:
        """Convert HTML to plain text by stripping tags.

        Args:
            html: HTML content

        Returns:
            Plain text version with tags removed
        """
        text = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
        text = re.sub(r'</p>', '\n\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        return text.strip()

    def add_template_dir(self, path: str) -> None:
        """Add additional template search directory.

        Args:
            path: Directory path to add
        """
        if not Path(path).exists():
            logger.warning(
                "Cannot add non-existent template directory",
                extra={"directory": path}
            )
            return

        current_dirs = list(self.env.loader.searchpath)
        if path not in current_dirs:
            current_dirs.append(path)
            self.env.loader.searchpath = current_dirs
            logger.info(
                "Template directory added",
                extra={"directory": path}
            )
