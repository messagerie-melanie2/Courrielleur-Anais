ChromeUtils.import("resource://gre/modules/Services.jsm");

/**
*	initialisation de la boite d'affichage des proprietes de boite aux lettres
*
*	@return si succes retourne true
* si erreur retourne false
*
*	implementation :
*	Paramètre d'appel :
*		dn : chemin ldap de la boîte
*/
function AnaisInitDlgPropBal(){

  //paramètres
  let dn="";
  let cn="";
  if (null==window.arguments[0].dn || ""==window.arguments[0].dn){
    AnaisAfficheMsgId("anaisdlg_PropErr");
    window.close();
    return false;
  }
  dn=window.arguments[0].dn;

  //url du serveur
  gUrlScript=Services.prefs.getCharPref("anais.anaismoz.urlserveur");

  //requête asynchrone
  anaisSetWaitCursor();
  anaisReqSrvFnc("propbal",dn,null,AnaisInitDlgPropBalRap);

  return true;
}


/**
*	fonction de rappel pour la fonction AnaisInitDlgPropBal
*	initialisation de la boite d'affichage des proprietes de boite aux lettres
*
*	@param	doc document xml de reponse du serveur (null si erreur)
*
*/
function AnaisInitDlgPropBalRap(doc){

  anaisRestoreCursor();
  if (doc==null){
    //erreur du serveur afficher message
    gMsgErreur=AnaisMessageFromId("anaisdlg_PropErrSrv")+gMsgErreur;
    anaisDlgPropBalMsg();
    return;
  }

  //code de resultat
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    //AnaisTrace("AnaisInitDlgPropBalRap anaisAnalyseErreurDoc");
    anaisDlgPropBalMsg();
    return;
  }

  //insertion du contenu
  //AnaisTrace("AnaisInitDlgPropBalRap insertion du contenu");
  let cadre=document.getElementById("anaisdlgpropbal-contenu");
  let pages=doc.getElementsByTagName('tabbox');
  if ((pages==null)||(pages[0]==null)){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_PropErrSrv");
    anaisDlgPropBalMsg();
    return;
  }
  let pagesdata=anaisCreeElements(pages[0]);
  cadre.appendChild(pagesdata);

  //masquer anaisdlgpropbal-msg
  let msg=document.getElementById("anaisdlgpropbal-msg");
  msg.setAttribute("hidden",true);
  //redimensionnement au contenu
  window.sizeToContent();
  //titre de la boite
  let propbal=doc.getElementsByTagNameNS(ANAIS_NS, 'propbal');
  let titre=propbal[0].getAttribute('titre');
  if (null!=titre){
    //window.title=titre;
    document.title=titre;
  }
}


/**
*	affiche le code et le message d'erreur dans la zone prevue
*
*	implementation : affiche gCodeErreur et gMsgErreur
*
*/
function anaisDlgPropBalMsg(){

  let lib=document.getElementById("anaisdlgpropbal-lib");
  lib.value=gMsgErreur+"\nCode erreur:"+gCodeErreur;

  return true;
}




/**
*	contrôle l'affichage des menus contextuels des contrôles liste de membres (id=propbal-membres)
*
*	@param	event
*	@param idliste identifiant de la liste
*
*	@return retourne true si le menu est affiche
* sinon false
*
*/
function anaisPropContext(event,idliste){

  AnaisTrace("anaisPropContext idliste:"+idliste);

  let row = { };
  let col = { };
  let elt = { };

  let liste=document.getElementById(idliste);

  liste.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
  if (-1==row.value){
    AnaisTrace("anaisPropContext -1==row.value event.clientX="+event.clientX+" event.clientY="+event.clientY);
    return false;
  }

  //v2.4 -> v3.1
  if ("propbal-membres"==idliste && "popupshowing"==event.type){
    AnaisTrace("anaisPropContext row:"+row.value);
    let elem=liste.contentView.getItemAtIndex(row.value);
    AnaisTrace("anaisPropContext propbal-membres elem:"+elem);
    if (null==elem){
      AnaisTrace("anaisPropContext propbal-membres element non defini - menu masque");
      return false;
    }
    let id=elem.getAttribute("id");
    if (null==id || ""==id){
      AnaisTrace("anaisPropContext propbal-membres id non defini - menu masque");
      return false;
    }
    AnaisTrace("anaisPropContext id:"+id);
  }

  return true;
}

