import { parentPort, workerData } from "worker_threads";
import * as fs from "fs";
import path from "path";
import zlib from "zlib";
import tar from "tar-fs";

import TaskProgressDetail from "../classes/messages/taskProgress";

function waitForFolder(folderPath: any, intervalMs: number) {
  function checkFolder() {
    let success = false;

    fs.access(folderPath, (err) => {
      if (!err) {
        console.log(`[Updater] Folder '${folderPath}' exists.`);
        success = true;
      } else {
        console.log(`[Updater] Folder '${folderPath}' does not exist.`);
        setTimeout(checkFolder, intervalMs);
      }
    });

    return success;
  }

  checkFolder();
}

function extractTar(tarballPath: string, outputFolder: string) {
  const compressedTarball = fs.createReadStream(tarballPath);

  const decompressedTarball = zlib.createBrotliDecompress();

  const extract = tar.extract(outputFolder, {
    ignore(name) {
      return name.includes("delta_manifest.json");
    },
    map(header) {
      header.name = header.name.replace(/files\//, "");
      return header;
    },
  });

  compressedTarball.pipe(decompressedTarball).pipe(extract);

  console.log("[Updater] Tarball extraction completed successfully.");
}

async function handleExtract(
  type: any,
  filePath: any,
  root_path: any,
  version: any,
  task: TaskProgressDetail,
  parentPort: any
) {
  switch (type) {
    case "HostInstall": {
      task.updateTask({ state: "Working", progress: 0.0, bytes: 0 });

      parentPort?.postMessage(task.formatted());

      const outputFolder = `${root_path}\\app-${version.version.join(".")}\\`;
      try {
        fs.mkdirSync(outputFolder);
      } catch (error: any) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
      extractTar(filePath, outputFolder);

      break;
    }
    case "ModuleInstall": {
      task.updateTask({ state: "Working", progress: 0.0, bytes: 0 });

      parentPort?.postMessage(task.formatted());

      const hostVersion = version.module.host_version.version.join(".");

      const modulesFolder = `${root_path}\\app-${hostVersion}\\modules\\`;
      const outputParentFolder = `${modulesFolder}\\${version.module.name}-${version.version}`;
      const outputFolder = `${outputParentFolder}\\${version.module.name}`;

      waitForFolder(path.join(root_path, `app-${hostVersion}`), 1000);

      try {
        fs.mkdirSync(modulesFolder);
      } catch (error: any) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
      try {
        fs.mkdirSync(outputParentFolder);
      } catch (error: any) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
      try {
        fs.mkdirSync(outputFolder);
      } catch (error: any) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }

      extractTar(filePath, outputFolder);
    }
  }
  task.updateTask({ state: "Complete", progress: 100.0, bytes: 0 });

  parentPort?.postMessage(task.formatted());
}

async function performInstall(
  type: any,
  version: any,
  from_version = null,
  package_sha256: any,
  url: any,
  root_path: any
) {
  const task = new TaskProgressDetail(
    type,
    version,
    from_version,
    package_sha256,
    url,
    "Waiting",
    0.0,
    0
  );

  parentPort?.postMessage(task.formatted());

  process.noAsar = true;

  await handleExtract(
    type,
    `${root_path}\\download\\${package_sha256}`,
    root_path,
    version,
    task,
    parentPort
  );
}

const { type, version, from_version, package_sha256, url, root_path } =
  workerData;

performInstall(
  type,
  version,
  from_version,
  package_sha256,
  url,
  root_path
).catch((error) => {
  throw error;
});
