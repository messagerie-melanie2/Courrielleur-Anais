ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/FileUtils.jsm");


//nom du fichier cache des recherches
const FICHIERRECH="anaisrech.xml";

//instance globale document xml du cache
var gAnaisCache=null;

//limite par defaut du nombre d'entree dans le cache
//mise a jour par initAnaisDlgRap a l'ouverture de le fenetre
var gMaxElemCache=20;


/**
*	Lit un element de requête dans le cache
*
*	@param	op operation demandee
*	@param  dn	distinguishedname
*	@param  param paramètre optionel (selon valeur de op)
*
*	@return si succes retourne le document xml
* si element inexistant ou erreur retourne null
*/
function anaisCacheLit(op,dn,param){

  let cache=anaisCacheGetCache();
 
  if (null==cache) 
    return null;

  if (!cache.documentElement.hasChildNodes()){
    return null;
  }
  for (var i=0;i<cache.documentElement.childNodes.length;i++){
    let elem=cache.documentElement.childNodes[i];
    let opc=elem.getAttribute("op");
    let dnc=elem.getAttribute("dn");
    let paramc=elem.getAttribute("param");
    if ((op==opc)&&(dn==dnc)&&(param==paramc)){
      return elem;
    }
  }

  return null;
}


/**
*	Ecrit un element de requête dans le cache
*
*	@param	op operation demandee
*	@param  dn	distinguishedname
*	@param  param paramètre optionel (selon valeur de op)
*	@param	doc instance du document xml de la requête
*/
function anaisCacheEcrit(op, dn, param, doc){
  
  let cache=anaisCacheGetCache();
  
  if (null==cache) 
    return;

  let elem=cache.createElement("cachereq");
  elem.setAttribute("op",op);
  elem.setAttribute("dn",dn);
  elem.setAttribute("param",param);
  let imp=cache.importNode(doc.documentElement, true);
  elem.appendChild(imp);
  cache.documentElement.appendChild(elem);

  //indicateur cache des recherches modifie (pour sauvegarde)
  cache.documentElement.setAttribute("modif", true);
}


/**
*	Sauve le cache dans le fichier disque
*/
function anaisCacheSauve(){

  let cache=gAnaisCache;//cas appel depuis messenger-overlay.js
  if (null==cache){
    cache=anaisCacheGetCache();
  }
  
  if (null==cache)
    return false;
  let modif=cache.documentElement.getAttribute("modif");
  
  if (null==modif || false==modif){
    return true;
  }

  cache.documentElement.removeAttribute("modif");

  let fichier=anaisFichierCache();
  if (false==fichier.exists()){
    fichier.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
  }
  
  let flux=Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
  flux.init(fichier, FileUtils.MODE_WRONLY|FileUtils.MODE_CREATE|FileUtils.MODE_TRUNCATE,
            FileUtils.PERMS_FILE, 0);

  try {
  
    let serializer=new XMLSerializer();
    serializer.serializeToStream(cache,flux,"UTF-8");

    flux.flush();
    flux.close();
    
  } catch(ex){
    AnaisTrace("Erreur lors de la sauvegarde du cache des recherches:"+ex);
  }

  return true;
}


/**
*	charge le cache depuis le fichier de cache
*
*	@return true si le fichier a ete charge (non vide) sinon false
*/
function anaisCacheCharge(){

  let fichier=anaisFichierCache();
  if (false==fichier.exists()){
    //pas une erreur (cas premiere utilisation)
    return true;
  }
  let taille=fichier.fileSize;
  if (0==taille){
    //pas une erreur (cas premiere utilisation)
    return true;
  }
  
  let flux=Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
  flux.init(fichier, -1, 0, 0);
  let bufstream=Components.classes["@mozilla.org/network/buffered-input-stream;1"].createInstance(Components.interfaces.nsIBufferedInputStream);
  bufstream.init(flux,8000);
  
  let parseCache;
  
  try {
  
    let parser=new DOMParser();
    parseCache=parser.parseFromStream(bufstream,"UTF-8",taille,"text/xml");
    
    bufstream.close();
    flux.close();
    
  } catch(ex){
    AnaisTrace("Erreur lors du chargement du cache des recherches:"+ex);
    return false;
  }
  if (null==parseCache){
    AnaisTrace("Erreur lors du chargement du cache des recherches");
    return false;
  }
  if (""==parseCache){
    return true;
  }
  
  //verifier le contenu de parseCache
  //racine <anaismozcache>
  if ("anaismozcache"!=parseCache.documentElement.nodeName){
    //fichier cache defectueux
    AnaisTrace("Fichier de cache defectueux");
    fichier.renameTo(null, FICHIERRECH+".erreur");
    return false;
  }
  
  //parcours des recherches et insertion dans gAnaisCache
  let nb=parseCache.documentElement.childNodes.length;
  let total=0;
  for (var i=0;i<nb;i++){
    
    let elem=parseCache.documentElement.childNodes[i];
    if (null==elem) 
      continue;
    if ("cachereq" != elem.nodeName){
      //erreur d'element
      continue;
    }
    
    //ajouter l'element
    let rech=gAnaisCache.importNode(elem, true);
    gAnaisCache.documentElement.appendChild(rech);
    total++;
    if (total>gMaxElemCache){
      //limite du nombre de recherches
      AnaisTrace("Chargement du cache - limite du nombre de recherches atteinte");
      break;
    }
  }
  
  return true;
}

