
ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/pacomeAuthUtils.jsm");

//numero de version du module
const VERSION_ANAIS="6.3";


//namespace anais dans le document de reponse
const ANAIS_NS="http://anais.melanie2.i2/schema";


//url du script serveur
var gUrlScript="http://mceweb2.si.minint.fr/anais/anaism2.php";


/**
*	types d'operations supportees par le serveur
*	lors d'une requête au serveur, l'absence d'operation correspond au demarrage
*/
//lecture d'un element d'arborescence
const LIT_ARBRE				="litarbre";
//listage d'un element d'arborescence
const LISTE_ARBRE			="listearbre";
//lecture d'une boite
const LIT_BOITES			="litboite";
//listage des boites d'un conteneur
const LISTE_BOITES		="listeboites";
//recherche simple d'une boite
const RECH_BOITE			="rechboite";


/**
*	Generation de traces
*/
var gAnaisInitTrace=false;
var gAnaisConsole=null;

function AnaisTrace(msg){

  if (!gAnaisInitTrace){
    let t=Services.prefs.getBoolPref("anais.anaismoz.trace");
    if (t)
      gAnaisConsole=Services.console;
    gAnaisInitTrace=true;
  }
  if (gAnaisConsole)
    gAnaisConsole.logStringMessage("[Anais] "+msg);
}


//V0.11 - racines des images
var gRacineImages="";

//code dernière erreur
var gCodeErreur=0;
//message dernière erreur
var gMsgErreur="";

//liste des chaines anais.properties
var g_messages_anais=null;

/**
*	Retourne une chaîne de message à partir de son identifiant dans le fichie anais.properties
*/
function AnaisMessageFromId(msgid){
  
  if (null==g_messages_anais)
    g_messages_anais=Services.strings.createBundle("chrome://anais/locale/anais.properties");
  
  return g_messages_anais.GetStringFromName(msgid);
}


/**
*	Affichage d'un message à partir de l'identifiant dans anais.properties
*
*	@param msgid identifiant du message
*/
function AnaisAfficheMsgId(msgid){
  
  let msg=AnaisMessageFromId(msgid);
  
  Services.prompt.alert(window, "", msg);
}

/**
*	Affichage d'un message à partir de l'identifiant dans anais.properties
*
*	@param msgid identifiant du message
*	@param msg2 message additionnel affiche sur nouvelle ligne (optionnel)
*/
function AnaisAfficheMsgId2(msgid,msg2){
  
  let msg=AnaisMessageFromId(msgid);
  if (null!=msg2) 
    msg+="\n"+msg2;
  Services.prompt.alert(window, "", msg);
}

/**
*	Affichage d'un message à partir de l'identifiant dans anais.properties
*	ajoute code et message erreur globale
*
*	@param msgid identifiant du message
*/
function AnaisAfficheMsgIdGlobalErr(msgid){
  
  let msg=AnaisMessageFromId(msgid);
  msg+="\nCode:"+gCodeErreur;
  msg+="\nMessage:"+gMsgErreur;
  Services.prompt.alert(window, "", msg);
}



/**
*	analyse le document xml anaismoz - extrait le code erreur et le message
*
*	@param	doc instance de document xml
*
*	@return true si code erreur = 0
* sinon retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisAnalyseErreurDoc(doc){

  let resultat=doc.getElementsByTagNameNS(ANAIS_NS, "anaismoz");
  
  if (null==resultat||null==resultat[0]){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrInitSrvDoc");
    AnaisTrace("anaisAnalyseErreurDoc null==resultat||null==resultat[0]");
    return false;
  }
  
  resultat=resultat[0];
  
  gCodeErreur=resultat.getAttribute("errcode");
  gMsgErreur=resultat.getAttribute("errmsg");
  
  if ((gCodeErreur==null)||(gCodeErreur!=0)){
    AnaisTrace("anaisAnalyseErreurDoc gCodeErreur="+gCodeErreur);
    return false;
  }

  return true;
}


/**
*	affiche message d'erreur et code (gCodeErreur et gMsgErreur)
*
*	@param	titre du message
*
*	@return aucun
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	03/01/2006 obsolète, utiliser 'AnaisAfficheMsgId' ou 'AnaisAfficheMsgId2' (AnaisTraces.js)
*
*/
function anaisAfficheErreur(titre){

  alert(titre+"\nMessage:"+gMsgErreur+"\nCode="+gCodeErreur);
}


