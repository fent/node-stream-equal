var streamEqual = require('..');
var assert      = require('assert');
var PassThrough = require('stream').PassThrough;
var fs          = require('fs');
var path        = require('path');
var http        = require('http');
var request     = require('request');
var nock        = require('nock');


var file1 = __filename;
var file2 = __filename;
var file3 = path.join(__dirname, '..', 'README.md');
var file4 = path.join(__dirname, '..', 'lib', 'index.js');
var file5 = path.join(__dirname, 'assets', 'test1Mb.db');
var url1 = 'http://speedtest.ftp.otenet.gr/files/test1Mb.db';
var urlhost1 = 'http://speedtest.ftp.otenet.gr';
var urlpath1 = '/files/test1Mb.db';


/**
 * Tests that file1 and file2 streams are equal with different options.
 *
 * @param {Object} options1
 * @param {Object} options2
 */
function testEqual(options1, options2) {
  it('Streams should be equal (callback)', function(done) {
    var stream1 = fs.createReadStream(file1, options1);
    var stream2 = fs.createReadStream(file2, options2);

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);
      assert.ok(equal);
      done();
    });
  });

  it('Streams should be equal (promise)', function() {
    var stream1 = fs.createReadStream(file1, options1);
    var stream2 = fs.createReadStream(file2, options2);

    return streamEqual(stream1, stream2).then(function(equal) {
      assert.ok(equal);
    });
  });
}


describe('Compare two streams from the same file', function() {
  describe('with different buffer size', function() {
    testEqual({ bufferSize: 64 }, { bufferSize: 42 });
  });

  describe('with equal buffer size', function() {
    testEqual({ bufferSize: 128 }, { bufferSize: 128 });
  });

  describe('with utf8 encoding', function() {
    testEqual({ encoding: 'utf8' }, { encoding: 'utf8' });
  });

  describe('where one stream is an http request', function() {
    it('Streams should be equal', function(done) {
      nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file5);
      http.get(url1, function(stream2) {
        var stream1 = fs.createReadStream(file5);
        streamEqual(stream1, stream2, function(err, equal) {
          if (err) return done(err);
          assert.ok(equal);
          done();
        });
      });
    });
  });

  describe('using the request module', function() {
    it('Streams should be equal', function(done) {
      nock(urlhost1)
        .get(urlpath1)
        .replyWithFile(200, file5);
      var stream1 = fs.createReadStream(file5);
      var stream2 = request.get(url1);
      streamEqual(stream1, stream2, function(err, equal) {
        if (err) return done(err);
        assert.ok(equal);
        done();
      });
    });
  });

});


describe('Compare two obviously different streams', function() {
  it('Streams should not be equal (callback)', function(done) {
    var stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    var stream2 = fs.createReadStream(file4, { bufferSize: 128 });

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);
      assert.ok(!equal);
      done();
    });
  });

  it('Streams should not be equal (promise)', function() {
    var stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    var stream2 = fs.createReadStream(file4, { bufferSize: 128 });

    return streamEqual(stream1, stream2).then(function(equal) {
      assert.ok(!equal);
    });
  });
});


describe('Compare two similar streams', function() {
  it('Streams should not be equal', function(done) {
    var stream1 = new PassThrough();
    var stream2 = new PassThrough();

    function writeToStream(stream, str) {
      var pieces = str.split(' ');

      process.nextTick(function next() {
        var piece = pieces.shift();
        if (piece) {
          stream.write(piece);
          process.nextTick(next);
        } else {
          stream.end();
        }
      });
    }

    writeToStream(stream1, 'you\'re the man now');
    writeToStream(stream2, 'you\'re the man now dawg!');

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);
      assert.ok(!equal);
      done();
    });
  });
});

describe('Comapre two object streams', function() {
  function writeToStream(stream, objects) {
    process.nextTick(function next() {
      var obj = objects.shift();
      if (obj) {
        stream.write(obj);
        process.nextTick(next);
      } else {
        stream.end();
      }
    });
  }

  describe('that are equal', function() {
    it('Streams should be equal', function(done) {
      var stream1 = new PassThrough({ objectMode: true });
      var stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      streamEqual(stream1, stream2, function(err, equal) {
        if (err) return done(err);
        assert.ok(equal);
        done();
      });
    });
  });

  describe('that are not equal', function() {
    it('Streams should not be equal', function(done) {
      var stream1 = new PassThrough({ objectMode: true });
      var stream2 = new PassThrough({ objectMode: true });

      writeToStream(stream1, [{ foo: 1 }, { baz: 9  }, { bizz: 'buzzz' }]);
      writeToStream(stream2, [{ foo: 1 }, { bar: 3  }, { bizz: 'buzzz' }]);

      streamEqual(stream1, stream2, function(err, equal) {
        if (err) return done(err);
        assert.ok(!equal);
        done();
      });
    });
  });
});

describe('Compare with an errornous stream', function() {
  it('Returns an error (callback)', function(done) {
    var stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    var stream2 = fs.createReadStream('dontexist', { bufferSize: 128 });
    streamEqual(stream1, stream2, function(err) {
      assert.ok(err);
      assert.equal(err.code, 'ENOENT');
      done();
    });
  });

  it('Returns an error (promise)', function() {
    var stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    var stream2 = fs.createReadStream('dontexist', { bufferSize: 128 });
    return streamEqual(stream1, stream2).catch(function(err) {
      assert.ok(err);
      assert.equal(err.code, 'ENOENT');
    });
  });
});
