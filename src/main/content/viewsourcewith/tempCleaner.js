/**
 * Author   : Davide Ficano
 * Date     : 28-May-05
 * Date     : 11-Jun-05 Added support for NVU and Moz. They don't
 *                      support quit-application-notification
 */

// static method
ViewSourceWithTempCleaner.getTempCleaner = function() {
    var app = Components.classes["@mozilla.org/appshell/appShellService;1"]
              .getService(Components.interfaces.nsIAppShellService);
    var cleaner = app.hiddenDOMWindow.viewSourceWithCleaner;

    if (cleaner == undefined) {
        // Create the singleton
        cleaner = new ViewSourceWithTempCleaner();
        app.hiddenDOMWindow.viewSourceWithCleaner = cleaner;
    }

    return cleaner;
}

ViewSourceWithTempCleaner.getWindowType = function(w) {
    try {
        var domWin = w.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
        return domWin.document.documentElement.getAttribute("windowtype");
    } catch (err) {
        return "";
    }
}

function ViewSourceWithTempCleaner() {
    this._enabled = false;
    this._windowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                            .getService(Components.interfaces.nsIWindowMediator);
    this._tempFileList = new Array();

    // Hold the application's window type.
    // Every application uses its own windowtype so we determine it at runtime.
    // NVU      composer:html
    // Firefox  navigator:browser
    // TB       mail:3pane
    this._windowType = ViewSourceWithTempCleaner.getWindowType(window);
}

ViewSourceWithTempCleaner.prototype = {
    get enabled() {
        return this._enabled;
    },

    set enabled(b) {
        if (b) {
            if (!this._enabled) { // add only if is not already enabled
                // NVU doesn't receive close event so we use unload
                window.addEventListener("unload", this, false);
            }
        } else {
            if (this._enabled) { // remove only if is already enabled
                window.removeEventListener("unload", this, false);
            }
        }
        this._enabled = b;
    },

    handleEvent: function(event) {
         if (this.isLastBrowserWindow(window)) {
            this.clean();
        }
    },

    isLastBrowserWindow: function(win) {
        var e = this._windowMediator.getEnumerator(this._windowType);
        var count = 0;

        while (e.hasMoreElements()) {
            var ew = e.getNext();

            if (win != ew) {
                ++count;
            }
        }

        return count == 0;
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