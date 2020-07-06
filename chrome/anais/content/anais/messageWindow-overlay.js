ChromeUtils.import("resource://gre/modules/Services.jsm");

/**
* affiche les proprietes anais d'un destinataire d'un message
*       utilise depuis menu contextuel sur destinataire d'un message existant
*
* @param  popnode objet xul qui a le menu contextuel affiche
*/
function anaisMsgPropDest(popnode){

  //gestion du mode offline
  if (Services.io.offline){
    AnaisAfficheMsgId("anaisdlg_ErrDeconnecte");
    return;
  }

  let adr=findEmailNodeFromPopupNode(document.popupNode, 'emailAddressPopup');  
  let mail=adr.getAttribute("emailAddress");
  if (!mail || ""==mail){
    AnaisAfficheMsgId("anaisdlg_PropErrBalMail");
    return;
  }
  
  anaisMsgPropAdr(adr);
}


/**
* affiche les proprietes anais d'une boîte à lettres à partir de l'adresse
*
* @param  emailAddressPopup (findEmailNodeFromPopupNode)
*
*/
function anaisMsgPropAdr(emailAddressPopup){

  //gestion du mode offline
  if (Services.io.offline){
    AnaisAfficheMsgId("anaisdlg_ErrDeconnecte");
    return;
  }

  //url du serveur
  if (Services.prefs.prefHasUserValue("anais.anaismoz.urlserveur")){
    let val=Services.prefs.getCharPref("anais.anaismoz.urlserveur");
    if ((val!=null)&&(val!='')){
      gUrlScript=val;
    }
  }
  
  let email=emailAddressPopup.getAttribute("emailAddress");
  
  //fonction de rappel (requete annuaire)
  function anaisMsgPropDestRap(chemin){
    
    if (null==chemin){
      
      if (emailAddressPopup.cardDetails && 
          emailAddressPopup.cardDetails.book){
        
        window.openDialog("chrome://messenger/content/addressbook/abEditCardDialog.xul",
                          "",
                          "chrome,modal,resizable=no,centerscreen",
                          { abURI: emailAddressPopup.cardDetails.book.URI,
                            card: emailAddressPopup.cardDetails.card });
        return;
      }
      
      let fullAddress=emailAddressPopup.getAttribute("fullAddress");
      let msg2=AnaisMessageFromId("anaisdlg_PropErrNoBal");
      let promptService=Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      Services.prompt.confirm(window, "Propriétés", fullAddress+"\n"+msg2);
      return;
    }
    
    //afficher proprietes
    window.openDialog("chrome://anais/content/anaisdlgpropbal.xul","","chrome,center,titlebar",{dn:chemin});
  }
  
  //requete serveur
  let res=anaisRechCheminLdap(email, anaisMsgPropDestRap);
  anaisRestoreCursor();
  if (false==res){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_PropErrBal");
    return;
  }
}


/**
* fonction pour l'option 'Proprietes' du menu contextuel dans le corps d'un message
* (fichier mailWindowOverlay-overlay.xul id=anaismoz-propcorps)
* contrôle l'affichage de l'option
*/
function anaisContextCorps(){
  
  let prop=document.getElementById("anaismoz-propcorps");
  if (gContextMenu.onMailtoLink){
    prop.removeAttribute("hidden");
  }
  else{
    prop.setAttribute("hidden",true);
  }
}

/**
* fonction pour l'option 'Proprietes' du menu contextuel dans le corps d'un message
* (fichier mailWindowOverlay-overlay.xul id=anaismoz-propcorps)
* affiche les proprietes à partir de l'adresse
*/
function anaisMsgPropDestCorps(popupNode){
  
  let val=popupNode.href;
  
  if (0==val.indexOf("mailto:"))
  {
    let adr=val.substring(7,val.length);
    
    anaisMsgPropAdr(adr);
  }
}
