import { parentPort, workerData } from "worker_threads";

import TaskProgressDetail from "../classes/messages/taskProgress";

// Downloads the files to rootPath/download. It first download as .tmp(randomID) in the incoming folder of the download folder but after finish move to the download folder and rename it to the hash.
// all files are in .tar.br

// Both HostDownload and HostInstall will run, HostInstall will only start after HostDownload finishes, and same for Modules
async function performUpdate(
  type: any,
  version: any,
  from_version = null,
  package_sha256: any,
  url: any
) {
  let state = "Waiting";
  let progress = 0.0;
  let bytes = 0;
  let detail = new TaskProgressDetail(
    type,
    version,
    from_version,
    package_sha256,
    url,
    state,
    progress,
    bytes
  ).formatted();

  parentPort?.postMessage(detail);

  // update here i guess

  switch (type) {
    case "HostDownload": {
      state = "Working";
      progress = 1.0;
      bytes = 1239;
      detail = new TaskProgressDetail(
        type,
        version,
        from_version,
        package_sha256,
        url,
        state,
        progress,
        bytes
      ).formatted();

      parentPort?.postMessage(detail);
      break;
    }
    case "ModuleDownload": {
      break;
    }
    case "HostInstall": {
      break;
    }
    case "ModuleInstall": {
    }
  }
}

const { type, version, from_version, package_sha256, url } = workerData;

performUpdate(type, version, from_version, package_sha256, url).catch(
  (error) => {
    console.error("eh");
  }
);
