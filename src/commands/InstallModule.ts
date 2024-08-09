import { parentPort, workerData } from "worker_threads";

import moduleVersion from "../classes/details/moduleVersion.js";
import { performDownload } from "../workers/common/performDownload.js";
import { performInstall } from "../workers/common/performInstall.js";

async function InstallModule(
  updater_options: {
    release_channel: any;
    platform: any;
    root_path: any;
    arch: any;
    latestResponse: any;
  },
  name: any,
  options: any,
  installedHostsAndModules: any
) {
  const moduleData = updater_options.latestResponse.modules[name].full;
  const modulesVersionDetails = {
    version: new moduleVersion(
      installedHostsAndModules.host_version,
      name,
      moduleData.module_version
    ).formatted(),
    from_version: null,
    package_sha256: moduleData.package_sha256,
    url: moduleData.url,
  };

  await performDownload(
    "ModuleDownload",
    modulesVersionDetails.version,
    modulesVersionDetails.from_version,
    modulesVersionDetails.package_sha256,
    modulesVersionDetails.url,
    updater_options.root_path,
    parentPort
  );

  await performInstall(
    "ModuleInstall",
    modulesVersionDetails.version,
    modulesVersionDetails.from_version,
    modulesVersionDetails.package_sha256,
    modulesVersionDetails.url,
    updater_options.root_path,
    parentPort
  );

  parentPort?.postMessage(JSON.stringify({
    sendManifest: {
      ...updater_options.latestResponse,
    },
  }));
}

const { updater_options, name, options, installedHostsAndModules } =
  workerData;

InstallModule(
  updater_options,
  name,
  options,
  installedHostsAndModules,
).catch((error) => {
  throw error;
});
