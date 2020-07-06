ChromeUtils.import("resource://gre/modules/Services.jsm");

window.addEventListener("load", initMessenger, false);

/**
*	appelee au demarrage de Thunderbird
*
*/
function initMessenger(){
  
  window.removeEventListener("load", initMessenger);

  //preference "anais.anaismoz.sessionid" -> valeur mise à vide
  if (Services.prefs.prefHasUserValue("anais.anaismoz.sessionid")){
    Services.prefs.clearUserPref("anais.anaismoz.sessionid");
    Services.prefs.savePrefFile(null);
  }
  
  let mail3Pane=Services.wm.getMostRecentWindow("mail:3pane");
  if (null!=mail3Pane)
    mail3Pane.anais_sessionid="";
}
