ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/FileUtils.jsm");


//nom du fichier des options
const FICHIERANAISRDF="anais.rdf";
//nsIRDFService
var gRDF=null;
//datasource anais.rdf
var gSourceAnais=null;
//predicat http://anais.melanie2.i2/anais#libelle
var gPredLibAnais=null;
//conteneur racine
var gRacineFavoris=null;
//prefixe pour les ressources des favoris -> PREFIX_FAVORIS+elem.id
const PREFIX_FAVORIS="favoris:";

/**
*	Ecouteur pour le chargement de la source de donnees anais.rdf
*
*/
var gFncRap=null;//function de rappel à appeler

var gChargeDsAnais={

  onBeginLoad: function(aSink) {},

  onInterrupt: function(aSink) {},

  onResume: function(aSink) {},

  onEndLoad: function(aSink) {

    AnaisTrace("gChargeDsAnais onEndLoad");
    let ds=aSink.QueryInterface(Components.interfaces.nsIRDFDataSource);
    aSink.removeXMLSinkObserver(gChargeDsAnais);

    //creer/lire conteneur racine
    let resracine=gRDF.GetResource("http://anais.melanie2.i2/anaismozdlg-favoris");
    let rdfContUtils=Components.classes["@mozilla.org/rdf/container-utils;1"].createInstance(Components.interfaces.nsIRDFContainerUtils);
    gRacineFavoris=rdfContUtils.MakeAlt(ds, resracine);

    //fonction de rappel
    gFncRap(ds);
  },

  onError: function(aSink, aStatus, aErrorMsg) {

    AnaisTrace("gChargeDsAnais onError");
    aSink.removeXMLSinkObserver(gChargeDsAnais);

    gFncRap("Erreur de lecture du fichier "+FICHIERANAISRDF+"\n"+aErrorMsg);
  }
};



/**
*	Calcule le chemin du fichier anais.rdf pour l'utilisateur
*	si le fichier n'existe pas, il est cree
*
*	@return url fichier ou null si erreur
*
*/
function InitFichierAnaisRdf(){

  let chemin=Services.dirsvc.get("ProfD", Components.interfaces.nsIFile);
  chemin.append(FICHIERANAISRDF);

  let fic=Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
  fic.initWithPath(chemin.path);

  if (fic.exists()==false){
    
    fic.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
    let flux=Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
    flux.init(fic, FileUtils.MODE_WRONLY|FileUtils.MODE_CREATE|FileUtils.MODE_TRUNCATE,
              FileUtils.PERMS_FILE, 0);
    let str="<?xml version=\"1.0\"?>"+
              "<RDF:RDF xmlns:NS1=\"http://anais.melanie2.i2/anais#\""+
                        " xmlns:NC=\"http://home.netscape.com/NC-rdf#\""+
                        " xmlns:RDF=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></RDF:RDF>";
    flux.write(str,str.length);
    flux.flush();
    flux.close();
  }

  //v3.6
  let fileHandler=Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService)
                            .getProtocolHandler("file")
                            .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
  let url=fileHandler.getURLSpecFromFile(fic);

  return url;
}

/**
*	charge la source de donnees anais.rdf
*
*	@param fnc fonction de rappel : si succès reçoit en paramètre une instance nsIRDFDataSource
*	si erreur chaine du message d'erreur
*/
function ChargeSourceAnais(fnc){

  //chemin complet du fichier archibald.rdf
  let url=InitFichierAnaisRdf();
  if (null==url){
    let msg="Erreur de lecture du fichier "+FICHIERANAISRDF;
    fnc(msg);
    return;
  }

  //charger la source de donnees et initialiser les variables globales d'options
  gRDF=Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
  gPredLibAnais=gRDF.GetResource("http://anais.melanie2.i2/anais#libelle");

  let ds=gRDF.GetDataSource(url);
  let rds=ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

  if (!rds.loaded){
    gFncRap=fnc;
    let sink=ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
    sink.addXMLSinkObserver(gChargeDsAnais);
    return;
  }

  //creer/lire conteneur racine
  let resracine=gRDF.GetResource("http://anais.melanie2.i2/anaismozdlg-favoris");
  let rdfContUtils=Components.classes["@mozilla.org/rdf/container-utils;1"].createInstance(Components.interfaces.nsIRDFContainerUtils);
  gRacineFavoris=rdfContUtils.MakeAlt(ds, resracine);

  fnc(ds);
}



