import fs from "fs-extra";

function waitForFolder(folderPath: any, intervalMs: number) {
  function checkFolder() {
    let success = false;

    try {
      fs.accessSync(folderPath, fs.constants.R_OK | fs.constants.W_OK);
      console.log(`[Updater] Folder '${folderPath}' exists.`);
      success = true;
    } catch (err) {
      console.log(`[Updater] Folder '${folderPath}' does not exist.`);
      setTimeout(checkFolder, intervalMs);
    }

    return success;
  }

  checkFolder();
}

export { waitForFolder };
