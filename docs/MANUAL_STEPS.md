# ShopAgent — Manual Steps for Cloud Run Deployment

> 💻 **On Windows / PowerShell?** Use **[docs/DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)** instead.
> It has the same steps rewritten with PowerShell-native syntax ($env:, backtick continuation,
> Set-Content for secrets, curl.exe) and a priority-tiered checklist with exact expected output.
> This file (MANUAL_STEPS.md) is the narrative reference with full context for each decision.

> **Execute these steps in order.** Steps marked 🔒 involve secrets — never
> paste real values into chat, CI logs, or code. Replace every `<PLACEHOLDER>`
> before running.

---

## Prerequisites

```bash
# Install / update gcloud CLI
gcloud version   # must be >= 450.0.0

# Login (one-time)
gcloud auth login

# Set your project
export PROJECT_ID=<YOUR_GCP_PROJECT_ID>   # ← fill this in
gcloud config set project $PROJECT_ID
```

---

## Step 1 — Enable required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com
```

---

## Step 2 — Create Secret Manager secrets 🔒

> Never put real secret values in code or commits. Run the commands below in
> your terminal; replace `<VALUE>` each time.

```bash
# MongoDB Atlas connection string
echo -n "mongodb+srv://USER:PASS@cluster.mongodb.net/buyeasy" \
  | gcloud secrets create MONGO_URI --data-file=-

# JWT signing secret (generate: openssl rand -hex 32)
echo -n "<your-jwt-secret>" \
  | gcloud secrets create JWT_SECRET --data-file=-

# Stripe secret key (test mode)
echo -n "sk_test_<your-key>" \
  | gcloud secrets create STRIPE_SECRET_KEY --data-file=-

# Gemini API key
echo -n "<your-gemini-api-key>" \
  | gcloud secrets create GEMINI_API_KEY --data-file=-

# Nodemailer credentials
echo -n "<smtp-user>" \
  | gcloud secrets create EMAIL_USER --data-file=-

echo -n "<smtp-password>" \
  | gcloud secrets create EMAIL_PASS --data-file=-

# RAG shared secret (generate: openssl rand -hex 32)
echo -n "<your-rag-shared-secret>" \
  | gcloud secrets create RAG_SHARED_SECRET --data-file=-
```

---

## Step 3 — Grant the Cloud Run service account access to secrets

```bash
# Identify the default compute service account
export SA="$(gcloud projects describe $PROJECT_ID \
  --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

# Grant Secret Manager Secret Accessor role for each secret
for SECRET in MONGO_URI JWT_SECRET STRIPE_SECRET_KEY GEMINI_API_KEY \
              EMAIL_USER EMAIL_PASS RAG_SHARED_SECRET; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Step 4 — First deploy: shopagent-api (Express backend)

> This first deploy must be run manually. Subsequent deploys are handled by
> the GitHub Actions CI/CD pipeline.

```bash
gcloud run deploy shopagent-api \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,JWT_EXPIRE=30d,GEMINI_MODEL=gemini-2.5-flash,FRONTEND_URL=https://frontend-nine-zeta-53.vercel.app" \
  --set-secrets "MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest"
```

**After deploy:** note the service URL (looks like
`https://shopagent-api-xxxx-el.a.run.app`). You will need it for the
`REACT_APP_API_URL` Vercel env var.

**Verify:**
```bash
curl https://shopagent-api-xxxx-el.a.run.app/health
# Expected: {"status":"ok"}
```

---

## Step 5 — First deploy: shopagent-rag (Python RAG service)

> Deploy the RAG service first so you have its URL before wiring it to the API.

```bash
gcloud run deploy shopagent-rag \
  --source ./rag-service \
  --region asia-south1 \
  --platform managed \
  --no-allow-unauthenticated \
  --set-env-vars "MIN_SCORE=0.6,EMBED_MODEL=gemini-embedding-001" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGO_URI=MONGO_URI:latest,RAG_SHARED_SECRET=RAG_SHARED_SECRET:latest"
```

> `--no-allow-unauthenticated` keeps the RAG service private. The API service
> calls it with the `X-Internal-Key` header; it is NOT exposed to the internet.
> If you want Cloud Run service-to-service auth instead of a shared secret in
> the future, that's a safe upgrade path.

**After deploy:** note the RAG service URL
(`https://shopagent-rag-xxxx-el.a.run.app`).

**Verify:**
```bash
curl https://shopagent-rag-xxxx-el.a.run.app/health
# Expected: {"status":"ok"}
```

---

## Step 6 — Wire RAG_SERVICE_URL into the API service

```bash
# Set RAG_SERVICE_URL on the API service so it can reach the RAG service
gcloud run services update shopagent-api \
  --region asia-south1 \
  --set-env-vars "RAG_SERVICE_URL=https://shopagent-rag-xxxx-el.a.run.app"

# Also set the RAG_SHARED_SECRET env var (it is already a secret; reference it)
gcloud run services update shopagent-api \
  --region asia-south1 \
  --set-secrets "RAG_SHARED_SECRET=RAG_SHARED_SECRET:latest"
```

---

## Step 7 — Create a CI service account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions-sa \
  --display-name "GitHub Actions — ShopAgent CI"

