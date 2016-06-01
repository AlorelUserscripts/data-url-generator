// ==UserScript==
// @name         Data URL generator
// @namespace    https://github.com/AlorelUserscripts/data-url-generator
// @homepage     https://github.com/AlorelUserscripts/data-url-generator
// @supportURL   https://github.com/AlorelUserscripts/data-url-generator/issues
// @version      0.1.1
// @description  Generates data URLs
// @author       Alorel <a.molcanovas@gmail.com>
// @include      *
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect *
// @noframes
// @require      https://cdn.rawgit.com/coolaj86/TextEncoderLite/v1.0.0/index.js
// @require      https://cdn.rawgit.com/beatgammit/base64-js/v1.1.2/base64js.min.js
// @downloadURL  https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.user.js
// @updateURL    https://raw.githubusercontent.com/AlorelUserscripts/data-url-generator/master/data-url.meta.js

// @icon         https://cdn.rawgit.com/AlorelUserscripts/data-url-generator/develop/assets/ico.png
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
            menuCallback,
            pseudos = [null, "before", "after"],
            BG_IMG_NONE = "none";

        if (document.contentType === "text/html") {
            menuCallback = function () {
                saveDataURL("data:text/html;base64," + base64js.fromByteArray(encoder.encode(document.firstElementChild.outerHTML)));
            };
        } else {
            var blobToDataURL = function (blob, callback, fallbackContentType) {
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
            }, readyStateListener = function () {
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
            var ret = [],
                pageElements = document.querySelectorAll("*"),
                i = 0,
                j, k,
                bgImg;

            for (; i < pageElements.length; i++) {
                if (pageElements[i] instanceof HTMLImageElement) {
                    ret.push({
                        url: pageElements[i].src,
                        element: pageElements[i]
                    });
                } else {
                    for (j = 0; j < pseudos.length; j++) {
                        if (
                            (bgImg = getComputedStyle(pageElements[i], pseudos[j]).backgroundImage) !== BG_IMG_NONE &&
                            (bgImg = bgImg.match(bgImgRegex))
                        ) {
                            for (k = 0; k < bgImg.length; k++) {
                                ret.push({
                                    url: bgImg[k].replace(bgImgRegex, "$1"),
                                    element: pageElements[i]
                                });
                            }
                        }
                    }
                }
            }

            //Begin generating our DOM
            var body = document.createElement("body"),
                table = document.createElement("table"),
                thead = document.createElement("thead"),
                tfoot = document.createElement("tfoot"),
                tbody = document.createElement("tbody"),
                tr, preview, selector;

            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            thead.innerHTML = '<tr>\
                <th style="border:1px solid black">Preview</th>\
                <th style="border:1px solid black">Rough selector</th>\
                </tr>';
            tfoot.innerHTML = thead.innerHTML;

            ret.forEach(function (r) {
                tr = document.createElement("tr");
                preview = document.createElement("td");
                selector = document.createElement("td");

                selector.style.whiteSpace = "nowrap";
                tr.style.border = preview.style.border = selector.style.border = "1px solid black";

                preview.innerHTML = '<img src="' + r.url + '" style="max-width:100%;height:auto"/>';
                selector.innerText = 'To be implemented';

                tr.appendChild(preview);
                tr.appendChild(selector);
                tbody.appendChild(tr);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            table.appendChild(tfoot);
            body.appendChild(table);

            var a = document.createElement("a"),
                event = document.createEvent('HTMLEvents');
            event.initEvent('click', true, false);
            a.href = "data:text/html;base64," + base64js.fromByteArray(encoder.encode(body.outerHTML));
            a.target = "_blank";
            a.style.display = "none";
            document.body.appendChild(a);
            a.dispatchEvent(event);
            a.parentNode.removeChild(a);
        }, "s");
    }
})(GM_notification);