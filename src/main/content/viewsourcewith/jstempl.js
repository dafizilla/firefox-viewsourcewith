// You receive the object data containing the following elements
// data.uri         the URI data
//                  see nsIURL at http://www.xulplanet.com/references/xpcomref/comps/c_networkstandardurl1.html
// data.localPath   the localPath defined in urlMapper dialog (should be empty or null)
// data.domainFilter the domainFilter defined in urlMapper dialog
// data.pageSourcePath the path to page source retrieved by browser
// data.line        the line number, useful when called from JS console
// data.column      the column number, useful when called from JS console
// data.editorName  the editor name
var localPath = data.localPath;
var uri = data.uri.spec;
var dirSep = top.window.navigator.platform.indexOf("Win") < 0 ? "/" : "\\";
// Contains the file name(s) to open
var arFiles = new Array();

var re = new RegExp(data.domainFilter, "g");
var fileName = re.exec(uri);
// Try to append extra paths
if (fileName) {
    fileName = uri.substring(re.lastIndex);
    // remove the text following query (?), ref (#), param (;)
    fileName = fileName.replace(/[#?;].*$/, "");
    // Under Windows adjust path separators
    if (dirSep == "\\") {
        fileName = fileName.replace(/\//g, dirSep);
    }
} else {
    fileName = data.uri.fileName;
}
// You can open more than one file simply returning
// their full pathnames in array shown below
// By default only two files are returned having the same name to requested one
// Suppose your localPath points to ~/vsw/htdocs/vsw
// The browser points to:
// http://dafizilla.sourceforge.net/viewsourcewith/faq.php
// The file name in URL is faq.php so the local file is:
// ~/vsw/htdocs/vsw/faq.php

// comment line below if you don't want to open the temporary file
arFiles.push(data.pageSourcePath);
arFiles.push(localPath + dirSep + fileName);

return arFiles;
