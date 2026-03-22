const {
  differenceInCalendarDays,
  format,
  startOfMonth
} = require("date-fns");
const { classifyTransaction } = require("../budget/classify");

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

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

function getMonthKey(date) {
  return format(date, "yyyy-MM");
}

function getMonthlyBreakdown(transactions) {
  const totalsByMonth = new Map();

  for (const tx of transactions) {
    const monthKey = getMonthKey(tx.date);
    const monthBucket =
      totalsByMonth.get(monthKey) || {
        total: 0,
        categories: new Map(),
        merchants: new Map()
      };

    monthBucket.total += tx.absAmount;
    monthBucket.categories.set(
      tx.displayCategory,
      (monthBucket.categories.get(tx.displayCategory) || 0) + tx.absAmount
    );
    monthBucket.merchants.set(
      tx.merchant || "Unknown",
      (monthBucket.merchants.get(tx.merchant || "Unknown") || 0) + tx.absAmount
    );

    totalsByMonth.set(monthKey, monthBucket);
  }

  return totalsByMonth;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getTopTrendChange(currentMap, priorMaps, limit = 3) {
  const labels = new Set(currentMap.keys());
  for (const bucket of priorMaps) {
    for (const label of bucket.keys()) {
      labels.add(label);
    }
  }

  return [...labels]
    .map((label) => {
      const currentTotal = currentMap.get(label) || 0;
      const baseline = average(priorMaps.map((bucket) => bucket.get(label) || 0));
      return {
        label,
        currentTotal,
        baseline,
        delta: currentTotal - baseline
      };
    })
    .filter((item) => item.currentTotal > 0 && item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

function getSteadyDrains(currentMap, priorMaps, limit = 3) {
  return [...currentMap.entries()]
    .map(([label, currentTotal]) => {
      const monthCount = priorMaps.reduce(
        (count, bucket) => count + ((bucket.get(label) || 0) > 0 ? 1 : 0),
        currentTotal > 0 ? 1 : 0
      );
      const baseline = average(priorMaps.map((bucket) => bucket.get(label) || 0));

      return {
        label,
        currentTotal,
        baseline,
        monthCount
      };
    })
    .filter((item) => item.monthCount >= 3 && item.currentTotal >= 25)
    .sort((a, b) => b.currentTotal - a.currentTotal)
    .slice(0, limit);
}

function getUploadSpanLabel(earliestDate, latestDate) {
  const dayCount = differenceInCalendarDays(latestDate, earliestDate) + 1;
  return `${dayCount} days · ${format(earliestDate, "MMM d, yyyy")} to ${format(
    latestDate,
    "MMM d, yyyy"
  )}`;
}

function buildSnapshotInsights({
  currentMonthTransactions,
  earliestDate,
  latestDate,
  topCategories,
  recurringMerchants,
  quickHits
}) {
  const insights = [
    `Snapshot review from ${format(earliestDate, "MMM d")} to ${format(
      latestDate,
      "MMM d"
    )}. This upload is strong for a calm monthly read, but not yet for trend claims.`
  ];
  const recommendations = [];

  if (topCategories[0]) {
    insights.push(
      `${topCategories[0].label} led flexible spend this month at ${formatCurrency(topCategories[0].total)}.`
    );
    recommendations.push(
      `Review ${topCategories[0].label} first. It is the biggest place to trim without changing everything at once.`
    );
  }

  if (recurringMerchants[0]) {
    insights.push(
      `${recurringMerchants[0].label} showed up ${recurringMerchants[0].count} times in the month for ${formatCurrency(
        recurringMerchants[0].total
      )}.`
    );
    recommendations.push(
      `Look at ${recurringMerchants[0].label}. Repeated charges in a single month usually point to a habit worth inspecting.`
    );
  }

  if (quickHits.length >= 3) {
    const quickHitTotal = sumAmounts(
      currentMonthTransactions.filter(
        (tx) => tx.type !== "type1" && tx.absAmount <= 40
      )
    );
    insights.push(
      `Small purchases added up to ${formatCurrency(
        quickHitTotal
      )}. They are easy to miss because none of them feels large on its own.`
    );
    recommendations.push(
      "Try a one-week pause on the under-$40 category that shows up most often. That is the calmest experiment to run next."
    );
  }

  recommendations.push(
    "For stronger change insights, upload at least 3 months next time so Money Garden can compare this month to your recent baseline."
  );

  return { insights, recommendations };
}

function buildTrendInsights({
  earliestDate,
  latestDate,
  currentMonthTotal,
  priorMonthTotals,
  topCategoryChanges,
  steadyDrains
}) {
  const baselineTotal = average(priorMonthTotals);
  const monthDelta = currentMonthTotal - baselineTotal;
  const insights = [
    `Trend review from ${format(earliestDate, "MMM d, yyyy")} to ${format(
      latestDate,
      "MMM d, yyyy"
    )}. This month can be compared against your recent baseline.`
  ];
  const recommendations = [];

  if (baselineTotal > 0) {
    const direction = monthDelta >= 0 ? "above" : "below";
    insights.push(
      `Current-month spend is ${formatCurrency(Math.abs(monthDelta))} ${direction} your recent monthly average of ${formatCurrency(
        baselineTotal
      )}.`
    );
  }

  if (topCategoryChanges[0]) {
    insights.push(
      `${topCategoryChanges[0].label} rose the most, landing at ${formatCurrency(
        topCategoryChanges[0].currentTotal
      )} versus a recent baseline of ${formatCurrency(topCategoryChanges[0].baseline)}.`
    );
    recommendations.push(
      `Start with ${topCategoryChanges[0].label}. It changed the most versus your recent pattern, so it is the clearest review target.`
    );
  }

  if (steadyDrains[0]) {
    insights.push(
      `${steadyDrains[0].label} has been present in ${steadyDrains[0].monthCount} months and cost ${formatCurrency(
        steadyDrains[0].currentTotal
      )} this month.`
    );
    recommendations.push(
      `Review ${steadyDrains[0].label} as a steady drain. Repeated monthly spend is usually easier to simplify than one-off spikes.`
    );
  }

  if (topCategoryChanges[1]) {
    recommendations.push(
      `Check whether ${topCategoryChanges[1].label} is a real change or just a one-off month. If it repeats next month, it becomes a stronger target.`
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "This month is close to your recent baseline. Focus on steady recurring spend instead of chasing isolated spikes."
    );
  }

  return { insights, recommendations };
}

function getMoneyLeaksAnalysis(transactions, config) {
  if (!transactions.length) {
    throw new Error("The CSV did not contain any transactions.");
  }

  const classified = transactions.map((tx) => classifyTransaction(tx, config));
  const sortedDates = classified.map((tx) => tx.date).sort((a, b) => a - b);
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];

  const monthStart = startOfMonth(latestDate);
  const spendTransactions = classified.filter(
    (tx) => tx.isExpense && !tx.excludedFromBudgets
  );
  const currentMonthTransactions = spendTransactions.filter(
    (tx) =>
      tx.date >= monthStart &&
      tx.date <= latestDate
  );
  if (!currentMonthTransactions.length) {
    throw new Error("No spend transactions were available after filtering transfers and income.");
  }

  const typeTotals = getTypeTotals(currentMonthTransactions);
  const totalSpend = sumAmounts(currentMonthTransactions);
  const topCategories = getTopGroups(currentMonthTransactions, (tx) => tx.displayCategory);
  const topMerchants = getTopGroups(currentMonthTransactions, (tx) => tx.merchant);
  const recurringMerchants = getRecurringMerchants(currentMonthTransactions);
  const quickHits = getQuickHits(currentMonthTransactions);
  const monthlyBreakdown = getMonthlyBreakdown(spendTransactions);
  const currentMonthKey = getMonthKey(latestDate);
  const priorMonthKeys = [...monthlyBreakdown.keys()]
    .filter((key) => key !== currentMonthKey)
    .sort();
  const reviewMode = priorMonthKeys.length >= 2 ? "trend" : "snapshot";

  let insights;
  let recommendations;

  if (reviewMode === "trend") {
    const currentMonthBucket = monthlyBreakdown.get(currentMonthKey);
    const priorMonthBuckets = priorMonthKeys.map((key) => monthlyBreakdown.get(key));
    const topCategoryChanges = getTopTrendChange(
      currentMonthBucket.categories,
      priorMonthBuckets.map((bucket) => bucket.categories)
    );
    const steadyDrains = getSteadyDrains(
      currentMonthBucket.merchants,
      priorMonthBuckets.map((bucket) => bucket.merchants)
    );
    ({ insights, recommendations } = buildTrendInsights({
      earliestDate,
      latestDate,
      currentMonthTotal: currentMonthBucket.total,
      priorMonthTotals: priorMonthBuckets.map((bucket) => bucket.total),
      topCategoryChanges,
      steadyDrains
    }));
  } else {
    ({ insights, recommendations } = buildSnapshotInsights({
      currentMonthTransactions,
      earliestDate,
      latestDate,
      topCategories,
      recurringMerchants,
      quickHits
    }));
  }

  return {
    reviewMode,
    reviewModeLabel: reviewMode === "trend" ? "Trend review" : "Snapshot review",
    uploadSpanLabel: getUploadSpanLabel(earliestDate, latestDate),
    historyDepthLabel:
      reviewMode === "trend"
        ? `${priorMonthKeys.length + 1} months of history`
        : "Single-month style review",
    monthLabel: format(monthStart, "MMMM yyyy"),
    latestDate: latestDate.toISOString(),
    earliestDate: earliestDate.toISOString(),
    totalSpend,
    budgets: config.monthlyBudgetsByType,
    typeTotals,
    topCategories,
    topMerchants,
    recurringMerchants,
    quickHits,
    insights,
    recommendations
  };
}

module.exports = { getMoneyLeaksAnalysis };
