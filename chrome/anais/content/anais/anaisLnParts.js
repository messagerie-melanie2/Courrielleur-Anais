ChromeUtils.import("resource://calendar/modules/calUtils.jsm");

//libelles boutons participations
var gPartO="";
var gPartF="";
var gPartN="";


//liste globale des participants
var gListeParts=null;
var gModifListeParts=false;
//actions de modification (-> fonction udpateListeParts)
const PARTS_INSERT=0;
const PARTS_UPDATE=1;
const PARTS_DELETE=2;



function anaisEditParts(){

  AnaisTrace("anaisEditParts");

  let attendees=document.getElementById("attendees-list");

  gListeParts=attendees.attendees;

  let params=new Object();
  params.attendees=attendees;
  params.participants=gListeParts;


  var fncModifieParts= function(attendees, participants){

    //liste existante dans la fenetre calendar-event-dialog-attendees.xml
    let nbatt=attendees.attendees.length;
    AnaisTrace("anaisEditParts fncModifieParts nbatt:"+nbatt);
    //supprimer existants
    while(nbatt--){
      attendees.deleteRow(2);
    }

    //parcourir les destinataires de la liste gListeParts
    const nb=participants.length;
    for (var i=0;i<nb;i++){

      let part=participants[i];

      AnaisTrace("fncModifieParts part.id:"+part.id);
      AnaisTrace("fncModifieParts part.role:"+part.role);
      AnaisTrace("fncModifieParts part.commonName:"+part.commonName);
    }
  }

  params.onOk=fncModifieParts;

  window.openDialog("chrome://anais/content/anaismozdlg.xul",
                    "",
                    "chrome,center,resizable,titlebar,modal",
                    params);
}

/* equivalent anaisBoutonValider */
function anaisPartsBtValider(){

  if (!gModifListeParts){
    window.close();
    return;
  }

  let args=window.arguments[0];

  args.attendees.cm2SetParticipants(gListeParts);

  window.close();
}


/* initialisation de la liste des participants */
function anaisInitDestParts(){

  AnaisTrace("anaisInitDestParts");

  if (ANAIS_MODE_PARTS!=g_bMode)
    return true;

  //liste de participants de l'event
  let args=window.arguments[0];
  gListeParts=args.participants;

  let compo=document.getElementById("anaismoz-zonedest");
  compo.setAttribute("hidden", true);
  let zone=document.getElementById("anaismoz-zoneparts");
  zone.removeAttribute("hidden");

  //libelle des boutons -> remplacer par image+bulle
  let bt1=document.getElementById("anaismozdlg-partO");
  gPartO=bt1.getAttribute("label");

  let bt2=document.getElementById("anaismozdlg-partF");
    gPartF=bt2.getAttribute("label");

    let bt3=document.getElementById("anaismozdlg-partN");
    gPartN=bt3.getAttribute("label");

  //inserer les participants dans la liste
  if (gListeParts){
    for (var i=0;i<gListeParts.length;i++){

      let part=gListeParts[i];

      AnaisTrace("anaisInitDestParts part.id:"+part.id);
      AnaisTrace("anaisInitDestParts part.role:"+part.role);
      AnaisTrace("anaisInitDestParts part.commonName:"+part.commonName);

      let email=part.id;
      if (0==email.toLowerCase().indexOf("mailto:"))	
        email=email.substr(7);

      let typepart=anaisRoleToPartId(part.role);

      anaisInserePart(typepart, part.commonName ? part.commonName : email, email, null);
    }
  }

  //liste des boites en mode participants
  let bals=document.getElementById("anaismoz-boites");
  bals.setAttribute("context", "anaismoz-balparts-context");

  return true;
}

/* part.role -> anaismozdlg-part<x> */
function anaisRoleToPartId(role) {

  if ("REQ-PARTICIPANT"==role) 
    return "anaismozdlg-partO";//"REQ-PARTICIPANT": "required",
  else if ("OPT-PARTICIPANT"==role) 
    return "anaismozdlg-partF";//"OPT-PARTICIPANT": "optional",
  else if ("NON-PARTICIPANT"==role) 
    return "anaismozdlg-partN";//"NON-PARTICIPANT": "nonparticipant",
  return "";
}

