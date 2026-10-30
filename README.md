# Libri desktop

Local desktop software for importing, organizing, and reviewing personal finances.

This development checkpoint hardens the existing application. It is not a Libri 2.0
release. The upcoming paid version's experiences, feature list, pricing, and release
date are still being defined. The website is maintained in the separate
[libri-website repository](https://github.com/KlediJ/libri-website).

## Requirements and setup

Use Node.js 22.15 or newer; Node 24.19.0 is recorded in `.node-version` and was used
for verification. The dependency lockfile is committed. Windows is the validated
platform for this checkpoint; macOS and Linux configurations are not release-tested.

```sh
npm ci
npm run build:prod
```

Installation rebuilds SQLite for Electron. Generated files in `electron/electron/`,
`electron/src/`, and `dist/` are build outputs, not source files. Build them after a
fresh checkout. Do not run database maintenance scripts against personal data just
to verify a checkout.

## Development

```sh
npm start
```

This starts Webpack on port 3002 and compiles the Electron sources before launching
the same guarded application entry point used in production. `start.bat` calls this
command without terminating other applications. The older root-level JavaScript
entry points are historical code, not the supported launch path.

## Verification

```sh
npm run test:security
npm run build:prod
npm run test:electron-security
npm audit
```

The Electron security test creates an isolated database under ignored `work/` and
uses a hidden window. It does not open the user's finance database. See
[SECURITY-HARDENING.txt](SECURITY-HARDENING.txt) for coverage and remaining work.

## Local packaging

After the production build, create and inspect an unsigned directory package:

```sh
npx electron-builder --win --dir --publish never --config.directories.output=work/security-package
node scripts/check-package.cjs
```

The earlier MSIX template and packaging commands are retained for development;
this checkpoint does not certify a new Store submission or a signed installer.
Do not replace public downloads until signing, installation, upgrades, and data
recovery have been validated. A source push is not a product release.

## Repository hygiene

Keep personal data, database sidecars, credentials, signing keys, test output, and
packaged binaries out of commits. Personal training input is no longer loaded
automatically. Its local CSV is preserved and ignored. On October 30, 2026, both
historical bank-input paths were removed from public branches and tags, and a fresh
clone verified that their contents are absent from reachable history. GitHub's
server-side purge of cached old commits still requires Support. Existing clones
must use the cleaned history; merging old history can restore the removed data.
