ChromeUtils.import("resource:///modules/mailServices.js");
ChromeUtils.import("resource://gre/modules/Services.jsm");


/**
* Memorisation du chemin courant
*	preference "anais.anaismoz.chemincourant"
*	02/06/2004
*/
var gCheminCourant="";
//v0.51 conteneur selectionne au lancement (si vide aucun) (pref anais.anaismoz.demarrage)
var g_SelectionDem="";

var gAnaisInitOk=false;

//contrôle de saisie recherche simple
var gSaisieRech=null;
//bouton de recherche simple
var btRech=null;

//mode de fonctionnement de la boîte anais
//v3.2 - constantes de mode
//mode affichage liste des boites (explorateur)
const ANAIS_MODE_EXPL=0;
//mode choix des destinataires
const ANAIS_MODE_COMPO=1;
//mode edition des participants
const ANAIS_MODE_PARTS=2;

//mode de fonctionnement courant
var g_bMode=ANAIS_MODE_EXPL;


//liste des caractères valides pour la saisie de la recherche simple
var g_FiltreSaisie=/([a-zA-Z0-9à-ïöôù-ü_\.\-\ \(\)\@\/\#\&\,\:\<\>\[\]\{\}])+/g;


//configuration application pauline
var gpauline_racinedn="";
var gpauline_urlentite="";
var gpauline_urlbal="";



/**
*	initialisation de la boite de dialogue
*
*	implementation :
*
*	V0.2 (25/08/2004) operation initanais supprimee -> operation vide avec chemin
*	(09/11/2004) transmission des numeros de version
*
*	v 0.4 utilise anaisReqSrvDoc au lieu de anaisReqSrv
*/
function initAnaisDlg(){

  gCodeErreur=0;
  gMsgErreur="";

  if (Services.io.offline){
    anaisBtFermer();
    return false;
  }  

  //initialisation url du serveur à partir de la preference 'anais.anaismoz.urlserveur' 
  //url du serveur
  gUrlScript=Services.prefs.getCharPref("anais.anaismoz.urlserveur");
  
  //chemin courant
  if (Services.prefs.prefHasUserValue("anais.anaismoz.chemincourant")){
    let val=Services.prefs.getCharPref("anais.anaismoz.chemincourant");
    if (val!=""){
      gCheminCourant=val;
    }
  }

  //v0.51 conteneur selectionne au lancement
  if (Services.prefs.prefHasUserValue("anais.anaismoz.demarrage")){
    let val=Services.prefs.getCharPref("anais.anaismoz.demarrage");
    if (val!=""){
      g_SelectionDem=val;
    }
  }
  AnaisTrace("initAnaisDlg g_SelectionDem:"+g_SelectionDem);

  //mode de fenetre
  let modefen=ANAIS_MODE_EXPL;
  if ("arguments" in window && window.arguments[0]) {
    if (window.arguments[0].composeWindow) modefen=ANAIS_MODE_COMPO;
    else if (window.arguments[0].participants) modefen=ANAIS_MODE_PARTS;
  }

  initModeUI(modefen);


  //identifiant de session php (21/03/2006 peut avoir ete cree avant)
  let param=null;
  let sessionId=LitSessionPhp();
  
  if (""==sessionId){
    //V0.11 - determiner nom d'utilisateur -> entête 'anaismoz-uid'
    let uid=anaisConfigNomUtilisateur();
    //numeros de version
    let appver="erreur";
    try{
      appver=navigator.userAgent;
    }catch(ex1){}
    //02-06-2004 chemin courant au demarrage
    param=uid+"&appver="+appver;//09/11/2004
  }
  
  //interrogation du serveur (demarrage -> sans paramètres)
  anaisSetWaitCursor();
  //requête asynchrone
  let chemin=gCheminCourant;
  if (""!=g_SelectionDem) 
    chemin=g_SelectionDem;
  AnaisTrace("initAnaisDlg chemin:"+chemin);
  
  let res=anaisReqSrvFnc("",chemin,param,initAnaisDlgRap, null);
  if (false==res){
    AnaisAfficheMsgId("anaisdlg_ErrInit");
    close();
    return false;
  }

  //charger source anais.rdf
  ChargeSourceAnais(initAnaisDlgSourceRap);

  gAnaisInitOk=true;
  
  return true;
}

/**
*	fonction de rappel pour la fonction ChargeSourceAnais
*
*
*/
function initAnaisDlgSourceRap(dsmsg){

  if (dsmsg instanceof Components.interfaces.nsIRDFDataSource){

    gSourceAnais=dsmsg;

    return;
  }

  //sinon erreur
  let msg="Erreur d'initialisation de la liste des favoris.\n";
  if (dsmsg instanceof String){
    msg+=dsmsg;
  }

  alert(msg);
}


/**
*	fonction de rappel pour la fonction initAnaisDlg
*	traite le resultat de la requête asynchrone
*
*	@param	doc document xml de reponse du serveur (null si erreur)
*
*	implementation :
*
*/
function initAnaisDlgRap(doc, elem){

  AnaisTrace("initAnaisDlgRap");

  if (null==doc){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrInit");
    document.getElementById("anaismozdlg-btfermer").click();
    return;
  }
  
  //tester resultat de la requête
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrInit");
    document.getElementById("anaismozdlg-btfermer").click();
    return;
  }
  let resultat=doc.getElementsByTagNameNS(ANAIS_NS, "anaismoz");
  resultat=resultat[0];
  
  //V0.11 racine des images
  gRacineImages=resultat.getAttribute("images");
  
  //utiliser l'attribut 'chemin' de l'element <anaismoz> du document pour le chemin courant
  gCheminCourant=resultat.getAttribute("chemin");
  if (g_SelectionDem!=gCheminCourant) 
    g_SelectionDem="";

  AnaisTrace("initAnaisDlgRap gCheminCourant:"+gCheminCourant);
  
  //traiter arborescence
  let res=anaisInitArbre(doc);
  if (res==false){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrInitArbre");
    return;
  }
  //traiter liste des boites
  res=anaisInitBoites(doc);
  if (res==false){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrInitBoites");
    return;
  }
  
  //initialisation liste des destinataires
  if (ANAIS_MODE_COMPO==g_bMode) 
    anaisInitDestCompose();
  else if (ANAIS_MODE_PARTS==g_bMode) 
    anaisInitDestParts();
  
  //selectionner conteneur existant (a faire après anaisInitBoites)
  anaisArbreSelChemin(gCheminCourant);

  gSaisieRech=document.getElementById("anais-rechtxt");
  gSaisieRech.focus();

  btRech=document.getElementById("anais-rechbt");
  anaisRestoreCursor();
  
  //liste des caractères autorises pour la saisie de la recherche
  let racine_rech=anaisRacineRech();
  let saisie="";
  if (racine_rech.hasAttribute("saisie")){
    saisie=racine_rech.getAttribute("saisie");
    if (saisie!=""){
      g_FiltreSaisie=saisie;
    }
  }
  //limite du nombre de recherches
  if (racine_rech.hasAttribute("limite")){
    let limite=racine_rech.getAttribute("limite");
    if (null!=limite){
      gMaxElemCache=limite;
    }
  }
  
  //arborescence des recherches
  anaisArbreInitRechs();

  //configuration application pauline
  let pauline=doc.getElementsByTagNameNS(ANAIS_NS, "pauline");
  if (null!=pauline && pauline.length){
    let elemui=document.getElementById("anaismoz.pauline");
    elemui.removeAttribute("hidden");
    gpauline_racinedn=pauline[0].getAttribute("racinedn");
    gpauline_urlentite=pauline[0].getAttribute("urlentite");
    gpauline_urlbal=pauline[0].getAttribute("urlbal");
  }
}


/**
*	fixe le libelle du bandeau
*
*	@param	texte texte à utiliser
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisBandeauSetLib(texte){

  let bandeau=document.getElementById("anaismoz-bandeau");
  bandeau.value=texte;

  return true;
}


/**
*	fonction appelee à la fermeture de la boîte de dialogue
*
*	implementation :
*	V0.11 02-06-2004 sauvegarde le chemin courant
*/
function quitteAnaisDlg(){

  if (!gAnaisInitOk){
    //cas ou anais n'a pas ete affiche correctement (echec init)
    return;
  }
  //sauvegarde le chemin courant
  Services.prefs.setCharPref("anais.anaismoz.chemincourant",gCheminCourant);
  //v0.51 conteneur selectionne au lancement
  Services.prefs.setCharPref("anais.anaismoz.demarrage",g_SelectionDem);

  Services.prefs.savePrefFile(null);

  //sauvegarde du cache des recherches
  //v2.5 si mode autonome (bug mantis 915)
  if (null!=gAnaisCache){
    anaisCacheSauve();
  }
}



/**
*	initialisation des elements d'interface selon le mode d'appel de la boîte
*
* mode : ANAIS_MODE_EXPL, ANAIS_MODE_COMPO, ANAIS_MODE_PARTS
*/
function initModeUI(mode){

  g_bMode=mode;

  if (ANAIS_MODE_EXPL==g_bMode) {
    AnaisTrace("initModeUI mode explorateur");
    let bt=document.getElementById("anaismozdlg-btvalider");
    bt.setAttribute("hidden",true);
    bt=document.getElementById("anaismozdlg-btannuler");
    bt.setAttribute("hidden",true);
    let elem=document.getElementById("anaismoz-split");
    elem.setAttribute("hidden",true);
    elem=document.getElementById("anaismoz-zonedest");
    elem.setAttribute("hidden",true);
    //bouton envoi de message
    elem=document.getElementById("anaismoz-btcompose");
    elem.removeAttribute("hidden");
    //menu envoi de message
    elem=document.getElementById("anaismozdlg-btcompose");
    elem.removeAttribute("hidden");

    return;
  }

  //code commun ANAIS_MODE_COMPO ANAIS_MODE_PARTS
  let bt=document.getElementById("anaismozdlg-btfermer");
  bt.setAttribute("hidden",true);

  if (ANAIS_MODE_COMPO==g_bMode){
    AnaisTrace("initModeUI mode composition");

  } else if (ANAIS_MODE_PARTS==g_bMode){
    AnaisTrace("initModeUI mode participants");
  }
}

function anaisBtFermer(){
  
  let tabbedBrowser=window.parent.document.getElementById("tabmail");

  if (null!=tabbedBrowser) {
    tabbedBrowser.removeCurrentTab();
  } else{
    window.close();
  }
}


/**
*	action sur le bouton rechercher de la barre d'outils
*
*/
function btRechercheSimple(){

  let liste=document.getElementById("anais-rechtxt");
  let valeur=liste.value;
  if (3>valeur.length){
    AnaisAfficheMsgId("anais_RechCritMin");
    return;
  }
  
  //ajouter la valeur dans la liste
  let menus=liste.getElementsByTagName("menuitem");
  let nb=menus.length;
  let present=false;
  for (var i=0;i<nb;i++){
    if (menus[i].value==valeur){
      present=true;
      break;
    }
  }
  if (!present){
    liste.appendItem(valeur,valeur);
  }
  //executer la recherche
  RechercheSimple(gSaisieRech.value);
}


/**
*	evenement oninput du contrôle de saisie de la recherche simple
*
*	implementation : active le bouton rechercher à partir de trois caractères saisis
*/
function OnSaisieRech(event){

  //caractères autorises
  let str=gSaisieRech.value;
  gSaisieRech.value=str.match(g_FiltreSaisie);

  if (gSaisieRech.value.length<3){
    btRech.disabled=true;
    return true;
  }
  btRech.disabled=false;

  return true;
}

/**
*	evenement onkeypress du contrôle de saisie de la recherche simple
*
*	implementation : lance la recherche sur la touche 'entree'
*/
function OnEntreeSaisieRech(event){

  //cas touche entree -> lancer recherche
  if (event.keyCode==event.DOM_VK_RETURN){
    btRechercheSimple();
  }
}


/**
*	retourne le mode de fonctionnement de la boite (g_bMode)
*
*/
function anaisModeChoixDest(){
  return g_bMode;
}


/**
*	Notification d'une nouvelle recherche
*				Permet de notifier chaque fenêtre anais qu'une nouvelle recherche a ete realisee
*				C'est à chaque fenêtre d'ajouter si necessaire la nouvelle recherche dans l'arborescence
*
*	@param doc document xml du resultat de la requête sur le serveur
*	@param	libelle libelle du conteneur de recherche
*
*
*/
function anaisNotifieRech(doc){

  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, "arborescence");
  arbo=arbo[0];
  let item=arbo.getElementsByTagName("treeitem");
  item=item[0];
  let elem=document.getElementById(item.id);
  if (null!=elem){
    return;
  }
  //inserer l'element
  let racine="";
  let racine_rech=null;
  for (var i=0;i<gRacineArbre.childNodes.length;i++){
    let fils=gRacineArbre.childNodes[i];
    if (0==fils.id.indexOf("rech://")){
      racine=fils.id;
      racine_rech=fils;
      break;
    }
  }
  if (racine==""){
    return;
  }
  anaisArbreInsereContenu(racine_rech,doc);
  //deplier racine de recherche si necessaire
  racine_rech.setAttribute("open",true);
}