/* anaismozdlg-part<x> -> part.role */
function anaisPartIdToRole(partid){

  if ("anaismozdlg-partO"==partid) 
    return "REQ-PARTICIPANT";
  else if ("anaismozdlg-partF"==partid) 
    return "OPT-PARTICIPANT";
  else if ("anaismozdlg-partN"==partid) 
    return "NON-PARTICIPANT";
  return "";
}


/* mise à jour gListeParts selon actions
action:PARTS_INSERT, PARTS_UPDATE, PARTS_DELETE
typeid:"anaismozdlg-partO", "anaismozdlg-partF", "anaismozdlg-partN"
*/
function udpateListeParts(action, typeid, cn, mail){
  AnaisTrace("udpateListeParts action:"+action);

  let index=-1;
  let part=null;
  
  //recherche dans gListeParts
  if (gListeParts){
    for (var i=0;i<gListeParts.length;i++){

      part=gListeParts[i];

      let email=part.id;
      if (0==email.toLowerCase().indexOf("mailto:"))	
        email=email.substr(7);

      if (mail ? email==mail : cn==part.commonName) {
        AnaisTrace("udpateListeParts existe dans gListeParts mail="+email);
        index=i;
        break;
      }
    }
  }
  if (-1!=index){
    if (PARTS_DELETE==action){
      AnaisTrace("udpateListeParts remove valeur mail:"+mail);
      gListeParts.splice(index,1);
      gModifListeParts=true;
      return;
    }
    //mise a jour
    AnaisTrace("udpateListeParts mise a jour valeur mail:"+mail);
    gListeParts[i].commonName=cn;
    gListeParts[i].role=anaisPartIdToRole(typeid);
    gModifListeParts=true;
  }
  if (PARTS_INSERT==action){
    AnaisTrace("udpateListeParts insertion valeur mail:"+mail);
    let attendee=cal.createAttendee();
    attendee.id=mail;
    attendee.commonName=cn;
    attendee.rsvp="TRUE";
    attendee.role=anaisPartIdToRole(typeid);
    attendee.participationStatus="NEEDS-ACTION";
    gListeParts.push(attendee);
    gModifListeParts=true;
  }
}


/* insere les boîtes selectionnees dans la liste des partcipants
equivalent anaisDestInsertBoites
typepart: id bouton */
function anaisPartsInsertBoites(typepart){

  let nb=gBoites.view.rowCount;
  AnaisTrace("anaisPartsInsertBoites nb="+nb);
  if (nb==0){
    AnaisAfficheMsgId("anaisdlg_SelDest");
    return;
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
      if (!mail||""==mail){
        let msg=AnaisMessageFromId("anaisdlg_ErrDest");
        msg=msg.replace("%cn",cn);
        alert(cn);
      }
      else{
        //tester si l'element n'est pas dejà dans la liste des destinataires
        let index=anaisPartDestGet(cn,mail);
        //inserer l'element si inexistant
        if (index==-1) {
          anaisInserePart(typepart, cn, mail, dn);

          udpateListeParts(PARTS_INSERT, typepart, cn, mail);
        }
      }
    }
  }
}

function anaisPartDestGet(cn, mail){

  let liste=document.getElementById("anaismoz-parts");
  //parcourir les destinataires de la liste
  let nb=liste.view.rowCount;
  for (var i=0;i<nb;i++){
    let elem=liste.contentView.getItemAtIndex(i);
    let cells=elem.getElementsByTagName("treecell");
    let destcn=cells[1].getAttribute("label");
    let destmail=cells[2].getAttribute("label");
    //supprimer l'espace en debut de valeur
    if (cn==destcn || mail==destmail){
      return i;
    }
  }

  return -1;
}


