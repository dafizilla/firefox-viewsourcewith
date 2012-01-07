/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Initial Developer of the Original Code is
# Davide Ficano.
# Portions created by the Initial Developer are Copyright (C) 2008
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Davide Ficano <davide.ficano@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/
Components.utils.import("resource://vsw/common.jsm");

var gViewSourceWithMessenger = {
    onLoad : function() {
        var obs = ViewSourceWithCommon.getObserverService();
        obs.addObserver(this, "mail:updateToolbarItems", false);

        this.addListener();
    },

    onUnLoad : function() {
        var obs = ViewSourceWithCommon.getObserverService();
        obs.removeObserver(this, "mail:updateToolbarItems");
        this.removeListeners();
    },

    observe : function(subject, topic, state) {
        if (topic == "mail:updateToolbarItems") {
            this.goUpdateEditorCommands();
        }
    },

    addListener : function() {
        var attachContext = document.getElementById("attachmentListContext");
        if (attachContext) {
            attachContext.addEventListener("popupshowing",
                        this.onPopupShowingAttachContextMenu, false);
        }
    },

    removeListeners : function() {
        var attachContext = document.getElementById("attachmentListContext");
        if (attachContext) {
            attachContext.removeEventListener("popupshowing",
                                this.onPopupShowingAttachContextMenu, false);
        }
    },

    onPopupShowingAttachContextMenu : function(event) {
        if (event.target == this) {
            var attachmentList = document.getElementById("attachmentList");
            if (attachmentList) {
                var isEnabled = attachmentList.selectedItems.length > 0;
                goSetCommandEnabled("cmd_vswAttachment", isEnabled);
            }
        }
    },

    goUpdateEditorCommands : function(cmdset) {
        var isEnabled = GetNumSelectedMessages() > 0;

        goSetCommandEnabled("cmd_vswEnabledEditor", isEnabled);
        goSetCommandEnabled("cmd_runDefaultEditor", isEnabled);
    },

    initThreadPaneMenu : function(event, fnViewPage) {
        if (typeof fnViewPage == "undefined" || fnViewPage == null) {
            fnViewPage = gViewSourceWithMessenger.openMessagesFromThreadPane;
        }
        this.goUpdateEditorCommands();
        gViewSourceWithMain._resources = new Resources(null);

        gViewSourceWithMain.insertMenuItems(event.target, fnViewPage,
                             true, false);
        return true;
    },

    initAttachMenu : function(event) {
        return this.initThreadPaneMenu(event, gViewSourceWithMessenger.viewAttachments);
    },

    initComposeMenu : function(event) {
        gViewSourceWithMain._resources = new Resources(null);

        gViewSourceWithMain.insertMenuItems(event.target,
                    gViewSourceWithMessenger.openMessageFromCompose,
                    true, false);
        return true;
    },

    openMessagesFromThreadPane : function(editorDataIdx, event) {
        try {
            var focusedWindow = document.commandDispatcher.focusedWindow;
            var isFocusOnMessageBody = focusedWindow == content;

            if (isFocusOnMessageBody
                && gViewSourceWithMain.viewDocumentOrURL(focusedWindow.document, editorDataIdx, event)) {
                return;
            }
            // viewSelectedMessages can be called if viewDocumentOrURL returns false
            // i.e. the user doesn't choose to view the document (eg view the DOM)
            gViewSourceWithMessenger.viewSelectedMessages(editorDataIdx, event);
        } catch (err) {
            ViewSourceWithCommon.log("gViewSourceWithMessenger.openMessagesFromThreadPane: " + err);
        }
    },

    viewSelectedMessages: function(editorDataIdx, event) {
        var prefs = gViewSourceWithMain.prefs;
        var fileExtensionMapper = prefs.fileExtensionMapper;

        var messages;
        if (typeof gFolderDisplay == "undefined") {
            // TB 2.x
            messages = GetSelectedMessages();
        } else {
            // TB 3.x
            messages = gFolderDisplay.selectedMessageUris;
        }

        var urls = new Array();
        var fileNames = new Array();
        var cleaner = viewSourceWithFactory.getTempCleaner();

        // First, get the mail session
        const mailSessionContractID = "@mozilla.org/messenger/services/session;1";
        const nsIMsgMailSession = Components.interfaces.nsIMsgMailSession;
        var mailSession = Components.classes[mailSessionContractID].getService(nsIMsgMailSession);
        var mailCharacterSet = "charset=" + msgWindow.mailCharacterSet;

        for (var i = 0; i < messages.length; i++) {
            // Now, we need to get a URL from a URI
            var url = mailSession.ConvertMsgURIToMsgURL(messages[i], msgWindow);
            var fileExtension = cleaner.findExtension(url, fileExtensionMapper, '.html');
            var fileName = ViewSourceWithCommon.getDocumentFileName(url, fileExtension);
            var filePath = ViewSourceWithCommon.initFileToRun(
                                unescape(fileName),
                                prefs.destFolder,
                                prefs.tempMaxFilesSamePrefix,
                                true,
                                cleaner);

            urls.push(url);
            fileNames.push(filePath);
        }

        var saver = new UrlDownloader();
        saver.callbackObject = { editorData : prefs.editorData[editorDataIdx],
                                 urlMapperData : prefs.urlMapperData};
        saver.onFinish = gViewSourceWithMain.onFinishRunEditor;
        saver.saveURIList(urls, fileNames);
    },

    openMessageFromCompose : function(editorDataIdx, event) {
        var editor = GetCurrentEditor();

        if (!editor) {
            return;
        }

        var editorInfo = {};
        editorInfo.textWindow = editor.document.defaultView;
        editorInfo.textElement = editor;
        editorInfo.textView = editor.document.defaultView;
        editorInfo.htmlEditor = ViewSourceWithCommon.getEditorForWindow(editor.document.defaultView);
        editorInfo.isHtmlEditor = true;

        editorInfo.textWindow.focus();

        var prefs = gViewSourceWithMain.prefs;
        var editorData = prefs.editorData[editorDataIdx];
        var linkInfo = new ViewSourceWithLinkInfo();
        linkInfo.init(editor.document, prefs, editorInfo);
        ViewSourceWithInputText.viewText(editorData, linkInfo);
    },

    viewAttachments : function(editorDataIdx, event) {
        var attachmentList = document.getElementById("attachmentList");
        var canHandle = attachmentList
                        && attachmentList.selectedItems.length > 0;

        var selectedAttachments;
        if (canHandle) {
            selectedAttachments = attachmentList.selectedItems;
        } else {
            var attachmentItemContext = document.getElementById("attachmentItemContext");
            canHandle = attachmentItemContext
                        && attachmentItemContext.attachments.length > 0;
            if (canHandle) {
                selectedAttachments = attachmentItemContext.attachments;
            }
        }

        if (!canHandle) {
            return false;
        }

        var prefs = gViewSourceWithMain.prefs;
        var urls = new Array();
        var fileNames = new Array();
        var cleaner = viewSourceWithFactory.getTempCleaner();

        for (var i = 0; i < selectedAttachments.length; i++) {
            var attach = selectedAttachments[i].attachment || selectedAttachments[i];

            // displayName is no longer available since TB 5.0
            var fileName = attach.displayName || attach.name;
            var filePath = ViewSourceWithCommon.initFileToRun(
                                fileName,
                                prefs.destFolder,
                                prefs.tempMaxFilesSamePrefix,
                                true,
                                cleaner);
            fileNames.push(filePath);
            urls.push(attach.url);
        }

        var saver = new UrlDownloader();
        saver.callbackObject = { editorData : prefs.editorData[editorDataIdx],
                                 urlMapperData : prefs.urlMapperData};
        saver.onFinish = gViewSourceWithMain.onFinishRunEditor;
        saver.saveURIList(urls, fileNames);

        return true;
    }
}

// TODO: this check must be removed and script inclusion must be controlled from xul overlay
if (ViewSourceWithCommon.isMessenger()) {
    window.addEventListener("load", function(event) {
        gViewSourceWithMessenger.onLoad(event)}, false);
    window.addEventListener("unload", function(event) {
        gViewSourceWithMessenger.onUnLoad(event)}, false);
}