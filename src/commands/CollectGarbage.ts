// TODO: Implement stubbed commands

function CollectGarbage(response_handler: any, request: any, updater: any) {
    updater.isRunningUpdate = true;
    response_handler(JSON.stringify([request[0], "Ok"]));
  }
  
  export { CollectGarbage };