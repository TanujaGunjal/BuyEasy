# ShopAgent Deployment Checklist (PowerShell / Windows)

> **Quick-start guide for Windows users.** Every command runs in PowerShell.
> For the full narrative (why each step exists, all options, architecture notes)
> see **[docs/MANUAL_STEPS.md](MANUAL_STEPS.md)**.

---

## Five-minute pre-flight (do this before Tier 1)

### [ ] P.1 Confirm `deploy.yml` order and guards

Open [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) and verify:
- `test` job runs on every push/PR (no `if:` guard) ✅
- `deploy-rag` has `needs: test` and `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` ✅
- `deploy` has `needs: [test, deploy-rag]` — RAG always deploys before the API ✅
- Both deploy jobs have `HAS_KEY: ${{ secrets.GCP_SA_KEY != '' }}` and every GCP step has `if: env.HAS_KEY == 'true'` ✅

This file was already verified as correct by the last session.

### [ ] P.2 Verify every `"source"` in `eval_set.json` is a real filename

The 6 real policy doc filenames are:
`returns.md` `refunds.md` `shipping.md` `cancellations.md` `payments.md` `warranty.md`

All 40 items in [`rag-service/eval_set.json`](../rag-service/eval_set.json) were audited —
no `orders.md` or other phantom filenames remain. The 4 multi-doc list entries all
use subsets of the 6 valid names.

Spot-check: rewrite 2–3 of the informal questions in your own words so they reflect
how *your* customers ask (the AI guessed; you know better).

### [ ] P.3 Build both Docker images locally (optional if deploying to Azure)

> `az containerapp up --source` builds your Dockerfile in Azure Cloud Build, so you
> **don't need Docker Desktop running** for the Azure path.
> Only do this step if you want faster local feedback, or if you're deploying to GCP.

```powershell
# API image
docker build -t shopagent-api .
# Expected last line: Successfully tagged shopagent-api:latest

# RAG service image
docker build -t shopagent-rag ./rag-service
# Expected last line: Successfully tagged shopagent-rag:latest
```

If either build fails, fix it before deploying — both `az containerapp up` and
`gcloud run deploy --source` use the same Dockerfile.

Optional smoke test (replace values):
```powershell
docker run --rm -e MONGO_URI="placeholder" -e JWT_SECRET="x" `
  -e GEMINI_API_KEY="placeholder" -p 8080:8080 shopagent-api &
Start-Sleep 3
curl.exe http://localhost:8080/health   # expected: {"status":"ok"}
```

---

## Choose your cloud platform

| | Azure Container Apps (Tier 1-A) | Google Cloud Run (Tier 1-B) |
|---|---|---|
| **CLI** | `az containerapp up --source` | `gcloud run deploy --source` |
| **Docker Desktop needed?** | No — builds in Azure | No — builds in Cloud Build |
| **Free credit** | Azure for Students (~$100, check with spit.ac.in email) | $300 trial (credit card required) |
| **JD alignment** | AZ-900 / AI-900 named in JD | GCP is fine too |
| **Secrets** | Container Apps secrets + `secretref:` | Secret Manager + `--set-secrets` |
| **Logs** | Log Analytics — `ContainerAppConsoleLogs_CL` | Cloud Logging — Cloud Run Logs tab |

**Start with Tier 1-A (Azure).** If `az containerapp up` fails with an error you can't resolve, fall back to Tier 1-B (GCP).

---

## Tier 1-A — Get it live on Azure Container Apps

Work through these in order. Replace every `<...>` with your real value.
Install the Azure CLI first if needed: `winget install Microsoft.AzureCLI`

### [ ] A.0 One-time Azure setup

```powershell
az login
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

az group create --name shopagent-rg --location centralindia
az containerapp env create --name shopagent-env `
  --resource-group shopagent-rg --location centralindia
```

**Expected:** `"provisioningState": "Succeeded"` on the last command.

---

### [ ] A.1 Deploy the RAG service first

```powershell
az containerapp up --name shopagent-rag --resource-group shopagent-rg `
  --environment shopagent-env --source ./rag-service `
  --ingress external --target-port 8080
```

> The first revision may crash-loop because the app reads secrets at startup.
> That’s expected. Set the secrets in the next command and it recovers automatically.

```powershell
# Set secrets (values from your .env — do not paste into shared terminal history)
az containerapp secret set --name shopagent-rag --resource-group shopagent-rg --secrets `
  gemini-key=<GEMINI_API_KEY> `
  mongo-uri=<MONGO_URI> `
  rag-secret=<RAG_SHARED_SECRET>

