
/**
*	Variables globales
*/

//element arborescence des services (anaismoz-arbre)
var gArbre=null;

//element anaismoz-arbre-racine
var gRacineArbre=null;


/**
*	initialisation de l'arborescence insertion des colonnes et elements
*
*	@param	document
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*	V 0.4 la fonction 'anaisSetRacineImages' n'est plus appelee
*/
function anaisInitArbre(doc){

  AnaisTrace("anaisInitArbre");

  gArbre=document.getElementById("anaismoz-arbre");
  gRacineArbre=document.getElementById("anaismoz-arbre-racine");

  //element <arborescence>
  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, 'arborescence');
  if (arbo==null || arbo[0]==null){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrArbreSrvServices");
    return false;
  }

  //colonnes
  let cols=null;
  cols=arbo[0].getElementsByTagName('treecols');
  if (cols==null || cols[0]==null){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrArbreSrvCol");
    return false;
  }
  cols=cols[0];
  let arbrecols=anaisCreeElements(cols);
  if (arbrecols!=null)
    gArbre.appendChild(arbrecols);
  else{
    return false;
  }

  //contenu
  //v0.11-02-06-2004 l'arborescence est une liste d'eleements <branche conteneur="dn parent">
  //si dn parent vide, c'est une racine
  let branches=arbo[0].getElementsByTagNameNS(ANAIS_NS, "branche");
  for (var b=0;b<branches.length;b++){
    let dn=branches[b].getAttribute("conteneur");
    if (branches[b].hasChildNodes()){
      let arbredata=anaisCreeElements(branches[b].firstChild);
      if (arbredata==null){
        gMsgErreur=AnaisMessageFromId("anaisdlg_ErrInitArbre")+gMsgErreur;
        return false;
      }

      let racine=null;
      if (dn==""){
        racine=gRacineArbre;
      }
      else {
        racine=document.getElementById(dn);
      }
      if (racine!=null) racine.appendChild(arbredata);
      else {}
    }
  }

  //deplier les elements racine qui ont des fils
  let nb=gArbre.view.rowCount;
  for (var i=0;i<nb;i++){
    let elem=gArbre.contentView.getItemAtIndex(i);
    let fils=elem.getElementsByTagName("treechildren");
    if ((fils!=null)&&(fils.length!=0)){
      elem.setAttribute("open",true);
      nb=gArbre.view.rowCount;
    }
  }

  return true;
}


/**
*	reponse lors du clic gauche sur un element d'arborescence
*
*	@param event
*
*	@return true si succes, false si erreur (erreur positionnee avec anaisSetLastError)
*
*	implementation : le clic sur un conteneur provoque le chargement des conteneurs fils si
* l'operation n'a pas dejà ete realisee. Si l'operation a dejà ete realisee, le <treeitem> contient un <treechildren>
*
*/
function anaisArbreClic(event){
  
  gCodeErreur=0;
  gMsgErreur="";

  if (gArbre && event.button == 0) {

    let row = { };
    let col = { };
    let elt = { };
    gArbre.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
    if (row.value >= 0 && col.value && elt.value=="twisty"){
      let elem=gArbre.contentView.getItemAtIndex(row.value);
      if (elem==null){
        return true;
      }
      //15-02-2005 - cas elements de recherche
      if (0==elem.id.indexOf("rech")){
        return true;
      }
      AnaisTrace("anaisArbreClic elem.id="+elem.id);

      //verifier si les conteneurs fils de l'element doivent être charges
      let fils=elem.getElementsByTagName("treechildren");
      if ((fils!=null)&&(fils.length==0)){
        let res=anaisArbrePopulCont(elem);
        if (false==res){
          AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
          return false;
        }
      }
    }
  }

  return true;
}