/**
*	notification de modification d'une recherche
*
*	@param ancienId	ancien identifiant
*	@param nouveauId nouvel identifiant
*	@param libelle nouveau libelle
*
*/
function anaisNotifieRechModif(ancienId,nouveauId,libelle){

  let elem=document.getElementById(ancienId);
  if (elem){
    elem.id=nouveauId;
    let treecells=elem.getElementsByTagName("treecell");
    treecells[0].setAttribute("label",libelle);

    let elemsel=anaisArbreItemSel();
    if (elemsel.id==nouveauId){
      //mise à jour contenu des boîtes
      anaisBoitesSetContainer(nouveauId);
    }
  }
}

/**
*	notification de suppression d'une recherche
*
*	@param rechid	identifiant element de recherche
*
*/
function anaisNotifieRechSup(rechid){
  
  let elem=document.getElementById(rechid);
  if (elem){
    let elemsel=anaisArbreItemSel();
    if (elemsel.id==rechid){
      //effacer contenu des boîtes
      anaisBoitesSetContainer("");
    }
    elem.parentNode.removeChild(elem);
  }
}

/**
*	notification de suppression de toutes les recherches
*
*/
function anaisNotifieRechSupTout(){
  
  //recherche racine des recherches
  let racine_rech=anaisRacineRech();
  if (null==racine_rech){
    AnaisAfficheMsgId("anais_RechErrBase");
    return;
  }
  let elems=racine_rech.getElementsByTagName("treeitem");

  if (0==elems.length){
    return;
  }
  while (elems.length){
    let elem=elems[0];
    let par=elem.parentNode;
    par.removeChild(elem);
  }

  if (0==gCheminBoites.indexOf("rechbs:")){
    anaisBoitesSetContainer("");
  }
}


