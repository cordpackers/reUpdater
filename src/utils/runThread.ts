import { Worker } from "worker_threads";
import path from "path";

async function runThread(
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

  return new Promise<any>((resolve, reject) => {
    let sendToDB: any;
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", async (message) => {
      const stringMessage = JSON.stringify(message);
      if (stringMessage.includes("sendToDB")) {
        sendToDB = message.sendToDB;
      } else {
        response_handler(
          JSON.stringify([request[0], { TaskProgress: message }])
        );
      }
      if (stringMessage.includes("Complete")) {
        switch (task.type) {
          case "HostDownload":
          case "ModuleDownload": {
            resolve(false);
            break;
          }
          case "HostInstall":
          case "ModuleInstall": {
            resolve(sendToDB)
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

export { runThread };
