/**
 * Tests that two readable streams are equal.
 *
 * @param (ReadableStream) readStream2
 * @param (ReadableStream) readStream2
 * @param (Function(!Error, boolean)) callback
 */
module.exports = function streamEqual(readStream1, readStream2, callback) {
  var stream1 = { stream: readStream1, data: null, pos: 0, ended: false };
  var stream2 = { stream: readStream2, data: null, pos: 0, ended: false };
  var onreadable1 = createOnReadable(stream1, stream2, cleanup);
  var onreadable2 = createOnReadable(stream2, stream1, cleanup);
  var onend1 = createOnEnd(stream1, stream2, cleanup);
  var onend2 = createOnEnd(stream2, stream1, cleanup);

  function cleanup(err, equal) {
    readStream1.removeListener('readable', onreadable1);
    readStream1.removeListener('error', cleanup);
    readStream1.removeListener('end', onend1);

    readStream2.removeListener('readable', onreadable2);
    readStream2.removeListener('error', cleanup);
    readStream2.removeListener('end', onend2);

    callback(err, equal);
  }

  stream1.read = function read() {
    readStream1.once('readable', onreadable1);
  };
  stream1.read();
  readStream1.on('end', onend1);
  readStream1.on('error', cleanup);

  stream2.read = function read() {
    readStream2.once('readable', onreadable2);
  };
  stream2.read();
  readStream2.on('end', onend2);
  readStream2.on('error', cleanup);
};


/**
 * Returns a function that compares emitted `read()` call with that of the
 * most recent `read` call from another stream.
 *
 * @param (Object) stream
 * @param (Object) otherStream
 * @param (Function(Error, boolean)) callback
 * @return (Function(Buffer|string))
 */
function createOnReadable(stream, otherStream, callback) {
  return function onreadable() {
    var data = stream.stream.read();
    if (!data) return stream.read();

    // make sure `data` is a  buffer
    if (!Buffer.isBuffer(data)) {
      var type = typeof data;
      if (type === 'string') {
        data = new Buffer(data);
      } else if (type === 'object') {
        data = JSON.stringify(data);
      } else {
        data = new Buffer(data.toString());
      }
    }

    var newPos = stream.pos + data.length;

    if (stream.pos < otherStream.pos) {
      var minLength = Math.min(data.length, otherStream.data.length);

      var streamData = data.slice(0, minLength);
      stream.data = data.slice(minLength);

      var otherStreamData = otherStream.data.slice(0, minLength);
      otherStream.data = otherStream.data.slice(minLength);

      // compare
      for (var i = 0, len = streamData.length; i < len; i++) {
        if (streamData[i] !== otherStreamData[i]) {
          return callback(null, false);
        }
      }

    } else if (stream.data && stream.data.length) {
      stream.data = bufferConcat(stream.data, data);
    } else {
      stream.data = data;
    }

    if (newPos > otherStream.pos) {
      if (otherStream.ended) {
        // if this stream is still emitting `data` events but the other has
        // ended, then this is longer than the other one
        return callback(null, false);
      }

      // if this stream has caught up to the other,
      // read from other one
      otherStream.read();

    } else if (newPos === otherStream.pos) {
      otherStream.read();
      stream.read();

    } else {
      stream.read();
    }

    stream.pos = newPos;
  };
}


/**
 * Creates a function that gets called when a stream ends.
 *
 * @param (Object) stream
 * @param (Object) otherStream
 * @param (Function(Error, boolean)) callback
 */
function createOnEnd(stream, otherStream, callback) {
  return function onend() {
    stream.ended = true;
    if (otherStream.ended) {
      callback(null, stream.pos === otherStream.pos);
    } else {
      otherStream.read();
    }
  };
}


/**
 * Concatenate two buffers. Because 0.6.x...
 *
 * @param (Buffer) buf1
 * @param (Buffer) buf2
 * @return (Buffer)
 */
function bufferConcat(buf1, buf2) {
  var newBuf = new Buffer(buf1.length + buf2.length);
  buf1.copy(newBuf);
  buf2.copy(newBuf, buf1.length);
  return newBuf;
}
