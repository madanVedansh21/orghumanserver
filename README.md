# OrgHumans Backend

Proxy server that owns the Composio API key so clients never see or input it.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `POST` | `/integrations/connect` | Get OAuth URL for an app |
| `GET` | `/integrations/status` | List connected apps for an entity |

### POST `/integrations/connect`
```json
// Request body
{ "entity_id": "7f9cb650-b5cc-406c-b1db-a94ea10c39e1", "app": "reddit" }

// Response
{ "url": "https://accounts.google.com/o/oauth2/..." }
```

### GET `/integrations/status`
```
GET /integrations/status?entity_id=7f9cb650-b5cc-406c-b1db-a94ea10c39e1
```
```json
{ "connected": ["reddit", "gmail"] }
```

---

## Deploy to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Point it at this repo and set the **root directory** to `backend/`
3. Add the environment variable:
   ```
   COMPOSIO_API_KEY=your_composio_project_api_key
   ```
4. Railway will auto-detect Python + Nixpacks, install `requirements.txt`, and start with the `Procfile`
5. Copy the generated URL (e.g. `https://orghumans-backend.up.railway.app`)

---

## Wire up the URL

In `apps/desktop/electron/orghumans-ipc.ts`, line 32:
```ts
const BACKEND_URL = 'https://orghumans-backend.up.railway.app'  // ← paste here
```

In `tools/mcp_tool.py`, around line 4470:
```python
_COMPOSIO_BACKEND_API_KEY = "your_composio_project_api_key"  # ← paste your key here
```

---

## Run locally for testing

```bash
cd backend
pip install -r requirements.txt
COMPOSIO_API_KEY=your_key uvicorn main:app --reload --port 8000
```

Test:
```bash
curl -X POST http://localhost:8000/integrations/connect \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "test-entity-123", "app": "reddit"}'
```
