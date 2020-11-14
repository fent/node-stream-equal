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
 * @param {StreamState} streamState
 * @param {StreamState} otherStreamState
 * @param {Function(boolean)} resolve
 * @return {Function(Buffer|string)}
 */
const createReadFn = (streamState: StreamState, otherStreamState: StreamState, resolve: (equal: boolean) => void) => {
  return () => {
    let data = streamState.stream.read();
    if (!data) {
      return streamState.stream.once('readable', streamState.read);
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

    const newPos = streamState.pos + data.length;

    if (streamState.pos < otherStreamState.pos) {
      let minLength = Math.min(data.length, otherStreamState.data.length);

      let streamData = data.slice(0, minLength);
      streamState.data = data.slice(minLength);

      let otherStreamData = otherStreamState.data.slice(0, minLength);
      otherStreamState.data = otherStreamState.data.slice(minLength);

      // Compare.
      for (let i = 0; i < minLength; i++) {
        if (streamData[i] !== otherStreamData[i]) {
          return resolve(false);
        }
      }

    } else {
      streamState.data = data;
    }


    streamState.pos = newPos;
    if (newPos > otherStreamState.pos) {
      if (otherStreamState.ended) {
        // If this stream is still emitting `data` events but the other has
        // ended, then this is longer than the other one.
        return resolve(false);
      }

      // If this stream has caught up to the other,
      // read from other one.
      otherStreamState.read();

    } else {
      streamState.read();
    }
  };
};


/**
 * Creates a function that gets called when a stream ends.
 *
 * @param {StreamState} streamState
 * @param {StreamState} otherStreamState
 * @param {Function(boolean)} resolve
 */
const createOnEndFn = (streamState: StreamState, otherStreamState: StreamState, resolve: (equal: boolean) => void) => {
  return () => {
    streamState.ended = true;
    if (otherStreamState.ended) {
      resolve(streamState.pos === otherStreamState.pos);
    } else {
      otherStreamState.read();
    }
  };
};
