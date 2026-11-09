# http-status-line-parse

Parses an HTTP status line into its protocol version, numeric status code, and
reason phrase.

```js
import { parseStatusLine, StatusLineError } from 'http-status-line-parse';

const { version, status, reason } = parseStatusLine('HTTP/1.1 404 Not Found\r\n');
// version === 'HTTP/1.1'
// status  === 404
// reason  === 'Not Found'

try {
  parseStatusLine('garbage');
} catch (err) {
  if (err instanceof StatusLineError) {
    // err.input holds the string that failed to parse.
  }
}
```

## Why this exists

Status lines arrive from the network as bytes, often split across buffer
boundaries and almost always with the line terminator already stripped by
whatever read them. A regular expression that demands `\r\n` fails on the first
partial read; one that accepts anything between `HTTP/` and a space accepts
versions no server emits. This library takes one clear position: the trailing
line ending is optional, the version and status code are validated strictly
against the RFC 7230 grammar, and the reason phrase is treated as free-form text
with surrounding whitespace trimmed.

The trade-off is that `parseStatusLine` will not tell you whether the line you
passed in actually ended in CRLF. If you need that distinction, inspect the raw
string before calling.

## The awkward edge

The reason phrase may be absent entirely. Both `HTTP/1.1 200` and
`HTTP/1.1 200 ` parse successfully and yield `reason === ''`. This is
deliberate: RFC 7230 permits an empty reason phrase, and treating a missing one
as an error would reject valid responses from minimal servers.

## API

### `parseStatusLine(line)`

Returns `{ version, status, reason }`.

- `version` is the full token, e.g. `'HTTP/1.1'`.
- `status` is a `number`.
- `reason` is a `string`, possibly empty, with surrounding whitespace trimmed.

Throws `StatusLineError` when the input is not a string or does not match the
status-line grammar. The offending input is available as `err.input`.

### `StatusLineError`

An `Error` subclass with `name === 'StatusLineError'` and an `input` property.
