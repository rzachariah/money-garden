"use client";

import { useActionState } from "react";
import { analyzeUpload } from "./actions";

const initialState = { error: null, fileName: null, summary: null };

function SectionCard({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function UploadForm() {
  const [state, formAction, isPending] = useActionState(analyzeUpload, initialState);

  return (
    <div className="dashboard-grid">
      <SectionCard title="Upload transactions">
        <form action={formAction} className="upload-form">
          <label className="upload-input">
            <span>Monarch-style CSV export</span>
            <input accept=".csv,text/csv" name="transactions" type="file" />
          </label>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "Analyzing..." : "Analyze money leaks"}
          </button>
        </form>
        <p className="muted">
          This MVP does not store uploads. It analyzes the file for the current request only.
        </p>
        {state.error ? <p className="error-text">{state.error}</p> : null}
        {state.fileName ? <p className="muted">Latest file: {state.fileName}</p> : null}
      </SectionCard>

      <SectionCard title="Money leaks view">
        {state.summary ? (
          <div className="analysis-stack">
            <div className="metric-strip">
              <div className="metric-card">
                <span className="stat-label">Spend analyzed</span>
                <strong>{state.summary.totalSpendLabel}</strong>
                <p>{state.summary.monthLabel}</p>
              </div>
              <div className="metric-card">
                <span className="stat-label">Type 2</span>
                <strong>{state.summary.typeTotalsLabel.type2}</strong>
                <p>Budget {state.summary.budgetsLabel.type2}</p>
              </div>
              <div className="metric-card">
                <span className="stat-label">Type 3</span>
                <strong>{state.summary.typeTotalsLabel.type3}</strong>
                <p>Budget {state.summary.budgetsLabel.type3}</p>
              </div>
            </div>

            <div className="list-grid">
              <div className="list-card">
                <h3>Top categories</h3>
                <ul>
                  {state.summary.topCategories.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.totalLabel}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="list-card">
                <h3>Top merchants</h3>
                <ul>
                  {state.summary.topMerchants.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.totalLabel}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="list-card">
                <h3>Repeat merchants</h3>
                <ul>
                  {state.summary.recurringMerchants.length ? (
                    state.summary.recurringMerchants.map((item) => (
                      <li key={item.label}>
                        <span>
                          {item.label} x{item.count}
                        </span>
                        <strong>{item.totalLabel}</strong>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span>No repeat merchants yet</span>
                    </li>
                  )}
                </ul>
              </div>
              <div className="list-card">
                <h3>Quick hits under $40</h3>
                <ul>
                  {state.summary.quickHits.length ? (
                    state.summary.quickHits.map((item) => (
                      <li key={`${item.label}-${item.category}`}>
                        <span>
                          {item.label} · {item.category}
                        </span>
                        <strong>{item.totalLabel}</strong>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span>No quick-hit purchases in this upload</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="recommendation-card">
              <span className="stat-label">Best next actions</span>
              <ul>
                {state.summary.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="muted">
            Upload a CSV to see the first dashboard. This starts with leak detection,
            not full budgeting or account sync.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
