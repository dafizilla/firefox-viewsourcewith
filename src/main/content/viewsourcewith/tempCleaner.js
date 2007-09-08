/**
 * Author   : Davide Ficano
 * Date     : 28-May-05
 * Date     : 11-Jun-05 Added support for NVU and Moz. They don't
 *                      support quit-application-notification
 * Date     : 05-Aug-07 Removed code used to check if current windows is last
 *                      open because now we use hiddenDOMWindow that is always
 *                      the last destroyed
 */

// static method
ViewSourceWithTempCleaner.getTempCleaner = function() {
    var app = Components.classes["@mozilla.org/appshell/appShellService;1"]
              .getService(Components.interfaces.nsIAppShellService);
    var cleaner = undefined;

    if ("viewSourceWithFactory" in app.hiddenDOMWindow) {
        cleaner = app.hiddenDOMWindow.viewSourceWithFactory.getTempCleaner();
    }

    if (cleaner == undefined) {
        viewSourceWithFactory.loadSubScripts(app);
        cleaner = app.hiddenDOMWindow.viewSourceWithFactory.getTempCleaner();
    }

    return cleaner;
}

function ViewSourceWithTempCleaner() {
    this._enabled = false;
    this._tempFileList = new Array();
}

ViewSourceWithTempCleaner.prototype = {
    get enabled() {
        return this._enabled;
    },

    set enabled(b) {
        var hiddenDOMWindow = Components
                    .classes["@mozilla.org/appshell/appShellService;1"]
                    .getService(Components.interfaces.nsIAppShellService)
                    .hiddenDOMWindow;
        if (b) {
            if (!this._enabled) { // add only if is not already enabled
                // NVU doesn't receive close event so we use unload
                hiddenDOMWindow.addEventListener("unload", this, false);
            }
        } else {
            if (this._enabled) { // remove only if is already enabled
                hiddenDOMWindow.removeEventListener("unload", this, false);
            }
        }
        this._enabled = b;
    },

    handleEvent: function(event) {
        this.clean();
    },

    deleteTemporaryFileOnExit : function(file) {
        if (this._enabled) {
            this._tempFileList.push(file);
        }
    },

    clean : function() {
        while (this._tempFileList.length) {
            var file = this._tempFileList.pop();

            try {
                file.remove(false);
            } catch (err) {
                // ignore error
            }
        }
    }
}