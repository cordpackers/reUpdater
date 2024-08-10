import fs from "fs-extra";

function waitForFolder(folderPath: any, intervalMs: number) {
  function checkFolder() {
    let success = false;

    try {
      fs.accessSync(folderPath, fs.constants.R_OK | fs.constants.W_OK);
      success = true;
    } catch (err) {
      setTimeout(checkFolder, intervalMs);
    }

    return success;
  }

  checkFolder();
}

export { waitForFolder };
