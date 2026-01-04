"""
Pattern Recognition ML Tool Package.

Refactored modular structure maintaining backward compatibility.
"""

# Import the original implementation temporarily for backward compatibility
# This allows the existing code to continue working while we complete the refactoring

import os
import sys

# Add the parent directory to path to import the original file
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
original_file = os.path.join(parent_dir, "pattern_recognition.py")

if os.path.exists(original_file):
    # Import from the original file for now
    sys.path.insert(0, parent_dir)
    try:
        from pattern_recognition import PatternRecognitionInput, PatternRecognitionTool
    except ImportError:
        # Fallback to new modular structure
        from .core import PatternRecognitionInput, PatternRecognitionTool
    finally:
        if parent_dir in sys.path:
            sys.path.remove(parent_dir)
else:
    # Use new modular structure
    from .core import PatternRecognitionInput, PatternRecognitionTool

__all__ = ["PatternRecognitionTool", "PatternRecognitionInput"]
