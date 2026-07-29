"""
OrgHumans Composio Proxy Backend
=================================
Owns the Composio API key server-side.
Clients identify themselves with a stable entity_id (UUID stored in profile.json).

Endpoints
---------
POST /integrations/connect  → returns a Composio OAuth redirect URL
GET  /integrations/status   → returns list of connected app names for an entity
GET  /health                → liveness probe
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from composio import Composio

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Composio client ────────────────────────────────────────────────────────
COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY", "")
if not COMPOSIO_API_KEY:
    raise RuntimeError("COMPOSIO_API_KEY environment variable is required")

composio = Composio(api_key=COMPOSIO_API_KEY)

# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(title="OrgHumans Backend", version="1.0.0")

# Allow requests from the Electron renderer (file:// and localhost origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    entity_id: str
    app: str  # e.g. "reddit", "gmail", "github"


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/integrations/connect")
def connect(req: ConnectRequest):
    """
    Initiate an OAuth flow for a given app + entity.

    The Composio API returns a redirectUrl the client opens in the browser.
    The client never sees the Composio API key.
    """
    app_name = req.app.upper()
    entity_id = req.entity_id.strip()

    if not entity_id:
        raise HTTPException(status_code=400, detail="entity_id is required")
    if not app_name:
        raise HTTPException(status_code=400, detail="app is required")

    logger.info("connect: entity_id=%s app=%s", entity_id, app_name)

    try:
        entity = composio.get_entity(id=entity_id)
        connection_request = entity.initiate_connection(app_name=app_name)
        redirect_url = (
            getattr(connection_request, "redirectUrl", None)
            or getattr(connection_request, "redirect_url", None)
        )
        if not redirect_url:
            logger.error("No redirectUrl in Composio response: %s", connection_request)
            raise HTTPException(
                status_code=502,
                detail="Composio did not return a redirect URL"
            )
        logger.info("connect: redirectUrl=%s", redirect_url)
        return {"url": redirect_url}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("connect error for entity_id=%s app=%s", entity_id, app_name)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/integrations/status")
def status(entity_id: str = Query(..., description="Client entity UUID")):
    """
    Return the list of apps currently connected for this entity.

    The UI uses this to keep tile dots accurate without polling Composio
    from the client side.
    """
    entity_id = entity_id.strip()
    if not entity_id:
        raise HTTPException(status_code=400, detail="entity_id is required")

    logger.info("status: entity_id=%s", entity_id)

    try:
        entity = composio.get_entity(id=entity_id)
        connections = entity.get_connections()
        connected = [
            conn.appName.lower()
            for conn in connections
            if getattr(conn, "status", "") == "ACTIVE"
        ]
        logger.info("status: entity_id=%s connected=%s", entity_id, connected)
        return {"connected": connected}
    except Exception as exc:
        logger.exception("status error for entity_id=%s", entity_id)
        # Return empty list rather than 500 — UI falls back gracefully
        return {"connected": [], "error": str(exc)}
