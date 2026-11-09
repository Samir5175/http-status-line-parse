import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStatusLine, StatusLineError } from '../src/index.js';

test('parses a canonical status line', () => {
  const result = parseStatusLine('HTTP/1.1 200 OK');
  assert.deepEqual(result, { version: 'HTTP/1.1', status: 200, reason: 'OK' });
});

test('parses a status line with a trailing CRLF', () => {
  const result = parseStatusLine('HTTP/1.1 404 Not Found\r\n');
  assert.deepEqual(result, {
    version: 'HTTP/1.1',
    status: 404,
    reason: 'Not Found',
  });
});

test('parses a status line with a bare LF', () => {
  const result = parseStatusLine('HTTP/1.0 204 No Content\n');
  assert.deepEqual(result, {
    version: 'HTTP/1.0',
    status: 204,
    reason: 'No Content',
  });
});

test('accepts HTTP/2.0 as a version token', () => {
  const result = parseStatusLine('HTTP/2.0 200');
  assert.deepEqual(result, { version: 'HTTP/2.0', status: 200, reason: '' });
});

test('allows a missing reason phrase with no trailing space', () => {
  const result = parseStatusLine('HTTP/1.1 500');
  assert.deepEqual(result, { version: 'HTTP/1.1', status: 500, reason: '' });
});

test('allows an empty reason phrase after the second space', () => {
  const result = parseStatusLine('HTTP/1.1 200 ');
  assert.deepEqual(result, { version: 'HTTP/1.1', status: 200, reason: '' });
});

test('preserves internal spaces in the reason phrase', () => {
  const result = parseStatusLine('HTTP/1.1 418 I am a teapot');
  assert.deepEqual(result, {
    version: 'HTTP/1.1',
    status: 418,
    reason: 'I am a teapot',
  });
});

test('trims surrounding whitespace from the reason phrase', () => {
  const result = parseStatusLine('HTTP/1.1 200   OK  ');
  assert.deepEqual(result, { version: 'HTTP/1.1', status: 200, reason: 'OK' });
});

test('rejects a non-string input', () => {
  assert.throws(() => parseStatusLine(200), StatusLineError);
  assert.throws(() => parseStatusLine(null), StatusLineError);
});

test('rejects a line with no space', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1'), StatusLineError);
});

test('rejects an unknown protocol token', () => {
  assert.throws(() => parseStatusLine('FTP/1.1 200 OK'), StatusLineError);
});

test('rejects a multi-digit version component', () => {
  assert.throws(() => parseStatusLine('HTTP/1.10 200 OK'), StatusLineError);
});

test('rejects a non-numeric status code', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1 OK OK'), StatusLineError);
});

test('rejects a status code with the wrong number of digits', () => {
  assert.throws(() => parseStatusLine('HTTP/1.1 20 OK'), StatusLineError);
  assert.throws(() => parseStatusLine('HTTP/1.1 2000 OK'), StatusLineError);
});

test('rejects an embedded line break in the reason phrase', () => {
  assert.throws(
    () => parseStatusLine('HTTP/1.1 200 OK\r\nX-Injected: 1'),
    StatusLineError,
  );
});

test('exposes the original input on the error', () => {
  try {
    parseStatusLine('nonsense');
    assert.fail('expected a StatusLineError');
  } catch (err) {
    assert.ok(err instanceof StatusLineError);
    assert.equal(err.input, 'nonsense');
    assert.equal(err.name, 'StatusLineError');
  }
});
