var { classes: Cc, interfaces: Ci } = Components;
var { ExtensionCommon } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");

const Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
const eventEmitter = new ExtensionCommon.EventEmitter();

function injectThemeOverrideStyle(w) {
  try {
    if (!w || !w.document) return;
    const STYLE_ID = "webapp-spaces-theme-override";
    let styleEl = w.document.getElementById(STYLE_ID);
    const isNew = !styleEl;
    if (isNew) {
      styleEl = w.document.createElementNS("http://www.w3.org/1999/xhtml", "style");
      styleEl.id = STYLE_ID;
    }
    const cssText = `
      /* 1. PAR DÉFAUT et THÈME CLAIR : toujours afficher l'icône du thème clair (--webextension-toolbar-image-dark = _dark.svg) */
      :root .spaces-addon-button img,
      :root[data-spaces-theme-mode="light"] .spaces-addon-button img,
      #spacesToolbar[data-theme-mode="light"] .spaces-addon-button img {
        content: var(--webextension-toolbar-image-dark, var(--webextension-toolbar-image, inherit)) !important;
      }

      :root .spaces-addon-menuitem,
      :root #spacesToolbarAddonsPopup .spaces-popup-menuitem,
      :root[data-spaces-theme-mode="light"] .spaces-addon-menuitem,
      :root[data-spaces-theme-mode="light"] #spacesToolbarAddonsPopup .spaces-popup-menuitem,
      #spacesToolbar[data-theme-mode="light"] .spaces-addon-menuitem {
        list-style-image: var(--webextension-toolbar-image-dark, var(--webextension-toolbar-image, inherit)) !important;
        --menuitem-icon: var(--webextension-toolbar-image-dark, var(--webextension-toolbar-image, inherit)) !important;
      }

      /* 2. THÈME SOMBRE DÉTECTÉ : basculer sur l'icône du thème sombre (--webextension-toolbar-image-light = _light.svg) */
      :root[data-spaces-theme-mode="dark"] .spaces-addon-button img,
      #spacesToolbar[data-theme-mode="dark"] .spaces-addon-button img {
        content: var(--webextension-toolbar-image-light, var(--webextension-toolbar-image, inherit)) !important;
      }

      :root[data-spaces-theme-mode="dark"] .spaces-addon-menuitem,
      :root[data-spaces-theme-mode="dark"] #spacesToolbarAddonsPopup .spaces-popup-menuitem,
      #spacesToolbar[data-theme-mode="dark"] .spaces-addon-menuitem {
        list-style-image: var(--webextension-toolbar-image-light, var(--webextension-toolbar-image, inherit)) !important;
        --menuitem-icon: var(--webextension-toolbar-image-light, var(--webextension-toolbar-image, inherit)) !important;
      }
    `;
    if (styleEl.textContent !== cssText) {
      styleEl.textContent = cssText;
    }
    if (isNew) {
      (w.document.head || w.document.documentElement).appendChild(styleEl);
      console.log("[Pauline] - Style de détection de thème injecté avec succès");
    }
  } catch (e) {
    console.error("[Pauline] - Erreur injection style de thème:", e);
  }
}

function parseCssColorToRgb(w, cssColor) {
  if (!cssColor || typeof cssColor !== "string") return null;
  const trimmed = cssColor.trim();
  if (!trimmed || trimmed === "transparent") return null;

  try {
    if (w.InspectorUtils && typeof w.InspectorUtils.colorToRGBA === "function") {
      const rgba = w.InspectorUtils.colorToRGBA(trimmed, w.document);
      if (rgba) {
        if (typeof rgba.a === "number" && rgba.a <= 0.1) return null;
        return { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a ?? 1 };
      }
    }
  } catch (_) {}

  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (a <= 0.1) return null;
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a,
    };
  }

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    };
  }

  return null;
}

