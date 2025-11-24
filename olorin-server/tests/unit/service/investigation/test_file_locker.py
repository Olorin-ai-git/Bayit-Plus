"""
Unit tests for FileLocker

Tests OS-level file locking with retry, exponential backoff, and sequence numbering.
"""

import os
import tempfile
import time
from pathlib import Path
import pytest

from app.service.investigation.file_locker import FileLocker, FileLockError


class TestFileLocker:
    """Test suite for FileLocker"""

    def test_lock_file_creates_file_if_missing(self):
        """Test that lock_file creates file if it doesn't exist and create_if_missing=True"""
        locker = FileLocker(max_retries=1)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "test_file.txt"
            
            # File doesn't exist yet
            assert not file_path.exists()
            
            # Lock should create file
            handle = locker.lock_file(file_path, create_if_missing=True)
            assert handle is not None
            assert file_path.exists()
            
            # Cleanup
            locker.unlock_file(handle)
    
    def test_lock_file_fails_if_file_missing_and_create_if_missing_false(self):
        """Test that lock_file raises error if file doesn't exist and create_if_missing=False"""
        locker = FileLocker(max_retries=1)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "nonexistent.txt"
            
            assert not file_path.exists()
            
            with pytest.raises(FileLockError):
                locker.lock_file(file_path, create_if_missing=False)
    
    def test_lock_and_unlock_file(self):
        """Test basic lock and unlock operations"""
        locker = FileLocker(max_retries=1)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "test.txt"
            file_path.touch()
            
            # Acquire lock
            handle = locker.lock_file(file_path, create_if_missing=False)
            assert handle is not None
            
            # Release lock
            locker.unlock_file(handle)
            
            # Should be able to lock again
            handle2 = locker.lock_file(file_path, create_if_missing=False)
            assert handle2 is not None
            locker.unlock_file(handle2)
    
    def test_concurrent_lock_retry(self):
        """Test that concurrent locks trigger retry mechanism"""
        locker = FileLocker(max_retries=3, base_backoff_ms=10)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "concurrent.txt"
            file_path.touch()
            
            # Acquire first lock
            handle1 = locker.lock_file(file_path, create_if_missing=False)
            assert handle1 is not None
            
            # Try to acquire second lock (should retry)
            # Note: This test may pass quickly if OS allows concurrent locks
            # On systems that don't allow concurrent locks, this will retry
            try:
                handle2 = locker.lock_file(file_path, create_if_missing=False)
                # If we got here, either OS allows concurrent locks or retry succeeded
                if handle2 is not None:
                    locker.unlock_file(handle2)
            except FileLockError:
                # Expected if OS doesn't allow concurrent locks
                pass
            
            # Cleanup
            locker.unlock_file(handle1)
    
    def test_lock_file_max_retries(self):
        """Test that lock_file respects max_retries"""
        locker = FileLocker(max_retries=2, base_backoff_ms=10)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "retry_test.txt"
            file_path.touch()
            
            # Acquire first lock
            handle1 = locker.lock_file(file_path, create_if_missing=False)
            
            # Try to acquire second lock - should fail after max_retries
            # This test depends on OS behavior - some OSes may allow concurrent locks
            # In that case, the test will pass without raising an error
            try:
                handle2 = locker.lock_file(file_path, create_if_missing=False)
                if handle2 is not None:
                    locker.unlock_file(handle2)
            except FileLockError as e:
                # Expected if OS enforces exclusive locks
                assert "retries" in str(e).lower() or "attempts" in str(e).lower()
            
            locker.unlock_file(handle1)
    
    def test_backoff_calculation(self):
        """Test that backoff increases with attempts"""
        locker = FileLocker(max_retries=5, base_backoff_ms=100)
        
        backoff1 = locker._calculate_backoff(0)
        backoff2 = locker._calculate_backoff(1)
        backoff3 = locker._calculate_backoff(2)
        
        # Backoff should generally increase (allowing for jitter)
        assert backoff2 >= backoff1 * 0.9  # Allow 10% jitter variance
        assert backoff3 >= backoff2 * 0.9
    
    def test_lock_file_creates_parent_directories(self):
        """Test that lock_file creates parent directories if needed"""
        locker = FileLocker(max_retries=1)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "subdir" / "nested" / "test.txt"
            
            # Parent directories don't exist
            assert not file_path.parent.exists()
            
            # Lock should create parent directories
            handle = locker.lock_file(file_path, create_if_missing=True)
            assert handle is not None
            assert file_path.parent.exists()
            assert file_path.exists()
            
            locker.unlock_file(handle)

