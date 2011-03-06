/**
 * Author   : Davide Ficano
 * Date     : 27-Jul-07 Allow to access to hiddenDOMWindow using singletons
 * Date     : 04-Apr-08 Added Firefox 3 support using FUEL (hiddenDOMWindow removal)
 */
Components.utils.import("resource://vsw/common.jsm");

var viewSourceWithFactory = {
    getPrefsInstance: function() {
        var prefs = this.getSharedValue("Prefs", null);
        if (prefs == null) {
            prefs = new ViewSourceWithPrefs();
            try {
                prefs.readPrefs(null);
                this.setSharedValue("Prefs", prefs);
            } catch (err) {
                ViewSourceWithCommon.log("viewSourceWithFactory: Error while opening config file: " + err);
            }
        }
        var newPrefs = new ViewSourceWithPrefs();
        newPrefs.copy(prefs);
        return newPrefs;
    },

    resetPrefsInstance : function() {
        this.setSharedValue("Prefs", null);
    },

    getTempCleaner : function() {
        var cleaner = this.getSharedValue("TempCleaner", null);
        if (cleaner == null) {
            cleaner = new ViewSourceWithTempCleaner();
            this.setSharedValue("TempCleaner", cleaner);
        }
        return cleaner;
    },

    getSharedValue : function(key, defaultValue) {
        if (typeof(Application) != "undefined") {
            var value = Application.storage.get(key, null);
            if (!value) {
                value = defaultValue;
            }
            return value;
        }
        var app = Components.classes["@mozilla.org/appshell/appShellService;1"]
                  .getService(Components.interfaces.nsIAppShellService);
        if (("viewSourceWith" + key) in app.hiddenDOMWindow) {
            return app.hiddenDOMWindow["viewSourceWith" + key];
        }
        return defaultValue;
    },

    setSharedValue : function(key, value) {
        if (typeof(Application) != "undefined") {
            Application.storage.set(key, value);
        } else {
            var app = Components.classes["@mozilla.org/appshell/appShellService;1"]
                        .getService(Components.interfaces.nsIAppShellService);
            app.hiddenDOMWindow["viewSourceWith" + key] = value;
        }
    }
}

