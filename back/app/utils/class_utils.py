import logging

logger = logging.getLogger(__name__)


def create_instance(global_dict, class_name_str, *args, **kwargs):
    """
    Creates an instance of a class using its name as a string.

    Args:
        class_name_str: The name of the class as a string.
        *args: Positional arguments to pass to the class constructor.
        **kwargs: Keyword arguments to pass to the class constructor.

    Returns:
        An instance of the class, or None if the class name is invalid.
    """
    try:
        cls = global_dict[class_name_str]
        if isinstance(cls, type):
            return cls(*args, **kwargs)
        else:
            logger.error(f"Error: '{class_name_str}' is not a class.")
            raise ValueError(f"Invalid class name: {class_name_str}")
    except KeyError as e:
        logger.error(f"Error: Class '{class_name_str}' not found.")
        raise e