/**
*	construit les elements d'interface à partir d'un objet noeud xml
*				qui peut etre obtenu après parsing d'une chaine xml avec DOMParser
*
*	@param	domnode noeud xml
*
*	@return si succes l'element d'interface (XULElement)
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation : parcours les elements fils de domnode et les ajoute en tant que fils du resultat
*
*/
function anaisCreeElements(domnode){

  //element
  let elem=document.createElement(domnode.nodeName);
  //attributs
  if (domnode.attributes!=null){
    for (var i=0;i<domnode.attributes.length;i++){
      elem.setAttribute(domnode.attributes[i].name,domnode.attributes[i].value);
    }
  }
  //fils
  if (domnode.hasChildNodes()){
    for (var c=0;c<domnode.childNodes.length;c++){
      let fils=anaisCreeElements(domnode.childNodes[c]);
      if (fils==null){
        return null;
      }
      elem.appendChild(fils);
    }
  }
  //resultat
  return elem;
}


/**
*	fait une demande de requête asynchrone au serveur
*
*	@param	op operation demandee
*	@param  dn	distinguishedname
*	@param  param paramètre optionel (selon valeur de op)
*	@fnc		fonction de rappel
*
* v2.7 elem : element interface pour ajout fils (argument pour fnc)
*	v3.1 elem : conteneur xul ou chemin selon besoins
*
*	@return si succes retourne true
* si erreur retourne null (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisReqSrvFnc(op, dn, param, fnc, elem){

  AnaisTrace("anaisReqSrvFnc op='"+op+"' dn='"+dn+"'");

  let httpRequest=new XMLHttpRequest();

  anaisDlgLibStatut("Interrogation du serveur...");
  anaisSetWaitCursor();

  httpRequest.onreadystatechange=function(){
    
    switch(httpRequest.readyState) {
      
      case 4:
        let statut=0;
        try{
          statut=httpRequest.status;
        }
        catch(ex1){
          gCodeErreur=-1;
          gMsgErreur=AnaisMessageFromId("anaisdlg_ErrSrv");
          AnaisTrace("anaisReqSrvFnc exception httpRequest.status:"+ex1);
          anaisDlgLibStatut("");
          fnc(null, elem);
          httpRequest=null;
          return;
        }
        anaisDlgLibStatut("");
        if(statut!=200) {
          gCodeErreur=statut;
          gMsgErreur=AnaisMessageFromId("anaisdlg_ErrSrv");
          AnaisTrace("anaisReqSrvFnc statut!=200 :"+statut);
          fnc(null, elem);
          httpRequest=null;
          return;
        }
        else {
          //identifiant de session php
          let sessionId=LitSessionPhp();
          if (""==sessionId){
            try{
              let hdr=httpRequest.getResponseHeader("Set-Cookie");
              MemoSessionPhp(hdr);
            }catch(ex1){AnaisTrace("anaisReqSrvFnc exception getResponseHeader"+ex1);}
          }
          //traitement du document de reponse
          let doc=httpRequest.responseXML;
          if (doc==null){
            gCodeErreur=-1;
            gMsgErreur=AnaisMessageFromId("anaisdlg_ErrSrv");
            AnaisTrace("anaisReqSrvFnc doc==null:"+gMsgErreur);
            fnc(doc, elem);
            return;
          }
          
          //v0.54 si code erreur -10 -> renouveler requête avec identifiant utilisateur
          let res=anaisAnalyseErreurDoc(doc);
          
          if (!res && -10==gCodeErreur){
            gCodeErreur=0;
            gMsgErreur="";
            let uid=anaisConfigNomUtilisateur();
            if (null==param){
              param="";
            }
            param+="&anaismoz-uid="+uid;
            httpRequest=null;
            anaisReqSrvFnc(op,dn,param,fnc, elem);
            return;
          }
          
          //appeler la fonction de rappel
          fnc(doc, elem);
          httpRequest=null;
          return;
        }
      break;
    }
    return;
  }

  httpRequest.open("POST", gUrlScript, true, null, null);

  let postparam="";
  if (op!=null){postparam+="anaismoz-op="+op}
  if (dn!=null){
    let dnenc=encodeURIComponent(dn);
    if (postparam!="") postparam+="&";
    postparam+="anaismoz-dn="+dnenc;
  }
  if ((op=='')&&(param!=null)){
    if (postparam!="") postparam+="&";
    postparam+="anaismoz-uid="+param;
  }
  
  //paramètres additionnels dans anaismoz-par
  if ((op!='')&&(param!=null)&&(""!=param)){
    if (postparam!="") postparam+="&";
    postparam+="anaismoz-par="+param;
  }
  
  //identifiant de session php
  let sessionId=LitSessionPhp();
  if (sessionId!=""){
    if (postparam!="") postparam+="&";
    postparam+="sessionid="+sessionId;
  }
  
  postparam+="&extver="+VERSION_ANAIS;
  
  AnaisTrace("anaisReqSrvFnc postparam="+postparam);

  httpRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
  httpRequest.send(postparam);

  return true;
}



/**
*	modifie les url des images pour les elements treeitem contenus dans 'elems'
*
*	@param	elems liste des elements treeitem
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation : on recherche les <treecell> qui ont un attribut 'src'
*	V0.11 : cas particulier element racine d'arborescence un seul element treetitem != treechildren
*	V0.11 gRacineImages est la racine des images (plus passee en parametres
*/
function anaisSetRacineImages(elems){

  //V0.11 cas particulier element racine d'arborescence
  if (elems.tagName=="treeitem"){
    let cells=elems.getElementsByTagName("treecell");
    //le premier treecell contient 'src'
    if (cells && cells[0]){
      let src=cells[0].getAttribute("src");
      cells[0].setAttribute("src",gRacineImages+src);
    }
    return true;
  }
  
  //cas d'une liste de treeitem dans une racine treechildren
  let items=elems.getElementsByTagName("treeitem");
  let nb=items.length;
  for (var i=0;i<nb;i++){
    let cells=items[i].getElementsByTagName("treecell");
    //le premier treecell contient 'src'
    if (cells && cells[0]){
      let src=cells[0].getAttribute("src");
      cells[0].setAttribute("src",gRacineImages+src);
    }
  }

  return true;
}

