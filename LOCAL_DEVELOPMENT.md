# Local development

The first working scaffold has two processes:

## Backend

```powershell
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
```

Run tests with `py -m pytest` from `backend`.

## Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The UI calls http://localhost:8000 by default. Set `NEXT_PUBLIC_API_URL` when the API is hosted elsewhere; do not create or commit an `.env` file containing secrets.

## Vercel deployment

Import the repository root as one Vercel project, with the project root set to the repository root. The Vercel Services beta must be available to the account. The root `vercel.json` configures the `frontend/` Next.js service and `backend/` FastAPI service in that deployment. Public rewrites send `/api/...` and `/health` to FastAPI and all other paths to Next.js. The service rewrite preserves the request path, so the existing API routes are unchanged.

In the Vercel project, configure `NEXT_PUBLIC_API_URL` under **Settings → Environment Variables** for the frontend deployment. Set it to the public origin serving that deployment so the browser's API requests stay same-origin and use the `/api/...` rewrite. Apply the appropriate origin to Production and Preview deployments, then redeploy. If unset, the frontend keeps its existing `http://localhost:8000` default. No service binding is used because the current API calls run in the browser; Vercel bindings are for server-side service-to-service calls.

The current demo uses an in-memory capture store and deterministic mock vision profiles. To use the optional server-side provider, copy the variable names from `.env.example` into your process environment, set `VISION_PROVIDER=openai`, and provide the key outside the repository. The frontend never receives the key. `backend/schema.sql` is the PostgreSQL-compatible persistence starting point, including organization-scoped RLS. The synthetic CSV in `data/` is not used as Amazon ground truth.

The capture page supports JPG/JPEG, PNG, and WEBP upload, multiple photos, rear-camera capture on supported mobile browsers, camera barcode capture when `BarcodeDetector` is available, and manual barcode fallback. Capturing or scanning never starts analysis automatically; press `Analyze unit` after collecting the views. Mock profiles exercise PASS, FAIL, UNCERTAIN, and fail-open pending behavior without an external API.
