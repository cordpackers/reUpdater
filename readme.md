# reUpdater

An open source alternative to/replacement of Discord's Rust-programmed `updater.node`.

For questions read `faq.md`.

For support join: https://discord.gg/SP4syJnFqg

## Status

Currently it's hard to estimate. It can be used now but it's still have bugs. Please use it with caution.

Can now work on a new install!

## Usage

### For normal users
1. Download `release.zip`. 
2. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
3. Extract the files inside.
4. If you have any `was compiled against a different Node.js version` problems please find the Electron version used and run `./node_modules/.bin/electron-rebuild -v (electron version here)` from the `updater` folder.

### For people who want to try out HEAD changes
1. Download the latest source build.
2. Extract and run `npm i` inside.
3. Run `./node_modules/.bin/electron-rebuild -v (electron version here)`
4. Run `npm run build`.
5. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
6. Copy `dist`, `node_modules` and `package.json` inside.

### For developers
1. Download the latest source build.
2. Extract and run `npm i` inside.
3. Run `./node_modules/.bin/electron-rebuild -v (electron version here)`
4. Run `npm run dev`.
5. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
6. Copy `dist`, `node_modules` and `package.json` inside.

Alternatively you can package this with a repacker. (recommended method if you want to test)
