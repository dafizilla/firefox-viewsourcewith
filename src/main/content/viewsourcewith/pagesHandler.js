/**
 * Author   : Davide Ficano
 */

function VswServerPagesHandler() {
    this.data = null;
}

VswServerPagesHandler.prototype = {
    matches : function(urlToSave, urlMapperData, line, column, editorData) {
        var umd = this._findUrlMapperData(urlToSave, urlMapperData);

        if (umd != null) {
            //ViewSourceWithCommon.log("applying " + umd.name);

            var intLine = parseInt(line);
            if (isNaN(intLine) || intLine < 1) {
                line = "1";
            }
            var intColumn = parseInt(column);
            if (isNaN(intColumn) || intColumn < 1) {
                column = "1";
            }
            var editorName = typeof (editorData) == "undefined"
                ? "" : editorData.description;

            this.data = { uri : ViewSourceWithCommon.makeUrlFromSpec(urlToSave),
                          localPath : umd.localPath,
                          domainFilter : umd.domainFilter,
                          pageSourcePath : "",
                          // jsCode must be considered
                          // private by function called
                          jsCode : umd.jsCode,
                          line: line,
                          column : column,
                          editorName : editorName};

            // should be trimmed before compare
            if (this.data.jsCode == "") {
                this.data.jsCode = ViewSourceWithCommon.readHttpReq(
                        "chrome://viewsourcewith/content/jstempl.js")
                        .responseText;
            }
        } else {
            //ViewSourceWithCommon.log("no mapping found");
            this.data = null;
        }

        return this.data != null;
    },

    _findUrlMapperData : function (urlToSave, urlMapperData) {
        for (var i = 0; i < urlMapperData.length; i++) {
            if (urlMapperData[i].enabled
                && ViewSourceUrlMapperData.matchFilter(urlMapperData[i], urlToSave)) {
                return urlMapperData[i];
            }
        }
        return null;
    },

    getServerPageFileNames : function () {
        if (this.data) {
            var fn = new Function("data", this.data.jsCode);
            return fn(this.data);
        }
        return [];
    },

    onOpenFile : function (editorData, filePath) {
        if (this.data) {
            this.data.pageSourcePath = filePath;
            var fileArr = this.getServerPageFileNames();
            this._openServerPages(editorData, fileArr);
        }
    },

    _openServerPages : function(editorData, fileArr) {
        try {
            ViewSourceEditorData.runEditor(editorData, fileArr);
        } catch (err) {
            ViewSourceWithCommon.log(
                "VSW: openServerPages Unable to run program\n" + err);
        }
    },

    runEditor : function(urls, outFiles, urlMapperData, editorData, line, column) {
        var args = new Array();

        for (var i = 0; i < outFiles.length; i++) {
            if (this.matches(urls[i], urlMapperData, line, column, editorData)) {
                this.data.pageSourcePath = outFiles[i].path;
                args = args.concat(this.getServerPageFileNames());
            } else {
                args.push(outFiles[i].path);
            }
        }
        if (editorData) {
            ViewSourceEditorData.runEditor(editorData, args, line, column);
        }
    }
}
