const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function formatCurrencyShort(amount) {
  if (amount >= 1000) {
    const rounded = Math.round((amount / 1000) * 10) / 10;
    return `$${rounded}k`;
  }
  return formatCurrency(amount);
}

function formatPercent(value) {
  const pct = Math.round(value * 100);
  return `${pct}%`;
}

module.exports = {
  formatCurrency,
  formatCurrencyShort,
  formatPercent
};


