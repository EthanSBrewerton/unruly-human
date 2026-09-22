import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeProductDescription } from "../src/lib/shopify-description.ts";

test("sanitizeProductDescription preserves useful product structure", () => {
  const source =
    '<p><strong>Size guide</strong></p><div class="dynamic"><table><tbody><tr><td>S</td><td>28</td></tr></tbody></table></div>';

  assert.equal(
    sanitizeProductDescription(source),
    "<p><strong>Size guide</strong></p><div><table><tbody><tr><td>S</td><td>28</td></tr></tbody></table></div>"
  );
});

test("sanitizeProductDescription removes executable content and unsafe links", () => {
  const source =
    '<script>alert(1)</script><p onclick="alert(2)">Details</p><a href="javascript:alert(3)">bad</a><a href="https://example.com">good</a>';
  const result = sanitizeProductDescription(source);

  assert.doesNotMatch(result, /script|onclick|javascript/i);
  assert.match(result, /<p>Details<\/p>/);
  assert.match(
    result,
    /<a rel="noopener noreferrer">bad<\/a><a href="https:\/\/example.com" rel="noopener noreferrer">good<\/a>/
  );
});