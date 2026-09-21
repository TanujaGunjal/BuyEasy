# ShopAgent Deployment Checklist (PowerShell / Windows)

> **Quick-start guide for Windows users.** Every command runs in PowerShell.
> For the full narrative (why each step exists, all options, architecture notes)
> see **[docs/MANUAL_STEPS.md](MANUAL_STEPS.md)**.

---

## Five-minute pre-flight (do this before Tier 1)

### [x] P.1 Confirm `deploy.yml` order and guards

Open [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) and verify:
- The `deploy.yml` workflow runs all 58 tests on every push/PR without deploying.
This file was already verified as correct by the last session.

### [x] P.2 Verify every `"source"` in `eval_set.json` is a real filename

The 6 real policy doc filenames are:
`returns.md` `refunds.md` `shipping.md` `cancellations.md` `payments.md` `warranty.md`

All 40 items in [`rag-service/eval_set.json`](../rag-service/eval_set.json) were audited —
no `orders.md` or other phantom filenames remain. The 4 multi-doc list entries all
use subsets of the 6 valid names.

Spot-check: rewrite 2–3 of the informal questions in your own words so they reflect
how *your* customers ask (the AI guessed; you know better).

### [x] P.3 Build both Docker images locally

> **Start Docker Desktop first.** AWS deployment requires pushing images to ECR, so Docker Desktop must be running.

```powershell
# API image
docker build -t shopagent-api .
# Expected last line: Successfully tagged shopagent-api:latest

# RAG service image
docker build -t shopagent-rag ./rag-service
# Expected last line: Successfully tagged shopagent-rag:latest
```

If either build fails, fix it before deploying — your cloud provider will use the same Dockerfile.

Optional smoke test (replace values):
```powershell
docker run --rm -e MONGO_URI="placeholder" -e JWT_SECRET="x" `
  -e GEMINI_API_KEY="placeholder" -p 8080:8080 shopagent-api &
Start-Sleep 3
curl.exe http://localhost:8080/health   # expected: {"status":"ok"}
```

---

## Choose your cloud platform

| | AWS ECS/Fargate (Tier 1-A) | Google AWS ECS (Tier 1-B) |
|---|---|---|
| **CLI** | `aws` and `docker` | `gAWS ECS deploy --source` |
| **Docker Desktop needed?** | Yes — to build and push to ECR | No — builds in Cloud Build |
| **Free credit** | AWS Free Tier (subject to limits) | $300 trial (credit card required) |
| **Logs** | CloudWatch | Cloud Logging — AWS ECS Logs tab |

**AWS ECS/Fargate is the primary deployment path.**

---

## AWS Cost Safety Warning

> ⚠️ **Important:** AWS Free account plan/credits are subject to AWS eligibility and limits.
> - Do not assume every ECS/Fargate configuration is free.
> - Keep minimum resources as low as practical.
> - Add billing/free-tier monitoring before deployment where supported.
> - **Stop/delete AWS resources after testing/interviews if they are no longer needed.**
> - Never claim the deployment is free unless the actual AWS account plan and resource usage have been verified.

---

## Tier 1-A — AWS ECS/Fargate (primary)

Work through these in order. Replace `<...>` placeholders with your real values.

### [x] A.0 — AWS CLI/account verification

```powershell
# Check aws --version
aws --version

# Verify the AWS account/region
aws sts get-caller-identity
```

**Do not deploy yet.** Verify you are logged into the correct AWS account and region.

---

### [x] A.1 — AWS prerequisites

- Choose an appropriate region (e.g., `us-east-1`).
- Verify ECR/ECS permissions for your IAM identity.
- Create the required ECR repositories:
```powershell
aws ecr create-repository --repository-name shopagent-rag
aws ecr create-repository --repository-name shopagent-api
```
- Configure secrets and environment variables securely (e.g., in AWS Systems Manager Parameter Store or AWS Secrets Manager).

---

### [x] A.2 — RAG deployment

1. Build the RAG Docker image.
2. Push it to ECR:
```powershell
# Replace <account-id> and <region> with your details
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker tag shopagent-rag:latest <account-id>.dkr.ecr.<region>.amazonaws.com/shopagent-rag:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/shopagent-rag:latest
```
3. Deploy the Python FastAPI RAG service using **ECS Express Mode / Fargate**.
4. Configure the required internal secret (`RAG_SHARED_SECRET`) and standard environment variables.
5. Obtain the RAG endpoint from the deployed service.
```powershell
$RAG_URL = "http://<your-rag-alb-endpoint>"
```

---

### [x] A.3 — MongoDB Atlas

1. **Configure Network Access**: Allow ECS IPs or `0.0.0.0/0` (if testing temporarily).
2. **Verify `policy_vector_index` is Active** in the Atlas Search UI.
3. **Run `ingest.py`**:
```powershell
$env:GEMINI_API_KEY = "<your-key>"
$env:MONGO_URI = "<your-atlas-uri>"
python rag-service\ingest.py
Remove-Item Env:GEMINI_API_KEY, Env:MONGO_URI
```
4. **Test RAG directly with `Invoke-RestMethod`**:
```powershell
$env:RAG_SHARED_SECRET = "<your-rag-shared-secret>"
Invoke-RestMethod -Method Post -Uri "$RAG_URL/search" `
  -Headers @{ "X-Internal-Key" = $env:RAG_SHARED_SECRET } `
  -ContentType "application/json" `
  -Body '{"question":"can I return food items","k":3}'
Remove-Item Env:RAG_SHARED_SECRET
```

