import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Money Garden</p>
          <h1>Upload your transactions and find the leaks worth fixing first.</h1>
          <p className="lede">
            Money Garden turns a Monarch-style CSV into a calm monthly review:
            your biggest spending leaks, repeat merchants, quick-hit purchases,
            and one practical next action.
          </p>
          <div className="hero-actions">
            {userId ? (
              <>
                <Link className="primary-button" href="/dashboard">
                  Open dashboard
                </Link>
                <div className="user-pill">
                  <UserButton />
                </div>
              </>
            ) : (
              <>
              <SignInButton mode="modal">
                <button className="primary-button" type="button">
                  Sign In
                </button>
              </SignInButton>
              <Link className="ghost-button" href="/sign-up">
                Create account
              </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-panel">
          <div className="stat-card">
            <span className="stat-label">What it analyzes</span>
            <strong>Money leaks</strong>
            <p>Top categories, top merchants, repeat habits, and small spend creep.</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">What you upload</span>
            <strong>CSV exports</strong>
            <p>Use a Monarch-style transaction export. No bank connection required.</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Why this shape</span>
            <strong>Low-cost MVP</strong>
            <p>No database or background jobs yet. Good fit for lightweight AWS hosting.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
