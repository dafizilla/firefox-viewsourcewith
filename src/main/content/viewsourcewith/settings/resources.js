/**
 * Author: Davide Ficano
 * Date  : 14-Mar-06
 */
const VSW_DOC_TYPE = 2;

var gVSWResources = {
    resExtensions : [],

    onLoad : function() {
        this.res = window.arguments[0];
        this.prefs = window.arguments[1];

        this.treeViews = new Array();

        this.resExtensions[VSW_STYLE_TYPE] = "css";
        this.resExtensions[VSW_SCRIPT_TYPE] = "js";

        this.initControls();
        sizeToContent();
        if (this.res.doc) {
            document.title += " - " + this.res.doc.title;
        }
    },

    onAccept : function() {
        var isValid = false;

        try {
            this.onViewResources();
        } catch (err) {
            alert("gVSWResources.onAccept: " + err);
        }

        return isValid;
    },

    onViewResources : function() {
        var items = this.treeViews[this.oResourceTabBox.selectedIndex].selectedItems;
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
                                this.prefs.destFolder,
                                this.prefs.tempMaxFilesSamePrefix,
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
        this.oResourceTabBox = document.getElementById("resourceTabBox");
        this.oAllResources = document.getElementById("all-resources");
        this.oCSSResources = document.getElementById("css-resources");
        this.oJSResources = document.getElementById("js-resources");
        this.oEditors = document.getElementById("editors");
        this.oShowAllFrames = document.getElementById("showAllFrames");

        this.initResources();
        this.initValues();
    },

    initValues : function() {
        for (var i = 0; i < this.prefs.editorData.length; i++) {
            var editor = this.prefs.editorData[i];

            this.oEditors.appendItem(editor.description, editor.path);
        }
        this.oEditors.selectedIndex = this.prefs.editorDefaultIndex;

        if (!this.res.hasStyleSheets()) {
            document.getElementById("tab-all").setAttribute("hidden", "true");
            document.getElementById("tab-css").setAttribute("hidden", "true");
            this.oResourceTabBox.selectedIndex = 2;
        }
        if (!this.res.hasScripts()) {
            document.getElementById("tab-all").setAttribute("hidden", "true");
            document.getElementById("tab-js").setAttribute("hidden", "true");
            this.oResourceTabBox.selectedIndex = 1;
        }
    },

    initResources : function() {
        var currentCss = this.createURIArray(this.res.styleSheets.data, VSW_STYLE_TYPE);
        var allCss = this.createURIArray(this.res.allStyleSheets.data, VSW_STYLE_TYPE);

        var currentJs = this.createURIArray(this.res.scripts.data, VSW_SCRIPT_TYPE);
        var allJs = this.createURIArray(this.res.allScripts.data, VSW_SCRIPT_TYPE);

        var allRes = currentCss.concat(currentJs);
        var allFrameRes = allCss.concat(allJs);
        this.allResourcesTreeView = new ResourceTreeView(allRes, allFrameRes);
        this.cssResourcesTreeView = new ResourceTreeView(currentCss, allCss);
        this.jsResourcesTreeView = new ResourceTreeView(currentJs, allJs);
        
        this.docTreeView = new DocumentTreeView([this.createDocumentViewItems(this.res, 0)],
                                                document.getElementById('document-view'));
        this.docTreeView.expandAll();

        this.treeViews.push(this.allResourcesTreeView);
        this.treeViews.push(this.cssResourcesTreeView);
        this.treeViews.push(this.jsResourcesTreeView);
        this.treeViews.push(this.docTreeView);

        this.oAllResources.view = this.allResourcesTreeView;
        this.oCSSResources.view = this.cssResourcesTreeView;
        this.oJSResources.view = this.jsResourcesTreeView;

        this.allResourcesTreeView.sort("name");
        this.cssResourcesTreeView.sort("name");
        this.jsResourcesTreeView.sort("name");

        var hasFrames = this.res.hasFrameStyleSheets()
                        || this.res.hasFrameScripts();
        if (hasFrames) {
            this.oShowAllFrames.addEventListener("CheckboxStateChange",
                                                 this.onShowAllFrame, false);
            this.oShowAllFrames.removeAttribute("hidden");
            document.getElementById('resourcesTabs').addEventListener('select',
                                this.onTabSelect, false);
        }
    },

    createDocumentViewItems : function(res, level) {
        var uriInfo = this.createURIInfo(res.doc.defaultView.location.href, VSW_DOC_TYPE);
        // for the root document and for the frames show the url
        uriInfo.name = uriInfo.url;
        uriInfo.children = [];
        uriInfo.level = level;
        uriInfo.open = false;

        for (var i in res.styleSheets.data) {
            var child = this.createURIInfo(i, VSW_STYLE_TYPE);
            child.level = level + 1;
            uriInfo.children.push(child);
        }
        for (var i in res.scripts.data) {
            var child = this.createURIInfo(i, VSW_SCRIPT_TYPE);
            child.level = level + 1;
            uriInfo.children.push(child);
        }
        for (var i in res.resFrames) {
            uriInfo.children.push(this.createDocumentViewItems(res.resFrames[i], level + 1));
        }
        return uriInfo;
    },

    createURIArray : function(map, resType) {
        var arr = new Array();

        for (var i in map) {
            arr.push(this.createURIInfo(i, resType));
        }

        return arr;
    },

    createURIInfo : function(url, resType) {
        // Ensure local paths are in UTF-8 charset
        var localUrl = ViewSourceWithCommon.getLocalFilePage(url);
        var resPath = localUrl ? localUrl.path : url;

        return { name : this.getName(url),
                   displayPath : resPath,   // is used only to display it
                   url : url,                 // contains the url also file://
                   resType : resType
                 };
    },

    getName : function(str) {
        var uri = Components.classes["@mozilla.org/network/standard-url;1"]
            .createInstance(Components.interfaces.nsIURL);
        uri.spec = str;
        var name = uri.fileName;

        return name ? name : str;
    },

    onShowAllFrame : function (event) {
        var showFrameResources = event.target.checked;

        for (var i = 0; i < gVSWResources.treeViews.length; i++) {
            gVSWResources.treeViews[i].showFrameResources(showFrameResources, true);
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
            var treeView = this.treeViews[this.oResourceTabBox.selectedIndex];
            var selIdx = treeView.selection.currentIndex;
            // double click on container doesn't open the resource
            if (selIdx >= 0 && !treeView.isContainer(selIdx)) {
                document.documentElement.acceptDialog();
            }
        }
    },

    onCopyUrls : function(event) {
        this.treeViews[this.oResourceTabBox.selectedIndex].doCommand('cmd_copy');
    },

    onSelectAll : function(event) {
        this.treeViews[this.oResourceTabBox.selectedIndex].doCommand('cmd_selectAll');
    },
    
    onTabSelect : function(event) {
        if (event.target.selectedItem.id == 'tab-document-view') {
            document.getElementById('showAllFrames').setAttribute('hidden', 'true');
        } else {
            document.getElementById('showAllFrames').removeAttribute('hidden');
        }
    }
}

