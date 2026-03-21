import { UserButton } from "@clerk/nextjs";
import { UploadForm } from "./upload-form";

export default function DashboardPage() {
  return (
    <main className="shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Money leaks</h1>
          <p className="lede">
            Upload a transaction CSV and inspect where the month is getting away from you.
          </p>
        </div>
        <div className="user-pill">
          <UserButton />
        </div>
      </section>
      <UploadForm />
    </main>
  );
}
