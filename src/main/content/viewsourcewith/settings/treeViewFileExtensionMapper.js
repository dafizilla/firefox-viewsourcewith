/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Initial Developer of the Original Code is
# Davide Ficano.
# Portions created by the Initial Developer are Copyright (C) 2007
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Davide Ficano <davide.ficano@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/
function TreeViewFileExtensionMapper(items) {
    this.items = items;
    this.treebox = null;
    this.selection = null;
}

TreeViewFileExtensionMapper.prototype = {

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
            case "fileExtensionMapperRegExp":
                return this.items[row].domainFilter;
            case "fileExtensionMapperExt":
                return this.items[row].fileExtension;
        }

        return "";
    },

    get rowCount() {
        return this.items.length;
    },

    cycleCell: function (row, column) {},

    getImageSrc: function (row, column) {
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
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
};