export CI_SA="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant roles needed for source-based Cloud Run deploy
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA" \
  --role="roles/iam.serviceAccountUser"

# Allow CI SA to act as compute SA (needed for Cloud Run source deploy)
gcloud iam service-accounts add-iam-policy-binding $SA \
  --member="serviceAccount:$CI_SA" \
  --role="roles/iam.serviceAccountUser"

# Create and download the JSON key 🔒 (keep this file secure — delete after adding to GitHub)
gcloud iam service-accounts keys create /tmp/gcp-sa-key.json \
  --iam-account=$CI_SA

echo "Key written to /tmp/gcp-sa-key.json — add to GitHub Secrets as GCP_SA_KEY"
cat /tmp/gcp-sa-key.json   # copy this output
```

---

## Step 8 — Set the GitHub repository secret

1. Go to your repo: **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `GCP_SA_KEY`
3. Value: paste the full contents of `/tmp/gcp-sa-key.json`
4. Save.
5. **Delete the key file from your machine:** `rm /tmp/gcp-sa-key.json`

---

## Step 9 — Set Vercel environment variable and redeploy frontend

1. Go to [vercel.com](https://vercel.com) → your `BuyEasy` project → **Settings → Environment Variables**
2. Add (or update):
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://shopagent-api-xxxx-el.a.run.app/api`  ← your actual API URL + `/api`
   - **Environments:** Production, Preview, Development
3. Click **Save**
4. Go to **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**

---

## Step 10 — Atlas MongoDB: whitelist Cloud Run IPs

Cloud Run uses dynamic egress IPs. The simplest approach for development is:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to **Network Access → Add IP Address**
3. Click **Allow Access from Anywhere** (`0.0.0.0/0`) for now
4. For production, set up a VPC + Cloud NAT with a static IP and whitelist that instead

---

## Step 11 — Atlas Vector Search index (for RAG service)

> You must create this index before running `ingest.py` or the RAG service will
> return no results.

### Via Atlas UI:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to your cluster → **Search** tab → **Create Search Index**
3. Select **Atlas Vector Search** (not "Atlas Search")
4. Choose database `buyeasy`, collection `policy_chunks`
5. Paste the following JSON definition:

```json
{
  "name": "policy_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      }
    ]
  }
}
```

6. Click **Create Index** and wait for it to reach **Active** state (~2 min)

### Run ingest after index is active:

```bash
cd rag-service
pip install -r requirements.txt
export GEMINI_API_KEY=<your-key>
export MONGO_URI=<your-atlas-uri>
export EMBED_MODEL=gemini-embedding-001
python ingest.py
# Expected output: "Indexed N chunks into policy_chunks"
```

---

## Step 12 — Run the retrieval evaluation

```bash
cd rag-service
export RAG_SERVICE_URL=https://shopagent-rag-xxxx-el.a.run.app
export RAG_SHARED_SECRET=<your-rag-shared-secret>
python eval.py
```

Fill in the real hit@3, MRR, and off-topic rejection numbers in README.md.

---

## Step 13 — Smoke test the Gemini model (run after any GEMINI_MODEL change)

Any time you change the `GEMINI_MODEL` env var (e.g. upgrading to a newer GA model),
run this smoke script **before** deploying to Cloud Run to confirm:
- The model is reachable with your API key
- It returns a `functionCall` part (function-calling is working)
- It handles the two-turn pattern (tool result → text reply) correctly
- It does NOT throw 404 "model not available"

```bash
# From the project root
export GEMINI_API_KEY=<your-key>
export GEMINI_MODEL=gemini-2.5-flash   # or whichever model you want to test
npm run smoke:gemini
```

Expected output ends with `RESULT: PASS ✓`. If it shows `FAIL`, check the error
message — a 404 means the model ID is wrong or the model has been retired.

---


## Known Limitations

### 🗂️ Multer local-disk uploads (ephemeral filesystem)

`backend/middleware/upload.js` saves uploaded product images to `./uploads/`
on the local disk. **Cloud Run containers have an ephemeral filesystem** — files
are lost on every new container instance or revision deploy.

**Impact:** Product images uploaded via the admin panel will disappear after
the next Cloud Run revision deploy or container restart.

**Recommended fix (not done in this PR — out of scope):**
- Create a Google Cloud Storage bucket
- Replace Multer's `diskStorage` with a streaming upload to GCS using
  `@google-cloud/storage`
- Serve images from the GCS public URL instead of `/uploads/`

### 🔌 RAG service cold starts

Cloud Run scales to zero by default. The first request after a period of
inactivity may be slow (~2-3 s). The 8-second timeout in `searchPolicy` covers
this, and a failed RAG call returns a graceful fallback rather than an error.

Set `--min-instances 1` on `shopagent-rag` if you want to eliminate cold starts
(costs money even at zero traffic).

### 🔑 Shared-secret auth vs Cloud Run service-to-service auth

The RAG service uses an `X-Internal-Key` shared secret for authentication.
A stronger alternative is Cloud Run service-to-service auth using IAM ID tokens.
The current approach is simpler to implement and correct for this stage.
