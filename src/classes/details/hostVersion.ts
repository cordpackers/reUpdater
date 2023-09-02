class hostVersion {
    release_channel: string
    platform: string
    arch: string
    version: string

    constructor(release_channel: string, platform: string, arch: string, version: string) {
        this.release_channel = release_channel
        this.platform = platform
        this.arch = arch
        this.version = version
    }

    formatted() {
        return {
          host: {
            name: "app",
            release_channel: this.release_channel,
            platform: this.platform,
            arch: this.arch,
          },
          version: this.version,
        };
      }
}

export = hostVersion