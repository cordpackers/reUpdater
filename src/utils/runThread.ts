import { Worker } from "worker_threads";
import path from "path";

function runThread(
  task: any,
  workerData: any,
  response_handler: (arg0: string) => void,
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

  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", (message) => {
      const stringMessage = JSON.stringify(message);
      response_handler(JSON.stringify([request[0], { TaskProgress: message }]));
      if (stringMessage.includes("Complete")) {
        resolve();
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

export { runThread };
