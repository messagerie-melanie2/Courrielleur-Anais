ChromeUtils.import("resource:///modules/mailServices.js");


/**
*  Variables globales
*
*/

//liste des destinataires (id=anaismoz-destitems)
//  V0.11 initialisation a partir des valeurs des boutons
var libTypeA="A:";
var libTypeCc="Cc:";
var libTypeCci="Cci:";

var gDestModif=false;//indicateur liste des destinataires modifiees


/**
*  insere les boites selectionnees dans la liste des boites dans la liste des destinataires
*
*  @param  type identifiant du type de destinataire (identifiant de bouton)
*          anaismozdlg-btdestA, anaismozdlg-btdestCc, anaismozdlg-btdestCci
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*
*  (20/09/2004) suppression des blancs dans mail et test mail non vide
*              si vide, l'element n'est pas insere dans la liste des destinataires
*/
function anaisDestInsertBoites(typeid){

  let nb=gBoites.view.rowCount;
  
  if (nb==0){
    AnaisAfficheMsgId("anaisdlg_SelDest");
    return true;
  }

  //parcourir les boites selectionnees
  for (var i=0;i<nb;i++){
    
    if (gBoites.view.selection.isSelected(i)){
      
      let elem=gBoitesView.getBoite(i);
      //retrouver les colonnes avec id boites-cn boites-mail
      let cells=elem.getElementsByTagName("treecell");
      let cn=cells[gIndexcn].getAttribute("label");
      let mail=cells[gIndexmail].getAttribute("label");
      let dn=elem.id;
      mail=mail.replace(/ +/g,"");
      
      if ((!mail)||(""==mail)){
        
        let msg=AnaisMessageFromId("anaisdlg_ErrDest");
        msg=msg.replace("%cn",cn);
        alert(cn);
      }
      else{
        
        //tester si l'element n'est pas dejà dans la liste des destinataires
        let index=anaisDestGet(cn,mail);
        //inserer l'element si inexistant
        if (index==-1)
          anaisDestInsertDest(typeid,cn,mail,dn);
      }
    }
  }
  
  //tri de la liste
  let col0=document.getElementById("anaismoz-dest-type");
  let bUp1=true;
  let sens=col0.getAttribute("sortDirection");
  if (sens=="descending") 
    bUp1=false;
  let col1=document.getElementById("anaismoz-dest-cn");
  let bUp2=true;
  sens=col1.getAttribute("sortDirection");
  if (sens=="descending") 
    bUp2=false;
  anaisTriItemsDest(1,!bUp2);
  anaisTriItemsDest(0,!bUp1);

  return true;
}

/**
*  insertion d'un destinataire dans la liste des destinataires
*
*  @param  typeid  identifiant du type de destinataire (identifiant de bouton)
*          anaismozdlg-btdestA, anaismozdlg-btdestCc, anaismozdlg-btdestCci
*  @param  cn    nom complet
*  @param  mail  adresse email
*  @param  dn   distinguishedname de la boîte (peut être null)
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*  V0.11 utilisation des libelles de mozilla pour les types
*  V0.11 insertion triee par type, puis alpha
*  V0.2 (26/08/2004) ajout du dn en paramètre d'appel pour id de treeitem (si non null)
*/
function anaisDestInsertDest(typeid,cn,mail,dn){

  let item=document.createElement("treeitem");
  if (dn!=null)
    item.id=dn;
  item.setAttribute("container","false");
  let rows=document.createElement("treerow");
  item.appendChild(rows);
  
  //colonne type
  let cell=document.createElement("treecell");

  if (typeid=="anaismozdlg-typedestA"){
    cell.setAttribute("label",libTypeA);
    
  }
  else if (typeid=="anaismozdlg-typedestCc"){
    cell.setAttribute("label",libTypeCc);
    
  }
  else if (typeid=="anaismozdlg-typedestCci"){
    cell.setAttribute("label",libTypeCci);
    
  }
  rows.appendChild(cell);
  //colonne nom complet -> Destinataires
  cell=document.createElement("treecell");
  cell.setAttribute("label",cn);
  rows.appendChild(cell);
  //colonne mail (invisible)
  cell=document.createElement("treecell");
  cell.setAttribute("label",mail);
  rows.appendChild(cell);

  //insertion dans la liste des destinataires
  //V0.11 insertion triee par type, puis alpha (en tenant compte du sens de tri des colonnes)
  let liste=document.getElementById("anaismoz-destitems");
  liste.appendChild(item);

  gDestModif=true;

  return true;
}

