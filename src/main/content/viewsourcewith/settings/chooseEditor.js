/**
 * Author: Davide Ficano
 * Date  : 05-Feb-05
 * Added code taken from KeyConfig
 */
var gViewSourceChooseEditor = {
    onLoad : function() {
        sizeToContent();
        gViewSourceChooseEditor.initControls();
    },

    onAccept : function() {
        var thiz = gViewSourceChooseEditor;
        var isValid = false;

        try {
            isValid = thiz.checkEditor()
                      && thiz.checkDescription();
            var item = window.arguments[0];

            if (isValid && item) {
                item.path = thiz.oEditorAppPath.value;
                item.description = thiz.oDescription.value;
                item.keyData = thiz._keyData.isValid() ? thiz._keyData : null;
                item.cmdArgs = thiz.oCmdArgs.value;
            }
        } catch (err) {
            alert("chooseEditor.onAccept: " + err);
        }

        return isValid;
    },

    checkDescription : function() {
        var thiz = gViewSourceChooseEditor;
        var isValid = false;

        try {
            isValid = thiz.oDescription.value != "";
            if (!isValid) {
                isValid = confirm(ViewSourceWithCommon
                        .getLocalizedMessage("warning.invalidDescription"));
                if (isValid) {
                    thiz.oDescription.value = thiz.getDescriptionFromFileName();
                }
            }
        } catch (err) {
        }
        // Shift focus to allow text input
        if (!isValid) {
            thiz.oDescription.focus();
        }
        return isValid;
    },

    getDescriptionFromFileName : function() {
        var thiz = gViewSourceChooseEditor;

        var descr = ViewSourceWithCommon.makeLocalFile(
                                thiz.oEditorAppPath.value).leafName;
        // remove extension (if any)
        descr = descr.replace(/\.[^\.]*/, "");

        return descr;
    },

    checkEditor : function() {
        var isValid = false;

        try {
            var editorFile = ViewSourceWithCommon.resolveExecPath(
                                gViewSourceChooseEditor.oEditorAppPath.value);
            isValid = editorFile != null;

            if (isValid) {
                gViewSourceChooseEditor.oEditorAppPath.value = editorFile.path;
            } else {
                isValid = confirm(ViewSourceWithCommon.getLocalizedMessage("err.invalidEditor"));
            }
        } catch (err) {
            alert(gViewSourceChooseEditor
                    .oEditorAppPath.getAttribute("errinvalidpathchars"));
        }
        return isValid;
    },

    initControls : function() {
        var thiz = gViewSourceChooseEditor;

        thiz.oEditorAppPath = document.getElementById("editorpath");
        thiz.oDescription = document.getElementById("description");
        thiz.oEditKey = document.getElementById("key");
        thiz.oCmdArgs = document.getElementById("cmdargs");

        var item = window.arguments[0];
        if (item) {
            thiz.oEditorAppPath.value = item.path;
            thiz.oDescription.value = item.description;
            thiz.oCmdArgs.value = item.cmdArgs;

            thiz._keyData = new KeyData();
            thiz._keyData.shift = true;
            thiz._keyData.accel = true;
            if (item.keyData) {
                try {
                    thiz.oEditKey.value = item.keyData.showKeyName();
                    thiz._keyData.copy(item.keyData);
                } catch (err) {
                    alert("chooseEditor.initControls: " + err);
                }
            }
        }
        if (ViewSourceWithCommon.isMacOSX) {
            document.getElementById("macAlert").removeAttribute("hidden");
        }
    },

    handleKey : function (event) {
        var thiz = gViewSourceChooseEditor;

        try {
            event.preventDefault();
            event.stopPropagation();
            var edit = event.currentTarget;

            thiz._keyData.key = null;
            thiz._keyData.keyCode = null;
            if (event.charCode) {
                thiz._keyData.key = event.charCode;
                edit.value = thiz._keyData.keyAsText;
            } else {
                thiz._keyData.keyCode = event.keyCode;
                edit.value = thiz._keyData.keyCodeAsText;
            }
        } catch (err) {
            ViewSourceWithCommon.log(err);
        }
    },

    clearKey : function(event) {
        var thiz = gViewSourceChooseEditor;

        thiz._keyData.key = null;
        thiz._keyData.keyCode = null;
        thiz.oEditKey.value = "";
    },

    openHelp : function() {
        window.openDialog("chrome://viewsourcewith/content/settings/helpDialog.xul",
                          "_blank",
                          "chrome,resizable=yes,dependent=yes",
                          "chrome://viewsourcewith/content/help/tokenHelp.xhtml");
    }
};
