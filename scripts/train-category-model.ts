import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { NaiveBayesCategorizer } from '../src/ai/NaiveBayesCategorizer';

async function main() {
  await app.whenReady();
  const dbPath = path.join(app.getPath('userData'), 'database', 'finance_manager.db');
  const modelPath = path.join(app.getPath('userData'), 'category-model.json');

  const db = new Database(dbPath, { readonly: true });

  const rows = db
    .prepare(
      `SELECT t.description as text, c.name as label
       FROM transactions t
       JOIN categories c ON t.category_id = c.category_id
       WHERE t.description IS NOT NULL`
    )
    .all();

  const nb = new NaiveBayesCategorizer();
  rows.forEach(r => nb.train(r.text, r.label));

  fs.writeFileSync(modelPath, JSON.stringify(nb.toJSON(), null, 2));
  console.log(`Model saved to ${modelPath}`);
  app.quit();
}

main();