/**
*  initialisation de la liste des destinataires depuis la fenêtre de composition de message
*
*  @param
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation : lorsque la fenetre anais est appelee depuis le fenetre de composition de message
*  des paramètres sont passes en arguments
*(references:
*  passage des paramètres : fichier messenger/messengercompose/MsgComposeCommands.js fonction SelectAddress
*  extraction des paramètres : fichier messenger/addressbook/abSelectAddressesDialog.js fonction OnLoadSelectAddress)
*
*/
function anaisInitDestCompose(){

  AnaisTrace("anaisInitDestCompose");

  //si appel depuis fenêtre de composition de message
  //traiter les arguments
  if (ANAIS_MODE_COMPO!=g_bMode) 
    return true;

  let zone=document.getElementById("anaismoz-zonedest");
  zone.removeAttribute("hidden");

  //libelle des boutons
  let elem=document.getElementById("anaismozdlg-typedestA");
  libTypeA=elem.getAttribute("label");
  elem=document.getElementById("anaismozdlg-typedestCc");
    libTypeCc=elem.getAttribute("label");
    elem=document.getElementById("anaismozdlg-typedestCci");
    libTypeCci=elem.getAttribute("label");

  if ( window.arguments[0].composeWindow )
    top.composeWindow = window.arguments[0].composeWindow;

  //inserer les destinataires dans la liste
  //pour les types memes id que les boutons de la boite
  if (window.arguments[0].destinataires){    
    let destinataires=window.arguments[0].destinataires;
    anaisDestInsertFromCompose("anaismozdlg-typedestA", destinataires.to);
    anaisDestInsertFromCompose("anaismozdlg-typedestCc", destinataires.cc);
    anaisDestInsertFromCompose("anaismozdlg-typedestCci", destinataires.bcc);
  }

  //tri
  anaisTriItemsDest(1,false);
  anaisTriItemsDest(0,false);

  gDestModif=false;

  return true;
}

/**
* @param  type  libTypeA  ou libTypeCc ou libTypeCci
* @param  destinataires destinataires (nsIMsgCompFields.to, .cc, .bcc)
*
* @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
* v5.4 : Utilisation de nsIMsgHeaderParser.makeFromDisplayAddress pour extraire les cn et email
*/
function anaisDestInsertFromCompose(type, destinataires){
  
  let nb=destinataires.length;
  
  for (var i=0;i<nb;i++){
    
    let dest=destinataires[i];
    let email=dest.email;
    let nom=dest.name;
          
    if (nom || email){
      if (""==nom) 
        nom=email;
      anaisDestInsertDest(type, nom, email, null);
    }
  }
}


/**
* fonction executee a la sortie de la boite avec le bouton 'Valider'
*
* @param
*
* @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
* implementation :
* V0.11 utilisation des libelles de mozilla pour les types
* V 0.24 par convention lors du transfert message->boite, si cn vide => cn=mail
* sur validation si cn=mail, on ne copie pas cn et mail n'est pas entre <>
*
* v5.4 : utilisation de MailServices.headerParser.makeMimeAddress(cn, email);
*
*/
function anaisBoutonValider(){

  if (ANAIS_MODE_PARTS==g_bMode) {
    anaisPartsBtValider();
    return true;
  }

  //parcourir les destinataires de la liste
  let destA="", destCc="", destCci="";

  let liste=document.getElementById("anaismoz-dest");
  //parcourir les destinataires de la liste
  let nb=liste.view.rowCount;
  for (var i=0;i<nb;i++){
    let elem=liste.contentView.getItemAtIndex(i);
    let cells=elem.getElementsByTagName("treecell");
    let type=cells[0].getAttribute("label");
    let cn=cells[1].getAttribute("label");
    let email=cells[2].getAttribute("label");
    
    let dest=MailServices.headerParser.makeMimeAddress(cn, email);

    //supprimer l'espace en debut de valeur
    if (type==libTypeA){
      if (destA.length) 
        destA+=", "+dest;
      else
        destA=dest;
    } else if (type==libTypeCc){
      if (destCc.length) 
        destCc+=", "+dest;
      else
        destCc=dest;
    } else if (type==libTypeCci){
      if (destCci.length) 
        destCci+=", "+dest;
      else
        destCci=dest;
    }
  }
  
  // reset the UI in compose window
  if ( window.arguments[0].msgCompFields){
    top.msgCompFields=window.arguments[0].msgCompFields;
    top.msgCompFields.to=destA;
    top.msgCompFields.cc=destCc;
    top.msgCompFields.bcc=destCci;
    top.composeWindow.CompFields2Recipients(top.msgCompFields);
  }

  top.composeWindow.CompFields2Recipients(top.msgCompFields);
  window.close();

  return true;
}

