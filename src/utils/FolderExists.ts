import * as fs from "fs";

function folderExists(path: string) {
  try {
    const stats = fs.statSync(path);

    if (stats.isDirectory()) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return false;
    } else {
      return error;
    }
  }
}

export {folderExists};