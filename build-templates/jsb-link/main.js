
const HotUpdate = {
    _am:null,
    _updating:false,
    _canRetry:false,
    _storagePath:null,
    _cb:null,
    onLoad:function(cb){
        this._cb = cb;
        this.storagePath =  ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'mygame-remote-asset');
        console.log('Storage path for remote asset : ' + this.storagePath);


        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this.storagePath, (versionA, versionB) => {
            console.log("JS Custom Version Compare: version A is " + versionA + ' version B is ' + versionB);
            let vA = versionA.split('.');
            let vB = versionB.split('.');
            for (let i = 0; i < vA.length; ++i) {
                let a = parseInt(vA[i]);
                let b = parseInt(vB[i] || "0");
                if (a === b) {
                    continue;
                } else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            } else {
                return 0;
            }
        });

        // Setup the verification callback but we don't have md5 check function yet so only print some message
        // Return true if the verification passed otherwise return false
        this._am.setVerifyCallback((path, asset) => {
            // When asset is compressed we don't need to check its md5 because zip file have been deleted.
            var compressed = asset.compressed;
            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;
            // The size of asset file but this value could be absent.
            var size = asset.size;
            if (compressed) {
                cc.log("Verification passed : " + relativePath);
                return true;
            } else {
                cc.log("Verification passed : " + relativePath + ' (' + expectedMD5 + ')');
                return true;
            }
        });

        cc.log('Hot update is ready please check or directly update.');
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2);
            cc.log("Max concurrent tasks count have been limited to 2");
        }
        // this.fileProgress.progress = 0;
        // this.byteProgress.progress = 0;

        this._am.setEventCallback(function(event) {
            var needRestart = false;
            var failed = false;
            switch (event.getEventCode()) {
                case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                    cc.log('No local manifest file found hot update skipped.');
                    failed = true;
                    break;
                case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                    // this.byteProgress.progress = event.getPercent();
                    // this.fileProgress.progress = event.getPercentByFile();

                    // this.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                    // this.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();

                    var msg = event.getMessage();
                    if (msg) {
                        cc.log(event.getPercent()/100 + '% : ' + msg);
                    }
                    break;
                case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                    cc.log('Fail to download manifest file hot update skipped.');
                    failed = true;
                    break;
                case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                    cc.log('Already up to date with the latest remote version.');
                    needRestart = true;
                    failed = true;
                    break;
                case jsb.EventAssetsManager.UPDATE_FINISHED:
                    cc.log('Update finished. ' + event.getMessage());
                    needRestart = true;
                    break;
                case jsb.EventAssetsManager.UPDATE_FAILED:
                    cc.log('Update failed. ' + event.getMessage());
                    // this.panel.retryBtn.active = true;
                    this._updating = false;
                    this._canRetry = true;
                    break;
                case jsb.EventAssetsManager.ERROR_UPDATING:
                    cc.log('Asset update error: ' + event.getAssetId() + ' ' + event.getMessage());
                    break;
                case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                    cc.log(event.getMessage());
                    break;
                default:
                    break;
            }

            if (failed) {
                this._am.setEventCallback(null);
                this._updating = false;
            }

            if (needRestart) {
                this._am.setEventCallback(null);
                // Prepend the manifest's search path
                var searchPaths = jsb.fileUtils.getSearchPaths();
                var newPaths = this._am.getLocalManifest().getSearchPaths();
                console.log(JSON.stringify(newPaths));
                Array.prototype.unshift.apply(searchPaths, newPaths);
                // This value will be retrieved and appended to the default search path during game startup
                // please refer to samples/js-tests/main.js for detailed usage.
                // !!! Re-add the search paths in main.js is very important otherwise new scripts won't take effect.
                cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
                jsb.fileUtils.setSearchPaths(searchPaths);
                // let list = this._am.getRemoteManifest().getVersion().split("."), currentVersion = 0;
                // list.forEach((value, index, array) => {
                //     if (index < array.length - 1) {
                //         currentVersion += parseInt(value) * Math.pow(10, array.length - index)
                //     }
                // });
                // console.log("new currentVersion:", JSON.stringify(currentVersion));
                // cc.log("restart...");
                // cc.sys.localStorage.setItem('currentVersion',JSON.stringify(currentVersion));
                if(this._cb)this._cb();
            }
        }.bind(this));
        cc.log('url1111');
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            // // Resolve md5 url
            // var url = this.manifestUrl.nativeUrl;
            // cc.log('url:'+url);
            // if (cc.loader.md5Pipe) {
            //     url = cc.loader.md5Pipe.transformURL(url);
            //     cc.log('url(md5):'+url);
            // }
            // const jsonString = JSON.stringify(jsb.fileUtils.getStringFromFile('res/project.manifest'));
            // const manifest = new jsb.Manifest(jsonString, this._storagePath);
            this._am.loadLocalManifest("res/raw-assets/e3/e32d7ec3-9fee-4b93-a3f2-48d90d2fffa7.manifest");
        }
        cc.log('url22222');
        this._am.update();
        // this.panel.updateBtn.active = false;
        this._updating = true;
    }
};

