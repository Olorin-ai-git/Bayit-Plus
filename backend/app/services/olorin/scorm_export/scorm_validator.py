"""SCORM package structural validator."""

import json
import xml.etree.ElementTree as ET
import zipfile

from app.core.logging_config import get_logger

logger = get_logger(__name__)

REQUIRED_FILES = [
    "imsmanifest.xml",
    "player/index.html",
    "player/player.js",
    "player/scorm-api.js",
    "player/character-engine.js",
    "player/styles.css",
    "content/manifest.json",
    "config.json",
]


class ScormValidationError(Exception):
    """Raised when SCORM package fails structural validation."""


def validate_scorm_package(zip_path: str) -> None:
    """
    Validate a SCORM zip package structure.

    Checks required files, XML validity, schema version,
    file references, and JSON validity.

    Raises ScormValidationError on any failure.
    """
    try:
        zf = zipfile.ZipFile(zip_path, "r")
    except (zipfile.BadZipFile, FileNotFoundError) as e:
        raise ScormValidationError(f"Invalid zip file: {e}")

    with zf:
        names = set(zf.namelist())

        for req in REQUIRED_FILES:
            if req not in names:
                raise ScormValidationError(
                    f"Missing required file: {req}"
                )

        try:
            manifest_bytes = zf.read("imsmanifest.xml")
            root = ET.fromstring(manifest_bytes)
        except ET.ParseError as e:
            raise ScormValidationError(
                f"imsmanifest.xml is not valid XML: {e}"
            )

        ns = {
            "ims": "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
        }
        schema_el = root.find(".//ims:metadata/ims:schemaversion", ns)
        if schema_el is None:
            schema_el = root.find(".//schemaversion")
        if schema_el is not None and schema_el.text != "1.2":
            raise ScormValidationError(
                f"Expected SCORM 1.2, got {schema_el.text}"
            )

        resource_el = root.find(
            ".//ims:resources/ims:resource", ns
        )
        if resource_el is None:
            resource_el = root.find(".//resources/resource")
        if resource_el is not None:
            file_els = resource_el.findall("ims:file", ns)
            if not file_els:
                file_els = resource_el.findall("file")
            for file_el in file_els:
                href = file_el.get("href", "")
                if href and href not in names:
                    raise ScormValidationError(
                        f"Manifest references missing file: {href}"
                    )

        try:
            json.loads(zf.read("config.json"))
        except json.JSONDecodeError as e:
            raise ScormValidationError(f"config.json is invalid JSON: {e}")

        try:
            json.loads(zf.read("content/manifest.json"))
        except json.JSONDecodeError as e:
            raise ScormValidationError(
                f"content/manifest.json is invalid JSON: {e}"
            )

    logger.info(
        "SCORM package validation passed",
        extra={"zip_path": zip_path},
    )