/**
*
*
*/
function anaisSetWaitCursor(){
  window.setCursor("wait");
}

/**
*
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisRestoreCursor(){
  window.setCursor("auto");
}

/**
*	traitement du clic de colonne pour le tri
*
*	@param	treeid identifiant d'arbre (tree)
*	@param	treecol	element treecol
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisClicColonne(treeid,treecol){

  //trier les elements
  let indexcol=treecol.getAttribute("ordinal")-1;
  indexcol/=2;//pris en compte splitters
  let bUp=true;
  let sens=treecol.getAttribute("sortDirection");
  if (sens=="descending") 
    bUp=false;
  
  if (treeid=="anaismoz-boites"){
    anaisBoitesEffSel();
    anaisTriItemsBoites(indexcol,bUp);
  } else 
    anaisTriItemsDest(indexcol,bUp);

  //sens du tri -> inversion
  if (bUp) 
    treecol.setAttribute("sortDirection","descending");
  else 
    treecol.setAttribute("sortDirection","ascending");

  return true;
}

/**
*	affiche la boite de dialogue 'A propos'
*/
function anaisBoiteApropos(){
  window.openDialog("chrome://anais/content/apropos.xul","","dialog,centerscreen,titlebar,modal");
}


/**
*	affiche la boîte de dialogue de legende des icones
*
*/
function anaisBoiteLegende(){
  window.openDialog("chrome://anais/content/legende.xul","","dialog,centerscreen,titlebar,modal");
}

