/**
 * Author   : Davide Ficano
 * Date     : 13-Mar-2005 Fixed context/view menu retrieving for Mozilla/Thunderbird
 *                        Added ability to save DOM document
 * Date     : 20-Mar-2005 Changed call to runProgram (Contributor Johannes Dollinger)
 *                        Added listener to saveURI to save correctly big pages
 * Date     : 30-Apr-2005 getFileName returns also host
 * Date     : 29-May-2005 getFileName moved to common and renamed getDocumentFileName
 * Date     : 17-Dec-2005 Under FF1.5 get cached copy for source
 * Date     : 11-Mar-2006 Open CSS and JS files
 * Date     : 15-Dec-2007 Toolbar icon reflects focused element
 */

var gViewSourceWithMain = {

    onLoad : function() {
        var thiz = gViewSourceWithMain;

        thiz.addListeners();
        thiz._linkInfo = new ViewSourceWithLinkInfo();
        thiz._inputText = ViewSourceWithInputText; // alias

        var obs = ViewSourceWithCommon.getObserverService();
        obs.addObserver(thiz, "vsw:update-config", false);
        thiz.init();
    },

    onUnLoad : function() {
        var thiz = gViewSourceWithMain;

        var obs = ViewSourceWithCommon.getObserverService();
        obs.removeObserver(thiz, "vsw:update-config");
        thiz.removeListeners();
    },

    initCtxMenu : function(event) {
        var thiz = gViewSourceWithMain;

        var doc = ViewSourceWithCommon.getDocumentFromContextMenu(false);
        thiz._linkInfo.init(doc, thiz.prefs);
        // CSS/JS must be taken from focused frame so we need to obtain it
        // calling getDocumentFromContextMenu with true
        var frameDoc = ViewSourceWithCommon.getDocumentFromContextMenu(true);
        thiz._resources = new Resources(frameDoc);

        gViewSourceWithMain.insertMenuItems(
                document.getElementById("viewsourcewithMenuPopup"),
                "viewPageFromCtxMenu", false, false);
        return true;
    },

    initCtxMenuFrame : function(event) {
        var thiz = gViewSourceWithMain;
        var frameMenu = document.getElementById("frame");
        var popup = document.getElementById("vswFramePopupMenu");
        var doc = gContextMenu.target.ownerDocument;

        gViewSourceWithMain._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new Resources(doc);

        // Create popup if it not already exists
        if (popup == null) {
            var menu = document.createElement("menu");
            var label = document.getElementById("viewsourcewithMenu")
                            .getAttribute("framelabel");
            menu.setAttribute("label", label);
            popup = document.createElement("menupopup");
            popup.setAttribute("id", "vswFramePopupMenu");
            menu.appendChild(popup);
            frameMenu.firstChild.appendChild(menu);
        }

        gViewSourceWithMain.insertMenuItems(popup, "viewPageFromCtxMenu", false, true);

        return true;
    },

    initCtxMenuQuickFrame : function(event) {
        var thiz = gViewSourceWithMain;
        var doc = gContextMenu.target.ownerDocument;

        gViewSourceWithMain._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new Resources(doc);

        gViewSourceWithMain.insertMenuItems(
                document.getElementById("vswMenuPopupQuickFrame"),
                "viewPageFromCtxMenu", false, true);

        return true;
    },

    initViewMenu : function(event) {
        var thiz = gViewSourceWithMain;

        var doc = ViewSourceWithCommon.getFocusedDocument();
        gViewSourceWithMain._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new Resources(doc);

        gViewSourceWithMain.insertMenuItems(event.target, "viewPageFromViewMenu",
                                            true, false);
        return true;
    },

    initCtxConsoleMenu : function(event) {
        var thiz = gViewSourceWithMain;

        thiz._resources = new Resources(null);
        thiz.insertMenuItems(event.target, "viewPageFromConsoleMenu",
                             true, false);
        return true;
    },

    viewPageFromCtxMenu : function(editorDataIdx, event) {
        gViewSourceWithMain.viewPage(gViewSourceWithMain._linkInfo.doc, editorDataIdx, event);
    },

    viewPageFromViewMenu : function(editorDataIdx, event) {
        var showFrameWarning = gViewSourceWithMain.prefs.showFrameWarning;

        if (showFrameWarning) {
            gViewSourceWithMain.openDlgWarning();
        }

        gViewSourceWithMain.viewPage(gViewSourceWithMain._linkInfo.doc, editorDataIdx, event);

    },

    viewPage : function(documentToSave, editorDataIdx, event) {
        try {
            var urlToSave       = gViewSourceWithMain._linkInfo.url;
            var filePath;
            var thiz            = gViewSourceWithMain;
            var editorData      = thiz.prefs.editorData[editorDataIdx];
            var saveDOM         = (thiz.prefs.saveMethod == "dom") != (event.shiftKey && !event.ctrlKey);

            if (editorData.path == "") {
                return;
            }

            if (thiz._linkInfo.isOnTextInput) {
                thiz._inputText.viewText(editorData, thiz._linkInfo);
            } else {
                // Local file can be saved as DOM documents
                if (!saveDOM && (filePath = ViewSourceWithCommon.getLocalFilePage(urlToSave)) != null) {
                    // view file without save it
                    ViewSourceEditorData.runEditor(editorData, [filePath.path]);
                } else {
                    var fileName;
                    if (thiz._linkInfo.isOnLinkOrImage) {
                        urlToSave = thiz._linkInfo.url;
                        fileName = ViewSourceWithCommon.getDocumentFileName(thiz._linkInfo.url);
                    } else {
                        fileName = ViewSourceWithCommon.getDocumentFileName(documentToSave);
                    }

                    var cleaner = ViewSourceWithTempCleaner.getTempCleaner();
                    var uniqueFilePath = ViewSourceWithCommon.initFileToRun(
                                        fileName,
                                        thiz.prefs.destFolder,
                                        thiz.prefs.tempMaxFilesSamePrefix,
                                        false,
                                        cleaner);
                    var saver = new ViewSourceWithSaver(editorData, uniqueFilePath);
                    var pageHandler = new VswServerPagesHandler();

                    if (pageHandler.matches(urlToSave, thiz.prefs.urlMapperData, 1, 1, editorData)) {
                        saver.openFileCallback = pageHandler;
                    }
                    if (saveDOM) {
                        saver.saveDocument(documentToSave);
                    } else {
                        saver.saveURI(urlToSave);
                    }
                }
            }
        } catch (err) {
            ViewSourceWithCommon.log("viewPage " + err);
            alert("viewPage: " + err);
        }
    },

    openDlgSettings : function() {
        // Javascript console requires browser.js and mailcore.js but when
        // they are declared in viewsourcewithOverlay.xul hang VSW. So we use
        // old way when settings is called from js console
        if (typeof(toOpenWindowByType) == "function") {
            toOpenWindowByType("vsw:settings",
                               "chrome://viewsourcewith/content/settings/settings.xul",
                               "chrome,resizable=yes,dependent=yes");
        } else {
            window.openDialog("chrome://viewsourcewith/content/settings/settings.xul",
                              "_blank",
                              "chrome,modal,resizable=yes,dependent=yes");
        }
    },

    openDlgWarning : function() {
        const nsIPromptSVC = Components.interfaces.nsIPromptService;
        var promptService = Components
                        .classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(nsIPromptSVC);
        var checkResult = { value : false };
        var rv = promptService.confirmEx(
            window,
            ViewSourceWithCommon.getLocalizedMessage("warning.title"),
            ViewSourceWithCommon.getLocalizedMessage("warningText.label"),
            (nsIPromptSVC.BUTTON_POS_0 * nsIPromptSVC.BUTTON_TITLE_IS_STRING)
            + nsIPromptSVC.BUTTON_POS_0_DEFAULT
            + nsIPromptSVC.BUTTON_DELAY_ENABLE,
            ViewSourceWithCommon.getLocalizedMessage("warning.button.enabled.label"),
            null,
            null,
            ViewSourceWithCommon.getLocalizedMessage("warning.disable.dialog.label"),
            checkResult);

        if (rv == 0 && checkResult.value) {
            gViewSourceWithMain.prefs.showFrameWarning = false;
            gViewSourceWithMain.prefs.savePrefs();
        }
    },

    openDlgResource : function() {
        window.openDialog("chrome://viewsourcewith/content/settings/resources.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes",
                          gViewSourceWithMain._resources,
                          gViewSourceWithMain.prefs);
    },

    insertMenuItems : function(menu, fnViewPage, hasShortCutKey, isFrame) {
        var thiz = gViewSourceWithMain;

        if (!menu || menu.hidden) {
            return;
        }

        if (hasShortCutKey == undefined) {
            hasShortCutKey = true;
        }
        try {
            thiz.removeMenuItems(menu);

            thiz.insertDefaultItemMenu(menu, fnViewPage, hasShortCutKey)

            var isNativeEditorVisible = thiz.prefs.replaceNativeEditor
                && !(thiz._linkInfo.isOnLinkOrImage || thiz._linkInfo.isOnTextInput);

            if (isNativeEditorVisible) {
                var nativeLabel = ViewSourceWithCommon.getLocalizedMessage("native.editor");
                var nativeItem = gViewSourceEditorHooker.getMenuItem(nativeLabel, isFrame);

                // Under JS Console nativeItem doesn't exists
                if (nativeItem) {
                    // Enable native item only if there is at least one message selected
                    nativeItem.setAttribute("observes", "cmd_vswEnabledEditor");
                    menu.appendChild(nativeItem);
                    isNativeEditorVisible = false;
                }
            }

            var hasDefault = thiz.prefs.isDefaultEditorValid();
            var hasCSSorJS = false;

            if (hasDefault) {
                hasCSSorJS = thiz.insertResourcesMenu(menu);
            }

            var hasVisibleItems = hasCSSorJS || isNativeEditorVisible || hasDefault;

            // add separator only if there is at least one editor visible
            if (hasVisibleItems) {
                menu.appendChild(document.createElement("menuseparator"));
            }

            var editorIndexes = thiz.prefs.visibleEditorIndexes;
            for (var i = 0, j = editorIndexes.length; i < j; i++) {
                thiz.insertEditorMenuItem(menu, editorIndexes[i], fnViewPage, hasShortCutKey);
            }

            if (editorIndexes.length > 0) {
                menu.appendChild(document.createElement("menuseparator"));
            }
            thiz.insertSettingsMenuItem(menu, !hasDefault);
        } catch (err) {
            ViewSourceWithCommon.log("insertMenuItems " + err);
        }
    },

    removeMenuItems : function(menu) {
        var children = menu.childNodes;

        for (var i = children.length - 1; i >= 0; i--) {
            menu.removeChild(children[i]);
        }
    },

    insertDefaultItemMenu : function(menu, fnViewPage, hasShortCutKey) {
        var thiz = gViewSourceWithMain;

        if (thiz.prefs.isDefaultEditorValid()) {
            var item = document.createElement("menuitem");

            item.setAttribute("label", thiz.prefs.editorData[thiz.prefs.editorDefaultIndex].description);

            // little hack to allow existing code to work when fnViewPage is not
            // defined in main namespace gViewSourceWithMain
            if (fnViewPage.indexOf(".") < 0) {
                fnViewPage = "gViewSourceWithMain." + fnViewPage;
            }
            item.setAttribute("oncommand",
                                fnViewPage + "(" + thiz.prefs.editorDefaultIndex + ", event);");
            item.setAttribute("id", "viewsourcewith-viewMenuItemDefault");
            // setting key after appendChild doesn't work
            if (hasShortCutKey) {
                item.setAttribute("key", "key_viewsourcewith");
                item.setAttribute("default", "true");
            }

            menu.appendChild(item);
        }
    },

    insertSettingsMenuItem : function(menu, hasShortCutKey) {
        var item = document.createElement("menuitem");

        item.setAttribute("label",
                ViewSourceWithCommon.getLocalizedMessage("menu.settings.label"));
        item.setAttribute("oncommand", "gViewSourceWithMain.openDlgSettings();");
        if (hasShortCutKey) {
            item.setAttribute("id", "viewsourcewith-viewMenuItemDefault");
            item.setAttribute("key", "key_viewsourcewith");
        }
        menu.appendChild(item);

        return item;
    },

    insertEditorMenuItem : function(menu, editorDataIdx, fnViewPage, hasShortCutKey) {
        var item = document.createElement("menuitem");
        var label = gViewSourceWithMain.prefs.editorData[editorDataIdx].description;

        item.setAttribute("id", "viewsourcewithEditor" + label);
        if (hasShortCutKey &&
            gViewSourceWithMain.prefs.editorData[editorDataIdx].keyData) {
            item.setAttribute("key", "viewsourcewithEditor" + label);
        }
        item.setAttribute("label", label);
        // little hack to allow existing code to work when fnViewPage is not
        // defined in main namespace gViewSourceWithMain
        if (fnViewPage.indexOf(".") < 0) {
            fnViewPage = "gViewSourceWithMain." + fnViewPage;
        }
        item.setAttribute("oncommand",
                            fnViewPage + "(" + editorDataIdx + ", event);");
        menu.appendChild(item);

        return item;
    },

    insertResourcesMenu : function(menu) {
        var thiz = gViewSourceWithMain;
        var res = thiz._resources;

        if (thiz.prefs.showResourcesMenu) {
            res.initStyleSheets();
            res.initScripts();
        }

        var hasCSSorJS = res.hasStyleSheets() || res.hasScripts();

        if (hasCSSorJS) {
            var styleLabel = "";
            var scriptLabel = "";

            if (res.hasFrameStyleSheets() || res.hasFrameScripts()) {
                styleLabel = res.styleSheets.length
                          + "/"
                          + res.allStyleSheets.length;
                scriptLabel = res.scripts.length
                          + "/"
                          + res.allScripts.length;
            } else {
                styleLabel = res.styleSheets.length;
                scriptLabel = res.scripts.length;
            }
            var label = ViewSourceWithCommon
                            .getLocalizedMessage("menu.resources.label");
            label = label.replace("%1", styleLabel).replace("%2", scriptLabel);

            var item = document.createElement("menuitem");
            item.setAttribute("label", label);
            item.setAttribute("oncommand",
                "gViewSourceWithMain.openDlgResource()");

            menu.appendChild(item);
        }

        return hasCSSorJS;
    },

    runEditor : function(event, editorIdx, openFocusedWindow, fnViewPage) {
        var thiz = gViewSourceWithMain;

        if (!thiz.prefs.isDefaultEditorValid()) {
            thiz.openDlgSettings();
        } else {
            if (typeof (fnViewPage) == "function") {
                fnViewPage(editorIdx, event);
                return true;
            }
            var focusedWindow = _content;
            if (typeof(openFocusedWindow) == "undefined" || openFocusedWindow == null) {
                openFocusedWindow = true;
            }

            if (openFocusedWindow) {
                focusedWindow = document.commandDispatcher.focusedWindow;
                // Don't get url from browser widgets (e.g. google bar, address bar)
                if (focusedWindow == window) {
                    focusedWindow = _content;
                }
            }
            gViewSourceWithMain._linkInfo.init(focusedWindow.document, thiz.prefs);

            thiz.viewPage(gViewSourceWithMain._linkInfo.doc, editorIdx, event);
        }
        return true;
    },

    observe : function(subject, topic, state) {
        var thiz = gViewSourceWithMain;

        if (topic == "vsw:update-config") {
            thiz.init();
        }
    },

    init : function() {
        var thiz = gViewSourceWithMain;

        thiz.prefs = ViewSourceWithPrefs.getInstance();
        var cleaner = ViewSourceWithTempCleaner.getTempCleaner();
        cleaner.enabled = thiz.prefs.tempClearAtExit;

        thiz._inputText.prefs = thiz.prefs;
        thiz._linkInfo.prefs = thiz.prefs;

        gViewSourceEditorHooker.hookDefaultViewSource(gViewSourceWithMain.prefs);

        if (!document.getElementById("key_viewsourcewith")) {
            // I'm unable to make key_viewsourcewith working inside JS console
            // under FF prior 1.5
            return;
        }

        KeyData.setKeyTag(thiz.prefs.defaultShortcutKey,
                          document.getElementById("key_viewsourcewith"));

        var keyset = document.getElementById("key_viewsourcewith").parentNode;
        var cmdset = document.getElementById("cmd_runDefaultEditor").parentNode;

        thiz.removeChildrenByIdPrefix(keyset, "viewsourcewithEditor");
        thiz.removeChildrenByIdPrefix(cmdset, "cmd_viewsourcewithEditor");

        var editorIndexes = thiz.prefs.visibleEditorIndexes;
        for (var i = 0, j = editorIndexes.length; i < j; i++) {
            var editor = thiz.prefs.editorData[editorIndexes[i]];

            if (editor.keyData) {
                var keyId = "viewsourcewithEditor" + editor.description;
                var cmdId = "cmd_viewsourcewithEditor" + editor.description;

                var key = document.createElement("key");
                key.setAttribute("id", keyId);
                KeyData.setKeyTag(editor.keyData, key);
                key.setAttribute("command", cmdId);
                keyset.appendChild(key);

                var cmd = document.createElement("command");
                cmd.setAttribute("id", cmdId);
                cmd.setAttribute("oncommand",
                        "gViewSourceWithMain.runEditor(event, "
                        + editorIndexes[i]
                        + ", gViewSourceWithMain.prefs.openFocusWin);");
                cmdset.appendChild(cmd);
            }
        }

        var buttonAdded = viewSourceWithFactory.getSharedValue("toolbarIconAdded", false);
        if (buttonAdded) {
            thiz.prefs.toolbarIconAdded = true;
        } else {
            viewSourceWithFactory.setSharedValue("toolbarIconAdded", true);
            // Add button only if toolbarIconAdded doesn't exist
            // otherwise the message appear at every new window open
            thiz.addToolButton();
        }
        // Ensure the toolbar icon reflects the "show textbox" setting
        thiz.updateFocused();
    },

    addToolButton : function() {
        var thiz = gViewSourceWithMain;

        try {
            // return false on SeaMonkey
            if (!ViewSourceWithCommon.isToolbarCustomizable()) {
                return;
            }
            if (ViewSourceWithCommon.isToolbarButtonAlreadyPresent("viewsourcewith-button")) {
                thiz.prefs.toolbarIconAdded = true;
            } else {
                if (!thiz.prefs.isToolbarIconAdded) {
                    window.setTimeout("gViewSourceWithMain.installPrompt()", 100);
                }
            }
        } catch(ex) {
            ViewSourceWithCommon.log("addToolButton: " + ex);
        }
    },

    installPrompt : function() {
        try {
            const nsIPromptSVC = Components.interfaces.nsIPromptService;
            var promptService = Components
                            .classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(nsIPromptSVC);
            var checkResult = { value : 0 };
            var rv = promptService.confirmEx(
                window,
                "ViewSourceWith",
                ViewSourceWithCommon.getLocalizedMessage("toolbarbutton.prompt"),
                  (nsIPromptSVC.BUTTON_POS_0 * nsIPromptSVC.BUTTON_TITLE_YES)
                + (nsIPromptSVC.BUTTON_POS_1 * nsIPromptSVC.BUTTON_TITLE_NO)
                + nsIPromptSVC.BUTTON_POS_0_DEFAULT,
                null,
                null,
                null,
                null,
                checkResult);

            if (rv == 0) {
                ViewSourceWithCommon.addToolbarButton("viewsourcewith-button");
            }
            // Don't ask any more
            gViewSourceWithMain.prefs.toolbarIconAdded = true;
        } catch (err) {
            ViewSourceWithCommon.log("Error during installPrompt " + err);
        }
    },

    removeChildrenByIdPrefix : function(node, idPrefix) {
        var children = node.childNodes;

        for (var i = children.length - 1; i >= 0; i--) {
            if (children[i].getAttribute("id").indexOf(idPrefix) == 0) {
                node.removeChild(children[i]);
            }
        }
    },

    addListeners : function() {
        var thiz = gViewSourceWithMain;
        // Under firefox frame menupopup hasn't an id to overlay
        // so I use this workaround. Mozilla has a valid frame menupopup id
        var frameMenu = document.getElementById("frame");
        if (frameMenu) {
            frameMenu.addEventListener("popupshowing", thiz.initCtxMenuFrame, false);
        }

        var ctxMenus = ["contentAreaContextMenu",
                        "messagePaneContext",
                        "editorContentContext"];
        for (var i in ctxMenus) {
            var n = document.getElementById(ctxMenus[i]);
            if (n) {
                n.addEventListener("popupshowing", thiz.onPopupShowingContextMenu, false);
                n.addEventListener("popuphidden", thiz.onPopupHiddenContextMenu, false);
            }
        }

        var console = document.getElementById("ConsoleBox");
        if (console) {
            console.addEventListener("click", thiz.onClickConsole, true);
        }
    },

    onClickConsole : function(event) {
        var thiz = gViewSourceWithMain;

        if (!thiz.prefs.replaceJSConsole) {
            return;
        }
        var target = event.originalTarget.parentNode;

        if (thiz.prefs.isDefaultEditorValid()
            && target
            && (target.hasAttribute("url") || target.hasAttribute("href"))) {
            event.preventDefault();
            event.stopPropagation();
            thiz.viewPageFromConsoleMenu(thiz.prefs.editorDefaultIndex, event);
        }
    },

    removeListeners : function() {
        var thiz = gViewSourceWithMain;
        // Under firefox frame menupopup hasn't an id to overlay
        // so I use this workaround. Mozilla has a valid frame menupopup id
        var frameMenu = document.getElementById("frame");
        if (frameMenu) {
            frameMenu.removeEventListener("popupshowing", thiz.initCtxMenuFrame, false);
        }

        var ctxMenus = ["contentAreaContextMenu",
                        "messagePaneContext",
                        "editorContentContext"];
        for (var i in ctxMenus) {
            var n = document.getElementById(ctxMenus[i]);
            if (n) {
                n.removeEventListener("popupshowing", thiz.onPopupShowingContextMenu, false);
                n.removeEventListener("popuphidden", thiz.onPopupHiddenContextMenu, false);
            }
        }
    },

    onPopupShowingContextMenu : function(event) {
        if (event.target == this) {
            var thiz = gViewSourceWithMain;
            var info = thiz._linkInfo;

            info.init(window._content.document, thiz.prefs);

            var vswMenu = document.getElementById("viewsourcewithMenu");

            if (info.image) {
                vswMenu.setAttribute("image", info.image);
                vswMenu.setAttribute("class", "menu-iconic");
            } else {
                vswMenu.removeAttribute("image");
                vswMenu.removeAttribute("class");
            }

            if (info.isOnImage) {
                gViewSourceEditorHooker.hookImageViewSource(thiz.prefs);
            }

            var vswMenuQuickFrame = document.getElementById("vswMenuQuickFrame");
            if (thiz.prefs.showQuickFrame && gContextMenu && gContextMenu.inFrame) {
                vswMenuQuickFrame.removeAttribute("hidden");
            } else {
                vswMenuQuickFrame.setAttribute("hidden", "true");
            }

            // Change context menu item label
            gViewSourceWithMain.changeMenuLabel(vswMenu, info.isOnTextInput, info);
        }
        return true;
    },

    onPopupHiddenContextMenu : function(event) {
        if (event.target == this) {
            gViewSourceWithMain._linkInfo.reset();
        }
    },

    viewPageFromConsoleMenu : function(editorDataIdx, event) {
        var gConsole = document.getElementById("ConsoleBox");

        if (!gConsole) {
            return;
        }

        var selectedItem = gConsole.selectedItem;
        var url;
        if (selectedItem.hasAttribute("url")) { // Prior 1.5 and SeaMonkey
            url = selectedItem.getAttribute("url");
        } else if (selectedItem.hasAttribute("href")) {
            url = selectedItem.getAttribute("href");
        } else {
            return;
        }

        var thiz = gViewSourceWithMain;
        var urls = new Array();
        var fileNames = new Array();
        var cleaner = ViewSourceWithTempCleaner.getTempCleaner();

        var fileName = ViewSourceWithCommon.getDocumentFileName(url);
        var filePath = ViewSourceWithCommon.initFileToRun(
                            unescape(fileName),
                            thiz.prefs.destFolder,
                            thiz.prefs.tempMaxFilesSamePrefix,
                            true,
                            cleaner);

        urls.push(url);
        fileNames.push(filePath);

        var saver = new UrlDownloader();
        saver.callbackObject = { editorData : thiz.prefs.editorData[editorDataIdx],
                                 line : selectedItem.getAttribute("line"),
                                 col : selectedItem.getAttribute("col"),
                                 urlMapperData : thiz.prefs.urlMapperData};
        saver.onFinish = thiz.onFinishRunEditor;
        saver.saveURIList(urls, fileNames);
    },

    onFinishRunEditor : function(urls, outFiles, callbackObject) {
        var pageHandler = new VswServerPagesHandler();
        pageHandler.runEditor(urls,
                              outFiles,
                              callbackObject.urlMapperData,
                              callbackObject.editorData,
                              callbackObject.line,
                              callbackObject.col);
    },

    updateFocused : function() {
        try {
            // When oncommandupdate calls this method the gViewSourceWithMain
            // isn't fully created so we skip processing
            if (gViewSourceWithMain._linkInfo) {
                var isFocusOnTextBox = gViewSourceWithMain._linkInfo.findFocusedTextView() != null;
                gViewSourceWithMain.changeToolbarImage(isFocusOnTextBox);
                gViewSourceWithMain.changeMenuLabel(
                    document.getElementById("viewsourcewith-viewMenu"),
                    isFocusOnTextBox);
            }
        } catch (err) {
            ViewSourceWithCommon.log("updateFocused err " + err);
        }
    },

    changeToolbarImage : function(isText) {
        var toolbar = document.getElementById("viewsourcewith-button")
                    || document.getElementById("button-viewsourcewith");

        if (toolbar) {
            if (isText) {
                toolbar.setAttribute("tooltiptext",
                    ViewSourceWithCommon.getLocalizedMessage("edittext.label"));
                toolbar.setAttribute("focusedtype", "text");
            } else {
                toolbar.setAttribute("tooltiptext",
                    ViewSourceWithCommon.getLocalizedMessage("viewsource.label"));
                toolbar.removeAttribute("focusedtype");
            }
        }
    },

    changeMenuLabel : function(menu, isOnTextBox, info) {
        if (!menu) {
            return;
        }
        var label = "viewsource.label";
        var accesskey = "viewsource.accesskey";
        if (isOnTextBox) {
            label = "edittext.label";
            accesskey = "edittext.accesskey";
        } else if (info) {
            if (info.isOnLinkOrImage) {
                if (info.isOnLink) {
                    if (info.isOnImage && gViewSourceWithMain.prefs.openImageOnLink) {
                        label = "viewsource.image.label";
                        accesskey = "viewsource.image.accesskey";
                    } else {
                        label = "viewsource.link.label";
                        accesskey = "viewsource.link.accesskey";
                    }
                } else {
                    label = "viewsource.image.label";
                    accesskey = "viewsource.image.accesskey";
                }
            } else if (info.isOnMedia) {
                label = "viewsource.media.label";
                accesskey = "viewsource.media.accesskey";
            }
        }

        menu.setAttribute("label", ViewSourceWithCommon.getLocalizedMessage(label));
        menu.setAttribute("accesskey", ViewSourceWithCommon.getLocalizedMessage(accesskey));
    },

    onPagehide : function(event) {
        gViewSourceWithMain.changeToolbarImage(false);
        gViewSourceWithMain.changeMenuLabel(
            document.getElementById("viewsourcewith-viewMenu"), false);
    }
};

