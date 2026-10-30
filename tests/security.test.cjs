const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createRequire } = require('node:module');

function load(file, stubs = {}) {
  file = path.resolve(file);
  const exports = {};
  const localRequire = createRequire(file);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 }
  }).outputText, { exports, require: name => name in stubs ? stubs[name] : localRequire(name), URL, Buffer, console });
  return exports;
}

const safety = load('src/data-processing/import-export/safety.ts');
test('amount parsing never truncates grouping or drops accounting negatives', () => {
  for (const [input, expected] of [['1,234.56', 1234.56], ['(123.45)', -123.45], ['$1,234.56', 1234.56], ['-$1,234.56', -1234.56], [0, 0]]) {
    assert.equal(safety.parseImportAmount(input), expected);
  }
  for (const invalid of ['', '1.234,56', '1,23', '12junk', Infinity, NaN, '(-12)', '1e309']) {
    assert.throws(() => safety.parseImportAmount(invalid));
  }
});
test('CSV treats formula-like text as text, preserves actual negative numbers and quotes CR', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-1+1', '@SUM(A1)', '\t=1+1', '  =1+1', '＝1+1']) {
    assert.ok(safety.csvCell(value).includes("'"), value);
  }
  assert.equal(safety.csvCell(-12.5), '-12.5');
  assert.equal(safety.csvCell('a\rb'), '"a\rb"');
  assert.equal(safety.csvCell('ordinary text'), 'ordinary text');
});
test('privileged IPC rejects foreign windows, frames, documents and oversized requests', () => {
  const handlers = {};
  const security = load('electron/security/ipc.ts', { electron: { ipcMain: { handle: (name, fn) => handlers[name] = fn } } });
  const frame = { url: require('node:url').pathToFileURL(path.resolve('dist/index.html')).href + '#/accounts' };
  const sender = { mainFrame: frame };
  security.trustWindow({ isDestroyed: () => false, webContents: sender }, path.resolve('dist/index.html'), false);
  security.secureIpcMain.handle('test', (_event, value) => value);
  const event = { sender, senderFrame: frame };
  assert.equal(handlers.test(event, 'ok'), 'ok');
  assert.throws(() => handlers.test({ ...event, sender: {} }));
  assert.throws(() => handlers.test({ ...event, senderFrame: { ...frame } }));
  frame.url = 'https://attacker.example/';
  assert.throws(() => handlers.test(event));
  frame.url = require('node:url').pathToFileURL(path.resolve('dist/index.html')).href;
  assert.throws(() => handlers.test(event, 'x'.repeat(16 * 1024 * 1024)));
  assert.equal(security.isTrustedDocument('file:///some-other-file.html'), false);
});
test('file access is bound to the native selection, caller and format, with one-use exports', () => {
  const files = load('electron/security/files.ts');
  const event = { sender: { id: 1 } };
  const selected = path.resolve('work/approved.csv');
  assert.throws(() => files.authorizedFile(event, selected, 'read', '.csv'));
  files.grantFile(event, selected, 'read', ['.csv']);
  assert.equal(files.authorizedFile(event, selected, 'read', '.csv'), selected);
  assert.throws(() => files.authorizedFile({ sender: { id: 2 } }, selected, 'read', '.csv'));
  assert.throws(() => files.authorizedFile(event, path.resolve('work/secret.csv'), 'read', '.csv'));
  assert.throws(() => files.authorizedFile(event, selected, 'read', '.xlsx'));
  files.grantFile(event, selected, 'write', ['.csv']);
  assert.equal(files.authorizedFile(event, selected, 'write', '.csv'), selected);
  assert.throws(() => files.authorizedFile(event, selected, 'write', '.csv'));
  files.clearFileGrants(1);
  assert.throws(() => files.authorizedFile(event, selected, 'read', '.csv'));
});
test('Excel preflight accepts ordinary workbooks and rejects invalid archives and expanded bombs', async () => {
  const { validateWorkbookArchive } = load('electron/security/workbook.ts');
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Transactions').addRow(['Date', 'Amount']);
  await validateWorkbookArchive(Buffer.from(await workbook.xlsx.writeBuffer()));
  await assert.rejects(validateWorkbookArchive(Buffer.from('not a zip')));
  // Declared size bomb: rejected from metadata before allocation/decompression.
  const zip = Buffer.from(await workbook.xlsx.writeBuffer());
  const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  zip.writeUInt32LE(101 * 1024 * 1024, central + 24);
  await assert.rejects(validateWorkbookArchive(zip));
});
test('every production IPC registrar is guarded, packaging excludes old builds, lockfile is retained', () => {
  for (const file of fs.readdirSync('electron/ipc').filter(name => name.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join('electron/ipc', file), 'utf8');
    assert.match(source, /secureIpcMain as ipcMain/);
    assert.doesNotMatch(source, /import\s*\{[^}]*\bipcMain\b[^}]*\}\s*from 'electron'/);
  }
  const pkg = require('../package.json');
  assert.ok(!pkg.build.files.includes('dist/**/*'));
  assert.ok(!pkg.dependencies['onnxruntime-web']);
  assert.ok(!pkg.dependencies['onnxruntime-node']);
  assert.ok(!fs.readFileSync('.gitignore', 'utf8').split(/\r?\n/).includes('package-lock.json'));
});
