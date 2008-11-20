/**
 * Author: Davide Ficano
 * Date  : 05-Feb-05
 * Added code taken from KeyConfig
 */
var gViewSourceChooseEditor = {
    onLoad : function() {
        sizeToContent();
        this.initControls();
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
                if (this.oUsePortableCheckbox.checked) {
                    item.usePortable = true;
                }
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
        var descr = ViewSourceWithCommon.makeLocalFile(
                                this.getEditorPathBySettings()).leafName;
        // remove extension (if any)
        descr = descr.replace(/\.[^\.]*/, "");

        return descr;
    },

    checkEditor : function() {
        var isValid = false;

        try {
            var editorFile = ViewSourceWithCommon.resolveExecPath(this.getEditorPathBySettings());
            isValid = editorFile != null;

            if (!isValid) {
                isValid = confirm(ViewSourceWithCommon.getLocalizedMessage("err.invalidEditor"));
            }
        } catch (err) {
            alert(this.oEditorAppPath.getAttribute("errinvalidpathchars"));
        }
        return isValid;
    },

    initControls : function() {
        var thiz = gViewSourceChooseEditor;

        thiz.oEditorAppPath = document.getElementById("editorpath");
        thiz.oDescription = document.getElementById("description");
        thiz.oEditKey = document.getElementById("key");
        thiz.oCmdArgs = document.getElementById("cmdargs");
        thiz.oUsePortableCheckbox = document.getElementById("usePortableCheckbox");

        this.oUsePortableCheckbox.addEventListener("CheckboxStateChange",
            function(event) { gViewSourceChooseEditor.tooglePortablePath(event);}, false);

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
            if (item.usePortable) {
                thiz.oUsePortableCheckbox.checked = true;
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

            KeyData.fromEvent(event, thiz._keyData);
            edit.value = thiz._keyData.keyToString();
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
    },

    onInputEditorPath : function(event) {
        this.updatePreviewPortablePath();
    },

    updatePreviewPortablePath : function() {
        var oPreviewPortableRow = document.getElementById("preview-portable-row");

        if (!oPreviewPortableRow.hasAttribute("collapsed")) {
            var previewPortablePath = document.getElementById("preview-portable-path");
            var path = this.getPortablePath();
            if (path) {
                previewPortablePath.value = path;
            } else {

                previewPortablePath.value = previewPortablePath.getAttribute("invalidpathtext");
            }
        }
    },

    getPortablePath : function() {
        try {
            var relativePath = this.oEditorAppPath.value;
            // If path doesn't start with a separator then add it
            if (!/^[\\\/].*/.test(relativePath)) {
                relativePath = (ViewSourceWithCommon.isWindows ? "\\" : "/") + relativePath;
                this.oEditorAppPath.value = relativePath;
            }
            var file = ViewSourceWithCommon.makeLocalFile(
                        ViewSourceWithCommon.getProfileDir().path + relativePath);
            file.normalize();
            return file.path;
        } catch (err) {
            return null;
        }
    },

    getEditorPathBySettings : function() {
        if (this.oUsePortableCheckbox.checked) {
            return this.getPortablePath();
        }
        return this.oEditorAppPath.value;
    },

    tooglePortablePath : function(event) {
        var oLabel = document.getElementById("editorpath-label");
        var oPreviewPortableRow = document.getElementById("preview-portable-row");
        var labelValue;

        if (this.oUsePortableCheckbox.checked) {
            labelValue = oLabel.getAttribute("labelportable");
            if (ViewSourceWithCommon.isWindows) {
                labelValue = labelValue.replace(/\//g, "\\");
            }
            oPreviewPortableRow.removeAttribute("collapsed");
            this.oEditorAppPath.setAttribute("browsecollapsed", "true");
            this.updatePreviewPortablePath();
        } else {
            labelValue = oLabel.getAttribute("labelnormal");
            oPreviewPortableRow.setAttribute("collapsed", "true");
            this.oEditorAppPath.removeAttribute("browsecollapsed");
        }

        oLabel.setAttribute("label", labelValue);
    }
};
