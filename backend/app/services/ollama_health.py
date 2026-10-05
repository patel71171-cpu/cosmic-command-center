"""Ollama readiness checks for the AI Copilot.

The copilot is optional: the platform is fully usable without it. These helpers
exist so a failure can be reported as a specific, actionable reason instead of
a generic timeout, which is what previously made the AI look merely "down".
"""
from __future__ import annotations

from typing import Any

import httpx

from ..core.config import settings

# How long a message may run before we give up on it. Generous, because a cold
# CPU-only model loading several gigabytes of weights can be slow.
CHAT_TIMEOUT_SECONDS = settings.OLLAMA_TIMEOUT_SECONDS


class OllamaUnavailable(RuntimeError):
    """Raised when the Ollama server cannot serve a request."""

    def __init__(self, message: str, *, reason: str, detail: str = ""):
        super().__init__(message)
        self.reason = reason
        self.detail = detail


async def _list_models(client: httpx.AsyncClient) -> set[str]:
    resp = await client.get(settings.ollama_url + "/api/tags")
    resp.raise_for_status()
    return {m.get("name", "") for m in resp.json().get("models", [])}


def _model_installed(models: set[str]) -> bool:
    """Whether the configured model is present, tolerating an implicit :latest."""
    wanted = settings.OLLAMA_MODEL
    if wanted in models:
        return True
    # Ollama reports "name:latest" for a model requested as plain "name".
    return any(m.split(":")[0] == wanted.split(":")[0] for m in models)


async def check_health() -> dict[str, Any]:
    """Report whether Ollama can serve requests. Never raises."""
    info: dict[str, Any] = {
        "server": settings.ollama_url,
        "model": settings.OLLAMA_MODEL,
        "reachable": False,
        "model_available": False,
        "models": [],
        "detail": "",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_PROBE_TIMEOUT_SECONDS) as client:
            models = await _list_models(client)
    except Exception as exc:  # noqa: BLE001
        info["detail"] = f"{exc.__class__.__name__}: {exc}"
        if "Ollama" not in info["detail"] and "connect" not in info["detail"].lower():
            info["detail"] = (
                f"Could not reach Ollama at {settings.ollama_url} "
                f"({exc.__class__.__name__})."
            )
        return info

    info["reachable"] = True
    info["models"] = sorted(models)
    info["model_available"] = _model_installed(models)

    if not info["model_available"]:
        info["detail"] = (
            f"Ollama is running but model '{settings.OLLAMA_MODEL}' is not pulled. "
            "Run: docker compose exec ollama ollama pull " + settings.OLLAMA_MODEL
        )
    return info


async def require_ready() -> dict[str, Any]:
    """Raise OllamaUnavailable with an actionable reason, or return the health."""
    info = await check_health()
    if not info["reachable"]:
        raise OllamaUnavailable(
            "The AI service is not reachable.",
            reason="unreachable",
            detail=(
                f"No Ollama server answered at {settings.ollama_url}. "
                "If you are running the Docker stack, start the 'ollama' service "
                "and pull the model. If you run the backend directly, set "
                "OLLAMA_HOST (or run Ollama locally)."
            ),
        )
    if not info["model_available"]:
        raise OllamaUnavailable(
            "The AI model is not installed on the server.",
            reason="model_missing",
            detail=info["detail"],
        )
    return info


async def chat(messages: list[dict], *, num_predict: int = 512) -> str:
    """Send a chat turn to Ollama and return the assistant's reply."""
    try:
        async with httpx.AsyncClient(timeout=CHAT_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                settings.ollama_url + "/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": num_predict},
                },
            )
            resp.raise_for_status()
            return (resp.json().get("message") or {}).get("content") or ""
    except OllamaUnavailable:
        raise
    except Exception as exc:  # noqa: BLE001
        raise OllamaUnavailable(
            "The AI service did not respond.",
            reason="unreachable",
            detail=f"{exc.__class__.__name__} while calling {settings.ollama_url}",
        ) from exc