/**
*  fonction executee a la sortie de la boite avec le bouton 'Annuler'
*
*  @param
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*
*/
function anaisBoutonAnnuler(){

  if (gDestModif){
    if (confirm("Enregistrer les modifications"))
      anaisBoutonValider();
  }
  window.close();

  return true;
}

/**
*  gère les caractères au clavier dans la liste des destinataires
*
*  @param
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation : intercepte la touche de suppression
*
*/
function anaisDestKeyPress(event){

  if (event.keyCode==46){
    anaisDestSupSel();
  }

  return true;
}

/**
*  retire les destinataires selectionnes
*
*  @param
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*
*/
function anaisDestSupSel(){

  //supprimer les destinataires selectionnes
  let liste=document.getElementById("anaismoz-dest");
  let nb=liste.view.rowCount;
  if (nb==0){
    return true;
  }
  let fils=document.getElementById("anaismoz-destitems");
  
  //parcourir les boites selectionnees
  while (nb--){
    if (liste.view.selection.isSelected(nb)){
      let elem=liste.contentView.getItemAtIndex(nb);
      fils.removeChild(elem);
      gDestModif=true;
    }
  }

  return true;
}

/**
*  recherche si le destinataire identifie par son cn et son mail existe dans la liste des detinataires
*
*  @param  cn  libelle première colonne de texte (avec ou sans espace au debut)
*  @param  mail  libelle deuxième colonne de texte (avec ou sans espace au debut)
*
*  @return si succes retourne index dans la liste
* si erreur retourne -1
*
*  implementation :
*
*/
function anaisDestGet(cn,mail){

  let liste=document.getElementById("anaismoz-dest");
  
  //parcourir les destinataires de la liste
  let nb=liste.view.rowCount;
  for (var i=0;i<nb;i++){
    let elem=liste.contentView.getItemAtIndex(i);
    let cells=elem.getElementsByTagName("treecell");
    let type=cells[0].getAttribute("label");
    let destcn=cells[1].getAttribute("label");
    let destmail=cells[2].getAttribute("label");
    //supprimer l'espace en debut de valeur
    if (cn==destcn&&mail==destmail){
      return i;
    }
  }

  return -1;
}

/**
*
*
*  @param  event
*
*  @return retourne true si le menu doit être affiche
* false dans le cas contraire
*
*  implementation : si le clic n'est pas sur un element de la liste, le menu n'est pas affiche
*
*  V0.2 (16-08-2004) option proprietes
*/
function anaisDestContext(event){

  AnaisTrace("anaisDestContext");

  let row = { };
  let col = { };
  let elt = { };
  let liste=document.getElementById("anaismoz-dest");
  
  liste.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
  if (-1==row.value){
    return false;
  }
  
  //controle affichage option Proprietes
  if (event.type=="popupshowing"){
    
    let liste=document.getElementById("anaismoz-dest");
    
    if (liste.view.selection.count!=1){
      
      document.getElementById("anaismozdlg-btpropdest").setAttribute("hidden",true);
      document.getElementById("anaismozdlg-sepdest1").setAttribute("hidden",true);
    }
    else{
      
      document.getElementById("anaismozdlg-btpropdest").setAttribute("hidden",false);
      document.getElementById("anaismozdlg-sepdest1").setAttribute("hidden",false);
    }
  }

  return true;
}


