import { parentPort, workerData } from "worker_threads";
import * as fs from "fs";

import TaskProgressDetail from "../classes/messages/taskProgress";

// Downloads the files to rootPath/download. It first download as .tmp(randomID) in the incoming folder of the download folder but after finish move to the download folder and rename it to the hash.
// all files are in .tar.br

async function downloadFile(url: string, filePath: string, task: TaskProgressDetail, parentPort: any | undefined) {
  const fileStream = fs.createWriteStream(filePath);

  const response = await fetch(url);
  const contentLength = response.headers.get("content-length");
  const reader = response.body?.getReader();
  if (!contentLength || !reader) {
    return;
  }
  const total = parseInt(contentLength);

  let receivedLength = 0;
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    fileStream.write(value);
    receivedLength += value.length;

    const percentage = (receivedLength / total) * 100

    task.updateTask({state: "Working", progress: parseFloat(percentage.toFixed(1)), bytes: receivedLength});

    parentPort?.postMessage(task.formatted());
  }

  task.updateTask({state: "Complete", progress: 100.0, bytes: 0});

  parentPort?.postMessage(task.formatted());
}

// Both HostDownload and HostInstall will run, HostInstall will only start after HostDownload finishes, and same for Modules
async function performUpdate(
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

  // update here i guess

  switch (type) {
    case "HostDownload": {
      downloadFile(url, `${root_path}\\download\\incoming\\${package_sha256}`, task, parentPort) // I know it was .tmpSoMeRanDomId before renaming to sha256 but idc
      break;
    }
    case "ModuleDownload": {
      downloadFile(url, `${root_path}\\download\\incoming\\${package_sha256}`, task, parentPort) // I know it was .tmpSoMeRanDomId before renaming to sha256 but idc
      break;
    }
    case "HostInstall": {
      break;
    }
    case "ModuleInstall": {
    }
  }
}

const { type, version, from_version, package_sha256, url, root_path } = workerData;

performUpdate(type, version, from_version, package_sha256, url, root_path).catch(
  (error) => {
    console.error("eh");
  }
);
