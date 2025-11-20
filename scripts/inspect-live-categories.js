// Read-only inspection script for the live dev database categories table.
// Usage: npm run inspect:categories
//
// This script does NOT modify the database. It:
// 1) Locates the dev DB using the same logic as scripts/init-db.js
// 2) Connects with better-sqlite3
// 3) Dumps categories (id, name, type, parent_category_id) to docs/categories_live.csv

const fs = require('fs');
const path = require('path');
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
  const userDataPath = getUserDataPath();
  const dbPath = path.join(userDataPath, 'database', 'finance_manager.db');

  console.log('Inspecting categories from dev database:');
  console.log(`  DB path: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.error('ERROR: Database file does not exist at this path.');
    console.error('Make sure you have run the app at least once so the DB is created.');
    process.exit(1);
  }

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch (error) {
    console.error('ERROR: Failed to open database:', error);
    process.exit(1);
  }

  try {
    // Try to select common category columns; tolerate older schemas
    const categories = db
      .prepare(
        `
        SELECT 
          category_id,
          name,
          type,
          parent_category_id
        FROM categories
        ORDER BY type, name, category_id
      `
      )
      .all();

    const outputPath = path.join(__dirname, '..', 'docs', 'categories_live.csv');
    const header = 'category_id,name,type,parent_category_id\n';
    const lines = categories.map((c) => {
      const id = c.category_id ?? '';
      const name = (c.name || '').replace(/"/g, '""');
      const type = c.type || '';
      const parent = c.parent_category_id ?? '';
      return `${id},"${name}",${type},"${parent}"`;
    });

    fs.writeFileSync(outputPath, header + lines.join('\n'), 'utf8');

    console.log(`Found ${categories.length} categories.`);
    console.log(`Live category snapshot written to: ${outputPath}`);
  } catch (error) {
    console.error('ERROR: Failed to read categories:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

main();

