import streamEqual from '../dist';
import assert from 'assert';
import { PassThrough, Writable, Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import http from 'http';
import request from 'request';
import nock from 'nock';


const url1 = 'http://speedtest.ftp.otenet.gr/files/test1Mb.db';
const urlhost1 = 'http://speedtest.ftp.otenet.gr';
const urlpath1 = '/files/test1Mb.db';

before(() => { nock.disableNetConnect(); });
after(() => { nock.enableNetConnect(); });


/**
 * Tests that the same file is equal with different options.
 *
 * @param {Object} options1
 * @param {Object} options2
 */
const testEqual = (options1: {}, options2: {}) => {
  it('Streams should be equal', async () => {
    const file1 = __filename;
    const stream1 = fs.createReadStream(file1, options1);
    const stream2 = fs.createReadStream(file1, options2);

    let equal = await streamEqual(stream1, stream2);
    assert.ok(equal);
  });
};


/**
 * Writes to a stream imitating an asynchronous manner.
 *
 * @param {WritableStream} stream
 * @param {string|Array<Object>} list
 */
const writeToStream = (stream: Writable, list: string | Array<{}>) => {
  const pieces = Array.isArray(list) ? list : list.split(' ');
  const next = () => {
    const piece = pieces.shift();
    if (piece) {
      stream.write(piece);
      process.nextTick(next);
    } else {
      stream.end();
    }
  };
  process.nextTick(next);
};


describe('Compare two streams from the same file', () => {
  describe('with different buffer size', () => {
    testEqual({ bufferSize: 64 }, { bufferSize: 42 });
  });

  describe('with equal buffer size', () => {
    testEqual({ bufferSize: 128 }, { bufferSize: 128 });
  });

  describe('with utf8 encoding', () => {
    testEqual({ encoding: 'utf8' }, { encoding: 'utf8' });
  });

  describe('where one stream is an http request', () => {
    it('Streams should be equal', (done) => {
      const file1 = path.join(__dirname, 'assets', 'test1Mb.db');
      const scope = nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file1);
      http.get(url1, async (stream2) => {
        const stream1 = fs.createReadStream(file1);
        let equal = await streamEqual(stream1, stream2);
        scope.done();
        assert.ok(equal);
        done();
      });
    });
  });

  describe('using the request module', () => {
    it('Streams should be equal', async () => {
      const file1 = path.join(__dirname, 'assets', 'test1Mb.db');
      const scope = nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file1);
      const stream1 = fs.createReadStream(file1);
      const stream2 = request.get(url1) as unknown as Readable;
      let equal = await streamEqual(stream1, stream2);
      scope.done();
      assert.ok(equal);
    });
  });

});


describe('Compare two obviously different streams', () => {
  it('Streams should not be equal', async () => {
    const file1 = path.join(__dirname, '..', 'README.md');
    const file2 = path.join(__dirname, '..', 'src', 'index.ts');
    const stream1 = fs.createReadStream(file1, { highWaterMark: 128 });
    const stream2 = fs.createReadStream(file2, { highWaterMark: 128 });
    let equal = await streamEqual(stream1, stream2);
    assert.ok(!equal);
  });
});


describe('Compare two similar streams', () => {
  it('Streams should not be equal', async () => {
    const stream1 = new PassThrough();
    const stream2 = new PassThrough();

    writeToStream(stream1, 'you\'re the man now');
    writeToStream(stream2, 'you\'re the man now dawg!');

    let equal = await streamEqual(stream1, stream2);
    assert.ok(!equal);
  });
});

describe('Comapre two object streams', () => {
  describe('that are equal', () => {
    it('Streams should be equal', async () => {
      const stream1 = new PassThrough({ objectMode: true });
      const stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      let equal = await streamEqual(stream1, stream2);
      assert.ok(equal);
    });
  });

  describe('that are not equal', () => {
    it('Streams should not be equal', async () => {
      const stream1 = new PassThrough({ objectMode: true });
      const stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { baz: 9  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      let equal = await streamEqual(stream1, stream2);
      assert.ok(!equal);
    });
  });
});

describe('Compare with an errornous stream', () => {
  it('Returns an error (callback)', async () => {
    const file1 = path.join(__dirname, '..', 'README.md');
    const stream1 = fs.createReadStream(file1, { highWaterMark: 128 });
    const stream2 = fs.createReadStream('dontexist', { highWaterMark: 128 });
    assert.rejects(
      streamEqual(stream1, stream2),
      'ENOENT'
    );
  });
});
