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
    isOnBGImage : false,
    isOnMedia : false,

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
        this.isOnBGImage = false;
        this.isOnMedia = false;

        this.isOnTextInput = false;
        this.target = null;

        this.extType = null;
    },

    init : function(document, prefs, editorInfo) {
        this.reset();
        this.doc = document;
        this.url = document.location.href;
        this.prefs = prefs;

        if (!this.contextMenuHandled(prefs)) {
            if (this.doc.contentType &&
                this.doc.contentType.substring(0, 6) == "image/") {
                    this.image = IMAGE_PATH_IMG;
                    this.extType = ViewSourceWithCommon.getMIMEService()
                                .getPrimaryExtension(this.doc.contentType, null);
                    this.isOnImage = true;
            } else {
                this.handleInputText(editorInfo);
            }
        }

        if (!prefs.viewShowMenuIcon) {
            this.image = null;
        }
    },

    contextMenuHandled : function(prefs) {
        var handled = false;

        if (!(typeof gContextMenu == "undefined") && gContextMenu) { // songbird needs typeof usage
            this.isOnLink = gContextMenu.onLink;
            this.isOnImage = gContextMenu.onImage;
            this.isOnBGImage = gContextMenu.hasBGImage && prefs.openBkgImage;
            this.isOnLinkOrImage = this.isOnLink || this.isOnImage || this.isOnBGImage;
            this.isOnTextInput = gContextMenu.onTextInput;
            this.isOnMedia = gContextMenu.onVideo || gContextMenu.onAudio;

            this.target = gContextMenu.target;
            if (this.isOnTextInput) {
                handled = this.handleInputText();
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
                    this.extType = "jpg"; // fake value
                    if (this.isOnImage) {
                        this.url = gContextMenu.imageURL;
                    } else if (this.isOnBGImage) {
                        this.url = gContextMenu.bgImageURL;
                    }
                }
            }
        }
        return handled;
    },

    handleInputText : function(editorInfo) {
        var view;
        
        if (editorInfo) {
            view = editorInfo.textView;
        } else {
            editorInfo = {};
            view = this.findFocusedTextView(null, editorInfo);
        }

        if (view) {
            this.isOnTextInput = true;
            this.image = IMAGE_PATH_TXT;

            if (editorInfo.isHtmlEditor) {
                this.target = ViewSourceWithLinkInfo.createHTMLEditor(
                        editorInfo.htmlEditor, editorInfo.textWindow);
            } else {
                this.target = ViewSourceWithLinkInfo.createInputBoxEditor(
                        editorInfo.textElement);
            }
        } else {
            this.isOnTextInput = false;
        }

        return view != null;
    },

    toString : function () {
        return "doc                = " + this.doc + "\n" +
                "url                = " + this.url + "\n" +
                "image              = " + this.image + "\n" +
                "isOnLink           = " + this.isOnLink + "\n" +
                "isOnImage          = " + this.isOnImage + "\n" +
                "isOnLinkOrImage    = " + this.isOnLinkOrImage +  "\n" +
                "isOnBGImage        = " + this.isOnBGImage  + "\n" +
                "isOnTextInput      = " + this.isOnTextInput  + "\n" +
                "extType            = " + this.extType;
    },

    getContextMenuLinkURL : function() {
        return gContextMenu.linkURL.length
            ? gContextMenu.linkURL : gContextMenu.linkURL();
    },

    findFocusedTextView : function(dispatcher, editorInfo) {
        if (!this.prefs.allowEditText) {
            return null;
        }
        return ViewSourceWithLinkInfo.findFocusedTextView(dispatcher, editorInfo);
    }
}

// From browser.js added PASSWORD check
ViewSourceWithLinkInfo.isTargetATextBox = function(node) {
    if (!node || node.nodeType != Node.ELEMENT_NODE)
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
                (attrib != "BUTTON") &&
                (attrib != "PASSWORD") );
    } else  {
        return(node.localName.toUpperCase() == "TEXTAREA");
    }
}

/**
 * Find the focused nsIDOMAbstractView
 * @param dispatcher the dispatcher to use, if null top.document.commandDispatcher is used
 * @param editorInfo at return time contains info about editbox, null can be passed
 * @returns the view if focused element is text, null otherwise
 * the editorInfo object contains the properties shown below
 *  textWindow      the nsIDOMWindow containing the text box
 *  textElement     the nsIDOMElement corresponding to textWindow
 *  textView        the text nsIDOMAbstractView
 *  htmlEditor      the nsIHTMLEditor object, valid only for htmleditor elements
 *  isHtmlEditor    true if editorInfo refers to an htmlEditor, false otherwise
 */
ViewSourceWithLinkInfo.findFocusedTextView = function(dispatcher, editorInfo) {
    // Use top.document because the passed object
    // should not have commandDispatcher (e.g. HTMLDocument)
    // We must pass the dispatcher because window can't be detected
    // from element because it can be null
    dispatcher = dispatcher || top.document.commandDispatcher;

    var textWindow = dispatcher.focusedWindow;
    var textElement = dispatcher.focusedElement;
    var view = null;
    var htmlEditor = null;
    var isHtmlEditor;

    // Don't get url from browser widgets (e.g. google bar, address bar)
    if ((textWindow && textWindow != window)
        && ViewSourceWithLinkInfo.isTargetATextBox(textElement)) {
        view = textElement.ownerDocument.defaultView;
        isHtmlEditor = false;
    } else {
        // Under FF 3.0 focusedWindow can be null
        if (!textWindow && textElement) {
            textWindow = textElement.ownerDocument.defaultView;
        }

        htmlEditor = ViewSourceWithCommon.getEditorForWindow(textWindow);
        if (htmlEditor) {
            view = htmlEditor.document.defaultView;
            isHtmlEditor = true;
        }
    }

    if (view && editorInfo) {
        editorInfo.textWindow = textWindow;
        editorInfo.textElement = textElement;
        editorInfo.textView = view;
        editorInfo.htmlEditor = htmlEditor;
        editorInfo.isHtmlEditor = isHtmlEditor;
    }

    return view;
}

