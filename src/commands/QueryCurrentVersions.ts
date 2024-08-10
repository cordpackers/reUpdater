import { SQLiteDB } from "../classes/database";

function QueryCurrentVersions(
  response_handler: any,
  request: any,
  {
    release_channel,
    platform,
    db,
    arch,
  }: {
    release_channel: any;
    platform: any;
    db: SQLiteDB;
    arch: any;
  },
  updater: any,
  options: any,
  sync: boolean,
  installedHostsAndModules: any
) {
  let currentHost;
  let currentModules: { [key: string]: any } = {};
  let last_successful_update;
  let running_update;

  currentHost = installedHostsAndModules.host_version.version;

  for (const module of installedHostsAndModules.modules) {
    currentModules[module.module_version.module.name] =
      module.module_version.version;
  }

  last_successful_update = JSON.parse(
    db.runQuery(
      `SELECT value FROM key_values WHERE key = 'latest/host/app/${release_channel}/${platform}/${arch}'`
    )[0].value
  );

  running_update = last_successful_update;

  const response = {
    VersionInfo: {
      current_host: currentHost,
      current_modules: currentModules,
      last_successful_update: last_successful_update,
      running_update: updater.isRunningUpdate ? running_update : null,
      pinned_update: null,
    },
  };

  if (sync) {
    return JSON.stringify(response);
  } else {
    response_handler(JSON.stringify([request[0], response]));
  }
}

export { QueryCurrentVersions };
