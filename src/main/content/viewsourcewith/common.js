/**
 * Author   : Davide Ficano
 * Date     : 22-Nov-04
 * Date     : 19-Mar-05 written launchApp to work on MacOSX
 *                      Thanks to Johannes D
 * Date     : 15-Mar-05 unicode fixes with Japanese languages Kurusu Mitsuaki
 */

// Under mozilla composer <stringbundleset id="stringbundleset"> isn't available
// so we use nsIStringBundleService

ViewSourceWithCommon.locale = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://viewsourcewith/locale/viewsourcewith.properties");

ViewSourceWithCommon.isMacOSX = top.window.navigator.platform.indexOf("Mac") >= 0;
ViewSourceWithCommon.isWindows = top.window.navigator.platform.indexOf("Win") >= 0;
ViewSourceWithCommon.prefBranch = Components
    .classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.dafizilla.viewsourcewith.");

function ViewSourceWithCommon() {
    this.gPathSeparator = top.window.navigator.platform.indexOf("Win") < 0 ? "/" : "\\";

    return this;
}

ViewSourceWithCommon.makeWebBrowserPersist = function() {
    return Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
            .createInstance(Components.interfaces.nsIWebBrowserPersist);
}

ViewSourceWithCommon.makeLocalFile = function(path, arrayAppendPaths) {
    var file;

    try {
        file = path.QueryInterface(Components.interfaces.nsILocalFile);
    } catch (err) {
        file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(path);
    }

    if (arrayAppendPaths != null
        && arrayAppendPaths != undefined
        && arrayAppendPaths.length) {
        for (var i = 0; i < arrayAppendPaths.length; i++) {
            file.append(arrayAppendPaths[i]);
        }
    }
    return file;
}

ViewSourceWithCommon.makeFileURL = function(aFile) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    return ioService.newFileURI(aFile);
}

ViewSourceWithCommon.makeURL = function(aURL) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, null, null);
}

ViewSourceWithCommon.makeLocalFileByUrl = function(url) {
    // nsIIOService.newURI returns handle correctly UTF-8 string
    // nsIFileProtocolHandler.getFileFromURLSpec doesn't work properly with UTF-8

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(url, null, null)
            .QueryInterface(Components.interfaces.nsIFileURL)
            .file;
}

ViewSourceWithCommon.runProgram = function(theFile, cmdArgs) {
    var theProcess = null;

    if (ViewSourceWithCommon.isWindows) {
        if (!ViewSourceWithCommon.prefBranch.prefHasUserValue("useWinProcess")
            || ViewSourceWithCommon.prefBranch.getBoolPref("useWinProcess")) {
            theProcess = Components.classes["@dafizilla.sourceforge.net/winprocess;1"]
                            .createInstance()
                            .QueryInterface(Components.interfaces.IWinProcess);
        }
    }
    if (!theProcess) {
        theProcess = Components.classes["@mozilla.org/process/util;1"]
                        .createInstance(Components.interfaces.nsIProcess);
    }

    var execFile = ViewSourceWithCommon.makeLocalFile(theFile);
    var numArgs = cmdArgs.length;

    theProcess.init(execFile);
    theProcess.run(false, cmdArgs, numArgs);
}

ViewSourceWithCommon.resolveExecPath = function(execFile) {
    execFile = ViewSourceWithCommon.makeLocalFile(execFile);

    if (execFile.exists() && execFile.isFile() && execFile.isExecutable()) {
        return execFile;
    }
    if (ViewSourceWithCommon.isMacOSX) {
        // See bug 307463 and 322865
        var leafName = execFile.leafName;
        var bundleFile = execFile;

        if (leafName.match(/\.app$/) && execFile.exists() && execFile.isDirectory()) {
            try {
                var pListFile = ViewSourceWithCommon.makeLocalFile(
                                        execFile.path,
                                        ["Contents", "Info.plist"]);
                var pListText = ViewSourceWithCommon.loadTextFile(pListFile);
                var re = /\<key\>CFBundleExecutable\<\/key\>[ \t\n\v\r]*\<string\>[ \t\n\v\r]*(.*)[ \t\n\v\r]*\<\/string\>/
                var m = pListText.match(re);

                if (m && m.length == 2) {
                    bundleFile = ViewSourceWithCommon.makeLocalFile(
                                            execFile.path,
                                            ["Contents", "MacOS", m[1]]);
                }
            } catch (err) {
                ViewSourceWithCommon.log("VSW:resolveExecPath: " + err);
            }
        }

        if (bundleFile.exists() && bundleFile.isFile()) {
            return bundleFile;
        }
    }
    return null;
}

