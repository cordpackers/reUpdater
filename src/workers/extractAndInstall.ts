import { parentPort, workerData } from "worker_threads";
import fs from "fs-extra";
import path from "path";
import zlib from "zlib";
import tar_fs from "tar-fs";

import TaskProgressDetail from "../classes/messages/taskProgress.js";
import { createFolder } from "../utils/createFolder.js";
import { once } from "stream";
import { waitForFolder } from "../utils/waitForFolder.js";

function extractTar(tarballPath: string, extractFolder: string) {
  const compressedTarball = fs.createReadStream(tarballPath);

  const decompressedTarball = zlib.createBrotliDecompress();

  const extract = tar_fs.extract(extractFolder);

  const stream = compressedTarball
    .pipe(decompressedTarball)
    .pipe(extract, { end: true });

  return stream;
}

async function handleExtract(
  type: any,
  filePath: any,
  root_path: any,
  version: any,
  task: TaskProgressDetail,
  parentPort: any
) {
  let outputFolder: any;
  let extractFolder: any;
  let stream;

  switch (type) {
    case "HostInstall": {
      task.state = "Working";
      task.progress = 0.0;
      task.bytes = 0;

      parentPort?.postMessage(task.formatted());

      extractFolder = path.join(root_path, "temp");
      outputFolder = path.join(root_path, `app-${version.version.join(".")}`);

      createFolder(extractFolder);
      createFolder(outputFolder);

      stream = extractTar(filePath, extractFolder);

      break;
    }
    case "ModuleInstall": {
      task.state = "Working";
      task.progress = 0.0;
      task.bytes = 0;

      parentPort?.postMessage(task.formatted());

      const hostVersion = version.module.host_version.version.join(".");

      const modulesFolder = path.join(
        root_path,
        `app-${hostVersion}`,
        "modules"
      );
      extractFolder = path.join(
        modulesFolder,
        `${version.module.name}-${version.version}`
      );
      outputFolder = path.join(extractFolder, version.module.name);

      waitForFolder(path.join(root_path, `app-${hostVersion}`), 3000);

      createFolder(modulesFolder);
      createFolder(extractFolder);

      stream = extractTar(filePath, extractFolder);
    }
  }

  if (stream) {
    await once(stream, "finish");
    try {
      const delta_manifest = JSON.parse(fs.readFileSync(
        path.join(extractFolder, "delta_manifest.json"),
        { encoding: "utf8" }
      ));
      parentPort?.postMessage({
        sendToDB: {
          type: type,
          version: version,
          delta_manifest: delta_manifest,
        },
      });
      fs.moveSync(path.join(extractFolder, "files"), outputFolder);
      switch (type) {
        case "HostInstall": {
          fs.rmdirSync(extractFolder);
          break;
        }
        case "ModuleInstall": {
          fs.rmSync(path.join(extractFolder, "delta_manifest.json"));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  task.state = "Complete";
  task.progress = 100.0;
  task.bytes = 0;

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
    path.join(root_path, "download", package_sha256),
    root_path,
    version,
    task,
    parentPort
  );
}

const {
  type,
  version,
  from_version,
  package_sha256,
  url,
  root_path,
  release_channel,
  platform,
  arch,
} = workerData;

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