/**
 * Tree view
 */
function ResourceTreeView(currentItems, frameItems) {
    this.currentItems = currentItems;
    this.frameItems = frameItems;
    this.visibleItems = currentItems;

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

        this.visibleItems.sort(sortByProperty);

        this.refresh();
        this.lastSortDirection = direction;
        this.lastSortProperty = prop;
    },

    get selectedItems() {
        var ar = [];

        for (var i = 0; i < this.visibleItems.length; i++) {
            if (this.selection.isSelected(i)) {
                ar.push(this.visibleItems[i]);
            }
        }

        return ar;
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

        var currRowCount = this.visibleItems.length;
        this.visibleItems = showFrames ? this.frameItems : this.currentItems;
        var addedOrRemovedRows = this.visibleItems.length - currRowCount;
        this.treebox.rowCountChanged(0, addedOrRemovedRows);
        if (refresh) {
            this.refresh();
        }
    },

    copyUrls : function() {
        var items = this.selectedItems;
        var urls = [];
        for (var i in items) {
            urls.push(items[i].url);
        }
        if (urls.length) {
            ViewSourceWithCommon.copyToClipboard(urls.join('\n'));
        }
    },

    getCellText : function(row, column){
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "resource-name":
                return this.visibleItems[row].name;
            case "resource-path":
                return this.visibleItems[row].displayPath;
        }

        return "";
    },

    get rowCount() {
        return this.visibleItems.length;
    },

    cycleCell: function(row, column) {},
    getImageSrc: function (row, column) {
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "resource-name":
                switch (this.visibleItems[row].resType) {
                    case VSW_STYLE_TYPE:
                        return "chrome://viewsourcewith/content/img/res-css.png";
                    case VSW_SCRIPT_TYPE:
                        return "chrome://viewsourcewith/content/img/res-js.png";;
                    case VSW_DOC_TYPE:
                        return "chrome://viewsourcewith/content/img/res-doc.png";
                }
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
    supportsCommand : function(cmd) {
        return cmd == "cmd_selectAll"
            || cmd == "cmd_copy";
    },
    isCommandEnabled : function(cmd) {return true;},
    doCommand : function(cmd) {
        switch (cmd) {
            case "cmd_selectAll":
                this.selection.selectAll();
                break;
            case "cmd_copy":
                this.copyUrls();
                break;
        }
    }
};

