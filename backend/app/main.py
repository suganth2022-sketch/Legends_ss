"""FastAPI entry point — wires CORS, rate limiting, error shapes and mounts the
versioned routes under /api/v1.

Run locally:  uvicorn app.main:app --reload --port 3000
Production:   uvicorn app.main:app --host 0.0.0.0 --port 3000 \
                  --proxy-headers --forwarded-allow-ips=<frontend/proxy ip>
Keep this API on a private network: only the Next.js server should reach it.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.rate_limit import limiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    # Interactive docs list every route and schema — development only.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"  # responses hold personal/financial data
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# The frontend reads `message` (string or list) from error bodies — keep that
# contract rather than FastAPI's default `detail`.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"statusCode": exc.status_code, "message": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path"))
        messages.append(f"{field}: {err['msg']}" if field else err["msg"])
    return JSONResponse(status_code=400, content={"statusCode": 400, "message": messages})


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"statusCode": 429, "message": "Too many requests — please wait a minute and try again."},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"message": f"{settings.PROJECT_NAME} is running"}
