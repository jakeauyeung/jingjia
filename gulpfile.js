const gulp = require('gulp');
const path = require('path');
const ElectronPackager = require('electron-packager');
gulp.task('electron-pack', (cb) => {
    let opts = {
          name: 'name',
          dir: path.join(__dirname, 'build'),
          arch: 'all',
          platform: 'darwin',
          version: '1.1.2',
          appVersion: '1.2.0',
          overwrite: true,
          out: path.join(__dirname, 'installer'),
          asar: true
    };
    return ElectronPackager(opts, (err, appPath) => {
          if (err) {
              console.log(err);
              cb(err);
                } else {
                    cb();
                      }
    });
});
