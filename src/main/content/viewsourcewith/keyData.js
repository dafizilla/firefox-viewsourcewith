KeyData.localeKeys = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://global/locale/keys.properties");

KeyData.VKNames = [];

for (var property in KeyEvent) {
    KeyData.VKNames[KeyEvent[property]] = property.replace("DOM_","");
}
KeyData.VKNames[8] = "VK_BACK";

KeyData.getStringFromVK = function(keyCode) {
    if (keyCode) {
        var k = KeyData.VKNames[keyCode];
        if (k) {
            return KeyData.localeKeys.GetStringFromName(k);
        }
    }
    return "";
}

KeyData.fromAttributes = function(attributes) {
    var kd = new KeyData();

    for (var i = 0, j = attributes.length; i < j; i++) {
        var n = attributes.item(i);

        if (n.nodeName == "accel") {
            kd.accel = ViewSourceWithCommon.isTrue(n.nodeValue);
        } else if (n.nodeName == "keyCode") {
            kd.keyCode = KeyEvent["DOM_" + n.nodeValue];
        } else if (n.nodeName == "key") {
            kd.key = n.nodeValue.charCodeAt(0);
        } else if (n.nodeName == "shift") {
            kd.shift = ViewSourceWithCommon.isTrue(n.nodeValue);
        }
    }

    return kd.isValid() ? kd : null;
}

KeyData.fromEvent = function(event, keyData) {
    if (keyData) {
        keyData.key = null;
        keyData.keyCode = null;
    } else {
        keyData = new KeyData();
    }
    if (event.charCode) {
        keyData.key = event.charCode;
    } else {
        keyData.keyCode = event.keyCode;
    }
    return keyData;
}

function KeyData() {
    this._key = null;
    this._keyAsText = "";

    this._keyCode = null;
    this._keyCodeAsText = "";

    this._accel = null;
    this._shift = null;
}

KeyData.prototype = {
    copy : function(keyData) {
        this._key = keyData._key;
        this._keyAsText = keyData._keyAsText;

        this._keyCode = keyData._keyCode;
        this._keyCodeAsText = keyData._keyCodeAsText;

        this._accel = keyData._accel;
        this._shift = keyData._shift;
    },

    get key() {
        return this._key;
    },

    set key(v) {
        this._key = v;
        this._keyAsText = String.fromCharCode(this._key).toUpperCase();
    },

    get keyAsText() {
        return this._keyAsText;
    },

    get keyCode() {
        return this._keyCode;
    },

    set keyCode(v) {
        this._keyCode = v;
        this._keyCodeAsText = KeyData.getStringFromVK(this._keyCode);
    },

    get keyCodeAsText() {
        return this._keyCodeAsText;
    },

    get accel() {
        return this._accel;
    },

    set accel(v) {
        this._accel = v;
    },

    get shift() {
        return this._shift;
    },

    set shift(v) {
        this._shift = v;
    },

    get modifiers() {
        var s = "";

        if (this._accel) s += "accel,";
        if (this._shift) s += "shift,";

        return s;
    },

    showKeyName : function() {
        return this._key ? this._keyAsText : this._keyCodeAsText;
    },

    isValid : function() {
        return this._key || this._keyCode;
    },

    toString : function() {
        return "key = " + this._key + " keyCode = " + this._keyCode
                + " modifiers = " + this.modifiers;
    },
    
    keyToString : function() {
        return this._key ? this.keyAsText : this.keyCodeAsText;
    }
}

KeyData.toXml = function(keyData) {
    var tag = '<key';

    if (keyData.key) {
        tag += ' key="' + keyData.keyAsText + '"';
    } else {
        tag += ' keyCode="' + KeyData.VKNames[keyData.keyCode] + '"';
    }
    if (keyData.accel) {
        tag += ' accel="' + (keyData.accel ? "Y" : "N") + '"';
    }
    if (keyData.shift) {
        tag += ' shift="' + (keyData.shift ? "Y" : "N") + '"';
    }

    tag += "/>";
    return tag;
}

KeyData.setKeyTag = function(keyData, keyNode) {
    if (!keyData || !keyNode) return;

    if (keyData.key) {
        keyNode.setAttribute("key", keyData.keyAsText);
        keyNode.removeAttribute("keycode");
    } else {
        keyNode.setAttribute("keycode", KeyData.VKNames[keyData.keyCode]);
        keyNode.removeAttribute("key");
    }
    keyNode.setAttribute("modifiers", keyData.modifiers);
}