ViewSourceWithLinkInfo.createHTMLEditor = function(editor, textNode) {
    if ("vswEditor" in textNode) {
        return textNode.vswEditor;
    } else {
        textNode.vswEditor = new HTMLEditor(editor, textNode);
        return textNode.vswEditor;
    }
}

ViewSourceWithLinkInfo.createInputBoxEditor = function(textNode) {
    if ("vswEditor" in textNode) {
        return textNode.vswEditor;
    } else {
        textNode.vswEditor = new InputBoxEditor(textNode);
        return textNode.vswEditor;
    }
}

function BaseEditor(editorNode, fileExtension) {
    this._editorNode = editorNode;
    this._fileExtension = fileExtension;
}

BaseEditor.prototype = {
    get name() {
        var target = this._editorNode;
        var controlName = "";

        if (target.name) {
            controlName += target.name;
        }
        if (target.id && target.id != controlName) {
            controlName += target.id;
        }

        return controlName;
    },

    get fileExtension() {
        return this._fileExtension;
    }
}

HTMLEditor.prototype = new BaseEditor();

function HTMLEditor(editorNode, window) {
    BaseEditor.call(this, editorNode, ".html");
    this._bodyTag = this._editorNode.rootElement;
    this._window = window;

    if (this._getMimeType() == "text/plain") {
        this._fileExtension = ".txt";
    }
}

(function() {
    this.__defineGetter__("document", function() {
        return this._editorNode.document;
    })

    this.__defineGetter__("value", function() {
        // http://www.xulplanet.com/references/xpcomref/ifaces/nsIEditor.html
        // The contributor section contains the whole flags list
        return this._editorNode.outputToString(this._getMimeType(),
                                               Components.interfaces.nsIEditor.eNone);
    })

    this.__defineSetter__("value", function(value) {
        if (this._getMimeType() == "text/html") {
            this._editorNode.rebuildDocumentFromSource(value);
        } else {
            this._editorNode.selectAll();
            this._editorNode
                .QueryInterface(Components.interfaces.nsIPlaintextEditor)
                .insertText(value);
        }
    })

    this.getAttribute = function(attrName) {
        var str = {};

        return this._editorNode.getAttributeValue(this._bodyTag, attrName, str) ? str.value : null;
    }

    this.setAttribute = function(attrName, attrValue) {
        this._editorNode.setAttribute(this._bodyTag, attrName, attrValue);
        // Every time the setAttribute is called the modification
        // count is incremented so we reset it
        this._editorNode.resetModificationCount();
    }

    this.removeAttribute = function(attrName) {
        this._editorNode.removeAttribute(this._bodyTag, attrName);
    }

    this.setModified = function(isModified) {
        if (isModified) {
            this._editorNode.incrementModificationCount(this._editorNode.getModificationCount() + 1);
        } else {
            this._editorNode.resetModificationCount();
        }
    }

    this.isModified = function() {
        return this._editorNode.getModificationCount() != 0;
    }

    this.addEventListener = function(type, listener, useCapture) {
        this._window.addEventListener(type, listener, useCapture);
    }

    this.listenModification = function() {}

    this.stopListenModification = function() {}

    this._getMimeType = function() {
        // test if we are under email client
        if (typeof gMsgCompose == "undefined") {
            return this._editorNode.contentsMIMEType;
        } else {
            if (gMsgCompose.composeHTML) {
                return "text/html";
            } else {
                return "text/plain";
            }
        }
    }

}).apply(HTMLEditor.prototype);


function InputBoxEditor(editorNode) {
    BaseEditor.call(this, editorNode, ".txt");
    this._isModified = false;
}

InputBoxEditor.prototype = new BaseEditor();

(function() {
    this.__defineGetter__("document", function() {
        // always uses the target owner document so inside different
        // frameset the elements with same id are correctly handled
        return this._editorNode.ownerDocument;
    })

    this.__defineGetter__("value", function() {
        return this._editorNode.value;
    })

    this.__defineSetter__("value", function(value) {
        this._editorNode.value = value;
    })

    this.getAttribute = function(attrName) {
        return this._editorNode.getAttribute(attrName);
    }

    this.setAttribute = function(attrName, attrValue) {
        this._editorNode.setAttribute(attrName, attrValue);
    }

    this.removeAttribute = function(attrName) {
        this._editorNode.removeAttribute(attrName);
    }

    this.setModified = function(isModified) {
        this._isModified = isModified;
    }

    this.isModified = function() {
        return this._isModified;
    }

    this.addEventListener = function(type, listener, useCapture) {
        this._editorNode.addEventListener(type, listener, useCapture);
    }

    this.listenModification = function() {
        this._editorNode.addEventListener("input", this, true);
    }

    this.stopListenModification = function() {
        this._editorNode.removeEventListener("input", this, true);
    }

    this.handleEvent = function(event) {
        this._isModified = true;
    }
}).apply(InputBoxEditor.prototype);

