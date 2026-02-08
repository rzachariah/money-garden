const { startOfMonth, endOfMonth } = require("date-fns");
const { formatCurrency, formatCurrencyShort } = require("../utils/format");
const { getWeekRangeLabel } = require("../utils/date");

function sumAmounts(transactions) {
  return transactions.reduce((total, tx) => total + tx.absAmount, 0);
}

function getTopGroups(transactions, limit = 3) {
  const totals = new Map();
  for (const tx of transactions) {
    const key = tx.displayCategory;
    totals.set(key, (totals.get(key) || 0) + tx.absAmount);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, total]) => `${name} ${formatCurrency(total)}`);
}

function getSharedStatus(weeklySpend, weeklyBudget) {
  if (weeklySpend <= weeklyBudget) return "on track";
  return "a bit over";
}

function getTypeTotals(transactions) {
  const totals = { type1: 0, type2: 0, type3: 0 };
  for (const tx of transactions) {
    totals[tx.type] += tx.absAmount;
  }
  return totals;
}

function getNudge(type2Spend, type2Budget, weekEnd) {
  const monthStart = startOfMonth(weekEnd);
  const monthEnd = endOfMonth(weekEnd);
  const daysElapsed = Math.max(
    1,
    Math.ceil((weekEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1
  );
  const totalDays = Math.ceil((monthEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1;
  const expectedToDate = (type2Budget * daysElapsed) / totalDays;

  if (daysElapsed <= 7) {
    return "Early-month totals can be lumpy; keep the cadence gentle.";
  }
  if (type2Spend > expectedToDate * 1.1) {
    return "Type 2 is a bit ahead of pace. One low-key week keeps it on track.";
  }
  if (type2Spend < expectedToDate * 0.9) {
    return "Type 2 is under pace; keep the rhythm steady.";
  }
  return "Type 2 pacing looks steady. Keep tending the small habits.";
}

function buildSharedDigest(week, allTransactions, config) {
  const weekTx = allTransactions.filter(
    (tx) =>
      tx.date >= week.start &&
      tx.date <= week.end &&
      tx.includeInShared &&
      tx.isExpense &&
      !tx.excludedFromBudgets
  );

  const weekSpend = sumAmounts(weekTx);
  const weeklyBudget = config.weeklySharedBudget;
  const monthStart = startOfMonth(week.end);
  const monthTx = allTransactions.filter(
    (tx) =>
      tx.date >= monthStart &&
      tx.date <= week.end &&
      tx.includeInShared &&
      tx.isExpense &&
      !tx.excludedFromBudgets
  );
  const typeTotals = getTypeTotals(monthTx);
  const topCategories = getTopGroups(weekTx, 3);
  const nudge = getNudge(typeTotals.type2, config.monthlyBudgetsByType.type2, week.end);

  const lines = [
    `Money Garden - ${getWeekRangeLabel(week.start, week.end)}`,
    `Shared spend: ${formatCurrency(weekSpend)} (budget ${formatCurrency(weeklyBudget)}, ${getSharedStatus(weekSpend, weeklyBudget)})`,
    `MTD - Type1: ${formatCurrencyShort(typeTotals.type1)} / ${formatCurrencyShort(config.monthlyBudgetsByType.type1)} | Type2: ${formatCurrencyShort(typeTotals.type2)} / ${formatCurrencyShort(config.monthlyBudgetsByType.type2)} | Type3: ${formatCurrencyShort(typeTotals.type3)} / ${formatCurrencyShort(config.monthlyBudgetsByType.type3)}`,
    topCategories.length
      ? `Top categories: ${topCategories.join(", ")}`
      : "Top categories: No shared spend recorded",
    `Nudge: ${nudge}`
  ];

  return lines.join("\n");
}

function buildRalucaDigest(week, allTransactions, config, sharedStatus) {
  const allowanceTx = allTransactions.filter(
    (tx) =>
      tx.date >= week.start &&
      tx.date <= week.end &&
      tx.isAllowanceTransfer
  );
  const allowanceTotal = sumAmounts(allowanceTx);
  const allowanceLine = allowanceTotal
    ? `Allowance funded: ${formatCurrency(allowanceTotal)}`
    : "Allowance funded: $0 (no transfer recorded)";

  return [
    "Money Garden - Your week",
    allowanceLine,
    `Household spending is ${sharedStatus}.`
  ].join("\n");
}

function buildRanjithDigest(week, allTransactions, sharedStatus, config) {
  const personalTx = allTransactions.filter(
    (tx) =>
      tx.date >= week.start &&
      tx.date <= week.end &&
      tx.owner === "Ranjith Zachariah" &&
      tx.isExpense &&
      !tx.excludedFromBudgets
  );
  const personalSpend = sumAmounts(personalTx);
  const topCategories = getTopGroups(personalTx, 2);
  const watchlist =
    topCategories.length && personalSpend > 200
      ? `Watchlist: ${topCategories[0]}`
      : null;

  const lines = [
    "Money Garden - Your week",
    `Your spend: ${formatCurrency(personalSpend)}`,
    topCategories.length ? `Top categories: ${topCategories.join(", ")}` : "Top categories: None",
    `Household spending is ${sharedStatus}.`
  ];
  if (watchlist) lines.push(watchlist);

  return lines.join("\n");
}

function buildWeeklyDigests(week, allTransactions, config) {
  const sharedTx = allTransactions.filter(
    (tx) =>
      tx.date >= week.start &&
      tx.date <= week.end &&
      tx.includeInShared &&
      tx.isExpense &&
      !tx.excludedFromBudgets
  );
  const sharedSpend = sumAmounts(sharedTx);
  const sharedStatus = getSharedStatus(sharedSpend, config.weeklySharedBudget);

  return {
    shared: buildSharedDigest(week, allTransactions, config),
    raluca: buildRalucaDigest(week, allTransactions, config, sharedStatus),
    ranjith: buildRanjithDigest(week, allTransactions, sharedStatus, config)
  };
}

module.exports = { buildWeeklyDigests };

