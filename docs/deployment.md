# Deployment

The platform is deployed to AWS with the AWS CDK. Everything ships from a single
CDK app (`infrastructure/`) into region **ca-central-1**.

## Stacks

| Stack                        | Contents                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| `CloudGtmDataStack`          | DynamoDB single table (`CloudGtmTable`) with three GSIs.             |
| `CloudGtmSecretsStack`       | Secrets Manager secret for the Gemini API key.                       |
| `CloudGtmApiStack`           | Node.js 22 Lambda (bundled with esbuild) behind an HTTP API Gateway. |
| `CloudGtmFrontendStack`      | Private S3 bucket + CloudFront distribution serving the SPA.         |
| `CloudGtmObservabilityStack` | CloudWatch dashboard and alarms for the API and Lambda.              |

### Request flow

The browser only ever talks to **one origin** — the CloudFront distribution:

- `/*` is served from the private S3 bucket (via Origin Access Control). SPA deep
  links fall back to `index.html`.
- `/api/*` is proxied to the HTTP API Gateway. Because it is same-origin, the SPA
  needs no CORS and is built with `VITE_API_BASE_URL=/api`.

## One-time setup

All commands assume the `cloud-gtm` SSO profile and region `ca-central-1`.

```bash
aws sso login --profile cloud-gtm
export AWS_PROFILE=cloud-gtm
export AWS_REGION=ca-central-1
```

### 1. Bootstrap the environment

CDK needs a bootstrap stack (asset bucket, roles) once per account/region:

```bash
pnpm --filter @cloud-gtm/infrastructure bootstrap
```

### 2. Set the Gemini API key

The `SecretsStack` creates the secret container; the value is written out of band
so it never lands in git or CloudFormation state:

```bash
aws secretsmanager put-secret-value \
  --secret-id cloud-gtm/gemini-api-key \
  --secret-string 'YOUR_GEMINI_API_KEY' \
  --profile cloud-gtm --region ca-central-1
```

(The secret must exist first — deploy `CloudGtmSecretsStack`, or run a full deploy,
before setting the value.)

### 3. Wire GitHub Actions OIDC

CI deploys by assuming an IAM role via GitHub's OIDC provider — no long-lived keys.

1. Create the GitHub OIDC provider in the account (once):
   `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. Create a deploy role whose trust policy is restricted to this repo and the
   `production` environment:

   ```json
   {
     "Effect": "Allow",
     "Principal": {
       "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
     },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringEquals": {
         "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
         "token.actions.githubusercontent.com:sub": "repo:ivashchenko999/cloud-gtm-intelligence-platform:environment:production"
       }
     }
   }
   ```

3. Grant the role permission to deploy CDK (it assumes the CDK bootstrap roles). A
   simple starting point is to allow `sts:AssumeRole` on
   `arn:aws:iam::<ACCOUNT_ID>:role/cdk-*`.
4. In the GitHub repo, add a `production` environment and set the repository
   secret **`AWS_DEPLOY_ROLE_ARN`** to the role ARN.

## Deploying

### From CI (default)

Every push to `main` runs the `quality` job (format, lint, typecheck, test,
build). When it passes, the `deploy` job builds the app, runs
`cdk deploy --all`, and executes the post-deploy smoke tests against the live
CloudFront URL. Pull requests stop at `quality` and never deploy.

### Manually

```bash
pnpm build                                   # build the SPA into apps/web/dist
pnpm --filter @cloud-gtm/infrastructure deploy
```

The public URL is printed as the `CloudGtmFrontendStack.SiteUrl` output.

## Smoke tests

The smoke test verifies the SPA shell and `GET /api/health` are both reachable,
retrying while CloudFront propagates:

```bash
# Against an explicit URL
SMOKE_URL=https://dxxxx.cloudfront.net pnpm --filter @cloud-gtm/infrastructure smoke

# Or from a cdk outputs file
pnpm --filter @cloud-gtm/infrastructure deploy -- --outputs-file cdk-outputs.json
pnpm --filter @cloud-gtm/infrastructure smoke cdk-outputs.json
```

## Teardown

All stateful resources use a `DESTROY` removal policy, so the environment is fully
disposable:

```bash
pnpm --filter @cloud-gtm/infrastructure destroy
```
