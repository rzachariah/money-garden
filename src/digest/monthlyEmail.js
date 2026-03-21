const { format } = require("date-fns");
const { formatCurrency, formatCurrencyShort } = require("../utils/format");

function sumAmounts(transactions) {
  return transactions.reduce((total, tx) => total + tx.absAmount, 0);
}

function getTypeTotals(transactions) {
  const totals = { type1: 0, type2: 0, type3: 0 };
  for (const tx of transactions) {
    totals[tx.type] += tx.absAmount;
  }
  return totals;
}

function getTopGroups(transactions, keyFn, limit = 5) {
  const totals = new Map();
  for (const tx of transactions) {
    const key = keyFn(tx);
    totals.set(key, (totals.get(key) || 0) + tx.absAmount);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, total]) => ({ name, total }));
}

function buildNetTotals(transactions, keyFn) {
  const totals = new Map();
  for (const tx of transactions) {
    const key = keyFn(tx);
    totals.set(key, (totals.get(key) || 0) + tx.amount);
  }
  return totals;
}

function getNetGroups(netTotals, limit = 5) {
  return [...netTotals.entries()]
    .filter(([, total]) => total < 0)
    .map(([name, total]) => ({ name, total: -total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function getMonthLabel(monthStart) {
  return format(monthStart, "MMMM yyyy");
}

function buildMonthlySummary(sharedTx, config, monthStart, monthEnd) {
  const scope = (config.monthlyScope || "shared").toLowerCase();
  const scopeLabel = scope === "all" ? "All owners" : "Shared";
  const useNet = Boolean(config.netRefunds);

  if (!useNet) {
    const monthSpend = sumAmounts(sharedTx);
    const typeTotals = getTypeTotals(sharedTx);
    const topCategories = getTopGroups(sharedTx, (tx) => tx.displayCategory, 5);
    const topMerchants = getTopGroups(sharedTx, (tx) => tx.merchant, 5);

    return {
      monthLabel: getMonthLabel(monthStart),
      scopeLabel,
      monthStart,
      monthEnd,
      monthSpend,
      typeTotals,
      topCategories,
      topMerchants,
      budgets: config.monthlyBudgetsByType
    };
  }

  const categoryNetTotals = buildNetTotals(sharedTx, (tx) => tx.displayCategory);
  const merchantNetTotals = buildNetTotals(sharedTx, (tx) => tx.merchant);

  const typeTotals = { type1: 0, type2: 0, type3: 0 };
  for (const [category, total] of categoryNetTotals.entries()) {
    if (total >= 0) continue;
    const type = config.typeMappings[category] || "type2";
    typeTotals[type] += -total;
  }

  const monthSpend =
    typeTotals.type1 + typeTotals.type2 + typeTotals.type3;
  const topCategories = getNetGroups(categoryNetTotals, 5);
  const topMerchants = getNetGroups(merchantNetTotals, 5);

  return {
    monthLabel: getMonthLabel(monthStart),
    scopeLabel,
    monthStart,
    monthEnd,
    monthSpend,
    typeTotals,
    topCategories,
    topMerchants,
    budgets: config.monthlyBudgetsByType
  };
}

function buildMonthlyEmailText(summary) {
  const planTitle = `${summary.monthLabel} gentle plan:`;
  const lines = [
    `Money Garden - ${summary.monthLabel} Summary`,
    "",
    `${summary.scopeLabel} spend: ${formatCurrency(summary.monthSpend)}`,
    `Type1: ${formatCurrencyShort(summary.typeTotals.type1)} / ${formatCurrencyShort(summary.budgets.type1)}`,
    `Type2: ${formatCurrencyShort(summary.typeTotals.type2)} / ${formatCurrencyShort(summary.budgets.type2)}`,
    `Type3: ${formatCurrencyShort(summary.typeTotals.type3)} / ${formatCurrencyShort(summary.budgets.type3)}`,
    "",
    "Top categories:",
    ...summary.topCategories.map(
      (item) => `- ${item.name}: ${formatCurrency(item.total)}`
    ),
    "",
    "Top merchants:",
    ...summary.topMerchants.map(
      (item) => `- ${item.name}: ${formatCurrency(item.total)}`
    ),
    "",
    planTitle,
    "- Trader Joe's-first baseline shop (protein + frozen + staples)",
    "- 0-1 Whole Foods trip for joy items only",
    "- No midweek emergency grocery runs",
    "- Pick 1-2 treats and name them",
    "",
    "Gentle note: Keep the cadence light and consistent. Small course corrections add up."
  ];

  return lines.join("\n");
}

function buildMonthlyEmailHtml(summary) {
  const planTitle = `${summary.monthLabel} gentle plan`;
  const categoryRows = summary.topCategories
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td style="text-align:right">${formatCurrency(item.total)}</td></tr>`
    )
    .join("");
  const merchantRows = summary.topMerchants
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td style="text-align:right">${formatCurrency(item.total)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Money Garden - ${summary.monthLabel} Summary</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f4;font-family:Arial, sans-serif;color:#1f2d24;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="background:#ffffff;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,0.08);padding:36px;">
          <tr>
            <td style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#5c6b60;">Money Garden</td>
          </tr>
          <tr>
            <td style="font-size:28px;font-weight:600;padding-top:8px;">${summary.monthLabel} Summary</td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-size:15px;color:#6a776f;">Calm check-in and gentle course corrections.</td>
          </tr>
          <tr>
            <td style="padding-top:16px;font-size:16px;line-height:1.5;">
              ${summary.scopeLabel} spend this month: <strong>${formatCurrency(summary.monthSpend)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding-top:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f2;border-radius:10px;padding:16px;">
                <tr>
                  <td style="font-size:14px;color:#5c6b60;">Type 1</td>
                  <td style="text-align:right;font-weight:600;">${formatCurrencyShort(summary.typeTotals.type1)} / ${formatCurrencyShort(summary.budgets.type1)}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#5c6b60;">Type 2</td>
                  <td style="text-align:right;font-weight:600;">${formatCurrencyShort(summary.typeTotals.type2)} / ${formatCurrencyShort(summary.budgets.type2)}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#5c6b60;">Type 3</td>
                  <td style="text-align:right;font-weight:600;">${formatCurrencyShort(summary.typeTotals.type3)} / ${formatCurrencyShort(summary.budgets.type3)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:16px;font-weight:600;">Top categories</td>
          </tr>
          <tr>
            <td style="padding-top:8px;">
              <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e1e6df;">
                ${categoryRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:16px;font-weight:600;">Top merchants</td>
          </tr>
          <tr>
            <td style="padding-top:8px;">
              <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e1e6df;">
                ${merchantRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:16px;font-weight:600;">${planTitle}</td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-size:15px;line-height:1.6;color:#445148;">
              <ul style="margin:0;padding-left:18px;">
                <li>Trader Joe's-first baseline shop (protein + frozen + staples).</li>
                <li>0-1 Whole Foods trip for joy items only.</li>
                <li>No midweek emergency grocery runs.</li>
                <li>Pick 1-2 treats and name them.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:15px;line-height:1.5;color:#4e5a52;">
              Gentle note: Keep the cadence light and consistent. Small course corrections add up.
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:12px;color:#8a978f;">
              This is a preview generated by Money Garden. SMS digests continue weekly.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  buildMonthlySummary,
  buildMonthlyEmailHtml,
  buildMonthlyEmailText
};