ViewSourceWithCommon.getLocalizedMessage = function(msg) {
    return ViewSourceWithCommon.locale.GetStringFromName(msg);
}

ViewSourceWithCommon.getFormattedMessage = function(msg, ar) {
    return ViewSourceWithCommon.locale.formatStringFromName(msg, ar, ar.length);
}

ViewSourceWithCommon.getMIMEService = function () {
    const CONTRACTID_MIME = "@mozilla.org/mime;1";
    const nsMIMEService = Components.interfaces.nsIMIMEService;

    return Components.classes[CONTRACTID_MIME].getService(nsMIMEService);
}

ViewSourceWithCommon.getObserverService = function () {
    const CONTRACTID_OBSERVER = "@mozilla.org/observer-service;1";
    const nsObserverService = Components.interfaces.nsIObserverService;

    return Components.classes[CONTRACTID_OBSERVER].getService(nsObserverService);
}

ViewSourceWithCommon.makeOutputStream = function(fileNameOrLocalFile, append) {
    const CONTRACTID_FOS = "@mozilla.org/network/file-output-stream;1";
    const nsFos = Components.interfaces.nsIFileOutputStream;

    var os = Components.classes[CONTRACTID_FOS].createInstance(nsFos);
    var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
    if (append != null && append != undefined && append) {
        flags = 0x02 | 0x10; // wronly | append
    }
    var file = ViewSourceWithCommon.makeLocalFile(fileNameOrLocalFile);

    os.init(file, flags, 0600, 0);

    return os;
}

ViewSourceWithCommon.read = function(file) {
    const CONTRACTID_FIS = "@mozilla.org/network/file-input-stream;1";
    const nsFis = Components.interfaces.nsIFileInputStream;
    const CONTRACTID_SIS = "@mozilla.org/scriptableinputstream;1";
    const nsSis = Components.interfaces.nsIScriptableInputStream;

    var str = "";
    var fiStream = Components.classes[CONTRACTID_FIS].createInstance(nsFis);
    var siStream = Components.classes[CONTRACTID_SIS].createInstance(nsSis);

    fiStream.init(file, 1, 0, false);
    siStream.init(fiStream);
    str += siStream.read(-1);
    siStream.close();
    fiStream.close();
    return str;
}

ViewSourceWithCommon.getProfileDir = function() {
    return ViewSourceWithCommon.getPrefDir("PrefD");
}

ViewSourceWithCommon.getUserHome = function() {
    return ViewSourceWithCommon.getPrefDir("Home");
}

ViewSourceWithCommon.getPrefDir = function(dir) {
    const CONTRACTID_DIR = "@mozilla.org/file/directory_service;1";
    const nsDir = Components.interfaces.nsIProperties;

    var dirService = Components.classes[CONTRACTID_DIR].getService(nsDir);
    return dirService.get(dir, Components.interfaces.nsILocalFile);
}

ViewSourceWithCommon.isThunderbird = function() {
    return top.window.navigator.userAgent.indexOf("Thunderbird") >= 0;
}

ViewSourceWithCommon.loadExternalUrl = function(url) {
    var uri = Components.classes["@mozilla.org/network/standard-url;1"]
                .createInstance(Components.interfaces.nsIURI);
    uri.spec = url;
    var prot = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
                .getService(Components.interfaces.nsIExternalProtocolService);
    prot.loadUrl(uri);
}

