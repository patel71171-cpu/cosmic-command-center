FROM python:3.12-slim

WORKDIR /app

# No build toolchain is installed on purpose: every requirement ships a
# manylinux wheel for cp312 (psycopg2-binary and bcrypt included), so pip never
# compiles anything. Adding gcc + libpq-dev previously pulled ~90 apt packages
# and dominated image build time for no benefit.
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install Python dependencies first so this layer caches across source edits.
COPY requirements.txt .
RUN pip install --only-binary=:all: -r requirements.txt

# Copy application
COPY app/ ./app/
COPY seed.py ./seed.py

# Evidence blobs are written here; mount a volume over it in production.
RUN mkdir -p /app/evidence_storage

# Run unprivileged.
RUN useradd --create-home --uid 10001 sentinel \
    && chown -R sentinel:sentinel /app
USER sentinel

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status < 500 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