/**
*	affiche et selectionne le conteneur de l'arborescence correspondant à la boîte selectionnee
*
*	implementation: fonctionne en mode asynchrone
*	effectue une ou deux requêtes asynchrones (2 si pas de chemin pour la boîte)
*
*	sequence:
*	anaisBoitesEntite: si pas de chemin -> requête du chemin à partir de mail -> anaisRechCheminLdap ->anaisBoitesEntiteCh
*										sinon appel anaisBoitesEntiteCh directement
*	anaisBoitesEntiteCh : traite le chemin de l'objet - requête asynchrone pour l'arborescence manquante
*	anaisBoitesEntiteRap : traite le resultat de la requête
*/
function anaisBoitesEntite(event){

  //boite selectionnee
  let index=gBoites.view.selection.currentIndex;
  if (-1==index)
    return;
  let elem=gBoitesView.getBoite(index);
  let chemin=elem.getAttribute("id");
  anaisSetWaitCursor();
  
  // Logs tests #5741: Modifier le comportement du clic droit/Atteindre l'entité
  let attributes = elem.attributes;
  for (let i = 0; i < attributes.length; i++) {
    console.log(attributes.item(i).name + ": " + attributes.item(i).value);
  }
  //console.log(elem.innerHTML);

  //#5741: Modifier le comportement du clic droit/Atteindre l'entité
  let departmentNumber = "";
  try{
    // On récupère la valeur du label contenant le commonName
    let ligne=elem.firstChild;
    let cell=ligne.childNodes[1];
    if(cell != null)
      departmentNumber = cell.getAttribute("label").split(" - ")[1];
    //format: DGPR/SRNH/SDCAP/PONSOH
    console.log("departmentNumber: " + departmentNumber.toLowerCase());
  }
  catch(ex){}
  let cheminAlias = "";
  // chemin au format: "ldap://ldap.melanie2.i2/uid=xavier.caron,ou=ponsoh,ou=dreal auvergne-rhône-alpes,ou=dr,ou=melanie,ou=organisation,dc=equipement,dc=gouv,dc=fr
  if(departmentNumber != "" && departmentNumber != null)
  {
    let departmentNumberArray = departmentNumber.toLowerCase().split("/");
    let cheminOk = true;
    for(let i = 0; i < departmentNumberArray.length; i++)
    {
      if(!chemin.includes(departmentNumberArray[i]))
      {
        console.log("Le chemin ne contient pas le departmentNumber !");
        cheminOk = false;
        break;
      }
    }
    if(!cheminOk)
    {
      // Reconstruction manuelle du chemin.
      let pathArray = chemin.split("/");
      let secondPathArray = pathArray[3].split(",");
      let thirdPathArray = "";
      for(let i = departmentNumberArray.length-1; i >= 0; i--)
      {
        thirdPathArray+="ou="+departmentNumberArray[i]+",";
      }
      //Format uid=helene.chitry,ou=PONSOH,ou=SDCAP,ou=SRNH,ou=DGPR,ou=AC,ou=melanie,ou=organisation,dc=equipement,dc=gouv,dc=fr
      cheminAlias = pathArray[0]+"//"+pathArray[2]+"/"+secondPathArray[0]+","+thirdPathArray+"ou=ac,ou=melanie,ou=organisation,dc=equipement,dc=gouv,dc=fr";
      console.log("Chemin reconstruit: " + cheminAlias);
    }
  }
  //#5741 FIN: Modifier le comportement du clic droit/Atteindre l'entité


  //cas chemin ldap absent -> recherche
  if ((null==chemin)||(""==chemin)){
    let cells=elem.getElementsByTagName("treecell");
    let mail=cells[2].getAttribute("label");
    if ((null==mail)||(""==mail)){
      AnaisAfficheMsgId("anaisdlg_ErrEntiteMail");
      return;
    }
    let res=anaisRechCheminLdap(mail,anaisBoitesEntiteCh);
    if (false==res){
      anaisRestoreCursor();
      AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrEntiteSel");
      return;
    }
    return;
  }
  //traitement du chemin
  anaisBoitesEntiteCh(chemin,cheminAlias);
}

