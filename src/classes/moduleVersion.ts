class moduleVersion {
    hostVersion: any;
    name: any;
    version: any;
    constructor(
      hostVersion: {
        host: {
          name: string;
          release_channel: any;
          platform: any;
          arch: string;
          version: any;
        };
      },
      name: any,
      version: any
    ) {
      (this.hostVersion = hostVersion),
        (this.name = name),
        (this.version = version);
    }
  
    details() {
      return {
        module: {
          host_version: {
            ...this.hostVersion,
          },
          name: this.name,
        },
        version: this.version,
      };
    }
  }

  export {moduleVersion};