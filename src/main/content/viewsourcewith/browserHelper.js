/**
 * Author   : Davide Ficano
 * Date     : 06-Mar-05
 * These routines are stolen from contentAreaUtils.js
 */

Components.utils.import("resource://vsw/common.jsm");

function ViewSourceWithBrowserHelper() {
}

ViewSourceWithBrowserHelper.getPostData = function() {
    try {
        var sessionHistory = getWebNavigation().sessionHistory;
        var entry = sessionHistory.getEntryAtIndex(sessionHistory.index, false);
        entry = entry.QueryInterface(Components.interfaces.nsISHEntry);
        return entry.postData;
    } catch (e) {
    }
    return null;
}

ViewSourceWithBrowserHelper.getPageDescriptor = function(aDocument) {
    var webNav;

    // Get the nsIWebNavigation associated with the document
    try {
        // Get the DOMWindow for the requested document.  If the DOMWindow
        // cannot be found, then just use the content window...
        //
        // XXX:  This is a bit of a hack...
        var win = aDocument.defaultView;
        if (win == window) {
            win = content;
        }
        var ifRequestor = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor);

        webNav = ifRequestor.getInterface(nsIWebNavigation);
    } catch(err) {
        // If nsIWebNavigation cannot be found, just get the one for the whole
        // window...
        try {
            webNav = getWebNavigation();
        } catch (err) {
            // falls back on Thunderbird
            return null;
        }
    }
    //
    // Get the 'PageDescriptor' for the current document. This allows the
    // view-source to access the cached copy of the content rather than
    // refetching it from the network...
    //
    try {
        var PageLoader = webNav.QueryInterface(Components.interfaces.nsIWebPageDescriptor);

        return PageLoader.currentDescriptor;
    } catch(err) {
    }

    return null;
}