/**
*	reponse lors de la selection d'un element d'arborescence
*					actions: mise à jour du bandeau et liste des boites
*	@param	event
*
*	@return true si succes, false si erreur (erreur positionnee avec anaisSetLastError)
*
*/
function anaisArbreSelect(event){

  gCodeErreur=0;
  gMsgErreur="";

  let elem=anaisArbreItemSel();
  if (null==elem){
    anaisBandeauSetLib("");
    return true;
  }
  let index=anaisArbreIndexItemSel()
  let lib=anaisGetLibArbreIndex(index);
  if (lib!=false) 
    anaisBandeauSetLib(lib);

  //liste des boites
  let bRes=false;
  bRes=anaisBoitesSetContainer(elem.id);

  if (!bRes){
    //echec restaurer la selection precedente
    elem=document.getElementById(gCheminCourant);
    index=gArbre.contentView.getIndexOfItem(elem);
    gArbre.contentView.selection.select(index);
    return true;
  }

  //17-08-2004 sauvegarde uniquement si succès
  //15-02-2005 pas de memo pour les chemins de recherche
  if ((bRes)&&(0==elem.id.indexOf("ldap"))) gCheminCourant=elem.id;

  return true;
}




/**
*	calcul le libelle d'un conteneur sous la forme Service/Unite/... à partir son index dans la liste
*
*	@param	dn distinguishedname du conteneur
*
*	@return si succes retourne la chaine du libelle
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation : on parcours la liste des conteneurs du contrôle
*	a partir de la position index en sens inverse jusqu'a la racine
*	on retient les libelles dont les dn sont parents de celui identifie par index
*/
function anaisGetLibArbreIndex(index){

  //element 'selectionne'
  let elem=gArbre.contentView.getItemAtIndex(index);
  let dn=elem.id;
  let lib=anaisArbreDescItem(elem);
  if (index==0 || 0==dn.indexOf("rech"))return lib;
  //parcours
  while(--index>=0){
    let e=gArbre.contentView.getItemAtIndex(index);
    let d=e.id;
    if (anaisIsCheminParent(elem.id,e.id)){
      let txt=anaisArbreDescItem(e);
      lib=txt+"/"+lib;
    }
  }
  return lib;
}




/**
*	determine la description d'un element treeitem
*
*	@return si succes retourne la chaine de description
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*/
function anaisArbreDescItem(treeitem){

  let treecells=treeitem.getElementsByTagName("treecell");
  let lib=treecells[0].getAttribute("label");
  return lib;
}


/**
*	reduit l'affichage de l'arborescence des services
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*	V0.11 08/09/2004
*	reduit toutes les branches sauf les racines
*
*/
function anaisArbreReduire(){

  let nb=gArbre.view.rowCount;
  while (--nb){
    let elem=gArbre.contentView.getItemAtIndex(nb);
    let fils=elem.getElementsByTagName("treechildren");
    if (fils!=null && fils.length!=0){
      elem.setAttribute("open",false);
    }
  }
  //pas de conteneur courant -> notifier liste des boites
  gCheminCourant="";
  anaisBoitesSetContainer("");
  anaisBandeauSetLib("");

  return true;
}


/**
*	insère les conteneurs fils d'un conteneur, effectue une requête serveur
*
*	@param	elem element conteneur de l'arborescence
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*	v 0.4 utilise anaisReqSrvDoc au lieu de anaisReqSrv
*/
function anaisArbrePopulCont(elem){

  let dn=elem.getAttribute("id");

  AnaisTrace("anaisArbrePopulCont dn="+dn);

  //effectuer la requête asynchrone
  anaisSetWaitCursor();
  let res=anaisReqSrvFnc(LISTE_ARBRE,dn,null,anaisArbrePopulContRap, elem);
  return res;
}

