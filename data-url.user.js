// ==UserScript==
// @name         Data URL generator
// @namespace    https://github.com/AlorelUserscripts/data-url-generator
// @homepage     https://github.com/AlorelUserscripts/data-url-generator
// @supportURL   https://github.com/AlorelUserscripts/data-url-generator/issues
// @version      0.1
// @description  Generates data URLs
// @author       Alorel <a.molcanovas@gmail.com>
// @include      *
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_openInTab
// @noframes
// @require      https://cdn.rawgit.com/coolaj86/TextEncoderLite/v1.0.0/index.js
// @require      https://cdn.rawgit.com/beatgammit/base64-js/v1.1.2/base64js.min.js
// @downloadURL  https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.user.js
// @updateURL    https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.meta.js
// @icon         https://cdn.rawgit.com/AlorelUserscripts/data-url-generator/0.1/ico.png
// @license      LGPL-2.1
// ==/UserScript==


(function (toast) {
    "use strict";
    //Check requirements
    if ((function () {
            var requirements = [
                "window.XMLHttpRequest",
                "window.FileReader",
                "document.contentType"
            ];

            for (var i = 0; i < requirements.length; i++) {
                if (eval("typeof(" + requirements[i] + ")") === "undefined") {
                    toast("Your browser does not support " + requirements[i] + " - please update and try again.");
                    return false;
                }
            }

            return true;
        })()) {
        var saveDataURL = function (dataurl) {
                GM_setClipboard(dataurl);
                toast({
                    text: "The data URL has been copied to your clipboard; clickie to open!",
                    onclick: function () {
                        GM_openInTab(dataurl);
                    }
                });
            },
            menuCallback;

        if (document.contentType === "text/html") {
            var encoder = new TextEncoderLite('utf-8');
            menuCallback = function () {
                saveDataURL("data:text/html;base64," + base64js.fromByteArray(encoder.encode(document.firstElementChild.outerHTML)));
            };
        } else {
            var blobToDataURL = function (blob, callback) {
                var a = new FileReader();
                a.onload = function (e) {
                    callback(e.target.result);
                };
                a.readAsDataURL(blob);
            }, readyStateListener = function () {
                if (this.readyState === 4) {
                    blobToDataURL(this.response, saveDataURL);
                }
            };

            menuCallback = function () {
                var xhr = new XMLHttpRequest();
                xhr.responseType = "blob";
                xhr.addEventListener("readystatechange", readyStateListener);
                xhr.open("GET", document.URL);
                xhr.send();
            };
        }
        GM_registerMenuCommand("Get data URL!", menuCallback, "d");
    }
})(GM_notification);