ViewSourceWithCommon.launchApp = function(execFile, argFile) {
    const nsIMIMEService                = Components.interfaces.nsIMIMEService;
    const CONTRACTID_EXT_APP_SVC        = "@mozilla.org/uriloader/external-helper-app-service;1";

    var mimeSvc = Components.classes[CONTRACTID_EXT_APP_SVC].getService(nsIMIMEService);
    var mimeInfo = mimeSvc.getFromTypeAndExtension(argFile, null);

    mimeInfo.alwaysAskBeforeHandling = false;
    mimeInfo.preferredAction = Components.interfaces.nsIMIMEInfo.useHelperApp;
    mimeInfo.preferredApplicationHandler = execFile;

    //mimeInfo.Description = "dummyDescr";
    //mimeInfo.applicationDescription = "dummyAppDescr";

    mimeInfo.launchWithFile(argFile);
}

ViewSourceWithCommon.getUnicodeConverterService = function (charset) {
    const CONTRACTID_UNICODE = "@mozilla.org/intl/scriptableunicodeconverter";
    const nsUnicodeService = Components.interfaces.nsIScriptableUnicodeConverter;

    var unicodeCvt = Components.classes[CONTRACTID_UNICODE].createInstance(nsUnicodeService);
    if (charset) {
        unicodeCvt.charset = charset;
    }

    return unicodeCvt;
}

ViewSourceWithCommon.toUnicode = function(text, charset, defValue) {
    try {
        return ViewSourceWithCommon.getUnicodeConverterService(charset)
                .ConvertToUnicode(text);
    } catch (err) {
        if (defValue) {
            return defValue;
        }
    }
    return null;
}

ViewSourceWithCommon.fromUnicode = function(text, charset, defValue) {
    try {
        var converter = ViewSourceWithCommon.getUnicodeConverterService(charset);
        return converter.ConvertFromUnicode(text) + converter.Finish();
    } catch (err) {
        if (defValue) {
            return defValue;
        }
    }
    return null;
}

ViewSourceWithCommon.loadTextFile = function(fileName) {
    var file = ViewSourceWithCommon.makeLocalFile(fileName);

    var fileContent = ViewSourceWithCommon.read(file);

    return ViewSourceWithCommon.toUnicode(fileContent, "UTF-8", fileContent);
}

ViewSourceWithCommon.saveTextFile = function(fileName, fileContent) {
    fileContent = ViewSourceWithCommon.fromUnicode(fileContent, "UTF-8", fileContent);

    var os = ViewSourceWithCommon.makeOutputStream(fileName);
    os.write(fileContent, fileContent.length);
    os.flush();
    os.close();
}

ViewSourceWithCommon.debug = function(message) {
    ViewSourceWithCommon.log(message);
}

ViewSourceWithCommon.log = function(message) {
    Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(message);
}

ViewSourceWithCommon.generateUniqueFile = function(file, maxValue) {
    const MAX_FILE_PATH = 128;

    if (file.path.length > MAX_FILE_PATH || file.exists()) {
        var leafName = file.leafName;

        if (leafName.length > MAX_FILE_PATH) {
            leafName = leafName.substr(leafName.length - MAX_FILE_PATH);
        }
        var extPos = leafName.lastIndexOf(".");
        var name;
        var ext;

        if (extPos < 0) {
            name = leafName;
            ext = "";
        } else {
            name = leafName.substr(0, extPos);
            ext = leafName.substr(extPos);
        }
        if (maxValue == undefined) {
            maxValue = 64;
        }

        var dir = file.parent.path;
        for (var i = 1; i <= maxValue; i++) {
            var newFile = ViewSourceWithCommon.makeLocalFile(dir, [name + "_" + i + ext]);
            if (!newFile.exists()) {
                return newFile;
            }
        }
    }

    return file;
}

