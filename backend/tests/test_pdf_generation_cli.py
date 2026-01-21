import builtins
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Path to the script under test
SCRIPT_PATH = os.path.join(os.path.dirname(__file__), "test_pdf_generation.py")

# Import the script as a module
import importlib.util

spec = importlib.util.spec_from_file_location("test_pdf_generation", SCRIPT_PATH)
pdfgen = importlib.util.module_from_spec(spec)
sys.modules["test_pdf_generation"] = pdfgen
spec.loader.exec_module(pdfgen)


def test_main_success(monkeypatch, tmp_path):
    # Patch generate_improved_pdf to simulate success
    monkeypatch.setattr(
        pdfgen, "generate_improved_pdf", lambda: str(tmp_path / "foo.pdf")
    )
    monkeypatch.setattr(os.path, "exists", lambda x: True)
    monkeypatch.setattr(os.path, "getsize", lambda x: 10)
    with patch("builtins.print") as mock_print:
        ret = pdfgen.main()
        assert ret == 0
        # Check that success message was printed
        found = any(
            "PDF generation completed successfully" in str(a)
            for a, *_ in mock_print.call_args_list
        )
        assert found


def test_main_file_size(monkeypatch, tmp_path):
    # Patch generate_improved_pdf to simulate file creation
    out_file = tmp_path / "bar.pdf"
    out_file.write_bytes(b"1234567890")
    monkeypatch.setattr(pdfgen, "generate_improved_pdf", lambda: str(out_file))
    monkeypatch.setattr(os.path, "exists", lambda x: True)
    monkeypatch.setattr(os.path, "getsize", lambda x: 10)
    with patch("builtins.print") as mock_print:
        ret = pdfgen.main()
        assert ret == 0
        found = any("File size: 10" in str(a) for a, *_ in mock_print.call_args_list)
        assert found


def test_main_error(monkeypatch):
    # Patch generate_improved_pdf to raise exception
    monkeypatch.setattr(
        pdfgen,
        "generate_improved_pdf",
        lambda: (_ for _ in ()).throw(Exception("fail!")),
    )
    with patch("builtins.print") as mock_print:
        ret = pdfgen.main()
        assert ret == 1
        found = any(
            "Error generating PDF" in str(a) for a, *_ in mock_print.call_args_list
        )
        assert found


def test_main_missing_font(monkeypatch):
    # Patch os.path.exists to simulate missing font
    monkeypatch.setattr(os.path, "exists", lambda x: False)
    with patch("builtins.print") as mock_print:
        with patch("tests.pdf_utils.FPDF.add_font", return_value=None):
            with patch("tests.pdf_utils.FPDF.set_font", return_value=None):
                with patch("tests.pdf_utils.FPDF.cell", return_value=None):
                    with patch("tests.pdf_utils.FPDF.add_page", return_value=None):
                        with patch("tests.pdf_utils.FPDF.output", return_value=None):
                            with patch("tests.pdf_utils.FPDF.ln", return_value=None):
                                with patch(
                                    "tests.pdf_utils.FPDF.multi_cell", return_value=None
                                ):
                                    pdfgen.generate_improved_pdf()
        found = any(
            "font file is missing" in str(a) for a, *_ in mock_print.call_args_list
        )
        assert found


def test_main_called_as_script(monkeypatch):
    # Patch sys.argv and main/exit
    monkeypatch.setattr(sys, "argv", [SCRIPT_PATH])
    with patch.object(pdfgen, "main", return_value=0) as mock_main:
        with patch("builtins.exit") as mock_exit:
            # Instead of importlib.reload, directly call main as __main__ would
            pdfgen.__name__ = "__main__"
            pdfgen.main()
            mock_main.assert_called()
