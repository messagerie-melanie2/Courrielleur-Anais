
/**
*	rôle : effectue ou affiche une recherche simple
*
*	@param critere le critère de recherche (saisie utilisateur)
*	@param base si non null chemin ldap de la base de recherche
*
*	implementation : si la recherche existe, affiche la recherche+ selection du conteneur
*	sinon nouvelle recherche, et ajoute le conteneur
*
*
*/
function RechercheSimple(critere,base){

  //recherche racine des recherches
  let racine_rech=anaisRacineRech();
  if (null==racine_rech){
    AnaisAfficheMsgId("anaisdlg_ErrRechBase");
    return;
  }
  let racine=racine_rech.id;

  //chemin de l'element de recherche
  let chemin="";
  if ((null!=base)&&(base!="")) 
    chemin=base.replace("ldap:","rechbs:");
  else 
    chemin=racine.replace("rech:","rechbs:");
  chemin+="?"+critere;

  //Verifier que la recherche n'existe pas dejà
  let elem=document.getElementById(chemin);
  if (elem){
    //selection existante
    anaisArbreSelChemin(chemin);
    anaisArbreUpdRech();
    return;
  }

  //limite du nombre de recherches
  let limite=racine_rech.getAttribute("limite");
  let items=racine_rech.getElementsByTagName("treeitem");
  if (items.length>=limite){
    let msg=AnaisMessageFromId("anaisdlg_ErrRechLimite");
    msg=msg.replace("%limite",limite);
    anaisArbreSupRechDer();
  }

  //requête serveur
  let chreq="";
  if ((null!=base)&&(base!="")) 
    chreq=base;
  else 
    chreq=racine.replace("rech:","ldap:");

  let args=Array();
  args["op"]="rechbs";
  args["chemin"]=chreq;
  args["param"]=critere;

  window.openDialog("chrome://anais/content/anaisrechsdlg.xul","",
                    "chrome,modal,centerscreen,resizable=no",args);

  //AnaisTrace("RechercheSimple recherche terminee");
  if (false==args["res"]){
    //la recherche a ete annulee
    return;
  }
  let doc=args["doc"];
  if (null==doc){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrRech");
    return;
  }

  //code de resultat
  //V0.11 attributs 'errcode' et 'errmsg' dans element 'anaismoz'
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrRech");
    return;
  }

  //examiner le nombre de boîtes retournees
  //si aucune pas de memorisation ni affichage
  let btes=doc.getElementsByTagNameNS(ANAIS_NS, "boites");
  if (0==btes.length){
    AnaisAfficheMsgId("anaisdlg_ErrRechRes0");
    return;
  }
  items=btes[0].getElementsByTagName("treeitem");
  if (0==items.length){
    AnaisAfficheMsgId("anaisdlg_ErrRechRes0");
    return;
  }

  anaisSetWaitCursor();
  anaisArbreEffSel();

  //arborescence
  //ajouter chemin dans l'arborescence
  elem=document.getElementById(chemin);
  if (null==elem){
    anaisArbreInsereContenu(racine_rech,doc);
    //deplier racine de recherche si necessaire
    racine_rech.setAttribute("open",true);
  }

  //contenu des boîtes
  //remise à zero de la selection
  anaisBoitesEffSel();

  //vider le contenu de la liste
  anaisBoitesVideContenu();
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
  //evite double construction liste des boîtes
  gCheminBoites=chemin;

  //selectionner conteneur existant
  anaisArbreSelChemin(chemin);

  //sauvegarde dans le cache
  anaisCacheEcrit("rechbs",chreq,critere,doc);

  //notifier les fenêtres
  anaisCacheNotification(doc);

  anaisRestoreCursor();
}