/**
*	Ajoute un conteneur dans les favoris
*
*	@param uri	chemin du conteneur favori (idem conteneur arborescence)
*	@param libelle	libelle du conteneur favori (idem conteneur arborescence)
*
*	@return true si succès, sinon false
*/
function AjouteFavori(uri,libelle){

  let idfav=PREFIX_FAVORIS+uri;
  
  //rechercher si l'element existe dejà
  let resfav=gRDF.GetResource(idfav);
  let index=gRacineFavoris.IndexOf(resfav);
  
  if (-1!=index){
    return true;
  }
  
  //ajouter
  let lit=gRDF.GetLiteral(libelle);
  gSourceAnais.Assert(resfav,gPredLibAnais,lit,true);
  gRacineFavoris.AppendElement(resfav);

  //v3.1
  gSourceAnais.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();

  return true;
}

/**
*	Supprime un conteneur dans les favoris
*
*	@param uri	identifiant du  favori
*
*	@return true si succès, sinon false
*/
function SupprimeFavori(uri){

  //rechercher si l'element existe dejà
  let resfav=gRDF.GetResource(uri);
  let index=gRacineFavoris.IndexOf(resfav);
  
  if (-1==index){
    
    return true;
  }
  
  //supprimer
  gRacineFavoris.RemoveElement(resfav,true);
  let lit=gSourceAnais.GetTarget(resfav,gPredLibAnais,true);
  gSourceAnais.Unassert(resfav,gPredLibAnais,lit,true);

  //v3.1
  gSourceAnais.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();

  return true;
}

/**
*	Test si un favori existe dejà
*
*	@param uri	chemin du conteneur favori (idem conteneur arborescence)
*
*	@return true si existe, sinon false
*/
function FavoriExiste(uri){

  let idfav=PREFIX_FAVORIS+uri;
  
  //rechercher si l'element existe dejà
  let resfav=gRDF.GetResource(idfav);
  let index=gRacineFavoris.IndexOf(resfav);
  
  if (-1!=index){
    return true;
  }

  return false;
}

/**
*	Test si un libelle de favori existe dejà
*
*	@param lib	libelle à tester
*
*	@return true si existe, sinon false
*/
function LibFavoriExiste(lib){

  let litlib=gRDF.GetLiteral(lib);
  let res=gSourceAnais.hasArcIn(litlib,gPredLibAnais);
  return res;
}



/**
*	Initialisation de la boîte d'edition des favoris (suppression)
*
*/
function initDlgFavoris(){
  //charger source anais.rdf
  ChargeSourceAnais(initDlgFavorisRap);
}

function initDlgFavorisRap(dsmsg){

  if (dsmsg instanceof Components.interfaces.nsIRDFDataSource){

    gSourceAnais=dsmsg;

    //construire la liste des favoris dans l'interface
    if (gRacineFavoris){
      cm2ConstruitListeFavoris();
    }

    return;
  }

  //sinon erreur
  let msg=AnaisMessageFromId("anaisdlg_ErrFavDlgListe");
  if (dsmsg instanceof String){
    msg+=dsmsg;
  }

  alert(msg);
}


/**
* bouton valider boîte d'edtion des favoris
*
*/
function btValider(){

  //supprimer les favoris dont la case est decochee
  let liste=document.getElementById("editfavoris-liste");
  let cases=liste.getElementsByAttribute("checked",true);

  let nbfav=cases.length;
  if (0==nbfav){
    window.close();
    return;
  }
  let listeSup=Array();
  for (var i=0;i<nbfav;i++){
    let ident=cases[i].getAttribute("value");
    AnaisTrace("Favori à supprimer:"+ident);
    listeSup.push(ident);
  }
  
  //suppression effective
  for (var f in listeSup){
    let ident=listeSup[f];
    SupprimeFavori(ident);
  }

  window.close();
}


/**
*	bouton annuler boîte d'edtion des favoris
*
*/
function btAnnuler(){
  window.close();
}

