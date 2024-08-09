import { Worker } from "worker_threads";
import path from "path";

async function runThreadTask(
  task: any,
  workerData: any,
  response_handler: any,
  request: any[]
) {
  let workerScriptPath: any = "";

  switch (task.type) {
    case "HostDownload":
    case "ModuleDownload": {
      workerScriptPath = path.join(__dirname, "..", "workers", "download.js");
      break;
    }
    case "HostInstall":
    case "ModuleInstall": {
      workerScriptPath = path.join(
        __dirname,
        "..",
        "workers",
        "extractAndInstall.js"
      );
    }
  }

  return new Promise<any>((resolve, reject) => {
    let sendResolve: any[] = [];
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", async (message) => {
      const JSONMessage = JSON.parse(message);
      if (message.includes("sendToDB")) {
        sendResolve.push(JSONMessage.sendToDB);
      } else {
        response_handler(
          JSON.stringify([request[0], { TaskProgress: JSONMessage }])
        );
      }
      if (message.includes("Complete")) {
        switch (task.type) {
          case "HostDownload":
          case "ModuleDownload": {
            resolve(false);
            break;
          }
          case "HostInstall":
          case "ModuleInstall": {
            resolve(sendResolve)
          }
        }
      }
    });

    worker.on("error", (error) => {
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

export { runThreadTask };
