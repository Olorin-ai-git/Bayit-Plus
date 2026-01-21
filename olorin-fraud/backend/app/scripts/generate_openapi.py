import json
import os
import pathlib

from ..service import SvcSettings, create_app

OPENAPI_PATH = os.path.join(
    # find the top level directory of the repo
    pathlib.Path(__file__).parent.parent.parent.resolve(),
    "api/openapi/openapi.json",
)

if __name__ == "__main__":
    # metrics are an internal service detail, not part of public API
    app = create_app(SvcSettings(expose_metrics=False))

    # Ensure the directory exists
    os.makedirs(os.path.dirname(OPENAPI_PATH), exist_ok=True)

    # Create the file if it does not exist
    pathlib.Path(OPENAPI_PATH).touch(exist_ok=True)

    with open(OPENAPI_PATH, "w") as f:
        json.dump(app.openapi(), f, indent=2)
