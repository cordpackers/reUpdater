const { randomUUID } = require('crypto');

class Updater {
    constructor(options) {
        this.response_handler = options.response_handler;
        this.release_channel = options.release_channel;
        this.platform = options.platform;
        this.repository_url = options.repository_url;
        this.root_path = options.root_path;
        this.install_id = randomUUID();
    }

    async command(rawRequest) {

        const request = JSON.parse(rawRequest);

        switch (true) {
            case "UpdateToLatest" in request[1]: {
                await downloadAndUpdate(this.response_handler, request[1], {release_channel: this.release_channel, platform: this.platform, repository_url: this.repository_url, install_id: this.install_id})
            }
        }

    }
}

async function downloadAndUpdate(response_handler, detail, {release_channel, platform, repository_url, install_id}) {
    let arch = "";
    // convert ia32 and x32 to x86
    switch (process.arch) {
        case "x64": {
            arch = "x64";
            break;
        }
        case "ia32":
        case "x32": {
            arch = "x86"
        }
    }
    const fetchedData = await fetch(`${repository_url}distributions/app/manifests/latest?install_id=${install_id}&channel=${release_channel}&platform=${platform}&arch=${arch}`);
    const response = await fetchedData.json();
    console.log(response)
    // Host Download + Host Install, Module Install
}

console.log("reUpdater v0.0.1 - Javascript-based updater.node replacement")

exports.Updater = Updater