/**
*	fonction de rappel pour la fonction anaisArbrePopulCont
*
*	@param	doc document xml de reponse du serveur (null si erreur)
* v2.7 elem : element interface pour ajout fils
*
*/
function anaisArbrePopulContRap(doc, elem){

  //traiter la reponse du serveur
  if (null==doc){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return;
  }

  //code de resultat
  //attributs 'errcode' et 'errmsg' dans element "anaismoz"
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return;
  }

  //retrouver element conteneur
  let resultat=doc.getElementsByTagNameNS(ANAIS_NS, "anaismoz");
  resultat=resultat[0];
  let idelem=resultat.getAttribute("chemin");
  if (null==idelem || ""==idelem){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return;
  }

  //inserer le contenu
  //v0.11-02-06-2004 l'arborescence est une liste d'eleements <branche conteneur="dn parent">
  //si dn parent vide, c'est une racine
  //ici c'est forcement les fils de l'element clique
  anaisArbreInsereContenu(elem,doc);

  anaisRestoreCursor();
}




/**
*	reponse lors du double-clic gauche sur un element d'arborescence
*
*	@param event
*
*	@return true si succes, false si erreur (erreur positionnee avec anaisSetLastError)
*
*	implementation : le clic sur un conteneur provoque le chargement des conteneurs fils si
* l'operation n'a pas dejà ete realisee. Si l'operation a dejà ete realisee, le <treeitem> contient un <treechildren>
*
*/
function anaisArbreDblClic(event){

  gCodeErreur=0;
  gMsgErreur="";

  if (gArbre && event.button == 0) {

    let row = { };
    let col = { };
    let elt = { };
    gArbre.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
    if (row.value >= 0 && col.value && elt.value!="twisty"){
      let elem=gArbre.contentView.getItemAtIndex(row.value);
      if (elem==null){
        return true;
      }

      //15-02-2005 - cas elements de recherche
      if (0==elem.id.indexOf("rech")){
        return true;
      }

      //verifier si les conteneurs fils de l'element doivent être charges
      let fils=elem.getElementsByTagName("treechildren");
      if (fils!=null && fils.length==0){
        let res=anaisArbrePopulCont(elem);
        if (false==res){
          AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
          return false;
        }
      }
    }
  }

  return true;
}


/**
*	selectionne le conteneur dans l'arborescence
*
*	@param chemin chemin du conteneur -> id de l'element
*
*/
function anaisArbreSelChemin(chemin){

  AnaisTrace("anaisArbreSelChemin:"+chemin);
  let elem=document.getElementById(chemin);
  if (null==elem)
    return;
  let index=gArbre.contentView.getIndexOfItem(elem);
  if (-1==index)
    return;

  gArbre.view.selection.select(index);
  gArbre.treeBoxObject.ensureRowIsVisible(index);

  let lib=anaisGetLibArbreIndex(index);
  if (lib!=false)	
    anaisBandeauSetLib(lib);
}

/**
*	efface la selection dans l'arborescence
*/
function anaisArbreEffSel(){

  if (-1==gArbre.view.selection.currentIndex)
    return;

  gArbre.view.selection.clearSelection();
  anaisBandeauSetLib("");
}


/**
*	insère le contenu de l'arborescence du document
*
*	@param	elem element xul ou inserer les elements
*	@param	doc document xml
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*	V 0.4 la fonction 'anaisSetRacineImages' n'est plus appelee
*/
function anaisArbreInsereContenu(elem,doc){

  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, 'arborescence');
  if (arbo==null || arbo[0]==null){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrArbreSrletbo");
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return false;
  }

  let data=arbo[0].getElementsByTagName("treechildren");
  if (data==null){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrArbreSrletbo");
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return false;
  }

  let arbredata=anaisCreeElements(data[0]);
  if (arbredata!=null){
    //si arbredata n'a pas de treeitem modifier attribut container de elem
    if (!arbredata.hasChildNodes()) elem.setAttribute("container","false");
    //modifier les url des images : ajouter prefixe gBoitesImages

    //ajoute les elements soit directement soit dans l'element treechildren
    let fils=elem.getElementsByTagName("treechildren");
    if (fils && fils.length){
      fils=fils[0];
      for (var i=0;i<arbredata.childNodes.length;i++){
        let c=arbredata.childNodes[i];
        fils.appendChild(c);
      }
    }
    else{
      elem.appendChild(arbredata);
    }
  }
  else{
    gCodeErreur=-1;
    gMsgErreur="";
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return false;
  }
  return true;
}


