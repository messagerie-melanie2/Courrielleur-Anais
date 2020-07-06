
/**
*	Variables globales
*/
//element liste des boites (id anaismoz-boites)
var gBoites=null;
//element treechildren de l'arborescence des boites (id anaismoz-boites-racine)
var gBoitesRacine=null;



//chemin courant de la liste des boîtes
//peut pointer sur un chemin de recherche
var gCheminBoites="";


var gIndexcn=-1;		//index de la colonne nom complet
var gIndexmail=-1;	//index de la colonne mail

//V0.11 memorisation libelle colonne nom complet
var gLibColCn="";


//index de colonne pour la comparaison des boîtes
var gIndexColCompare=0;
//sens du tri pour la comparaison des boîtes
var gSensUpCompare=true;

//fonction de comparaison pour le tri des boîtes
function compareBoites(a,b){
  
  //tri sur l'ordre d'affichage
  let ordre1=a.getAttribute("ordre");
  let ordre2=b.getAttribute("ordre");

  if (ordre1!=ordre2){
    if (""==ordre1) 
      return 1;
    if (""==ordre2) 
      return -1;
    if (ordre1<ordre2){ 
      if (gSensUpCompare) 
        return -1; 
      else return 1;
    }
    if (ordre1>ordre2){ 
      if (gSensUpCompare) 
        return 1; 
      else return -1;
    }
  }
  
  //tri alphabetique
  let valA=a.firstChild.childNodes[gIndexColCompare].getAttribute("label");
  let valB=b.firstChild.childNodes[gIndexColCompare].getAttribute("label");
  if (valA<valB){ 
    if (gSensUpCompare) 
      return 1; 
    else return -1;
  }
  if (valA>valB){ 
    if (gSensUpCompare) 
      return -1; 
    else return 1;
  }
  
  return 0;
}


