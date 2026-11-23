const test = require("node:test");
const assert = require("node:assert/strict");
const { createShortCode, normalizeHttpUrl } = require("./url");

test("accepts and normalizes HTTP and HTTPS links", () => {
  assert.equal(normalizeHttpUrl("https://example.com/a b"), "https://example.com/a%20b");
  assert.equal(normalizeHttpUrl("http://example.com"), "http://example.com/");
});

test("rejects malformed, non-web, and oversized links", () => {
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("not a url"), null);
  assert.equal(normalizeHttpUrl(`https://example.com/${"a".repeat(2050)}`), null);
});

test("creates URL-safe short codes with enough entropy", () => {
  const first = createShortCode();
  const second = createShortCode();
  assert.match(first, /^[\w-]{7}$/);
  assert.notEqual(first, second);
});

