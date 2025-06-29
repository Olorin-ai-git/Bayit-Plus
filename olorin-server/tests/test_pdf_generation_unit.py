import os
from unittest.mock import patch

import pytest
from fpdf import FPDF

from tests.pdf_utils import generate_improved_pdf


def test_generate_improved_pdf_creates_pdf(tmp_path, monkeypatch):
    monkeypatch.setattr(os.path, "exists", lambda x: True)
    with (
        patch.object(FPDF, "add_font", return_value=None),
        patch.object(FPDF, "set_font", return_value=None),
        patch.object(FPDF, "cell", return_value=None),
    ):
        generate_improved_pdf()
        # No exception means pass


def test_generate_improved_pdf_missing_font(monkeypatch):
    monkeypatch.setattr(os.path, "exists", lambda x: False)
    with (
        patch.object(FPDF, "add_font", return_value=None) as mock_add_font,
        patch.object(FPDF, "set_font", return_value=None),
        patch.object(FPDF, "cell", return_value=None),
    ):
        generate_improved_pdf()
        mock_add_font.assert_not_called()


def test_generate_improved_pdf_runs(monkeypatch):
    monkeypatch.setattr(os.path, "exists", lambda x: True)
    with (
        patch.object(FPDF, "add_font", return_value=None),
        patch.object(FPDF, "set_font", return_value=None),
        patch.object(FPDF, "cell", return_value=None),
    ):
        generate_improved_pdf()
        # No exception means pass