function getColorLuminance(rgb) {
  if (!rgb) return null;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function normalizeSpacesAddonButtonIcons(w) {
  try {
    const elements = w.document?.querySelectorAll(
      ".spaces-addon-button img, .spaces-addon-menuitem, #spacesToolbarAddonsPopup .spaces-popup-menuitem"
    );
    if (!elements) return;
    for (const el of elements) {
      const darkVar = el.style?.getPropertyValue("--webextension-toolbar-image-dark") || "";
      const lightVar = el.style?.getPropertyValue("--webextension-toolbar-image-light") || "";
      if (darkVar.includes("_light.") && lightVar.includes("_dark.")) {
        el.style.setProperty("--webextension-toolbar-image-dark", lightVar);
        el.style.setProperty("--webextension-toolbar-image-light", darkVar);
        el.style.setProperty("--webextension-toolbar-image", lightVar);
      }
    }
  } catch (_) {}
}

function detectSpacesToolbarIsDark(w, toolbar) {
  try {
    const doc = w?.document;
    const root = doc?.documentElement;
    if (!w || !doc || !root) return false;

    // 1. Personnalisation explicite des couleurs de la spacesToolbar par l'utilisateur
    const customIconColor =
      w.gSpacesToolbar?.customizeData?.color ||
      root.style?.getPropertyValue("--spaces-button-text-color")?.trim();
    if (customIconColor) {
      const iconRgb = parseCssColorToRgb(w, customIconColor);
      if (iconRgb) {
        return getColorLuminance(iconRgb) > 128;
      }
    }

    const customBgColor =
      w.gSpacesToolbar?.customizeData?.background ||
      root.style?.getPropertyValue("--spaces-bg-color")?.trim();
    if (customBgColor) {
      const bgRgb = parseCssColorToRgb(w, customBgColor);
      if (bgRgb) {
        return getColorLuminance(bgRgb) < 128;
      }
    }

    // 2. Attributs de thème Thunderbird posés de manière synchrone sur :root par LightweightThemeConsumer.sys.mjs
    const lwtToolbar = root.getAttribute("lwt-toolbar");
    if (lwtToolbar === "dark") return true;
    if (lwtToolbar === "light") return false;

    if (root.hasAttribute("lwtheme-brighttext") || root.hasAttribute("lwt-tree-brighttext")) {
      return true;
    }
    if (root.hasAttribute("lwtheme")) {
      return false;
    }

    // 3. Préférence Thunderbird browser.theme.toolbar-theme (0 = dark, 1 = light, 2 = system/auto)
    try {
      const toolbarThemePref = Services.prefs.getIntPref("browser.theme.toolbar-theme", 2);
      if (toolbarThemePref === 0) return true;
      if (toolbarThemePref === 1) return false;
    } catch (_) {}

    // 4. En mode thème système (auto), le media query du document chrome reflète light-dark(#e8e8e8, #252525)
    if (typeof w.matchMedia === "function") {
      return Boolean(w.matchMedia("(prefers-color-scheme: dark)")?.matches);
    }

    // 5. Fallback sur la couleur de fond réelle de #spacesToolbar ou d'un bouton natif NON actif (:not(.current))
    if (toolbar && !toolbar.hidden) {
      const bgRgb = parseCssColorToRgb(w, w.getComputedStyle(toolbar)?.backgroundColor);
      if (bgRgb) {
        return getColorLuminance(bgRgb) < 128;
      }
    }
    if (toolbar) {
      const inactiveBtn =
        toolbar.querySelector(".spaces-toolbar-button:not(.current):not(.spaces-addon-button)") ||
        toolbar.querySelector(".spaces-toolbar-button:not(.current)");
      if (inactiveBtn) {
        const fgRgb = parseCssColorToRgb(w, w.getComputedStyle(inactiveBtn)?.color);
        if (fgRgb) {
          return getColorLuminance(fgRgb) > 128;
        }
      }
    }

    return false;
  } catch (e) {
    console.error("[Pauline] - Erreur dans detectSpacesToolbarIsDark:", e);
    return false;
  }
}

function setupSpacesToolbarTheme(w, retryCount = 0) {
  try {
    if (!w || !w.document) return;
    injectThemeOverrideStyle(w);

    const toolbar = w.document.getElementById("spacesToolbar");
    if (!toolbar) {
      if (retryCount < 40) {
        w.setTimeout(() => setupSpacesToolbarTheme(w, retryCount + 1), 250);
      }
      return;
    }

    if (w._pauline_spaces_observer) {
      try {
        w._pauline_spaces_observer.disconnect();
      } catch (e) { }
      w._pauline_spaces_observer = null;
    }

    let isUpdatingTheme = false;
    const updateToolbarTheme = () => {
      if (isUpdatingTheme) return;
      isUpdatingTheme = true;
      try {
        injectThemeOverrideStyle(w);
        normalizeSpacesAddonButtonIcons(w);

        const isDark = detectSpacesToolbarIsDark(w, toolbar);
        const mode = isDark ? "dark" : "light";
        const root = w.document.documentElement;
        if (
          toolbar.getAttribute("data-theme-mode") !== mode ||
          root?.getAttribute("data-spaces-theme-mode") !== mode
        ) {
          toolbar.setAttribute("data-theme-mode", mode);
          root?.setAttribute("data-spaces-theme-mode", mode);
          console.log(`[Pauline] - Thème spacesToolbar détecté: ${mode}`);
        }
      } catch (e) {
        console.error("[Pauline] - Erreur détection thème:", e);
      } finally {
        isUpdatingTheme = false;
      }
    };

    const scheduleThemeChecks = () => {
      updateToolbarTheme();
      w.setTimeout(updateToolbarTheme, 100);
      w.setTimeout(updateToolbarTheme, 350);
    };

    w._pauline_updateToolbarTheme = updateToolbarTheme;

    if (w._pauline_theme_listener) {
      try {
        w.removeEventListener("windowlwthemeupdate", w._pauline_theme_listener);
      } catch (e) { }
      w._pauline_theme_listener = null;
    }
    w._pauline_theme_listener = scheduleThemeChecks;
    w.addEventListener("windowlwthemeupdate", scheduleThemeChecks);

    if (w._pauline_media_listener && w._pauline_mql?.removeEventListener) {
      try {
        w._pauline_mql.removeEventListener("change", w._pauline_media_listener);
      } catch (e) { }
    }
    try {
      const mql = w.matchMedia("(prefers-color-scheme: dark)");
      if (mql?.addEventListener) {
        w._pauline_mql = mql;
        w._pauline_media_listener = scheduleThemeChecks;
        mql.addEventListener("change", scheduleThemeChecks);
      }
    } catch (e) { }

    try {
      const observer = new (w.MutationObserver || MutationObserver)(() => {
        updateToolbarTheme();
      });
      if (w.document.documentElement) {
        observer.observe(w.document.documentElement, {
          attributes: true,
          attributeFilter: ["style", "lwtheme", "lwtheme-brighttext", "lwt-toolbar", "lwt-tree-brighttext"],
        });
      }
      observer.observe(toolbar, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "style", "data-theme-mode"],
      });
      w._pauline_spaces_observer = observer;
    } catch (e) { }

    updateToolbarTheme();
    w.setTimeout(updateToolbarTheme, 200);
    w.setTimeout(updateToolbarTheme, 500);
    w.setTimeout(updateToolbarTheme, 1500);
    w.setTimeout(updateToolbarTheme, 3000);
  } catch (err) {
    console.error("[Pauline] - Erreur dans setupSpacesToolbarTheme:", err);
  }
}

