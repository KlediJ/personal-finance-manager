// Seed ai_categorization_feedback from WF_Checking_092025_raw.csv
// This script uses the labeled CSV to populate the learning table so
// the AI can start with payee->category knowledge before any UI edits.

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const Database = require('better-sqlite3');

function getUserDataPath() {
  const appName = 'personal-finance-manager';

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', appName);
  } else if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Application Support', appName);
  } else {
    return path.join(process.env.HOME || '', '.config', appName);
  }
}

function main() {
  const csvPath = path.join(__dirname, '..', 'docs', 'WF_Checking_092025_raw.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('ERROR: Labeled CSV not found at', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  const rows = parsed.data;

  const userDataPath = getUserDataPath();
  const dbPath = path.join(userDataPath, 'database', 'finance_manager.db');

  console.log('Seeding ai_categorization_feedback from CSV:');
  console.log('  CSV path:', csvPath);
  console.log('  DB path :', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.error('ERROR: Database file does not exist at this path.');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Ensure feedback table exists (same as in aiHandlers)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ai_categorization_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        payee_id INTEGER,
        payee_name TEXT,
        category_id INTEGER,
        category_name TEXT,
        description TEXT,
        amount REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const categories = db.prepare('SELECT * FROM categories').all();
    const categoryByName = new Map();
    for (const c of categories) {
      categoryByName.set(c.name.toLowerCase(), c);
    }

    const findOrCreatePayee = db.prepare(`
      INSERT INTO payees (name, default_category_id, created_at, updated_at)
      SELECT ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM payees WHERE LOWER(name) = LOWER(?));
    `);

    const selectPayee = db.prepare(`
      SELECT * FROM payees WHERE LOWER(name) = LOWER(?) LIMIT 1;
    `);

    const insertFeedback = db.prepare(`
      INSERT INTO ai_categorization_feedback (
        transaction_id,
        payee_id,
        payee_name,
        category_id,
        category_name,
        description,
        amount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let skippedNoCategory = 0;

    db.prepare('BEGIN TRANSACTION').run();

    for (const row of rows) {
      const payeeLabel = (row.payee_label || '').trim();
      const categoryLabel = (row.category_name_label || '').trim();
      const description = row.description_raw || '';
      const amount = row.amount != null ? Number(row.amount) : null;

      if (!payeeLabel || !categoryLabel) {
        continue;
      }

      const category = categoryByName.get(categoryLabel.toLowerCase());
      if (!category) {
        skippedNoCategory++;
        continue;
      }

      // Ensure payee exists
      findOrCreatePayee.run(payeeLabel, payeeLabel);
      const payee = selectPayee.get(payeeLabel);

      insertFeedback.run(
        null, // transaction_id not known in this offline seed
        payee ? payee.payee_id : null,
        payeeLabel,
        category.category_id,
        category.name,
        description,
        amount
      );

      inserted++;
    }

    db.prepare('COMMIT').run();

    console.log(`Seeded ${inserted} feedback rows into ai_categorization_feedback.`);
    if (skippedNoCategory > 0) {
      console.log(`Skipped ${skippedNoCategory} rows due to missing category match in live DB.`);
    }
  } catch (error) {
    try {
      db.prepare('ROLLBACK').run();
    } catch (_) {
      // ignore
    }
    console.error('ERROR while seeding feedback:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();

