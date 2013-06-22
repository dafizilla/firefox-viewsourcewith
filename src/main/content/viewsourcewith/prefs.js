/**
 * Author   : Davide Ficano
 * Date     : 22-Nov-04
 * Date     : 15-Jan-05 Fix description
 * Date     : 13-Feb-05 Refactoring
 * Date     : 12-Mar-05 Fixed xml for special symbols (eg. < > &)
 * Date     : 13-Mar-05 Added saveMethod pref
 * Date     : 23-Apr-05 Added replaceNativeEditor pref
 * Date     : 30-Apr-05 Added support profile directory for removable drives
 * Date     : 26-Jun-05 Refactored to remove ViewSourceWithCachedPrefs
 * Date     : 04-Aug-06 ViewSourceEditorData handles runEditor
 * Date     : 27-Jul-07 Fixed problem with hiddenDOMWindow
 */

Components.utils.import("resource://vsw/common.jsm");

const VSW_PREF_CONFIG_PATH = "configPath";
const VSW_PREF_USE_PROFILE_PATH = "useProfilePath";
const VSW_PREF_TOOLBAR_ICON_ADDED = "toolbaricon.added";
const VSW_PREF_OPEN_BKG_IMAGE = "openBkgImage";

function ViewSourceEditorData(isVisible, description, path, showAlways) {
    this._isVisible = ViewSourceWithCommon.isTrue(isVisible);
    this.description = description;
    this.path = path;
    this.showAlways = showAlways;
    this._keyData = null;
    this.cmdArgs = "$f";
    this.usePortable = false;
}

ViewSourceEditorData.prototype = {
    get isVisible() {
        return this._isVisible;
    },

    set isVisible(b) {
        this._isVisible = b;
    },

    get keyData() {
        return this._keyData;
    },

    set keyData(v) {
        if (v) {
            if ((v.key && v.key != "") || (v.keyCode && v.keyCode != "")) {
                if (!this._keyData) {
                    this._keyData = new ViewSourceWithKeyData();
                }
                this._keyData.copy(v);
            } else {
                ViewSourceWithCommon.log("ViewSourceEditorData invalid key " + v);
            }
        } else {
            this._keyData = null;
        }
    }
};

ViewSourceEditorData.runEditor = function(editorData, paths, line, col) {
    var cmdArgs = editorData.cmdArgs;
    if (!cmdArgs || cmdArgs == "") {
        cmdArgs = "$f";
    }
    var intLine = parseInt(line);
    if (isNaN(intLine) || intLine < 1) {
        line = "1";
    }
    var intCol = parseInt(col);
    if (isNaN(intCol) || intCol < 1) {
        col = "1";
    }

    // Under Linux (and hoping on MacOSX) the passed charset
    // doesn't work so we force UTF-8
    if (!ViewSourceWithCommon.isWindows) {
        var charset = "UTF-8";

        for (var i in paths) {
            paths[i] = ViewSourceWithCommon.fromUnicode(paths[i], charset);
        }
    }

    var allArgs = new Array();
    var data = { str : cmdArgs,
                 currPos : 0,
                 currToken : "",
                 isQuoted : false
               }

    while (ViewSourceEditorData.getToken(data)) {
        allArgs = ViewSourceEditorData._parseToken(paths, line, col, allArgs, data);
    }

    var editorPath;
    if (editorData.usePortable) {
        editorPath = ViewSourceWithCommon.getProfileDir().path + editorData.path;
    } else {
        editorPath = editorData.path;
    }
    var editorFile = ViewSourceWithCommon.resolveExecPath(editorPath);
    if (editorFile && editorFile.exists() && editorFile.isFile()) {
        ViewSourceWithCommon.runProgram(editorFile, allArgs);
    } else {
        var msg = ViewSourceWithCommon.getFormattedMessage(
                    "err.file.not.found", [editorData.description]);
        Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService)
                .alert(null, "ViewSourceWith", msg);
    }
}

