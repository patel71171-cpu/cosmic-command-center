# SENTINEL Backend

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload

# Seed the database
python seed.py

# Run tests
pytest tests/
```

### Docker

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Seed database
docker-compose exec backend python seed.py
```

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login and get JWT token
- `POST /api/auth/register` — Register new user
- `GET /api/auth/me` — Get current user info

### Targets
- `GET /api/targets` — List all targets
- `POST /api/targets` — Create new target
- `GET /api/targets/{id}` — Get target details
- `PATCH /api/targets/{id}` — Update target
- `DELETE /api/targets/{id}` — Delete target

### Assessments
- `GET /api/assessments` — List all assessments
- `POST /api/assessments` — Create new assessment
- `POST /api/assessments/{id}/run` — Run assessment scan
- `GET /api/assessments/{id}` — Get assessment details
- `GET /api/assessments/{id}/status` — Get assessment status

### Findings
- `GET /api/findings` — List findings (filter by assessment_id, severity, status)
- `GET /api/findings/{id}` — Get finding details
- `PATCH /api/findings/{id}` — Update finding
- `GET /api/findings/{id}/evidence` — Get finding evidence

### Evidence
- `GET /api/evidence/{id}` — Get evidence details
- `GET /api/evidence/chain/verify` — Verify evidence chain integrity
- `GET /api/evidence/chain/{assessment_id}` — Get assessment evidence chain

### Remediation
- `GET /api/remediation` — List remediation actions
- `POST /api/remediation` — Create remediation action
- `PATCH /api/remediation/{id}` — Update remediation status
- `POST /api/remediation/{id}/retest` — Trigger re-test
- `GET /api/remediation/retests/{id}` — Get re-test status

### Reports
- `GET /api/reports/{assessment_id}` — Generate HTML report
- `GET /api/reports/{assessment_id}/pdf` — Generate PDF report

### Stats
- `GET /api/stats/dashboard` — Dashboard statistics
- `GET /api/stats/risk-trend` — Risk trend over time

## Architecture

```
backend/
├── app/
│   ├── main.py           # FastAPI application entry
│   ├── core/             # Core utilities
│   │   ├── config.py     # Settings
│   │   ├── database.py   # DB connection
│   │   ├── security.py   # JWT, RBAC, hashing
│   │   └── audit.py      # Audit logging
│   ├── models/           # SQLAlchemy models
│   ├── routers/          # API route handlers
│   └── services/         # Business logic
│       ├── scanner.py    # Security scanner
│       ├── pipeline.py   # Assessment pipeline
│       ├── cvss.py       # CVSS v4.0 calculator
│       └── retest.py     # Re-test engine
├── tests/                # Test suite
├── seed.py               # Database seeder
├── requirements.txt      # Python dependencies
└── Dockerfile            # Container build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sentinel:sentinel@localhost:5432/sentinel` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `JWT_SECRET` | *(generated → `backend/.jwt_secret`)* | JWT signing key — set explicitly in production (`openssl rand -hex 32`) |
| `CORS_ORIGINS` | `http://localhost:3002,http://localhost:3000` | Comma-separated allowed browser origins |
| `DEBUG` | `false` | Debug mode |
| `EVIDENCE_STORAGE_PATH` | `./evidence_storage` | Evidence file storage |