/**
*	contrôle des options du menu contextuel de l'arborescence
*
*	implementation :
*	activer 'anaismozdlg.arbrerechs' sur conteneurs d'annuaire et racine recherche
*	activer 'anaismozdlg.arbresuprech' sur conteneur resultat de recherche
*/
function Arbrepopupshowing(event){

  if ((event.type=="popupshowing")&&
      gArbre){
    let row = { };
    let col = { };
    let elt = { };
    gArbre.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
    let optrech=document.getElementById("anaismozdlg.arbrerechs");
    let optsuprech=document.getElementById("anaismozdlg.arbresuprech");
    let optupdrech=document.getElementById("anaismozdlg.arbreupdrech");
    let optmodrech=document.getElementById("anaismozdlg.arbremodifrech");
    let optsuprechtout=document.getElementById("anaismozdlg.arbresuprechtout");
    let ajoutfav=document.getElementById("anaismozdlg.btajoutfavoris");
    ajoutfav.setAttribute("hidden",true);
    let supfav=document.getElementById("anaismozdlg.btsupfavoris");
    supfav.setAttribute("hidden",true);
    let seldem=document.getElementById("anaismozdlg-btdemar");
    seldem.setAttribute("disabled",true);
    let optpauline=document.getElementById("anaismozdlg.arbrepauline");
    optpauline.setAttribute("disabled",true);

    optrech.setAttribute("disabled",true);
    optsuprechtout.setAttribute("hidden",true);
    optsuprech.setAttribute("hidden",true);
    optupdrech.setAttribute("hidden",true);
    optmodrech.setAttribute("hidden",true);
    if ((row.value>=0) && col.value){
      let elem=gArbre.contentView.getItemAtIndex(row.value);
      if (elem){
        if (0==elem.id.indexOf("rechbs")){
          optsuprechtout.removeAttribute("hidden");
          optsuprech.removeAttribute("hidden");
          optupdrech.removeAttribute("hidden");
          optmodrech.removeAttribute("hidden");
        }
        else if (0==elem.id.indexOf("rech")){
          optsuprechtout.removeAttribute("hidden");
          optrech.removeAttribute("disabled");
        }
        else{
          optrech.removeAttribute("disabled");
        }
        //option selectionner au demarrage
        if (0!=elem.id.indexOf("rech")) seldem.removeAttribute("disabled");
        if (elem.id==g_SelectionDem){
          seldem.setAttribute("checked",true);
        }
        else{
          seldem.setAttribute("checked",false);
        }
        //favoris
        //pauline
        if (0==elem.id.indexOf("ldap://")){
          ajoutfav.removeAttribute("hidden");
          optpauline.removeAttribute("disabled");
        }
        return true;
      }
    }
  }

  return true;
}

/**
*	determine la racine de l'annuaire du conteneur specifie
*
*	@param	chemin chemin ldap du conteneur
*
*	@return si succes retourne chemin ldap de la racine
* si erreur retourne chaine vide
*
*	implementation :
*	parcours les racines et recherche un chemin parent
*
*/
function anaisArbreRacineConteneur(chemin){

  if (!gRacineArbre.hasChildNodes())
    return "";
  let nb=gRacineArbre.childNodes.length;
  for (var i=0;i<nb;i++){
    let fils=gRacineArbre.childNodes[i];
    if (anaisIsCheminParent(chemin,fils.id)){
      return fils.id;
    }
  }

  return "";
}



