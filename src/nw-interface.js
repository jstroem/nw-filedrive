(function(window, $, p, fs, gui){
	var defaults = {
		directory: '/'
	};

	var directory = null;
	var watcher = null;

	var getParentDirectory = function(path){
		if (path.substr(-1) != '/')
			path = path.substr(0, path.lastIndexOf('/') + 1);
		else
			path = path.split('/', path.match(/\//g).length - 1 || 0).join('/') + '/';
		return p.normalize(path);
	};

	var createFileFromFileEntry = function(fileEntry, path, promise){
		return {
			'path': path,
			'directory': false,
			'size': fileEntry.size,
			'created_at': fileEntry.lastModifiedDate,
			'last_modified': fileEntry.lastModifiedDate,
			'uploading': true,
			'promise': promise
		};
	}

	var updateDirectory = function(self){
		self.trigger('Filedrive:UpdateDirectory');
		return "";
	};
 
	var rmdir = function(dir) {
		var list = fs.readdirSync(dir);
		for(var i = 0; i < list.length; i++) {
			var filename = p.join(dir, list[i]);
			var stat = fs.statSync(filename);
			
			if(filename == "." || filename == "..") {
				// pass these files
			} else if(stat.isDirectory()) {
				// rmdir recursively
				rmdir(filename);
			} else {
				// rm fiilename
				fs.unlinkSync(filename);
			}
		}
		fs.rmdirSync(dir);
	};

	var toBuffer = function(ab) {
	    var buffer = new Buffer(ab.byteLength);
	    var view = new Uint8Array(ab);
	    for (var i = 0; i < buffer.length; ++i) {
	        buffer[i] = view[i];
	    }
	    return buffer;
	}

	var init = function(options){
		options = this._options = $.extend({}, defaults, options);


		this.$this = $(this);

		this.on = $.proxy( this.$this.on, this.$this );
		this.trigger = $.proxy( this.$this.trigger, this.$this );


		if (fs.existsSync(options.directory))
			directory = options.directory;
		else
			self.trigger('Filedrive:Error', 'Directory does not exists');
	};

	var slashLast = function(dir){
		if (dir === undefined || dir === null)
			return dir;
		return p.normalize(dir.substr(-1) == '/' ? dir : dir + '/');
	}

	init.prototype._addRootDirectory = function(dir){
		return p.normalize(slashLast(this._options.directory) + dir);
	}

	init.prototype._removeRootDirectory = function(dir){
		if (dir.indexOf(this._options.directory) == 0)
			return dir.substr(this._options.directory.length);
		else
			return dir;
	}


	init.prototype._createFileFromPath = function(path, cb){
		var self = this;
		fs.stat(path, function(err, stat){
			if (err)
				cb(err,null);
			else
				cb(null, {
					'path': self ._removeRootDirectory(path),
					'directory': stat.isDirectory(),
					'size': stat.size,
					'created_at': stat.birthtime,
					'last_modified': stat.mtime
				});
		});
	}

	init.prototype._createFiles = function(dir, files, deferred){

		var res = [];
		var resolve = function(err, f){
			if (deferred.state() != 'pending')
				return;
			if (err)
				deferred.reject(err);

			res.push(f);
			if (res.length == files.length) 
				deferred.resolve(res);
		};

		if (files.length == 0)
			deferred.resolve(res);
		else {
			for(var i = 0; i < files.length; i++)
				this._createFileFromPath(dir + files[i], resolve);
		}

	}

	init.prototype.getFiles = function(dir){
		dir = this._addRootDirectory(dir);
		var deferred = $.Deferred();
		var self = this;
		fs.readdir(dir, function(err, files){
			if (err) deferred.reject(err);
			else self._createFiles(dir, files, deferred);
		});
		return deferred.promise();
	};

	init.prototype.changeDirectory = function(dir){
		if (dir === null || dir === undefined)
			return;

		dir = slashLast(dir);
		directory = this._addRootDirectory(dir);
		if (watcher)
			watcher.close();
		var self = this;
		watcher = fs.watch(directory, function(){ updateDirectory(self); });

		this.trigger('Filedrive:ChangeDirectory', dir);
	};

	init.prototype.openFile = function(file){
		if (file.directory)
			this.changeDirectory(file.path);
		else
			gui.Shell.openItem(this._addRootDirectory(file.path));
	};

	init.prototype.deleteFile = function(file){
		var deferred = $.Deferred();
		var self = this;
		var handler = function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(updateDirectory(self));
		};
		if (file.directory) {
			rmdir(this._addRootDirectory(file.path));
			handler(null);
		} else
			fs.unlink(this._addRootDirectory(file.path), handler);

		return deferred.promise();
	};

	init.prototype.rename = function(file, name){
		var deferred = $.Deferred();
		var self = this;
		var handler = function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(updateDirectory(self));
		};

		var dest = getParentDirectory(file.path) + name;
		fs.rename(this._addRootDirectory(file.path), this._addRootDirectory(dest), handler);
		return deferred.promise();
	};

	init.prototype.createFolder = function(name){
		var deferred = $.Deferred();
		var self = this;
		var handler = function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(updateDirectory(self));
		};
		var path = directory + name;
		fs.mkdir(path, handler);
		return deferred.promise();
	};

	init.prototype.upload = function(fileEntry, name){
		var deferred = $.Deferred();
		if (name === undefined)
			name = fileEntry.name;

		var self = this;
		var handler = function(err){
			if (err) deferred.reject(err);
			else deferred.resolve(updateDirectory(self));
		};
		var path = directory + name;
		var reader = new FileReader();
		reader.onload = function(e){
			fs.writeFile(path, toBuffer(e.target.result), handler);
		};
		reader.readAsArrayBuffer(fileEntry);
		var promise = deferred.promise();
		var res = createFileFromFileEntry(fileEntry, this._removeRootDirectory(path), promise);
		return res;
	};

	init.prototype.exists = function(name){
		var deferred = $.Deferred();
		var path = directory + name;
		fs.exists(path, deferred.resolve);
		return deferred.promise();
	};


	return window.NWInterface = init;
})(window, jQuery, require('path'), require('fs'), require('nw.gui'));