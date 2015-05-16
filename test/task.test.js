import { expect } from 'chai';
import sinon from 'sinon';
import Bluebird from 'bluebird';
import path from 'path';
import Task from '../lib/task';
import * as Promisified from '../lib/promisified';
import * as Util from '../lib/util';

describe('Task', function () {

  var sandbox = sinon.sandbox.create();
  var globStub;

  afterEach(function () {
    sandbox.restore();
    globStub = null;
  });

  describe('resolveSrcDest()', function () {

    it('should resolve with [{}] if config.files is not defiend', function (done) {
      var task = new Task('', {}, {});

      task.resolveSrcDest()
        .then((pairs) => {
          expect(pairs).eql([{}]);
          expect(task.srcDestPairs).eql([]);
        })
        .then(done, done);
    });

    it('should resolve with one src-dest pair', function (done) {

      globStub = sandbox.stub(Promisified, 'glob', function () {
        return Bluebird.resolve(['globed/path']);
      });

      let task = new Task('', {
        files: [{
          src: 'input/path',
          dest: 'output/path'
        }]
      }, {});

      task.resolveSrcDest()
        .then((pairs) => {
          expect(pairs).eql([{
            dest: path.resolve('output/path'),
            src: 'globed/path'
          }]);
          expect(task.srcDestPairs).equal(pairs);
          expect(globStub.callCount).equal(1);
          expect(globStub.getCall(0).args).eql([path.resolve('input/path')]);
        })
        .then(done, done);
    });

    it('should replace `base` with `dest` if `base` is defined', function (done) {

      globStub = sandbox.stub(Promisified, 'glob', function () {
        return Bluebird.resolve([
          path.resolve('source/file1.js'),
          path.resolve('source/file2.js')
        ]);
      });

      let task = new Task(null, {
        files: [{
          base: 'source',
          src: '*.js',
          dest: 'public'
        }]
      }, {});

      task.resolveSrcDest()
        .then((pairs) => {
          expect(pairs).eql([
            {
              dest: path.resolve('public/file1.js'),
              src:  path.resolve('source/file1.js')
            },
            {
              dest: path.resolve('public/file2.js'),
              src:  path.resolve('source/file2.js')
            }
          ]);
          expect(task.srcDestPairs).equal(pairs);
          expect(globStub.callCount).equal(1);
          expect(globStub.getCall(0).args).eql([path.resolve('source/*.js')]);
        })
        .then(done, done);
    });

    it('should replace file extension with `ext` if `base` is defined', function (done) {

      globStub = sandbox.stub(Promisified, 'glob', function () {
        return Bluebird.resolve([
          path.resolve('source/file1.coffee'),
          path.resolve('source/file2.coffee')
        ]);
      });

      let task = new Task('', {
        files: [{
          base: 'source',
          src: '*.coffee',
          dest: 'public',
          ext: 'js'
        }]
      }, {});

      task.resolveSrcDest()
        .then((pairs) => {
          expect(pairs).eql([
            {
              src:  path.resolve('source/file1.coffee'),
              dest: path.resolve('public/file1.js')
            },
            {
              src:  path.resolve('source/file2.coffee'),
              dest: path.resolve('public/file2.js')
            }
          ]);
          expect(task.srcDestPairs).equal(pairs);
          expect(globStub.callCount).equal(1);
          expect(globStub.getCall(0).args).eql([path.resolve('source/*.coffee')]);
        })
        .then(done, done);
    });

  });

  describe('runProcess()', function () {

    it('should assign `src` and `dest`', function (done) {
      let processSpy = sandbox.spy(function (pipeline) {
        pipeline.done();
      });

      let task = new Task('', {process: processSpy}, {
        setAsset: sandbox.stub(),
        assets: sandbox.stub()
      });

      task.runProcess({src: 'input/path', dest: 'output/path'})
        .then(function () {
          expect(processSpy.callCount).equal(1);
          let args = processSpy.getCall(0).args;
          expect(args[0].src).equal('input/path');
          expect(args[0].dest).equal('output/path');
        })
        .then(done, done);
    });

    describe('pipeline.done()', function () {

      it('should not call `writeFile`', function (done) {
        var writeFileStub = sandbox.stub(Util, 'writeFile');
        var processSpy = sandbox.spy(function (pipeline) {
          pipeline.done();
        });

        var task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub()
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);
            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');
            expect(writeFileStub.callCount).equal(0);
          })
          .then(done, done);
      });

      it('should call `writeFile` with `dest` as path', function (done) {
        var writeFileStub = sandbox.stub(Util, 'writeFile');
        var processSpy = sandbox.spy(function (pipeline) {
          pipeline.done('content');
        });

        var task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub(),
          opts: {
            logging: false
          }
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);
            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');
            expect(writeFileStub.callCount).equal(1);
            let writeFileArgs = writeFileStub.getCall(0).args;
            expect(writeFileArgs[0]).equal('output/path');
            expect(writeFileArgs[1]).equal('content');
          })
          .then(done, done);
      });

      it('should call `writeFile` normally', function (done) {
        var writeFileStub = sandbox.stub(Util, 'writeFile');
        var processSpy = sandbox.spy(function (pipeline) {
          pipeline.done('path', 'content');
        });

        var task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub(),
          opts: {
            logging: false
          }
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);
            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');
            expect(writeFileStub.callCount).equal(1);
            let writeFileArgs = writeFileStub.getCall(0).args;
            expect(writeFileArgs[0]).equal('path');
            expect(writeFileArgs[1]).equal('content');
          })
          .then(done, done);
      });

    });

    describe('pipeline.write()', function () {

      let writeFileStub;

      afterEach(function () {
        writeFileStub = null;
      });

      it('should call `writeFile` internally', function (done) {
        writeFileStub = sandbox.stub(Util, 'writeFile');

        let processSpy = sandbox.spy(function (pipeline) {
          pipeline.write('path', 'content');
          pipeline.done();
        });

        let task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub(),
          opts: {
            logging: false
          }
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);
            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');

            expect(writeFileStub.callCount).equal(1);
            expect(writeFileStub.getCall(0).args).eql(['path', 'content']);

          })
          .then(done, done);
      });

    });

    describe('pipeline.hash()', function () {

      it('should hash string', function (done) {
        var processSpy = sandbox.spy(function (pipeline) {
          pipeline.done();
        });

        var task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub(),
          opts: {
            disableHash: false
          }
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);
            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');
            expect(pipeline.hash('123')).eql({
              hash: '202cb962ac59075b964b07152d234b70',
              hashedDest: 'output/path-202cb962ac59075b964b07152d234b70'
            });
          })
          .then(done, done);
      });

    });

    describe('pipeline.gitHash()', function () {

      var execStub;

      afterEach(function () {
        execStub = null;
      });

      it('should exec git command', function (done) {
        var processSpy = sandbox.spy(function (pipeline) {
          pipeline.done();
        });

        execStub = sandbox.stub(Promisified, 'exec', function () {
          return Bluebird.resolve(['123-abc']);
        });

        let task = new Task('', {process: processSpy}, {
          setAsset: sandbox.stub(),
          assets: sandbox.stub(),
          opts: {
            disableHash: false
          }
        });

        task.runProcess({src: 'input/path', dest: 'output/path'})
          .then(function () {
            expect(processSpy.callCount).equal(1);

            let pipeline = processSpy.getCall(0).args[0];
            expect(pipeline.src).equal('input/path');
            expect(pipeline.dest).equal('output/path');

            return pipeline.gitHash('filename', (err, h) => {
              expect(execStub.callCount).equal(1);
              expect(execStub.getCall(0).args).eql([
                'git log --pretty="format:%ct-%H" -n 1 -- filename'
              ]);

              expect(err).equal(null);
              expect(h).eql({hash: 'abc', hashedDest: 'output/path-abc'});

              done();
            });
          });
      });

    });
  });
});