/**
*	retourne le nom d'utilisateur du compte de messagerie par defaut
*
*	@return si succes retourne le nom d'utilisateur
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*/
function anaisConfigNomUtilisateur(){

  let uid=PacomeAuthUtils.GetUidComptePrincipal();
  
  if (null==uid){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrCompte");
    return null;
  }

  return uid;
}

/**
*	affichage de la boîte des proprietes d'une boîte aux lettres
*
*	@param	treeid identifiant du contrôle <tree> de la liste des boites
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation : affiche les proprietes de la boite selectionnee (1ere de la liste si plusieurs)
*	si treeid est null prendre anaismoz-boites
*
*	29/08/2005: si pas de chemin, requête asynchrone à partir du mail de la boîte
*/
function anaisDlgPropBal(treeid){

  let idarbre=treeid;
  if (treeid==null){
    idarbre="anaismoz-boites";
  }
  //determiner dn et cn (optionnel) de la boîte à afficher
  //si dn inexistant -> messsage d'information puis sortie
  let elem=null;
  if (idarbre=="anaismoz-boites"){
    
    let index=gBoites.view.selection.currentIndex;
    if (-1==index) 
      return false;
    elem=gBoitesView.getBoite(index);
    
  } else{
    
    let arbre=document.getElementById(idarbre);
    index=arbre.view.selection.currentIndex;
    if (-1==index) return false;
    elem=arbre.contentView.getItemAtIndex(index);
  }
  
  let dnelem=elem.getAttribute("id");
  
  //retrouver la colonne avec id boites-cn
  //cas chemin ldap absent -> recherche
  //v2.4 dn null pour membres externes dans la liste des membres -> ignorer
  if ("propbal-membres"==idarbre && (null==dnelem || ""==dnelem)){
    AnaisTrace("anaisDlgPropBal double-clic sur membre externe - pas d'affichage de proprietes");
    return false;
  }
  
  if (null==dnelem || ""==dnelem){
    let cells=elem.getElementsByTagName("treecell");
    let mail=cells[2].getAttribute("label");
    if ((null==mail)||(""==mail)){
      AnaisAfficheMsgId("anaisdlg_PropBalMail");
      return false;
    }
    anaisSetWaitCursor();
    let res=anaisRechCheminLdap(mail,anaisDlgPropBalRap);
    anaisRestoreCursor();
    if (false==res){
      AnaisAfficheMsgIdGlobalErr("anaisdlg_PropErrBal");
      return false;
    }
    return true;
  }
  
  //affichage des proprietes
  anaisDlgPropBalRap(dnelem);

  return true;
}

/**
*	fonction de rappel pour la fonction anaisDlgPropBal
*	affichage de la boîte des proprietes d'une boîte aux lettres
*
*	@param	chemin chemin ldap de la boîte
*
*	implementation : affiche les proprietes de la boite selectionnee (1ere de la liste si plusieurs)
*
*/
function anaisDlgPropBalRap(chemin){
  anaisRestoreCursor();

  if (null==chemin){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_PropErrBal");
    return;
  }
  window.openDialog("chrome://anais/content/anaisdlgpropbal.xul","","chrome,center,titlebar,dialog=no",{dn:chemin});
}


/**
*	determine si deux chemins ont un lien de parente
*
*	@param	chemin	chemin ldap à tester
*	@param	parent	chemin ldap parent
*
*	@return retourne true si 'parent' est un parent de 'chemin'
* sinon retourne false
*
*	implementation :
*	tester sur le nom de serveur et le distinguishedname
*	ldap://srv/dn
*/
function anaisIsCheminParent(chemin, parent){

  let cp1=chemin.split('/');
  let cp2=parent.split('/');
  
  if (cp1[2]!=cp2[2])
    return false;
  
  if (cp1[3].indexOf(cp2[3])!=-1)
    return true;

  return false;
}


