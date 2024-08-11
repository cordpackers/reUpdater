import path from "path";
import EventEmitter from "events";
import getPath from 'platform-folders';
const createShortcut = require('create-desktop-shortcuts');

import { SQLiteDB } from "./classes/database.js";
import UpdateToLatest from "./commands/UpdateToLatest.js";
import errorMessage from "./classes/messages/errorMessage.js";
import { QueryCurrentVersions } from "./commands/QueryCurrentVersions.js";
import { SetManifests } from "./commands/SetManifests.js";
import { CollectGarbage } from "./commands/CollectGarbage.js";
import { runThreadCommand } from "./utils/runThreadCommand.js";

import packageJson from "../package.json";

const installedModulesEvent = new EventEmitter();

class Updater {
  response_handler: any;
  release_channel: any;
  platform: any;
  repository_url: any;
  root_path: any;
  user_data_path: any;
  db: SQLiteDB;
  arch: () => "x64" | "x86" | undefined;
  install_id: () => any;
  updateFinished: boolean;
  isRunningUpdate: any | undefined;
  installedHostsAndModules: any;

  constructor(options: {
    response_handler: any;
    release_channel: any;
    platform: any;
    repository_url: any;
    root_path: any;
    current_os_arch: any | undefined;
    user_data_path: any;
  }) {
    this.response_handler = options.response_handler;
    this.release_channel = options.release_channel;
    this.platform = options.platform;
    this.repository_url = options.repository_url;
    this.root_path = options.root_path;
    this.user_data_path = options.user_data_path;

    this.db = new SQLiteDB(path.join(this.root_path, "installer.db"));
    this.arch = () => {
      if (options.current_os_arch) {
        return options.current_os_arch;
      } else {
        switch (process.arch) {
          case "x64": {
            return "x64";
          }
          case "ia32": {
            return "x86";
          }
        }
      }
    };
    this.install_id = () => {
      let install_id: any = "";

      const result = this.db.runQuery(
        `SELECT value FROM key_values WHERE key = 'install_id'`
      );

      if (result.length !== 0) {
        install_id = result[0].value.slice(1, -1);
      } else {
        install_id = null;
      }

      return install_id;
    };
    this.installedHostsAndModules = JSON.parse(
      this.db.runQuery(
        `SELECT value FROM key_values WHERE key = 'host/app/${
          this.release_channel
        }/${this.platform}/${this.arch()}'`
      )[0].value
    )[0];
    this.updateFinished = false;
  }

