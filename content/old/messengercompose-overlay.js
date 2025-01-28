ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource:///modules/mailServices.js");

/**
*	affichage de la boite de choix des destinataires
*
*	V0.2 (02/09/2004) gestion du mode offline
*/
function cmdAnaismozDest(){

  //gestion du mode offline
  if (Services.io.offline){
    AnaisAfficheMsgId("anaisdlg_ErrDeconnecte");
    return;
  }

  let destinataires={"to":[],"cc":[],"bcc":[]};
  anaisRecipients2Destinataires(destinataires);

  window.openDialog("chrome://anais/content/anaismozdlg.xul",
                    "",
                    "chrome,center,resizable,titlebar,modal",
                    {composeWindow:top.window,
                     msgCompFields:gMsgCompose.compFields,
                     destinataires:destinataires});
}

/**
* Parse et convertit les destinataires
* destinataires : objet avec tableaux to,cc,bcc de msgIAddressObject
*/
function anaisRecipients2Destinataires(destinataires){
  
  let i=1;
  let recipientType;
  let inputField;
  let fieldValue;
  let adresses;

  while ((inputField=awGetInputElement(i))){
    
    fieldValue=inputField.value;

    if (null==fieldValue)
      fieldValue=inputField.getAttribute("value");

    if (""!=fieldValue){
      
      recipientType=awGetPopupElement(i).selectedItem.getAttribute("value");
      adresses=null;

      switch (recipientType){
        
        case "addr_to"  :
        case "addr_cc"  :
        case "addr_bcc" :
                          try {
                                                         
                            adresses=MailServices.headerParser.makeFromDisplayAddress(fieldValue);
                                       
                          } catch (ex) {adresses=null;}
                          break;
        default : break;
      }

      switch (recipientType){
        
        case "addr_to"  : for (var c=0;c<adresses.length;c++){
                            destinataires.to.push(adresses[c]);
                          }
                          break;
        case "addr_cc"  : for (var c=0;c<adresses.length;c++){
                            destinataires.cc.push(adresses[c]);
                          }
                          break;
        case "addr_bcc" : for (var c=0;c<adresses.length;c++){
                            destinataires.bcc.push(adresses[c]);
                          }
                          break;
        default : break;
      }
    }
    i++;
  }
}