/**
*	effectue une recherche dans l'annuaire (operation rechboite)
*	si une entree existe, retourne le chemin ldap
*
*	@param	mail valeur de l'adresse mail de l'entree à rechercher
*	@param	fnc fonction de rappel pour le retour de la valeur (chemin ou null si erreur)
*
*	implementation :
*	effectue une requête asynchrone
*/
function anaisRechCheminLdap(mail,fnc){

  AnaisTrace("anaisRechCheminLdap mail:"+mail);

  let httpRequest=new XMLHttpRequest();

  //detection boite partagee
  let valeur=mail;
  let pos=valeur.indexOf(".-.");
  if (pos>0){
    valeur=valeur.substr(pos+3);
  }

  //requete asynchrone
  anaisDlgLibStatut("Interrogation du serveur...");

  httpRequest.onreadystatechange=function(){
    switch(httpRequest.readyState) {
      case 4:
        let statut=0;
        try{

          statut=httpRequest.status;
          
        } catch(ex1){
          
          gCodeErreur=-1;
          gMsgErreur=AnaisMessageFromId("anaisdlg_ErrSrv");
          AnaisTrace("anaisRechCheminLdap exception httpRequest.status:"+ex1);
          anaisDlgLibStatut("");
          fnc(null);
          return;
        }
        
        anaisDlgLibStatut("");
        
        if(statut!=200) {
          
          gCodeErreur=statut;
          gMsgErreur=AnaisMessageFromId("anaisdlg_ErrSrv");
          AnaisTrace("anaisRechCheminLdap statut!=200 :"+gMsgErreur);
          fnc(null);
          return;
          
        } else {
          
          //identifiant de session php
          let sessionId=LitSessionPhp();
          if (""==sessionId){          
            try{
              let hdr=httpRequest.getResponseHeader("Set-Cookie");
              MemoSessionPhp(hdr);
            }catch(ex1){AnaisTrace("anaisRechCheminLdap exception getResponseHeader"+ex1);}
          }
          
          //traitement du document de reponse
          let doc=httpRequest.responseXML;
          if (doc==null){
            AnaisTrace("anaisRechCheminLdapRap doc==null");
            fnc(null);
            return;
          }
          
          //code de resultat
          let bDocOk=anaisAnalyseErreurDoc(doc);
          if (!bDocOk){
            //v0.54 si code erreur -10 -> renouveler requête avec identifiant utilisateur
            if (-10==gCodeErreur){
              gCodeErreur=0;
              gMsgErreur="";
              anaisRestoreCursor();
              let uid=anaisConfigNomUtilisateur();
              valeur+="&anaismoz-uid="+uid;
              anaisRechCheminLdap(valeur,fnc);
              return;
            }
            //autre erreur
            fnc(null);
            return;
          }
          
          //rechercher première entree
          let boites=doc.getElementsByTagNameNS(ANAIS_NS, 'boites');
          if ((boites==null)||(boites[0]==null)){
            gCodeErreur=-1;
            gMsgErreur=AnaisMessageFromId("anaisdlg_ErrBoitesSrvBal");
            fnc(null);
            return;
          }
          let data=boites[0].getElementsByTagName('treeitem');

          if (null==data || 0==data.length){
            gCodeErreur=-1;
            gMsgErreur=AnaisMessageFromId("anaisdlg_ErrRech0mail")+valeur;
            fnc(null);
            return;
          }
          data=data[0];
          let chemin=data.getAttribute("id");
          fnc(chemin);
          return;
        }
      break;
    }
    return;
  }
  
  httpRequest.open("POST", gUrlScript, true, null, null);

  let postparam="anaismoz-op="+RECH_BOITE+"&anaismoz-par="+valeur+"&extver="+VERSION_ANAIS;

  //identifiant de session php
  let sessionId=LitSessionPhp();
  if (sessionId!=""){
    postparam+="&sessionid="+sessionId;
  }
  else{
    //V0.11 - determiner nom d'utilisateur -> entête 'anaismoz-uid'
    let uid=anaisConfigNomUtilisateur();
    //numeros de version
    let appver="erreur";
    try{
      appver=navigator.userAgent;
    }catch(ex1){}
    postparam+="&anaismoz-uid="+uid+"&appver="+appver;
  }
  AnaisTrace("anaisRechCheminLdap postparam="+postparam);

  httpRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
  httpRequest.send(postparam);

  return true;
}