/**
*	affiche et selectionne le conteneur de l'arborescence correspondant à la boîte selectionnee
*				fonction de rappel pour la fonction anaisBoitesEntite
*
*	@param chemin chemin ldap de la boîte
*
*/
function anaisBoitesEntiteCh(chemin,cheminAlias="")
{
  AnaisTrace("anaisBoitesEntiteCh chemin:"+chemin);
  if (null==chemin)
  {
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrEntite");
    window.close();
    return;
  }

  if(cheminAlias != "" && chercherConteneur(cheminAlias) == 1)
    return;
  else if(chercherConteneur(chemin) == 1)
    return;
  else
  {
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrEntiteSel");
    return;
  }
}

// #5741 - Retourne 1 si on a trouvé et affiché un conteneur, et 0 sinon.
function chercherConteneur(chemin)
{
  let cheminpar=conteneurParent(chemin);
  let conteneur=document.getElementById(cheminpar);
  AnaisTrace("anaisBoitesEntiteCh chemin parent:"+cheminpar);

  //rechercher si conteneur present
  if (null!=conteneur)
  {
    let parent=conteneur.parentNode;
    while (parent && parent.nodeName=="treechildren" && parent.id!="anaismoz-arbre-racine"){
      let elem=parent.parentNode;
      elem.setAttribute("open",true);
      parent=elem.parentNode;
    }
    anaisRestoreCursor();
    
    //selection
    anaisArbreSelChemin(cheminpar);
    
    //selection de la boîte dans la liste
    window.setTimeout(anaisSelectionBoite,1000,chemin);
    return 1;
  }

  //requête serveur asynchrone
  //operation vide -> retourne arborescence complete jusqu'au chemin demande
  let res=anaisReqSrvFnc("",cheminpar,null,anaisBoitesEntiteRap, chemin);
  if (false==res)
    return 0;

  return 1;
}

