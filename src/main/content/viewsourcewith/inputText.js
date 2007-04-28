/**
 * Author   : Davide Ficano
 * Date     : 29-May-05
 * Date     : 12-Mar-07 added support for rich editors (e.g. GMail)
 */

var ViewSourceWithInputText = {
    ATTR_EDIT_FILE_PATH : "vswEditFilePath",
    ATTR_OLD_FILE_TIME : "vswEditOldFileTime",
    ATTR_EDIT_MODIFIED : "vswEditModified",

    viewText : function(editorData, linkInfo) {
        try {
            var thiz = ViewSourceWithInputText;
            var target = linkInfo.target;
            var editor = ViewSourceWithCommon.getEditorForWindow(target);

            if (editor) {
                // how can I find window starting from editor?
                thiz.handleEditor(target, editor, editorData);
                return;
            }
            var generateNewFileName = true;
            var filePath = thiz.makeFileFromInputText(
                        target.getAttribute(thiz.ATTR_EDIT_FILE_PATH));

            target.addEventListener("input", thiz.onInput, true);
            if (filePath && filePath.exists()) {
                var check = thiz.checkOverwriteFile();
                if (check == 1) { // cancel
                    return;
                }
                generateNewFileName = check == 2;
            }
            if (generateNewFileName) {
                // always uses the target owner document so inside different
                // frameset elements with same id are correctly handled
                var fileName = ViewSourceWithCommon.getDocumentFileName(
                                                    target.ownerDocument);
                filePath = thiz.generateInputTextFile(target, fileName);
                ViewSourceWithTempCleaner.getTempCleaner()
                        .deleteTemporaryFileOnExit(filePath);
            }

            var text = linkInfo.text;

            ViewSourceWithCommon.saveTextFile(filePath, text);
            editorData.runEditor([filePath.path]);

            target.setAttribute(thiz.ATTR_EDIT_FILE_PATH, filePath.path);
            target.setAttribute(thiz.ATTR_OLD_FILE_TIME, filePath.lastModifiedTime);
            target.removeAttribute(thiz.ATTR_EDIT_MODIFIED);
            target.addEventListener("focus", thiz.onFocusInputText, true);
        } catch (err) {
            ViewSourceWithCommon.log("VSW:viewText error : " + err);
        }
   },

    handleEditor: function(win, editor, editorData) {
        try {
            var thiz = ViewSourceWithInputText;
            var bodyTag = editor.rootElement;

            var generateNewFileName = true;
            var filePath = thiz.makeFileFromInputText(
                thiz.getEditorAttribute(editor, bodyTag, thiz.ATTR_EDIT_FILE_PATH));

            if (filePath && filePath.exists()) {
                var check = thiz.checkOverwriteFile();
                if (check == 1) { // cancel
                    return;
                }
                generateNewFileName = check == 2;
            }
            if (generateNewFileName) {
                var fileName = ViewSourceWithCommon.getDocumentFileName(
                                                    editor.document);
                filePath = thiz.generateInputTextFile(bodyTag, fileName, ".html");
                ViewSourceWithTempCleaner.getTempCleaner()
                        .deleteTemporaryFileOnExit(filePath);
            }

            // Remove ours attributes from saved file
            editor.removeAttribute(bodyTag, thiz.ATTR_EDIT_FILE_PATH);
            editor.removeAttribute(bodyTag, thiz.ATTR_OLD_FILE_TIME);

            // http://www.xulplanet.com/references/xpcomref/ifaces/nsIEditor.html
            // The contributor section contains the whole flags list
            var text = editor.outputToString(editor.contentsMIMEType, 2);

            ViewSourceWithCommon.saveTextFile(filePath, text);
            editorData.runEditor([filePath.path]);

            // restore/update ours attributes
            editor.setAttribute(bodyTag, thiz.ATTR_EDIT_FILE_PATH, filePath.path);
            editor.setAttribute(bodyTag, thiz.ATTR_OLD_FILE_TIME, filePath.lastModifiedTime);
            // Every time the setAttribute is called the modification
            // count is incremented so we reset it
            editor.resetModificationCount();

            win.addEventListener("focus", new EditorHandler(win, editor), true);
        } catch (err) {
            ViewSourceWithCommon.log("VSW:viewText error : " + err);
        }
    },

    onInput : function(event) {
        var thiz = ViewSourceWithInputText;
        event.target.setAttribute(thiz.ATTR_EDIT_MODIFIED, "true");
    },

    onFocusInputText : function(event) {
        var thiz = ViewSourceWithInputText;

        var f = function(target){
               return function() {
                    thiz.fillInputText(target);
               };
            }
        setTimeout(f(event.target), 400);
        return true;
    },

    generateInputTextFile : function(target, fileName, fileExt) {
        var thiz = ViewSourceWithInputText;

        var controlName = "";

        if (target) {
            if (target.name) {
                controlName += target.name;
            }
            if (target.id && target.id != controlName) {
                controlName += target.id;
            }
        }

        controlName = ViewSourceWithCommon.getPortableFileName(controlName);
        // replace last extension with .txt
        var re = /\.[^\.]*$/;
        var dateStamp = new Date().getTime();
        if (!fileExt) {
            fileExt = ".txt";
        }
        var filePath = ViewSourceWithCommon.makeLocalFile(
                            thiz.prefs.destFolder,
                            [fileName.replace(re, controlName + dateStamp + fileExt)]);
        return filePath;

    },

    fillInputText : function(target) {
        var thiz = ViewSourceWithInputText;
        var filePath = thiz.makeFileFromInputText(
            target.getAttribute(thiz.ATTR_EDIT_FILE_PATH));

        try {
            if (filePath && filePath.exists()) {
                var currFileTime = filePath.lastModifiedTime;
                var oldFileTime = parseInt(target.getAttribute(thiz.ATTR_OLD_FILE_TIME));
                var isModified = ViewSourceWithCommon.isTrue(
                                    target.getAttribute(thiz.ATTR_EDIT_MODIFIED));

                var reloadFile = false;

                if (currFileTime > oldFileTime) {
                    if (isModified) {
                        if (thiz.checkReload()) {
                            reloadFile = true;
                        } else {
                            target.setAttribute(thiz.ATTR_OLD_FILE_TIME, currFileTime);
                        }
                    } else {
                        reloadFile = true;
                    }
                }

                if (reloadFile) {
                    target.removeEventListener("input", thiz.onInput, true);
                    target.value = ViewSourceWithCommon.loadTextFile(filePath);
                    target.removeAttribute(thiz.ATTR_EDIT_MODIFIED);
                    target.setAttribute(thiz.ATTR_OLD_FILE_TIME, currFileTime);
                    target.addEventListener("input", thiz.onInput, true);
                }
            }
        } catch (err) {
            ViewSourceWithCommon.log("fillInputText: error for file "
                                     + filePath + "\n" + err);
        }
    },

    fillEditor : function(handler) {
        try {
        var thiz = ViewSourceWithInputText;
        var editor = handler.editor;
        var editFilePath = thiz.getEditorAttribute(editor, editor.rootElement, thiz.ATTR_EDIT_FILE_PATH);
        var filePath = thiz.makeFileFromInputText(editFilePath);


            if (filePath && filePath.exists()) {
                var currFileTime = filePath.lastModifiedTime;
                var oldFileTime = parseInt(thiz.getEditorAttribute(editor, editor.rootElement, thiz.ATTR_OLD_FILE_TIME));
                var isModified = editor.getModificationCount() != 0;
                var reloadFile = false;

                if (currFileTime > oldFileTime) {
                    if (isModified) {
                        if (thiz.checkReload()) {
                            reloadFile = true;
                        } else {
                            editor.setAttribute(editor.rootElement, thiz.ATTR_OLD_FILE_TIME, currFileTime);
                        }
                    } else {
                        reloadFile = true;
                    }
                }

                if (reloadFile) {
                    var text = ViewSourceWithCommon.loadTextFile(filePath);
                    editor.rebuildDocumentFromSource(text);
                    editor.setAttribute(editor.rootElement, thiz.ATTR_EDIT_FILE_PATH, editFilePath);
                    editor.setAttribute(editor.rootElement, thiz.ATTR_OLD_FILE_TIME, currFileTime);
                    editor.resetModificationCount();
                }
            }
        } catch (err) {
            ViewSourceWithCommon.log("ViewSourceWithInputText.fillEditor: " + err);
        }
    },

    getEditorAttribute : function(editor, tag, attrName) {
        var str = {};

        return editor.getAttributeValue(tag, attrName, str) ? str.value : null;
    },

    makeFileFromInputText : function(fileName) {
        var thiz = ViewSourceWithInputText;
        var filePath = null;

        try {
            if (fileName && fileName != "") {
                filePath = ViewSourceWithCommon.makeLocalFile(fileName);
            }
        } catch (err) {
        }
        return filePath;
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

function EditorHandler(win, editor) {
    this.win = win;
    this.editor = editor;
}

EditorHandler.prototype = {
    handleEvent : function(event) {
        //ViewSourceWithCommon.log("EditorHandler.handleEvent1 " + this.win);
        //ViewSourceWithCommon.log("EditorHandler.handleEvent2 " + event.target);
        //ViewSourceWithCommon.log("EditorHandler.handleEvent3 " + this.editor);

        var thiz = ViewSourceWithInputText;
        var f = function(target){
               return function() {
                    thiz.fillEditor(target);
               };
            }
        setTimeout(f(this), 400);
    }

}