/**
*	calcul le conteneur parent du chemin specifie
*
*	@param	chemin chemin ldap de l'element
*
*	@return si succes retourne chemin ldap
* si erreur retourne chaine vide
*
*/
function conteneurParent(chemin){

  let p2=chemin.indexOf(",");
  let p1=chemin.lastIndexOf("/", p2);
  let parent=chemin.substring(0,p1+1)+chemin.substring(p2+1);
  return parent;
}


/**
*	memorise l'identifiant de session php
*	utilise par les fonctions de rappel des requêtes en mode asynchrone
*
*/
function MemoSessionPhp(hdr){
  
  let mail3Pane=Services.wm.getMostRecentWindow("mail:3pane");
  if (null==mail3Pane)
    return;

  let sessionId="";

  //extraire identifiant de session
  if (null!=hdr){
    let pos1=hdr.indexOf("=");
    let pos2=hdr.indexOf(";");
    if ((-1!=pos1)&&(-1!=pos2)){
      sessionId=hdr.substring(pos1+1,pos2);
    }
  }

  mail3Pane.anais_sessionid=sessionId;
}

/**
*	retourne l'identifiant de session php
*
*
*/
function LitSessionPhp(){
  
  let mail3Pane=Services.wm.getMostRecentWindow("mail:3pane");
  if (null==mail3Pane)
    return "";

  return mail3Pane.anais_sessionid;
}

/**
*	affiche un message dans la barre d'outils
*
*/
function anaisDlgLibStatut(msg){

  let elem=document.getElementById("anaismozdlg-libstatut");
  if (null==elem)return;
  elem.value=msg;
}

/**
*	reconstitue le chemin du conteneur qui a servi dans la requête
*
*	@param doc document xml de reponse du serveur
*
*	@return chaine du chemin ldap reconstitue
*
*	Implementation : lit les attributs op chemin et param dans le document
*	reconstruit le chemin à partir de chemin
*	si op=rechbs remplace ldap:// par rechbs://
*							et si param non vide ajoute ?param
*/
function anaisCheminReqDoc(doc){

  let resultat=doc.getElementsByTagNameNS(ANAIS_NS, "anaismoz");
  resultat=resultat[0];
  let op=resultat.getAttribute("op");
  let chemin=resultat.getAttribute("chemin");
  let param=resultat.getAttribute("param");
  if ("rechbs"==op){
    chemin=chemin.replace("ldap://","rechbs://");
    if (param && ""!=param){
      chemin+="?"+param;
    }
  }
  
  return chemin
}

/**
*	ouvrir une url depuis les pages de proprietes
*
*	@param	url url à ouvrir
*
*	@return aucun
*/
function anaisOuvreSite(url){

  let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
  messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
  let urlenc=encodeURI(url);
  messenger.launchExternalURL(urlenc);

  return true;
}



/**
*	Affiche la boîte anais en mode explorateur d'annuaire (pas de choix de destinataires)
*
*/
function OuvreAnais(){

  //gestion du mode offline
  if (Services.io.offline){
    AnaisAfficheMsgId("anaisdlg_ErrDeconnecte");
    return ;
  }
  
  //rechercher fenêtre Anais dejà ouverte
  let windowManager=Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
  
  //anaisModeChoixDest
  let fenanais=null;
  let liste=windowManager.getEnumerator("anaismoz-dlg");
  while (liste.hasMoreElements()){
    let fen=liste.getNext();
      if (0==fen.anaisModeChoixDest()){
      fenanais=fen;
      break;
    }
  }
  if (fenanais){
    fenanais.document.commandDispatcher.focusedWindow.focus();
    return;
  }

  window.openDialog("chrome://anais/content/anaismozdlg.xul", "",
                    "chrome,center,resizable,titlebar,dialog=no");
}

// compare les noms des serveurs de 2 chemins
// retourne true si identiques, sinon false
function compareServeur(chemin1, chemin2){
  
  let compos1=chemin1.split("/");
  let compos2=chemin2.split("/");
  if (compos1 && compos2 &&
      3<compos1.length &&
      3<compos2.length &&
      compos1[2]==compos2[2]){
        
    return true;
  }
  return false;
}