/**
*	affiche et selectionne le conteneur de l'arborescence correspondant à la boîte selectionnee
*	fonction de rappel pour la fonction anaisBoitesEntiteCh
*
*	@param doc document xml de reponse
*/
function anaisBoitesEntiteRap(doc, elem){

  if (null==doc){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrEntite");
    window.close();
    return;
  }

  let cheminboite=elem;

  //code de resultat
  //V0.11 attributs 'errcode' et 'errmsg' dans element 'anaismoz'
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrEntiteArbre");
    window.close();
    return;
  }

  anaisArbreEffSel();
  
  //remise à zero de la selection
  anaisBoitesEffSel();
  
  //vider le contenu de la liste
  anaisBoitesVideContenu();

  //inserer le contenu arborescence
  anaisUpdateArbo(doc);
  
  //boites
  AnaisTrace("anaisBoitesEntite anaisBoitesInsereContenu");
  let res=anaisBoitesInsereContenu(doc);
  if (!res){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return;
  }
  
  //V0.11 tri des boites
  anaisBoitesInitTri();
  
  //V0.11 affichage du nombre de boites
  anaisMajNbBoites();

  //extraire le chemin de l'objet original
  let chemin=anaisCheminReqDoc(doc);
  AnaisTrace("anaisBoitesEntite anaisCheminReqDoc chemin:"+chemin);
  if (null==chemin || ""==chemin){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return;
  }
  
  //evite double construction liste des boîtes
  gCheminBoites=chemin;
  
  //conteneur courant
  anaisArbreSelChemin(chemin);

  //selection de la boîte dans la liste
  if (compareServeur(chemin, cheminboite))
    anaisSelectionBoite(cheminboite);

  anaisRestoreCursor();
}


