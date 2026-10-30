const { spawnSync } = require('node:child_process');
const path = require('node:path');
const executable = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(executable, [path.join(__dirname, '../tests/electron-security-smoke.cjs')], {
  cwd: path.join(__dirname, '..'), env, encoding: 'utf8', windowsHide: true, timeout: 120000
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) console.error(result.error);
process.exit(result.status === 0 && (result.stdout || '').includes('"success": true') ? 0 : 1);