/**
* initialisaton de la boîte de modification de libelle de favori
*
*	Paramètres d'appel de la boîte
*	lib: libelle
*	uri: uri du favori
*/
function initDlgLibFavori(){

  if (!window.arguments || !window.arguments[0]){
    AnaisAfficheMsgId("anaisdlg_ErrFavDlg");
    close();
    return;
  }
  window.arguments[0].res=false;
  
  //charger source anais.rdf
  ChargeSourceAnais(initDlgLibFavoriRap);
}

/**
* fonction de rappel pour la fonction initDlgLibFavori
*/
function initDlgLibFavoriRap(dsmsg){

  if (dsmsg instanceof Components.interfaces.nsIRDFDataSource){
    gSourceAnais=dsmsg;
    
  } else{
    
    //sinon erreur
    let msg=AnaisMessageFromId("anaisdlg_ErrFavDlgListe");
    if (dsmsg instanceof String){
      msg+=dsmsg;
    }
    alert(msg);
    close();
    return;
  }

  let lib=window.arguments[0].lib;
  let txt=document.getElementById("libelle");
  txt.value=lib;
  txt.select();
}


/**
* bouton valider de la boîte de modification de libelle de favori
*
*/
function btLibFavoriValider(){

  let lib=document.getElementById("libelle").value;
  if (""==lib){
    AnaisAfficheMsgId("anaisdlg_ErrFavLibVide");
    document.getElementById("libelle").focus();
    return;
  }
  //verifier que le libelle n'existe pas dejà pour un autre favori
  let res=LibFavoriExiste(lib);
  if (res){
    AnaisAfficheMsgId("anaisdlg_ErrFavLibExist");
    document.getElementById("libelle").focus();
    return;
  }
  window.arguments[0].lib=lib;
  window.arguments[0].res=true;
  window.close();
}

/**
* bouton annuler de la boîte de modification de libelle de favori
*
*/
function btLibFavoriAnnuler(){
  window.close();
}

// construire dynamiquement la liste des favoris (menu déroulant)
function cm2ConstruitMenuFavoris(){

  let popup=document.getElementById("favoris-popup");
  
  // vider la liste
  let elems=popup.getElementsByTagName("menuitem");
  while (elems && elems.length){
    let elem=elems[0];
    popup.removeChild(elem);
  }

  let nb=gRacineFavoris.GetCount();

  let favoris=gRacineFavoris.GetElements();

  while (favoris.hasMoreElements()){

    let item=favoris.getNext();

    if (item instanceof Components.interfaces.nsIRDFResource){

      let chemin=item.ValueUTF8;
      let node=gSourceAnais.GetTarget(item, gPredLibAnais, true);
      node=node.QueryInterface(Ci.nsIRDFLiteral);
      
      // #6521: Affichage des favoris dans Amande
      let libelle=GetShortLibelle(node.Value.trim());

      let elem=document.createElement("menuitem");
      elem.setAttribute("label", libelle);
      elem.setAttribute("crop", "end");
      elem.setAttribute("value", chemin);

      popup.appendChild(elem);
    }
  }
}

// #6521: Affichage des favoris dans Amande 
//(on n'affiche pas les détails des noms de service dans la liste des favorits)
function GetShortLibelle(libelle)
{
  return libelle.replace(/ *\([^)]*\) */g, "");
}

// construire dynamiquement la liste des favoris (boite d'édition - editfavoris-liste)
function cm2ConstruitListeFavoris(){

  let liste=document.getElementById("editfavoris-liste");

  let nb=gRacineFavoris.GetCount();

  let favoris=gRacineFavoris.GetElements();

  while (favoris.hasMoreElements()){

    let item=favoris.getNext();

    if (item instanceof Components.interfaces.nsIRDFResource){

      let chemin=item.ValueUTF8;
      let node=gSourceAnais.GetTarget(item, gPredLibAnais, true);
      node=node.QueryInterface(Ci.nsIRDFLiteral);
      let libelle=node.Value.trim();

      let elem=document.createElement("listitem");
      elem.setAttribute("allowevents", true);

      let ck=document.createElement("checkbox");
      ck.setAttribute("allowevents", true);
      ck.setAttribute("checked", false);
      ck.setAttribute("width", "15px");
      ck.setAttribute("value", chemin);
      elem.appendChild(ck);

      let cell=document.createElement("listcell");
      cell.setAttribute("label", libelle);
      elem.appendChild(cell);

      liste.appendChild(elem);
    }
  }
}
