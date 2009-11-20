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
    }
};

ViewSourceUrlMapperData.matchFilter = function(urlMapperData, url) {
    if (urlMapperData.domainFilter == "") {
        return false;
    }
    if (urlMapperData._re == null) {
        urlMapperData._re = new RegExp(urlMapperData.domainFilter);
    }
    return urlMapperData._re.test(url);
}

ViewSourceUrlMapperData.getDefaultJSCode = function() {
    var httpReq = new XMLHttpRequest();
    httpReq.open("GET", "chrome://viewsourcewith/content/jstempl.js", false);
    // Set mimetype to make happy XMLHttpRequest, see bug 384298
    httpReq.overrideMimeType("text/plain"); 
    httpReq.send(null);

    return httpReq.responseText;
}