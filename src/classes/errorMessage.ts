class errorMessage {
  kind: string;
  details: any;
  severity: string;

  constructor(kind: string, details: any, severity: string) {
    this.kind = kind;
    this.details = details;
    this.severity = severity;
  }

  formatted() {
    return {
      Error: {
        kind: this.kind,
        details: this.details,
        severity: this.severity,
      },
    };
  }
}

export = errorMessage;