window.boot = function () {
    //-------------添加代码----开始---
    if (cc && cc.sys.isNative) {
        var hotUpdateSearchPaths = cc.sys.localStorage.getItem('HotUpdateSearchPaths');
        if (hotUpdateSearchPaths) {
            jsb.fileUtils.setSearchPaths(JSON.parse(hotUpdateSearchPaths));
            console.log('[main.js] 热更新SearchPath: ' + JSON.parse(hotUpdateSearchPaths));
        }else {
            console.log('[main.js] 未获取到热更新资源路径!');
        }
    }else {
        console.log('[main.js] 不是native平台!');
    }
    //-------------添加代码----结束---
    var settings = window._CCSettings;
    window._CCSettings = undefined;

    if ( !settings.debug ) {
        var uuids = settings.uuids;

        var rawAssets = settings.rawAssets;
        var assetTypes = settings.assetTypes;
        var realRawAssets = settings.rawAssets = {};
        for (var mount in rawAssets) {
            var entries = rawAssets[mount];
            var realEntries = realRawAssets[mount] = {};
            for (var id in entries) {
                var entry = entries[id];
                var type = entry[1];
                // retrieve minified raw asset
                if (typeof type === 'number') {
                    entry[1] = assetTypes[type];
                }
                // retrieve uuid
                realEntries[uuids[id] || id] = entry;
            }
        }

        var scenes = settings.scenes;
        for (var i = 0; i < scenes.length; ++i) {
            var scene = scenes[i];
            if (typeof scene.uuid === 'number') {
                scene.uuid = uuids[scene.uuid];
            }
        }

        var packedAssets = settings.packedAssets;
        for (var packId in packedAssets) {
            var packedIds = packedAssets[packId];
            for (var j = 0; j < packedIds.length; ++j) {
                if (typeof packedIds[j] === 'number') {
                    packedIds[j] = uuids[packedIds[j]];
                }
            }
        }

        var subpackages = settings.subpackages;
        for (var subId in subpackages) {
            var uuidArray = subpackages[subId].uuids;
            if (uuidArray) {
                for (var k = 0, l = uuidArray.length; k < l; k++) {
                    if (typeof uuidArray[k] === 'number') {
                        uuidArray[k] = uuids[uuidArray[k]];
                    }
                }
            }
        }
    }

    function setLoadingDisplay () {
        // Loading splash scene
        var splash = document.getElementById('splash');
        var progressBar = splash.querySelector('.progress-bar span');
        cc.loader.onProgress = function (completedCount, totalCount, item) {
            var percent = 100 * completedCount / totalCount;
            if (progressBar) {
                progressBar.style.width = percent.toFixed(2) + '%';
            }
        };
        splash.style.display = 'block';
        progressBar.style.width = '0%';

        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            splash.style.display = 'none';
        });
    }

    var onStart = function () {
        cc.loader.downloader._subpackages = settings.subpackages;

        cc.view.enableRetina(true);
        cc.view.resizeWithBrowserSize(true);

        if (cc.sys.isBrowser) {
            setLoadingDisplay();
        }

        if (cc.sys.isMobile) {
            if (settings.orientation === 'landscape') {
                cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
            }
            else if (settings.orientation === 'portrait') {
                cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
            }
            cc.view.enableAutoFullScreen([
                cc.sys.BROWSER_TYPE_BAIDU,
                cc.sys.BROWSER_TYPE_WECHAT,
                cc.sys.BROWSER_TYPE_MOBILE_QQ,
                cc.sys.BROWSER_TYPE_MIUI,
            ].indexOf(cc.sys.browserType) < 0);
        }

        // Limit downloading max concurrent task to 2,
        // more tasks simultaneously may cause performance draw back on some android system / browsers.
        // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
        if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
            cc.macro.DOWNLOAD_MAX_CONCURRENT = 2;
        }

        function loadScene(launchScene) {
            cc.director.loadScene(launchScene,
                function (err) {
                    if (!err) {
                        if (cc.sys.isBrowser) {
                            // show canvas
                            var canvas = document.getElementById('GameCanvas');
                            canvas.style.visibility = '';
                            var div = document.getElementById('GameDiv');
                            if (div) {
                                div.style.backgroundImage = '';
                            }
                        }
                        cc.loader.onProgress = null;
                        console.log('Success to load scene: ' + launchScene);
                    }
                    else if (CC_BUILD) {
                        setTimeout(function () { 

    if (cc && cc.sys.isNative) { 
        var hotUpdateSearchPaths = cc.sys.localStorage.getItem('HotUpdateSearchPaths'); 
        if (hotUpdateSearchPaths) { 
            jsb.fileUtils.setSearchPaths(JSON.parse(hotUpdateSearchPaths)); 
            console.log('[main.js] 热更新SearchPath: ' + JSON.parse(hotUpdateSearchPaths));
        }else {
            console.log('[main.js] 未获取到热更新资源路径!');
        }
    }else {
        console.log('[main.js] 不是native平台!');
    }

                            loadScene(launchScene);
                        }, 1000);
                    }
                }
            );

        }

        var launchScene = settings.launchScene;

        // load scene
        loadScene(launchScene);

    };

    // jsList
    var jsList = settings.jsList;

    var bundledScript = settings.debug ? 'src/project.dev.js' : 'src/project.js';
    if (jsList) {
        jsList = jsList.map(function (x) {
            return 'src/' + x;
        });
        jsList.push(bundledScript);
    }
    else {
        jsList = [bundledScript];
    }

    var option = {
        id: 'GameCanvas',
        scenes: settings.scenes,
        debugMode: settings.debug ? cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
        showFPS: settings.debug,
        frameRate: 60,
        jsList: jsList,
        groupList: settings.groupList,
        collisionMatrix: settings.collisionMatrix,
    };

    // init assets
    cc.AssetLibrary.init({
        libraryPath: 'res/import',
        rawAssetsBase: 'res/raw-',
        rawAssets: settings.rawAssets,
        packedAssets: settings.packedAssets,
        md5AssetsMap: settings.md5AssetsMap,
        subpackages: settings.subpackages
    });

    HotUpdate.onLoad(function(params) {
        cc.log("aaaa---");
        cc.game.run(option, onStart);  
    }.bind(this));
};

if (window.jsb) {
    var isRuntime = (typeof loadRuntime === 'function');
    if (isRuntime) {
        require('src/settings.js');
        require('src/cocos2d-runtime.js');
        require('jsb-adapter/engine/index.js');
    }
    else {
        require('src/settings.js');
        require('src/cocos2d-jsb.js');
        require('jsb-adapter/jsb-engine.js');
    }

    cc.macro.CLEANUP_IMAGE_CACHE = true;
    window.boot();
}