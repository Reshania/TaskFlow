export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details: Record<string, string>) {
    super(400, "Validation failed", details);
  }
}
