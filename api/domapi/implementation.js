var { classes: Cc, interfaces: Ci } = Components;
var { ExtensionCommon } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");

const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
const eventEmitter = new ExtensionCommon.EventEmitter();

function setupSpacesToolbarTheme(w) {
  try {
    const toolbar = w.document?.getElementById("spacesToolbar");
    if (!toolbar) return;

    const STYLE_ID = "webapp-spaces-theme-override";
    if (!w.document.getElementById(STYLE_ID)) {
      try {
        const styleEl = w.document.createElementNS("http://www.w3.org/1999/xhtml", "style");
        styleEl.id = STYLE_ID;
        styleEl.textContent = `
          :root[data-spaces-theme-mode="dark"] .spaces-addon-button img,
          :root[data-spaces-theme-mode="dark"] .spaces-addon-menuitem,
          #spacesToolbar[data-theme-mode="dark"] .spaces-addon-button img,
          #spacesToolbar[data-theme-mode="dark"] .spaces-addon-menuitem {
            content: var(--webextension-toolbar-image-light, inherit) !important;
            --menuitem-icon: var(--webextension-toolbar-image-light, inherit) !important;
          }

          :root[data-spaces-theme-mode="light"] .spaces-addon-button img,
          :root[data-spaces-theme-mode="light"] .spaces-addon-menuitem,
          #spacesToolbar[data-theme-mode="light"] .spaces-addon-button img,
          #spacesToolbar[data-theme-mode="light"] .spaces-addon-menuitem {
            content: var(--webextension-toolbar-image-dark, inherit) !important;
            --menuitem-icon: var(--webextension-toolbar-image-dark, inherit) !important;
          }
        `;
        (w.document.head || w.document.documentElement).appendChild(styleEl);
      } catch (e) {
        console.error("[Pauline] - Erreur injection style de thème:", e);
      }
    }

    const updateToolbarTheme = () => {
      try {
        let isDark = false;

        const tbCs = w.getComputedStyle(toolbar)?.colorScheme;
        const rootCs = w.getComputedStyle(w.document.documentElement)?.colorScheme;
        if (tbCs === "dark" || rootCs === "dark") {
          isDark = true;
        } else if (tbCs === "light" || rootCs === "light") {
          isDark = false;
        } else {
          const sampleBtn = toolbar.querySelector(".spaces-toolbar-button") || toolbar.querySelector("button");
          const sampleEl = sampleBtn || toolbar;
          const computedColor = w.getComputedStyle(sampleEl)?.color || "";
          const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            isDark = brightness > 128;
          } else {
            isDark = w.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
          }
        }

        const mode = isDark ? "dark" : "light";
        if (toolbar.getAttribute("data-theme-mode") !== mode) {
          toolbar.setAttribute("data-theme-mode", mode);
          w.document.documentElement?.setAttribute("data-spaces-theme-mode", mode);
          console.log(`[Pauline] - Thème spacesToolbar détecté: ${mode}`);
        }
      } catch (e) {
        console.error("[Pauline] - Erreur détection thème:", e);
      }
    };

    if (w._pauline_theme_listener) {
      try {
        w.removeEventListener("windowlwthemeupdate", w._pauline_theme_listener);
      } catch (e) { }
      w._pauline_theme_listener = null;
    }
    w._pauline_theme_listener = updateToolbarTheme;
    w.addEventListener("windowlwthemeupdate", updateToolbarTheme);

    if (w._pauline_media_listener && w._pauline_mql?.removeEventListener) {
      try {
        w._pauline_mql.removeEventListener("change", w._pauline_media_listener);
      } catch (e) { }
    }
    try {
      const mql = w.matchMedia("(prefers-color-scheme: dark)");
      if (mql?.addEventListener) {
        w._pauline_mql = mql;
        w._pauline_media_listener = updateToolbarTheme;
        mql.addEventListener("change", updateToolbarTheme);
      }
    } catch (e) { }

    updateToolbarTheme();
    w.setTimeout(updateToolbarTheme, 200);
    w.setTimeout(updateToolbarTheme, 500);
    w.setTimeout(updateToolbarTheme, 1500);
  } catch (err) {
    console.error("[Pauline] - Erreur dans setupSpacesToolbarTheme:", err);
  }
}

function initSpacesTheme(context) {
  try {
    const WM = Cc["@mozilla.org/appshell/window-mediator;1"]?.getService(Ci.nsIWindowMediator) || Services.wm;
    const win = WM.getMostRecentWindow("mail:3pane") || WM.getMostRecentWindow(null);
    if (win) {
      setupSpacesToolbarTheme(win);
    }

    const docObserver = {
      observe(subject, topic, data) {
        try {
          const w = subject?.defaultView;
          if (!w) return;
          const href = w.location?.href || "";
          if (href.includes("messenger.xhtml") || href.includes("3pane")) {
            w.setTimeout(() => {
              try {
                setupSpacesToolbarTheme(w);
              } catch (e) { }
            }, 100);
          }
        } catch (e) { }
      }
    };
    Services.obs.addObserver(docObserver, "chrome-document-loaded");

    if (context?.callOnClose) {
      context.callOnClose({
        close() {
          try {
            Services.obs.removeObserver(docObserver, "chrome-document-loaded");
          } catch (e) { }
          try {
            if (win?._pauline_theme_listener) {
              win.removeEventListener("windowlwthemeupdate", win._pauline_theme_listener);
            }
            if (win?._pauline_media_listener && win?._pauline_mql?.removeEventListener) {
              win._pauline_mql.removeEventListener("change", win._pauline_media_listener);
            }
          } catch (e) { }
        }
      });
    }
  } catch (e) {
    console.error("[Pauline] - Erreur init spacesToolbar:", e);
  }
}

