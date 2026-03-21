const fs = require("fs");
const path = require("path");

const { readCsv } = require("../ingest/readCsv");
const { classifyTransaction } = require("../budget/classify");
const { buildWeeklyDigests } = require("../digest/weeklyDigest");
const { loadBudgetConfig } = require("../config/loadBudgetConfig");
const { getWeekStartsOn, getWeeksBetween } = require("../utils/date");

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

function writeDigestFiles(week, digests, outputDir) {
  const weekStart = week.start.toISOString().slice(0, 10);
  const entries = [
    { key: "shared", label: "shared" },
    { key: "raluca", label: "raluca" },
    { key: "ranjith", label: "ranjith" }
  ];

  for (const entry of entries) {
    const filename = `${weekStart}_${entry.label}.txt`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, digests[entry.key] + "\n", "utf8");
  }
}

function main() {
  const config = loadBudgetConfig();
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

  const dates = transactions.map((tx) => tx.date).sort((a, b) => a - b);
  if (!dates.length) {
    throw new Error("No transactions found in CSV.");
  }

  const weekStartsOn = getWeekStartsOn(config.weekStartsOn);
  const weeks = getWeeksBetween(dates[0], dates[dates.length - 1], weekStartsOn);

  for (const week of weeks) {
    const digests = buildWeeklyDigests(week, transactions, config);
    writeDigestFiles(week, digests, outputDir);
  }

  // eslint-disable-next-line no-console
  console.log(`Wrote ${weeks.length * 3} preview files to ${outputDir}`);
}

main();

