# node-stream-equal [![Build Status](https://secure.travis-ci.org/fent/node-stream-equal.png)](http://travis-ci.org/fent/node-stream-equal)

Test that two readable streams are equal to each other.


# Usage

```js
var streamEqual = require('stream-equal');
var fs = require('fs');

var readStream1 = fs.createReadStream(file);
var readStream2 = fs.createReadStream(file);
streamEqual(readStream1, readStream2, function(err, equal) {
  console.log(equal); // true
});
```


# Motive
Useful for testing. This method is faster and uses much less memory than buffering entire streams and comparing their content, specially for bigger files.

You could also get the hash sum of a stream to test it against another stream. But that would take up more CPU due to the hashing and would require the entire streams to be read if they are not equal.


# API
### streamEqual(readStream1, readStream2, callback(err, equal))

Will compare each `data` event on both streams, pausing when needed to keep them in sync. `equal` will be either `true` or `false` if there is no `err`.


# Install

    npm install stream-equal


# Tests
Tests are written with [mocha](http://visionmedia.github.com/mocha/)

```bash
npm test
```

# License
MIT
