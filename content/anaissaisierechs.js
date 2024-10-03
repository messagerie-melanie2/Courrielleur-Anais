
//liste des caractères valides pour la saisie de la recherche simple
var g_FiltreSaisie=/([a-zA-Z0-9à-ïöôù-ü_\.\-\ \(\)\@\/\#\&\,\:\<\>\[\]\{\}])+/g;

//contrôle de saisie recherche simple
var gSaisieRech=null;

//bouton valider
var btRech=null;

/**
*	initialisation (sur onload)
*/
function initDlgRechS(){

  if (!window.arguments[0] || 2>window.arguments[0].length){
    AnaisAfficheMsgId("anaisdlg_ErrRechDlgSaisie");
    window.close();
    return;
  }
  gSaisieRech=document.getElementById("dlgrechs-valeur");
  btRech=document.getElementById("dlgrechs-btvalider");

  //Inserer la liste des bases de recherche
  let liste=document.getElementById("dlgrechs-bases");
  for (var i=0;i<window.arguments[0][0].length;i++){
    let desc=window.arguments[0][0][i];
    liste.appendItem(desc,i);
  }

  //selectionner la base de recherche par defaut
  liste.selectedIndex=window.arguments[0][1];
  //force annulation par defaut
  window.arguments[0][1]=-1;
  if (window.arguments[0][2]) 
    gSaisieRech.value=window.arguments[0][2];
  if (gSaisieRech.value.length>=3) 
    btRech.disabled=false;
  //filtrage
  if (window.arguments[0]["filtrage"]){
    g_FiltreSaisie=window.arguments[0]["filtrage"];
  }

  gSaisieRech.focus();
}


/**
*	bouton Valider
*/
function dlgrechsBoutonValider(){
  let valeur=gSaisieRech.value;
  if (3>valeur.length){
    AnaisAfficheMsgId("anaisdlg_ErrRechDlgMinCar");
    return;
  }
  let liste=document.getElementById("dlgrechs-bases");
  window.arguments[0][1]=liste.selectedIndex;
  window.arguments[0][2]=valeur;

  window.close();
}


/**
*	bouton Annuler
*/
function dlgrechsBoutonAnnuler(){
  window.arguments[0][1]=-1;
  window.close();
}


/**
*	action sur la touche entree
*
*	Implementation : permettre validation par la touche entree
*
*/
function dlgrechsToucheEntree(event){
  if (event.target.id=="dlgrechs-btannuler"){
    dlgrechsBoutonAnnuler();
  }
  else{
    dlgrechsBoutonValider();
  }
}

/**
*	evenement onkeyup du contrôle de saisie de la recherche simple
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