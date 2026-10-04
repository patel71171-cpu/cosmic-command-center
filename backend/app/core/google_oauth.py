"""Google sign-in via the OIDC authorization-code flow with PKCE.

The backend is the OAuth confidential client. Google redirects the browser to
``/api/auth/google/callback``, we exchange that authorization code for tokens in
a server-to-server call, and read the profile from Google's userinfo endpoint.
Because those tokens come straight from Google to this process over TLS, the
userinfo response is trusted without local JWT signature verification.

The SPA never receives Google's credentials or tokens. Instead we mint a
short-lived, single-use exchange code that the frontend swaps for an ordinary
SENTINEL JWT, which keeps token handling identical to password sign-in.

Flow
----
1. ``GET /api/auth/google/start``    -> 302 to Google's consent screen
2. ``GET /api/auth/google/callback`` -> verify, upsert user, 302 to frontend
3. ``POST /api/auth/google/exchange``-> exchange one-time code for a SENTINEL JWT
"""
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx

from .config import settings
from .security import create_access_token, decode_token

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

# Google's scopes: identify the user and read their basic profile.
SCOPES = "openid email profile"

# Short enough that a leaked code is useless, long enough for a slow redirect.
STATE_TTL = timedelta(minutes=10)
EXCHANGE_TTL = timedelta(minutes=2)

# Guards replay of a one-time exchange code. In-process only: with multiple
# uvicorn workers a code could be redeemed once per worker, which is acceptable
# for a token that is already scoped to a single freshly authenticated user.
_redeemed: set[str] = set()


class GoogleOAuthError(RuntimeError):
    """Raised when the Google handshake cannot be completed."""


def is_configured() -> bool:
    return settings.google_oauth_configured


def _pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = secrets.token_urlsafe(64)[:128]
    # S256: BASE64URL(SHA256(verifier)) with padding stripped.
    import base64
    import hashlib

    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


def build_start_url() -> str:
    """Build Google's consent URL, carrying signed state that holds the PKCE verifier."""
    if not is_configured():
        raise GoogleOAuthError(
            "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET in backend/.env."
        )

    verifier, challenge = _pkce_pair()
    # Signed rather than stored: survives restarts and works across workers,
    # and cannot be forged without JWT_SECRET.
    state = create_access_token(
        {"typ": "oauth_state", "verifier": verifier, "nonce": secrets.token_urlsafe(16)},
        expires_delta=STATE_TTL,
    )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
        "access_type": "online",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def _verify_state(state: str) -> str:
    payload = decode_token(state or "")
    if not payload or payload.get("typ") != "oauth_state" or not payload.get("verifier"):
        raise GoogleOAuthError("Sign-in state is invalid or expired. Please try again.")
    return payload["verifier"]


async def exchange_code_for_profile(code: str, state: str) -> dict:
    """Verify the state, swap the code for tokens, and return the userinfo profile."""
    verifier = _verify_state(state)

    if not code:
        raise GoogleOAuthError("Google did not return an authorization code.")

    # 1. Server-to-server token exchange, proving this is the same client that
    #    started the flow and binding the code to our PKCE verifier.
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                    "code_verifier": verifier,
                },
                headers={"Accept": "application/json"},
            )
    except httpx.HTTPError as exc:
        raise GoogleOAuthError(f"Could not reach Google to complete sign-in: {exc}") from exc

    if token_resp.status_code != 200:
        # Google's error body can echo the code, so keep only the error key.
        try:
            err = token_resp.json().get("error", "invalid_request")
        except ValueError:
            err = "invalid_request"
        raise GoogleOAuthError(f"Google rejected the sign-in request ({err}).")

    access_token = token_resp.json().get("access_token")
    if not access_token:
        raise GoogleOAuthError("Google did not return an access token.")

    # 2. Read the profile from Google. This response is trusted as-is because we
    #    just received the token from Google over TLS.
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            info_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
    except httpx.HTTPError as exc:
        raise GoogleOAuthError(f"Could not read your Google profile: {exc}") from exc

    if info_resp.status_code != 200:
        raise GoogleOAuthError("Google would not release your profile information.")

    profile = info_resp.json()
    email = (profile.get("email") or "").strip().lower()
    if not email:
        raise GoogleOAuthError("Your Google account did not provide an email address.")

    # Google only returns email_verified=false for untrusted addresses. Refusing
    # them stops an attacker from claiming someone else's address.
    if profile.get("email_verified") is False:
        raise GoogleOAuthError("Your Google email address is not verified.")

    return {
        "google_sub": profile.get("sub"),
        "email": email,
        "full_name": (profile.get("name") or "").strip() or email.split("@")[0],
        "picture": profile.get("picture"),
    }


def issue_exchange_code(user_id: str, email: str, roles: str) -> str:
    """Mint the single-use code handed to the browser in the redirect."""
    return create_access_token(
        {
            "typ": "oauth_exchange",
            "sub": user_id,
            "email": email,
            "roles": roles,
            "jti": secrets.token_urlsafe(16),
        },
        expires_delta=EXCHANGE_TTL,
    )


def redeem_exchange_code(code: str) -> dict:
    """Validate a one-time code exactly once and return its claims."""
    payload = decode_token(code or "")
    if not payload or payload.get("typ") != "oauth_exchange":
        raise GoogleOAuthError("This sign-in link has expired. Please try again.")

    jti = payload.get("jti") or ""
    if not jti or jti in _redeemed:
        raise GoogleOAuthError("This sign-in link has already been used.")

    _redeemed.add(jti)
    # Keep the replay guard from growing without bound on a long-lived process.
    if len(_redeemed) > 5000:
        # Oldest-inserted entries are the least likely to be replayed.
        for stale in list(_redeemed)[:1000]:
            _redeemed.discard(stale)

    exp = payload.get("exp")
    if not exp or datetime.utcfromtimestamp(exp) < datetime.utcnow():
        raise GoogleOAuthError("This sign-in link has expired. Please try again.")

    return payload