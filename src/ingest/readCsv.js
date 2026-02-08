const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { parse: parseDate } = require("date-fns");

function parseAmount(value) {
  const normalized = String(value || "").replace(/,/g, "").trim();
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records.map((row) => ({
    date: parseDate(row.Date, "yyyy-MM-dd", new Date()),
    merchant: row.Merchant,
    category: row.Category,
    account: row.Account,
    originalStatement: row["Original Statement"],
    notes: row.Notes,
    amount: parseAmount(row.Amount),
    tags: row.Tags,
    owner: row.Owner
  }));
}

module.exports = { readCsv };

