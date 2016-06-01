// ==UserScript==
// @name         Data URL generator
// @namespace    https://github.com/AlorelUserscripts/data-url-generator
// @homepage     https://github.com/AlorelUserscripts/data-url-generator
// @supportURL   https://github.com/AlorelUserscripts/data-url-generator/issues
// @version      0.2
// @description  Generates data URLs
// @author       Alorel <a.molcanovas@gmail.com>
// @include      *
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @connect *
// @noframes
// @require      https://cdn.rawgit.com/coolaj86/TextEncoderLite/v1.0.0/index.js
// @require      https://cdn.rawgit.com/beatgammit/base64-js/v1.1.2/base64js.min.js
// @downloadURL  https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.user.js
// @updateURL    https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.meta.js
// @icon         https://cdn.rawgit.com/AlorelUserscripts/data-url-generator/0.2/assets/ico.png
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
            encoder = new TextEncoderLite('utf-8'),
            contentTypeRegex = /content\-type:\s+([^\/]+\/[a-z0-9]+)/ig,
            failedEncodeRegex = /^data:;/g,
            bgImgRegex = /url\(['"]?([^'"\)]+)['"]?\)/g,
            dataUrlRegex = /^data:/,
            menuCallback,
            pseudos = [null, "before", "after"],
            BG_IMG_NONE = "none",
            blobToDataURL = function (blob, callback, fallbackContentType) {
                if ("undefined" === typeof fallbackContentType) {
                    fallbackContentType = false;
                }
                var a = new FileReader();
                a.onload = function (e) {
                    var res = e.target.result;
                    if (fallbackContentType && res.match(failedEncodeRegex)) {
                        res = res.replace(failedEncodeRegex, "data:" + fallbackContentType + ";");
                    }
                    callback(res);
                };
                a.readAsDataURL(blob);
            };

        if (document.contentType === "text/html") {
            menuCallback = function () {
                saveDataURL("data:text/html;base64," + base64js.fromByteArray(encoder.encode(document.firstElementChild.outerHTML)));
            };
        } else {
            var readyStateListener = function () {
                var fallbackContentType = null,
                    headers = this.responseHeaders.split("\n"),
                    i = 0;
                for (; i < headers.length; i++) {
                    if (headers[i].match(contentTypeRegex)) {
                        fallbackContentType = headers[i].replace(contentTypeRegex, "$1");
                        break;
                    }
                }
                blobToDataURL(this.response, saveDataURL, fallbackContentType);
            };

            menuCallback = function () {
                GM_xmlhttpRequest({
                    responseType: "blob",
                    method: "GET",
                    url: document.URL,
                    onload: readyStateListener
                });
            };
        }

        GM_registerMenuCommand("Get data URL!", menuCallback, "d");
        GM_registerMenuCommand("Search for images", function () {
            toast({
                text: "Parsing the page for ya, chief!",
                timeout: 3000
            });
            /** @type {Set} */
            var ret = new Set();
            var pageElements = document.querySelectorAll("*"),
                i = 0, j, k, bgImg;

            for (; i < pageElements.length; i++) {
                if (pageElements[i] instanceof HTMLImageElement) {
                    ret.add(pageElements[i].src);
                } else {
                    for (j = 0; j < pseudos.length; j++) {
                        if (
                            (bgImg = getComputedStyle(pageElements[i], pseudos[j]).backgroundImage) !== BG_IMG_NONE &&
                            (bgImg = bgImg.match(bgImgRegex))
                        ) {
                            for (k = 0; k < bgImg.length; k++) {
                                ret.add(bgImg[k].replace(bgImgRegex, "$1"));
                            }
                        }
                    }
                }
            }

            //Begin generating our DOM
            var body = document.createElement("body"),
                progress = document.createElement("progress"),
                ajaxPostListener = function (dataurl) {
                    var a = document.createElement("a");
                    a.setAttribute("style", "float:left;margin:5px;border:1px solid #000;text-decoration:none");
                    a.href = dataurl;
                    a.target = '_blank';
                    a.innerHTML = '<img src="' + dataurl + '"/>';
                    body.appendChild(a);
                    progress.value = ++numProcessed;

                    if (numProcessed >= ret.size) {
                        body.innerHTML += "<script>\
                                                document.getElementById('bgcolour').addEventListener('change',function(){\
                                                    document.body.style.backgroundColor= this.value;\
                                                });\
                                           </script>";

                        GM_openInTab("data:text/html;base64," + base64js.fromByteArray(encoder.encode(body.outerHTML)));
                        progress.parentNode.removeChild(progress);
                    }
                },
                ajaxListener = function () {
                    var fallbackContentType = null,
                        headers = this.responseHeaders.split("\n"),
                        i = 0;
                    for (; i < headers.length; i++) {
                        if (headers[i].match(contentTypeRegex)) {
                            fallbackContentType = headers[i].replace(contentTypeRegex, "$1");
                            break;
                        }
                    }
                    blobToDataURL(this.response, ajaxPostListener, fallbackContentType);
                },
                numProcessed = 0;

            progress.max = ret.size;
            progress.value = 0;
            progress.setAttribute("style", "position:fixed;top:0;right:0");
            document.body.appendChild(progress);

            body.innerHTML = "<input id='bgcolour' type='color' value='#ffffff' style='position:fixed;bottom:0;right:0;text-align:center;'/>";
            body.style.backgroundColor = "#ffffff";

            ret.forEach(function (url) {
                if (url.match(dataUrlRegex)) {
                    ajaxPostListener(url);
                } else {
                    GM_xmlhttpRequest({
                        responseType: "blob",
                        method: "GET",
                        url: url,
                        onload: ajaxListener
                    });
                }
            });
        }, "s");
    }
})(GM_notification);