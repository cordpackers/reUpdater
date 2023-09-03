import { parentPort, workerData } from "worker_threads";
import * as fs from "fs";
import path from "path";

import TaskProgressDetail from "../classes/messages/taskProgress.js";
import fetch from "../compat/fetch.js";

async function downloadFile(
  url: string,
  filePath: string,
  package_sha256: string,
  task: TaskProgressDetail,
  parentPort: any
) {
  const fileStream = fs.createWriteStream(filePath);

  const response = await fetch(url);
  const contentLength = response.headers.get("content-length");
  const reader = response.body?.getReader();
  if (!contentLength || !reader) {
    return;
  }
  const total = parseInt(contentLength);

  let receivedLength = 0;
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    fileStream.write(value);
    receivedLength += value.length;

    const percentage = (receivedLength / total) * 100;

    task.state = "Working";
    task.progress = parseFloat(percentage.toFixed(1));
    task.bytes = receivedLength;

    parentPort?.postMessage(task.formatted());
  }

  fs.renameSync(
    filePath,
    path.join(path.dirname(filePath), "..", package_sha256)
  );

  task.state = "Complete";
  task.progress = 100.0;
  task.bytes = 0;

  parentPort?.postMessage(task.formatted());
}

function generate_id(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
    counter += 1;
  }
  return result;
}

async function performDownload(
  type: any,
  version: any,
  from_version = null,
  package_sha256: any,
  url: any,
  root_path: any
) {
  const task = new TaskProgressDetail(
    type,
    version,
    from_version,
    package_sha256,
    url,
    "Waiting",
    0.0,
    0
  );

  parentPort?.postMessage(task.formatted());

  await downloadFile(
    url,
    `${root_path}\\download\\incoming\\.tmp${generate_id(6)}`,
    package_sha256,
    task,
    parentPort
  );
}

const { type, version, from_version, package_sha256, url, root_path } =
  workerData;

performDownload(
  type,
  version,
  from_version,
  package_sha256,
  url,
  root_path
).catch((error) => {
  throw error;
});
