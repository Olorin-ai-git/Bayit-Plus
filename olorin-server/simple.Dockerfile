FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY simple_requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy simple application
COPY simple_main.py main.py

# Create non-root user
RUN groupadd -r olorin && useradd -r -g olorin olorin
RUN chown -R olorin:olorin /app
USER olorin

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["python", "main.py"]