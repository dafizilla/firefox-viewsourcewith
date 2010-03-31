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
var gViewSourceFileExtensionMapper = {
    onLoad : function() {
        window.sizeToContent();
        this.initControls();
    },

    onAccept : function() {
        var isValid = false;

        try {
            isValid = this.checkDomainFilter()
                      && this.checkExtension();
            var item = window.arguments[0].item;

            if (isValid && item) {
                item.domainFilter = this.oDomainFilter.value;
                item.fileExtension = this.oFileExtension.value;
            }
        } catch (err) {
            alert("gViewSourceFileExtensionMapper.onAccept: " + err);
        }

        window.arguments[0].isOk = isValid;
        return isValid;
    },

    checkDomainFilter : function() {
        var isValid = true;

        if (this.oDomainFilter.value == "") {
            isValid = false;
            alert(ViewSourceWithCommon
                        .getLocalizedMessage("urlmapper.err.noDomainFilter"));
        }
        if (isValid) {
            try {
                // check reg exp syntax
                new RegExp(this.oDomainFilter.value).test("");
            } catch (err) {
                isValid = false;
                alert(err);
            }
        }

        if (!isValid) {
            this.oDomainFilter.focus();
        }
        return isValid;
    },

    checkExtension : function() {
        var isValid = false;

        try {
            isValid = this.oFileExtension.value != "";
            if (!isValid) {
                alert(ViewSourceWithCommon
                    .getLocalizedMessage("file.extension.mapper.err.empty.extension"));
            }
        } catch (err) {
            ViewSourceWithCommon.log("checkExtension: " + err);
        }
        // Shift focus to allow text input
        if (!isValid) {
            this.oFileExtension.focus();
        }
        return isValid;
    },

    initControls : function() {
        this.oDomainFilter = document.getElementById("domainFilter");
        this.oFileExtension = document.getElementById("fileExtension");

        var item = window.arguments[0].item;
        if (item) {
            this.oDomainFilter.value = item.domainFilter;
            this.oFileExtension.value = item.fileExtension;
        }
    }
};

