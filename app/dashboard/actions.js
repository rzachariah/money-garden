"use server";

import { auth } from "@clerk/nextjs/server";

const { parseCsvContent } = require("../../src/ingest/readCsv");
const { loadBudgetConfig } = require("../../src/config/loadBudgetConfig");
const { getMoneyLeaksAnalysis } = require("../../src/analysis/moneyLeaks");

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export async function analyzeUpload(previousState, formData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "You need to sign in before uploading a CSV." };
  }

  const file = formData.get("transactions");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file before running the analysis." };
  }

  try {
    const content = await file.text();
    const transactions = parseCsvContent(content);
    const config = loadBudgetConfig();
    const analysis = getMoneyLeaksAnalysis(transactions, config);

    return {
      error: null,
      fileName: file.name,
      summary: {
        ...analysis,
        totalSpendLabel: formatCurrency(analysis.totalSpend),
        typeTotalsLabel: {
          type1: formatCurrency(analysis.typeTotals.type1),
          type2: formatCurrency(analysis.typeTotals.type2),
          type3: formatCurrency(analysis.typeTotals.type3)
        },
        budgetsLabel: {
          type1: formatCurrency(analysis.budgets.type1),
          type2: formatCurrency(analysis.budgets.type2),
          type3: formatCurrency(analysis.budgets.type3)
        },
        topCategories: analysis.topCategories.map((item) => ({
          ...item,
          totalLabel: formatCurrency(item.total)
        })),
        topMerchants: analysis.topMerchants.map((item) => ({
          ...item,
          totalLabel: formatCurrency(item.total)
        })),
        recurringMerchants: analysis.recurringMerchants.map((item) => ({
          ...item,
          totalLabel: formatCurrency(item.total)
        })),
        quickHits: analysis.quickHits.map((item) => ({
          ...item,
          totalLabel: formatCurrency(item.total)
        }))
      }
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The upload could not be analyzed."
    };
  }
}
