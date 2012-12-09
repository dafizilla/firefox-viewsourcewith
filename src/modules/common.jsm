/**
 * Author   : Davide Ficano
 * Date     : 22-Nov-04
 * Date     : 19-Mar-05 written launchApp to work on MacOSX
 *                      Thanks to Johannes D
 * Date     : 15-Mar-05 unicode fixes with Japanese languages Kurusu Mitsuaki
 */

// Under mozilla composer <stringbundleset id="stringbundleset"> isn't available
// so we use nsIStringBundleService

var EXPORTED_SYMBOLS = ["ViewSourceWithCommon"];

ViewSourceWithCommon.locale = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://viewsourcewith/locale/viewsourcewith.properties");

var runtime = Components.classes["@mozilla.org/xre/app-info;1"]
                    .getService(Components.interfaces.nsIXULRuntime);
var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);

ViewSourceWithCommon.isMacOSX = runtime.OS == "Darwin";
ViewSourceWithCommon.isWindows = runtime.OS == "WINNT";

ViewSourceWithCommon.prefBranch = Components
    .classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.dafizilla.viewsourcewith.");

// Use runw when available (on Gecko 2.x/FF 4.x)
if (typeof(ViewSourceWithCommon.runwDefined) == "undefined") {
    ViewSourceWithCommon.runwDefined = ("runw" in
            Components.classes["@mozilla.org/process/util;1"]
                .createInstance(Components.interfaces.nsIProcess));
}

function ViewSourceWithCommon() {
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
    // on linux runw() doesn't work correctly so use it only on Windows
    var useRunw = false;

    if (ViewSourceWithCommon.isWindows) {
        if (ViewSourceWithCommon.runwDefined) {
            useRunw = true;
        } else {
            useRunw = false;
            if (!ViewSourceWithCommon.prefBranch.prefHasUserValue("useWinProcess")
                || ViewSourceWithCommon.prefBranch.getBoolPref("useWinProcess")) {
                theProcess = Components.classes["@dafizilla.sourceforge.net/winprocess;1"]
                                .createInstance()
                                .QueryInterface(Components.interfaces.IWinProcess);
            }
        }
    }
    if (!theProcess) {
        theProcess = Components.classes["@mozilla.org/process/util;1"]
                        .createInstance(Components.interfaces.nsIProcess);
    }

    var execFile = ViewSourceWithCommon.makeLocalFile(theFile);
    var numArgs = cmdArgs.length;

    theProcess.init(execFile);

    if (useRunw) {
        theProcess.runw(false, cmdArgs, numArgs);
    } else {
        theProcess.run(false, cmdArgs, numArgs);
    }
}

/**
 * Extract under OSX the executable file path contained inside an AppBundle file
 * @param execFile the nsIFile pointing to an appBundle (ie .app file)
 * @returns the nsILocalFile of executable contained into appBundle file,
 * null otherwise
 */
ViewSourceWithCommon.getFileFromAppBundle = function(execFile) {
    // See bug 307463 and 322865
    var bundleFile = null;

    if (execFile
        && execFile.leafName.match(/\.app$/)
        && execFile.exists()
        && execFile.isDirectory()) {
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
            ViewSourceWithCommon.log("VSW:getFileFromAppBundle: " + err);
        }
    }
    if (bundleFile && bundleFile.exists() && bundleFile.isFile()) {
        return bundleFile;
    }
    return null;
}

/**
 * Resolve in a cross platform way the passed execFile to an executable program
 * @param execFile executable nsIFile
 * @returns the executable resolved nsIFile or null
 */