/**
*	initialisation et chargement du cache
*
*	@return true si succès, false si erreur (erreur globale dans gCodeErreur et gMsgErreur)
*/
function anaisCacheInit(){

  if (gAnaisCache){
    //cache deja initialise
    return true;
  }
  
  //initialisation du cache
  gAnaisCache=document.implementation.createDocument("","anaismozcache",null);

  //charger le cache
  let res=anaisCacheCharge();
  if (!res){
    return false;
  }

  return true;
}

/**
*	retourne l'obet du cache
*
*	@return instance document xml du cache
*/
function anaisCacheGetCache(){

  //recherche fenêtre messenger
  //windowtype="mail:3pane"
  //id="messengerWindow"
  let windowManager=Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);

  let fenmessenger=null;
  let liste=windowManager.getEnumerator("mail:3pane");

  while (liste.hasMoreElements()){
    let fen=liste.getNext();
    if (null!=fen.gAnaisCache){
      fenmessenger=fen;
      break;
    }
  }

  if (null==fenmessenger){
    //v2.5 - l'erreur n'est plus affichee (bug mantis 915)
    //intialiser le cache dans ce cas
    if (null==gAnaisCache){
      anaisCacheInit();
    }
    return gAnaisCache;
  }

  return fenmessenger.gAnaisCache;
}

/**
*	retourne une instance nsIFile du fichier du cache
* le fichier n'existe pas forecement
*	@return chaine du chemin complet
*/
function anaisFichierCache(){
  
  let fichier=Services.dirsvc.get("ProfD", Components.interfaces.nsIFile);
  fichier.append(FICHIERRECH);
  return fichier;
}



/**
*	notifie toutes les fenêtres anais qu'une nouvelle requête de recherche a ete realisee
*
*	@param doc document xml resultat de la recherche
*
*	Implementation: parcours les fenêtre anais et appelle leur fonction anaisNotifieRech
*
*/
function anaisCacheNotification(doc){
  
  anaisNotifieDlg(function(fen){
    fen.anaisNotifieRech(doc);
  });
}

/**
*	notifie toutes les fenêtres anais qu'une recherche a ete modifiee
*
*	@param ancienId	ancien identifiant
*	@param nouveauId nouvel identifiant
*	@param lib nouveau libelle
*
*	Implementation: parcours les fenêtre anais et appelle leur fonction anaisNotifieRech
*
*/
function anaisCacheNotifModif(ancienId,nouveauId,lib){

  anaisNotifieDlg(function(fen){
    fen.anaisNotifieRechModif(ancienId,nouveauId,lib);
  });
}

/**
*	notifie toutes les fenêtres anais qu'une recherche a ete supprimee
*
*	@param rechid	identifiant
*
*	Implementation: parcours les fenêtre anais et appelle leur fonction anaisNotifieRechSup
*
*/
function anaisCacheNotifSup(rechid){

  anaisNotifieDlg(function(fen){
    fen.anaisNotifieRechSup(rechid);
  });
}

/**
*	notifie toutes les fenêtres anais que toutes les recherches ont ete supprimees
*
*
*	Implementation: parcours les fenêtre anais et appelle leur fonction anaisNotifieRechSupTout
*
*/
function anaisCacheNotifSupTout(){

  anaisNotifieDlg(function(fen){
    fen.anaisNotifieRechSupTout();
  });
}

// notif_fonction : fonction de rappel appelee avec boite anais en parametre
function anaisNotifieDlg(notif_fonction){

  let liste=Services.wm.getEnumerator("anaismoz-dlg");
  while (liste.hasMoreElements()){
    let fen=liste.getNext();
    notif_fonction(fen);
  }
}


/**
*	efface un resultat de recherche (utilise pour la mise à jour)
*
*	@param	op operation demandee
*	@param  dn	distinguishedname
*	@param  param paramètre optionel (selon valeur de op)
*
*/
function anaisCacheEfface(op,dn,param){

  let cache=anaisCacheGetCache();

  if (null==cache) return false;
  if (!cache.documentElement.hasChildNodes()){
    return false;
  }
  for (var i=0;i<cache.documentElement.childNodes.length;i++){
    let elem=cache.documentElement.childNodes[i];
    let opc=elem.getAttribute("op");
    let dnc=elem.getAttribute("dn");
    let paramc=elem.getAttribute("param");

    if ((op==opc)&&(dn==dnc)&&(param==paramc)){
      cache.documentElement.removeChild(elem);
      //indicateur cache des recherches modifie (pour sauvegarde)
      cache.documentElement.setAttribute("modif",true);
      return true;
    }
  }

  return false;
}

/**
*	efface tous les resultats de recherche
*
*/
function anaisCacheEffaceTout(){

  let cache=anaisCacheGetCache();

  if (null==cache) return false;

  while (cache.documentElement.childNodes.length){
    let elem=cache.documentElement.childNodes[0];
    cache.documentElement.removeChild(elem);
  }
  //indicateur cache des recherches modifie (pour sauvegarde)
  cache.documentElement.setAttribute("modif",true);

  return false;
}
