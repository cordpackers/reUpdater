import path from "path";

import { SQLiteDB } from "./classes/database.js";
import UpdateToLatest from "./utils/UpdateToLatest.js";
import errorMessage from "./classes/messages/errorMessage.js";

class Updater {
  response_handler: any;
  release_channel: any;
  platform: any;
  repository_url: any;
  root_path: any;
  db: SQLiteDB;
  arch: () => "x64" | "x86" | undefined;
  install_id: () => any;
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
    this.root_path = options.root_path;
    this.db = new SQLiteDB(path.join(this.root_path, "installer.db"));
    this.arch = () => {
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
    this.install_id = async () => {
      let install_id: any = "";

      try {
        const result = await this.db.runQuery(
          'SELECT value FROM key_values WHERE key = "install_id"'
        );
        install_id = result[0].value.slice(1, -1);
      } catch (error) {
        console.log(`[Updater]: install_id key does not exist. Nulling...`);
        install_id = null;
      }

      return install_id;
    };
    this.updateFinished = false;
  }

  async command(rawRequest: string) {
    const request = JSON.parse(rawRequest);
    try {
      switch (true) {
        case "UpdateToLatest" in request[1]: {
          await UpdateToLatest(
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
            this.updateFinished
          );
        }
      }
    } catch (error) {
      this.response_handler(
        JSON.stringify([
          request[0],
          new errorMessage("Other", error, "Default").formatted(),
        ])
      );
    }
  }
}

console.log(
  "[Updater] reUpdater v0.1.0 - Javascript-based updater.node replacement"
);

export = {
  Updater,
};