ViewSourceWithCommon.getDocumentFileName = function(doc, suggestedExtension) {
    const contractIDStdURL = "@mozilla.org/network/standard-url;1";
    const nsIURL = Components.interfaces.nsIURL;
    var uri = Components.classes[contractIDStdURL].createInstance(nsIURL);

    uri.spec = doc.location ? doc.location.href : doc;

    var fileName;
    // This url contains only directory name (e.g. http://www.xulplanet.com/)
    var re = /\/([^\/]+)\/$/;
    var path = uri.path.match(re);
    if (path && path.length > 1) {
        fileName = path[1];
    } else {
        fileName = uri.fileName;
    }

    // nsIProcess is unable to handle unicode arguments so we "normalize" them
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=229379
    // Another reason to normalize filename is due to the fact many editors
    // are unable to open paths with unicode characters (Notepad++ v3.2)
    try {
        var textToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"]
                            .getService(Components.interfaces.nsITextToSubURI);
        var tempFileName = textToSubURI.unEscapeURIForUI("UTF-8", fileName);
        var normalizedFileName = "";
        for (var i = 0; i < tempFileName.length; i++) {
            var charCode = tempFileName.charCodeAt(i);
            if (charCode <= 127) {
                normalizedFileName += tempFileName[i];
            }
        }
        fileName = normalizedFileName;
    } catch (err) {
        ViewSourceWithCommon.log("Invalid uriForUI " + err);
    }

    // Handle cases like
    // http://host.com/path/?noFileName=before_question_mark_no_name
    if (fileName == "") {
        path = uri.directory.match(re);
        if (path && path.length > 1) {
            fileName = path[1];
        } else {
            fileName = "index";
        }
    }

    var extension = "";
    if (typeof (suggestedExtension) == "undefined"
        || suggestedExtension == null || suggestedExtension == "") {
        try {
            extension = "." + ViewSourceWithCommon.getMIMEService()
                                    .getPrimaryExtension(doc.contentType, null);
        } catch (err) {
            if (uri.fileExtension == "") {
                extension = ".htm";
            }
        }
    } else {
        if (uri.fileExtension != suggestedExtension) {
            extension = "." + suggestedExtension;
        }
    }

    fileName += extension;

    var host = "";

    if (uri.host != "" && uri.spec.substr(0, 6) != "about:") {
        host = uri.host + "_";
    }
    return ViewSourceWithCommon.getPortableFileName(/*unescape*/(host + fileName));
}

/**
 * Replace following chars with underscore (_)
 * \ / : * ? " < > |
 */
