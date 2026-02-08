function normalizeCategory(value) {
  return String(value || "").trim();
}

function isExcludedCategory(category, config) {
  return config.excludeCategories.includes(category);
}

function matchesAllowance(merchant, category, amount, config) {
  const allowance = config.allowance;
  if (!allowance) return false;
  if (normalizeCategory(category) !== allowance.category) return false;
  if (amount >= 0) return false;
  const merchantMatch = String(merchant || "")
    .toLowerCase()
    .includes(allowance.merchantIncludes.toLowerCase());
  if (!merchantMatch) return false;
  const delta = Math.abs(Math.abs(amount) - allowance.weeklyAmount);
  return delta < 0.01;
}

function classifyTransaction(tx, config) {
  const category = normalizeCategory(tx.category);
  const type = config.typeMappings[category] || "type2";
  const isExpense = tx.amount < 0;
  const isAllowanceTransfer = matchesAllowance(
    tx.merchant,
    category,
    tx.amount,
    config
  );
  const excluded = isExcludedCategory(category, config);

  return {
    ...tx,
    category,
    type,
    isExpense,
    absAmount: Math.abs(tx.amount),
    isAllowanceTransfer,
    excludedFromBudgets: excluded && !isAllowanceTransfer,
    includeInShared: tx.owner === "Shared" || isAllowanceTransfer,
    displayCategory: isAllowanceTransfer ? "Personal (allowance)" : category
  };
}

module.exports = { classifyTransaction };


