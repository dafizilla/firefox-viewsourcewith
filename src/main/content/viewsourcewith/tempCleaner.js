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
    return viewSourceWithFactory.getTempCleaner();
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
        if (b) {
            if (!this._enabled) { // add only if is not already enabled
                var obs = ViewSourceWithCommon.getObserverService();
                obs.addObserver(this, "quit-application", false);
            }
        } else {
            if (this._enabled) { // remove only if is already enabled
                var obs = ViewSourceWithCommon.getObserverService();
                obs.removeObserver(this, "quit-application");
            }
        }
        this._enabled = b;
    },

    observe : function(subject, topic, data) {
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
