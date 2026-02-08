const fs = require("fs");
const path = require("path");
const { parse } = require("date-fns");

const { readCsv } = require("../ingest/readCsv");
const { classifyTransaction } = require("../budget/classify");
const { getMonthRange } = require("../utils/date");
const {
  buildMonthlySummary,
  buildMonthlyEmailHtml,
  buildMonthlyEmailText
} = require("../digest/monthlyEmail");

function loadConfig() {
  const configPath = path.resolve(process.cwd(), "config", "budgets.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function findLatestCsv(dataDir) {
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .map((file) => {
      const fullPath = path.join(dataDir, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error(`No CSV files found in ${dataDir}`);
  }
  return files[0].fullPath;
}

function parseMonthArg(args) {
  const index = args.findIndex((arg) => arg === "--month");
  if (index === -1 || !args[index + 1]) return null;
  return args[index + 1];
}

function main() {
  const config = loadConfig();
  const dataDir = path.resolve(process.cwd(), "data");
  const outputDir = path.resolve(process.cwd(), "out");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const inputArgIndex = process.argv.findIndex((arg) => arg === "--input");
  const inputPath =
    inputArgIndex !== -1 && process.argv[inputArgIndex + 1]
      ? path.resolve(process.argv[inputArgIndex + 1])
      : findLatestCsv(dataDir);

  const rawTransactions = readCsv(inputPath);
  const transactions = rawTransactions.map((tx) =>
    classifyTransaction(tx, config)
  );

  if (!transactions.length) {
    throw new Error("No transactions found in CSV.");
  }

  const monthArg = parseMonthArg(process.argv);
  const latestDate = transactions
    .map((tx) => tx.date)
    .sort((a, b) => b - a)[0];
  const monthDate = monthArg
    ? parse(monthArg, "yyyy-MM", new Date())
    : latestDate;

  const { start: monthStart, end: monthEnd } = getMonthRange(monthDate);
  const scope = (config.monthlyScope || "shared").toLowerCase();
  const sharedTx = transactions.filter((tx) => {
    if (tx.date < monthStart || tx.date > monthEnd) return false;
    if (scope === "shared" && !tx.includeInShared) return false;
    if (tx.excludedFromBudgets) return false;
    if (config.netRefunds) return true;
    return tx.isExpense;
  });

  const summary = buildMonthlySummary(sharedTx, config, monthStart, monthEnd);
  const text = buildMonthlyEmailText(summary);
  const html = buildMonthlyEmailHtml(summary);

  const monthLabel = monthStart.toISOString().slice(0, 7);
  const scopeLabel = scope === "all" ? "all" : "shared";
  const textPath = path.join(outputDir, `monthly_${monthLabel}_${scopeLabel}.txt`);
  const htmlPath = path.join(outputDir, `monthly_${monthLabel}_${scopeLabel}.html`);

  fs.writeFileSync(textPath, text + "\n", "utf8");
  fs.writeFileSync(htmlPath, html + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote monthly preview to ${textPath} and ${htmlPath}`);
}

main();

