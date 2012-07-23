var streamEqual = require('..')
  , assert      = require('assert')
  , from        = require('from')
  , fs          = require('fs')
  , path        = require('path')
  ;


var file1 = __filename
  , file2 = __filename
  , file3 = path.join(__dirname, '..', 'README.md')
  , file4 = path.join(__dirname, '..', 'lib', 'index.js')
  ;


/**
 * Tests that file1 and file2 streams are equal with different options.
 *
 * @param (Object) options1
 * @param (Object) options2
 */
function testEqual(options1, options2) {
  it('Streams should be equal', function(done) {
    var stream1 = fs.createReadStream(file1, options1);
    var stream2 = fs.createReadStream(file2, options2);

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);

      assert.ok(equal);
      done();
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

});


describe('Compare two obviously different streams', function() {
  it('Streams should not be equal', function(done) {
    var stream1 = fs.createReadStream(file3, { bufferSize: 128 });
    var stream2 = fs.createReadStream(file4, { bufferSize: 128 });

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);

      assert.ok(!equal);
      done();
    });
  });
});


describe('Compare two similar streams', function() {
  it('Streams should not be equal', function(done) {
    var stream1 = from('you\'re the man now'.split(' '));
    var stream2 = from('you\'re the man now dawg'.split(' '));

    streamEqual(stream1, stream2, function(err, equal) {
      if (err) return done(err);

      assert.ok(!equal);
      done();
    });
  });
});
