// Launch with Electron, never Node. Uses a new, isolated database and hidden window.
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const work = path.join(root, 'work');
fs.mkdirSync(work, { recursive: true });
const data = fs.mkdtempSync(path.join(work, 'security-smoke-'));
app.setPath('userData', data);
app.setAppPath(root);
process.env.NODE_ENV = 'production';
process.env.LIBRI_SECURITY_TEST = '1';
const csv = path.join(data, 'import.csv');
const csvOutput = path.join(data, 'export.csv');
const excelOutput = path.join(data, 'export.xlsx');
fs.writeFileSync(csv, 'Date,Amount,Description\n2026-10-01,"1,234.56",=1+1\n2026-10-02,(123.45),Debit\n');
let openPath = csv;
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [openPath] });
dialog.showSaveDialog = async options => ({ canceled: false, filePath: options.filters[0].extensions[0] === 'xlsx' ? excelOutput : csvOutput });
dialog.showErrorBox = (title, message) => { console.error(title, message); app.exit(1); };
const timer = setTimeout(() => { console.error('Security smoke test timed out'); app.exit(1); }, 90000);
app.on('browser-window-created', (_event, win) => {
  win.webContents.once('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const checks = [];
        const check = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
        check(!!document.querySelector('#root')?.textContent?.includes('Libri'), 'React rendered under CSP');
        const account = await window.api.accounts.create({name:'Synthetic checking',type:'checking',opening_balance:0,current_balance:0,currency:'USD',active:true});
        const unauthorized = await window.api.import.parseCSV(${JSON.stringify(csv)});
        check(!unauthorized.success, 'Unapproved file read rejected');
        const selected = await window.api.import.showFileDialog();
        const parsed = await window.api.import.parseCSV(selected.filePath);
        check(parsed.success && parsed.meta.fields.includes('Amount'), 'Approved CSV and column metadata parsed');
        const validated = await window.api.import.validateTransactions(parsed.data,{date:'Date',amount:'Amount',description:'Description',account_id:String(account.id)});
        check(validated.success && validated.validTransactions[0].amount===1234.56 && validated.validTransactions[1].amount===-123.45,'Amounts preserved');
        const row = validated.validTransactions[0];
        const failed = await window.api.import.saveTransactions([row,{...row,account_id:999999}]);
        check(!failed.success && (await window.api.transactions.getAll()).length===0,'Failed batch rolled back actual SQLite');
        const transferFailed = await window.api.import.saveTransactions([row],[{fromAccountId:account.id,toAccountId:999999,amount:10,date:'2026-10-01'}]);
        check(!transferFailed.success && (await window.api.transactions.getAll()).length===0,'Failed transfer rolled back regular rows');
        const saved = await window.api.import.saveTransactions(validated.validTransactions);
        check(saved.success && saved.count===2,'Valid batch committed');
        const balances = await window.api.accounts.getById(account.id);
        check(Math.abs(balances.current_balance-1111.11)<0.00001,'Accounting balance preserved');
        const blocked = await window.api.export.transactionsToCSV({filePath:${JSON.stringify(csvOutput)}});
        check(!blocked.success,'Unapproved export rejected');
        const destination = await window.api.export.showSaveDialog({format:'csv'});
        check((await window.api.export.transactionsToCSV({filePath:destination.filePath})).success,'Approved export succeeded');
        check(!(await window.api.export.transactionsToCSV({filePath:destination.filePath})).success,'Export grant cannot be reused');
        const xlsx = await window.api.export.showSaveDialog({format:'excel'});
        check((await window.api.export.transactionsToExcel({filePath:xlsx.filePath})).success,'Excel export succeeded');
        return checks;
      })()`);
      assert.match(fs.readFileSync(csvOutput, 'utf8'), /'=1\+1/);
      openPath = excelOutput;
      await win.webContents.executeJavaScript(`(async()=>{const f=await window.api.import.showFileDialog();const r=await window.api.import.parseExcel(f.filePath);if(!r.success||!r.sheets.length)throw Error('Excel roundtrip failed');})()`);
      const { DatabaseConnection } = require('../electron/src/data-storage/database/DatabaseConnection');
      assert.equal(DatabaseConnection.getInstance().prepare('SELECT COUNT(*) AS n FROM ai_training_corpus').get().n, 0);
      console.log(JSON.stringify({ success: true, checks: [...result, 'CSV formula escaped', 'Excel roundtrip passed', 'No developer training data seeded'], electron: process.versions.electron, isolatedData: data }, null, 2));
      clearTimeout(timer);
      win.close();
    } catch (error) { console.error(error); clearTimeout(timer); app.exit(1); }
  });
});
require('../electron/electron/main.js');
