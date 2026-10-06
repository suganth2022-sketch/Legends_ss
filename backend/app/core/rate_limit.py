"""Rate limiting (slowapi). Keyed by client IP.

Behind the Next.js server / a reverse proxy, run uvicorn with
`--proxy-headers --forwarded-allow-ips=<proxy ip>` so `request.client.host`
is the real client and not the proxy (otherwise everyone shares one bucket).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    enabled=settings.RATE_LIMIT_ENABLED,
)

LOGIN_LIMIT = "5/minute"
REGISTER_LIMIT = "5/minute"
LOOKUP_LIMIT = "20/minute"
