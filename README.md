# node-stream-equal

Test that two readable streams are equal to each other.

[![Dependency Status](https://david-dm.org/fent/node-stream-equal.svg)](https://david-dm.org/fent/node-stream-equal)
[![codecov](https://codecov.io/gh/fent/node-stream-equal/branch/master/graph/badge.svg)](https://codecov.io/gh/fent/node-stream-equal)

# Usage

```js
const streamEqual = require('stream-equal');
const fs = require('fs');

let readStream1 = fs.createReadStream(file);
let readStream2 = fs.createReadStream(file);
let equal = await streamEqual(readStream1, readStream2);
```


# Motive
Useful for testing. This method of comparing is faster and uses less memory than buffering entire streams and comparing their content, specially for bigger files.

You could also get the hash sum of a stream to test it against another stream. But that would take up more CPU due to the hashing and would require a bit more data to be read if they are not equal.


# API
### async streamEqual(readStream1, readStream2)

A function that compares each `data` event on both streams, pausing when needed to keep them in sync. Returns a proimse that resolves to either `true` or `false`.


# Install

    npm install stream-equal


# Tests
Tests are written with [mocha](https://mochajs.org)

```bash
npm test
```
