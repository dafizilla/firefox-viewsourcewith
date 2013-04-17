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

Components.utils.import("resource://vsw/common.jsm");
Components.utils.import("resource://vsw/uninstaller.jsm");

var gViewSourceWithMain = {

    onLoad : function() {
        var thiz = gViewSourceWithMain;

        thiz.addListeners();
        thiz._linkInfo = new ViewSourceWithLinkInfo();

        var obs = ViewSourceWithCommon.getObserverService();
        obs.addObserver(thiz, "vsw:update-config", false);
        VSWRegisterUninstallerObserver();
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

        var doc = window.content.document;
        thiz._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new ViewSourceWithResources(doc);

        gViewSourceWithMain.insertMenuItems(
                document.getElementById("viewsourcewithMenuPopup"),
                thiz.viewPageFromCtxMenu, false, false);
        return true;
    },

    initCtxMenuFrame : function(event) {
        var thiz = gViewSourceWithMain;
        var frameMenu = document.getElementById("frame");
        var popup = document.getElementById("vswFramePopupMenu");
        var doc = gContextMenu.target.ownerDocument;

        gViewSourceWithMain._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new ViewSourceWithResources(doc);

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

        thiz.insertMenuItems(popup, thiz.viewPageFromCtxMenu, false, true);

        return true;
    },

    initCtxMenuQuickFrame : function(event) {
        var thiz = gViewSourceWithMain;
        var doc = gContextMenu.target.ownerDocument;

        // we must always open the frame document but linkInfo.init() can set infos
        // about elements under context menu (links, images) so it's necessary
        // to init object by hand
        thiz._linkInfo.reset();
        thiz._linkInfo.doc = doc;
        thiz._linkInfo.url = doc.location.href;
        thiz._linkInfo.prefs = thiz.prefs;

        thiz._resources = new ViewSourceWithResources(doc);
        thiz.insertMenuItems(
                document.getElementById("vswMenuPopupQuickFrame"),
                thiz.viewPageFromCtxMenu, false, true);

        return true;
    },

    initViewMenu : function(event) {
        var thiz = gViewSourceWithMain;

        var doc = window.content.document;
        gViewSourceWithMain._linkInfo.init(doc, thiz.prefs);
        thiz._resources = new ViewSourceWithResources(doc);

        var frameDoc = ViewSourceWithCommon.getFocusedDocument(document);
        thiz.insertMenuItems(event.target, thiz.viewPageFromViewMenu,
                                            true, false,
                                            doc == frameDoc ? null : frameDoc);

        return true;
    },

    initCtxConsoleMenu : function(event) {
        var thiz = gViewSourceWithMain;

        thiz._resources = new ViewSourceWithResources(null);
        thiz.insertMenuItems(event.target, thiz.viewPageFromConsoleMenu,
                             true, false);
        return true;
    },

    viewPageFromCtxMenu : function(editorDataIdx, event) {
        gViewSourceWithMain.viewPage(gViewSourceWithMain._linkInfo.doc, editorDataIdx, event);
    },

    viewPageFromViewMenu : function(editorDataIdx, event, frameDoc) {
        var showFrameWarning = gViewSourceWithMain.prefs.showFrameWarning;

        if (showFrameWarning) {
            gViewSourceWithMain.openDlgWarning();
        }
        if (frameDoc) {
            gViewSourceWithMain._linkInfo.init(frameDoc, gViewSourceWithMain.prefs);
        }
        gViewSourceWithMain.viewPage(gViewSourceWithMain._linkInfo.doc, editorDataIdx, event);

    },

    /**
     * View the DOM document source, an URL or edit a text box
     * @param documentToSave used if the DOM representation must be viewed
     * @param editorDataIdx the index relative to the editor array
     * @event the original event received by event handler calling this method
     * @returns true if view can be handled, false otherwise
     */
    viewDocumentOrURL : function(documentToSave, editorDataIdx, event) {
        var linkInfo = gViewSourceWithMain._linkInfo;
        var prefs = linkInfo.prefs;
        var editorData = prefs.editorData[editorDataIdx];

        if (linkInfo.isOnTextInput) {
            ViewSourceWithInputText.viewText(editorData, linkInfo);
            return true;
        }
        var filePath;
        var key = ViewSourceWithCommon.isMacOSX ? event.metaKey : event.ctrlKey;
        var saveDOM = documentToSave && ((prefs.saveMethod == "dom") != (event.shiftKey && !key));

        // Local files can be saved as DOM documents
        if (!saveDOM && (filePath = ViewSourceWithCommon.getLocalFilePage(linkInfo.url)) != null) {
            var pageHandler = new VswServerPagesHandler();
            // view file without save it
            pageHandler.runEditor([linkInfo.url], [filePath], prefs.urlMapperData, editorData);
            return true;
        }

        // save as DOM both local file and remote documents
        if (saveDOM) {
            var uniqueFilePath = ViewSourceWithCommon.initFileToRun(
                    ViewSourceWithCommon.getDocumentFileName(documentToSave),
                    prefs.destFolder,
                    prefs.tempMaxFilesSamePrefix,
                    false,
                    viewSourceWithFactory.getTempCleaner());
            var saver = new ViewSourceWithUrlDownloader();
            saver.callbackObject = { editorData : editorData,
                                     urlMapperData : prefs.urlMapperData};
            saver.onFinish = gViewSourceWithMain.onFinishRunEditor;

            saver.saveDocument(documentToSave, linkInfo.url, uniqueFilePath);
            return true;
        }

        if (linkInfo.isOnLinkOrImage || linkInfo.isOnMedia) {
            var uniqueFilePath = ViewSourceWithCommon.initFileToRun(
                    ViewSourceWithCommon.getDocumentFileName(linkInfo.url),
                    prefs.destFolder,
                    prefs.tempMaxFilesSamePrefix,
                    false,
                    viewSourceWithFactory.getTempCleaner());
            var saver = new ViewSourceWithUrlDownloader();
            saver.sourceWindow = documentToSave.defaultView ? documentToSave.defaultView : null;
            saver.callbackObject = { editorData : editorData,
                                     urlMapperData : prefs.urlMapperData};
            saver.onFinish = gViewSourceWithMain.onFinishRunEditor;

            saver.saveURIList([linkInfo.url], [uniqueFilePath]);
            return true;
        }

        return false;
    },

    viewPage : function(documentToSave, editorDataIdx, event) {
        try {
            if (gViewSourceWithMain.viewDocumentOrURL(documentToSave, editorDataIdx, event)) {
                return;
            }
            // get page from cache
            var prefs = gViewSourceWithMain.prefs;
            var editorData = prefs.editorData[editorDataIdx];
            var uniqueFilePath = ViewSourceWithCommon.initFileToRun(
                    ViewSourceWithCommon.getDocumentFileName(documentToSave),
                    prefs.destFolder,
                    prefs.tempMaxFilesSamePrefix,
                    false,
                    viewSourceWithFactory.getTempCleaner());
            var saver = new ViewSourceWithUrlDownloader();
            saver.callbackObject = { editorData : editorData,
                                     urlMapperData : prefs.urlMapperData};
            saver.onFinish = gViewSourceWithMain.onFinishRunEditor;

            saver.sourceWindow = documentToSave.defaultView ? documentToSave.defaultView : null;
            saver.saveURIFromCache(
                ViewSourceWithBrowserHelper.getPageDescriptor(documentToSave),
                gViewSourceWithMain._linkInfo.url,
                uniqueFilePath);
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

    openDlgResource : function(res) {
        window.openDialog("chrome://viewsourcewith/content/settings/resources.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes",
                          res ? res : gViewSourceWithMain._resources,
                          gViewSourceWithMain.prefs);
    },

    insertMenuItems : function(menu, fnViewPage, hasShortCutKey, isFrame, frameDoc) {
        var thiz = gViewSourceWithMain;

        if (!menu || menu.hidden) {
            return;
        }

        if (hasShortCutKey == undefined) {
            hasShortCutKey = true;
        }
        try {
            thiz.removeMenuItems(menu);

            // determine if we must add listener
            var alreadyInitialized = menu.getUserData('vswFnViewPage') != null;

            // set the function always
            menu.setUserData('vswFnViewPage', fnViewPage, null);
            if (!alreadyInitialized) {
                menu.addEventListener('command', function(event) {
                    var fnViewPage = event.currentTarget.getUserData('vswFnViewPage');
                    var editorIndex = event.target.getAttribute("vswEditorIdx");

                    if (editorIndex) {
                        fnViewPage(editorIndex, event);
                    }
                    event.stopPropagation();
                }, false);
            }

            thiz.insertDefaultMenuItem(menu, hasShortCutKey)

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
                hasCSSorJS = thiz.insertResourcesMenu(menu) != null;
            }

            if (frameDoc) {
                thiz.insertFrameMenu(menu, frameDoc);
            }
            var hasVisibleItems = hasCSSorJS || isNativeEditorVisible || hasDefault;

            // add separator only if there is at least one editor visible
            if (hasVisibleItems) {
                menu.appendChild(document.createElement("menuseparator"));
            }

            var editorIndexes = thiz.prefs.visibleEditorIndexes;
            for (var i = 0, j = editorIndexes.length; i < j; i++) {
                thiz.insertEditorMenuItem(menu, editorIndexes[i], hasShortCutKey);
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

    insertDefaultMenuItem : function(menu, hasShortCutKey) {
        var thiz = gViewSourceWithMain;

        if (thiz.prefs.isDefaultEditorValid()) {
            var item = document.createElement("menuitem");

            item.setAttribute("label", thiz.prefs.editorData[thiz.prefs.editorDefaultIndex].description);
            item.setAttribute("tooltiptext", thiz.prefs.editorData[thiz.prefs.editorDefaultIndex].description);
            item.setAttribute("id", "viewsourcewith-viewDefaultMenuItem");
            item.setAttribute("vswEditorIdx", thiz.prefs.editorDefaultIndex);
            
            // setting key after appendChild doesn't work
            if (hasShortCutKey) {
                item.setAttribute("key", "key_viewsourcewith");
                item.setAttribute("default", "true");
            }

            menu.appendChild(item);
            
            return item;
        }
        return null;
    },

    insertSettingsMenuItem : function(menu, hasShortCutKey) {
        var item = document.createElement("menuitem");

        item.setAttribute("label",
                ViewSourceWithCommon.getLocalizedMessage("menu.settings.label"));
        item.addEventListener('command', function(event) {
            gViewSourceWithMain.openDlgSettings();
            event.stopPropagation();
        }, false);
        if (hasShortCutKey) {
            item.setAttribute("id", "viewsourcewith-viewDefaultMenuItem");
            item.setAttribute("key", "key_viewsourcewith");
        }
        menu.appendChild(item);

        return item;
    },

    insertEditorMenuItem : function(menu, editorDataIdx, hasShortCutKey) {
        var item = document.createElement("menuitem");
        var label = gViewSourceWithMain.prefs.editorData[editorDataIdx].description;

        item.setAttribute("id", "viewsourcewithEditor" + label);
        if (hasShortCutKey &&
            gViewSourceWithMain.prefs.editorData[editorDataIdx].keyData) {
            item.setAttribute("key", "viewsourcewithEditor" + label);
        }
        item.setAttribute("label", label);
        item.setAttribute("tooltiptext", label);
        item.setAttribute("vswEditorIdx", editorDataIdx);
        menu.appendChild(item);

        return item;
    },

    insertResourcesMenu : function(menu, res) {
        var thiz = gViewSourceWithMain;
        res = res ? res : thiz._resources;

        if (thiz.prefs.showResourcesMenu) {
            res.init();
        }

        var htmlLabel = 'HTML(%1)';
        var cssLabel = 'CSS(%1)';
        var jsLabel = 'JS(%1)';

        var labelArr = [];
        var count;
        if (res.resFrames.length > 0) {
            // add root document to count
            labelArr.push(htmlLabel.replace('%1', res.resFrames.length + 1));
        }
        count = res.styleSheets.length + res.allStyleSheets.length;
        if (count > 0) {
            labelArr.push(cssLabel.replace('%1', count));
        }
        count = res.scripts.length + res.allScripts.length;
        if (count > 0) {
            labelArr.push(jsLabel.replace('%1', count));
        }
        if (labelArr.length) {
            var label = labelArr.join(',') + '...';
            var item = document.createElement("menuitem");
            item.setAttribute("label", label);
            item.addEventListener('command', function(event) {
                if (this.hasAttribute('vswResFrameIndex')) {
                    var resFrameIndex = this.getAttribute('vswResFrameIndex');
                    gViewSourceWithMain.openDlgResource(gViewSourceWithMain._resources.resFrames[resFrameIndex]);
                } else {
                    gViewSourceWithMain.openDlgResource();
                }
                event.stopPropagation();
            }, false);

            menu.appendChild(item);
            
            return item;
        }

        return null;
    },

    insertFrameMenu : function(menu, frameDoc) {
        var thiz = gViewSourceWithMain;

        thiz._resources.init();

        var resFrameIndex = -1;
        for (var i = 0; i < thiz._resources.resFrames.length; i++) {
            var resFrame = thiz._resources.resFrames[i];
            if (resFrame.doc == frameDoc) {
                resFrameIndex = i;
                break;
            }
        }
        var focusedFramePopup = document.createElement('menupopup');
        focusedFramePopup.addEventListener('command', function(event) {
            if (event.target.getAttribute("vswEditorIdx")) {
                gViewSourceWithMain.viewPageFromViewMenu(event.target.getAttribute("vswEditorIdx"),
                                                         event,
                                                         gViewSourceWithMain._resources.resFrames[resFrameIndex].doc);
            }
            event.stopPropagation();
        }, false);


        thiz.insertDefaultMenuItem(focusedFramePopup, false);

        if (resFrameIndex >= 0 && thiz.prefs.showResourcesMenu) {
            var resMenu = thiz.insertResourcesMenu(focusedFramePopup, gViewSourceWithMain._resources.resFrames[resFrameIndex]);
            if (resMenu) {
                resMenu.setAttribute('vswResFrameIndex', resFrameIndex);
            }
        }
        var editorIndexes = thiz.prefs.visibleEditorIndexes;
        if (editorIndexes.length) {
            focusedFramePopup.appendChild(document.createElement('menuseparator'));
        }

        for (var i = 0, j = editorIndexes.length; i < j; i++) {
            var editorDataIdx = editorIndexes[i];
            thiz.insertEditorMenuItem(focusedFramePopup, editorDataIdx, false);
        }
        var frameMenu = document.createElement('menu');
        frameMenu.setAttribute('label', ViewSourceWithCommon.getLocalizedMessage("focused.frame.label"));
        if (resFrameIndex >= 0) {
            frameMenu.setAttribute('vswHighlight', gViewSourceWithMain._resources.resFrames[resFrameIndex].doc.body.style.border);
            frameMenu.addEventListener('mouseover', function(event) {
                gViewSourceWithMain._resources.resFrames[resFrameIndex].doc.body.style.border = "3px solid blue";
            }, false);
            frameMenu.addEventListener('mouseout', function(event) {
                gViewSourceWithMain._resources.resFrames[resFrameIndex].doc.body.style.border = this.getAttribute("vswHighlight");
            }, false);
        }
        frameMenu.appendChild(focusedFramePopup);
        menu.appendChild(frameMenu);
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

        thiz.prefs = viewSourceWithFactory.getPrefsInstance();
        var cleaner = viewSourceWithFactory.getTempCleaner();
        cleaner.enabled = thiz.prefs.tempClearAtExit;

        thiz._linkInfo.prefs = thiz.prefs;

        gViewSourceEditorHooker.hookDefaultViewSource(gViewSourceWithMain.prefs);

        if (!document.getElementById("key_viewsourcewith")) {
            // I'm unable to make key_viewsourcewith working inside JS console
            // under FF prior 1.5
            return;
        }

        ViewSourceWithKeyData.setKeyTag(thiz.prefs.defaultShortcutKey,
                          document.getElementById("key_viewsourcewith"));

        var keyset = document.getElementById("key_viewsourcewith").parentNode;
        var cmdset = document.getElementById("cmd_vswRunDefaultEditor").parentNode;

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
                ViewSourceWithKeyData.setKeyTag(editor.keyData, key);
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

        thiz.adjustToolbarButtonStyle(document.getElementById("viewsourcewith-button"));

        // Ensure the toolbar icon reflects the "show textbox" setting
        thiz.updateFocused();
    },

    adjustToolbarButtonStyle : function (button) {
        if (button) {
            var buttonClass = "chromeclass-toolbar-additional";

            if (gViewSourceWithMain.prefs.showButtonOnPopup) {
                ViewSourceWithCommon.removeClass(button, buttonClass);
            } else {
                ViewSourceWithCommon.addClass(button, buttonClass);
            }
        }
    },

    addToolButton : function() {
        var thiz = gViewSourceWithMain;

        try {
            // return false on SeaMonkey
            if (!ViewSourceWithCommon.isToolbarCustomizable(document)) {
                return;
            }
            if (ViewSourceWithCommon.isToolbarButtonAlreadyPresent(document, "viewsourcewith-button")) {
                thiz.prefs.toolbarIconAdded = true;
            } else {
                if (!thiz.prefs.isToolbarIconAdded) {
                    window.setTimeout(function() {
                        gViewSourceWithMain.installPrompt();
                    }, 100);
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
                ViewSourceWithCommon.addToolbarButton(document, "viewsourcewith-button");
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

        var ctxMenus = ["contentAreaContextMenu",   // FF
                        "messagePaneContext",       // TB 2.x
                        "editorContentContext",     // TB 2.x/3.x mail editor
                        "mailContext"];             // TB 3.x
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
        var ctxMenu = document.getElementById("ConsoleContext");
        if (ctxMenu) {
            ctxMenu.addEventListener("popupshowing", thiz.onPopupShowingConsole, true);
        }
    },

    onPopupShowingConsole : function(event) {
        var console = document.getElementById("ConsoleBox");
        var selectedItem = console.selectedItem;
        // the url attr is used prior FF 1.5 and on SeaMonkey
        var hasUrl = selectedItem
                    && (selectedItem.getAttribute("url") ||
                        selectedItem.getAttribute("href"));
        var vswConsole = document.getElementById("vswConsole");
        // Error Console2 sets url to chrome://
        if (hasUrl && hasUrl != "chrome://") {
            vswConsole.removeAttribute("hidden");
        } else {
            vswConsole.setAttribute("hidden", "true");
        }
    },

    onClickConsole : function(event) {
        if (event.button == 2) {// ignore right click
            return;
        }
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

        var ctxMenus = ["contentAreaContextMenu",   // FF
                        "messagePaneContext",       // TB 2.x
                        "editorContentContext",     // TB 2.x/3.x mail editor
                        "mailContext"];             // TB 3.x
        for (var i in ctxMenus) {
            var n = document.getElementById(ctxMenus[i]);
            if (n) {
                n.removeEventListener("popupshowing", thiz.onPopupShowingContextMenu, false);
                n.removeEventListener("popuphidden", thiz.onPopupHiddenContextMenu, false);
            }
        }
        var console = document.getElementById("ConsoleBox");
        if (console) {
            console.removeEventListener("click", thiz.onClickConsole, true);
        }
        var ctxMenu = document.getElementById("ConsoleContext");
        if (ctxMenu) {
            ctxMenu.removeEventListener("popupshowing", thiz.onPopupShowingConsole, true);
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
            if (vswMenuQuickFrame) {
                if (thiz.prefs.showQuickFrame && gContextMenu && gContextMenu.inFrame) {
                    vswMenuQuickFrame.removeAttribute("hidden");
                } else {
                    vswMenuQuickFrame.setAttribute("hidden", "true");
                }
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
        var cleaner = viewSourceWithFactory.getTempCleaner();

        // local files must be read from their original disk position
        var filePath = ViewSourceWithCommon.getLocalFilePage(url);
        if (!filePath) {
            var fileName = ViewSourceWithCommon.getDocumentFileName(url);
            var filePath = ViewSourceWithCommon.initFileToRun(
                                unescape(fileName),
                                thiz.prefs.destFolder,
                                thiz.prefs.tempMaxFilesSamePrefix,
                                true,
                                cleaner);
        }

        urls.push(url);
        fileNames.push(filePath);

        var saver = new ViewSourceWithUrlDownloader();
        saver.callbackObject = { editorData : thiz.prefs.editorData[editorDataIdx],
                                 line : selectedItem.getAttribute("line"),
                                 col : selectedItem.getAttribute("col"),
                                 urlMapperData : thiz.prefs.urlMapperData};
        saver.onFinish = thiz.onFinishRunEditor;
        saver.sourceWindow = document.defaultView ? document.defaultView : null;
        saver.saveURIList(urls, fileNames);
    },

    onFinishRunEditor : function(urls, outFiles, callbackObject) {
        var pageHandler = new VswServerPagesHandler();
        var line = typeof(callbackObject.line) == 'undefined' ? -1 : callbackObject.line;
        var col = typeof(callbackObject.col) == 'undefined' ? -1 : callbackObject.col;
        pageHandler.runEditor(urls,
                              outFiles,
                              callbackObject.urlMapperData,
                              callbackObject.editorData,
                              line,
                              col);
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

window.addEventListener("load", gViewSourceWithMain.onLoad, false);
window.addEventListener("unload", gViewSourceWithMain.onUnLoad, false);
window.addEventListener("pagehide", gViewSourceWithMain.onPagehide, false);