/*
*	gBoitesView : instance du type 'nsITreeView' pour l'affichage dynamique des boites
*
*/
var gBoitesView = {

    rowCount : 0,
    //element <treechildren> du document des boites
    boites:null,
    //tableau des d'elements treecol
    colonnes:null,

    NombreBoites:function(){
      return this.rowCount;
    },
    //doc : element <boites> du document pour les boites
    setDocumentBoites:function(doc){

      //colonnes : 1 seule fois par session
      if (null==this.colonnes){
        let cols=doc.getElementsByTagName("treecol");
        this.colonnes=cols;
      }
      //boites
      let bals=doc.getElementsByTagName('treechildren');
      if ((bals==null)||(bals[0]==null)){
        gCodeErreur=-1;
        gMsgErreur=AnaisMessageFromId("anaisdlg_ErrBoitesSrvBal");
        return false;
      }
      this.boites=bals[0].cloneNode(true);
      this.rowCount=this.boites.childNodes.length;

      return true;
    },

    //retourne l'index du nom de colonne
    getIndexCol:function(nomcol){

      if (nomcol instanceof Components.interfaces.nsITreeColumn)
        return nomcol.index;

      if (null==this.colonnes) 
        return -1;
      let nb=this.colonnes.length;
      for (var i=0;i<nb;i++){
        if (this.colonnes[i].id==nomcol){
          return i;
        }
      }

      return -1;
    },

    videContenu:function(){
      this.rowCount=0;
      this.boites=null;
    },

    //retourne l'element treeitem à l'index specifie
    getBoite:function(index){
      if (index>this.rowCount) 
        return null;
      return this.boites.childNodes[index];
    },

    //tri de la liste des boites
    //indexcol : index de colonne (0,1,2,...)
    //bUp : sens du trie
    TriBoites:function(indexcol,bUp){
      
      if (this.rowCount==0)
        return;

      gIndexColCompare=indexcol;
      gSensUpCompare=bUp;
      //liste des elements tries
      let newChilds=document.createElement("treechildren");
      //tableau temporaire des elements de même type
      let tmpChilds=Array();
      let nbtmpChilds=0;
      let courant=null;
      let img=null;
      while (this.boites.childNodes.length){
        courant=this.boites.removeChild(this.boites.childNodes[0]);
        let image=courant.firstChild.firstChild.getAttribute("src");
        if (image!=img){
          //traiter la serie precedente
          if (0==indexcol){
            //tri sur le type, la serie est insere au debut de newChilds -> inverse l'ordre des types
            while (nbtmpChilds){
              newChilds.insertBefore(tmpChilds[nbtmpChilds-1],newChilds.childNodes[0]);
              nbtmpChilds--;
            }
          }
          else{
            tmpChilds.sort(compareBoites);
            for (var i=0;i<nbtmpChilds;i++){
              newChilds.appendChild(tmpChilds[i]);
            }
          }
          tmpChilds=Array();
          nbtmpChilds=0;
          //ajouter element courant dans liste temporaire qui est vide
          tmpChilds[nbtmpChilds++]=courant;

          img=image;
        }
        else{
          //ajouter element courant dans liste temporaire
          tmpChilds[nbtmpChilds++]=courant;
        }
      }
      //traiter la serie precedente
      if (0==indexcol){
        //tri sur le type, la serie est insere au debut de newChilds -> inverse l'ordre des types
        while (nbtmpChilds){
          newChilds.insertBefore(tmpChilds[nbtmpChilds-1],newChilds.childNodes[0]);
          nbtmpChilds--;
        }
      }
      else{
        tmpChilds.sort(compareBoites);
        for (var i=0;i<nbtmpChilds;i++){
          newChilds.appendChild(tmpChilds[i]);
        }
      }
      //affectation liste des boites triees
      this.boites=newChilds;

    },

    getCellText : function(row,column){
      
      if (null==this.boites){
        return null;
      }
      try{
        let index=this.getIndexCol(column);
        if (-1==index) 
          return null;
        if (row>=this.boites.childNodes.length) 
          return null;
        let elem=this.boites.childNodes[row];
        let ligne=elem.firstChild;
        let cell=ligne.childNodes[index];
        if (!cell.hasAttribute("label"))
          return null;
        return cell.getAttribute("label");
      }
      catch(ex){
        AnaisTrace("Erreur de lecture de libelle pour une boite:\nligne:"+row+"\ncolonne:"+column+"\n"+ex);
      }
      return null;
    },

    setTree: function(treebox){ 
      this.treebox=treebox; 
    },
    isContainer: function(row){ 
      return false; 
    },
    isSeparator: function(row){ 
      return false; 
    },
    isSorted: function(row){
      return false; 
    },
    getLevel: function(row){ 
      return 0; 
    },
    getImageSrc: function(row,col){

      let index=this.getIndexCol(col);
      if (0!=index) 
        return null;
      if (row>=this.boites.childNodes.length) 
        return null;
      let elem=this.boites.childNodes[row];
      let ligne=elem.firstChild;
      let cell=ligne.childNodes[index];
      if (!cell.hasAttribute("src"))
        return null;
      return cell.getAttribute("src");

    },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){},
    cycleHeader: function(colID,elt){}
};

