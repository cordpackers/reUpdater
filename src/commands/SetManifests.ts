// TODO: Implement stubbed commands
// Apparently it returns "OK" and only handle Pinned ones. Haven't seen it before though.

function SetManifests(response_handler: any, request: any, sync: any) {
  if (sync) {
    return "Ok"
  } else {
    response_handler(JSON.stringify([request[0], "Ok"]))
  };
}

export { SetManifests };
