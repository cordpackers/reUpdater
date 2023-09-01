const { randomUUID } = require("crypto");
const util = require("util");
const { Worker } = require("worker_threads");
const path = require("path");

class Updater {
  constructor(options) {
    this.response_handler = options.response_handler;
    this.release_channel = options.release_channel;
    this.platform = options.platform;
    this.repository_url = options.repository_url;
    this.root_path = options.root_path;
    this.install_id = randomUUID();
  }

  async command(rawRequest) {
    const request = JSON.parse(rawRequest);

    switch (true) {
      case "UpdateToLatest" in request[1]: {
        await downloadAndUpdate(this.response_handler, request, {
          release_channel: this.release_channel,
          platform: this.platform,
          repository_url: this.repository_url,
          install_id: this.install_id,
        });
      }
    }
  }
}

async function downloadAndUpdate(
  response_handler,
  request,
  { release_channel, platform, repository_url, install_id }
) {
  const workerScriptPath = path.join(__dirname, "tasks.js");
  let arch = "";
  // convert ia32 and x32 to x86
  switch (process.arch) {
    case "x64": {
      arch = "x64";
      break;
    }
    case "ia32":
    case "x32": {
      arch = "x86";
    }
  }
  const fetchedData = await fetch(
    `${repository_url}distributions/app/manifests/latest?install_id=${install_id}&channel=${release_channel}&platform=${platform}&arch=${arch}`
  );
  const response = await fetchedData.json();

  const hostVersion = {
    host: {
      name: "app",
      release_channel: release_channel,
      platform: platform,
      arch: arch,
      version: response.full.host_version,
    },
  };

  class moduleVersion {
    constructor(hostVersion, name, version) {
      (this.hostVersion = hostVersion),
        (this.name = name),
        (this.version = version);
    }

    details() {
      return {
        module: {
          host_version: {
            ...this.hostVersion,
          },
          name: this.name,
        },
        version: this.version,
      };
    }
  }

  let DownloadInputData = [
    {
      type: "HostDownload",
      version: hostVersion,
      from_version: null,
      package_sha256: response.full.package_sha256,
      url: response.full.url,
    },
  ];

  let InstallInputData = [
    {
      type: "HostInstall",
      version: hostVersion,
      from_version: null,
      package_sha256: response.full.package_sha256,
      url: response.full.url,
    },
  ];

  for (const module of response.required_modules) {
    const moduleData = response.modules[module].full;
    DownloadInputData.push({
      type: "ModuleDownload",
      version: new moduleVersion(
        hostVersion,
        module,
        moduleData.module_version
      ).details(),
      from_version: null,
      package_sha256: moduleData.package_sha256,
      url: moduleData.url,
    });
    InstallInputData.push({
      type: "ModuleInstall",
      version: new moduleVersion(
        hostVersion,
        module,
        moduleData.module_version
      ).details(),
      from_version: null,
      package_sha256: moduleData.package_sha256,
      url: moduleData.url,
    });
  }

  for (const thread of DownloadInputData) {
    const worker = new Worker(workerScriptPath, {
      workerData: { ...thread },
    });

    worker.on("message", (message) => {
      console.log(JSON.stringify([request[0], { TaskProgress: message }]));
      response_handler(JSON.stringify([request[0], { TaskProgress: message }]));
    });
  }

  for (const thread of InstallInputData) {
    const worker = new Worker(workerScriptPath, {
      workerData: { ...thread },
    });

    worker.on("message", (message) => {
      console.log(JSON.stringify([request[0], { TaskProgress: message }]));
      response_handler(JSON.stringify([request[0], { TaskProgress: message }]));
    });
  }
}

console.log("reUpdater v0.0.1 - Javascript-based updater.node replacement");

exports.Updater = Updater;