/**
*	initiatisation de la liste des boites (colonnes)
*
*	@param	document
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*	V0.11 ajout d'attributs pour le tri des colonnes
*
*/
function anaisInitBoites(doc){

  gBoites=document.getElementById("anaismoz-boites");
  gBoitesRacine=document.getElementById("anaismoz-boites-racine");
  //element <boites>
  let boites=doc.getElementsByTagNameNS(ANAIS_NS, "boites");
  if (null==boites || null==boites[0]){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrBoitesSrvBal");
    return false;
  }

  //colonnes
  let cols=null;
  cols=boites[0].getElementsByTagName("treecols");
  if (null==cols || null==cols[0]){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrBoitesSrvCol");
    return false;
  }
  cols=cols[0];
  let boitescols=anaisCreeElements(cols);
  if (boitescols!=null){
    gBoites.insertBefore(boitescols,gBoitesRacine);
    //memoriser les index des colonnes avec id boites-cn boites-mail dans gIndexcn et gIndexmail
    //sert pour les destinataires
    let cols=gBoites.getElementsByTagName("treecol");
    let nb=cols.length;
    for (var i=0;i<nb;i++){
      let id=cols[i].getAttribute("id");
      if (id=="boites-cn"){
        gIndexcn=i;
        //V0.11 memorisation libelle colonne nom complet
        gLibColCn=cols[i].getAttribute("label");
      }
      else if (id=="boites-mail"){
        gIndexmail=i;
      }
      //V0.11 ajout d'attributs pour le tri des colonnes
      cols[i].setAttribute("sortDirection","ascending");
      cols[i].setAttribute("onclick","anaisClicColonne('anaismoz-boites',this);");
    }
  }
  else{
    return false;
  }

  //contenu
  let res=anaisBoitesInsereContenu(doc);
  if (!res){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return false;
  }

  //initialisation controle liste des boites
  gBoites.view=gBoitesView;
  //V0.11 tri des boites
  anaisBoitesInitTri();
  //V0.11 affichage du nombre de boites
  anaisMajNbBoites();

  gCheminBoites=gCheminCourant;

  return true;
}

/**
*	fixe le conteneur racine des boites et insere les boites
*
*	@param	chemin chemin ldap du conteneur
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*	(17-08-2004) remise à zero de la selection
*
*	v 0.4 utilise anaisReqSrvDoc au lieu de anaisReqSrv
*	V0.5 pour les chemins de recherche, le contenu est recherche dans le cache
*/
function anaisBoitesSetContainer(chemin){
  
  if (gCheminBoites==chemin)
    return true;

  //remise à zero de la selection
  anaisBoitesEffSel();
  gBoites.treeBoxObject.scrollToRow(0);
  //vider le contenu de la liste
  anaisBoitesVideContenu();
  anaisMajNbBoites();
  if ((chemin==null)||(chemin=="")){
    gCheminBoites="";
    return true;
  }
  if (0==chemin.indexOf("rech:")){
    gCheminBoites=chemin;
    return true;
  }

  //requete asynchrone
  anaisSetWaitCursor();
  //cas url de recherche
  if (0==chemin.indexOf("rech")){
    let d=chemin.indexOf(":");
    let op=chemin.substring(0,d);
    let p=chemin.indexOf("?");
    let param=chemin.substring(p+1,chemin.length);
    chemin="ldap"+chemin.substring(d,p);

    let doc=anaisCacheLit(op,chemin,param);

    anaisBoitesSetContainerRap(doc);
    return true;
  }

  //listage annuaire
  let res=anaisReqSrvFnc(LISTE_BOITES,chemin,null,anaisBoitesSetContainerRap,null);
  if (false==res){
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return false;
  }

  return true;
}

/**
*	traite la reponse du serveur et insere les boites
*
*	@param	doc document xml de reponse du serveur (null si erreur)
*/
function anaisBoitesSetContainerRap(doc, elem){

  if (null==doc){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return;
  }

  //code de resultat
  let bDocOk=anaisAnalyseErreurDoc(doc);
  if (!bDocOk){
    anaisRestoreCursor();
    AnaisAfficheMsgIdGlobalErr("anaisdlg_ErrBoites");
    return;
  }

  //inserer le contenu
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

  //retrouver element conteneur
  //traiter cas recherche
  let chemin=anaisCheminReqDoc(doc);
  if (null!=chemin){
    gCheminBoites=chemin;
  }

  anaisRestoreCursor();
}


/**
*	gère le double clic sur la liste des boites
*
*	@param	aucun
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation : insere les destinataires selectionnes avec le type "A:" par defaut
*
*/
function anaisBoitesDblClic(event){

  if (ANAIS_MODE_COMPO==g_bMode){

    anaisDestInsertBoites("anaismozdlg-typedestA");

  } else if (ANAIS_MODE_PARTS==g_bMode){

    anaisPartsInsertBoites("anaismozdlg-partO");

  } else{

    //afficher les proprietes
    if (!gBoites.view) return true;
    let row = { };
    let col = { };
    let elt = { };
    gBoites.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
    if (row.value ==-1 ) return true;
    if (gBoites.view.selection.count!=1) return true;

    anaisDlgPropBal('anaismoz-boites');
  }

  return true;
}


