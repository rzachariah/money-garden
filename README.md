# Money Garden

Money Garden is now a Next.js web app with Clerk authentication and a first
"money leaks" dashboard. Users sign in, upload a Monarch-style CSV export, and
get an immediate spend analysis without linking bank accounts.

## What is built

- Clerk-powered sign-in and sign-up flows
- Protected `/dashboard` route
- CSV upload form
- Server-side transaction parsing and classification
- First-pass money leaks analysis:
  - top categories
  - top merchants
  - repeat merchants
  - quick discretionary purchases under $40
  - next-action recommendations

Uploads are analyzed for the current request only. This MVP does not persist
files or results yet, which keeps the AWS footprint small.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file with your Clerk keys:

   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## AWS deployment

This repo now includes a CDK deployment path that packages the Next.js app as a
container and runs it on ECS Fargate behind an Application Load Balancer.

Tradeoff: this is a straightforward CDK setup, but it is not the cheapest AWS
shape. If your top priority is minimizing cost, Amplify is still the better
fit. ECS + ALB is more infrastructure and will usually cost meaningfully more
than a near-zero-traffic static or Amplify-style setup.

### CDK prerequisites

- AWS CLI configured against your account
- Docker running locally
- CDK bootstrap completed in your target account/region

Bootstrap once per account/region:

```bash
npx cdk bootstrap
```

### Deploy with CDK

Install dependencies:

```bash
npm install
```

Deploy the stack and pass your Clerk values as CloudFormation parameters:

```bash
npx cdk deploy \
  --parameters ClerkPublishableKey=pk_test_... \
  --parameters ClerkSecretKey=sk_test_... \
  --parameters ClerkSignInUrl=/sign-in \
  --parameters ClerkSignUpUrl=/sign-up
```

The stack outputs an `AppUrl` value for the load balancer.

### Runtime environment

The ECS service sets:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

For your current MVP shape, keep it simple:

- no database yet
- no stored uploads
- no background workers
- no bank sync

## Existing CLI previews

The original CLI preview flows still work:

```bash
npm run preview -- --input data/sample_transactions.csv
npm run monthly-preview -- --input data/sample_transactions.csv
```

## Private data

Use `config/budgets.private.json` and `data/sample_transactions.private.csv` for
real data. These files are gitignored. The committed samples live in
`config/budgets.json` and `data/sample_transactions.csv`.