| Error | Cause | Fix |
|---|---|---|
| AWS Security Group / Timeout | Service not public or blocked | Check ECS Security Groups and ALB rules |
| JSON `{"detail":"Unauthorized"}` (401) | Secret mismatch | Both services must use same RAG_SHARED_SECRET value |
| `{"results":[]}` empty | Index not Active or ingest not run | Check Atlas Search tab; re-run ingest; try lower MIN_SCORE |
| Connection refused | Wrong URL or container crash | Check CloudWatch logs for the RAG task |

---

### [x] A.4 — Node API deployment

1. Build the Node API Docker image and push to ECR:
```powershell
docker tag shopagent-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/shopagent-api:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/shopagent-api:latest
```
2. Deploy using **ECS Express Mode / Fargate**.
3. Configure all required secrets/environment variables:
   `MONGO_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`, `EMAIL_USER`, `EMAIL_PASS`, `RAG_SHARED_SECRET`, `RAG_SERVICE_URL=$RAG_URL`, etc.
4. Obtain the API URL.
```powershell
$API_URL = "http://<your-api-alb-endpoint>"
```

---

### [x] A.5 — API verification

1. **Test `/health`**:
```powershell
curl.exe "$API_URL/health"
```
2. **Test `/api/products`**:
```powershell
curl.exe "$API_URL/api/products"
```
3. **Verify CloudWatch logs**: Ensure there are no database connection failures.
4. **Verify agent tool-call logging**: Ensure AI function calls are recorded properly in logs.

---

### [x] A.6 — Vercel

1. Set `REACT_APP_API_URL` to your `$API_URL/api`.
2. Redeploy the frontend.

---

### [x] A.7 — End-to-end

Test via the live frontend:
```
[x] policy question → RAG response answers accurately
[x] order query → order details retrieved
[x] refund workflow → agent creates PendingApproval
[x] human approval → Admin approves the refund via the dashboard
[x] duplicate approval returns 409 → clicking approve again fails gracefully
[x] verify audit logging → check CloudWatch/MongoDB for AgentActionLog entries
```

---

### [x] A.8 — Evaluation

1. Run the retrieval evaluation against your live AWS RAG endpoint:
```powershell
$env:RAG_SERVICE_URL = $RAG_URL
$env:RAG_SHARED_SECRET = "<your-rag-secret>"
python rag-service\eval.py
```
2. Record the **real Hit@3/MRR/off-topic metrics** into your `README.md`. **Do not invent metrics.**

---
## If it fails — quick triage

| Symptom | Most likely cause | Fix |
|---|---|---|
| Container fails to start, AWS ECS shows `Container failed to start` | `MONGO_URI` wrong or Atlas Network Access blocks AWS ECS | Check AWS ECS logs → look for `[DB]` lines; fix MONGO_URI secret or add `0.0.0.0/0` in Atlas |
| `/health` returns `{"status":"ok"}` but `/api/...` returns 500 | DB connection failing in background | Same as above — check `[DB]` log lines |
| 401 from RAG service | `RAG_SHARED_SECRET` mismatch between API and RAG services | Confirm both AWS ECS services use the same `RAG_SHARED_SECRET` secret version |
| `searchPolicy` returns empty results | Index not `Active`, or `ingest.py` not run, or `MIN_SCORE` too high | Check Atlas index status; re-run `ingest.py`; try lowering `MIN_SCORE` env var to `0.5` |
| CORS error in browser | `FRONTEND_URL` env var wrong on `shopagent-api` | Update with `--update-env-vars "FRONTEND_URL=https://..."` |
| Chat widget sends requests but gets no reply | `GEMINI_MODEL` retired or quota exhausted | Run `npm run smoke:gemini` locally; check AWS ECS logs for `[Agent]` lines |
| 404 on agent API | `REACT_APP_API_URL` not set or wrong in Vercel | Check Vercel env vars and redeploy frontend |