ViewSourceWithCommon.resolveExecPath = function(execFile) {
    execFile = ViewSourceWithCommon.makeLocalFile(execFile);

    if (execFile.exists() && execFile.isFile() && execFile.isExecutable()) {
        return execFile;
    }
    if (ViewSourceWithCommon.isMacOSX) {
        var bundleFile = ViewSourceWithCommon.getFileFromAppBundle(execFile);
        if (bundleFile) {
            return bundleFile;
        } else if (execFile.exists() && execFile.isFile()) {
            return execFile;
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
        flags = 0x02 | 0x08 | 0x10; // wronly | create | append
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
    return appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
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

/**
 * Generate, if necessary, an unique file inside the same directory of passed file.
 * If the passed file exists or matches other unique criteria a new file
 * with unique path will be generated and returned otherwise the passed file is returned
 * @param file the nsIFile to test and use as template if it already exists
 * @param maxValue max count to use to generate unique file name, by default 64
 * @returns the file itself if it is unique or a new nsILocalFile
 */
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

/**
 * Return a file name from passed doc/url
 * @param doc an HTMLDocument or url string from which get the file name
 * @param suggestedExtension if specified append this extension to file name
 * otherwise try to determine the extension from document and if it fails use .htm
 * @returns the file name
 */
ViewSourceWithCommon.getDocumentFileName = function(doc, suggestedExtension) {
    var uri;

    try {
        // on thunderbird extract correct name, ext for mailbox:// image urls
        uri = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService)
                    .newURI(doc.location ? doc.location.href : doc, null, null)
                    .QueryInterface(Components.interfaces.nsIURL);
    } catch (err) {
        uri = Components.classes["@mozilla.org/network/standard-url;1"]
            .createInstance(Components.interfaces.nsIURL);
        uri.spec = doc.location ? doc.location.href : doc;
    }

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
    if (typeof (suggestedExtension) === "undefined"
        || suggestedExtension === null || suggestedExtension === "") {
        try {
            // passing empty string as content type raises exception
            var contentType = typeof(doc.contentType) == 'undefined' ? "" : doc.contentType;
            extension = "." + ViewSourceWithCommon.getMIMEService()
                                    .getPrimaryExtension(contentType, null);
        } catch (err) {
            if (uri.fileExtension == "") {
                extension = ".htm";
            }
        }
    } else {
        if (uri.fileExtension !== suggestedExtension) {
            extension = suggestedExtension[0] == '.'
                ? suggestedExtension : ("." + suggestedExtension);
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

ViewSourceWithCommon.readHttpReq = function(urlName, settings) {
    var httpReq = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]  
                    .createInstance(Components.interfaces.nsIXMLHttpRequest);
    httpReq.open("GET", urlName, false);

    if (settings) {
        if (settings.mimeType) {
            httpReq.overrideMimeType(settings.mimeType);
        }
    }
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

ViewSourceWithCommon.getFocusedDocument = function(doc) {
    var focusedWindow = doc.commandDispatcher.focusedWindow;
    // Don't get url from browser widgets (e.g. google bar, address bar)
    if (focusedWindow == doc.defaultView) {
        focusedWindow = doc.defaultView.content;
    }

    return focusedWindow.document;
}

/**
 * Generate an unique file inside folder destFolder.
 * @param fileName the file name to use, invalid characters will be removed
 * @param destFolder the destination folder
 * @param maxPrefix max count of prefixes used to generate unique file name, default 64
 * @param touch if true create an empty file with generated file path, this ensures
 * the caller to obtain a safe path, default false
 * @param cleaner, add file to cleaner to delete from disk at shutdown time
 * @returns the unique nsILocalFile
 */
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
    // create file with correct permissions
    if (!filePath.exists()) {
        filePath.create(0x00, 0600);
    }    
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
        if (target) {
            var win = target;
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

ViewSourceWithCommon.getToolbar = function(doc) {
    return doc.getElementById('nav-bar') ||
        doc.getElementById('mail-bar3') || // TB3 must be checked before TB2
        doc.getElementById('mail-bar2') || // TB2
        doc.getElementById('mail-bar');
}

ViewSourceWithCommon.addToolbarButton = function(doc, buttonId) {
    var toolbar = ViewSourceWithCommon.getToolbar(doc);

    if (toolbar
        && toolbar.currentSet
        && toolbar.currentSet.indexOf(buttonId) == -1
        && toolbar.getAttribute('customizable') == 'true') {

        // throbber-box for SM2
        // button-tag for TB3
        toolbar.currentSet = toolbar.currentSet.replace(
            /(urlbar-container|separator|throbber-box|button-tag)/,
            buttonId + ',$1');
        toolbar.setAttribute('currentset', toolbar.currentSet);
        toolbar.ownerDocument.persist(toolbar.id, 'currentset');
        try { BrowserToolboxCustomizeDone(true); } catch (e) {}
    }
}

ViewSourceWithCommon.isToolbarCustomizable = function(doc) {
    var toolbar = ViewSourceWithCommon.getToolbar(doc);

    return toolbar && toolbar.currentSet;
}

ViewSourceWithCommon.isToolbarButtonAlreadyPresent = function(doc, buttonId) {
    var toolbar = ViewSourceWithCommon.getToolbar(doc);

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
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]  
           .getService(Components.interfaces.nsIXULAppInfo);      

    return appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
}

ViewSourceWithCommon.hasClass = function(el, cls) {
    return el.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}

ViewSourceWithCommon.addClass = function(el, cls) {
    if (!ViewSourceWithCommon.hasClass(el, cls)) el.className += " " + cls;
}

ViewSourceWithCommon.removeClass = function(el, cls) {
    if (ViewSourceWithCommon.hasClass(el, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        el.className = el.className.replace(reg,' ');
    }
}

ViewSourceWithCommon.createDocShellInstance = function() {
    // Under FF3.6 @mozilla.org/webshell;1 has been removed
    if ("@mozilla.org/docshell;1" in Components.classes) {
        return Components.classes["@mozilla.org/docshell;1"]
                            .createInstance();
    } else {
        return Components.classes["@mozilla.org/webshell;1"]
                            .createInstance();
    }
}

ViewSourceWithCommon.copyToClipboard = function(str) {
    Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper)
        .copyString(str);
}

ViewSourceWithCommon.pickFile = function(title, startPath, win, mode) {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(Components.interfaces.nsIFilePicker);
    fp.init(win, title, mode);
    
    try {
        if (startPath) {
            var currDir = Components.classes["@mozilla.org/file/local;1"]
                       .createInstance(Components.interfaces.nsILocalFile);
            currDir.initWithPath(startPath);
            if (currDir.isFile()) {
                currDir = currDir.parent;
            }
            if (currDir.isDirectory()) {
                fp.displayDirectory = currDir;
            }
        }
    } catch (err) {
        // simply don't set displayDirectory
    }

    try {
        var res = fp.show();
        var isOk = (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace);
        if (isOk && fp.file) {
            return fp.file.path;
        }
    } catch (err) {
        alert("onPickFile: " + err);
    }
    return null;
}