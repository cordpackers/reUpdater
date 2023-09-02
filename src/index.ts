import { Worker } from "worker_threads";
import path from "path";
import { URL } from "url";

import { moduleVersion } from "./classes/moduleVersion.js";
import { SQLiteDB } from "./classes/database.js";

class Updater {
  response_handler: any;
  release_channel: any;
  platform: any;
  repository_url: any;
  db: SQLiteDB;
  arch: () => "x64" | "x86" | undefined;
  install_id: any;
  updateFinished: boolean;

  constructor(options: {
    response_handler: any;
    release_channel: any;
    platform: any;
    repository_url: any;
    root_path: any;
  }) {
    this.response_handler = options.response_handler;
    this.release_channel = options.release_channel;
    this.platform = options.platform;
    this.repository_url = options.repository_url;
    this.db = new SQLiteDB(path.join(options.root_path, 'installer.db'))
    this.arch = () => {
      // convert ia32 and x32 to x86
      switch (process.arch) {
        case "x64": {
          return "x64";
          break;
        }
        case "ia32": {
          return "x86";
          break;
        }
      }
    };
    this.install_id = (async () => {
      return (await this.db.runQuery("SELECT value FROM key_values WHERE key = \"install_id\""))[0].value
    });
    this.updateFinished = false;
  }

  async command(rawRequest: string) {
    const request = JSON.parse(rawRequest);

    switch (true) {
      case "UpdateToLatest" in request[1]: {
        await UpdateToLatest(
          this.response_handler,
          request,
          {
            release_channel: this.release_channel,
            platform: this.platform,
            repository_url: this.repository_url,
            db: this.db,
            arch: this.arch(),
            install_id: this.install_id
          },
          this.updateFinished
        );
      }
    }
  }
}

function runThread(
  workerScriptPath: string | URL,
  workerData: {
    type: string;
    version: {
      host: {
        name: string;
        release_channel: any;
        platform: any;
        arch: string;
        version: any;
      };
    };
    from_version: null;
    package_sha256: any;
    url: any;
  },
  response_handler: (arg0: string) => void,
  request: any[]
) {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", (message) => {
      console.log(JSON.stringify([request[0], { TaskProgress: message }]));
      response_handler(JSON.stringify([request[0], { TaskProgress: message }]));
      if (message.type === "done") {
        resolve();
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function UpdateToLatest(
  response_handler: any,
  request: any,
  {
    release_channel,
    platform,
    repository_url,
    db,
    arch,
    install_id
  }: {
    release_channel: any;
    platform: any;
    repository_url: any;
    db: SQLiteDB;
    arch: any;
    install_id: any;
  },
  updateFinished: any
) {
  const fetchedData = await fetch(
    `${repository_url}distributions/app/manifests/latest?install_id=${(await install_id()).slice(1, -1)}&channel=${release_channel}&platform=${platform}&arch=${arch}`
  );
  const response = await fetchedData.json();

  if (!updateFinished) {
    const workerScriptPath = path.join(__dirname, "common", "downInstall.js");

    const hostVersion = {
      host: {
        name: "app",
        release_channel: release_channel,
        platform: platform,
        arch: arch,
        version: response.full.host_version,
      },
    };

    let tasks: [[any], [any]] = [
      [
        {
          type: "HostDownload",
          version: hostVersion,
          from_version: null,
          package_sha256: response.full.package_sha256,
          url: response.full.url,
        },
      ],
      [
        {
          type: "HostInstall",
          version: hostVersion,
          from_version: null,
          package_sha256: response.full.package_sha256,
          url: response.full.url,
        },
      ],
    ];

    for (const module of response.required_modules) {
      const moduleData = response.modules[module].full;
      tasks[0].push({
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
      tasks[1].push({
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

    async function processTasks() {
      for (const task of tasks) {
        const taskPromises = task.map(
          (task: {
            type: string;
            version: {
              host: {
                name: string;
                release_channel: any;
                platform: any;
                arch: string;
                version: any;
              };
            };
            from_version: null;
            package_sha256: any;
            url: any;
          }) => runThread(workerScriptPath, task, response_handler, request)
        );
        await Promise.all(taskPromises);
      }
    }

    processTasks()
      .then(() => {
        // ManifestInfo
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    // ManifestInfo
  }

  db.close();
}

console.log("reUpdater v0.0.1 - Javascript-based updater.node replacement");

export = {
  Updater
};