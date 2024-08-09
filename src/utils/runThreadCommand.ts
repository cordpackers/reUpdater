import { Worker } from "worker_threads";

async function runThreadCommand(
  workerScriptPath: any,
  workerData: any,
  response_handler: any,
  request: any[]
) {
  return new Promise<any>((resolve, reject) => {
    let sendResolve: any[] = [];
    const worker = new Worker(workerScriptPath, { workerData });

    worker.on("message", async (message) => {
      const JSONMessage = JSON.parse(message);
      if (message.includes("sendToDB")) {
        sendResolve.push(JSONMessage.sendToDB);
      } else if (message.includes("sendManifest")) {
        sendResolve.push(JSONMessage.sendManifest);
        resolve(sendResolve);
      } else {
        response_handler(
          JSON.stringify([request[0], { TaskProgress: JSONMessage }])
        );
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

export { runThreadCommand };
