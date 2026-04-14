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
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Health polling interval (ms) | `5000` |

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
- Terraform CLI installed on the machine where Next.js runs
- Docker running (for EC2 container simulation flows)

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
