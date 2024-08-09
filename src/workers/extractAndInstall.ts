import { parentPort, workerData } from "worker_threads";

import { performInstall } from "./common/performInstall";

const {
  type,
  version,
  from_version,
  package_sha256,
  url,
  root_path,
} = workerData;

performInstall(
  type,
  version,
  from_version,
  package_sha256,
  url,
  root_path,
  parentPort
).catch((error) => {
  throw error;
});