/**
*	rôle : effectue une recherche simple à partir de l'arborescence (menu contextuel)
*
*
*	implementation :
*
*/
function anaisArbreRechercheS(event){

  //conteneur selectionne
  let index=anaisArbreIndexItemSel();
  let elemsel=anaisArbreItemSel();
  if (0==elemsel.id.indexOf("rech:")){
    //si racine de recherche selectionnee prendre racine annuaire
    index=0;
    elemsel=gArbre.contentView.getItemAtIndex(index);
  }
  let descelem=anaisArbreDescItem(elemsel);

  //racine du conteneur selectionne (sauf si racine)
  let elemracine=null;
  let descracine="";
  if (index){
    elemracine=gArbre.contentView.getItemAtIndex(0);
    descracine=anaisArbreDescItem(elemracine);
  }

  //tableau des arguments
  let args=Array();
  //liste des bases
  args[0]=Array();
  let i=0;
  if (descracine!=""){
    args[0][i++]=descracine;
  }
  args[0][i]=descelem;
  //base selectionnee
  if (index)args[1]=1;
  else args[1]=0;
  //filtrage de la saisie
  args["filtrage"]=g_FiltreSaisie;

  //saisie critères de recherche
  window.openDialog("chrome://anais/content/anaissaisierechs.xul","","modal,chrome,center,titlebar",args);

  if ((2>args.length)||(-1==args[1])){
    //action annulee
    return;
  }
  //lancer la recherche
  let chemin="";
  if (null!=elemracine && 1==args[1]){
    chemin=elemsel.id;
  }
  RechercheSimple(args[2],chemin);
}


/**
*	suppression d'un resultat de recherche dans l'arborescence
*
*
*	implementation :
*
*/
function anaisArbreSupRech(event){

  //conteneur selectionne
  let elemsel=anaisArbreItemSel();
  if (0!=elemsel.id.indexOf("rechbs:")){
    return;
  }
  let par=elemsel.parentNode;
  par.removeChild(elemsel);

  anaisBoitesSetContainer("");
  //supprimer du cache
  //extraire base et critère
  let chemin="";
  let param="";
  chemin=elemsel.id.replace("rechbs:","ldap:");
  let p=chemin.indexOf("?");
  param=chemin.substring(p+1,chemin.length);
  chemin=chemin.substring(0,p);
  //effacement de la recherche dans le cache
  anaisCacheEfface("rechbs",chemin,param);

  anaisCacheNotifSup(elemsel.id);
}


/**
*	suppression de tous les resultats de recherche dans l'arborescence
*
*
*	implementation :
*
*/
function anaisArbreSupRechTout(event){

  //recherche racine des recherches
  let racine_rech=anaisRacineRech();
  if (null==racine_rech){
    AnaisAfficheMsgId("anaisdlg_ErrRechBase");
    return;
  }
  let elems=racine_rech.getElementsByTagName("treeitem");

  if (0==elems.length){
    //effacement du cache (efface aussi les erreurs eventuelles)
    anaisCacheEffaceTout();
    return;
  }
  let msg=AnaisMessageFromId("anaisdlg_RechMsgSup");
  if (false==confirm(msg)){
    return;
  }
  while (elems.length){
    let elem=elems[0];
    let par=elem.parentNode;
    par.removeChild(elem);
  }

  //effacement du cache (efface aussi les erreurs eventuelles)
  anaisCacheEffaceTout();
  anaisBoitesSetContainer("");
  //notification
  anaisCacheNotifSupTout();
}



/**
*	mise à jour d'un resultat de recherche dans l'arborescence
*
*
*	implementation :
*
*/
function anaisArbreUpdRech(){
  
  let elemRech=anaisArbreItemSel();
  if (null==elemRech){
    AnaisAfficheMsgId("anaisdlg_ErrRechTypeElem");
    return;
  }
  //element selectionne pour modification
  if (0!=elemRech.id.indexOf("rechbs:")){
    AnaisAfficheMsgId("anaisdlg_ErrRechMajElem");
    return;
  }
  //paramètres de recherche
  let paramsRech=ExtraitParamsRech(elemRech.id);
  //lancer la recherche
  let argsRech=Array();
  argsRech["op"]="rechbs";
  argsRech["chemin"]=paramsRech.base;
  argsRech["param"]=paramsRech.critere;
  window.openDialog("chrome://anais/content/anaisrechsdlg.xul","",
                    "chrome,modal,centerscreen,resizable=no",argsRech);

  if (false==argsRech["res"]){
    //la recherche a ete annulee
    return;
  }
  let doc=argsRech["doc"];
  if (null==doc){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrMajRech");
    return;
  }
  //code de resultat
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrMajRech");
    return;
  }

  //supprimer ancienne recherche du cache
  anaisCacheEfface("rechbs",paramsRech.base,paramsRech.critere);
  //sauvegarder la recherche dans le cache
  anaisCacheEcrit("rechbs",paramsRech.base,paramsRech.critere,doc);
  //forcer la mise à jour dans la liste des boîtes
  let chemin=gCheminBoites;
  gCheminBoites="";
  anaisBoitesSetContainer(elemRech.id);
  //libelle du conteneur dans document de reponse
  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, "arborescence");
  let cell=arbo[0].getElementsByTagName("treecell");
  let lib=cell[0].getAttribute("label");
  //AnaisTrace("anaisArbreUpdRech lib dans doc="+lib);
  let treecells=elemRech.getElementsByTagName("treecell");
  treecells[0].setAttribute("label",lib);
}


