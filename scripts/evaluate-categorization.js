// Offline evaluation script for the rule-based TransactionCategorizationService
// Uses the labeled WF checking CSV to measure categorization accuracy.

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Load the compiled JS implementation of the service
const { TransactionCategorizationService } = require('../electron/src/data-processing/ai/TransactionCategorizationService');

async function main() {
  const csvPath = path.join(__dirname, '..', 'docs', 'WF_Checking_092025_raw.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  const rows = parsed.data;

  // Build category list from labeled data
  const categoryMap = new Map(); // name -> category
  let nextCategoryId = 1;

  for (const row of rows) {
    const name = (row.category_name_label || '').trim();
    if (!name) continue;

    if (!categoryMap.has(name)) {
      const family = (row.category_family_label || '').toUpperCase();

      // Simple heuristic for category type
      const type =
        family.startsWith('INCOME') ? 'income' :
        'expense';

      categoryMap.set(name, {
        category_id: nextCategoryId++,
        name,
        type,
        parent_category_id: null,
        icon: null
      });
    }
  }

  const availableCategories = Array.from(categoryMap.values());

  // Build payee list and default categories from labeled data
  const payeeMap = new Map(); // payee name -> payee object
  const payeeCategoryCounts = new Map(); // payee name -> Map(categoryName -> count)

  for (const row of rows) {
    const payeeName = (row.payee_label || '').trim();
    const categoryName = (row.category_name_label || '').trim();
    if (!payeeName || !categoryName) continue;

    if (!payeeMap.has(payeeName)) {
      payeeMap.set(payeeName, {
        name: payeeName,
        default_category_id: null
      });
    }

    if (!payeeCategoryCounts.has(payeeName)) {
      payeeCategoryCounts.set(payeeName, new Map());
    }

    const catCounts = payeeCategoryCounts.get(payeeName);
    catCounts.set(categoryName, (catCounts.get(categoryName) || 0) + 1);
  }

  // Assign default_category_id based on most frequent labeled category per payee
  for (const [payeeName, payee] of payeeMap.entries()) {
    const counts = payeeCategoryCounts.get(payeeName);
    if (!counts) continue;

    let bestCategoryName = null;
    let bestCount = 0;
    for (const [catName, count] of counts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestCategoryName = catName;
      }
    }

    if (bestCategoryName && categoryMap.has(bestCategoryName)) {
      payee.default_category_id = categoryMap.get(bestCategoryName).category_id;
    }
  }

  const availablePayees = Array.from(payeeMap.values());

  const service = new TransactionCategorizationService();

  let totalEvaluated = 0;
  let totalCorrect = 0;

  const perCategoryStats = new Map(); // trueCategoryName -> { total, correct }

  for (const row of rows) {
    const trueCategory = (row.category_name_label || '').trim();
    const typeLabel = (row.transaction_type_label || '').trim().toLowerCase();

    // Skip unlabeled or pure transfers (no category)
    if (!trueCategory || typeLabel === 'transfer') {
      continue;
    }

    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) {
      continue;
    }

    const transaction = {
      transaction_id: row.id ? Number(row.id) : undefined,
      account_id: 1,
      date: row.date,
      amount,
      description: row.description_raw || '',
      category_id: null,
      transaction_type: typeLabel || (amount > 0 ? 'income' : 'expense'),
      status: 'cleared',
      payee_id: null
    };

    const result = await service.processTransaction(
      transaction,
      availableCategories,
      availablePayees
    );

    const predicted = result.categoryPredictions[0]?.category;
    const predictedName = predicted?.name || '';

    const isCorrect = predictedName === trueCategory;

    totalEvaluated += 1;
    if (isCorrect) {
      totalCorrect += 1;
    }

    if (!perCategoryStats.has(trueCategory)) {
      perCategoryStats.set(trueCategory, { total: 0, correct: 0 });
    }
    const stats = perCategoryStats.get(trueCategory);
    stats.total += 1;
    if (isCorrect) {
      stats.correct += 1;
    }
  }

  console.log('=== Rule-based Categorization Evaluation ===');
  console.log(`Total labeled transactions evaluated: ${totalEvaluated}`);
  console.log(`Overall accuracy: ${totalEvaluated > 0 ? (totalCorrect / totalEvaluated * 100).toFixed(1) : 'N/A'}%`);
  console.log('');
  console.log('Accuracy by true category (category_name_label):');

  const sortedCategories = Array.from(perCategoryStats.entries()).sort(
    (a, b) => a[0].localeCompare(b[0])
  );

  for (const [categoryName, stats] of sortedCategories) {
    const pct = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : 'N/A';
    console.log(
      `  ${categoryName.padEnd(20)}  ${stats.correct}/${stats.total}  (${pct}%)`
    );
  }
}

main().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});

