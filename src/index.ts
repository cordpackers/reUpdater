import path from "path";

import { SQLiteDB } from "./classes/database.js";
import UpdateToLatest from "./commands/UpdateToLatest.js";
import errorMessage from "./classes/messages/errorMessage.js";
import { QueryCurrentVersions } from "./commands/QueryCurrentVersions.js";
import { SetManifests } from "./commands/SetManifests.js";
import { CollectGarbage } from "./commands/CollectGarbage.js";

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
        console.log(`[Updater]: install_id key does not exist. Nulling...`);
        install_id = null;
      }

      return install_id;
    };
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
            request[1].UpdateToLatest.options
          );
          break;
        }
        case "InstallModule": {
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
            false
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
          true
        );
      }
      case "SetManifests": {
        return SetManifests(this.response_handler, request, true);
      }
    }
  }

  known_folder(name: string) {
    // TODO: Returns Desktop or Start Menu
    return "";
  }

  create_shortcut(options: any) {
    // TODO: creates a shortcut on both Desktop or Start Menu if not exist
  }
}

console.log(
  "[Updater] reUpdater v0.5.0 - Javascript-based updater.node replacement"
);

export = {
  Updater,
};
