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

The cheapest path is AWS Amplify hosting a Next.js app.

- Build command: `npm run build`
- Start command: `npm start`
- Runtime env vars:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

For your stated goal of keeping cost around $1/month, stay with this shape:

- no database yet
- no stored uploads
- no background workers
- no bank sync

Amplify hosting plus low traffic is the most realistic way to keep the bill
near that range, but AWS can still exceed it depending on traffic and build
frequency, so this is a best-effort cost posture rather than a guarantee.

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
