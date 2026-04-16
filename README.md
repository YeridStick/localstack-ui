# localstack-ui

Local AWS console for MiniStack/LocalStack.

Goal: run fast, learn fast, and practice AWS flows locally with a UI close to the AWS Console.

## How it works

There are three layers:

1. Docker runs containers.
2. MiniStack/LocalStack exposes AWS-compatible endpoints.
3. This Next.js app uses AWS SDK against those endpoints.

Your app talks to the emulator endpoint (not to Docker directly for resource operations).

## Quick start (recommended)

Use Docker Compose to run both emulator and UI:

```bash
git clone <repository-url>
cd localstack-ui
docker compose up --build
```

Open:

- UI: http://localhost:4563
- Emulator endpoint: http://localhost:4566

Stop:

```bash
docker compose down
```

## Quick start (manual)

1. Run MiniStack:

```bash
docker run -d --name ministack -p 4566:4566 ministackorg/ministack
```

2. Install and run UI:

```bash
npm install
cp .env.example .env.local
npm run dev
```

3. Open http://localhost:4563

## Environment variables

Create `.env.local` from `.env.example`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `AWS_ENDPOINT_URL` | Server-side AWS SDK endpoint used by API routes | `http://localhost:4566` |
| `NEXT_PUBLIC_LOCALSTACK_ENDPOINT` | Endpoint shown in UI and used by client-side references | `http://localhost:4566` |
| `AWS_REGION` | Server-side region | `us-east-1` |
| `NEXT_PUBLIC_AWS_REGION` | Region for UI/client context | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS key for emulator | `test` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret for emulator | `test` |
| `NEXT_PUBLIC_AUTO_REFRESH` | Enables automatic polling for health/status queries | `false` |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Polling interval (ms), used only if auto refresh is enabled | `5000` |
| `OLLAMA_BASE_URL` | Server-side Ollama endpoint used by Study Lab API | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Model name used for tutor and quiz generation | `gemma4:e4b` |
| `NEXT_PUBLIC_OLLAMA_MODEL` | Model label shown in Study Lab UI | `gemma4:e4b` |
| `OLLAMA_API_MODE` | Ollama endpoint strategy: `auto`, `chat`, or `generate` | `auto` |
| `OLLAMA_TIMEOUT_MS` | Request timeout for Ollama calls (tutor uses this, quiz gets +3s) | `35000` |

## Study Lab (Gemma + Ollama)

The app includes a **Study Lab** section (`/services/study`) with:

- Guided Q&A dialog for certification prep
- Quiz generation with automatic answer checking
- Topic/difficulty focus for practical learning
- Fast/balanced/deep generation profiles
- Local glossary + anti-repeat question memory

Run Ollama locally and pull the model:

```bash
ollama run gemma4:e4b
```

Quick PowerShell test (generate API):

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:11434/api/generate" -Body (ConvertTo-Json @{model="gemma4:e4b"; prompt="Como crear un bucket S3 en Terraform?"; stream=$false}) -ContentType "application/json" | Select-Object -ExpandProperty response
```

If UI runs in Docker Compose, `OLLAMA_BASE_URL` is set to `http://host.docker.internal:11434`.

### Quiz payload parameters

`POST /api/study/chat` for `mode="quiz"` also supports:

- `generationStrategy`: `bank` | `hybrid` | `model`
- `latencyProfile`: `fast` | `balanced` | `deep`
- `avoidRecent`: `true` | `false`
- `recentQuestionKeys`: `string[]` (keys returned by previous quiz responses)

### Mock exam API

`POST /api/study/mock-exam` supports:

- `certificationGoal`
- `focusTopic`
- `difficulty`
- `totalQuestions` (5-80)
- `durationMinutes` (10-180)
- `avoidRecent`
- `recentQuestionKeys`

Response includes:

- `examId`
- `questions` (bank-based, with `domain`, `tags`, `correctAnswer`, `explanation`, and `sources`)
- `blueprint` by certification domain
- `durationMinutes`
- `questionKeys`
- `officialSources` (deduplicated official references for the full exam)
- `recommendations`
- optional `warning` when the unique pool is smaller than requested

### Study center API

`GET /api/study/center` supports:

- `certificationGoal`
- `focusTopic`
- `difficulty`

Response includes:

- Guided roadmap modules
- Hands-on labs mapped to existing service pages
- AWS-vs-local parity notes
- 4-day study routine
- Latest updates from official AWS feeds (`aws.amazon.com/new/feed` and `aws.amazon.com/blogs/aws/feed`)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint

npm run compose:up
npm run compose:down
npm run compose:logs
```

## Health and connectivity

- App health route: `GET /api/health`
- Emulator checks tried by the app:
  - `/_ministack/health`
  - `/_localstack/health`

UI now reports backend type (`ministack` or `localstack`) and endpoint status.

## Terraform and CloudFormation workbench

CloudFormation page includes an IaC Workbench with:

- Terraform native mode
- CloudFormation bridge mode (Terraform creates `aws_cloudformation_stack`)
- Actions: `validate`, `plan`, `apply`, `destroy`

Requirements:

- MiniStack/LocalStack running
- Terraform CLI available where Next.js runs
  - Docker Compose mode: already included in `localstack-ui` container image
  - Local `npm run dev` mode: install Terraform on your host machine
- Docker running (for EC2 container simulation flows)

## EKS Lab (local k3s + EC2 + autoscaling + API Gateway)

The app includes an **EKS Lab** section (`/services/eks`) that simulates:

- Kubernetes control plane using `k3s`
- Worker nodes as EC2-emulated Docker containers
- Manual and policy-driven autoscaling (`target CPU`)
- Sample app deployment (NodePort)
- API Gateway proxy exposure to the sample app

Main API routes:

- `GET /api/eks/clusters`
- `POST /api/eks/clusters`
- `PATCH /api/eks/clusters/:clusterId` with actions:
  - `scale`
  - `reconcile-autoscaling`
  - `deploy-sample-app`
  - `expose-api-gateway`
- `DELETE /api/eks/clusters/:clusterId`

Notes:

- This is a learning/runtime simulation, not full AWS EKS parity.
- Docker Compose mode mounts `/var/run/docker.sock` in the UI container to orchestrate node containers.

## Project structure

Current structure is monolithic by design, but modular:

- `app/` pages and routes
- `app/api/` server handlers
- `lib/aws/` runtime config and emulator adapters
- `components/services/` UI by AWS service
- `components/layout/` shell and layout
- `hooks/` React Query hooks
- `types/` shared contracts

## Troubleshooting

Check containers:

```bash
docker ps
docker compose logs -f
```

Check emulator health:

```bash
curl http://localhost:4566/_ministack/health
```

Check app health proxy:

```bash
curl http://localhost:4563/api/health
```

If Terraform Workbench shows unavailable:

```bash
terraform version
```

If needed, restart stack:

```bash
docker compose down
docker compose up --build
```
