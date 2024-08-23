import fs from "fs-extra";
import path from "path";

import fetch from "../../compat/fetch.js";
import TaskProgressDetail from "../../classes/messages/taskProgress.js";

async function downloadFile(
  url: string,
  filePath: string,
  package_sha256: string,
  task: TaskProgressDetail,
  parentPort: any
) {
  const fileStream = fs.createWriteStream(filePath);

  const response = await fetch(url);
  const contentLength = response.headers.get("content-length") ?? response.headers.get("X-Content-Length"); // X-Content-Length is for a workaround in express
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

    parentPort?.postMessage(JSON.stringify(task.formatted()));
  }

  fs.renameSync(
    filePath,
    path.join(path.dirname(filePath), "..", package_sha256)
  );

  task.state = "Complete";
  task.progress = 100.0;
  task.bytes = 0;

  parentPort?.postMessage(JSON.stringify(task.formatted()));
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
  root_path: any,
  parentPort: any
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

  parentPort?.postMessage(JSON.stringify(task.formatted()));

  await downloadFile(
    url,
    path.join(root_path, "download", "incoming", `.tmp${generate_id(6)}`),
    package_sha256,
    task,
    parentPort
  );
}

export { performDownload };