ViewSourceEditorData._parseToken = function(paths, line, col, allArgs, data) {
    var str = "";

    for (var i = 0; i < data.currToken.length; i++) {
        if (data.currToken[i] == '\\') {
            str += data.currToken[++i];
        } else if (data.currToken[i] == '$') {
            switch (data.currToken[++i]) {
                case '$':
                    str += '$';
                    break;
                case 'f':
                    if (data.isQuoted) {
                        for (var j = 0; j < paths.length; j++) {
                            str += paths[j];
                            if (j != (paths.length - 1)) {
                                str += " ";
                            }
                        }
                    } else {
                        allArgs = allArgs.concat(paths);
                    }
                    break;
                case 'l':
                    str += line;
                    break;
                case 'c':
                    str += col;
                    break;
                default:
                    str += data.currToken[i];
                    break;
            }
        } else {
            str += data.currToken[i];
        }
    }
    if (str.length) {
        allArgs.push(str);
    }
    return allArgs;
}

ViewSourceEditorData.getToken = function(data) {
    var s = data.str;
    var token = "";

    var quoteOff = true;
    data.isQuoted = false;

    for (var i = data.currPos; i < s.length; i++) {
        var ch = s.charAt(i);

        if (ch == " ") {
            if (quoteOff) {
                if (token != "") {
                    data.currPos = i + 1; // skip blank
                    data.currToken = token;
                    return true;
                }
                continue;
            }
        }
        if (ch == '\\') {
            token += ch;
            ch = s.charAt(++i);
        } else if (ch == '"') {
            quoteOff = !quoteOff;
            data.isQuoted = true;
            continue;
        }
        token += ch;
    }
    if (data.isQuoted) {
        //log("Quote close not found");
    }
    if (token != "") {
        data.currPos = i;
        data.currToken = token;
        return true;
    }

    return false;
}

function ViewSourceWithPrefs() {
    this._prefBranch = new ViewSourceWithPrefBranchHelper(ViewSourceWithCommon.prefBranch);
    this.migratePrefs();
    this._editorDefaultIndex    = -1
    this._showFrameWarning   = true;
    this._destFolder    = ViewSourceWithPrefs.getTempDir();
    this._editorData    = new Array();
    this._configPath    =  this._prefBranch.getString(VSW_PREF_CONFIG_PATH, null);
    this._useProfilePath =  this._prefBranch.getBool(VSW_PREF_USE_PROFILE_PATH, false);
    this._saveMethod     = "normal";
    this._replaceNativeEditor = false;
    this._openFocusWin  = true;
    this._openImageOnLink = false;
    this._tempMaxFilesSamePrefix = 20;
    this._tempClearAtExit = false;
    this._tempUseOSPath = false;

    this._viewShowMenuIcon = true;

    this._nativeImageEditorIndex = -1;
    this._urlMapperData    = new Array();
    this._fileExtensionMapper = new Array();

    if (this._useProfilePath) {
        this._configPath = this.profilePath;
    }
    this._showResourcesMenu = true;
    this._showQuickFrame = false;
    this._replaceJSConsole = true;
    this._allowEditText = true;
    this._defaultShortcutKey = this.newDefaultEditorKeyData();
    this._showButtonOnPopup = true;
}

ViewSourceWithPrefs.getTempDir = function() {
    try {
        return ViewSourceWithCommon.getPrefDir("TmpD").path;
    } catch (err) {
    }
    return "";
}

