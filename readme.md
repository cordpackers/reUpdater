# reUpdater

An open source alternative to/replacement of Discord's Rust-programmed `updater.node`.

For questions read `faq.md`.

## Status

Currently it's hard to estimate. And as it's in alpha it's not 100% usable yet. Please use it with caution.

## Usage

### For normal users
1. Download `reUpdater.zip`. 
2. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
3. Extract the files inside.

### For people who want to try out HEAD changes
1. Download the latest source build.
2. Extract and run `npm i` inside.
3. Run `npm run build`.
4. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
5. Copy `dist`, `node_modules` and `package.json` inside.

### For developers
1. Download the latest source build.
2. Extract and run `npm i` inside.
3. Run `npm run dev`.
4. Go to `discordDir/app-latest.version.here/`, delete (or rename) the `updater.node` file and create a folder named `updater`. 
5. Copy `dist`, `node_modules` and `package.json` inside.

Alternatively you can package this with a repacker. (recommended method if you want to test)
