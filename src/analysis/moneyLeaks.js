const { format, startOfMonth } = require("date-fns");
const { classifyTransaction } = require("../budget/classify");

function sumAmounts(transactions) {
  return transactions.reduce((total, tx) => total + tx.absAmount, 0);
}

function getTopGroups(transactions, keyFn, limit = 5) {
  const totals = new Map();

  for (const tx of transactions) {
    const key = keyFn(tx) || "Unknown";
    totals.set(key, (totals.get(key) || 0) + tx.absAmount);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, total]) => ({ label, total }));
}

function getTypeTotals(transactions) {
  return transactions.reduce(
    (totals, tx) => {
      totals[tx.type] += tx.absAmount;
      return totals;
    },
    { type1: 0, type2: 0, type3: 0 }
  );
}

function getRecurringMerchants(transactions) {
  const groups = new Map();

  for (const tx of transactions) {
    const key = tx.merchant || "Unknown";
    const bucket = groups.get(key) || { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += tx.absAmount;
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      count: value.count,
      total: value.total
    }));
}

function getQuickHits(transactions) {
  return transactions
    .filter((tx) => tx.type !== "type1" && tx.absAmount <= 40)
    .sort((a, b) => b.absAmount - a.absAmount)
    .slice(0, 5)
    .map((tx) => ({
      label: tx.merchant,
      category: tx.displayCategory,
      total: tx.absAmount
    }));
}

function getMoneyLeaksAnalysis(transactions, config) {
  if (!transactions.length) {
    throw new Error("The CSV did not contain any transactions.");
  }

  const classified = transactions.map((tx) => classifyTransaction(tx, config));
  const latestDate = classified
    .map((tx) => tx.date)
    .sort((a, b) => b - a)[0];

  const monthStart = startOfMonth(latestDate);
  const scoped = classified.filter(
    (tx) =>
      tx.date >= monthStart &&
      tx.date <= latestDate &&
      tx.isExpense &&
      !tx.excludedFromBudgets
  );
  if (!scoped.length) {
    throw new Error("No spend transactions were available after filtering transfers and income.");
  }

  const typeTotals = getTypeTotals(scoped);
  const totalSpend = sumAmounts(scoped);
  const topCategories = getTopGroups(scoped, (tx) => tx.displayCategory);
  const topMerchants = getTopGroups(scoped, (tx) => tx.merchant);
  const recurringMerchants = getRecurringMerchants(scoped);
  const quickHits = getQuickHits(scoped);

  const recommendations = [];
  if (topCategories[0]) {
    recommendations.push(
      `Focus on ${topCategories[0].label}. It is your biggest leak this month at $${Math.round(topCategories[0].total)}.`
    );
  }
  if (recurringMerchants[0]) {
    recommendations.push(
      `${recurringMerchants[0].label} appeared ${recurringMerchants[0].count} times this month. That is a good habit to inspect.`
    );
  }
  if (quickHits.length >= 3) {
    recommendations.push(
      `You have ${quickHits.length} smaller discretionary purchases under $40. Those are usually the easiest cuts without changing your whole lifestyle.`
    );
  }
  if (!recommendations.length) {
    recommendations.push("No single leak dominates this upload yet. Keep an eye on repeat merchants and pace drift.");
  }

  return {
    monthLabel: format(monthStart, "MMMM yyyy"),
    latestDate: latestDate.toISOString(),
    totalSpend,
    budgets: config.monthlyBudgetsByType,
    typeTotals,
    topCategories,
    topMerchants,
    recurringMerchants,
    quickHits,
    recommendations
  };
}

module.exports = { getMoneyLeaksAnalysis };
