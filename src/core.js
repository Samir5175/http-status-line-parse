// Core parsing logic for HTTP status lines.
//
// The grammar we accept is the one from RFC 7230 section 3.1.2:
//
//   status-line = HTTP-version SP status-code SP reason-phrase CRLF
//
// We make two deliberate decisions, both documented in the README:
//
// 1. The trailing CRLF is optional. A parser that demands it cannot be used
//    on the first line of a buffer that has not yet received the newline, and
//    callers almost always strip line endings before handing us a string.
// 2. A missing reason phrase is allowed. RFC 7230 says the reason phrase may
//    be empty, and some real servers emit "HTTP/1.1 200" with no trailing
//    space at all.

/**
 * Thrown when a string cannot be interpreted as an HTTP status line.
 *
 * A dedicated error class (rather than a bare Error) lets callers distinguish
 * "this is not a status line" from "something exploded deeper down", which is
 * the only interesting question when parsing untrusted network input.
 */
export class StatusLineError extends Error {
  /**
   * @param {string} message Human readable description of the failure.
   * @param {string} input The original input that failed to parse.
   */
  constructor(message, input) {
    super(message);
    this.name = 'StatusLineError';
    this.input = input;
  }
}

// HTTP-version is "HTTP" "/" DIGIT "." DIGIT per RFC 7230. We accept exactly
// one digit on each side; this is what the grammar says, and being permissive
// here would let "HTTP/1.10" through, which no real server sends and which
// callers would then have to re-validate.
const VERSION_RE = /^HTTP\/([0-9])\.([0-9])$/;

// status-code is 3DIGIT.
const STATUS_RE = /^[0-9]{3}$/;

/**
 * Parse an HTTP status line into its three components.
 *
 * @param {string} line The status line, with or without a trailing CRLF.
 * @returns {{version: string, status: number, reason: string}}
 *   `version` is the full "HTTP/x.y" token, `status` is the numeric status
 *   code, and `reason` is the reason phrase with surrounding whitespace
 *   trimmed. An absent reason phrase yields the empty string.
 * @throws {StatusLineError} If the input is not a status line.
 */
export function parseStatusLine(line) {
  if (typeof line !== 'string') {
    throw new StatusLineError('status line must be a string', String(line));
  }

  // Strip at most one trailing CRLF (or bare LF). We do not use trim() here
  // because leading whitespace is a syntax error, not padding, and the reason
  // phrase may legitimately contain spaces we must preserve.
  let body = line;
  if (body.endsWith('\r\n')) {
    body = body.slice(0, -2);
  } else if (body.endsWith('\n')) {
    body = body.slice(0, -1);
  }

  // A status line is exactly three space-separated fields, but the reason
  // phrase itself may contain spaces, so we split on the first two spaces
  // only.
  const firstSpace = body.indexOf(' ');
  if (firstSpace === -1) {
    throw new StatusLineError('missing status code', line);
  }

  const version = body.slice(0, firstSpace);
  if (!VERSION_RE.test(version)) {
    throw new StatusLineError(`invalid HTTP version: ${version}`, line);
  }

  const rest = body.slice(firstSpace + 1);
  const secondSpace = rest.indexOf(' ');

  let statusText;
  let reason;
  if (secondSpace === -1) {
    statusText = rest;
    reason = '';
  } else {
    statusText = rest.slice(0, secondSpace);
    reason = rest.slice(secondSpace + 1);
  }

  if (!STATUS_RE.test(statusText)) {
    throw new StatusLineError(`invalid status code: ${statusText}`, line);
  }

  // The reason phrase is optional but, when present, must not contain control
  // characters. We check for the common case (a stray CR or LF in the middle
  // of the line) rather than trying to enforce the full RFC obs-text grammar.
  if (/[\r\n]/.test(reason)) {
    throw new StatusLineError('reason phrase contains a line break', line);
  }

  return {
    version,
    status: Number.parseInt(statusText, 10),
    reason: reason.trim(),
  };
}
