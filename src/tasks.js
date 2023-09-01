const { parentPort, workerData } = require("worker_threads");

// Downloads the files to rootPath/download. It first download as .tmp(randomID) in the incoming folder of the download folder but after finish move to the download folder and rename it to the hash.
// all files are in .tar.br

class TaskProgressDetail {
  constructor(
    task,
    version,
    from_version,
    package_sha256,
    url,
    state,
    progress,
    bytes
  ) {
    this.task = task;
    this.version = version;
    this.from_version = from_version;
    this.package_sha256 = package_sha256;
    this.url = url;
    this.state = state;
    this.progress = progress;
    this.bytes = bytes;
  }

  detail() {
    return [
      {
        [this.task]: {
          version: {
            ...this.version,
          },
          from_version: this.from_version,
          package_sha256: this.package_sha256,
          url: this.url,
        },
      },
      this.state,
      this.progress,
      this.bytes,
    ];
  }
}

// Both HostDownload and HostInstall will run, HostInstall will only start after HostDownload finishes, and same for Modules
async function performUpdate(
  type,
  version,
  from_version = null,
  package_sha256,
  url
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
  ).detail();

  parentPort.postMessage(detail);

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
      ).detail();

      parentPort.postMessage(detail);
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