/**
*	construit l'arborescence des recherches dans l'interface
*
*	@return true si succès sinon false
*/
function anaisArbreInitRechs(){

  let cache=anaisCacheGetCache();
  if (null==cache)return true;
  if (!cache.documentElement.hasChildNodes()){
    return true;
  }
  //recherche racine des recherches
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
    AnaisAfficheMsgId("anais_RechErrRacine");
    return false;
  }

  for (i=0;i<cache.documentElement.childNodes.length;i++){
    let elem=cache.documentElement.childNodes[i];
    let opc=elem.getAttribute("op");
    let dnc=elem.getAttribute("dn");
    let paramc=elem.getAttribute("param");
    let chemin="";
    chemin=dnc.replace("ldap:",opc+":");
    chemin+="?"+paramc;
    let rech=document.getElementById(chemin);
    if (null==rech){
      let doc=elem.childNodes[0];
      anaisArbreInsereContenu(racine_rech,doc);
    }
  }
  if (i){
    //deplier racine de recherche si necessaire
    racine_rech.setAttribute("open",true);
  }

  return true;
}

/**
*	memorise le conteneur comme selection au lancement d'anais
*
*/
function anaisArbreChoixDem(event){

  //conteneur selectionne
  let elem=anaisArbreItemSel();
  if (null==elem){
    return;
  }

  //cas elements de recherche
  if (0==elem.id.indexOf("rech")){
    return;
  }
  if (g_SelectionDem!=elem.id) 
    g_SelectionDem=elem.id;
  else g_SelectionDem="";
}

/**
*	Menu contextuel 'ajouter aux favoris' de l'arborescence
*	ajoute le conteneur dans la liste des favoris
*
*	19/12/2005 : sequence : verifier si existe -> edition libelle -> ajout
*/
function anaisArbreAjoutFavoris(event){

  //conteneur selectionne
  let elem=anaisArbreItemSel();
  if (null==elem){
    return true;
  }
  //cas elements de recherche
  if (0==elem.id.indexOf("rech")){
    return true;
  }
  let index=anaisArbreIndexItemSel();
  let lib=anaisGetLibArbreIndex(index);
  //tester si existe dejà
  var exist=FavoriExiste(elem.id);
  if (exist){
    AnaisAfficheMsgId("anaisdlg_ErrFavExist");
    return true;
  }
  //edition du libelle
  let args=new Array();
  args.lib=lib;
  args.uri=elem.id;

  window.openDialog("chrome://anais/content/editlibfavori.xul","","dialog,centerscreen,titlebar,modal,resizable",args);

  //ajouter le favori
  if (args.res){
    AjouteFavori(elem.id,args.lib);
  }

  return true;
}

/**
*	Menu contextuel 'retirer des favoris' de l'arborescence
*	retire le conteneur dans la liste des favoris
*
*/
function anaisArbreSupFavoris(event){

  //conteneur selectionne
  let elem=anaisArbreItemSel();
  if (null==elem){
    return true;
  }

  //cas elements de recherche
  if (0==elem.id.indexOf("rech")){
    return true;
  }

  SupprimeFavori(elem.id);

  return true;
}

/**
*	Positionne l'arborescence sur un conteneur specifique
*
*	@param chemin chemin du conteneur
*
*/
function ArbrePositionneConteneur(chemin){

  //rechercher si conteneur present
  let cont=document.getElementById(chemin);
  if (null!=cont){
    let parent=cont.parentNode;
    while (parent && parent.nodeName=="treechildren" && parent.id!="anaismoz-arbre-racine"){
      let elem=parent.parentNode;
      elem.setAttribute("open",true);
      parent=elem.parentNode;
    }
    //selection
    anaisArbreSelChemin(chemin);
    return;
  }

  //requête serveur asynchrone
  //operation vide -> retourne arborescence complete jusqu'au chemin demande
  anaisSetWaitCursor();
  let res=anaisReqSrvFnc("",chemin,null,ArbrePositionneConteneurRap,chemin);
  if (false==res){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrArbre");
    return;
  }
}