# Wire secrets as env vars + keep one warm instance for interview week
az containerapp update --name shopagent-rag --resource-group shopagent-rg `
  --min-replicas 1 `
  --set-env-vars `
    GEMINI_API_KEY=secretref:gemini-key `
    MONGO_URI=secretref:mongo-uri `
    RAG_SHARED_SECRET=secretref:rag-secret
```

**Expected:** revision status shows `Running`.

> After your interviews: `az containerapp update --name shopagent-rag --resource-group shopagent-rg --min-replicas 0`

Get the RAG URL:
```powershell
$RAG_URL = "https://" + (az containerapp show `
  --name shopagent-rag --resource-group shopagent-rg `
  --query properties.configuration.ingress.fqdn -o tsv)
Write-Host $RAG_URL
```

---

### [ ] A.2 Atlas Network Access + vector index + ingest

Same as the GCP path — no Azure-specific changes:

1. **Atlas Network Access** → `+ ADD IP ADDRESS` → `0.0.0.0/0` → wait for **Active**
2. **Search** tab → `+ Create Search Index` → JSON editor → database `buyeasy`, collection `policy_chunks`, name `policy_vector_index`:
```json
{"fields":[{"type":"vector","path":"embedding","numDimensions":768,"similarity":"cosine"}]}
```
3. Wait for index status **Active** (1–3 min).
4. Run ingest:
```powershell
rag-service\.venv\Scripts\Activate.ps1   # create with: python -m venv rag-service\.venv
pip install -r rag-service\requirements.txt

$env:GEMINI_API_KEY = "<your-key>"
$env:MONGO_URI      = "<your-atlas-uri>"
python rag-service\ingest.py
Remove-Item Env:GEMINI_API_KEY, Env:MONGO_URI
```
**Expected last line:** `Indexed N chunks into policy_chunks`

---

### [ ] A.3 Test the RAG service directly (before deploying the API)

```powershell
$env:RAG_SHARED_SECRET = "<your-rag-shared-secret>"

curl.exe "$RAG_URL/health"
# Expected: {"status":"ok"}

Invoke-RestMethod -Method Post -Uri "$RAG_URL/search" `
  -Headers @{ "X-Internal-Key" = $env:RAG_SHARED_SECRET } `
  -ContentType "application/json" `
  -Body '{"question":"can I return food items","k":3}'
# Expected: object with results array containing source, heading, score

Remove-Item Env:RAG_SHARED_SECRET
```

| Error | Cause | Fix |
|---|---|---|
| Google/Azure HTML 403 | Service not public | Redeploy with `--ingress external` |
| JSON 401 `{"detail":"Unauthorized"}` | Secret mismatch | Both services must use same RAG_SHARED_SECRET value |
| `{"results":[]}` empty | Index not Active or ingest not run | Check Atlas Search tab; re-run ingest; try lower MIN_SCORE |
| Timeout / connection refused | Wrong URL | Confirm `$RAG_URL` with `az containerapp show` |

---

### [ ] A.4 Deploy the API service

```powershell
az containerapp up --name shopagent-api --resource-group shopagent-rg `
  --environment shopagent-env --source . `
  --ingress external --target-port 8080
```

```powershell
az containerapp secret set --name shopagent-api --resource-group shopagent-rg --secrets `
  mongo-uri=<MONGO_URI> `
  jwt-secret=<JWT_SECRET> `
  stripe-key=<STRIPE_SECRET_KEY> `
  gemini-key=<GEMINI_API_KEY> `
  email-user=<EMAIL_USER> `
  email-pass=<EMAIL_PASS> `
  rag-secret=<RAG_SHARED_SECRET>

az containerapp update --name shopagent-api --resource-group shopagent-rg `
  --min-replicas 1 `
  --set-env-vars `
    NODE_ENV=production `
    GEMINI_MODEL=gemini-2.5-flash `
    FRONTEND_URL=https://frontend-nine-zeta-53.vercel.app `
    RAG_SERVICE_URL=$RAG_URL `
    JWT_EXPIRE=30d `
    STRIPE_PUBLISHABLE_KEY=<pk_test_...> `
    EMAIL_HOST=smtp.gmail.com `
    EMAIL_PORT=587 `
    FROM_NAME=BuyEasy `
    FROM_EMAIL=noreply@buyeasy.com `
    MONGO_URI=secretref:mongo-uri `
    JWT_SECRET=secretref:jwt-secret `
    STRIPE_SECRET_KEY=secretref:stripe-key `
    GEMINI_API_KEY=secretref:gemini-key `
    EMAIL_USER=secretref:email-user `
    EMAIL_PASS=secretref:email-pass `
    RAG_SHARED_SECRET=secretref:rag-secret
```

