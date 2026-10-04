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

You need Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The UI runs on <http://localhost:3002> and proxies `/api` to the backend on
<http://localhost:8000>.

### Backend

```sh
cd backend
pip install -r requirements.txt
python seed.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Seeded credentials: `admin@sentinel.local` / `admin123`.

Copy `backend/.env.example` to `backend/.env` to configure the database, JWT
secret, and the local model used by the AI copilot.

## Tests

```sh
cd backend
python -m pytest tests/ -q
```