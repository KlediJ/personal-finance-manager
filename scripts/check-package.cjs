const asar = require('@electron/asar');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const archive = process.argv[2] || 'work/security-package/win-unpacked/resources/app.asar';
const files = [];
function walk(node, prefix) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const file = prefix + '/' + name;
    if (entry.files) walk(entry, file);
    else files.push(file);
  }
}
walk(asar.getRawHeader(archive).header, '');
assert.deepEqual(files.filter(file => /\.(?:asar|exe|msix|db|sqlite|csv)$/i.test(file) || file.includes('/node_modules/onnxruntime')), []);
for (const file of ['/electron/electron/main.js', '/electron/electron/security/ipc.js', '/electron/electron/security/files.js',
  '/electron/electron/security/workbook.js', '/electron/electron/ipc/importHandlers.js',
  '/electron/src/data-processing/import-export/safety.js', '/dist/index.html']) assert.ok(files.includes(file), file);
console.log(JSON.stringify({ verified: true, files: files.length, archiveMB: Math.round(fs.statSync(archive).size / 1e6) }));
