/**
 * Author   : Davide Ficano
 * Date     : 22-Nov-04
 * Date     : 26-Jun-05 Removed dependency from ViewSourcePrefs
 */

const gViewSourceWarning = {
    onLoad : function() {
        if (window.arguments[0] && window.arguments[0].countDown) {
            gViewSourceWarning.countDown = window.arguments[0].countDown;
        }

        // zero means no timeout
        if (gViewSourceWarning.countDown < 0) {
            gViewSourceWarning.countDown = 2;
        }

        var okButton = document.documentElement.getButton("accept");

        okButton.label = ViewSourceWithCommon.getFormattedMessage(
                                "warning.button.disabled.label",
                                [gViewSourceWarning.countDown]);
        okButton.disabled = true;
        okButton.focus();

        var checkbox = document.getElementById("vswWarningShowMessage");
        checkbox.disabled = true;

        gViewSourceWarning.countdownInterval = setInterval(
            "gViewSourceWarning.checkCountDown()", 1000);
    },

    checkCountDown : function() {
        var okButton = document.documentElement.getButton("accept");

        if (gViewSourceWarning.countDown-- <= 1) {
            clearInterval(gViewSourceWarning.countdownInterval);

            okButton.label = ViewSourceWithCommon.getLocalizedMessage(
                                "warning.button.enabled.label");
            okButton.disabled = false;

            var checkbox = document.getElementById("vswWarningShowMessage");
            checkbox.disabled = false;
        }
        else {
            okButton.label = ViewSourceWithCommon.getFormattedMessage(
                                    "warning.button.disabled.label",
                                    [gViewSourceWarning.countDown]);
        }
    },

    onOK : function() {
        if (window.arguments[0] && window.arguments[0].showFrameWarning) {
            var checkbox = document.getElementById("vswWarningShowMessage");

            window.arguments[0].showFrameWarning = !checkbox.checked;
        }
        return true;
    }
};