/**
*
*	@param	event
*
*	@return retourne true si le menu doit être affiche
* false dans le cas contraire
*
*	implementation : si le clic n'est pas sur un element de la liste, le menu n'est pas affiche
*
*	V0.2 (16-08-2004) option proprietes
*/
function anaisBoitesContext(event){
  if (event.type!="popupshowing") return true;

  let row = { };
  let col = { };
  let elt = { };
  gBoites.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);

  //mise à jour des chemins de recherche
  let brech=false;
  if (0==gCheminBoites.indexOf("rechbs:")){
    brech=true;
    document.getElementById("anaismozdlg.boitesupdrech").removeAttribute("hidden");
    document.getElementById("anaismozdlg.btentite").removeAttribute("hidden");
  }
  else{
    document.getElementById("anaismozdlg.boitesupdrech").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btentite").setAttribute("hidden",true);
  }

  if (ANAIS_MODE_EXPL==g_bMode){
    document.getElementById("anaismozdlg.btdestA").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCc").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCci").setAttribute("hidden",true);
    document.getElementById("anaismozdlg-sepbal1").setAttribute("hidden",true);
  }

  if (row.value ==-1 ){
    document.getElementById("anaismozdlg.btdestA").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCc").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCci").setAttribute("hidden",true);
    document.getElementById("anaismozdlg-sepbal1").setAttribute("hidden",true);
    document.getElementById("anaismozdlg-btpropbal").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btentite").setAttribute("hidden",true);
    return brech;
  }

  //controle affichage option Proprietes
  if (!gBoites.view){
    document.getElementById("anaismozdlg.btdestA").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCc").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btdestCci").setAttribute("hidden",true);
    document.getElementById("anaismozdlg-sepbal1").setAttribute("hidden",true);
    document.getElementById("anaismozdlg-btpropbal").setAttribute("hidden",true);
    document.getElementById("anaismozdlg.btentite").setAttribute("hidden",true);
    return brech;
  }
  if (ANAIS_MODE_COMPO==g_bMode){
    document.getElementById("anaismozdlg.btdestA").removeAttribute("hidden");
    document.getElementById("anaismozdlg.btdestCc").removeAttribute("hidden");
    document.getElementById("anaismozdlg.btdestCci").removeAttribute("hidden");
    document.getElementById("anaismozdlg-sepbal1").removeAttribute("hidden");
  }
  document.getElementById("anaismozdlg-btpropbal").removeAttribute("hidden");

  if (gBoites.view.selection.count!=1){
    document.getElementById("anaismozdlg-btpropbal").setAttribute("disabled",true);
    document.getElementById("anaismozdlg.btentite").setAttribute("disabled",true);
  }
  else{
    document.getElementById("anaismozdlg-btpropbal").removeAttribute("disabled");
    document.getElementById("anaismozdlg.btentite").removeAttribute("disabled");
  }

  return true;
}



/**
*	affiche le nombre de boites dans la colonne
*
*	@param
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*/
function anaisMajNbBoites(){

  let nb=0;
  if (gBoites) 
    nb=gBoitesView.NombreBoites();

  let col=document.getElementById("boites-cn");
  let lib=gLibColCn+" ("+nb+")";
  col.setAttribute("label",lib);

  return true;
}


/**
*	tri des elements de la liste des boites
*
*	@param	indexcol	index de colonne
*	@param	bUp si true tri par ordre ascendant
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*	pour la liste des boites le serveur retourne les elements tries par type de boite, puis alpha
*	lors du tri on conserve les boites par type-> un tri consiste a inverser l'ordre
*
*/
function anaisTriItemsBoites(indexcol,bUp){

  anaisSetWaitCursor();

  gBoites.treeBoxObject.beginUpdateBatch();
  gBoitesView.TriBoites(indexcol,bUp);
  gBoites.treeBoxObject.endUpdateBatch();

  anaisRestoreCursor();
}



