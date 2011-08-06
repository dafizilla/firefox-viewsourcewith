Components.utils.import("resource://vsw/common.jsm");

var EXPORTED_SYMBOLS = ["VSWRegisterUninstallerObserver"];
var VSW_UUID = '{eecba28f-b68b-4b3a-b501-6ce12e6b8696}';

// https://developer.mozilla.org/en/Code_snippets/Miscellaneous
// https://developer.mozilla.org/en/XUL_School/Appendix_B%3A_Install_and_Uninstall_Scripts
// https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonManager#addAddonListener%28%29

function VSWRegisterUninstallerObserver() {
    try {
        // Firefox 4 and later; Mozilla 2 and later
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
    
        AddonManager.addAddonListener({
            onEnabling: function(addon, needsRestart) {},
            onEnabled: function(addon) {},
            onDisabling: function(addon, needsRestart) {},
            onDisabled: function(addon) {},
            onInstalling: function(addon, needsRestart) {},
            onInstalled: function(addon) {},
            onUninstalling: function(addon, needsRestart) {
                if (addon.id == VSW_UUID) {
                    ViewSourceWithCommon.prefBranch.setBoolPref("uninstall", true);
                }
            },
            onUninstalled: function(addon) {
            },
            onOperationCancelled: function(addon) {
                if (ViewSourceWithCommon.prefBranch.prefHasUserValue("uninstall")) {
                    ViewSourceWithCommon.prefBranch.clearUserPref("uninstall");
                }
            },
            onPropertyChanged: function(addon, properties) {}
        });
    } catch (ex) {
    }

    ViewSourceWithCommon.getObserverService()
        .addObserver({
            observe : function(subject, topic, data) {
                try {
                    if (ViewSourceWithCommon.prefBranch.prefHasUserValue("uninstall")
                        && ViewSourceWithCommon.prefBranch.getBoolPref("uninstall")) {
                        ViewSourceWithCommon.prefBranch.deleteBranch("");
                    }
                } catch(e) {
                    dump (e + "\n");
                }
            }
    }, "quit-application", false);
}