Get the API URL:
```powershell
$API_URL = "https://" + (az containerapp show `
  --name shopagent-api --resource-group shopagent-rg `
  --query properties.configuration.ingress.fqdn -o tsv)
Write-Host $API_URL
```

---

### [ ] A.5 Verify both services are really working

> ⚠️ `/health` returns `{"status":"ok"}` even when MongoDB is unreachable.
> Always also check `/api/products` — that proves Atlas is live.

```powershell
curl.exe "$API_URL/health"
# Expected: {"status":"ok"}

curl.exe "$API_URL/api/products"
# Expected: JSON array of products
# If 500 or timeout — open Azure Portal → shopagent-api → Log stream
# Search for [DB] — the line will say why MongoDB failed
```

**Azure Logs (when you need them):**
Portal → shopagent-env (Container Apps Environment) → **Logs** → run:
```kusto
ContainerAppConsoleLogs_CL
| where ContainerName_s == "shopagent-api"
| where Log_s contains "[DB]"
| project TimeGenerated, Log_s
| order by TimeGenerated desc
| take 20
```

---

### [ ] A.6 Point Vercel at the Azure API

In Vercel Dashboard → Project Settings → Environment Variables:

| Name | Value |
|---|---|
| `REACT_APP_API_URL` | `https://<shopagent-api-fqdn>/api` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |

Then **Deployments → Redeploy** the latest.

---

### [ ] A.7 Live end-to-end test

```
[ ] Ask: "What is your return policy?"  → agent answers from RAG, not "I don't know"
[ ] Ask: "I want a refund for my order" → PendingApproval created in DB
[ ] Admin: approve the refund            → 200 with refund info
[ ] Admin: approve again immediately      → 409 {"message":"Already processed"}
```

---

### [ ] A.8 Update README live demo line

Once deployed, replace the Render link with the Azure URL:

```powershell
# Get the line to paste into README.md line 10:
Write-Host "**Live Demo:** 🖥️ Frontend: [frontend-nine-zeta-53.vercel.app](https://frontend-nine-zeta-53.vercel.app) | ⚙️ Backend API: [$API_URL]($API_URL) (Azure Container Apps)"
```

---

## Tier 1-B — Get it live on Google Cloud Run (alternative)

> Use this if you have a GCP account with $300 trial credit, or if Azure setup fails.
> The GCP steps assume your project ID is already set.

### One-time GCP setup

```powershell
gcloud auth login
gcloud config set project <FILL_ME>   # your GCP project ID

gcloud services enable `
  run.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com
```

Work through these in order. Each step has a checkbox and the expected output.

### [ ] 1.1 Create the 7 secrets in Secret Manager

> **PowerShell note**: Do NOT use `echo` (it is an alias for `Write-Output` and
> adds a newline + BOM). Use `Set-Content -NoNewline -Encoding ascii` to write a
> temp file, pass it with `--data-file`, then delete it immediately.
> The **Cloud Console UI** (`console.cloud.google.com → Secret Manager → + CREATE SECRET`)
> is the safest and simplest alternative for one-off creation — paste the value there.

**PowerShell method (temp file):**

```powershell
# Pattern: write to temp file, create secret, delete immediately
# Never leave secret temp files on disk.

function New-Secret {
  param($Name, $Value)
  $tmp = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $tmp -Value $Value -NoNewline -Encoding ascii
  gcloud secrets create $Name --data-file=$tmp --replication-policy=automatic
  Remove-Item $tmp
  Write-Host "Created secret: $Name"
}

# Call once per secret — paste real values:
New-Secret "MONGO_URI"          "mongodb+srv://user:pass@cluster.mongodb.net/buyeasy"
New-Secret "JWT_SECRET"         "your-random-jwt-secret-min-32-chars"
New-Secret "STRIPE_SECRET_KEY"  "sk_test_..."
New-Secret "GEMINI_API_KEY"     "AIza..."
New-Secret "EMAIL_USER"         "your@gmail.com"
New-Secret "EMAIL_PASS"         "your-app-password"
New-Secret "RAG_SHARED_SECRET"  "$(New-Guid)"   # generate a random secret
New-Secret "FRONTEND_URL"       "https://frontend-nine-zeta-53.vercel.app"
```

**Expected output per secret:** `Created secret: MONGO_URI`

> Add `.tmp_secret_*` to `.gitignore` if you use temp files with a custom name pattern.

---

### [ ] 1.2 Grant Secret Accessor IAM to the Cloud Run service account

```powershell
$PROJECT = "<FILL_ME>"
$PROJECT_NUMBER = (gcloud projects describe $PROJECT --format="value(projectNumber)")
$SA = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

