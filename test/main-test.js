const streamEqual = require('..');
const assert      = require('assert');
const PassThrough = require('stream').PassThrough;
const fs          = require('fs');
const path        = require('path');
const http        = require('http');
const request     = require('request');
const nock        = require('nock');


const file1 = __filename;
const file2 = __filename;
const file3 = path.join(__dirname, '..', 'README.md');
const file4 = path.join(__dirname, '..', 'lib', 'index.js');
const file5 = path.join(__dirname, 'assets', 'test1Mb.db');
const url1 = 'http://speedtest.ftp.otenet.gr/files/test1Mb.db';
const urlhost1 = 'http://speedtest.ftp.otenet.gr';
const urlpath1 = '/files/test1Mb.db';

before(() => { nock.disableNetConnect(); });
after(() => { nock.enableNetConnect(); });


/**
 * Tests that file1 and file2 streams are equal with different options.
 *
 * @param {Object} options1
 * @param {Object} options2
 */
const testEqual = (options1, options2) => {
  it('Streams should be equal (callback)', (done) => {
    const stream1 = fs.createReadStream(file1, options1);
    const stream2 = fs.createReadStream(file2, options2);

    streamEqual(stream1, stream2, (err, equal) => {
      assert.ifError(err);
      assert.ok(equal);
      done();
    });
  });

  it('Streams should be equal (promise)', () => {
    const stream1 = fs.createReadStream(file1, options1);
    const stream2 = fs.createReadStream(file2, options2);

    return streamEqual(stream1, stream2).then((equal) => {
      assert.ok(equal);
    });
  });
};


/**
 * Writes to a stream imitating an asynchronous manner.
 *
 * @param {WritableStream} stream
 * @param {string|Array<Object>} list
 */
const writeToStream = (stream, list) => {
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
      const scope = nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file5);
      http.get(url1, (stream2) => {
        const stream1 = fs.createReadStream(file5);
        streamEqual(stream1, stream2, (err, equal) => {
          assert.ifError(err);
          assert.ok(equal);
          scope.done();
          done();
        });
      });
    });
  });

  describe('using the request module', () => {
    it('Streams should be equal', (done) => {
      const scope = nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file5);
      const stream1 = fs.createReadStream(file5);
      const stream2 = request.get(url1);
      streamEqual(stream1, stream2, (err, equal) => {
        assert.ifError(err);
        assert.ok(equal);
        scope.done();
        done();
      });
    });
  });

});


describe('Compare two obviously different streams', () => {
  it('Streams should not be equal (callback)', (done) => {
    const stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    const stream2 = fs.createReadStream(file4, { bufferSize: 128 });

    streamEqual(stream1, stream2, (err, equal) => {
      assert.ifError(err);
      assert.ok(!equal);
      done();
    });
  });

  it('Streams should not be equal (promise)', () => {
    const stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    const stream2 = fs.createReadStream(file4, { bufferSize: 128 });

    return streamEqual(stream1, stream2).then((equal) => {
      assert.ok(!equal);
    });
  });
});


describe('Compare two similar streams', () => {
  it('Streams should not be equal', (done) => {
    const stream1 = new PassThrough();
    const stream2 = new PassThrough();

    writeToStream(stream1, 'you\'re the man now');
    writeToStream(stream2, 'you\'re the man now dawg!');

    streamEqual(stream1, stream2, (err, equal) => {
      assert.ifError(err);
      assert.ok(!equal);
      done();
    });
  });
});

describe('Comapre two object streams', () => {
  describe('that are equal', () => {
    it('Streams should be equal', (done) => {
      const stream1 = new PassThrough({ objectMode: true });
      const stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      streamEqual(stream1, stream2, (err, equal) => {
        assert.ifError(err);
        assert.ok(equal);
        done();
      });
    });
  });

  describe('that are not equal', () => {
    it('Streams should not be equal', (done) => {
      const stream1 = new PassThrough({ objectMode: true });
      const stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { baz: 9  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      streamEqual(stream1, stream2, (err, equal) => {
        assert.ifError(err);
        assert.ok(!equal);
        done();
      });
    });
  });
});

describe('Compare with an errornous stream', () => {
  it('Returns an error (callback)', (done) => {
    const stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    const stream2 = fs.createReadStream('dontexist', { bufferSize: 128 });
    streamEqual(stream1, stream2, (err) => {
      assert.ok(err);
      assert.equal(err.code, 'ENOENT');
      done();
    });
  });

  it('Returns an error (promise)', () => {
    const stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    const stream2 = fs.createReadStream('dontexist', { bufferSize: 128 });
    return streamEqual(stream1, stream2).catch((err) => {
      assert.ok(err);
      assert.equal(err.code, 'ENOENT');
    });
  });
});
