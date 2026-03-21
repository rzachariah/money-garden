const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { isValid, parse: parseDate } = require("date-fns");

function parseAmount(value) {
  const normalized = String(value || "").replace(/,/g, "").trim();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount "${value}"`);
  }
  return amount;
}

function parseRow(row, index) {
  const date = parseDate(row.Date, "yyyy-MM-dd", new Date());
  if (!isValid(date)) {
    throw new Error(`Invalid date on row ${index + 2}: "${row.Date}"`);
  }

  return {
    date,
    merchant: row.Merchant,
    category: row.Category,
    account: row.Account,
    originalStatement: row["Original Statement"],
    notes: row.Notes,
    amount: parseAmount(row.Amount),
    tags: row.Tags,
    owner: row.Owner
  };
}

function parseCsvContent(content) {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records.map(parseRow);
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return parseCsvContent(content);
}

module.exports = { parseCsvContent, readCsv };
