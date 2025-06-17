# GAIA - Fraud Investigation System

GAIA is an advanced fraud investigation system that provides comprehensive risk assessment across multiple domains including network analysis, device fingerprinting, location analysis, and behavioral monitoring.

## 🚀 Quick Start

For detailed documentation, please see the [`/docs`](./docs) folder:

- **[API Documentation](./docs/GAIA_API_Documentation.md)** - Complete API reference with examples
- **[WebSocket API Guide](./docs/websocket_example_responses.md)** - Real-time investigation monitoring
- **[Autonomous Investigation Guide](./docs/README_autonomous_investigation.md)** - Testing autonomous investigations
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - Development guidelines

## 📚 Documentation

All documentation has been organized in the [`/docs`](./docs) folder:

### Core Documentation
- [`GAIA_API_Documentation.md`](./docs/GAIA_API_Documentation.md) - Complete API reference
- [`README.md`](./docs/README.md) - Detailed project overview
- [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md) - Development and contribution guidelines

### WebSocket & Autonomous Investigation
- [`websocket_example_responses.md`](./docs/websocket_example_responses.md) - WebSocket API examples
- [`README_autonomous_investigation.md`](./docs/README_autonomous_investigation.md) - Autonomous investigation testing

### Analysis & Reports
- Domain-specific analysis reports (Network, Device, Location, Logs)
- Risk assessment documentation
- Performance optimization summaries
- LLM integration analysis

## 🔧 Installation & Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python -m app.main
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run autonomous investigation tests
python tests/run_autonomous_investigation_for_user.py
python tests/run_autonomous_investigation_for_device.py
```

## 📊 Features

- **Multi-Domain Risk Assessment**: Network, Device, Location, and Behavioral analysis
- **Autonomous Investigation**: AI-powered investigation workflows with real-time monitoring
- **WebSocket API**: Real-time progress updates with complete API response data
- **Parallel/Sequential Execution**: Configurable investigation execution modes
- **Comprehensive Reporting**: PDF generation and detailed risk assessments

## 🔗 Quick Links

- [API Documentation](./docs/GAIA_API_Documentation.md)
- [WebSocket Guide](./docs/websocket_example_responses.md)
- [Testing Scripts](./docs/README_autonomous_investigation.md)
- [Contributing](./docs/CONTRIBUTING.md)

For more detailed information, explore the [`/docs`](./docs) directory. 