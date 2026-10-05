import "server-only";

const failures = {
  AUTH_REQUIRED: [401, "Sign in to continue."],
  AUTH_INVALID: [401, "Email or password is incorrect."],
  ACCOUNT_UNAVAILABLE: [
    409,
    "An account could not be created with these details. Try signing in.",
  ],
  RATE_LIMITED: [429, "Too many requests. Please try again later."],
  NOT_FOUND: [404, "This thread could not be found."],
  CONFLICT: [
    409,
    "This thread is processing or has changed. Refresh and try again.",
  ],
  THREAD_CLOSED: [409, "Reopen this thread before adding Reality."],
  INVALID_ACTION: [400, "Check the details and try again."],
  DELETE_CONFIRMATION: [
    400,
    "Enter your password and DELETE to delete your account.",
  ],
  APP_NOT_CONFIGURED: [
    503,
    "Fennlo is temporarily unavailable. Please try again later.",
  ],
  INVALID_BODY: [400, "The request could not be read. Please try again."],
  INVALID_INPUT: [
    400,
    "Add a client conversation (up to 20,000 characters) and a goal (up to 4,000 characters).",
  ],
  BODY_TOO_LARGE: [
    413,
    "This conversation is too large. Paste a shorter conversation and try again.",
  ],
  BODY_TIMEOUT: [408, "The request took too long to arrive. Please try again."],
  UNSUPPORTED_MEDIA: [415, "Send the conversation and goal as JSON."],
  CROSS_ORIGIN: [
    403,
    "This request could not be accepted. Refresh Fennlo and try again.",
  ],
  AI_NOT_CONFIGURED: [
    503,
    "Fennlo is not ready yet. The operator needs to configure the AI service.",
  ],
  AI_TIMEOUT: [
    504,
    "Determining the next move took too long. Please try again.",
  ],
  AI_UNAVAILABLE: [
    503,
    "The AI service is unavailable or its quota is exhausted. Please try again later.",
  ],
  AI_INVALID_RESPONSE: [
    502,
    "Fennlo couldn't verify a usable next move. Please try again.",
  ],
  AI_RESPONSE_LIMIT: [
    502,
    "The AI service returned too much information. Please try again.",
  ],
  INTERNAL_ERROR: [
    500,
    "Fennlo couldn't complete this request. Please try again.",
  ],
} as const;

export class AppError extends Error {
  readonly status: number;
  constructor(readonly code: keyof typeof failures) {
    super(failures[code][1]);
    this.name = "AppError";
    this.status = failures[code][0];
  }
}
