/**
 * Author: Davide Ficano
 * Date  : 14-Mar-06
 * Date  : 01-Aug-06 added callbackObject
 */
function UrlDownloader() {
    this.onFinish = null;
    this.count = 0;
    this.urls = [];
    this.outFiles = [];
    this.callbackObject = null;
}

UrlDownloader.prototype = {
    saveURIList : function(urls, outFiles, referrer, postData) {
        if (!this.onFinish) {
            throw new Error("UrlDownloader: the onFinish is not valid");
        }
        this.urls = urls;
        this.outFiles = outFiles;
        this.count = 0;

        if (typeof(referrer) == "undefined") {
            referrer = null;
        }
        if (typeof(postData) == "undefined") {
            postData = null;
        }

        for (var i = 0; i < urls.length; i++) {
            this.internalSaveURI(urls[i], outFiles[i], referrer, postData);
        }
    },

    saveDocument : function(documentToSave, urlToSave, outFile) {
        if (!this.onFinish) {
            throw new Error("UrlDownloader: the onFinish is not valid");
        }
        this.urls = [urlToSave];
        this.outFiles = [outFile];
        this.count = 0;
        this.internalSaveDocument(documentToSave, outFile);
    },

    onStateChange : function(webProgress, request, stateFlags, status) {
        const wpl = Components.interfaces.nsIWebProgressListener;
        var isLoadFinished = (stateFlags & wpl.STATE_STOP)
                             ;//&& (stateFlags & wpl.STATE_IS_NETWORK);

        if (isLoadFinished) {
            ++this.count;

            if (this.count == this.outFiles.length) {
                this.onFinish(this.urls, this.outFiles, this.callbackObject);
            }
        }
    },

    QueryInterface : function(iid) {
        if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
            iid.equals(Components.interfaces.nsISupportsWeakReference) ||
            iid.equals(Components.interfaces.nsISupports)) {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;
    },

    internalSaveURI : function(url, outFile, referrer, postData) {
        const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
        var persist = ViewSourceWithCommon.makeWebBrowserPersist();

        persist.progressListener = this;
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                               | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

        var uri = ViewSourceWithCommon.makeURL(url);
        persist.saveURI(uri, null, referrer, postData, null, outFile);
    },

    internalSaveDocument : function(documentToSave, outFile) {
        const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
        var persist = ViewSourceWithCommon.makeWebBrowserPersist();

        persist.progressListener = this;
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                               | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                               | nsIWBP.PERSIST_FLAGS_NO_CONVERSION
                               | nsIWBP.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                               | nsIWBP.PERSIST_FLAGS_DONT_FIXUP_LINKS;
        var encodingFlags = nsIWBP.ENCODE_FLAGS_RAW;
        persist.saveDocument(documentToSave, outFile,
                             null, null, encodingFlags, 0);
    },

    onStatusChange : function(webProgress, request, status, message) {},
    onLocationChange : function(webProgress, request, location) {},
    onProgressChange : function(webProgress, request,
                                curSelfProgress, maxSelfProgress,
                                curTotalProgress, maxTotalProgress) {},
    onSecurityChange : function(webProgress, request, state) {}
}

