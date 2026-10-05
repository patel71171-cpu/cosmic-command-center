# Cosmic Command Center

SENTINEL is an evidence-driven security assessment platform: run authorised scans
against a target, collect findings backed by hashed evidence, remediate, and
verify the fix.

- The command-center overview is isolated in `sentinel-overview.tsx` while detailed
  workflows retain their file routes; this keeps the one-page view focused and
  detail actions navigable.
- The workspace shows only records returned by the API. There is no bundled
  sample dataset — every row on screen comes from an actual assessment run.

## Development

You need Node.js and Python 3.

### Quick start (Windows)

```
start-all.bat      # starts backend + frontend, waits until both answer
stop-all.bat       # stops whatever is holding ports 8010 and 3002
```

`start-all.bat` is safe to re-run: anything already listening is reused rather
than started twice. It polls each service until it responds, so you can tell
the difference between "still compiling" and "actually failed". Vite can take
1-2 minutes on a cold start.

To run a single service, use `start-backend.bat` or `start-frontend.bat`.

#### Changing the backend port

The backend port is defined once, as `BACKEND_PORT` in `dev-ports.mjs`. Both
`vite.config.ts` (the `/api` proxy) and the startup scripts read it from there,
so changing that one value is enough — nothing else needs editing.

It defaults to **8010** rather than the more usual 8000 because 8000 is often
already taken by IIS, Docker, or another dev server.

### Manual setup

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The UI runs on <http://localhost:3002> and proxies `/api` to the backend on
<http://localhost:8010>.

### Backend

```sh
cd backend
pip install -r requirements.txt
python seed.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Seeded credentials: `admin@sentinel.local` / `admin123`.

The backend falls back to SQLite (`backend/sentinel.db`) when Postgres is
unreachable, so no `.env` is required for local development. Copy
`backend/.env.example` to `backend/.env` to configure Postgres, a JWT secret,
or the local model used by the AI copilot.

### Authentication

Sign-in is email and password only. Google sign-in was removed, so the login
page presents a single form with no third-party identity provider.

## Tests

```sh
cd backend
python -m pytest tests/ -q
```