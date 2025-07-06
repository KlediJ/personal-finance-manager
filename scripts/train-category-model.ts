// scripts/train-category-model.ts
// ---------------------------------
// Build a Naive-Bayes model from historical transactions
// Compiles under `tsc --module commonjs`

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3') as typeof import('better-sqlite3');
const fs       = require('fs');
const path     = require('path');
const { app }  = require('electron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NaiveBayesCategorizer } = require('../src/ai/NaiveBayesCategorizer');

async function main(): Promise<void> {
  await app.whenReady();

  const dbPath    = path.join(app.getPath('userData'), 'database', 'finance_manager.db');
  const modelPath = path.join(app.getPath('userData'), 'category-model.json');

  const db = new Database(dbPath, { readonly: true });

  // Pull training data: description ➜ category name
  const rows = db
    .prepare(`
      SELECT t.description AS text, c.name AS label
      FROM   transactions t
      JOIN   categories   c ON t.category_id = c.category_id
      WHERE  t.description IS NOT NULL
    `)
    .all();

  const nb = new NaiveBayesCategorizer();

  // Cast each row to any to satisfy the compiler
  rows.forEach((r: any) => nb.train(r.text, r.label));

  fs.writeFileSync(modelPath, JSON.stringify(nb.toJSON(), null, 2));
  console.log(`Model saved to ${modelPath}`);

  app.quit();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
