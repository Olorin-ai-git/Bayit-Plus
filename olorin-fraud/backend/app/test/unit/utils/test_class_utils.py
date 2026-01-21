import logging
from unittest.mock import MagicMock, patch

import pytest

from app.utils.class_utils import create_instance


class TestCreateInstance:
    """Test the create_instance function."""

    def test_create_instance_success_no_args(self):
        """Test creating an instance with no arguments."""

        class TestClass:
            def __init__(self):
                self.value = "test"

        global_dict = {"TestClass": TestClass}

        instance = create_instance(global_dict, "TestClass")

        assert isinstance(instance, TestClass)
        assert instance.value == "test"

    def test_create_instance_success_with_args(self):
        """Test creating an instance with positional arguments."""

        class TestClass:
            def __init__(self, arg1, arg2):
                self.arg1 = arg1
                self.arg2 = arg2

        global_dict = {"TestClass": TestClass}

        instance = create_instance(global_dict, "TestClass", "value1", "value2")

        assert isinstance(instance, TestClass)
        assert instance.arg1 == "value1"
        assert instance.arg2 == "value2"

    def test_create_instance_success_with_kwargs(self):
        """Test creating an instance with keyword arguments."""

        class TestClass:
            def __init__(self, name=None, age=None):
                self.name = name
                self.age = age

        global_dict = {"TestClass": TestClass}

        instance = create_instance(global_dict, "TestClass", name="John", age=30)

        assert isinstance(instance, TestClass)
        assert instance.name == "John"
        assert instance.age == 30

    def test_create_instance_success_with_args_and_kwargs(self):
        """Test creating an instance with both positional and keyword arguments."""

        class TestClass:
            def __init__(self, required_arg, optional_arg=None, keyword_arg=None):
                self.required_arg = required_arg
                self.optional_arg = optional_arg
                self.keyword_arg = keyword_arg

        global_dict = {"TestClass": TestClass}

        instance = create_instance(
            global_dict, "TestClass", "required", "optional", keyword_arg="keyword"
        )

        assert isinstance(instance, TestClass)
        assert instance.required_arg == "required"
        assert instance.optional_arg == "optional"
        assert instance.keyword_arg == "keyword"

    def test_create_instance_class_not_found(self):
        """Test error when class name is not found in global_dict."""
        global_dict = {}

        with pytest.raises(KeyError):
            create_instance(global_dict, "NonExistentClass")

    def test_create_instance_class_not_found_with_logging(self):
        """Test that appropriate error is logged when class is not found."""
        global_dict = {}

        with patch("app.utils.class_utils.logger") as mock_logger:
            with pytest.raises(KeyError):
                create_instance(global_dict, "NonExistentClass")

            mock_logger.error.assert_called_once_with(
                "Error: Class 'NonExistentClass' not found."
            )

    def test_create_instance_not_a_class(self):
        """Test error when the name refers to something that's not a class."""
        global_dict = {"NotAClass": "this is a string, not a class"}

        with pytest.raises(ValueError, match="Invalid class name: NotAClass"):
            create_instance(global_dict, "NotAClass")

    def test_create_instance_not_a_class_with_logging(self):
        """Test that appropriate error is logged when name is not a class."""
        global_dict = {"NotAClass": 42}  # Integer instead of class

        with patch("app.utils.class_utils.logger") as mock_logger:
            with pytest.raises(ValueError):
                create_instance(global_dict, "NotAClass")

            mock_logger.error.assert_called_once_with(
                "Error: 'NotAClass' is not a class."
            )

    def test_create_instance_function_instead_of_class(self):
        """Test error when the name refers to a function instead of a class."""

        def test_function():
            return "I'm a function"

        global_dict = {"TestFunction": test_function}

        with pytest.raises(ValueError, match="Invalid class name: TestFunction"):
            create_instance(global_dict, "TestFunction")

    def test_create_instance_with_builtin_class(self):
        """Test creating an instance of a built-in class."""
        global_dict = {"list": list, "dict": dict, "str": str}

        # Test list
        instance = create_instance(global_dict, "list", [1, 2, 3])
        assert isinstance(instance, list)
        assert instance == [1, 2, 3]

        # Test dict
        instance = create_instance(global_dict, "dict", {"key": "value"})
        assert isinstance(instance, dict)
        assert instance == {"key": "value"}

        # Test str
        instance = create_instance(global_dict, "str", "hello")
        assert isinstance(instance, str)
        assert instance == "hello"

    def test_create_instance_with_inheritance(self):
        """Test creating an instance of a class that inherits from another."""

        class BaseClass:
            def __init__(self, base_value):
                self.base_value = base_value

        class DerivedClass(BaseClass):
            def __init__(self, base_value, derived_value):
                super().__init__(base_value)
                self.derived_value = derived_value

        global_dict = {"DerivedClass": DerivedClass}

        instance = create_instance(global_dict, "DerivedClass", "base", "derived")

        assert isinstance(instance, DerivedClass)
        assert isinstance(instance, BaseClass)  # Should also be instance of base class
        assert instance.base_value == "base"
        assert instance.derived_value == "derived"

    def test_create_instance_constructor_raises_exception(self):
        """Test when the class constructor raises an exception."""

        class ProblematicClass:
            def __init__(self):
                raise RuntimeError("Constructor failed")

        global_dict = {"ProblematicClass": ProblematicClass}

        with pytest.raises(RuntimeError, match="Constructor failed"):
            create_instance(global_dict, "ProblematicClass")

    def test_create_instance_with_complex_constructor(self):
        """Test creating an instance with a complex constructor."""

        class ComplexClass:
            def __init__(self, *args, **kwargs):
                self.args = args
                self.kwargs = kwargs
                self.processed = True

        global_dict = {"ComplexClass": ComplexClass}

        instance = create_instance(
            global_dict, "ComplexClass", 1, 2, 3, name="test", value=42
        )

        assert isinstance(instance, ComplexClass)
        assert instance.args == (1, 2, 3)
        assert instance.kwargs == {"name": "test", "value": 42}
        assert instance.processed is True

    def test_create_instance_with_none_in_global_dict(self):
        """Test when global_dict contains None value."""
        global_dict = {"NoneValue": None}

        with pytest.raises(ValueError, match="Invalid class name: NoneValue"):
            create_instance(global_dict, "NoneValue")

    def test_create_instance_empty_class_name(self):
        """Test with empty class name string."""

        class TestClass:
            pass

        global_dict = {"": TestClass, "TestClass": TestClass}

        # Empty string should work if it's a valid key
        instance = create_instance(global_dict, "")
        assert isinstance(instance, TestClass)

    def test_create_instance_with_dataclass(self):
        """Test creating an instance of a dataclass."""
        from dataclasses import dataclass

        @dataclass
        class DataClass:
            name: str
            value: int = 0

        global_dict = {"DataClass": DataClass}

        instance = create_instance(global_dict, "DataClass", "test", value=42)

        assert isinstance(instance, DataClass)
        assert instance.name == "test"
        assert instance.value == 42

    def test_create_instance_with_property_class(self):
        """Test creating an instance of a class with properties."""

        class PropertyClass:
            def __init__(self, value):
                self._value = value

            @property
            def value(self):
                return self._value

            @value.setter
            def value(self, new_value):
                self._value = new_value

        global_dict = {"PropertyClass": PropertyClass}

        instance = create_instance(global_dict, "PropertyClass", "initial")

        assert isinstance(instance, PropertyClass)
        assert instance.value == "initial"

        # Test that property works
        instance.value = "changed"
        assert instance.value == "changed"
