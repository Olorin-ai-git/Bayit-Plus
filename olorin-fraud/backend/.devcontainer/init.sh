#!/bin/sh

# Default image comes with Python 3.11 as default.
# To install a different version
# asdf install python 3.10.0 (or latest:3.10 to get the latest 3.10.x)

# To make another Python version as default
# asdf global python 3.10.0(or latest:3.10 to get the latest 3.10.x)

# Check if pyproject.toml exists before running poetry install
if [ -f pyproject.toml ]; then
    poetry install --no-interaction
    rm -rf ~/.cache/pypoetry/cache
    rm -rf ~/.cache/pypoetry/artifacts
fi
