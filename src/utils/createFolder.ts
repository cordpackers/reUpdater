import * as fs from "fs";

function createFolder(path: string) {
  try {
    fs.mkdirSync(path);
  } catch (error: any) {
    if (error.code === "EEXIST") {
      return "folderExists";
    } else {
      throw error;
    }
  }
}

export { createFolder };