  async command(rawRequest: string) {
    let taskText;
    const request = JSON.parse(rawRequest);
    if (typeof request[1] === "object") {
      taskText = Object.keys(request[1])[0];
    } else {
      taskText = request[1];
    }
    try {
      switch (taskText) {
        case "CollectGarbage": {
          CollectGarbage(this.response_handler, request, this);
          break;
        }
        case "UpdateToLatest": {
          UpdateToLatest(
            this.response_handler,
            request,
            {
              release_channel: this.release_channel,
              platform: this.platform,
              repository_url: this.repository_url,
              root_path: this.root_path,
              db: this.db,
              arch: this.arch(),
              install_id: this.install_id(),
            },
            this,
            request[1].UpdateToLatest.options,
            this.installedHostsAndModules
          );
          break;
        }
        case "InstallModule": {
          // TODO: Update Install states as it installs, or deletes. Maybe PendingInstall is redundant in this reimplementation?
          // Discord Install States: PendingInstall, Installed, PendingDelete
          const response = JSON.parse(
            this.db.runQuery(
              `SELECT value FROM key_values WHERE key = 'latest/host/app/${
                this.release_channel
              }/${this.platform}/${this.arch()}'`
            )[0].value
          );
          runThreadCommand(
            path.join(__dirname, "commands", "InstallModule.js"),
            {
              updater_options: {
                release_channel: this.release_channel,
                platform: this.platform,
                root_path: this.root_path,
                arch: this.arch(),
                latestResponse: response,
              },
              name: request[1].InstallModule.name,
              options: request[1].InstallModule.options,
              installedHostsAndModules: this.installedHostsAndModules,
            },
            this.response_handler,
            request
          )
            .then((result) => {
              let sendToDB;
              let sendManifest;
              if (result[0].hasOwnProperty("type")) {
                sendToDB = result[0];
                sendManifest = result[1];
              } else {
                sendManifest = result[0];
              }
              if (sendToDB) {
                installedModulesEvent.emit(
                  "installed",
                  sendToDB,
                  this.db,
                  this.installedHostsAndModules,
                  this.release_channel,
                  this.platform,
                  this.arch()
                );
              }
              this.response_handler(
                JSON.stringify([
                  request[0],
                  { ManifestInfo: { ...sendManifest } },
                ])
              );
            })
            .catch((err) => {
              console.error(err);
            });
          break;
        } // Downloads and installs additional modules after updating to latest version
        case "Repair": {
          break;
        } // Never seen a repairing Discord before... maybe reinstall everything?
        case "QueryCurrentVersions": {
          QueryCurrentVersions(
            this.response_handler,
            request,
            {
              release_channel: this.release_channel,
              platform: this.platform,
              db: this.db,
              arch: this.arch(),
            },
            this,
            request[1].QueryCurrentVersions.options,
            false,
            this.installedHostsAndModules
          );
          break;
        }
        case "SetManifests": {
          SetManifests(this.response_handler, request, false);
        }
      }
    } catch (error) {
      this.response_handler(
        JSON.stringify([
          request[0],
          new errorMessage("Other", `${error}`, "Default").formatted(),
        ])
      );
    }
  }

  command_blocking(rawRequest: string) {
    let taskText;
    const request = JSON.parse(rawRequest);
    if (typeof request[1] === "object") {
      taskText = Object.keys(request[1])[0];
    } else {
      taskText = request[1];
    }
    switch (taskText) {
      case "QueryCurrentVersions": {
        return QueryCurrentVersions(
          this.response_handler,
          request,
          {
            release_channel: this.release_channel,
            platform: this.platform,
            db: this.db,
            arch: this.arch(),
          },
          this,
          request[1].QueryCurrentVersions.options,
          true,
          this.installedHostsAndModules
        );
      }
      case "SetManifests": {
        return SetManifests(this.response_handler, request, true);
      }
    }
  }

  known_folder(name: any) {
    return getPath(name);
  }

  create_shortcut(options: any) {
    const shortcutName = path.basename(options.shortcut_path, "lnk")
    const outputPath = path.dirname(options.shortcut_path)
    createShortcut({
      onlyCurrentOS: true,
      windows: {
        filePath: options.target_path,
        outputPath: outputPath,
        name: shortcutName,
        comment: options.description,
        icon: `${options.icon_path},${options.icon_index}`,
        arguments: options.arguments,
        workingDirectory: options.working_directory
      }
    })
  }
}

console.log(
  `[Updater] reUpdater v${packageJson.version} - Typescript/Javascript-based updater.node replacement`
);

installedModulesEvent.on(
  "installed",
  (
    installedModuleResults,
    db,
    installedHostsAndModules,
    release_channel,
    platform,
    arch
  ) => {
    if ((installedModuleResults.type = "ModuleInstall")) {
      installedHostsAndModules.modules.push({
        module_version: installedModuleResults.version,
        distro_manifest: installedModuleResults.delta_manifest,
        install_state: "Installed",
      });
    }

    try {
      db.runQuery(`
                UPDATE key_values
                SET value = '[${JSON.stringify(installedHostsAndModules)}]'
                WHERE key = 'host/app/${release_channel}/${platform}/${arch}'
              `);
    } catch (error) {
      throw error;
    }
  }
);

export = {
  Updater,
};
