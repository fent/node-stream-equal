import assert from 'node:assert';
import streamEqual, { streamEqual as namedStreamEqual } from '..';

describe('Exports', () => {
  it('Exposes function as default and named export', () => {
    assert.strictEqual(streamEqual, namedStreamEqual);
    assert.strictEqual(streamEqual.streamEqual, streamEqual);
    assert.strictEqual(streamEqual.default, streamEqual);
  });
});
