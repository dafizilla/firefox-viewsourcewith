/**
 * Author   : Davide Ficano
 * Hold information about link
 * Date     : 30-Apr-2005
 * Date     : 12-Mar-2007 added support for rich editors (e.g. GMail)
 */

const IMAGE_PATH_IMG = "chrome://viewsourcewith/content/img/ctx/img16.png";
const IMAGE_PATH_LNK = "chrome://viewsourcewith/content/img/ctx/lnk16.png";
const IMAGE_PATH_TXT = "chrome://viewsourcewith/content/img/ctx/txt16.png";

function ViewSourceWithLinkInfo() {
}

ViewSourceWithLinkInfo.prototype = {
    doc    : null,
    url : null,
    image : null,

    isOnLink : false,
    isOnImage : false,
    isOnLinkOrImage : false,

    isOnTextInput : false,
    target : null,
    text : null,

    extType : null,

    reset : function() {
        this.doc = null;
        this.url = null;
        this.image = null;

        this.isOnLink = false;
        this.isOnImage = false;
        this.isOnLinkOrImage = false;

        this.isOnTextInput = false;
        this.text = null;
        this.target = null;

        this.extType = null;
    },

    init : function(document, prefs) {
        this.reset();
        this.doc = document;
        this.url = document.location.href;

        if (!this.contextMenuHandled(prefs)) {
            if (this.doc.contentType &&
                this.doc.contentType.substring(0, 6) == "image/") {
                    this.image = IMAGE_PATH_IMG;
                    this.extType = ViewSourceWithCommon.getMIMEService()
                                .getPrimaryExtension(this.doc.contentType, null);
                    this.isOnImage = true;
            } else {
                // Use top.document because the passed object
                // should not have commandDispatcher (e.g. HTMLDocument)
                var focusedWindow = top.document.commandDispatcher.focusedWindow;

                // Don't get url from browser widgets (e.g. google bar, address bar)
                if (focusedWindow != window) {
                    var focusedNode = top.document.commandDispatcher.focusedElement;
                    if (focusedNode && this.isTargetATextBox(focusedNode)) {
                        this.target = focusedNode;
                        this.handleTextInput(focusedNode);
                    } else {
                        if (ViewSourceWithCommon.getEditorForWindow(focusedWindow)) {
                            this.target = focusedWindow;
                            this.isOnTextInput = true;
                            this.image = IMAGE_PATH_TXT;
                        }
                    }
                }
            }
        }

        if (!prefs.viewShowMenuIcon) {
            this.image = null;
        }
    },

    contextMenuHandled : function(prefs) {
        var handled = false;

        if (gContextMenu) {
            this.isOnLink = gContextMenu.onLink;
            this.isOnImage = gContextMenu.onImage;
            this.isOnLinkOrImage = this.isOnLink || this.isOnImage;
            this.isOnTextInput = gContextMenu.onTextInput;

            this.target = gContextMenu.target;
            if (this.isOnTextInput) {
                if (this.target.ownerDocument
                    && this.target.ownerDocument.defaultView
                    && ViewSourceWithCommon.getEditorForWindow(this.target.ownerDocument.defaultView)) {
                    this.target = this.target.ownerDocument.defaultView;
                    this.image = IMAGE_PATH_TXT;
                    handled = true;
                } else {
                    handled = this.handleTextInput(this.target);
                }
            } else if (this.isOnLinkOrImage) {
                handled = true;
                if (this.isOnLink) {
                    if (this.isOnImage && prefs.openImageOnLink) {
                        this.image = IMAGE_PATH_IMG;
                        this.url = gContextMenu.imageURL;
                        this.extType = "jpg"; // fake value
                    } else {
                        this.image = IMAGE_PATH_LNK;
                        this.url = this.getContextMenuLinkURL();
                    }
                } else {
                    this.image = IMAGE_PATH_IMG;
                    this.url = gContextMenu.imageURL;
                    this.extType = "jpg"; // fake value
                }
            }
        }

        return handled;
    },

    handleTextInput : function(node) {
        var handled = false;
        var type = node.getAttribute("type");

        var isPassword = type && type.toUpperCase() == "PASSWORD";
        this.isOnTextInput = !isPassword;

        if (this.isOnTextInput) {
            handled = true;
            this.image = IMAGE_PATH_TXT;
            this.text = node.value;
        }

        return handled;
    },

    // From browser.js
    isTargetATextBox : function(node) {
        if (node.nodeType != Node.ELEMENT_NODE)
            return false;

        if (node.localName.toUpperCase() == "INPUT") {
            var attrib = "";
            var type = node.getAttribute("type");

            if (type)
                attrib = type.toUpperCase();

            return( (attrib != "IMAGE") &&
                    (attrib != "CHECKBOX") &&
                    (attrib != "RADIO") &&
                    (attrib != "SUBMIT") &&
                    (attrib != "RESET") &&
                    (attrib != "FILE") &&
                    (attrib != "HIDDEN") &&
                    (attrib != "RESET") &&
                    (attrib != "BUTTON") );
        } else  {
            return(node.localName.toUpperCase() == "TEXTAREA");
        }
    },

    toString : function () {
        return "doc                = " + this.doc + "\n" +
                "url                = " + this.url + "\n" +
                "image              = " + this.image + "\n" +
                "isOnLink           = " + this.isOnLink + "\n" +
                "isOnImage          = " + this.isOnImage + "\n" +
                "isOnLinkOrImage    = " + this.isOnLinkOrImage +  "\n" +
                "isOnTextInput      = " + this.isOnTextInput  + "\n" +
                "text               = " + this.text  + "\n" +
                "extType            = " + this.extType;
    },

    getContextMenuLinkURL : function() {
        return gContextMenu.linkURL.length
            ? gContextMenu.linkURL : gContextMenu.linkURL();
    }
}

