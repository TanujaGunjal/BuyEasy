FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app.py .

# Cloud Run injects PORT; default to 8080
ENV PORT=8080

EXPOSE 8080

# Note: ingest.py is NOT run inside the container image.
# Run it separately (locally or as a Cloud Run Job) whenever policy docs change.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
