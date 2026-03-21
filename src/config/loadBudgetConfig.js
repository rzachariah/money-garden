const fs = require("fs");
const path = require("path");

function resolveConfigPath() {
  const privatePath = path.resolve(process.cwd(), "config", "budgets.private.json");
  if (fs.existsSync(privatePath)) {
    return privatePath;
  }

  return path.resolve(process.cwd(), "config", "budgets.json");
}

function loadBudgetConfig() {
  return JSON.parse(fs.readFileSync(resolveConfigPath(), "utf8"));
}

module.exports = { loadBudgetConfig, resolveConfigPath };
