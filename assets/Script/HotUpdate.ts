/**
 * Created by jsroads on 2019/11/4 . 11:40 上午
 * Note:
 */
const {ccclass, property} = cc._decorator;
@ccclass
export default class HotUpdate extends cc.Component {
    get storagePath() {
        return this._storagePath;
    }

    set storagePath(value) {
        this._storagePath = value;
    }

    @property({
        type: cc.Asset
    })
    manifestUrl = null;

    private _am;
    private _updating;
    private _canRetry;
    private _storagePath;

    onLoad() {
        this.storagePath =  ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'mygame-remote-asset');
        console.log('Storage path for remote asset : ' + this.storagePath);
        cc.log("nativeUrl:"+this.manifestUrl.nativeUrl);
        cc.log("aa->"+cc.url.raw("project.manifest"));
        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this.storagePath, (versionA: string, versionB: string) => {
            console.log("JS Custom Version Compare: version A is " + versionA + ' version B is ' + versionB);
            let vA: Array<string> = versionA.split('.');
            let vB: Array<string> = versionB.split('.');
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
                let list = this._am.getRemoteManifest().getVersion().split("."), currentVersion = 0;
                list.forEach((value, index, array) => {
                    if (index < array.length - 1) {
                        currentVersion += parseInt(value) * Math.pow(10, array.length - index)
                    }
                });
                console.log("new currentVersion:", JSON.stringify(currentVersion));
                cc.log("restart...");
                cc.sys.localStorage.setItem('currentVersion',JSON.stringify(currentVersion));
                cc.audioEngine.stopAll();
                cc.game.restart();
            }
        }.bind(this));
        cc.log('url1111');
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            var url = this.manifestUrl.nativeUrl;
            cc.log('url:'+url);
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
                cc.log('url(md5):'+url);
            }
            this._am.loadLocalManifest(url);
        }
        cc.log('url22222');
        this._am.update();
        // this.panel.updateBtn.active = false;
        this._updating = true;
    }
}
