class TaskProgressDetail {
  task: any;
  version: any;
  from_version: any;
  package_sha256: any;
  url: any;
  state: any;
  progress: any;
  bytes: any;

  constructor(
    task: any,
    version: any,
    from_version: any,
    package_sha256: any,
    url: any,
    state: string,
    progress: number,
    bytes: number
  ) {
    this.task = task;
    this.version = version;
    this.from_version = from_version;
    this.package_sha256 = package_sha256;
    this.url = url;
    this.state = state;
    this.progress = progress;
    this.bytes = bytes;
  }

  formatted() {
    return [
      {
        [this.task]: {
          version: {
            ...this.version,
          },
          from_version: this.from_version,
          package_sha256: this.package_sha256,
          url: this.url,
        },
      },
      this.state,
      this.progress,
      this.bytes,
    ];
  }

  updateTask(update: {
    state: any;
    progress: any;
    bytes: any;
  }) {
    this.state = update.state ? update.state : this.state;
    this.progress = update.progress ? update.progress : this.progress;
    this.bytes = update.bytes ? update.bytes : this.bytes;
  }
}

export = TaskProgressDetail;
