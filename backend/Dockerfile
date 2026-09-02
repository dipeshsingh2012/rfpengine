# Use an official lightweight Python image.
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies into a local folder to copy later
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final Stage
FROM python:3.11-slim

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Cloud Run expects the app to listen on the $PORT environment variable.
# We use uvicorn directly in the CMD to ensure it picks up the env var.
# The default is 8080 if PORT is not set, but Cloud Run will always set it.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
