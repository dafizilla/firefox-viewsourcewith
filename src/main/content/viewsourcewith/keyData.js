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

    toXml : function() {
        var tag = '<key';

        if (this._key) {
            tag += ' key="' + this._keyAsText + '"';
        } else {
            tag += ' keyCode="' + KeyData.VKNames[this._keyCode] + '"';
        }
        if (this._accel) {
            tag += ' accel="' + (this._accel ? "Y" : "N") + '"';
        }
        if (this._shift) {
            tag += ' shift="' + (this._shift ? "Y" : "N") + '"';
        }

        tag += "/>";
        return tag;
    },

    setKeyTag : function(keyNode) {
        if (this._key) {
            keyNode.setAttribute("key", this._keyAsText);
        } else {
            keyNode.setAttribute("keycode", KeyData.VKNames[this._keyCode]);
        }
        keyNode.setAttribute("modifiers", this.modifiers);
    }
}