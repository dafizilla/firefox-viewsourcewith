/**
 * Author   : Davide Ficano
 * Date     : 29-May-05
 * Date     : 12-Mar-07 added support for rich editors (e.g. GMail)
 */
Components.utils.import("resource://vsw/common.jsm");

var ViewSourceWithInputText = {
    viewText : function(editorData, linkInfo) {
        var thiz = ViewSourceWithInputText;
        var target = linkInfo.target;
        var filePath = target.filePath;
        try {
            var generateNewFileName = true;

            target.listenModification();
            if (filePath && filePath.exists()) {
                var check = thiz.checkOverwriteFile();
                if (check == 1) { // cancel
                    return;
                }
                generateNewFileName = check == 2;
            }
            if (generateNewFileName) {
                var fileName = ViewSourceWithCommon.getDocumentFileName(
                                                    target.document);
                filePath = thiz.generateInputTextFile(linkInfo, fileName);
                viewSourceWithFactory.getTempCleaner()
                        .deleteTemporaryFileOnExit(filePath);
            }

            ViewSourceWithCommon.saveTextFile(filePath, target.value);
            ViewSourceEditorData.runEditor(editorData, [filePath.path]);

            target.filePath = filePath;
            target.lastModifiedTime = filePath.lastModifiedTime;
            target.setModified(false);
            target.addEventListener("focus", new FocusHandler(target), true);
        } catch (err) {
            alert("Error while saving " + filePath.path + " more details on Error Console");
            ViewSourceWithCommon.log("ViewSourceWithInputText:viewText error : " + err);
        }
   },

    generateInputTextFile : function(linkInfo, fileName) {
        var target = linkInfo.target;
        var prefs = linkInfo.prefs;
        var thiz = ViewSourceWithInputText;

        var controlName = ViewSourceWithCommon.getPortableFileName(target.name);

        // replace last extension with target one
        var re = /\.[^\.]*$/;
        var dateStamp = new Date().getTime();

        var cleaner = viewSourceWithFactory.getTempCleaner();

        var fileExtension = cleaner.findExtension(linkInfo.url,
                            prefs.fileExtensionMapper,
                            linkInfo.target.fileExtension);
        var filePath = ViewSourceWithCommon.makeLocalFile(
                            prefs.destFolder,
                            [fileName.replace(re, controlName + dateStamp + fileExtension)]);
        return filePath;
    },

    fillInputText : function(textTarget) {
        var thiz = ViewSourceWithInputText;
        var filePath = textTarget.filePath;

        try {
            if (filePath && filePath.exists()) {
                var currFileTime = filePath.lastModifiedTime;
                var oldFileTime = textTarget.lastModifiedTime;
                var reloadFile = false;

                if (currFileTime > oldFileTime) {
                    if (textTarget.isModified()) {
                        if (thiz.checkReload()) {
                            reloadFile = true;
                        } else {
                            textTarget.lastModifiedTime = currFileTime;
                        }
                    } else {
                        reloadFile = true;
                    }
                }

                if (reloadFile) {
                    textTarget.stopListenModification();
                    textTarget.value = ViewSourceWithCommon.loadTextFile(filePath);
                    textTarget.setModified(false);
                    textTarget.lastModifiedTime = currFileTime;
                    textTarget.listenModification();

                    // Set mail status to modified
                    if (typeof gMsgCompose != "undefined") {
                        gMsgCompose.bodyModified = true;
                    }
                }
            }
        } catch (err) {
            ViewSourceWithCommon.log("fillInputText: error for file "
                                     + filePath + "\n" + err);
        }
    },

    checkOverwriteFile : function() {
        const nsIPromptSVC = Components.interfaces.nsIPromptService;
        var promptService = Components
                        .classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(nsIPromptSVC);
        var checkResult = { value : 0 };

        var selection = promptService.confirmEx(
            window,
            "ViewSourceWith",
            ViewSourceWithCommon.getLocalizedMessage("overwrite.prompt"),
              (nsIPromptSVC.BUTTON_POS_0 * nsIPromptSVC.BUTTON_TITLE_IS_STRING)
            + (nsIPromptSVC.BUTTON_POS_1 * nsIPromptSVC.BUTTON_TITLE_CANCEL)
            + (nsIPromptSVC.BUTTON_POS_2 * nsIPromptSVC.BUTTON_TITLE_IS_STRING)
            + nsIPromptSVC.BUTTON_POS_1_DEFAULT,
            ViewSourceWithCommon.getLocalizedMessage("overwrite.file"),
            null,
            ViewSourceWithCommon.getLocalizedMessage("open.new.file"),
            null,
            checkResult);

        return selection;
    },

    checkReload : function() {
        const nsIPromptSVC = Components.interfaces.nsIPromptService;
        var promptService = Components
                        .classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(nsIPromptSVC);
        var checkResult = { value : 0 };

        var selection = promptService.confirmEx(
            window,
            "ViewSourceWith",
            ViewSourceWithCommon.getLocalizedMessage("reload.modified.text"),
            nsIPromptSVC.STD_YES_NO_BUTTONS
            + nsIPromptSVC.BUTTON_POS_1_DEFAULT,
            null,
            null,
            null,
            null,
            checkResult);

        return selection == 0;
    }
}

function FocusHandler(textTarget) {
    this._textTarget = textTarget;
}

FocusHandler.prototype = {
    handleEvent : function(event) {
        var f = function(textTarget) {
               return function() {
                    ViewSourceWithInputText.fillInputText(textTarget);
               };
            }
        setTimeout(f(this._textTarget), 400);
    }

}
