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
  sync: boolean
) {
  let currentHost;
  let currentModules: { [key: string]: any } = {};
  let last_successful_update;
  let running_update;

  const installedHostsAndModules = JSON.parse(
    db.runQuery(
      `SELECT value FROM key_values WHERE key = 'host/app/${release_channel}/${platform}/${arch}'`
    )[0].value
  )[0];

  currentHost = installedHostsAndModules.host_version.version;

  for (const module of installedHostsAndModules.modules) {
    currentModules[module.module_version.module.name] =
      module.module_version.version;
  }

  // TODO: Maybe check if making last_successful_update equalling running_update would cause any update issues...

  last_successful_update = JSON.parse(
    db.runQuery(
      `SELECT value FROM key_values WHERE key = 'latest/host/app/${release_channel}/${platform}/${arch}'`
    )[0].value
  );

  running_update = last_successful_update;

  if (sync) {
    return JSON.stringify({
      VersionInfo: {
        current_host: currentHost,
        current_modules: currentModules,
        last_successful_update: last_successful_update,
        running_update: updater.isRunningUpdate ? running_update : null,
        pinned_update: null,
      },
    });
  } else {
    response_handler(
      JSON.stringify([
        request[0],
        {
          VersionInfo: {
            current_host: currentHost,
            current_modules: currentModules,
            last_successful_update: last_successful_update,
            running_update: updater.isRunningUpdate ? running_update : null,
            pinned_update: null,
          },
        },
      ])
    );
  }
}

export { QueryCurrentVersions };
