# Olorin Service

This repository contains the Olorin service implementation.

## Overview

The Olorin service is a Python-based microservice that provides various functionalities for the Olorin platform.

## Development

### Prerequisites

- Python 3.8+
- Docker
- Make

### Setup

1. Clone the repository:
```bash
git clone git@github.olorin.com:ORG/REPOSITORY.git
cd REPOSITORY
```

2. Install dependencies:
```bash
make install
```

3. Run tests:
```bash
make test
```

### Running Locally

To run the service locally:

```bash
make run-local
```

The service will be available at `http://localhost:8000`.

## Deployment

The service is deployed using Jenkins pipelines. The deployment process includes:

1. Building the Docker image
2. Running tests
3. Pushing the image to the registry
4. Deploying to the target environment

### Environments

- QAL (Quality Assurance)
- E2E (End-to-End Testing)
- Production

## API Documentation

The API documentation is available in the `api/openapi` directory. You can view the OpenAPI specification by running:

```bash
make serve-docs
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
