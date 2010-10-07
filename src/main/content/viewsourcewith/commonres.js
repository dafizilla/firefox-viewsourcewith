const VSW_STYLE_TYPE = 0;
const VSW_SCRIPT_TYPE = 1;

function MapData() {
    this.data = new Array();
    this.length = 0;
}

function Resources(doc) {
    this.doc = doc;

    // hold the elements for the passed doc
    this.styleSheets = new MapData();
    // hold the elements for all frame documents (if any)
    // duplicated urls are not present (eg two frames importing same css)
    this.allStyleSheets = new MapData();

    this.scripts = new MapData();
    this.allScripts = new MapData();
    this.resFrames = [];
    this.alreadyInitialized = false;
}

Resources.prototype = {
    init : function() {
        if (!this.doc || this.alreadyInitialized) {
            return;
        }
        this.getStyleSheets(this.doc, this.styleSheets);
        this.getScripts(this.doc, this.scripts);

        var frames = this.doc.defaultView.frames;

        for (var i = 0; i < frames.length; i++) {
            var frameDoc = frames[i].document;

            this.getStyleSheets(frameDoc, this.allStyleSheets);
            this.getScripts(frameDoc, this.allScripts);

            var resFrame = new Resources(frameDoc);
            resFrame.init();
            this.resFrames.push(resFrame);
        }
        this.alreadyInitialized = true;
    },

    getStyleSheets : function(doc, map) {
        if (!doc) {
            return;
        }
        var links = doc.styleSheets;
        var loc = doc.location;

        for (var i = 0; i < links.length; i++) {
            // Determine if href is an external url.
            // If href matches with location is external
            if (links[i].type == "text/css"
                && links[i].href != loc) {
                this._incMap(map, links[i].href);
            }

            var rules = links[i].cssRules;
            for (var r = 0; r < rules.length; r++) {
                if (rules[r].type == CSSRule.IMPORT_RULE) {
                    this._incMap(map, rules[r].styleSheet.href);
                }
            }
        }
    },

    getScripts : function(doc, map) {
        if (!doc) {
            return;
        }
        var scripts = doc.getElementsByTagName('script');

        for (var i = 0; i < scripts.length; i++) {
            this._incMap(map, scripts[i].src);
        }
    },

    _incMap : function(map, value) {
        if (value) {
            if (map.data[value]) {
                ++map.data[value];
            } else {
                map.data[value] = 1;
                ++map.length;
            }
        }
    },

    hasStyleSheets : function() {
        return this.styleSheets.length > 0
               || this.allStyleSheets.length > 0;
    },

    hasScripts : function() {
        return this.scripts.length > 0
               || this.allScripts.length > 0;
    },

    hasFrameStyleSheets : function() {
        return this.allStyleSheets.length > 0;
    },

    hasFrameScripts : function() {
        return this.allScripts.length > 0;
    },

    getStyleSheetsAsArray : function() {
        return this.pushMapToArray(this.styleSheets.data, new Array());
    },

    getAllStyleSheetsAsArray : function() {
        return this.pushMapToArray(this.allStyleSheets.data, new Array());
    },

    getScriptsAsArray : function() {
        return this.pushMapToArray(this.scripts.data, new Array());
    },

    getAllScriptsAsArray : function() {
        return this.pushMapToArray(this.allScripts.data, new Array());
    },

    pushMapToArray : function(map, arr) {
        for (var i in map) {
            arr.push(i);
        }

        return arr;
    }
}