// Shared local-development ports.
//
// Both vite.config.ts (the /api proxy) and the startup scripts read their
// backend port from here, so the number lives in exactly one place.
//
// 8010 is used rather than the more usual 8000 because 8000 is frequently
// already taken by IIS, Docker, or another dev server. If 8010 is also busy,
// change BACKEND_PORT below and nothing else needs editing.

/** @type {number} */
export const BACKEND_PORT = 8010;
