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

## Deployment (Docker)

The whole stack runs with one command. You need Docker Desktop running.

```sh
docker compose up --build
```

That starts:

| Service | URL | Notes |
|---|---|---|
| Frontend | <http://localhost:3002> | TanStack Start SSR, served by `server.mjs` |
| Backend API | <http://localhost:8010> | FastAPI |
| API docs | <http://localhost:8010/docs> | interactive OpenAPI |
| Postgres | `localhost:5432` | container-internal network too |
| Redis | `localhost:6379` | Celery broker |
| Ollama | `127.0.0.1:11435` | AI Copilot; internal address is `ollama:11434` |

Sign in with `admin@sentinel.local` / `admin123`. The database starts empty, so
seed it once after the stack is up:

```sh
docker compose exec backend python seed.py
```

### AI Copilot

Ollama is part of the stack, so the copilot works for anyone running it —
nobody needs Ollama installed on their own machine, and the browser never
contacts Ollama directly. Requests go client → backend → Ollama.

The `ollama-init` service pulls the configured model on first start
(`qwen2.5vl:3b` by default, roughly 3 GB). That download happens once and is
kept in the `ollama_data` volume. Until it finishes the copilot shows an
"AI service unavailable" notice rather than a blank failure.

To use a different model:

```sh
# .env next to docker-compose.yml
OLLAMA_MODEL=llama3.1:8b
```

```sh
docker compose up -d ollama-init   # pulls the new model
```

Check what the backend sees:

```sh
docker compose exec backend python -c \
  "import asyncio; from app.services.ollama_health import check_health; print(asyncio.run(check_health()))"
```

or from the app: `GET /api/copilot/health`.

The host port is `11435` by default because a host-installed Ollama usually
holds `11434`. Nothing depends on that mapping — it is only for talking to the
containerised Ollama from the host. Override with `OLLAMA_PUBLISH_PORT`.

For GPU acceleration, uncomment the `deploy.resources` block on the `ollama`
service. CPU-only works but is slower.

### Pointing at an external Ollama instead

Set `OLLAMA_HOST` to any reachable server (a host:port value is accepted and
gets `http://` prepended):

```sh
OLLAMA_HOST=http://192.168.1.50:11434
OLLAMA_MODEL=qwen2.5vl:3b
```

The model must already be pulled on that server.

### Set a JWT secret first

The backend generates and persists its own signing key when none is supplied,
which is fine for a single container. For anything shared, set one explicitly:

```sh
# .env next to docker-compose.yml
JWT_SECRET=<output of: openssl rand -hex 32>
```

### Building the frontend image alone

```sh
docker build -t sentinel-frontend .
docker run -p 3002:3000 sentinel-frontend
```

The image is multi-stage: the dev toolchain is not in the final layer. It
serves a `/healthz` endpoint for orchestrator health checks.

### How the frontend is served

`vite build` emits a web-standard handler (`dist/server/server.js`) that
exports `{ fetch }` and does not listen on a socket by itself. `server.mjs` is
a small Node adapter that wraps it in a real HTTP server and serves the hashed
static assets from `dist/client`.

Run it directly without Docker:

```sh
npm run build
npm start          # http://localhost:3000
```