/**
*	Composition d'un message à partir des boîtes selectionnees
*
*/
function anaisDlgComposeMsg(){

  let msgComposeService=Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);
  let msgComposeType=Components.interfaces.nsIMsgCompType;
  let msgComposFormat=Components.interfaces.nsIMsgCompFormat;
  let params=Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
  if (params){
    
    params.type=msgComposeType.New;
    params.format=msgComposFormat.Default;
    let composeFields=Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
    
    if (composeFields){
      
      composeFields.to="";
      //liste des boites
      let nb=gBoites.view.rowCount;
      for (var i=0;i<nb;i++){
        if (gBoites.view.selection.isSelected(i)){
          
          let elem=gBoitesView.getBoite(i);
          
          //retrouver les colonnes avec id boites-cn boites-mail
          let cells=elem.getElementsByTagName("treecell");
          let cn=cells[gIndexcn].getAttribute("label");
          let mail=cells[gIndexmail].getAttribute("label");
          if (""!=composeFields.to) 
            composeFields.to+=",";
          composeFields.to+=MailServices.headerParser.makeMimeAddress(cn, mail);
        }
      }

      params.composeFields=composeFields;
      msgComposeService.OpenComposeWindowWithParams(null, params);
    }
  }
}

/**
*	Selection d'un conteneur dans la liste des favoris
*
*/
function SelectionFavori(){

  let liste=document.getElementById("anaismoz-favoris");
  let idfav=liste.selectedItem.getAttribute("value");
  let chemin=idfav.split(PREFIX_FAVORIS);
  chemin=chemin[1]
  AnaisTrace("SelectionFavori value="+chemin);
  ArbrePositionneConteneur(chemin);
}