/**
*	modification d'une recherche dans l'arborescence
*
*
*	implementation :
*	cas particulier : la modification d'une recherche peut permettre à l'utilisateur de specifier une recherche existante
*/
function anaisArbreModifRech(){

  let elemRech=anaisArbreItemSel();
  if (null==elemRech){
    AnaisAfficheMsgId("anaisdlg_ErrRechTypeElem");
    return;
  }
  //element selectionne pour modification
  if (0!=elemRech.id.indexOf("rechbs:")){
    AnaisAfficheMsgId("anaisdlg_ErrRechMajElem");
    return;
  }
  //paramètres de recherche
  let paramsRech=ExtraitParamsRech(elemRech.id);

  //racine d'annuaire correspondante (usage si base!=racine)
  let racine=anaisArbreRacineConteneur(paramsRech.base);
  let elemracine=document.getElementById(racine);
  let descracine=anaisArbreDescItem(elemracine);

  //tableau des arguments
  //0:liste des libelles
  //1:base selectionnee
  //2:critere
  let args=Array();
  //liste des bases
  args[0]=Array();
  args[0][0]=paramsRech.libelle;
  args[1]=0;
  if (!paramsRech.bracine){
    args[0][1]=descracine
  }
  args[2]=paramsRech.critere;

  //filtrage de la saisie
  args["filtrage"]=g_FiltreSaisie;
  //saisie critères de recherche
  window.openDialog("chrome://anais/content/anaissaisierechs.xul","","modal,chrome,center,titlebar",args);

  if ((2>args.length)||(-1==args[1])){
    //action annulee
    return;
  }
  if ((args[2]==paramsRech.critere)&&(args[1]==0)){
    //pas de changement
    return;
  }

  //mettre à jour conteneur de recherche avant la recherche
  //et verifier si la nouvelle recherche n'existe pas dejà
  //dans ce cas on supprime la recherche modifiee et on selectionne l'autre
  let newid="";
  if (0==args[1]){
    newid=paramsRech.base;
  }
  else{
    newid=racine;
  }
  newid=newid.replace("ldap:","rechbs:");
  newid+="?"+args[2];

  //verifier si nouvelle recherche existe dejà
  let elem=document.getElementById(newid);
  if (elem){
    //selection autre
    anaisArbreSelChemin(newid);
    AnaisAfficheMsgId("anaisdlg_ErrRechExist");
    return;
  }

  //lancer la recherche
  let argsRech=Array();
  argsRech["op"]="rechbs";
  if (0==args[1]){
    argsRech["chemin"]=paramsRech.base;
  }
  else{
    argsRech["chemin"]=racine;
  }
  argsRech["param"]=args[2];

  window.openDialog("chrome://anais/content/anaisrechsdlg.xul","",
                    "chrome,modal,centerscreen,resizable=no",argsRech);

  if (false==argsRech["res"]){
    //la recherche a ete annulee
    return;
  }
  let doc=argsRech["doc"];
  if (null==doc){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrRech");
    return;
  }
  //code de resultat
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrRech");
    return;
  }

  //mise à jour id et libelle
  let ancienId=elemRech.id;
  elemRech.id=newid;
  //libelle dans document de reponse
  let arbo=doc.getElementsByTagNameNS(ANAIS_NS, "arborescence");
  let cell=arbo[0].getElementsByTagName("treecell");
  let lib=cell[0].getAttribute("label");
  //AnaisTrace("anaisArbreModifRech lib dans doc="+lib);
  let treecells=elemRech.getElementsByTagName("treecell");
  treecells[0].setAttribute("label",lib);
  //supprimer ancienne recherche du cache
  anaisCacheEfface("rechbs",paramsRech.base,paramsRech.critere);
  //sauvegarder la recherche dans le cache
  anaisCacheEcrit("rechbs",argsRech["chemin"],argsRech["param"],doc);
  //affichage des boîtes (le conteneur est forcement selectionne)
  anaisBoitesSetContainer(newid);
  //selectionConteneurCourant(newid);
  anaisArbreSelChemin(newid);
  //notification des autres fenêtres anais
  anaisCacheNotifModif(ancienId,newid,lib);
}