let _paulineGlobalListenersRegistered = false;

function initSpacesTheme(context) {
  try {
    const WM = Cc["@mozilla.org/appshell/window-mediator;1"]?.getService(Ci.nsIWindowMediator) || Services.wm;
    const enumerator = WM.getEnumerator("mail:3pane");
    while (enumerator.hasMoreElements()) {
      const win = enumerator.getNext();
      if (!win._pauline_window_init_done) {
        win._pauline_window_init_done = true;
        setupSpacesToolbarTheme(win);
      } else if (typeof win._pauline_updateToolbarTheme === "function") {
        win._pauline_updateToolbarTheme();
      }
    }

    if (_paulineGlobalListenersRegistered) {
      return;
    }
    _paulineGlobalListenersRegistered = true;

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
          _paulineGlobalListenersRegistered = false;
          try {
            Services.obs.removeObserver(docObserver, "chrome-document-loaded");
          } catch (e) { }
          try {
            const winEnum = WM.getEnumerator("mail:3pane");
            while (winEnum.hasMoreElements()) {
              const w = winEnum.getNext();
              if (w._pauline_spaces_observer) {
                try {
                  w._pauline_spaces_observer.disconnect();
                } catch (_) {}
                w._pauline_spaces_observer = null;
              }
              if (w._pauline_theme_listener) {
                w.removeEventListener("windowlwthemeupdate", w._pauline_theme_listener);
                w._pauline_theme_listener = null;
              }
              if (w._pauline_media_listener && w._pauline_mql?.removeEventListener) {
                w._pauline_mql.removeEventListener("change", w._pauline_media_listener);
                w._pauline_media_listener = null;
              }
              w._pauline_updateToolbarTheme = null;
              w._pauline_window_init_done = false;
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
