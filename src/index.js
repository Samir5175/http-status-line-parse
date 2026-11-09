// Public surface for http-status-line-parse.
//
// The library is deliberately small: one parser, one error type. Everything
// else lives in core.js so that the entry point stays a stable, obvious list
// of what consumers may rely on.
export { parseStatusLine, StatusLineError } from './core.js';