var domapi = class extends ExtensionCommon.ExtensionAPIPersistent {

        
    PERSISTENT_EVENTS = {
        onEventCallBack({ fire }) {
            function callback(event, name) {
                return fire.async(name);
            }
            eventEmitter.on("dom-api-event", callback);
            return {
                unregister: () => {
                    eventEmitter.off("dom-api-event", callback);
                },
                convert(newFire) {
                    fire = newFire;
                },
            };
        },
    }


    getAPI(context) {
        initSpacesTheme(context);

        function getWindowFromId(windowId) {
            return context.extension.windowManager.get(windowId).window;
        }

        /**
         * Load text from a file
         * 
         * @param {string} htmlFile 
         * @param {object} window
         * @returns noeud html correspondant au text
         */
        async function loadFileContent(htmlFile, window) {

            let htmlFileUri = context.extension.getURL(htmlFile);
            let response = await window.fetch(htmlFileUri);

            if(!response.ok) {
                throw new Error("Problème de chargement du fichier");
            }
 
            return response.text();
        }

        /**
         * Convertit texte brute en noeuds html
         * 
         * @param {string} text 
         * @param {object} window 
         * @returns le noeud html
         */
        function textToNode(text, window) {
            let template = window.document.createElement('template');
            template.innerHTML = text;
            
            let childList = template.content.childNodes;

            if(childList.lenghts > 1) {
                throw new Error("Component should be a unique node")
            }

            return childList[0];
        }

        return {
            domapi : {
                async init() {
                    initSpacesTheme(context);
                },
                /**
                 * Integre un script dans un sous document du DOM principal
                 * 
                 * @param {string} scriptFile 
                 * @param {string} destinationId 
                 * @param {integer} windowId
                 * @param {string} scriptId 
                 */
                async injectScriptInDom(scriptFile, windowId, destinationId, scriptId) {

                    let window = getWindowFromId(windowId);
                    let scriptFileUri = context.extension.getURL(scriptFile);
                    let targetedElement = destinationId == "" ?
                        window.document : window.document.getElementById(destinationId);

                    let script = window.document.createElement("script");
                    script.id = scriptId;
                    script.src = scriptFileUri

                    attachElementToHead(script, targetedElement);
                },

                /**
                 * Transmet des parametres au context de la fenetre pour être exploité par les scripts de l'extension,
                 * accesibles via window['clé'] depuis les scripts
                 *
                 * @param {object} parameters : differents parametres au format [{'key': ..., 'value': ...)}, ...]
                 * @param {integer} windowId
                 * */
                async setInputs(parameters, windowId) {
                    let window = getWindowFromId(windowId);
                    for(let param of parameters) {
                        window[param['key']] = param['value'];
                    }
                },

                /**
                 * Integre une feuille de style dans dans un sous document du DOM principal
                 * 
                 * @param {string} cssFile 
                 * @param {integer} windowId 
                 * @param {string} destinationId 
                 * @param {string} baliseId 
                 */
                async injectCssInDom(cssFile, windowId, destinationId, baliseId) {

                    let window = getWindowFromId(windowId);
                    let cssFileUri = context.extension.getURL(cssFile);
                    let targetedElement = destinationId == "" ? 
                        window.document : window.document.getElementById(destinationId);
                    
                    let styleSheet = window.document.createElement('link');
                    styleSheet.rel = "stylesheet";
                    styleSheet.href = cssFileUri;
                    styleSheet.id = baliseId;
    
                    attachElementToHead(styleSheet, targetedElement);
                },

                /**
                 * Integre du html tiré d'un fichier, le fichier doit contenir un noeud parent unique.
                 * 
                 * @param {string} htmlFile 
                 * @param {integer} windowId 
                 * @param {string} destinationId 
                 */
                async addCustomHTMLComponent(htmlFile, windowId, destinationId, position) {

                    let window = getWindowFromId(windowId);
                    let targetedElement = window.document.getElementById(destinationId);
                    let htmlText = await loadFileContent(htmlFile, window);
                    let htmlNode = textToNode(htmlText, window);
                    
                    targetedElement.insertBefore(htmlNode, targetedElement.children[position]);
                },

                /**
                 * Savoir si un élément existe dans le document à l'aide d'un query selector
                 * 
                 * @param {string} querySelector
                 * @param {integer} windowId
                 * @returns {boolean} if the node exist in the document
                 */
                async doesElementExist(querySelector, windowId) {
                    let window = getWindowFromId(windowId);
                    return window.document.querySelector(querySelector) != null;
                },

                /**
                 * Retire un noeud du document
                 * 
                 * @param {string} querySelector 
                 * @param {integer} windowId 
                 */
                async removeNode(querySelector, windowId) {
                    let window = getWindowFromId(windowId);
                    let targetedElement = window.document.querySelector(querySelector);
                    targetedElement.remove();
                },

                /**
                 * Définit une fonction callback appelable par les éléments injecté dans le DOM
                 * 
                 * @param {function} event 
                 * @param {integer} windowId 
                 * @param {string} eventId 
                 */
                async defineCallback(windowId, eventId) {
                    let window = getWindowFromId(windowId);
                    window[eventId] = (parameters) => {
                        eventEmitter.emit("dom-api-event", {"eventId": eventId, "parameters": parameters});
                    };
                },

                onEventCallBack: new ExtensionCommon.EventManager({
                    context,
                    module: "domapi",
                    event: "onEventCallBack",
                    extensionApi: this,
                    
                }).api(),
            }
        }
    }
}


function attachElementToHead(element, subdocument) {
    let head = subdocument.getElementsByTagName("head")[0];
    if(head == null) {
        throw new Error("specified node isn't a subdocument");
    }
    head.appendChild(element);
}