/**
 * Document hierarchical Tree view
 */
function DocumentTreeView(items, treeElement) {
    this.items = items;
    this.visibleItems = [];

    this.visibleItems.push(this.items[0]);

    this.treeElement = treeElement;

    this.treebox = null;
    // Must be set after treebox
    this.treeElement.view = this;
}

DocumentTreeView.prototype = new ResourceTreeView();
DocumentTreeView.prototype.constructor = DocumentTreeView;

(function() {
    this.expandAll = function() {
        var traverse = function(items, callback) {
            for (var i in items) {
                var el = items[i];
                callback(el);
                if (el && el.children) {
                    if (el.children.length) {
                        arguments.callee(el.children, callback);
                    }
                }
            }
        };
        var arr = [];
        // make an array from the recursive folder structure
        // the array elements are ordered as expected by treeview
        traverse(this.items, function(uriInfo) {
            uriInfo.open = uriInfo.resType == VSW_DOC_TYPE;
            arr.push(uriInfo);
        });

        var count = this.rowCount;
        this.visibleItems = arr;
        this.treebox.rowCountChanged(0, arr.length - count);
        this.refresh();
    };

    this.getLevel = function(row) {
        return this.visibleItems[row].level;
    };

    this.hasNextSibling = function(idx, after) {
        var thisLevel = this.getLevel(idx);

        for (var t = idx + 1; t < this.visibleItems.length; t++) {
            var nextLevel = this.getLevel(t);
            if (nextLevel == thisLevel) {
                return true;
            } else if (nextLevel < thisLevel) {
                return false;
            }
        }
        return false;
    };

    this.getParentIndex = function(row) {
        if (!this.isContainer(row)) {
            for (var i = row - 1; i >= 0 ; i--) {
                if (this.isContainer(i)) {
                    return i;
                }
            }
        }
        return -1;
    };

    this.isContainer = function(row) {
        return this.visibleItems[row].resType == VSW_DOC_TYPE;
    };

    this.isContainerEmpty = function(row) {
        return this.visibleItems[row].children.length == 0;
    };

    this.isContainerOpen = function(row) {
        return this.visibleItems[row].open;
    };

    this.toggleOpenState = function(row) {
        if (!this.isContainer(row)) {
            return;
        }

        var item = this.visibleItems[row];
        if (item.open) {
            item.open = false;

            var thisLevel = this.getLevel(row);
            var deletecount = 0;
            for (var t = row + 1; t < this.visibleItems.length; t++) {
                if (this.getLevel(t) > thisLevel) {
                    deletecount++;
                }
                else {
                    break;
                }
            }
            if (deletecount) {
                this.visibleItems.splice(row + 1, deletecount);
                this.treebox.rowCountChanged(row + 1, -deletecount);
            }
        } else {
            item.open = true;

            var toinsert = item.children;
            for (var i = 0; i < toinsert.length; i++) {
                toinsert[i].open = false;
                this.visibleItems.splice(row + i + 1, 0, toinsert[i]);
            }
            this.treebox.rowCountChanged(row + 1, toinsert.length);
        }
        this.treebox.invalidateRow(row);
    };

    ///////////
    // Inherited from ResourceTreeView
    ///////////

    this.showFrameResources = function(showFrames, refresh) {
    };

    this.cycleHeader = function(col, elem) {
    };
    //this.__defineGetter__("rowCount", function() {});
    //this.setTree = function(treebox){}
}).apply(DocumentTreeView.prototype);