ViewSourceWithCommon.getPortableFileName = function(fileName) {
    return fileName.replace(/[\\\/\:\*\?\"\<\>\| ]+/g, "_");//"
}

ViewSourceWithCommon.isTrue = function(v) {
    if (v) {
        v = v.toLowerCase();

        return v == "t" || v == "true" || v == "yes" || v == "y";
    }
    return false;
}

ViewSourceWithCommon.readHttpReq = function(urlName) {
    var httpReq = new XMLHttpRequest();
    httpReq.open("GET", urlName, false);
    httpReq.send(null);

    return httpReq;
}

ViewSourceWithCommon.makeUrlFromSpec = function(urlSpec) {
    const contractIDStdURL = "@mozilla.org/network/standard-url;1";
    const nsIURL = Components.interfaces.nsIURL;
    var uri = Components.classes[contractIDStdURL].createInstance(nsIURL);

    uri.spec = urlSpec;

    return uri;
}

ViewSourceWithCommon.getDocumentFromContextMenu = function(useFrameDocument) {
    var doc = window._content.document;

    if (!(typeof gContextMenu == "undefined") && gContextMenu) { // songbird needs typeof usage
        if (gContextMenu.inFrame) {
            if (useFrameDocument) {
                doc = gContextMenu.target.ownerDocument;
            } else {
                doc = window._content.document;
            }
        } else {
            doc = gContextMenu.target.ownerDocument;
        }
    }
    return doc;
}

ViewSourceWithCommon.getFocusedDocument = function() {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    // Don't get url from browser widgets (e.g. google bar, address bar)
    if (focusedWindow == window) {
        focusedWindow = _content;
    }

    return focusedWindow.document;
}

ViewSourceWithCommon.initFileToRun = function(fileName,
                                              destFolder,
                                              maxPrefix,
                                              touch,
                                              cleaner) {
    var filePath = ViewSourceWithCommon.makeLocalFile(
                        destFolder,
                        [ViewSourceWithCommon.getPortableFileName(fileName)]);
    var uniqueFilePath = ViewSourceWithCommon
            .generateUniqueFile(filePath, maxPrefix);
    if (touch) {
        // Touch file on disk to be sure files with same name don't overlap
        try {
            ViewSourceWithCommon.saveTextFile(uniqueFilePath, "");
        } catch (err) {
        }
    }
    if (cleaner) {
        cleaner.deleteTemporaryFileOnExit(uniqueFilePath);
    }

    return uniqueFilePath;
}

ViewSourceWithCommon.getNavigationWindow = function() {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
    var win = windowManagerInterface.getMostRecentWindow("navigator:browser");

    if (!win) {
        win = window.openDialog(
            "chrome://browser/content/browser.xul",
            "_blank",
            "chrome,all,dialog=no",
            "about:blank", null, null);
    }

    return win;
}

ViewSourceWithCommon.openUrl = function(url) {
    try {
        var navWin = ViewSourceWithCommon.getNavigationWindow();
        var browser = navWin.document.getElementById("content");

        browser.selectedTab = browser.addTab(url);
    } catch (err) {
        // This isn't a browser (e.g. Thunderbird, NVU)
        try {
            ViewSourceWithCommon.loadExternalUrl(url);
        } catch (err) {
        }
    }
}

ViewSourceWithCommon.getEditorForWindow = function(target) {
    var editor = null;

    try {
        if (target) { //.ownerDocument && target.ownerDocument.defaultView) {
            var win = target; //.ownerDocument.defaultView;
            var editingSession = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                            .getInterface(Components.interfaces.nsIWebNavigation)
                            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                            .getInterface(Components.interfaces.nsIEditingSession);
            if (editingSession.windowIsEditable(win)) {
                var e = editingSession.getEditorForWindow(win);
                if (e instanceof Components.interfaces.nsIHTMLEditor) {
                    editor = e;
                }
            }
        }
    } catch (err) {
    }
    return editor;
}

ViewSourceWithCommon.addToolbarButton = function(buttonId) {
    var toolbar =
        document.getElementById('nav-bar') ||
        document.getElementById('mail-bar') ||
        document.getElementById('mail-bar2');

    if (toolbar
        && toolbar.currentSet
        && toolbar.currentSet.indexOf(buttonId) == -1
        && toolbar.getAttribute('customizable') == 'true') {
        toolbar.currentSet = toolbar.currentSet.replace(
            /(urlbar-container|separator)/,
            buttonId + ',$1');
        toolbar.setAttribute('currentset', toolbar.currentSet);
        toolbar.ownerDocument.persist(toolbar.id, 'currentset');
        try { BrowserToolboxCustomizeDone(true); } catch (e) {}
    }
}

ViewSourceWithCommon.isToolbarCustomizable = function() {
    var toolbar =
        document.getElementById('nav-bar') ||
        document.getElementById('mail-bar') ||
        document.getElementById('mail-bar2');

    return toolbar && toolbar.currentSet;
}

ViewSourceWithCommon.isToolbarButtonAlreadyPresent = function(buttonId) {
    var toolbar =
        document.getElementById('nav-bar') ||
        document.getElementById('mail-bar') ||
        document.getElementById('mail-bar2');

    return toolbar && toolbar.currentSet && toolbar.currentSet.indexOf(buttonId) >= 0;
}

ViewSourceWithCommon.getLocalFilePage = function(url) {
    try {
        if (url.substring(0, 7) == "file://") {
            var file = ViewSourceWithCommon.makeLocalFileByUrl(url);
            return file.exists() && file.isDirectory() ? null : file;
        }
    } catch (err) {
    }
    return null;
}

ViewSourceWithCommon.isMessenger = function() {
    return typeof(GetNumSelectedMessages) != "undefined";
}
