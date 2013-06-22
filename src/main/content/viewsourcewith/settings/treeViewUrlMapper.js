/**
 * Author   : Davide Ficano
 * Date     : 26-Nov-2005
 */
function TreeViewUrlMapper(items) {
    this.items = items;
    this.treebox = null;
    this.selection = null;
}

TreeViewUrlMapper.prototype = {

    invalidate : function() {
        this.treebox.invalidate();
    },

    swap : function(idx1, idx2) {
        if ((idx1 == idx2) || (idx1 < 0) || (idx2 < 0)) {
            return;
        }
        var temp = this.items[idx1];

        this.items[idx1] = this.items[idx2];
        this.items[idx2] = temp;
    },

    insertItem : function(newItem) {
        try {
            this.items.push(newItem);

            // 1 means add (> 0)
            this.treebox.rowCountChanged(this.rowCount, 1);
        } catch (err) {
            alert(err);
        }
    },

    deleteSelectedItem : function() {
        try {
            var selIdx = this.selection.currentIndex;

            if (selIdx < 0) {
                return;
            }
            var newItems = new Array();

            for (var i = 0; i < this.items.length; i++) {
                if (i != selIdx) {
                    newItems.push(this.items[i]);
                }
            }

            this.items = newItems;
            // -1 means remove (< 0)
            this.treebox.rowCountChanged(selIdx, -1);

            if (newItems.length > 0) {
                this.selection.select(this.rowCount == selIdx ? selIdx - 1 : selIdx);
            }
        } catch (err) {
            alert(err);
        }
    },

    getCellText : function(row, column){
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "name":
                return this.items[row].name;
        }

        return "";
    },

    get rowCount() {
        return this.items.length;
    },

    cycleCell: function (row, column) {
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "enabled":
                this.items[row].enabled = !this.items[row].enabled;
                break;
        }

        this.treebox.view.selection.select(row);
        this.treebox.invalidateRow(row);
    },

    getImageSrc: function (row, column) {
        switch (column.id || column) { // column.id is valid on Mozilla column is valid on FF
            case "enabled":
                if(this.items[row].enabled) {
                    return "chrome://viewsourcewith/content/img/showEditor.png";
                }
                break;
        }
        return null;
    },

    setTree: function(treebox){
        this.treebox = treebox;
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
    cycleHeader: function(col, elem) {},
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(row){ return false; },
    getLevel: function(row){ return 0; },
    getRowProperties: function(row){return "";},
    getCellProperties: function(row,col){return "";},
    getColumnProperties: function(colid,col){return "";}
};