foreach ($secret in @("MONGO_URI","JWT_SECRET","STRIPE_SECRET_KEY","GEMINI_API_KEY",
                       "EMAIL_USER","EMAIL_PASS","RAG_SHARED_SECRET","FRONTEND_URL")) {
  gcloud secrets add-iam-policy-binding $secret `
    --member="serviceAccount:$SA" `
    --role="roles/secretmanager.secretAccessor"
}
```

**Expected:** `Updated IAM policy for secret [...]` × 8

---

### [ ] 1.3 Deploy the RAG service (`shopagent-rag`) first

Deploy RAG first so its URL is available when the API service starts.

> **Auth flag:** Use `--allow-unauthenticated`. The RAG service is protected by the
> `X-Internal-Key` shared secret — that is the application-level auth. Cloud Run IAM
> (`--no-allow-unauthenticated`) would require a Google identity token that the Node API
> and `eval.py` do not send, causing a silent 403 before the request reaches FastAPI.

> **`--min-instances 1`** keeps one instance warm so the first `searchPolicy` call during
> your demo doesn't pay a cold start + embedding call (~5–8 s). It costs ~$2–5/month.
> After your interviews: `gcloud run services update shopagent-rag --region asia-south1 --min-instances 0`

```powershell
gcloud run deploy shopagent-rag `
  --source ./rag-service `
  --region asia-south1 `
  --allow-unauthenticated `
  --min-instances 1 `
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGO_URI=MONGO_URI:latest,RAG_SHARED_SECRET=RAG_SHARED_SECRET:latest"
```

**Expected output (last line):** `Service [shopagent-rag] revision [...] has been deployed`

Copy the service URL from the output — looks like `https://shopagent-rag-xxxx-el.a.run.app`.

---

### [ ] 1.3b Test the RAG service directly (before deploying the API)

Do this after `ingest.py` has run and the Atlas vector index is **Active**.
This catches problems before they hide inside the Node API.

```powershell
$RAG_URL = "https://shopagent-rag-xxxx-el.a.run.app"   # paste from step 1.3
$env:RAG_SHARED_SECRET = "your-rag-shared-secret"       # the value from Secret Manager

# Liveness probe
curl.exe "$RAG_URL/health"
# Expected: {"status":"ok"}

# Real search call
Invoke-RestMethod -Method Post -Uri "$RAG_URL/search" `
  -Headers @{ "X-Internal-Key" = $env:RAG_SHARED_SECRET } `
  -ContentType "application/json" `
  -Body '{"question":"can I return food items","k":3}'
# Expected: object with a 'results' array containing items with source, heading, score

Remove-Item Env:RAG_SHARED_SECRET
```

**If it fails:**

| Error | Cause | Fix |
|---|---|---|
| Google-styled HTML 403 page | Cloud Run is blocking — service not public | Redeploy with `--allow-unauthenticated` |
| JSON `{"detail":"Unauthorized"}` (401) | Secret mismatch — header value ≠ env var | Confirm both use the same Secret Manager version |
| `{"results":[]}` (empty) | Index not Active, or `ingest.py` not run, or `MIN_SCORE` too high | Check Atlas Search tab status; re-run `ingest.py`; try `--set-env-vars MIN_SCORE=0.5` |
| Connection refused / timeout | Wrong URL or service not yet deployed | Check `gcloud run services list --region asia-south1` |

---

### [ ] 1.4 Deploy the API service (`shopagent-api`)

```powershell
$RAG_URL = "https://shopagent-rag-xxxx-el.a.run.app"   # paste from step 1.3

gcloud run deploy shopagent-api `
  --source . `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars "NODE_ENV=production,GEMINI_MODEL=gemini-2.5-flash,FRONTEND_URL=https://frontend-nine-zeta-53.vercel.app,RAG_SERVICE_URL=$RAG_URL" `
  --set-secrets "MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest,RAG_SHARED_SECRET=RAG_SHARED_SECRET:latest"
```

**Expected output (last line):** `Service [shopagent-api] revision [...] has been deployed`