/**
*	Edition des favoris
*
*/
function EditionFavoris(){

  window.openDialog("chrome://anais/content/editfavoris.xul","","dialog,centerscreen,titlebar,modal,resizable");

  let liste=document.getElementById("anaismoz-favoris");
  liste.selectedIndex=-1;
}

/**
*	Aller dans l'annuaire intra equipement (web)
*
*	@param treeid identifiant du controle actif (arbre, boites, destinataires ou null)
*/
function anaisDlgPauline(treeid){

  if (null==treeid){
    anaisOuvreSite(gpauline_urlentite);
    return;
  }

  let elem=null;
  let index=-1;
  if ("anaismoz-boites"==treeid){
    index=gBoites.view.selection.currentIndex;
    if (-1==index){
      anaisOuvreSite(gpauline_urlentite);
      return;
    }
    elem=gBoitesView.getBoite(index);
  }
  else{
    let arbre=document.getElementById(treeid);
    index=arbre.view.selection.currentIndex;
    if (-1==index){
      anaisOuvreSite(gpauline_urlentite);
      return;
    }
    elem=arbre.contentView.getItemAtIndex(index);
  }
  let dnelem=elem.getAttribute("id");
  AnaisTrace("anaisDlgPauline dnelem="+dnelem);
  
  //cas chemin ldap absent -> recherche
  if ((null==dnelem)||(""==dnelem)){
    let cells=elem.getElementsByTagName("treecell");
    let mail=cells[2].getAttribute("label");
    if ((null==mail)||(""==mail)){
      anaisOuvreSite(gpauline_urlentite);
      return;
    }
    anaisSetWaitCursor();
    let res=anaisRechCheminLdap(mail,anaisDlgPaulineRap);
    anaisRestoreCursor();
    if (false==res){
      anaisOuvreSite(gpauline_urlentite);
      return;
    }
    return;
  }
  
  //affichage des proprietes
  anaisDlgPaulineRap(dnelem);

  return;
}

function anaisDlgPaulineRap(dnelem){

  AnaisTrace("anaisDlgPaulineRap dnelem="+dnelem);
  if (null==dnelem || ""==dnelem){
    anaisOuvreSite(gpauline_urlentite);
    return;
  }
  let tab=dnelem.split("/");
  let dn=tab[3];
  AnaisTrace("anaisDlgPaulineRap gpauline_racinedn="+gpauline_racinedn);
  
  let pos=0;
  if (""!=gpauline_racinedn) 
    pos=dn.indexOf(gpauline_racinedn);
  
  AnaisTrace("anaisDlgPaulineRap pos="+pos);
  if (-1!=pos){
    if (0<pos) dn=dn.substring(0,pos-1);
    AnaisTrace("anaisDlgPaulineRap dn="+dn);
    let url="";
    if (0==dn.indexOf("ou=")){
      url=gpauline_urlentite;
    }
    else{
      url=gpauline_urlbal;
    }
    url+="?dn="+dn;
    anaisOuvreSite(url);
    return;
  }
}

/**
*	bloque la saisie dans la zone du libelle de favori
*
*/
function OnInputFavori(){
  return false;
}
