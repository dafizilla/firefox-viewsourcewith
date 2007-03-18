/**
 * Author   : Davide Ficano
 * Date     : 23-Apr-2005
 */

var gViewSourceEditorHooker = {
    NATIVE_EDITOR_ID : "viewSourceWithNaviveEditor",
    _arCmdIds : new Array("View:PageSource",        // FF cmdView
                          "cmd_HTMLSourceMode",     // NVU Html mode
                          "context-viewsource",     // FF/TB/Moz CtxMenu
                          "cmd_viewPageSource",     // TB cmdView
                          "key_viewPageSource"      // TB shortcut key
                          ),

    _arCtxMenuImageIds : new Array("context-viewimage"  // FF
                                   //"context-viewbgimage"
                                ),

    hookDefaultViewSource : function(prefs) {
        var thiz = gViewSourceEditorHooker;

        var newCmd = "gViewSourceWithMain.runEditor(event,"
                      + " gViewSourceWithMain.prefs.editorDefaultIndex,"
                      + " gViewSourceWithMain.prefs.openFocusWin);"
        thiz.toogleHook(prefs.replaceNativeEditor,
                        thiz._arCmdIds,
                        newCmd);
    },

    hookImageViewSource : function(prefs) {
        var thiz = gViewSourceEditorHooker;

        var newCmd = "gViewSourceEditorHooker.handleViewImage(event);";

        thiz.toogleHook(prefs.isEditorIndexValid(prefs.nativeImageEditorIndex),
                        thiz._arCtxMenuImageIds,
                        newCmd);
    },

    handleViewImage : function(event) {
        var vsw = gViewSourceWithMain;
        vsw._linkInfo.url = gContextMenu.imageURL;
        vsw.viewPageFromCtxMenu(vsw.prefs.nativeImageEditorIndex, event);
    },

    isViewImageSupported : function() {
        var thiz = gViewSourceEditorHooker;

        var windowManager = Components
            .classes["@mozilla.org/appshell/window-mediator;1"]
            .getService();
        var windowManagerInterface = windowManager.QueryInterface(
            Components.interfaces.nsIWindowMediator);
        var win = windowManagerInterface.getMostRecentWindow("navigator:browser");

        if (win) {
            var doc = win.document;

            for (var i = 0; i < thiz._arCtxMenuImageIds.length; i++) {
                if (doc.getElementById(thiz._arCtxMenuImageIds[i])) {
                    return true;
                }
            }
        }

        return false;
    },

    toogleHook : function(isHooked, ar, newCmd) {
        var thiz = gViewSourceEditorHooker;

        if (isHooked) {
            for (var i = 0; i < ar.length; i++) {
                thiz.hookCommand(document.getElementById(ar[i]), newCmd);
            }
        } else {
            for (var i = 0; i < ar.length; i++) {
                thiz.unHookCommand(document.getElementById(ar[i]));
            }
        }
    },

    hookCommand : function(obj, newCmd) {
        if (obj) {
            var currCmd = obj.getAttribute("oncommand");
            obj.setAttribute("oncommand", newCmd);
            // check if already hooked
            var oldCmd = obj.getAttribute("viewSourceWithOldCommand");
            if (oldCmd == null || oldCmd == "") {
                obj.setAttribute("viewSourceWithOldCommand", currCmd);
            }
        }
    },

    unHookCommand : function(obj) {
        if (obj) {
            var oldCmd = obj.getAttribute("viewSourceWithOldCommand");

            if (oldCmd != null && oldCmd != "") {
                obj.setAttribute("oncommand", oldCmd);
                obj.removeAttribute("viewSourceWithOldCommand");
            }
        }
    },

    getMenuItem : function(label, isFrame) {
        var thiz = gViewSourceEditorHooker;
        var menuCmd = null;

        if (isFrame) {
            menuCmd = "gContextMenu.viewFrameSource();";
        } else {
            for (var i = 0; i < thiz._arCmdIds.length; i++) {
                var srcEl = document.getElementById(thiz._arCmdIds[i]);

                if (srcEl) {
                    menuCmd = srcEl.getAttribute("viewSourceWithOldCommand");
                    if (menuCmd == null || menuCmd == "") {
                        menuCmd = srcEl.getAttribute("oncommand");
                    }
                    break;
                }
            }
        }
        if (menuCmd) {
            var item = document.getElementById(thiz.NATIVE_EDITOR_ID);

            if (item == null) {
                item = document.createElement("menuitem");
                item.setAttribute("id", thiz.NATIVE_EDITOR_ID);
            }
            item.setAttribute("label", label);
            item.setAttribute("oncommand", menuCmd);
        }
        return item;
    }
};