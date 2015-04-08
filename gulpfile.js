var gulp = require('gulp'),
	rimraf = require('gulp-rimraf'),
	shell = require('gulp-shell'),
	rename = require("gulp-rename"),
	uglify = require('gulp-uglifyjs'),
	wrap = require("gulp-wrap"),
	fs = require('fs');

/**** FILE SETUP **/
gulp.task('mkdir', function(){
	if (!fs.existsSync(__dirname + '/dist')){
		fs.mkdirSync(__dirname + '/dist', 0777);
	}
});

gulp.task('clean', function(){
	return gulp.src([
		'./dist',
	], {read: false}).pipe(rimraf());
});

gulp.task('build:target', ['clean','mkdir'], function(){
	return gulp.src(['./src/nw-interface.js'])
    .pipe(uglify('nw-interface.js', {
      mangle: false,
      compress: {
      	sequences: false
      },
      output: {
        beautify: true
      }
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['build:target'], function(){
	return gulp.src('./dist/nw-interface.js')
		.pipe(uglify('nw-interface.min.js'))
    	.pipe(gulp.dest('./dist'));
});