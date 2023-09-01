// Downloads the files to rootPath/download. It first download as .tmp(randomID) in the incoming folder of the download folder but after finish move to the download folder and rename it to the hash.
// all files are in .tar.br

// Both HostDownload and HostInstall will run, HostInstall will only start after HostDownload finishes
async function host(type, release_channel, platform, arch, from_version = null) {
    const detail = [
        {
            [type]: {
                version: {
                    host: {
                        name: "app",
                        release_channel: release_channel,
                        platform: platform,
                        arch: arch,
                        version: undefined,
                    }
                },
                from_version: from_version,
                package_sha256: undefined,
                url: undefined
            }
        },
        "Waiting", // Three Stages (Waiting, Working, Complete)
        0.0, // percentage
        0 // bytes
    ]

    return detail
}