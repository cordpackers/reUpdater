import { Worker } from "worker_threads";
import path from "path";
import crypto from "crypto";
import * as fs from "fs";

import moduleVersion from "../classes/details/moduleVersion.js";
import { SQLiteDB } from "../classes/database.js";
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
      throw error;
    }
  } else {
    install_id = await install_id;
  }

  let currentHostVersion;

  currentHostVersion = JSON.parse(
    (
      await db.runQuery(
        `SELECT value FROM key_values WHERE key = "host/app/${release_channel}/${platform}/${arch}"`
      )
    )[0].value
  )[0].host_version;

  console.log(`[Updater] Current version: ${currentHostVersion}`);

  if (!currentHostVersion) {
    throw new Error("No hostVersion");
  }

  let response;

  response = JSON.parse(
    (
      await db.runQuery(
        `SELECT value FROM key_values WHERE key = "latest/host/app/${release_channel}/${platform}/${arch}"`
      )
    )[0].value
  );

  if (!response || response.full.host_version !== currentHostVersion) {
    const fetchedData = await fetch(
      `${repository_url}distributions/app/manifests/latest?install_id=${install_id}&channel=${release_channel}&platform=${platform}&arch=${arch}`
    );
    response = await fetchedData.json();

    try {
      await db.runQuery(`
    UPDATE key_values
    SET value = "${response}"
    WHERE key = "latest/host/app/${release_channel}/${platform}/${arch}"
  `);
      console.log(
        `[Updater] Row "latest/host/app/${release_channel}/${platform}/${arch}" has been inserted successfully`
      );
    } catch (error) {
      throw error;
    }
  }

  if (!updateFinished) {
    // TODO: Check if there is a delta update package, if there is, copy the whole current folder and install changes
    // Full update current works though but will work on delta updating in the future

    // TODO: update manifest in installer.db
    // host/app/development/win/x86: add new host+modules version, it's sha256 hash and install state
    // Discord Install States: PendingInstall, Installed, PendingDelete
    // My extended states: PendingDownload, Downloaded, Deleted

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

    // TODO: Remove HostDownload and HostInstall when Host version is latest

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

    let modulesVersionDetails: any[] = [];

    for (const module of response.required_modules) {
      const moduleData = response.modules[module].full;
      modulesVersionDetails.push({
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

    for (const module of modulesVersionDetails) {
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

    // TODO: Instead of removing folder after update failed, check if there are packages in the download folder and skip if sha256 matches

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
        throw isFolderExist;
      }
    }

    try {
      await processTasks();
    } catch (error) {
      throw error;
    }

    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...response } }])
    );

    updateFinished = true;
  } else {
    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...response } }])
    );
  }

  //db.close();
}

export = UpdateToLatest;