function ViewSourceWithSaver(editorData, appFile) {
    this.editorData = editorData;
    this.appFile = appFile;
    this.openFileCallback = null;
}

ViewSourceWithSaver.prototype = {
    saveDocument : function(documentToSave) {
        // I don't know how to get DOM document from cache
        this.internalSaveDocument(documentToSave);
    },

    saveURI : function(urlToSave) {
        this.internalSaveURI(urlToSave);
    },

    onStateChange : function(webProgress, request, stateFlags, status) {
        const wpl = Components.interfaces.nsIWebProgressListener;
        var isLoadFinished = (stateFlags & wpl.STATE_STOP)
                             ;//&& (stateFlags & wpl.STATE_IS_NETWORK);

        try {
            if (isLoadFinished) {
                if (this.openFileCallback) {
                    try {
                        this.openFileCallback.onOpenFile(this.editorData,
                                                         this.appFile.path);
                    } catch (err) {
                        ViewSourceWithCommon.log(
                            "VSW: onStateChange error while executing JS code "
                            + err);
                    }
                } else {
                    ViewSourceEditorData.runEditor(this.editorData, [this.appFile.path]);
                }
            }
        } catch (err) {
            alert("Error while saving " + this.appFile.path + " more details on Error Console");
            ViewSourceWithCommon.log("ViewSourceWithSaver.onStateChange error " + err);
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

    internalSaveDocument : function(documentToSave) {
        const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
        var persist = ViewSourceWithCommon.makeWebBrowserPersist();

        persist.progressListener = this;
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                               | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                               | nsIWBP.PERSIST_FLAGS_NO_CONVERSION
                               | nsIWBP.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                               | nsIWBP.PERSIST_FLAGS_DONT_FIXUP_LINKS;
        var encodingFlags = nsIWBP.ENCODE_FLAGS_RAW;
        persist.saveDocument(documentToSave, this.appFile,
                             null, null, encodingFlags, 0);
    },

    internalSaveURI : function(urlToSave) {
        const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
        var persist = ViewSourceWithCommon.makeWebBrowserPersist();

        persist.progressListener = this;
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                               | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

        var referrer = ViewSourceWithBrowserHelper.getReferrer(document);

        var uri = ViewSourceWithCommon.makeURL(urlToSave);
        persist.saveURI(uri, null, referrer,
                        ViewSourceWithBrowserHelper.getPostData(),
                        null, this.appFile);
    },

    onStatusChange : function(webProgress, request, status, message) {},
    onLocationChange : function(webProgress, request, location) {},
    onProgressChange : function(webProgress, request,
                                curSelfProgress, maxSelfProgress,
                                curTotalProgress, maxTotalProgress) {},
    onSecurityChange : function(webProgress, request, state) {}
}

window.addEventListener("load", gViewSourceWithMain.onLoad, false);
window.addEventListener("unload", gViewSourceWithMain.onUnLoad, false);
window.addEventListener("pagehide", gViewSourceWithMain.onPagehide, false);

