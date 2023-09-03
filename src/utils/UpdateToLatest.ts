import { Worker } from "worker_threads";
import path from "path";
import crypto from "crypto";
import * as fs from "fs";

import moduleVersion from "../classes/details/moduleVersion.js";
import { SQLiteDB } from "../classes/database.js";
import errorMessage from "../classes/messages/errorMessage.js";
import hostVersion from "../classes/details/hostVersion.js";
import { folderExists } from "./FolderExists.js";

function runThread(
  task: any,
  workerData: any,
  response_handler: (arg0: string) => void,
  request: any[]
) {
  let workerScriptPath: any = "";

  switch (task.type) {
    case "HostDownload":
    case "ModuleDownload": {
      workerScriptPath = path.join(__dirname, "..", "workers", "download.js");
      break;
    }
    case "HostInstall":
    case "ModuleInstall": {
      workerScriptPath = path.join(
        __dirname,
        "..",
        "workers",
        "extractAndInstall.js"
      );
    }
  }

  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", (message) => {
      const stringMessage = JSON.stringify(message);
      response_handler(JSON.stringify([request[0], { TaskProgress: message }]));
      if (stringMessage.includes("Complete")) {
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
    root_path,
    db,
    arch,
    install_id = null,
  }: {
    release_channel: any;
    platform: any;
    repository_url: any;
    root_path: any;
    db: SQLiteDB;
    arch: any;
    install_id: any;
  },
  updateFinished: any
) {
  if (!(await install_id)) {
    install_id = crypto.randomUUID();
    try {
      await db.runQuery(`
          INSERT INTO key_values (key, value)
          VALUES ("install_id", '"${install_id}"')
        `);
      console.log('[Updater] Row "install_id" has been inserted successfully');
    } catch (error) {
      response_handler(
        JSON.stringify([
          request[0],
          new errorMessage("Other", error, "Default").formatted(),
        ])
      );
    }
  } else {
    install_id = await install_id;
  }

  const fetchedData = await fetch(
    `${repository_url}distributions/app/manifests/latest?install_id=${install_id}&channel=${release_channel}&platform=${platform}&arch=${arch}`
  );
  const response = await fetchedData.json();

  if (!updateFinished) {
    // TODO: Delta updates require one version up, but tbh downloading full versions seems enough for now

    /*

    let hostVersion;

    try {
      const result = await db.runQuery(
        `SELECT value FROM key_values WHERE key = "host/app/${release_channel}/${platform}/${arch}"`
      );
      hostVersion = JSON.parse(result[0].value)[0].host_version;
    } catch (error) {
      response_handler(
        JSON.stringify([
          request[0],
          new errorMessage("Other", error, "Default").formatted(),
        ])
      );
    }

    console.log(hostVersion)

    if (!hostVersion) {
      response_handler(
        JSON.stringify([
          request[0],
          new errorMessage("Other", "No hostVersion", "Default").formatted(),
        ])
      );
      return
    }

    */

    const newHostVersionDetails = {
      version: {
        ...new hostVersion(
          release_channel,
          platform,
          arch,
          response.full.host_version
        ).formatted(),
      },
      from_version: null,
      package_sha256: response.full.package_sha256,
      url: response.full.url,
    };

    let tasks: [[any], [any]] = [
      [
        {
          type: "HostDownload",
          ...newHostVersionDetails,
        },
      ],
      [
        {
          type: "HostInstall",
          ...newHostVersionDetails,
        },
      ],
    ];

    let modulesDetails: any[] = [];

    for (const module of response.required_modules) {
      const moduleData = response.modules[module].full;
      modulesDetails.push({
        version: new moduleVersion(
          newHostVersionDetails.version,
          module,
          moduleData.module_version
        ).formatted(),
        from_version: null,
        package_sha256: moduleData.package_sha256,
        url: moduleData.url,
      });
    }

    for (const module of modulesDetails) {
      tasks[0].push({
        type: "ModuleDownload",
        ...module,
      });
      tasks[1].push({
        type: "ModuleInstall",
        ...module,
      });
    }

    async function processTasks() {
      for (const task of tasks) {
        const taskPromises = task.map((task: any) =>
          runThread(
            task,
            { ...task, root_path: root_path },
            response_handler,
            request
          )
        );

        await Promise.all(taskPromises);
      }
    }

    const downloadFolder = `${root_path}\\download`;
    const incomingFolder = `${root_path}\\download\\incoming`;

    const isFolderExist = folderExists(downloadFolder);

    switch (isFolderExist) {
      case false: {
        fs.mkdirSync(downloadFolder);
        fs.mkdirSync(incomingFolder);
        break;
      }
      case true: {
        fs.rmSync(downloadFolder, { force: true, recursive: true });
        fs.mkdirSync(downloadFolder);
        fs.mkdirSync(incomingFolder);
        break;
      }
      case "error": {
        response_handler(
          JSON.stringify([
            request[0],
            new errorMessage(
              "Other",
              JSON.stringify(isFolderExist),
              "Default"
            ).formatted(),
          ])
        );
      }
    }

    try {
      await processTasks();
    } catch (error) {
      console.log(error);
      response_handler(
        JSON.stringify([
          request[0],
          new errorMessage(
            "Other",
            JSON.stringify(error),
            "Default"
          ).formatted(),
        ])
      );
    }

    // TODO: replace new manifest in installer.db

    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...fetchedData } }])
    );

    updateFinished = true;
  } else {
    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...fetchedData } }])
    );
  }

  //db.close();
}

export = UpdateToLatest;