/* insere un participant dans la liste
equivalent anaisDestInsertDest */
function anaisInserePart(typeid, cn, mail, dn){

  AnaisTrace("anaisInserePart");

  let item=document.createElement("treeitem");
  if (dn!=null)
    item.id=dn;
  item.setAttribute("container","false");
  let rows=document.createElement("treerow");
  item.appendChild(rows);
  //colonne type
  let cell=document.createElement("treecell");
  //let libtype="";
  if (typeid=="anaismozdlg-partO")
    cell.setAttribute("label",gPartO);
  else if (typeid=="anaismozdlg-partF")
    cell.setAttribute("label",gPartF);
  else if (typeid=="anaismozdlg-partN")
    cell.setAttribute("label",gPartN);

  rows.appendChild(cell);
  //colonne nom complet -> Destinataires
  cell=document.createElement("treecell");
  cell.setAttribute("label",cn);
  rows.appendChild(cell);
  //colonne mail (invisible)
  cell=document.createElement("treecell");
  cell.setAttribute("label",mail);
  rows.appendChild(cell);

  //insertion dans la liste des participants
  let liste=document.getElementById("anaismoz-partsitems");
  liste.appendChild(item);

  return true;
}

/* equivalent anaisDestContext */
function anaisPartsContext(event){

  AnaisTrace("anaisPartsContext");

  let row = { };
  let col = { };
  let elt = { };
  let liste=document.getElementById("anaismoz-parts");

  liste.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);
  if (-1==row.value){
    return false;
  }

  //controle affichage option Proprietes
  if (event.type=="popupshowing"){
    if (liste.view.selection.count!=1){
      document.getElementById("anaismozdlg-btpropdest").setAttribute("hidden",true);
      document.getElementById("anaismozdlg-sepdest1").setAttribute("hidden",true);
    }
    else{
      //AnaisTrace("anaisPartsContext count==1");
      document.getElementById("anaismozdlg-btpropdest").setAttribute("hidden",false);
      document.getElementById("anaismozdlg-sepdest1").setAttribute("hidden",false);
    }
  }

  return true;
}

/* equivalent anaisDestChange */
function anaisPartChange(typeid){

  AnaisTrace("anaisPartChange typeid:"+typeid);

  let liste=document.getElementById("anaismoz-parts");
  let nb=liste.view.rowCount;
  if (nb==0){
    return true;
  }

  //parcourir les participants selectionnees
  while (nb--){
    if (liste.view.selection.isSelected(nb)){
      let elem=liste.contentView.getItemAtIndex(nb);
      let row=elem.getElementsByTagName("treerow");
      let cells=row[0].getElementsByTagName("treecell");
      if (typeid=="anaismozdlg-partO") cells[0].setAttribute("label",gPartO);
      else if (typeid=="anaismozdlg-partF") cells[0].setAttribute("label",gPartF);
      else if (typeid=="anaismozdlg-partN") cells[0].setAttribute("label",gPartN);

      udpateListeParts(PARTS_UPDATE, typeid, cells[1].getAttribute("label"), cells[2].getAttribute("label"));
    }
  }

  return true;
}


/* equivalent anaisBoitesContext */
function anaisBalsPartsContext(event){

  if (event.type!="popupshowing") return true;

  let row = { };
  let col = { };
  let elt = { };
  gBoites.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, elt);

  if (-1==row.value){
    return false;
  }

  if (gBoites.view.selection.count!=1){
    document.getElementById("anaismozdlg-parts-propbal").setAttribute("disabled",true);
    document.getElementById("anaismozdlg-parts-pauline").setAttribute("disabled",true);
  }

  return true;
}

/* equivalent anaisDestSupSel */
function anaisPartsSupSel(){

  AnaisTrace("anaisPartsSupSel");

  //supprimer les destinataires selectionnes
  let liste=document.getElementById("anaismoz-parts");
  let nb=liste.view.rowCount;
  if (nb==0){
    return;
  }
  let fils=document.getElementById("anaismoz-partsitems");

  //parcourir les boites selectionnees
  while (nb--){
    if (liste.view.selection.isSelected(nb)){
      let elem=liste.contentView.getItemAtIndex(nb);
      let row=elem.getElementsByTagName("treerow");
      let cells=row[0].getElementsByTagName("treecell");

      udpateListeParts(PARTS_DELETE, cells[0].getAttribute("label"), cells[1].getAttribute("label"), cells[2].getAttribute("label"));

      fils.removeChild(elem);
    }
  }
}

/* equivalent anaisDestKeyPress */
function anaisPartsKeyPress(event){

  AnaisTrace("anaisPartsKeyPress");

  if (event.keyCode==46){
    anaisPartsSupSel();
  }

  return true;
}