/**
*  modifie le type pour les destinataires selectionnes
*
*  @param  typeid
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*  V0.11 utilisation des libelles de mozilla pour les types
*/
function anaisDestChange(typeid){

  let liste=document.getElementById("anaismoz-dest");
  let nb=liste.view.rowCount;
  if (nb==0){
    return true;
  }
  
  //parcourir les boites selectionnees
  while (nb--){
    if (liste.view.selection.isSelected(nb)){
      let elem=liste.contentView.getItemAtIndex(nb);
      let row=elem.getElementsByTagName("treerow");
      let cells=row[0].getElementsByTagName("treecell");
      if (typeid=="anaismozdlg-typedestA") 
        cells[0].setAttribute("label",libTypeA);
      else if (typeid=="anaismozdlg-typedestCc") 
        cells[0].setAttribute("label",libTypeCc);
      else if (typeid=="anaismozdlg-typedestCci") 
        cells[0].setAttribute("label",libTypeCci);
    }
  }
  gDestModif=true;

  return true;
}


/**
*  comparaison des destinataires sur le type
*/

function CompareTypeDest(a,b){
  
  let cells1=a.getElementsByTagName("treecell");
  let lib1=cells1[0].getAttribute("label");
  let cells2=b.getElementsByTagName("treecell");
  let lib2=cells2[0].getAttribute("label");
  
  if (lib1==lib2) 
    return 0;
  
  let p1=0;
  let p2=0;
  let ordre=[libTypeA,libTypeCc,libTypeCci];
  for (var i=0;i<ordre.length;i++){ 
    if (ordre[i]==lib1)
      p1=i;
    if (ordre[i]==lib2)
      p2=i;
  }
  
  if (p1<p2)
    return 1;
  return -1;
}

/**
*  comparaison des destinataires sur le nom
*  conserve l'ordre sur type
*/

function CompareNomDest(a,b){
  
  let cells1=a.getElementsByTagName("treecell");
  let lib1=cells1[1].getAttribute("label");
  let cells2=b.getElementsByTagName("treecell");
  let lib2=cells2[1].getAttribute("label");
  if (lib1==lib2) 
    return 0;
  if (lib1<lib2)
    return 1;
  return -1;
}


/**
*  tri des elements de la liste des destinataires
*
*  @param  indexcol  index de colonne
*  @param  bUp si true tri par ordre ascendant
*
*  @return si succes retourne true
* si erreur retourne false (erreur globale dans gCodeErreur et gMsgErreur)
*
*  implementation :
*  tri par type, puis alpha
*
*/
function anaisTriItemsDest(indexcol,bUp){

  let arbre=document.getElementById("anaismoz-dest");
  let childs=arbre.getElementsByTagName("treechildren");
  if (childs.length==0) 
    return true;
  childs=childs[0];
  
  //extraction des destinataires
  let newChilds=new Array();

  //tri
  if (0==indexcol){
    
    newChilds[libTypeA]=new Array();
    newChilds[libTypeCc]=new Array();
    newChilds[libTypeCci]=new Array();
    
    while(childs.childNodes.length){
      let row=childs.removeChild(childs.childNodes[0]);
      let cells1=row.getElementsByTagName("treecell");
      let lib1=cells1[0].getAttribute("label");
      newChilds[lib1].push(row);
    }
    if (bUp){
      for (var i=0;i<newChilds[libTypeCci].length;i++){
        childs.appendChild(newChilds[libTypeCci][i]);
      }
      for (var i=0;i<newChilds[libTypeCc].length;i++){
        childs.appendChild(newChilds[libTypeCc][i]);
      }
      for (var i=0;i<newChilds[libTypeA].length;i++){
        childs.appendChild(newChilds[libTypeA][i]);
      }
    }
    else{
      for (var i=0;i<newChilds[libTypeA].length;i++){
        childs.appendChild(newChilds[libTypeA][i]);
      }
      for (var i=0;i<newChilds[libTypeCc].length;i++){
        childs.appendChild(newChilds[libTypeCc][i]);
      }
      for (var i=0;i<newChilds[libTypeCci].length;i++){
        childs.appendChild(newChilds[libTypeCci][i]);
      }
    }
  }
  else{
    
    while(childs.childNodes.length){
      let row=childs.removeChild(childs.childNodes[0]);
      newChilds.push(row);
    }
    newChilds.sort(CompareNomDest);
    if (!bUp){
      while(newChilds.length){
        let row=newChilds.pop();
        childs.appendChild(row);
      }
    }
    else{
      for (var i=0;i<newChilds.length;i++)
        childs.appendChild(newChilds[i]);
    }
  }

  return true;
}
