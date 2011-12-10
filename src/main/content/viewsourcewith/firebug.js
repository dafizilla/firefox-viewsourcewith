Components.utils.import("resource://vsw/common.jsm");

FBL.ns(function() {
    with (FBL) {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fullPath;
        var saveLabel = document.getElementById('vswFBSave').label;
        var pickOpenLabel = ViewSourceWithCommon.getLocalizedMessage('pick.filebug.open');
        var pickSaveLabel = ViewSourceWithCommon.getLocalizedMessage('pick.filebug.save');
        var isDirty = false;

        setSaveLabel = function() {
            document.getElementById('vswFBSave').label = saveLabel + (isDirty ? ' *' : '');
        };

        Firebug.Vsw = extend(Firebug.Module, {
            dispatchName: "commandLine",

            initializeUI: function(detachArgs) {
                Firebug.CommandLine.getCommandEditor().addEventListener('input', this.onInput, false);
                Firebug.CommandLine.getCommandEditor().addEventListener('keydown', this.onKeyDown, false);
                Firebug.CommandLine.getSingleRowCommandLine().addEventListener('input', this.onInput, false);
            },

            open: function() {
                var path = ViewSourceWithCommon.pickFile(pickOpenLabel, fullPath, window, nsIFilePicker.modeOpen);
                if (path) {
                    fullPath = path;
                    var text = ViewSourceWithCommon.loadTextFile(fullPath);
                    if (text) {
                        var editor = Firebug.CommandLine.getCommandEditor();
                        editor.value = text;
                        // if user switches between multiline and single row stores text
                        Firebug.currentContext.commandLineText = text;
                        ViewSourceWithInputText.listenModification(editor, fullPath);
                    }
                }
            },

            save: function() {
                var editor = Firebug.CommandLine.getCommandEditor();
                var text = editor.value;
                if (fullPath) {
                    ViewSourceWithCommon.saveTextFile(fullPath, text);
                    isDirty = false;
                    setSaveLabel();
                } else {
                    var path = ViewSourceWithCommon.pickFile(pickSaveLabel, fullPath, window, nsIFilePicker.modeSave);
                    if (path) {
                        fullPath = path;
                        ViewSourceWithCommon.saveTextFile(fullPath, text);
                        isDirty = false;
                        setSaveLabel();
                    }
                }
            },

            onInput: function(e) {
                if (!isDirty) {
                    isDirty = true;
                    setSaveLabel();
                }
            },
            
            onKeyDown: function(e) {
                var accelKey = ViewSourceWithCommon.isMacOSX ? e.metaKey : e.ctrlKey;
                if (e.keyCode == 'S'.charCodeAt(0) && accelKey) {
                    Firebug.Vsw.save();
                    e.preventDefault();
                } else if (e.keyCode == 'O'.charCodeAt(0) && accelKey) {
                    Firebug.Vsw.open();
                    e.preventDefault();
                }
            }
        });
        Firebug.registerModule(Firebug.Vsw);
    }
});