/**
*	retourne la racine des recherches
*
*	@return element treeitem si trouvee sinon null
*
*	implementation : basee sur une seule racine
*	à modifier si plusieurs racine sont implementees
*/
function anaisRacineRech(){

  let racine_rech=null;
  for (var i=0;i<gRacineArbre.childNodes.length;i++){
    let fils=gRacineArbre.childNodes[i];
    if (0==fils.id.indexOf("rech://")){
      return fils;
    }
  }
  return null;
}


/**
*	construit le libelle du conteneur d'une recherche
*
*	@param base chemin ldap de la base de recherche (null si pas de base)
*	@param critere critère de recherche
*
*	@return chaine du libelle
*/
function anaisRechLibRech(base,critere){

  try{
    let lib="Resultats de la recherche sur \""+critere+"\"";
    //si base non null et != racine annuaire
    //ajouter : dans 'libelle conteneur'
    if (base&&""!=base){
      let racine=anaisArbreRacineConteneur(base);
      if (racine!=base){
        let elem=document.getElementById(base);
        let desc=anaisArbreDescItem(elem);
        lib+=" dans "+desc;
      }
    }

    return lib;
  }
  catch(ex){
    return "Resultat de la recherche";
  }
}

/**
*	extrait les paramètres d'une recherche à partir du chemin de recherche
*
*	@param chemin chemin ldap de la recherche
*
*	@return si succès retourne un tableau des paramètres de recherche, null si erreur
*	paramètres:
*	base : chemin ldap de la base de recherche
*	critere : critere de recherche
*	libelle : libelle du conteneur ldap de la base de recherche
*	bracine : true si la base de recherche est une racine d'annuaire
*
*/
function ExtraitParamsRech(chemin){

  let params=new Array();
  let base=chemin.replace("rechbs:","ldap:");
  let p=base.indexOf("?");
  if (-1==p){
    return null;
  }
  let critere=base.substring(p+1,base.length);
  base=base.substring(0,p);

  let racine=anaisArbreRacineConteneur(base);
  let elem=null;
  let libelle="";

  if (racine==base){

    elem=document.getElementById(racine);
    libelle=anaisArbreDescItem(elem);
    params["bracine"]=true;
  }
  else{

    //le conteneur n'est pas forcement charge!!!
    elem=document.getElementById(chemin);
    libelle=anaisArbreDescItem(elem);

    p=libelle.lastIndexOf('" dans ');
    if (-1!=p){
      libelle=libelle.substring(p+7,libelle.length);
    }
    else{
      //cas version <0.5 prendre premier ou=
      let tab=base.split("/");
      let ou=tab[3];
      p=ou.indexOf(",");
      ou=ou.substring(3,p);
      libelle=ou;
    }
    params["bracine"]=false;
  }

  params["base"]=base;
  params["critere"]=critere;
  params["libelle"]=libelle;
  return params;
}

/**
*	Suppression dernier element de recherche
*/
function anaisArbreSupRechDer(){

  let racine_rech=anaisRacineRech();
  if (null==racine_rech){
    AnaisAfficheMsgId("anaisdlg_ErrRechBase");
    return;
  }
  let elems=racine_rech.getElementsByTagName("treeitem");

  let der=elems[elems.length-1];

  let par=der.parentNode;
  par.removeChild(der);

  anaisBoitesSetContainer("");
  //supprimer du cache
  //extraire base et critère
  let chemin="";
  let param="";
  chemin=der.id.replace("rechbs:","ldap:");
  let p=chemin.indexOf("?");
  param=chemin.substring(p+1,chemin.length);
  chemin=chemin.substring(0,p);
  //effacement de la recherche dans le cache
  anaisCacheEfface("rechbs",chemin,param);

  anaisCacheNotifSup(der.id);
}
