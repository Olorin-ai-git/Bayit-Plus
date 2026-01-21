# Olorin Core

Core protocols and services for Olorin.ai platform content processing.

## Features

- **IndexableContent Protocol**: Minimal interface for content that can be indexed
- **SearchableContent Protocol**: Extended interface with search-specific metadata
- **Loose Coupling**: Enables Olorin services to work with any content storage system

## Installation

```bash
poetry add olorin-core
```

## Usage

```python
from olorin import IndexableContent

# Any class implementing IndexableContent can be used with Olorin services
class MyContent:
    @property
    def id(self) -> str:
        return self._id

    @property
    def title(self) -> str:
        return self._title

    # ... implement other protocol properties

# Works with Olorin indexing, search, and recap services
```

## Protocol Design

The protocol-based design allows Olorin services to work with content from any source:
- Bayit+ streaming platform Content model
- External content APIs
- Mock content for testing
- Any custom content implementation

No direct dependency on specific ORM models or database schemas.

## License

Proprietary - Bayit+ Team
