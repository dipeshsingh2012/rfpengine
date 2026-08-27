# RFPEngine

RFPEngine is a seller-side RFP response assistant. It retrieves approved answers from a tenant knowledge base, drafts a response with OpenAI, and lets a seller review and insert the answer into an online questionnaire through a browser extension.

## Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer and npm
- Docker, for local OpenSearch
- An OpenAI API key for live answer generation
- Chrome or Edge, for the browser-extension POC

## 1. Clone and configure

From the repository root:

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. The application reads environment variables from the shell, so load the file before starting the API:

```bash
set -a
. ./.env
set +a
```

The frontend can run in demo mode without an API key, but live retrieval requires both the OpenAI key and OpenSearch.

## 2. Start OpenSearch

The following command starts a local single-node development instance with the security plugin disabled:

```bash
docker run -d --name rfpengine-opensearch \
	-p 9200:9200 \
	-e discovery.type=single-node \
	-e DISABLE_SECURITY_PLUGIN=true \
	opensearchproject/opensearch:2.17.1
```

Wait for OpenSearch to respond, then create the RFPEngine index:

```bash
curl http://localhost:9200
cd backend
python3 scripts/init_opensearch_index.py
cd ..
```

The index is named `rfq_knowledge_base` and contains `tenant_id`, question and answer text, plus 1536-dimensional question vectors.

## 3. Start the FastAPI backend

Create and activate a virtual environment:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

In another terminal, check that it is running:

```bash
curl http://localhost:8000/health
```

The search endpoint is `POST http://localhost:8000/api/v1/search`:

```bash
curl -X POST http://localhost:8000/api/v1/search \
	-H 'Content-Type: application/json' \
	-d '{"tenant_id":"acme-corp","question":"Describe your data retention policy.","top_k":5}'
```

## 4. Start the frontend

In a new terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). The frontend proxies `/api` requests to the backend on port 8000. It displays demo content when the API is unavailable.

The main workspace also accepts a form source before answer generation:

- Paste a hosted form URL and choose **Load URL**. The page must allow browser access with CORS enabled; otherwise use the browser extension for a live third-party form.
- Upload an HTML, JSON, or CSV questionnaire. The app extracts the detected questions and lets you select them for generation.

## 5. Test the browser-extension POC

The extension scans an existing seller questionnaire, generates answers, and inserts only answers that the seller explicitly approves. It does not submit the form.

1. Keep the frontend running and open [http://localhost:5173/mock-questionnaire.html](http://localhost:5173/mock-questionnaire.html).
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository's `extension/` directory.
6. Return to the mock questionnaire and click the RFPEngine extension icon.
7. Click **Scan page** in the side panel.
8. Click **Generate all answers**, review the drafts, and click **Insert answer** for each approved response.

More extension-specific notes are in [extension/README.md](extension/README.md).

## Project layout

```text
backend/
	app/main.py                         FastAPI application and search endpoint
	scripts/init_opensearch_index.py   OpenSearch index creation
	requirements.txt                    Python dependencies
frontend/
	src/                                React seller workspace
	public/mock-questionnaire.html     Local buyer-form fixture
extension/
	content.js                          Page scanning and answer insertion
	sidepanel.html/js/css               Seller review panel
```

## Useful development commands

```bash
# Backend syntax check
python3 -m compileall -q backend

# Frontend typecheck and production build
cd frontend && npm run build

# Stop the local OpenSearch container
docker stop rfpengine-opensearch
```

The current POC expects knowledge records to already exist in OpenSearch. Document upload, question extraction from uploaded files, authentication, persistence of approved answers, and export workflows are planned next layers.

## Deploying the frontend to Vercel

The recommended production layout is:

```text
your-domain.com       React frontend on Vercel
api.your-domain.com   FastAPI backend on a Python host
OpenSearch             Managed OpenSearch service
```

Vercel hosts the frontend. Deploy the `frontend/` directory as the Vercel project root:

1. Push this project to a Git provider and import it into Vercel.
2. Set the Vercel **Root Directory** to `frontend`.
3. Keep the detected framework as Vite, or use build command `npm run build` and output directory `dist`.
4. Add the environment variable `VITE_API_URL` with the public API URL, for example `https://api.your-domain.com/api`.
5. Deploy and open the generated Vercel URL to verify the seller workspace.

Add the purchased domain in Vercel under **Project Settings > Domains**. Vercel will show the DNS record required by your registrar. Usually the apex domain uses an `A` record and `www` uses a `CNAME`; use the exact values Vercel provides.

Deploy the FastAPI application separately with a Python host such as Render, Railway, Fly.io, or a container platform. Its start command is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set these backend production variables on that host:

```text
OPENAI_API_KEY=...
OPENSEARCH_URL=https://your-managed-opensearch-endpoint
OPENSEARCH_USERNAME=...
OPENSEARCH_PASSWORD=...
OPENSEARCH_USE_SSL=true
OPENSEARCH_VERIFY_CERTS=true
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

Create `api.your-domain.com` in the backend host's custom-domain settings and add the DNS record it provides. Do not put `OPENAI_API_KEY` or OpenSearch credentials in Vercel frontend variables; variables beginning with `VITE_` are shipped to the browser.
