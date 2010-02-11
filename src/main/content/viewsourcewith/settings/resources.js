/**
 * Author: Davide Ficano
 * Date  : 14-Mar-06
 */
var gVSWResources = {
    resExtensions : [],

    onLoad : function() {
        gVSWResources.res = window.arguments[0];
        gVSWResources.prefs = window.arguments[1];

        gVSWResources.treeViews = new Array();

        this.resExtensions[VSW_STYLE_TYPE] = "css";
        this.resExtensions[VSW_SCRIPT_TYPE] = "js";

        gVSWResources.initControls();
        sizeToContent();
        if (gVSWResources.res.doc) {
            document.title += " - " + gVSWResources.res.doc.title;
        }
    },

    onAccept : function() {
        var isValid = false;
        var thiz = gVSWResources;

        try {
            thiz.onViewResources();
        } catch (err) {
            alert("gVSWResources.onAccept: " + err);
        }

        return isValid;
    },

    onViewResources : function() {
        var thiz = gVSWResources;

        var items = thiz.treeViews[thiz.oResourceTabBox.selectedIndex].selectedItems;
        var urls = new Array();
        var fileNames = new Array();
        var cleaner = viewSourceWithFactory.getTempCleaner();

        for (var i = 0; i < items.length; i++) {
            var resUrl = items[i].url;
            urls.push(resUrl);

            // local files must be read from their original disk position
            var filePath = ViewSourceWithCommon.getLocalFilePage(resUrl);
            if (!filePath) {
                var ext = this.resExtensions[items[i].resType];

                // Create a copy on temporary directory
                filePath = ViewSourceWithCommon.initFileToRun(
                                ViewSourceWithCommon.getDocumentFileName(resUrl, ext),
                                thiz.prefs.destFolder,
                                thiz.prefs.tempMaxFilesSamePrefix,
                                true,
                                cleaner);
            }

            fileNames.push(filePath);
        }

        var ud = new UrlDownloader();
        ud.onFinish = this.onOpenResources;
        ud.saveURIList(urls, fileNames);
    },

    initControls : function() {
        var thiz = gVSWResources;

        thiz.oResourceTabBox = document.getElementById("resourceTabBox");
        thiz.oAllResources = document.getElementById("all-resources");
        thiz.oCSSResources = document.getElementById("css-resources");
        thiz.oJSResources = document.getElementById("js-resources");
        thiz.oEditors = document.getElementById("editors");
        thiz.oShowAllFrames = document.getElementById("showAllFrames");

        thiz.initResources();
        thiz.initValues();
    },

    initValues : function() {
        var thiz = gVSWResources;

        for (var i = 0; i < thiz.prefs.editorData.length; i++) {
            var editor = thiz.prefs.editorData[i];

            thiz.oEditors.appendItem(editor.description, editor.path);
        }
        thiz.oEditors.selectedIndex = thiz.prefs.editorDefaultIndex;

        if (!thiz.res.hasStyleSheets()) {
            document.getElementById("tab-all").setAttribute("hidden", "true");
            document.getElementById("tab-css").setAttribute("hidden", "true");
            thiz.oResourceTabBox.selectedIndex = 2;
        }
        if (!thiz.res.hasScripts()) {
            document.getElementById("tab-all").setAttribute("hidden", "true");
            document.getElementById("tab-js").setAttribute("hidden", "true");
            thiz.oResourceTabBox.selectedIndex = 1;
        }
    },

    initResources : function() {
        var thiz = gVSWResources;

        var currentCss = thiz.createURIArray(thiz.res.styleSheets.data, VSW_STYLE_TYPE);
        var allCss = thiz.createURIArray(thiz.res.allStyleSheets.data, VSW_STYLE_TYPE);

        var currentJs = thiz.createURIArray(thiz.res.scripts.data, VSW_SCRIPT_TYPE);
        var allJs = thiz.createURIArray(thiz.res.allScripts.data, VSW_SCRIPT_TYPE);

        var allRes = currentCss.concat(currentJs);
        var allFrameRes = allCss.concat(allJs);
        thiz.allResourcesTreeView = new ResourceTreeView(allRes, allFrameRes);
        thiz.cssResourcesTreeView = new ResourceTreeView(currentCss, allCss);
        thiz.jsResourcesTreeView = new ResourceTreeView(currentJs, allJs);

        thiz.treeViews.push(thiz.allResourcesTreeView);
        thiz.treeViews.push(thiz.cssResourcesTreeView);
        thiz.treeViews.push(thiz.jsResourcesTreeView);

        thiz.oAllResources.view = thiz.allResourcesTreeView;
        thiz.oCSSResources.view = thiz.cssResourcesTreeView;
        thiz.oJSResources.view = thiz.jsResourcesTreeView;

        thiz.allResourcesTreeView.sort("name");
        thiz.cssResourcesTreeView.sort("name");
        thiz.jsResourcesTreeView.sort("name");

        var hasFrames = thiz.res.hasFrameStyleSheets()
                        || thiz.res.hasFrameScripts();
        if (hasFrames) {
            thiz.oShowAllFrames.addEventListener("CheckboxStateChange",
                                                 thiz.onShowAllFrame, false);
            thiz.oShowAllFrames.removeAttribute("hidden");
        }
    },

    createURIArray : function(map, resType) {
        var thiz = gVSWResources;
        var arr = new Array();

        for (var i in map) {
            // Ensure local paths are in UTF-8 charset
            var localUrl = ViewSourceWithCommon.getLocalFilePage(i);
            var resPath;
            if (localUrl) {
                resPath = localUrl.path;
            } else {
                resPath = i;
            }

            arr.push({ name : thiz.getName(i),
                       displayPath : resPath,   // is used only to display it
                       url : i,                 // contains the url also file://
                       resType : resType
                     });
        }

        return arr;
    },

    getName : function(str) {
        var lastPos = str.lastIndexOf("/");

        return str.substr(lastPos + 1, str.length);
    },

    onShowAllFrame : function (event) {
        var thiz = gVSWResources;
        var showFrameResources = event.target.checked;

        for (var i = 0; i < thiz.treeViews.length; i++) {
            thiz.treeViews[i].showFrameResources(showFrameResources, true);
        }
    },

    onOpenResources : function(urls, outFiles) {
        var thiz = gVSWResources;
        var pageHandler = new VswServerPagesHandler();

        pageHandler.runEditor(urls,
                              outFiles,
                              thiz.prefs.urlMapperData,
                              thiz.prefs.editorData[thiz.oEditors.selectedIndex]);
    },

    onDblClick : function(event) {
        if (event.button == 0) {
            document.documentElement.acceptDialog();
        }
    }
}

