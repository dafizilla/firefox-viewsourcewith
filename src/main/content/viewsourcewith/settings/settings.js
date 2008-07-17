/**
 * Author: Davide Ficano
 * Date  : 22-Nov-04
 * Fix description  : 15-Jan-05
 */
var gViewSourceSettings = {
    onLoad : function() {
        gViewSourceSettings.prefs = new ViewSourceWithPrefs();
        try {
            gViewSourceSettings.prefs.readPrefs(null);
        } catch (err) {
            alert("Error while reading config file:\n" + err);
        }
        gViewSourceSettings.initControls();

        sizeToContent();
    },

    onAccept : function() {
        var isValid = false;
        var thiz = gViewSourceSettings;

        try {
            isValid = thiz.checkDestFolder()
                      && thiz.checkConfigPath();

            if (isValid) {
                thiz.prefs.destFolder = thiz.oDestFolder.value;
                if (!thiz.oUseProfilePath.checked) {
                    thiz.prefs.configPath = thiz.oConfigPath.value;
                }
                var treeView = thiz.oTreeEditor.view;

                if (!(0 <= treeView.defaultItem && treeView.defaultItem < treeView.items.length)) {
                    treeView.defaultItem = 0;
                }
                thiz.prefs.editorData = treeView.items;
                thiz.prefs.editorDefaultIndex = treeView.defaultItem;
                thiz.prefs.saveMethod = thiz.oSaveMethod.selectedItem.value;
                thiz.prefs.replaceNativeEditor = thiz.oReplaceNative.checked;
                thiz.prefs.openFocusWin = thiz.oOpenFocusWin.checked;
                thiz.prefs.useProfilePath = thiz.oUseProfilePath.checked;
                thiz.prefs.openImageOnLink = thiz.oOpenImageOnLink.selectedIndex == 0;
                thiz.prefs.tempClearAtExit = thiz.oTempClearAtExit.checked;
                thiz.prefs.tempUseOSPath = thiz.oTempUseOSPath.checked;

                thiz.prefs.viewShowMenuIcon = thiz.oViewShowMenuIcon.checked;

                thiz.prefs.nativeImageEditorIndex = thiz.oTreeEditor.view.imageEditorIdx;
                thiz.prefs.urlMapperData = thiz.oUrlMapperTree.view.items;

                thiz.prefs.showResourcesMenu = thiz.oViewShowResourcesMenu.checked;
                thiz.prefs.showQuickFrame = thiz.oViewQuickFrameShowMenu.checked;

                thiz.prefs.replaceJSConsole = thiz.oReplaceJSConsole.checked;
                thiz.prefs.allowEditText = thiz.oAllowEditText.checked;

                thiz.prefs.savePrefs();
                ViewSourceWithCommon.getObserverService()
                    .notifyObservers(null, "vsw:update-config", "");
            }
        } catch (err) {
            alert("viewsourcewithsettings.onAccept: " + err);
        }

        return isValid;
    },

    checkConfigPath : function() {
        var thiz = gViewSourceSettings;
        var isValid = false;

        try {
            var destFile = ViewSourceWithCommon.makeLocalFile(
                                gViewSourceSettings.oConfigPath.value);
            isValid = destFile.parent.isDirectory();
        } catch (err) {
            ViewSourceWithCommon.log(err);
        }

        if (!isValid) {
            alert(thiz.oConfigPath.pickTitle);
            thiz.oConfigPath.textbox.focus();
        }
        return isValid;
    },

    checkDestFolder : function() {
        var thiz = gViewSourceSettings;
        var isValid = false;

        try {
            var destFile = ViewSourceWithCommon.makeLocalFile(
                                gViewSourceSettings.oDestFolder.value);
            isValid = destFile.isDirectory();
        } catch (err) {
        }

        if (!isValid) {
            thiz.oTabBox.selectedIndex = 1;
            thiz.oDestFolder.textbox.focus();
            alert(ViewSourceWithCommon.getLocalizedMessage("err.invalidSourceFolder"));
        }
        return isValid;
    },

    initControls : function() {
        var thiz = gViewSourceSettings;

        thiz.oDestFolder = document.getElementById("destFolder");
        thiz.oTempUseOSPath = document.getElementById("tempUseOSPath");
        thiz.oConfigPath = document.getElementById("configPath");
        thiz.oTreeEditor = document.getElementById("vswTreeEditor");
        thiz.oSaveMethod = document.getElementById("saveMethod");
        thiz.oTabBox     = document.getElementById("vswTabBox");
        thiz.oReplaceNative = document.getElementById("replaceNativeEditor");
        thiz.oOpenFocusWin = document.getElementById("openFocusWindow");
        thiz.oUseProfilePath = document.getElementById("useProfilePath");
        thiz.oOpenImageOnLink = document.getElementById("openImageOnLink");
        thiz.oTempClearAtExit = document.getElementById("tempClearAtExit");

        thiz.oViewShowMenuIcon = document.getElementById("viewShowMenuIcon");
        thiz.oImageEditor = document.getElementById("imageViewList");

        thiz.oReplaceNative.addEventListener("CheckboxStateChange", thiz.toogleOpenWith, false);
        thiz.oUseProfilePath.addEventListener("CheckboxStateChange", thiz.disableConfigPath, false);
        thiz.oTempUseOSPath.addEventListener("CheckboxStateChange", thiz.disableTempPath, false);

        thiz.isImageGroupVisible = gViewSourceEditorHooker.isViewImageSupported(parent.document);
        if (thiz.isImageGroupVisible) {
            document.getElementById("imageGroupBox").removeAttribute("hidden");
        }

        thiz.oUrlMapperTree = document.getElementById("urlMapperTree");
        thiz.oViewShowResourcesMenu = document.getElementById("viewShowResourcesMenu");
        thiz.oViewQuickFrameShowMenu = document.getElementById("viewQuickFrameShowMenu");

        thiz.oReplaceJSConsole = document.getElementById("replaceJSConsole");
        thiz.oAllowEditText = document.getElementById("allowEditText");

        thiz.initValues(true);
    },

    newEditor : function() {
        var thiz = gViewSourceSettings;
        var item = new ViewSourceEditorData("T", "", "", true);

        window.openDialog("chrome://viewsourcewith/content/settings/chooseEditor.xul",
                          "_blank",
                          "chrome,modal,resizable=yes,dependent=yes",
                          item);
        if (item.path != "" && item.description != "") {
            thiz.oTreeEditor.view.insertItem(item);
            thiz.oTreeEditor.view.invalidate();
        }
    },

    editEditor : function(event) {
        var thiz = gViewSourceSettings;
        var selIdx = thiz.oTreeEditor.view.selection.currentIndex;

        if (selIdx < 0) {
            return;
        }
        window.openDialog("chrome://viewsourcewith/content/settings/chooseEditor.xul",
                          "_blank",
                          "chrome,modal,resizable=yes,dependent=yes",
                          thiz.oTreeEditor.view.items[selIdx]);
        thiz.oTreeEditor.view.invalidate();
    },

    deleteEditor : function() {
        var thiz = gViewSourceSettings;
        var view = thiz.oTreeEditor.view;
        var selIdx = view.selection.currentIndex;
        var showDeleteWarn = true;

        if (view.imageEditorIdx == selIdx) {
            if (!confirm(ViewSourceWithCommon.getLocalizedMessage("warning.delete.defaultImageEditor"))) {
                return;
            }
            showDeleteWarn = false;
            view.imageEditorIdx = -1;
        }
        if (showDeleteWarn) { // show warn only if imageEditor warn hasn't shown
            var msg = thiz.oTreeEditor.getAttribute("deleteitemmsg");
            msg = msg.replace(/%1/, view.items[selIdx].description);

            if (!confirm(msg)) {
                return;
            }
        }
        view.deleteSelectedItem();
        thiz.oTreeEditor.tree.focus();
    },

    onPickConfigPath : function(isOk, filePath) {
        var thiz = gViewSourceSettings;

        if (isOk) {
            try {
                thiz.prefs.readPrefs(filePath);
                thiz.initValues(false);
            } catch (err) {
                alert("Error while opening config file:\n" + err);
                return false;
            }
        }

        return true;
    },

    toogleOpenWith : function (event) {
        var thiz = gViewSourceSettings;

        var disabled = !thiz.oReplaceNative.checked;
        thiz.oOpenFocusWin.disabled = disabled;
    },

    initValues : function(changeProfilePath) {
        var thiz = gViewSourceSettings;

        thiz.oDestFolder.value = thiz.prefs.destFolder;
        thiz.oConfigPath.value = thiz.prefs.configPath;
        thiz.oSaveMethod.selectedIndex = thiz.prefs.saveMethod == "dom" ? 1 : 0;
        thiz.oReplaceNative.checked = thiz.prefs.replaceNativeEditor;
        thiz.oOpenFocusWin.checked = thiz.prefs.openFocusWin;
        if (changeProfilePath) {
            thiz.oUseProfilePath.checked = thiz.prefs.useProfilePath;
        }
        thiz.oOpenImageOnLink.selectedIndex = thiz.prefs.openImageOnLink ? 0 : 1;

        thiz.oTempClearAtExit.checked = thiz.prefs.tempClearAtExit;
        thiz.oTempUseOSPath.checked = thiz.prefs.tempUseOSPath;

        thiz.oViewShowMenuIcon.checked = thiz.prefs.viewShowMenuIcon;

        // http://www.xulplanet.com/tutorials/xultu/treeview.html
        // Complex example http://www.xulplanet.com/tutorials/xulqa/q_treebview.html
        thiz.oTreeEditor.view = new ViewSourceTreeView(thiz.prefs.editorData,
                                     thiz.prefs.editorDefaultIndex,
                                     thiz.prefs.nativeImageEditorIndex);
        thiz.oTreeEditor.view.selection.select(-1);

        thiz.oUrlMapperTree.view = new TreeViewUrlMapper(thiz.prefs.urlMapperData);
        thiz.oUrlMapperTree.view.selection.select(-1);

        thiz.oViewShowResourcesMenu.checked = thiz.prefs.showResourcesMenu;
        thiz.oViewQuickFrameShowMenu.checked = thiz.prefs.showQuickFrame;

        thiz.oReplaceJSConsole.checked = thiz.prefs.replaceJSConsole;
        thiz.oAllowEditText.checked =  thiz.prefs.allowEditText;
        document.getElementById("default-shortcut-key").value =
                thiz.prefs.defaultShortcutKey.keyToString();

    },

    disableConfigPath : function(event) {
        var thiz = gViewSourceSettings;

        var useProfile = thiz.oUseProfilePath.checked;
        thiz.oConfigPath.disabled = useProfile;
        thiz.oConfigPath.value = thiz.prefs.profilePath;
        if (useProfile) { // read from file only if checked
            try {
                thiz.prefs.readPrefs(thiz.oConfigPath.value);
                thiz.initValues(false);
            } catch (err) {
                alert("Error while reading config file:\n" + err);
            }
        }
    },

    disableTempPath : function(event) {
        var thiz = gViewSourceSettings;

        var useProfile = event.target.checked;
        thiz.oDestFolder.disabled = useProfile;
        thiz.prefs.tempUseOSPath = useProfile;
        thiz.oDestFolder.value = thiz.prefs.destFolder;
    },

    onSelectTab : function(selectedIndex) {
        var thiz = gViewSourceSettings;

        if (selectedIndex == 3) {
            if (!thiz.isImageGroupVisible) {
                return;
            }
            var popup = document.getElementById("imageViewListPopup");
            var children = popup.childNodes;
            var i;

            // The first menuitem isn't removed
            for (i = children.length - 1; i > 0; i--) {
                popup.removeChild(children[i]);
            }

            var editorData = thiz.oTreeEditor.view.items;
            var tmp = new Array();

            for (i = 0; i < editorData.length; i++) {
                var el = { index: i,
                           description: editorData[i].description
                         };
                tmp.push(el);
            }
            tmp.sort(thiz.alphanumCmp);

            // The index on sorted item
            var currIndex = 0;
            for (i = 0; i < tmp.length; i++) {
                if (tmp[i].index == thiz.oTreeEditor.view.imageEditorIdx) {
                    currIndex = i + 1;
                }

                var item = document.createElement("menuitem");

                item.setAttribute("label", tmp[i].description);
                item.setAttribute("value", tmp[i].index);

                popup.appendChild(item);
            }
            thiz.oImageEditor.selectedIndex = currIndex;
        }
    },

    alphanumCmp : function(a, b) {
        var al = a.description.toLowerCase();
        var bl = b.description.toLowerCase();

        if (al > bl) {return 1;}
        if (al < bl) {return -1;}
        return 0;
    },

    updateImageView : function(event) {
        var thiz = gViewSourceSettings;
        thiz.oTreeEditor.view.imageEditorIdx = thiz.oImageEditor.selectedItem.getAttribute("value");
    },

    newUrlMapper : function() {
        var thiz = gViewSourceSettings;
        var item = new ViewSourceUrlMapperData();

        window.openDialog("chrome://viewsourcewith/content/settings/urlmapper.xul",
                          "_blank",
                          "chrome,modal,resizable=yes,dependent=yes",
                          item);
        if (item.name != "") {
            thiz.oUrlMapperTree.view.insertItem(item);
            thiz.oUrlMapperTree.view.invalidate();
        }
    },

    editUrlMapper : function(event) {
        var thiz = gViewSourceSettings;
        var selIdx = thiz.oUrlMapperTree.view.selection.currentIndex;

        if (selIdx < 0) {
            return;
        }
        window.openDialog("chrome://viewsourcewith/content/settings/urlmapper.xul",
                          "_blank",
                          "chrome,modal,resizable=yes,dependent=yes",
                          thiz.oUrlMapperTree.view.items[selIdx]);
        thiz.oUrlMapperTree.view.invalidate();
    },

    deleteUrlMapper : function() {
        var thiz = gViewSourceSettings;
        var msg = thiz.oUrlMapperTree.getAttribute("deleteitemmsg");
        var selIdx = thiz.oUrlMapperTree.view.selection.currentIndex;

        msg = msg.replace(/%1/, thiz.oUrlMapperTree.view.items[selIdx].name);
        if (confirm(msg)) {
            thiz.oUrlMapperTree.view.deleteSelectedItem();
            thiz.oUrlMapperTree.focus();
        }
    },

    handleDefaultShortcutKey : function (event) {
        var thiz = gViewSourceSettings;

        try {
            event.preventDefault();
            event.stopPropagation();
            var edit = event.currentTarget;

            KeyData.fromEvent(event, thiz.prefs.defaultShortcutKey);
            edit.value = thiz.prefs.defaultShortcutKey.keyToString();
        } catch (err) {
            ViewSourceWithCommon.log(err);
        }
    },

    clearDefaultShortcutKey : function(event) {
        var thiz = gViewSourceSettings;

        thiz.prefs.defaultShortcutKey = thiz.prefs.newDefaultEditorKeyData();
        document.getElementById("default-shortcut-key").value =
            thiz.prefs.defaultShortcutKey.keyToString();
    }
};