/**
*	fonction de rappel de ArbrePositionneConteneur
*
*	@param doc document xml de reponse
*/
function ArbrePositionneConteneurRap(doc, chemin){

  anaisRestoreCursor();

  AnaisTrace("ArbrePositionneConteneurRap");

  if (null==doc){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrSrvArbreSel");
    return;
  }

  //code de resultat
  //V0.11 attributs 'errcode' et 'errmsg' dans element 'anaismoz'
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrSrvArbreSel");
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
  let res=anaisBoitesInsereContenu(doc);
  if (!res){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return;
  }
  //V0.11 tri des boites
  anaisBoitesInitTri();
  //V0.11 affichage du nombre de boites
  anaisMajNbBoites();

  //evite double construction liste des boîtes
  gCheminBoites=chemin;
  //conteneur courant
  anaisArbreSelChemin(gCheminBoites);
}

/**
*	Retourne l'element selectionne dans l'arborescence
*
*	@return element treeitem ou null si pas de selection
*/
function anaisArbreItemSel(){

  if (0==gArbre.view.selection.count){
    return null;
  }
  let index=gArbre.view.selection.currentIndex;
  if (!gArbre.view.selection.isSelected(index)){
    return null;
  }
  let elem=gArbre.contentView.getItemAtIndex(index);
  return elem;
}

/**
*	Retourne l'index l'element selectionne dans l'arborescence
*
*	@return entier ou -1 si pas de selection
*/
function anaisArbreIndexItemSel(){
  if (0==gArbre.view.selection.count){
    return -1;
  }
  let index=gArbre.view.selection.currentIndex;
  if (!gArbre.view.selection.isSelected(index)){
    return -1;
  }
  return index;
}


/**
* fonction générique d'insertion des éléments d'arborescence des services
*
* construit les elements treeitem des branches du document
* <anais:branche conteneur
*   <treechildren>
*    <treeitem container=
*
* @param doc document xml de reponse
* retour true si ok, false si erreur
*/
function anaisUpdateArbo(doc){

  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, 'arborescence');
  if (null==arbo || null==arbo[0]){
    return false;
  }
  
  let branches=arbo[0].getElementsByTagNameNS(ANAIS_NS, "branche");
  let nb=branches.length;
  
  for (var b=0;b<nb;b++){
    
    let branche=branches[b];
    
    let dnconteneur=branche.getAttribute("conteneur");
    if (null==dnconteneur || ""==dnconteneur){
      continue;
    }

    let conteneur=document.getElementById(dnconteneur);
    if (null==conteneur){
      // ne devrait pas etre null (deja construit)
      AnaisTrace("anaisUpdateArbo null==conteneur");
      continue;
    }
    if (conteneur.hasChildNodes() &&
        conteneur.getAttribute("container") &&
        conteneur.getAttribute("open")) {
      // deja peuple
      AnaisTrace("anaisUpdateArbo conteneur deja peuple");
      continue;
    }
    
    let conteneur_childs=document.createElement("treechildren");
    conteneur.appendChild(conteneur_childs);
    
    if (branche.hasChildNodes()){
      
      let treechildren=branche.firstChild;
      if ("treechildren"!=treechildren.nodeName){
        // !
        AnaisTrace("anaisUpdateArbo treechildren!=treechildren.nodeName");
        continue;
      }
      
      let nbchild=treechildren.childNodes.length;
      for (var c=0;c<nbchild;c++){
        let child=treechildren.childNodes[c];
        // creer element treeitem et inserer
        let item=anaisCreeElements(child);
        conteneur_childs.appendChild(item);
      }
      
      conteneur.setAttribute("open",true);
      
    }else{
      AnaisTrace("anaisUpdateArbo !branche.hasChildNodes");
    }
  }
}
