/**
 * Author: Davide Ficano
 * Date  : 05-Feb-05
 * Added code taken from KeyConfig
 */
var gViewSourceChooseEditor = {
    onLoad : function() {
        this.initControls();
        window.sizeToContent();
    },

    onAccept : function() {
        var isValid = false;

        try {
            isValid = this.checkEditor()
                      && this.checkDescription();
            var item = window.arguments[0];

            if (isValid && item) {
                item.path = this.oEditorAppPath.value;
                item.description = this.oDescription.value;
                item.keyData = this._keyData.isValid() ? this._keyData : null;
                item.cmdArgs = this.oCmdArgs.value;
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
        var isValid = false;

        try {
            isValid = this.oDescription.value != "";
            if (!isValid) {
                isValid = confirm(ViewSourceWithCommon
                        .getLocalizedMessage("warning.invalidDescription"));
                if (isValid) {
                    this.oDescription.value = this.getDescriptionFromFileName();
                }
            }
        } catch (err) {
        }
        // Shift focus to allow text input
        if (!isValid) {
            this.oDescription.focus();
        }
        return isValid;
    },

    getDescriptionFromFileName : function(fullPath) {
        if (typeof (fullPath) == "undefined" || fullPath == null) {
            fullPath = this.getEditorPathBySettings();
        }
        var descr = ViewSourceWithCommon.makeLocalFile(fullPath).leafName;
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
        this.oEditorAppPath = document.getElementById("editorpath");
        this.oDescription = document.getElementById("description");
        this.oEditKey = document.getElementById("key");
        this.oCmdArgs = document.getElementById("cmdargs");
        this.oUsePortableCheckbox = document.getElementById("usePortableCheckbox");

        this.oUsePortableCheckbox.addEventListener("CheckboxStateChange",
            function(event) { gViewSourceChooseEditor.tooglePortablePath(event);}, false);

        var item = window.arguments[0];
        if (item) {
            this.oEditorAppPath.value = item.path;
            this.oDescription.value = item.description;
            this.oCmdArgs.value = item.cmdArgs;

            this._keyData = new KeyData();
            this._keyData.shift = true;
            this._keyData.accel = true;
            if (item.keyData) {
                try {
                    this.oEditKey.value = item.keyData.showKeyName();
                    this._keyData.copy(item.keyData);
                } catch (err) {
                    alert("chooseEditor.initControls: " + err);
                }
            }
            if (item.usePortable) {
                this.oUsePortableCheckbox.checked = true;
            }
        }
        if (ViewSourceWithCommon.isMacOSX) {
            document.getElementById("macAlert").removeAttribute("hidden");
            this.oEditorAppPath.onfilechoosen =
                "return gViewSourceChooseEditor.onPickOSXFile(isOk, filePath);";
        }
    },

    handleKey : function (event) {
        try {
            event.preventDefault();
            event.stopPropagation();
            var edit = event.currentTarget;

            KeyData.fromEvent(event, this._keyData);
            edit.value = this._keyData.keyToString();
        } catch (err) {
            ViewSourceWithCommon.log(err);
        }
    },

    clearKey : function(event) {
        this._keyData.key = null;
        this._keyData.keyCode = null;
        this.oEditKey.value = "";
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
        window.sizeToContent();
    },

    onPickOSXFile : function(isOk, filePath) {
        var fillInputBox = isOk;

        if (isOk) {
            var execFile = ViewSourceWithCommon.makeLocalFile(filePath);
            if (ViewSourceWithCommon.getFileFromAppBundle(execFile)) {
                this.oEditorAppPath.value = "/usr/bin/open";
                this.oDescription.value = this.getDescriptionFromFileName(filePath);
                this.oCmdArgs.value = '-a "' + filePath + '" $f';
                fillInputBox = false;
            }
        }

        return fillInputBox;
    }
};
