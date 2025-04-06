const { execSync } = require('child_process');
const electron = require('electron/package.json');
const sqlite = require('better-sqlite3/package.json');

console.log(`Rebuilding better-sqlite3 (${sqlite.version}) for Electron ${electron.version}...`);

try {
  // Clean any previous builds
  console.log('Cleaning previous builds...');
  execSync('npm rebuild better-sqlite3', { stdio: 'inherit' });
  
  // Rebuild for the specific Electron version
  console.log(`Rebuilding for Electron ${electron.version}...`);
  execSync(`npm rebuild better-sqlite3 --build-from-source --runtime=electron --target=${electron.version} --dist-url=https://electronjs.org/headers`, 
    { stdio: 'inherit' }
  );
  
  console.log('Rebuild completed successfully!');
} catch (error) {
  console.error('Error during rebuild:', error);
  process.exit(1);
}
