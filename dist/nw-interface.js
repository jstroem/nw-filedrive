!function(window, $, p, fs, gui) {
    var defaults = {
        directory: "/"
    }, directory = null, watcher = null, getParentDirectory = function(path) {
        path = "/" != path.substr(-1) ? path.substr(0, path.lastIndexOf("/") + 1) : path.split("/", path.match(/\//g).length - 1 || 0).join("/") + "/";
        return p.normalize(path);
    }, createFileFromFileEntry = function(fileEntry, path, promise) {
        return {
            path: path,
            directory: !1,
            size: fileEntry.size,
            created_at: fileEntry.lastModifiedDate,
            last_modified: fileEntry.lastModifiedDate,
            uploading: !0,
            promise: promise
        };
    }, updateDirectory = function(self) {
        self.trigger("Filedrive:UpdateDirectory");
        return "";
    }, rmdir = function(dir) {
        for (var list = fs.readdirSync(dir), i = 0; i < list.length; i++) {
            var filename = p.join(dir, list[i]), stat = fs.statSync(filename);
            "." == filename || ".." == filename || (stat.isDirectory() ? rmdir(filename) : fs.unlinkSync(filename));
        }
        fs.rmdirSync(dir);
    }, toBuffer = function(ab) {
        for (var buffer = new Buffer(ab.byteLength), view = new Uint8Array(ab), i = 0; i < buffer.length; ++i) buffer[i] = view[i];
        return buffer;
    }, init = function(options) {
        options = this._options = $.extend({}, defaults, options);
        this.$this = $(this);
        this.on = $.proxy(this.$this.on, this.$this);
        this.trigger = $.proxy(this.$this.trigger, this.$this);
        fs.existsSync(options.directory) ? directory = options.directory : self.trigger("Filedrive:Error", "Directory does not exists");
    }, slashLast = function(dir) {
        return void 0 === dir || null === dir ? dir : p.normalize("/" == dir.substr(-1) ? dir : dir + "/");
    };
    init.prototype._addRootDirectory = function(dir) {
        return p.normalize(slashLast(this._options.directory) + dir);
    };
    init.prototype._removeRootDirectory = function(dir) {
        return 0 == dir.indexOf(this._options.directory) ? dir.substr(this._options.directory.length) : dir;
    };
    init.prototype._createFileFromPath = function(path, cb) {
        var self = this;
        fs.stat(path, function(err, stat) {
            err ? cb(err, null) : cb(null, {
                path: self._removeRootDirectory(path),
                directory: stat.isDirectory(),
                size: stat.size,
                created_at: stat.birthtime,
                last_modified: stat.mtime
            });
        });
    };
    init.prototype._createFiles = function(dir, files, deferred) {
        var res = [], resolve = function(err, f) {
            if ("pending" == deferred.state()) {
                err && deferred.reject(err);
                res.push(f);
                res.length == files.length && deferred.resolve(res);
            }
        };
        if (0 == files.length) deferred.resolve(res); else for (var i = 0; i < files.length; i++) this._createFileFromPath(dir + files[i], resolve);
    };
    init.prototype.getFiles = function(dir) {
        dir = this._addRootDirectory(dir);
        var deferred = $.Deferred(), self = this;
        fs.readdir(dir, function(err, files) {
            err ? deferred.reject(err) : self._createFiles(dir, files, deferred);
        });
        return deferred.promise();
    };
    init.prototype.changeDirectory = function(dir) {
        if (null !== dir && void 0 !== dir) {
            dir = slashLast(dir);
            directory = this._addRootDirectory(dir);
            watcher && watcher.close();
            var self = this;
            watcher = fs.watch(directory, function() {
                updateDirectory(self);
            });
            this.trigger("Filedrive:ChangeDirectory", dir);
        }
    };
    init.prototype.openFile = function(file) {
        file.directory ? this.changeDirectory(file.path) : gui.Shell.openItem(this._addRootDirectory(file.path));
    };
    init.prototype.deleteFile = function(file) {
        var deferred = $.Deferred(), self = this, handler = function(err) {
            err ? deferred.reject(err) : deferred.resolve(updateDirectory(self));
        };
        if (file.directory) {
            rmdir(this._addRootDirectory(file.path));
            handler(null);
        } else fs.unlink(this._addRootDirectory(file.path), handler);
        return deferred.promise();
    };
    init.prototype.rename = function(file, name) {
        var deferred = $.Deferred(), self = this, handler = function(err) {
            err ? deferred.reject(err) : deferred.resolve(updateDirectory(self));
        }, dest = getParentDirectory(file.path) + name;
        fs.rename(this._addRootDirectory(file.path), this._addRootDirectory(dest), handler);
        return deferred.promise();
    };
    init.prototype.createFolder = function(name) {
        var deferred = $.Deferred(), self = this, handler = function(err) {
            err ? deferred.reject(err) : deferred.resolve(updateDirectory(self));
        }, path = directory + name;
        fs.mkdir(path, handler);
        return deferred.promise();
    };
    init.prototype.upload = function(fileEntry, name) {
        var deferred = $.Deferred();
        void 0 === name && (name = fileEntry.name);
        var self = this, handler = function(err) {
            err ? deferred.reject(err) : deferred.resolve(updateDirectory(self));
        }, path = directory + name, reader = new FileReader();
        reader.onload = function(e) {
            fs.writeFile(path, toBuffer(e.target.result), handler);
        };
        reader.readAsArrayBuffer(fileEntry);
        var promise = deferred.promise(), res = createFileFromFileEntry(fileEntry, this._removeRootDirectory(path), promise);
        return res;
    };
    init.prototype.exists = function(name) {
        var deferred = $.Deferred(), path = directory + name;
        fs.exists(path, deferred.resolve);
        return deferred.promise();
    };
    return window.NWInterface = init;
}(window, jQuery, require("path"), require("fs"), require("nw.gui"));