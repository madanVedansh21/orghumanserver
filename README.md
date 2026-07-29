# OrgHumans Backend

Next.js API server that proxies Composio — the API key lives here, clients never see it.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/integrations/connect` | Get OAuth URL for an app |
| `GET` | `/api/integrations/status` | List connected apps for a user |

### POST `/api/integrations/connect`
```json
// Request body
{ "entity_id": "7f9cb650-b5cc-406c-b1db-a94ea10c39e1", "app": "reddit" }

// Response
{ "url": "https://www.reddit.com/api/v1/authorize?..." }
```

### GET `/api/integrations/status`
```
GET /api/integrations/status?entity_id=7f9cb650-b5cc-406c-b1db-a94ea10c39e1
```
```json
{ "connected": ["reddit", "gmail"] }
```

---

## Deploy to Vercel (recommended for Next.js)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
3. Set **Root Directory** to `backend`
4. Add environment variable:
   ```
   COMPOSIO_API_KEY = your_composio_api_key_from_app_composio_dev
   ```
5. Deploy → copy the URL (e.g. `https://orghumans-backend.vercel.app`)

---

## Wire up the URL in the Electron app

In `apps/desktop/electron/orghumans-ipc.ts` line 32:
```ts
const BACKEND_URL = 'https://orghumans-backend.vercel.app'
```

In `tools/mcp_tool.py` around line 4470:
```python
_COMPOSIO_BACKEND_API_KEY = "your_composio_api_key"
```

---

## Run locally for testing

```bash
cd backend
cp .env.example .env.local
# Edit .env.local and add your COMPOSIO_API_KEY
npm run dev
# Server runs at http://localhost:3000
```

Test:
```bash
# Health check
curl http://localhost:3000/api/health

# Initiate connection
curl -X POST http://localhost:3000/api/integrations/connect \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "test-user-123", "app": "reddit"}'

# Check status
curl "http://localhost:3000/api/integrations/status?entity_id=test-user-123"
```
