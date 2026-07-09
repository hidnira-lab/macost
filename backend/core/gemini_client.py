import os

from google import genai

_gemini_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    """
    Cached at module level — mirrors backend/dependencies/auth.py's
    `_get_jwks_client()` lazy-singleton shape.

    `AI_VISION_API_KEY` is read from the environment lazily on first call
    (not at import time), so tests that never call this function don't
    require the env var to be set. Exactly one `genai.Client(...)` is ever
    constructed for the process lifetime — never build a new client per call.
    """
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ["AI_VISION_API_KEY"]
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client
