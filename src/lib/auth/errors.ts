/**
 * Distinct error types for the two ways authorization can fail:
 *
 * - AuthenticationError: the request has no valid session (no identity).
 * - AuthorizationError: identity exists but lacks permission for this action.
 *
 * These are mapped to safe user-facing messages by the action error mapper and
 * are never surfaced with stack traces to the client.
 */
export class AuthenticationError extends Error {
  constructor(
    message = "Please sign in to continue."
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}