/**
 * Author   : Davide Ficano
 */

Components.utils.import("resource://vsw/common.jsm");

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
                this.data.jsCode = ViewSourceUrlMapperData.getDefaultJSCode();
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

    runEditor : function(urls, outFiles, urlMapperData, editorData, line, column) {
        var args = new Array();

        for (var i = 0; i < outFiles.length; i++) {
            if (this.matches(urls[i], urlMapperData, line, column, editorData)) {
                this.data.pageSourcePath = outFiles[i].path;
                var serverFiles = this.getServerPageFileNames();
                // if serverFiles is null then treats it as a non matching pattern
                if (serverFiles == null) {
                    args.push(outFiles[i].path);
                } else {
                    args = args.concat(serverFiles);
                }
            } else {
                args.push(outFiles[i].path);
            }
        }
        if (editorData) {
            ViewSourceEditorData.runEditor(editorData, args, line, column);
        }
    }
}