Copy the API URL — looks like `https://shopagent-api-xxxx-el.a.run.app`.

---

### [ ] 1.5 Verify both services are really working (don't stop at `/health`)

> ⚠️ **Important:** `/health` returns `{"status":"ok"}` even when the database is
> completely broken — the server keeps running intentionally so Cloud Run's liveness
> probe doesn't kill the container. Always also hit a real route to confirm the Atlas
> connection is live.

```powershell
$API_URL = "https://shopagent-api-xxxx-el.a.run.app"   # paste from step 1.4

# Liveness probe (no DB involved — always passes if the container started)
curl.exe "$API_URL/health"
# Expected: {"status":"ok"}

# Real DB route — this proves Atlas is reachable and the MONGO_URI secret is correct
curl.exe "$API_URL/api/products"
# Expected: JSON array of products (same data Render serves — Atlas already has it)
# If this hangs, times out, or returns a 500:
#   1. Open Cloud Run → Logs and filter for  [DB]
#   2. The log line will say: '[DB] MongoDB connection failed...'
#      and remind you to check MONGO_URI or Atlas Network Access (0.0.0.0/0)
```

If `/api/products` returns products but `/api/agent` returns errors, check
`GEMINI_API_KEY` or `GEMINI_MODEL`. If it returns `403 CORS`, check `FRONTEND_URL`.

If you need to update `RAG_SERVICE_URL` later without a full redeploy:

```powershell
gcloud run services update shopagent-api `
  --region asia-south1 `
  --update-env-vars "RAG_SERVICE_URL=https://shopagent-rag-xxxx-el.a.run.app"
```

---

### [ ] 1.6 Atlas Network Access — allow Cloud Run

Cloud Run has no fixed egress IP. In MongoDB Atlas:

1. Open **Network Access** → **+ ADD IP ADDRESS**
2. Enter `0.0.0.0/0` → **Confirm**

**Expected:** Access list entry shows `0.0.0.0/0` with Status `Active`

---

### [ ] 1.7 Create the Atlas Vector Search index

In MongoDB Atlas → **Search** tab → **+ Create Search Index** → **JSON editor**:

Database: `buyeasy`, Collection: `policy_chunks`

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

Index name: `policy_vector_index`

**Wait until status shows `Active`** (can take 1–3 minutes).

---

### [ ] 1.8 Run `ingest.py` to populate the vector store

```powershell
# Create a virtualenv (one-time)
python -m venv rag-service\.venv
rag-service\.venv\Scripts\Activate.ps1

pip install -r rag-service\requirements.txt

# Set env vars (clear afterwards — never leave these in your shell history)
$env:GEMINI_API_KEY = "AIza..."
$env:MONGO_URI      = "mongodb+srv://..."
$env:EMBED_MODEL    = "gemini-embedding-001"

python rag-service\ingest.py

# Clear sensitive vars from the shell session
Remove-Item Env:GEMINI_API_KEY
Remove-Item Env:MONGO_URI
```

**Expected output (last line):** `Indexed N chunks into policy_chunks`

---

### [ ] 1.9 Set `REACT_APP_API_URL` in Vercel and redeploy

In **Vercel Dashboard → Project Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://shopagent-api-xxxx-el.a.run.app/api` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |

Then in **Deployments** → click **Redeploy** on the latest deployment.

**Expected:** Vercel build completes, site shows updated API URL.

---

### [ ] 1.10 Live end-to-end test

Open the frontend at `https://frontend-nine-zeta-53.vercel.app` and verify:

```
[ ] Ask: "What is your return policy?" → agent calls searchPolicy, answers in plain English
[ ] Ask: "What is the status of order ORD-123?" → agent calls getOrderStatus (or says not found)
[ ] Ask: "I want a refund for order ORD-123" → agent creates PendingApproval in DB
[ ] Admin: GET /api/admin/pending-approvals → see the pending entry
[ ] Admin: PUT /api/admin/pending-approvals/:id/approve → returns 200 with refund info
[ ] Admin: PUT same :id/approve again → returns 409 (idempotency guard — expected)
```

**Expected for double-approve:** `{"success":false,"message":"Already processed (status: approved)"}`

---

## Tier 2 — Evidence for your resume

### [ ] 2.1 Run the retrieval evaluation

```powershell
$env:RAG_SERVICE_URL   = "https://shopagent-rag-xxxx-el.a.run.app"
$env:RAG_SHARED_SECRET = "your-rag-shared-secret"

python rag-service\eval.py

Remove-Item Env:RAG_SERVICE_URL
Remove-Item Env:RAG_SHARED_SECRET
```

