import crypto from "crypto";
import fs from "fs-extra";
import path from "path";

import moduleVersion from "../classes/details/moduleVersion.js";
import { SQLiteDB } from "../classes/database.js";
import hostVersion from "../classes/details/hostVersion.js";
import { runThreadTask } from "../utils/runThreadTask.js";
import { createFolder } from "../utils/createFolder.js";
import fetch from "../compat/fetch.js";

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
  updater: any,
  options: any,
  installedHostsAndModules: any
) {
  let currentModules: { [key: string]: any } = {};

  if (!install_id) {
    install_id = crypto.randomUUID();
    try {
      db.runQuery(`
          INSERT INTO key_values (key, value)
          VALUES ('install_id', '"${install_id}"')
        `);
      console.log('[Updater] Row "install_id" has been inserted successfully');
    } catch (error) {
      throw error;
    }
  } else {
    install_id = install_id;
  }

  let needUpdateLatestHost = true; // assume that it needed updating

  const currentHostVersion = installedHostsAndModules.host_version.version;

  console.log(`[Updater] Current version: ${currentHostVersion}`);

  if (!currentHostVersion) {
    throw new Error("No hostVersion");
  }

  let response;

  const latestUpdateFromDB = db.runQuery(
    `SELECT value FROM key_values WHERE key = 'latest/host/app/${release_channel}/${platform}/${arch}'`
  );

  if (latestUpdateFromDB.length !== 0) {
    response = JSON.parse(latestUpdateFromDB[0].value);
  }

  const fetchedData = await (
    await fetch(
      `${repository_url}distributions/app/manifests/latest?install_id=${install_id}&channel=${release_channel}&platform=${platform}&arch=${arch}`
    )
  ).json();

  if (!response || JSON.stringify(response) !== JSON.stringify(fetchedData)) {
    response = fetchedData;

    try {
      db.runQuery(`
    UPDATE key_values
    SET value = '${JSON.stringify(response)}'
    WHERE key = 'latest/host/app/${release_channel}/${platform}/${arch}'
  `);
      console.log(
        `[Updater] Row "latest/host/app/${release_channel}/${platform}/${arch}" has been inserted successfully`
      );
    } catch (error) {
      throw error;
    }
  }

  if (
    JSON.stringify(fetchedData.full.host_version) ===
    JSON.stringify(currentHostVersion)
  ) {
    console.log(
      `[Updater] Host update skipped, running on latest host version.`
    );
    needUpdateLatestHost = false;
  }

  for (const module of installedHostsAndModules.modules) {
    currentModules[module.module_version.module.name] =
      module.module_version.version;
  }

  if (
    !needUpdateLatestHost &&
    Object.keys(currentModules).some((key) => {
      return (
        response.required_modules.includes(key) &&
        response.modules[key].full.module_version === currentModules[key]
      );
    })
  ) {
    console.log(
      `[Updater] Module update skipped, all modules are running on latest version.`
    );
    updater.updateFinished = true;
  }

  if (!updater.updateFinished) {
    // TODO: Check if there is a delta update package, if there is, copy the whole current folder and install changes
    // Full update current works though but will work on delta updating in the future

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

    let tasks: [object[], object[]] = [[], []];

    if (needUpdateLatestHost) {
      tasks[0].push({
        type: "HostDownload",
        ...newHostVersionDetails,
      });
      tasks[1].push({
        type: "HostInstall",
        ...newHostVersionDetails,
      });
    }

    let modulesVersionDetails: object[] = [];
    let modulesToInstall: any[] = [];

    if (installedHostsAndModules.modules.length === 0) {
      modulesToInstall = response.required_modules;
    } else if (needUpdateLatestHost) {
      modulesToInstall = Object.keys(currentModules);
    } else {
      modulesToInstall = Object.keys(currentModules).filter((key) => {
        return (
          response.modules[key].full.module_version !== currentModules[key]
        );
      });
    }

    for (const module of modulesToInstall) {
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

    // TODO: Update Install states as it installs, or deletes. Maybe PendingInstall is redundant in this reimplementation?
    // Discord Install States: PendingInstall, Installed, PendingDelete

    async function processTasks() {
      for (const task of tasks) {
        const taskPromises = task.map((task: any) =>
          runThreadTask(
            task,
            {
              ...task,
              root_path: root_path,
              release_channel: release_channel,
              platform: platform,
              arch: arch,
            },
            response_handler,
            request
          )
        );
        const result = Promise.all(taskPromises);
        if (
          (await result) &&
          (await result).some((result) => {
            if (result) {
              return true;
            } else {
              return false;
            }
          })
        ) {
          for (const hostOrModule of await result) {
            switch (hostOrModule[0].type) {
              case "HostInstall": {
                installedHostsAndModules.host_version = hostOrModule[0].version;
                installedHostsAndModules.distro_manifest =
                  hostOrModule[0].delta_manifest;
              }
              case "ModuleInstall": {
                installedHostsAndModules.modules.push({
                  module_version: hostOrModule[0].version,
                  distro_manifest: hostOrModule[0].delta_manifest,
                  install_state: "Installed",
                });
              }
            }
          }
        }
      }
    }

    const downloadFolder = path.join(root_path, "download");
    const incomingFolder = path.join(downloadFolder, "incoming");

    // TODO: Instead of removing folder after update failed, check if there are packages in the download folder and skip if sha256 matches

    const isDownloadFolderExists = createFolder(downloadFolder);

    switch (isDownloadFolderExists) {
      case "folderExists": {
        fs.rm(downloadFolder, { recursive: true, force: true }, () => {});
        createFolder(downloadFolder);
        createFolder(incomingFolder);
        break;
      }
      default: {
        createFolder(incomingFolder);
        break;
      }
    }

    await processTasks();

    try {
      db.runQuery(`
    UPDATE key_values
    SET value = '[${JSON.stringify(installedHostsAndModules)}]'
    WHERE key = 'host/app/${release_channel}/${platform}/${arch}'
  `);
      console.log(
        `[Updater] Row "host/app/${release_channel}/${platform}/${arch}" has been inserted successfully`
      );
    } catch (error) {
      throw error;
    }

    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...response } }])
    );

    updater.updateFinished = true;
  } else {
    response_handler(
      JSON.stringify([request[0], { ManifestInfo: { ...response } }])
    );
  }
}

export = UpdateToLatest;
