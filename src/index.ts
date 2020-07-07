import { PassThrough, Readable } from 'stream';


interface StreamState {
  id: number;
  stream: Readable;
  data: Buffer;
  pos: number;
  ended: boolean;
  read?: () => void;
}

/**
 * Tests that two readable streams are equal.
 *
 * @param {Readable} stream1
 * @param {Readable} stream2
 * @returns {boolean}
 */
export = (stream1: Readable, stream2: Readable) => new Promise<boolean>((resolve, reject) => {
  const readStream1 = stream1.pipe(new PassThrough({ objectMode: true }));
  const readStream2 = stream2.pipe(new PassThrough({ objectMode: true }));

  const cleanup = (equal: boolean) => {
    stream1.removeListener('error', reject);
    readStream1.removeListener('end', onend1);
    readStream1.removeListener('readable', streamState1.read);

    stream2.removeListener('error', reject);
    readStream2.removeListener('end', onend2);
    readStream1.removeListener('readable', streamState2.read);

    resolve(equal);
  };

  const streamState1: StreamState = {
    id: 1,
    stream: readStream1,
    data: null,
    pos: 0,
    ended: false,
  };
  const streamState2: StreamState = {
    id: 2,
    stream: readStream2,
    data: null,
    pos: 0,
    ended: false,
  };
  streamState1.read = createReadFn(streamState1, streamState2, cleanup);
  streamState2.read = createReadFn(streamState2, streamState1, cleanup);
  const onend1 = createOnEndFn(streamState1, streamState2, cleanup);
  const onend2 = createOnEndFn(streamState2, streamState1, cleanup);

  stream1.on('error', reject);
  readStream1.on('end', onend1);

  stream2.on('error', reject);
  readStream2.on('end', onend2);

  // Start by reading from the first stream.
  streamState1.stream.once('readable', streamState1.read);
});


/**
 * Returns a function that compares emitted `read()` call with that of the
 * most recent `read` call from another stream.
 *
 * @param {StreamState} stream
 * @param {StreamState} otherStream
 * @param {Function(boolean)} resolve
 * @return {Function(Buffer|string)}
 */
const createReadFn = (stream: StreamState, otherStream: StreamState, resolve: (equal: boolean) => void) => {
  return () => {
    let data = stream.stream.read();
    if (!data) {
      return stream.stream.once('readable', stream.read);
    }

    // Make sure `data` is a buffer.
    if (!Buffer.isBuffer(data)) {
      if (typeof data === 'object') {
        data = JSON.stringify(data);
      } else {
        data = data.toString();
      }
      data = Buffer.from(data);
    }

    const newPos = stream.pos + data.length;

    if (stream.pos < otherStream.pos) {
      let minLength = Math.min(data.length, otherStream.data.length);

      let streamData = data.slice(0, minLength);
      stream.data = data.slice(minLength);

      let otherStreamData = otherStream.data.slice(0, minLength);
      otherStream.data = otherStream.data.slice(minLength);

      // Compare.
      for (let i = 0, len = streamData.length; i < len; i++) {
        if (streamData[i] !== otherStreamData[i]) {
          return resolve(false);
        }
      }

    } else {
      stream.data = data;
    }


    stream.pos = newPos;
    if (newPos > otherStream.pos) {
      if (otherStream.ended) {
        // If this stream is still emitting `data` events but the other has
        // ended, then this is longer than the other one.
        return resolve(false);
      }

      // If this stream has caught up to the other,
      // read from other one.
      otherStream.read();

    } else {
      stream.read();
    }
  };
};


/**
 * Creates a function that gets called when a stream ends.
 *
 * @param {StreamState} stream
 * @param {StreamState} otherStream
 * @param {Function(boolean)} resolve
 */
const createOnEndFn = (stream: StreamState, otherStream: StreamState, resolve: (equal: boolean) => void) => {
  return () => {
    stream.ended = true;
    if (otherStream.ended) {
      resolve(stream.pos === otherStream.pos);
    } else {
      otherStream.read();
    }
  };
};