**Expected output:** Prints `hit@3`, `MRR`, `off-topic rejection`, `avg latency`. Ends with
`All in-scope questions hit! 🎉` or a missed-questions breakdown.

---

### [ ] 2.2 Fill in README.md results and live URLs

Edit `README.md` § 17 Evaluation results table:

| Metric | Result |
|---|---|
| hit@3 | ← fill from eval.py output |
| MRR | ← fill from eval.py output |
| Off-topic rejection | ← fill from eval.py output |
| Avg latency | ← fill from eval.py output |

Also update the architecture diagram comment `shopagent-api-xxxx` and `shopagent-rag-xxxx`
with real URLs. Commit and push → the badge and live links will update.

---

### [ ] 2.3 Screenshots to capture

- [ ] Cloud Run console showing both services `shopagent-api` and `shopagent-rag` as **Serving**
- [ ] Atlas Network Access showing `0.0.0.0/0` active
- [ ] Atlas `policy_chunks` collection with embedded documents
- [ ] GitHub Actions `test` job showing **58 tests passed**
- [ ] Chat widget answering a policy question (searchPolicy visible in agent logs)
- [ ] Admin approval flow (PendingApproval created → approved → 409 on retry)

---

## Tier 3 — Automation (CI/CD)

### [ ] 3.1 Create the CI service account

```powershell
$PROJECT = "<FILL_ME>"

gcloud iam service-accounts create shopagent-ci `
  --display-name="ShopAgent CI deployer" `
  --project=$PROJECT

$CI_SA = "shopagent-ci@${PROJECT}.iam.gserviceaccount.com"

# Grant roles
foreach ($role in @("roles/run.admin","roles/iam.serviceAccountUser","roles/cloudbuild.builds.editor","roles/storage.admin","roles/artifactregistry.writer")) {
  gcloud projects add-iam-policy-binding $PROJECT `
    --member="serviceAccount:$CI_SA" `
    --role=$role
}
```

---

### [ ] 3.2 Download the key and add it as a GitHub secret

```powershell
$tmp = [System.IO.Path]::GetTempFileName() + ".json"
gcloud iam service-accounts keys create $tmp --iam-account=$CI_SA
$keyJson = Get-Content $tmp -Raw
# Copy $keyJson → GitHub → repo Settings → Secrets → Actions → New secret
# Name: GCP_SA_KEY   Value: (paste $keyJson)
Remove-Item $tmp
Write-Host "Key file deleted. Paste the value into GitHub now."
```

> **Alternative:** Use the GitHub CLI:
> `gh secret set GCP_SA_KEY --body $keyJson`

---

### [ ] 3.3 Merge the PR and confirm CI goes green

```powershell
git push -u origin feat/cloud-rag
# Open a PR on GitHub → merge to main
# Watch Actions tab:
#   test         → green (58 tests)
#   deploy-rag   → green (shopagent-rag deployed)
#   deploy       → green (shopagent-api deployed)
```

**Expected:** All three jobs green. Both Cloud Run services show a new revision.

---

## If it fails — quick triage

| Symptom | Most likely cause | Fix |
|---|---|---|
| Container fails to start, Cloud Run shows `Container failed to start` | `MONGO_URI` wrong or Atlas Network Access blocks Cloud Run | Check Cloud Run logs → look for `[DB]` lines; fix MONGO_URI secret or add `0.0.0.0/0` in Atlas |
| `/health` returns `{"status":"ok"}` but `/api/...` returns 500 | DB connection failing in background | Same as above — check `[DB]` log lines |
| 401 from RAG service | `RAG_SHARED_SECRET` mismatch between API and RAG services | Confirm both Cloud Run services use the same `RAG_SHARED_SECRET` secret version |
| `searchPolicy` returns empty results | Index not `Active`, or `ingest.py` not run, or `MIN_SCORE` too high | Check Atlas index status; re-run `ingest.py`; try lowering `MIN_SCORE` env var to `0.5` |
| CORS error in browser | `FRONTEND_URL` env var wrong on `shopagent-api` | Update with `--update-env-vars "FRONTEND_URL=https://..."` |
| Chat widget sends requests but gets no reply | `GEMINI_MODEL` retired or quota exhausted | Run `npm run smoke:gemini` locally; check Cloud Run logs for `[Agent]` lines |
| 404 on agent API | `REACT_APP_API_URL` not set or wrong in Vercel | Check Vercel env vars and redeploy frontend |
