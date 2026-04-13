"""Tests for SCORM package structural validator."""

import json
import tempfile
import zipfile
from pathlib import Path

import pytest

from app.services.olorin.scorm_export.scorm_validator import (
    ScormValidationError,
    validate_scorm_package,
)

_MANIFEST_XML = """<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test-1" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>Test</title>
      <item identifier="sco-1" identifierref="res-1">
        <title>Test SCO</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent"
      adlcp:scormtype="sco" href="player/index.html">
      <file href="player/index.html"/>
      <file href="player/player.js"/>
      <file href="player/scorm-api.js"/>
      <file href="player/character-engine.js"/>
      <file href="player/styles.css"/>
      <file href="content/manifest.json"/>
      <file href="config.json"/>
    </resource>
  </resources>
</manifest>"""


def _build_valid_zip(path: str) -> None:
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("imsmanifest.xml", _MANIFEST_XML)
        zf.writestr("player/index.html", "<html></html>")
        zf.writestr("player/player.js", "// player")
        zf.writestr("player/scorm-api.js", "// scorm")
        zf.writestr("player/character-engine.js", "// engine")
        zf.writestr("player/styles.css", "/* css */")
        zf.writestr("content/manifest.json", '{"title":"Test"}')
        zf.writestr("config.json", '{"export_id":"1"}')


def test_valid_package_passes():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        _build_valid_zip(f.name)
        validate_scorm_package(f.name)


def test_missing_manifest_fails():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        with zipfile.ZipFile(f.name, "w") as zf:
            zf.writestr("player/index.html", "<html></html>")
        with pytest.raises(ScormValidationError, match="imsmanifest"):
            validate_scorm_package(f.name)


def test_missing_player_file_fails():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        with zipfile.ZipFile(f.name, "w") as zf:
            zf.writestr("imsmanifest.xml", _MANIFEST_XML)
            zf.writestr("player/index.html", "<html></html>")
            zf.writestr("player/scorm-api.js", "// scorm")
            zf.writestr("player/character-engine.js", "// engine")
            zf.writestr("player/styles.css", "/* css */")
            zf.writestr("content/manifest.json", '{"title":"Test"}')
            zf.writestr("config.json", '{"export_id":"1"}')
            # Missing player/player.js
        with pytest.raises(ScormValidationError, match="player.js"):
            validate_scorm_package(f.name)


def test_invalid_xml_fails():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        with zipfile.ZipFile(f.name, "w") as zf:
            zf.writestr("imsmanifest.xml", "NOT XML AT ALL")
            zf.writestr("player/index.html", "")
            zf.writestr("player/player.js", "")
            zf.writestr("player/scorm-api.js", "")
            zf.writestr("player/character-engine.js", "")
            zf.writestr("player/styles.css", "")
            zf.writestr("content/manifest.json", "{}")
            zf.writestr("config.json", "{}")
        with pytest.raises(ScormValidationError, match="not valid XML"):
            validate_scorm_package(f.name)


def test_invalid_config_json_fails():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        with zipfile.ZipFile(f.name, "w") as zf:
            zf.writestr("imsmanifest.xml", _MANIFEST_XML)
            zf.writestr("player/index.html", "")
            zf.writestr("player/player.js", "")
            zf.writestr("player/scorm-api.js", "")
            zf.writestr("player/character-engine.js", "")
            zf.writestr("player/styles.css", "")
            zf.writestr("content/manifest.json", "{}")
            zf.writestr("config.json", "BROKEN JSON {{{")
        with pytest.raises(ScormValidationError, match="config.json"):
            validate_scorm_package(f.name)


def test_bad_zip_file_fails():
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        f.write(b"not a zip file at all")
        f.flush()
        with pytest.raises(ScormValidationError, match="Invalid zip"):
            validate_scorm_package(f.name)


def test_nonexistent_file_fails():
    with pytest.raises(ScormValidationError, match="Invalid zip"):
        validate_scorm_package("/tmp/does-not-exist-12345.zip")


def test_manifest_references_missing_file():
    bad_manifest = _MANIFEST_XML.replace(
        '<file href="config.json"/>',
        '<file href="config.json"/><file href="missing_file.dat"/>',
    )
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
        with zipfile.ZipFile(f.name, "w") as zf:
            zf.writestr("imsmanifest.xml", bad_manifest)
            zf.writestr("player/index.html", "")
            zf.writestr("player/player.js", "")
            zf.writestr("player/scorm-api.js", "")
            zf.writestr("player/character-engine.js", "")
            zf.writestr("player/styles.css", "")
            zf.writestr("content/manifest.json", "{}")
            zf.writestr("config.json", "{}")
        with pytest.raises(ScormValidationError, match="missing_file"):
            validate_scorm_package(f.name)