/**
*	tri les boites après insertion d'une liste (nouveau conteneur)
*
*	@param
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*	V0.11 tri sur le type et la première colonne si l'ordre est 'descending'
*/
function anaisBoitesInitTri(){

  let treecol=document.getElementById("boites-img");
  let sens=treecol.getAttribute("sortDirection");
  if (sens=="descending") anaisTriItemsBoites(0,false);

  treecol=document.getElementById("boites-cn");
  let indexcol=treecol.getAttribute("ordinal")-1;
  indexcol/=2;//pris en compte splitters
  sens=treecol.getAttribute("sortDirection");
  if (sens=="descending") anaisTriItemsBoites(indexcol,true);

  return true;
}

/**
*	gère evenement de selection de la liste des boîtes
*
*	implementation : contrôle l'etat du bouton proprietes de la barre d'outils
*
*/
function anaisBoitesOnSelect(){

  let bMasque=true;
  if (gBoites.view.selection.count==1)	bMasque=false;
  document.getElementById("anaismoz-btprop").setAttribute("disabled",bMasque);

  //bouton envoi de message
  if (ANAIS_MODE_EXPL==g_bMode){
    if (gBoites.view.selection.count==0) 
      document.getElementById("anaismoz-btcompose").setAttribute("disabled",true);
    else 
      document.getElementById("anaismoz-btcompose").removeAttribute("disabled");
  }

  return true;
}


/**
*	vide le contenu de la liste des boites
*
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*/
function anaisBoitesVideContenu(){

  let old=gBoitesView.NombreBoites();
  gBoitesView.videContenu();
  gBoites.treeBoxObject.beginUpdateBatch();
  gBoites.treeBoxObject.rowCountChanged(0,-old);
  gBoites.treeBoxObject.endUpdateBatch();

  return true;
}


/**
*	insère le contenu des boites du document dans la liste des boites
*
*	@param	doc document xml
*
*	@return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*	implementation :
*
*	V 0.4 la fonction 'anaisSetRacineImages' n'est plus appelee
*/
function anaisBoitesInsereContenu(doc){

  let boites=doc.getElementsByTagNameNS(ANAIS_NS, 'boites');
  if ((boites==null)||(boites[0]==null)){
    gCodeErreur=-1;
    gMsgErreur=AnaisMessageFromId("anaisdlg_ErrBoitesSrvBal");
    return false;
  }
  let res=gBoitesView.setDocumentBoites(boites[0]);
  if (!res){
    return false;
  }
  gBoites.treeBoxObject.beginUpdateBatch();
  gBoites.treeBoxObject.rowCountChanged(0,gBoitesView.NombreBoites());
  gBoites.treeBoxObject.endUpdateBatch();

  return true;
}

/**
*	efface la selection des boîtes
*
*/
function anaisBoitesEffSel(){

  if (gBoites.view && gBoites.view.selection)
    gBoites.view.selection.clearSelection();
}


/**
*	selectionne une boîte à partir de son chemin
*
*	@param chemin chemin ldap de la boîte
*
*	Implementation: suppose que le contenu des boîtes est en cours de construction
*	verifie que le conteneur des boîtes est le parent de la boîte
*/
function anaisSelectionBoite(chemin){

  AnaisTrace("anaisSelectionBoite:"+chemin);
  let cont=conteneurParent(chemin);
  if (cont!=gCheminBoites){
    setTimeout(anaisBoitesEntiteCh,500,chemin);
    return;
  }
  //retrouver l'index de la boîte et selectionner
  let nb=gBoitesView.NombreBoites();
  for (var i=0;i<nb;i++){
    let elem=gBoitesView.getBoite(i);
    let dn=elem.getAttribute("id");
    if (dn==chemin){
      //selection
      gBoites.view.selection.select(i);
      break;
    }
  }
}
