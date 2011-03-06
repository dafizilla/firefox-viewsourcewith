/**
 * Author: Davide Ficano
 * Date  : 26-Nov-05
 */
Components.utils.import("resource://vsw/common.jsm");

var gViewSourceUrlMapper = {
    onLoad : function() {
        sizeToContent();
        gViewSourceUrlMapper.initControls();
    },

    onAccept : function() {
        var thiz = gViewSourceUrlMapper;
        var isValid = false;

        try {
            isValid = thiz.checkLocalPath()
                      && thiz.checkName()
                      && thiz.checkDomainFilter()
                      && thiz.checkWarnings();
            var item = window.arguments[0];

            if (isValid && item) {
                item.localPath = thiz.oLocalPath.value;
                item.name = thiz.oName.value;
                item.domainFilter = thiz.oDomainFilter.value;
                item.jsCode = thiz.oJsCode.value;
            }
        } catch (err) {
            alert("gViewSourceUrlMapper.onAccept: " + err);
        }

        return isValid;
    },

    checkWarnings : function() {
        var thiz = gViewSourceUrlMapper;
        var isValid = true;

        if (thiz.oLocalPath.value == ""
            && thiz.oJsCode.value == "") {
            isValid = confirm(ViewSourceWithCommon
                        .getLocalizedMessage("urlmapper.warn.noDirNoJS"));
        }

        return isValid;
    },

    checkDomainFilter : function() {
        var isValid = true;

        if (this.oDomainFilter.value == "") {
            isValid = false;
            alert(ViewSourceWithCommon
                        .getLocalizedMessage("urlmapper.err.noDomainFilter"));
        }
        if (isValid) {
            try {
                // check reg exp syntax
                new RegExp(this.oDomainFilter.value).test("");
            } catch (err) {
                isValid = false;
                alert(err);
            }
        }

        if (!isValid) {
            this.oDomainFilter.focus();
        }
        return isValid;
    },

    checkName : function() {
        var thiz = gViewSourceUrlMapper;
        var isValid = false;

        try {
            isValid = thiz.oName.value != "";
            if (!isValid) {
                alert(ViewSourceWithCommon
                    .getLocalizedMessage("urlmapper.err.invalidUrlName"));
            }
        } catch (err) {
            ViewSourceWithCommon.log("checkName: " + err);
        }
        // Shift focus to allow text input
        if (!isValid) {
            thiz.oName.focus();
        }
        return isValid;
    },

    checkLocalPath : function() {
        var isValid = false;

        try {
            if (gViewSourceUrlMapper.oLocalPath.value == "") {
                isValid = true;
            } else {
                try {
                    var editorFile = ViewSourceWithCommon.makeLocalFile(
                                        gViewSourceUrlMapper.oLocalPath.value);
                    isValid = editorFile.isDirectory();
                } catch (err) {
                    isValid = false;
                }

                if (!isValid) {
                    alert(ViewSourceWithCommon
                        .getLocalizedMessage("urlmapper.err.invalidDirectory"));
                }
            }
        } catch (err) {
            ViewSourceWithCommon.log("checkLocalPath: " + err);
        }
        return isValid;
    },

    initControls : function() {
        var thiz = gViewSourceUrlMapper;

        thiz.oName = document.getElementById("name");
        thiz.oDomainFilter = document.getElementById("domainFilter");
        thiz.oLocalPath = document.getElementById("localpath");
        thiz.oJsCode = document.getElementById("jsCode");

        var item = window.arguments[0];
        if (item) {
            thiz.oName.value = item.name;
            thiz.oDomainFilter.value = item.domainFilter;
            thiz.oLocalPath.value = item.localPath;
            thiz.oJsCode.value = item.jsCode;
        }
    },

    onJsInsert : function() {
        var thiz = gViewSourceUrlMapper;

        try {
            thiz.oJsCode.value = ViewSourceUrlMapperData.getDefaultJSCode();
        } catch (err) {
            ViewSourceWithCommon.log("onJsInsert : " + err);
        }
    }
};

