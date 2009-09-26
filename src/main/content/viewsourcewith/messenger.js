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
            fnViewPage = "gViewSourceWithMessenger.openMessagesFromThreadPane";
        }
        this.goUpdateEditorCommands();
        gViewSourceWithMain._resources = new Resources(null);

        gViewSourceWithMain.insertMenuItems(event.target, fnViewPage,
                             true, false);
        return true;
    },

    initAttachMenu : function(event) {
        return this.initThreadPaneMenu(event, "gViewSourceWithMessenger.viewAttachments");
    },

    openMessagesFromThreadPane : function(editorDataIdx, event) {
        try {
            var prefs = gViewSourceWithMain.prefs;

            var messages;
            if (typeof gFolderDisplay == "undefined") {
                // TB 2.x
                messages = GetSelectedMessages();
            } else {
                // TB 3.x
                messages = gFolderDisplay.selectedMessageUris;
            }

            // First, get the mail session
            const mailSessionContractID = "@mozilla.org/messenger/services/session;1";
            const nsIMsgMailSession = Components.interfaces.nsIMsgMailSession;
            var mailSession = Components.classes[mailSessionContractID].getService(nsIMsgMailSession);

            var mailCharacterSet = "charset=" + msgWindow.mailCharacterSet;

            var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance();
            messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);

            var urls = new Array();
            var fileNames = new Array();
            var cleaner = ViewSourceWithTempCleaner.getTempCleaner();

            for (var i = 0; i < messages.length; i++) {
                // Now, we need to get a URL from a URI
                var url = mailSession.ConvertMsgURIToMsgURL(messages[i], msgWindow);
                var subject = messenger.messageServiceFromURI(url)
                             .messageURIToMsgHdr(messages[i]).mime2DecodedSubject;
                // 20-Apr-07 If subject contains Japanese characters many editors
                // are unable to open the file so subject is no more added to file name
                var fileName = /*subject + */"msg" + i + ".html";
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
        } catch (err) {
            ViewSourceWithCommon.log("gViewSourceWithMessenger.openMessagesFromThreadPane: " + err);
        }
    },

    viewAttachments : function(editorDataIdx, event) {
        var attachmentList = document.getElementById("attachmentList");
        var canHandle = attachmentList
                        && attachmentList.selectedItems.length > 0;

        if (!canHandle) {
            return false;
        }

        var prefs = gViewSourceWithMain.prefs;
        var selectedAttachments = attachmentList.selectedItems;
        var urls = new Array();
        var fileNames = new Array();
        var cleaner = ViewSourceWithTempCleaner.getTempCleaner();

        for (var i = 0; i < selectedAttachments.length; i++) {
            var attach = selectedAttachments[i].attachment;
            var fileName = attach.displayName;
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