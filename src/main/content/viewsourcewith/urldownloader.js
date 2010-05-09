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
    /**
     * Save the current document page source attempting to fetch from cache, this
     * should be always possible if pageDescriptor points to the current page.
     * If the cache doesn't contain the page then call saveURIList.
     * @param pageDescriptor the pageDescription necessary to access the cache
     * @param url the url to save, it is used only if the cache doesn't contain the page
     * @param outFile the destination nsILocalFile where to store page
     * @param referrer the referrer, can be null
     * @param postData the post data, can be null
     */
    saveURIFromCache : function(pageDescriptor, url, outFile, referrer, postData) {
        this.useCache = this.loadFromCache(Components.interfaces
                                .nsIWebPageDescriptor.DISPLAY_AS_SOURCE,
                                pageDescriptor);
        if (this.useCache) {
            this.outFiles = [outFile];
            this.urls = [url];
            this.count = 0;
        } else {
            this.saveURIList([url], [outFile], referrer, postData);
        }
    },

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
                this.flushCache();
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

    loadFromCache : function(displayType, pageDescriptor) {
        var foundCache = false;

        if (pageDescriptor) {
            try {
                this.webShell = ViewSourceWithCommon.createDocShellInstance();

                const nsIWebProgress = Components.interfaces.nsIWebProgress;
                this.progress = this.webShell.QueryInterface(nsIWebProgress);
                this.progress.addProgressListener(this,
                                             nsIWebProgress.NOTIFY_STATE_DOCUMENT);
                var pageLoader = this.webShell.QueryInterface(
                                    Components.interfaces.nsIWebPageDescriptor);
                pageLoader.loadPage(pageDescriptor, displayType);
                foundCache = true;
            } catch (err) {
                ViewSourceWithCommon.log("loadFromCache " + err);
            }
        }

        return foundCache;
    },

    flushCache : function() {
        if (this.useCache) {
            // reset flag
            this.useCache = false;
            var webNavigation = this.webShell.QueryInterface(
                                    Components.interfaces.nsIWebNavigation);
            var content = webNavigation.document.body.textContent;
            ViewSourceWithCommon.saveTextFile(this.outFiles[0], content);
        }
    },

    onStatusChange : function(webProgress, request, status, message) {},
    onLocationChange : function(webProgress, request, location) {},
    onProgressChange : function(webProgress, request,
                                curSelfProgress, maxSelfProgress,
                                curTotalProgress, maxTotalProgress) {},
    onSecurityChange : function(webProgress, request, state) {}
}