/**
 * Tree view
 */
function ResourceTreeView(currentItems, frameItems) {
    this.currentItems = currentItems;
    this.frameItems = frameItems;
    this.items = currentItems;

    this.treebox = null;
    this.lastSortProperty = "";
    this.lastSortDirection = 1; // 1 ascending, -1 descending
    this.showFrames = false;
}

ResourceTreeView.prototype = {

    invalidate : function() {
        this.treebox.invalidate();
    },

    sort : function (prop) {
        var direction = (prop == this.lastSortProperty) ? -this.lastSortDirection : 1;

        function sortByProperty(a, b) {
            if (a["resType"] != b["resType"]) {
                return a["resType"] - b["resType"];
            }
            return direction * a[prop].toLowerCase().localeCompare(b[prop].toLowerCase());
        }

        this.items.sort(sortByProperty);

        this.refresh();
        this.lastSortDirection = direction;
        this.lastSortProperty = prop;
    },

    get selectedItems() {
        var ar = [];

        for (var i = 0; i < this.items.length; i++) {
            if (this.selection.isSelected(i)) {
                ar.push(this.items[i]);
            }
        }

        return ar;
    },

    removeAllItems : function() {
        this.selection.clearSelection();
    },

    refresh : function() {
        this.selection.clearSelection();
        this.selection.select(0);
        this.treebox.invalidate();
        this.treebox.ensureRowIsVisible(0);
    },

    showFrameResources : function(showFrames, refresh) {
        if (showFrames == this.showFrames) {
            return;
        }
        this.showFrames = showFrames;

        var currRowCount = this.items.length;
        this.items = showFrames ? this.frameItems : this.currentItems;
        var addedOrRemovedRows = this.items.length - currRowCount;
        this.treebox.rowCountChanged(0, addedOrRemovedRows);
        if (refresh) {
            this.refresh();
        }
    },

    getCellText : function(row, column){
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "resource-name":
                return this.items[row].name;
            case "resource-path":
                return this.items[row].displayPath;
        }

        return "";
    },

    get rowCount() {
        return this.items.length;
    },

    cycleCell: function(row, column) {},

    getImageSrc: function (row, column) {
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "resource-name":
                return this.items[row].resType == VSW_STYLE_TYPE
                    ? "chrome://viewsourcewith/content/img/res-css.png"
                    : "chrome://viewsourcewith/content/img/res-js.png";
                break;
        }
        return null;
    },

    setTree: function(treebox){
        if (treebox) {
            treebox.treeBody.parentNode.controllers.appendController(this);
        }
        this.treebox = treebox;
    },

    cycleHeader: function(col, elem) {
        if (col.id || col) {
            elem = col.element;
        }

        var direction = elem.getAttribute("sortDirection") == "ascending"
            ? "descending" : "ascending";
        var columns = this.treebox.firstChild.childNodes;
        for (var i = 0, l = columns.length; i < l; i++) {
          columns[i].setAttribute("sortDirection", "none");
          columns[i].setAttribute("sortActive", "false");
        }

        elem.setAttribute("sortDirection", direction);
        elem.setAttribute("sortActive", "true");
    },

    isContainerOpen : function(index) {},
    isContainerEmpty : function(index) {},
    canDrop : function(index, orientation, dataTransfer) {},
    drop : function(row, orientation, dataTransfer) {},
    getParentIndex : function(rowIndex) {},
    hasNextSibling : function(rowIndex, afterIndex) {},
    getProgressMode : function(row, col) {},
    getCellValue : function(row, col) {},
    toggleOpenState : function(index) {},
    selectionChanged : function() {},
    isEditable : function(row, col) {},
    isSelectable : function(row, col) {},
    setCellValue : function(row, col, value) {},
    setCellText : function(row, col, value) {},
    performAction : function(action) {},
    performActionOnRow : function(action, row) {},
    performActionOnCell : function(action, row, col) {},
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(row){ return false; },
    getLevel: function(row){ return 0; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){},

    onEvent : function(evt) {},
    supportsCommand : function(cmd) {return cmd == "cmd_selectAll";},
    isCommandEnabled : function(cmd) {return true;},
    doCommand : function(cmd) {
        if (cmd == "cmd_selectAll") {
            this.selection.selectAll();
        }
    }
};