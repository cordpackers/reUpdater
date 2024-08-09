import { parentPort, workerData } from "worker_threads";

import { performDownload } from "./common/performDownload.js";

const { type, version, from_version, package_sha256, url, root_path } =
  workerData;

performDownload(
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