ViewSourceWithPrefs.prototype = {
    copy : function(prefs) {
        this._editorDefaultIndex    = prefs._editorDefaultIndex;
        this._showFrameWarning   = prefs._showFrameWarning;
        this._destFolder    = prefs._destFolder;
        this._editorData    = prefs._editorData;
        this._configPath    = prefs._configPath;
        this._useProfilePath =  prefs.useProfilePath;
        this._saveMethod    = prefs._saveMethod;
        this._replaceNativeEditor = prefs._replaceNativeEditor;
        this._openFocusWin = prefs._openFocusWin;
        this._openImageOnLink = prefs._openImageOnLink;
        this._tempMaxFilesSamePrefix = prefs._tempMaxFilesSamePrefix;
        this._tempClearAtExit = prefs._tempClearAtExit;
        this._tempUseOSPath = prefs._tempUseOSPath;
        this._viewShowMenuIcon = prefs._viewShowMenuIcon;
        this._nativeImageEditorIndex = prefs._nativeImageEditorIndex;
        this._urlMapperData = prefs._urlMapperData;
        this._fileExtensionMapper = prefs._fileExtensionMapper;
        this._showResourcesMenu = prefs._showResourcesMenu;
        this._showQuickFrame = prefs._showQuickFrame;
        this._replaceJSConsole = prefs._replaceJSConsole;
        this._allowEditText = prefs._allowEditText;
        this._defaultShortcutKey.copy(prefs._defaultShortcutKey);
        this._showButtonOnPopup = prefs._showButtonOnPopup;
    },

    get destFolder() {
        return this._tempUseOSPath ? ViewSourceWithPrefs.getTempDir() : this._destFolder;
    },

    set destFolder(folder) {
        if (!this._tempUseOSPath) {
            this._destFolder = folder;
        }
    },

    get showFrameWarning() {
        return this._showFrameWarning;
    },

    set showFrameWarning(b) {
        this._showFrameWarning = b;
    },

    get editorData() {
        return this._editorData;
    },

    set editorData(newData) {
        this._visibleEditorIndexes = null;
        this._editorData = newData;
    },

    get editorDefaultIndex() {
        return this._editorDefaultIndex;
    },

    set editorDefaultIndex(newDefaultIndex) {
        this._visibleEditorIndexes = null;
        this._editorDefaultIndex = parseInt(newDefaultIndex);
    },

    get configPath() {
        return this._configPath;
    },

    set configPath(newConfigPath) {
        this._configPath = newConfigPath;
    },

    get saveMethod() {
        return this._saveMethod;
    },

    set saveMethod(newSaveMethod) {
        this._saveMethod = newSaveMethod;
    },

    get replaceNativeEditor() {
        return this._replaceNativeEditor;
    },

    set replaceNativeEditor(newValue) {
        this._replaceNativeEditor = newValue;
    },

    get openFocusWin() {
        return this._openFocusWin;
    },

    set openFocusWin(newValue) {
        this._openFocusWin = newValue;
    },

    get useProfilePath() {
        return this._useProfilePath;
    },

    set useProfilePath(newValue) {
        this._useProfilePath = newValue;
    },

    get openImageOnLink() {
        return this._openImageOnLink;
    },

    set openImageOnLink(newValue) {
        this._openImageOnLink = newValue;
    },

    get tempMaxFilesSamePrefix() {
        return this._tempMaxFilesSamePrefix;
    },

    set tempMaxFilesSamePrefix(newValue) {
        this._tempMaxFilesSamePrefix = parseInt(newValue);
    },

    get tempClearAtExit() {
        return this._tempClearAtExit;
    },

    set tempClearAtExit(newValue) {
        this._tempClearAtExit = newValue;
    },

    get tempUseOSPath() {
        return this._tempUseOSPath;
    },

    set tempUseOSPath(newValue) {
        this._tempUseOSPath = newValue;
    },

    get viewShowMenuIcon() {
        return this._viewShowMenuIcon;
    },

    set viewShowMenuIcon(newValue) {
        this._viewShowMenuIcon = newValue;
    },

    set nativeImageEditorIndex(newValue) {
        this._nativeImageEditorIndex = parseInt(newValue);
    },

    get nativeImageEditorIndex() {
        return this._nativeImageEditorIndex;
    },

    get urlMapperData() {
        return this._urlMapperData;
    },

    set urlMapperData(newData) {
        this._urlMapperData = newData;
    },

    get fileExtensionMapper() {
        return this._fileExtensionMapper;
    },

    set fileExtensionMapper(newData) {
        this._fileExtensionMapper = newData;
    },

    get showResourcesMenu() {
        return this._showResourcesMenu;
    },

    set showResourcesMenu(newData) {
        this._showResourcesMenu = newData;
    },

    get showQuickFrame() {
        return this._showQuickFrame;
    },

    set showQuickFrame(newData) {
        this._showQuickFrame = newData;
    },

    get replaceJSConsole() {
        return this._replaceJSConsole;
    },

    set replaceJSConsole(newData) {
        this._replaceJSConsole = newData;
    },

    get allowEditText() {
        return this._allowEditText;
    },

    set allowEditText(newData) {
        this._allowEditText = newData;
    },

    get defaultShortcutKey() {
        return this._defaultShortcutKey;
    },

    set defaultShortcutKey(newValue) {
        this._defaultShortcutKey = newValue;
    },

    get isToolbarIconAdded() {
        return this._prefBranch.getBool(VSW_PREF_TOOLBAR_ICON_ADDED, false);
    },

    set toolbarIconAdded(newValue) {
        return this._prefBranch.setBool(VSW_PREF_TOOLBAR_ICON_ADDED, newValue);
    },

    get showButtonOnPopup() {
        return this._showButtonOnPopup;
    },

    set showButtonOnPopup(newValue) {
        this._showButtonOnPopup = newValue;
    },

    /**
     * If path doesn't exist create the file, set configPath and return its path
     */
    getSafeConfigPath: function() {
        var isInvalid = this.configPath == null || this.configPath == "";

        if (isInvalid) {
            var homeDir = ViewSourceWithCommon.getProfileDir();
            homeDir.append("viewSource.xml");
            this._configPath = homeDir.path;

            // do not overwrite existing file
            if (!homeDir.exists()) {
                this.savePrefs();
            }
        }
        return this._configPath;
    },

    readPrefs : function(configPath) {
        if (configPath == undefined || configPath == null) {
            configPath = this.getSafeConfigPath();
        } else {
            this._configPath = configPath;
        }
        var xml = "";
        try {
            xml = ViewSourceWithCommon.loadTextFile(configPath);
        } catch(ex) {
            ViewSourceWithCommon.log("VSW error" + ex);
            throw "Ensure " + configPath + " exists and it is readable"
                + "\nSee error console for more details";
        }

        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, "text/xml");
        if (doc.firstChild.nodeName != "parsererror") {
            this._showFrameWarning   = this.getFrameWarning(doc);
            this._editorDefaultIndex    = this.getDefaultItem(doc);
            this._destFolder    = this.getDestFolder(doc);
            this._editorData    = this.getMainEditors(doc);
            this._saveMethod    = this.getSaveMethod(doc);
            this._replaceNativeEditor = this.getBoolean(doc, "replace-native-editor", false);
            this._openFocusWin = this.getBoolean(doc, "open-focus-win", true);
            this._openImageOnLink = this.getBoolean(doc, "open-image-on-link", false);

            this._tempClearAtExit = this.getBoolean(doc, "destination-clear-at-exit", false);
            this.tempMaxFilesSamePrefix = this.getTagValue(doc, "destination-max-files-with-same-name", "20");
            this._tempUseOSPath = this.getBoolean(doc, "destination-use-os-path", false);

            this._viewShowMenuIcon = this.getBoolean(doc, "view-icons", true);
            this.nativeImageEditorIndex = this.getTagValue(doc, "native-image-editor-index", "-1");

            this._urlMapperData = this.getUrlMappers(doc);
            this._fileExtensionMapper = this.getFileExtensionMapper(doc);

            // sanity check
            if (this._editorData.length > 0 && !(0 <= this._editorDefaultIndex && this._editorDefaultIndex < this._editorData.length)) {
                this._editorDefaultIndex = 0;
            }
            this._showResourcesMenu = this.getBoolean(doc, "show-resources-menu", true);

            this._showQuickFrame = this.getBoolean(doc, "show-quick-frame-menu", false);
            this._replaceJSConsole = this.getBoolean(doc, "replace-jsconsole-editor", true);
            this._allowEditText = this.getBoolean(doc, "allow-edit-text", true);

            this._defaultShortcutKey = this.getDefaultShortcutKey(doc);
            this._showButtonOnPopup = this.getBoolean(doc, "show-button-on-popup", true);
        } else {
            throw this.getTagValue(doc, "parsererror");
        }
    },

    getDefaultShortcutKey : function(doc) {
        var keyNode = this.getNodeByParent(doc, "default-editor-key", "key");

        if (keyNode) {
            return ViewSourceWithKeyData.fromAttributes(keyNode.attributes);
        }

        return this.newDefaultEditorKeyData();
    },

    getNodeByParent : function(doc, parentNodeName, nodeName) {
        var nl = doc.getElementsByTagName(parentNodeName);

        if (nl) {
            for (var i = 0; i < nl.length; i++) {
                var node = this.getNode(nl.item(i).childNodes, nodeName);
                if (node) {
                    return node;
                }
            }
        }
        return null;
    },

    getNode : function(nl, nodeName) {
        if (nl) {
            for (var i = 0; i < nl.length; i++) {
                var node = nl.item(i);
                if (node.localName == nodeName) {
                    return node;
                }
            }
        }
        return null;
    },

    getVersion : function(doc) {
        return doc.firstChild.attributes.getNamedItem("version").value;
    },

    getTagValue : function(doc, tagName, defValue) {
        var nl = doc.getElementsByTagName(tagName);

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            return nl.item(0).firstChild.nodeValue;
        }
        return defValue;
    },

    getBoolean : function(doc, tagName, defValue) {
        var v = this.getTagValue(doc, tagName, null);

        if (defValue == undefined) {
            defValue = false;
        }

        return v == null ? defValue : ViewSourceWithCommon.isTrue(v);
    },

    getFrameWarning : function(doc) {
        return this.getBoolean(doc, "show-frame-warning", true);
    },

    getDefaultItem :function(doc) {
        return this.getTagValue(doc, "default-item-index", "-1");
    },

    getSaveMethod :function(doc) {
        return this.getTagValue(doc, "save-method", "normal");
    },

    getDestFolder : function(doc) {
        return this.getTagValue(doc, "destination-folder", "");
    },

    getMainEditors : function(doc) {
        var nl = doc.getElementsByTagName("main-editor-group");
        var ar = new Array();

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.nodeName == "editor-group-item") {
                    var item = this.createEditorData(curr);
                    if (item) {
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    createEditorData : function(editorItemNode) {
        var descr = null;
        var enabled = null;
        var path = null;
        var showAlways = true;
        var keyData = null;
        var cmdArgs = null;
        var usePortable = false;

        if (editorItemNode.hasChildNodes()) {
            var nl = editorItemNode.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;// && curr.hasChildNodes();

                if (!isValid) {
                    continue;
                }
                if (curr.nodeName == "description") {
                    descr = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "enabled") {
                    enabled = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "full-path") {
                    path = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "show-always") {
                    showAlways = curr.firstChild.nodeValue == "true";
                } else if (curr.nodeName == "key") {
                    keyData = ViewSourceWithKeyData.fromAttributes(curr.attributes);
                } else if (curr.nodeName == "cmd-args") {
                    cmdArgs = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "use-portable") {
                    usePortable = curr.firstChild.nodeValue == "true";
                }
            }
        }

        if (descr == null || enabled == null || path == null) {
            return null;
        }
        var data = new ViewSourceEditorData(enabled, descr, path, showAlways);

        data.keyData = keyData;
        if (cmdArgs != null) {
            data.cmdArgs = cmdArgs;
        }
        data.usePortable = usePortable;

        return data;
    },

    // quick and dirty
    savePrefs : function() {
        var charset = "UTF-8";
        var str = "";

        str += '<?xml version="1.0" encoding="' + charset + '"?>\n';
        str += '<view-source-with version="1.2">\n';
        str += '    <default-item-index>' + this._editorDefaultIndex + '</default-item-index>\n';
        str += '    <show-frame-warning>' + this._showFrameWarning + '</show-frame-warning>\n';
        str += '    <save-method>'        + this._saveMethod + '</save-method>\n';
        str += '    <replace-native-editor>' + this._replaceNativeEditor + '</replace-native-editor>\n';
        str += '    <open-focus-win>'     + this._openFocusWin + '</open-focus-win>\n';
        str += '    <open-image-on-link>'     + this._openImageOnLink + '</open-image-on-link>\n';
        str += '    <native-image-editor-index>'     + this._nativeImageEditorIndex + '</native-image-editor-index>\n';
        str += '    <replace-jsconsole-editor>'     + this._replaceJSConsole + '</replace-jsconsole-editor>\n';
        str += '    <allow-edit-text>'     + this._allowEditText + '</allow-edit-text>\n';
        str += '    <show-button-on-popup>' + this._showButtonOnPopup + '</show-button-on-popup>\n';

        str += '    <default-editor-key>\n';
        str += '        ' + ViewSourceWithKeyData.toXml(this._defaultShortcutKey) + '\n';
        str += '    </default-editor-key>\n';

        str += '    <show-resources-menu>'     + this._showResourcesMenu + '</show-resources-menu>\n';
        str += '    <show-quick-frame-menu>'     + this._showQuickFrame + '</show-quick-frame-menu>\n';

        str += '\n';
        str += '    <view-icons>'     + this._viewShowMenuIcon + '</view-icons>\n';
        str += '\n';

        str += '\n';
        str += '    <destination-info>\n';
        str += '        <destination-folder><![CDATA[' + this._destFolder + ']]></destination-folder>\n';
        str += '        <destination-clear-at-exit>' + this._tempClearAtExit + '</destination-clear-at-exit>\n';
        str += '        <destination-max-files-with-same-name>' + this._tempMaxFilesSamePrefix + '</destination-max-files-with-same-name>\n';
        str += '        <destination-use-os-path>' + this._tempUseOSPath + '</destination-use-os-path>\n';

        str += '    </destination-info>\n';
        str += '\n';

        str += '    <main-editor-group>\n';
        str += '        <editor-group-name>main</editor-group-name>\n';
        for (var i = 0; i < this.editorData.length; i++) {
            var curr = this.editorData[i];
            var enabled = curr.isVisible ? "true" : "false";

            str += '        <editor-group-item>\n';
            str += '            <description><![CDATA[' + curr.description + ']]></description>\n';

            str += '            <enabled>' + enabled + '</enabled>\n';
            str += '            <full-path><![CDATA[' + curr.path + ']]></full-path>\n';
            if (curr.keyData) {
                str += '            ' + ViewSourceWithKeyData.toXml(curr.keyData) + '\n';
            }
            str += '            <cmd-args><![CDATA[' + curr.cmdArgs + ']]></cmd-args>\n';
            str += '            <use-portable>' + curr.usePortable + '</use-portable>\n';

            str += '        </editor-group-item>\n';
        }
        str += '    </main-editor-group>\n';
        str += '\n';


        str += '    <url-mappers>\n';
        for (var i = 0; i < this.urlMapperData.length; i++) {
            var curr = this.urlMapperData[i];
            var enabled = curr.enabled ? "true" : "false";

            str += '        <url-mapper>\n';
            str += '            <name><![CDATA[' + curr.name + ']]></name>\n';
            str += '            <enabled>' + enabled + '</enabled>\n';
            str += '            <local-path><![CDATA[' + curr.localPath + ']]></local-path>\n';
            str += '            <domain-filter><![CDATA[' + curr.domainFilter + ']]></domain-filter>\n';
            str += '            <js-code><![CDATA[' + curr.jsCode + ']]></js-code>\n';
            str += '        </url-mapper>\n';
        }
        str += '    </url-mappers>\n';
        str += '\n';

        str += '    <file-extension-mappers>\n';
        for (var i = 0; i < this.fileExtensionMapper.length; i++) {
            var curr = this.fileExtensionMapper[i];

            str += '        <file-extension-mapper>\n';
            str += '            <domain-filter><![CDATA[' + curr.domainFilter + ']]></domain-filter>\n';
            str += '            <file-extension><![CDATA[' + curr.fileExtension + ']]></file-extension>\n';
            str += '        </file-extension-mapper>\n';
        }
        str += '    </file-extension-mappers>\n';
        str += '\n';

        str += '</view-source-with>\n';
        str += '\n';

        try {
            ViewSourceWithCommon.saveTextFile(this.configPath, str);

            // These params doesn't go on xml file
            // and must be written ALWAYS after file to ensure
            // data consistency
            this._prefBranch.setString(VSW_PREF_CONFIG_PATH, this._configPath);
            this._prefBranch.setBool(VSW_PREF_USE_PROFILE_PATH, this._useProfilePath);

            viewSourceWithFactory.resetPrefsInstance();
        } catch (err) {
            alert("ViewSourceWithPrefs.savePrefs " + err);
        }
    },

    get defaultFileName() {
        return "viewSource.xml";
    },

    get profilePath() {
        var profileDir = ViewSourceWithCommon.getProfileDir();
        profileDir.append(this.defaultFileName);

        return profileDir.path;
    },

    get visibleEditorIndexes() {
        if (!this._visibleEditorIndexes) {
            this._visibleEditorIndexes = new Array();

            for (var i = 0, j = this.editorData.length; i < j; i++) {
                if (i != this.editorDefaultIndex && this.editorData[i].isVisible) {
                    this._visibleEditorIndexes.push(i);
                }
            }
        }

        return this._visibleEditorIndexes;
    },

    isDefaultEditorValid : function() {
        return this.isEditorIndexValid(this._editorDefaultIndex);
    },

    isEditorIndexValid : function(index) {
        return this._editorData.length > 0
                && (0 <= index && index < this._editorData.length);
    },

    getUrlMappers : function(doc) {
        var nl = doc.getElementsByTagName("url-mappers");
        var ar = new Array();

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.nodeName == "url-mapper") {
                    var item = this.createUrlMapperData(curr);
                    if (item) {
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    createUrlMapperData : function(urlMapperNode) {
        var name = "";
        var domainFilter = "";
        var localPath = "";
        var enabled = true;
        var jsCode = "";

        if (urlMapperNode.hasChildNodes()) {
            var nl = urlMapperNode.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;// && curr.hasChildNodes();

                if (!isValid) {
                    continue;
                }
                if (curr.nodeName == "name") {
                    name = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "domain-filter") {
                    domainFilter = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "local-path") {
                    localPath = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "enabled") {
                    enabled = curr.firstChild.nodeValue == "true";
                } else if (curr.nodeName == "js-code") {
                    jsCode = curr.firstChild.nodeValue;
                }
            }
        }

        if (name == null || domainFilter == null || localPath == null) {
            return null;
        }
        var data = new ViewSourceUrlMapperData();
        data.name = name;
        data.domainFilter = domainFilter;
        data.localPath = localPath;
        data.enabled = enabled;
        data.jsCode = jsCode;

        return data;
    },

    getFileExtensionMapper : function(doc) {
        var nl = doc.getElementsByTagName("file-extension-mappers");
        var ar = new Array();

        if (nl && nl.item(0) && nl.item(0).hasChildNodes()) {
            nl = nl.item(0).childNodes;
            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);
                var isValid = curr.nodeType == Node.ELEMENT_NODE;

                if (isValid && curr.nodeName == "file-extension-mapper") {
                    var item = this.createFileExtensionMapper(curr);
                    if (item) {
                        ar.push(item);
                    }
                }
            }
        }
        return ar;
    },

    createFileExtensionMapper : function(fileExtensionMapper) {
        var domainFilter = "";
        var fileExtension = "";

        if (fileExtensionMapper.hasChildNodes()) {
            var nl = fileExtensionMapper.childNodes;

            for (var i = 0; i < nl.length; i++) {
                var curr = nl.item(i);

                var isValid = curr.nodeType == Node.ELEMENT_NODE;// && curr.hasChildNodes();

                if (!isValid) {
                    continue;
                }
                if (curr.nodeName == "file-extension") {
                    fileExtension = curr.firstChild.nodeValue;
                } else if (curr.nodeName == "domain-filter") {
                    domainFilter = curr.firstChild.nodeValue;
                }
            }
        }

        if (fileExtension == null || domainFilter == null) {
            return null;
        }
        var data = {};
        data.domainFilter = domainFilter;
        data.fileExtension = fileExtension;

        return data;
    },

    newDefaultEditorKeyData : function() {
        var keyData = new ViewSourceWithKeyData();
        keyData.key = "U".charCodeAt(0);
        keyData.accel = true;
        keyData.shift = true;

        return keyData;
    },

    migratePrefs : function() {
        var oldPrefBranch = new ViewSourceWithPrefBranchHelper(Components
            .classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("dafi.viewsource."));

        if (oldPrefBranch._prefBranch.prefHasUserValue(VSW_PREF_CONFIG_PATH)) {
            this._prefBranch.setString(VSW_PREF_CONFIG_PATH,
                oldPrefBranch.getString(VSW_PREF_CONFIG_PATH));
            oldPrefBranch._prefBranch.clearUserPref(VSW_PREF_CONFIG_PATH);
        }

        if (oldPrefBranch._prefBranch.prefHasUserValue(VSW_PREF_USE_PROFILE_PATH)) {
            this._prefBranch.setBool(VSW_PREF_USE_PROFILE_PATH,
                oldPrefBranch.getBool(VSW_PREF_USE_PROFILE_PATH));
            oldPrefBranch._prefBranch.clearUserPref(VSW_PREF_USE_PROFILE_PATH);
        }

        if (oldPrefBranch._prefBranch.prefHasUserValue(VSW_PREF_TOOLBAR_ICON_ADDED)) {
            this._prefBranch.setBool(VSW_PREF_TOOLBAR_ICON_ADDED,
                oldPrefBranch.getBool(VSW_PREF_TOOLBAR_ICON_ADDED));
            oldPrefBranch._prefBranch.clearUserPref(VSW_PREF_TOOLBAR_ICON_ADDED);
        }
    },

    get openBkgImage() {
        return this._prefBranch.getBool(VSW_PREF_OPEN_BKG_IMAGE, false);
    }
};

function ViewSourceWithPrefBranchHelper(prefBranch) {
    this._prefBranch = prefBranch;
}

ViewSourceWithPrefBranchHelper.prototype = {
    getString : function(prefName, defValue) {
        var prefValue;
        try {
            prefValue = this._prefBranch.getCharPref(prefName);
        } catch (ex) {
            prefValue = null;
        }
        if (prefValue != null) {
            prefValue = ViewSourceWithCommon.toUnicode(prefValue, "UTF-8", prefValue);
        }
        return prefValue == null ? defValue : prefValue;
    },

    setString : function(prefName, prefValue) {
        prefValue = ViewSourceWithCommon.fromUnicode(prefValue, "UTF-8", prefValue);
        this._prefBranch.setCharPref(prefName, prefValue);
    },

    getBool : function(prefName, defValue) {
        var prefValue = false;
        try {
            prefValue = this._prefBranch.getBoolPref(prefName);
        } catch (ex) {
            if (defValue != undefined) {
                prefValue = defValue;
            }
        }

        return prefValue;
    },

    setBool : function(prefName, prefValue) {
        this._prefBranch.setBoolPref(prefName, prefValue);
    }
}

