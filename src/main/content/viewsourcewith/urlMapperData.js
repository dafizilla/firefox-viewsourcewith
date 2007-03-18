/**
 * Author   : Davide Ficano
 * Date     : 26-Nov-05
 */

function ViewSourceUrlMapperData() {
    this._name = "";
    this._domainFilter = "";
    this._localPath = "";
    this._enabled = true;
    this._jsCode = "";
    this._re = null;
}

ViewSourceUrlMapperData.prototype = {
    get name() {
        return this._name;
    },

    set name(v) {
        this._name = v;
    },

    get domainFilter() {
        return this._domainFilter;
    },

    set domainFilter(v) {
        this._re = null;
        this._domainFilter = v;
    },

    get localPath() {
        return this._localPath;
    },

    set localPath(v) {
        this._localPath = v;
    },

    get enabled() {
        return this._enabled;
    },

    set enabled(v) {
        this._enabled = v;
    },

    get jsCode() {
        return this._jsCode;
    },

    set jsCode(v) {
        this._jsCode = v;
    },

    matchFilter : function(url) {
        if (this.domainFilter == "") {
            return false;
        }
        if (this._re == null) {
            this._re = new RegExp(this.domainFilter);
        }
        return this._re.test(url);
    }
};
