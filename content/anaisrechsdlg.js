/*
*	initialisation de la boîte de recherche avec annulation de l'operation (anaisrechsdlg.xul)
*
*	@param arguments d'appel de la boîte:
*					op:operation, chemin:chemin ldap complet, param:critère de recherche
*
*	@return retourne les resultats dans le tableau d'arguments d'appel de la boîte window.arguments[0].doc
*					retourne false dans window.arguments[0].res si la recherche est annulee sinon true
*	implementation : lance la recherche en arrière plan
*
*/
// Ajout de gestion du bouton enter
document.addEventListener('DOMContentLoaded', function() {
    searchInput.addEventListener('keypress', function(event) {
        // Check if the Enter key (key code 13) is pressed
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission if inside a form
            btRechercheSimple(); // Call the search function
        }
    });
});

function initRechsDlg(){

  if (!window.arguments[0] ||
      null==window.arguments[0].op ||
      null==window.arguments[0].chemin ||
      null==window.arguments[0].param ){
    AnaisAfficheMsgId("anaisdlg_ErrRechDlg");
    window.arguments[0].res=false;
    window.close();
    return;
  }

  //url du serveur
  //gUrlScript=Services.prefs.getCharPref("anais.anaismoz.urlserveur");
  gUrlScript = localStorage.getItem("anais.anaismoz.urlserveur");

  //en cas de fermeture avec case X
  window.arguments[0].res=false;

  //lancer la recherche
  //rechsdlgRecherche();
  let op=window.arguments[0].op;
  let chemin=window.arguments[0].chemin;
  let param=window.arguments[0].param;
  anaisSetWaitCursor();
  let res=anaisReqSrvFnc(op,chemin,param,rechsdlgRap);
  if (false==res){
    AnaisAfficheMsgId("anaisdlg_ErrRech");
    window.close();
    return;
  }
}

/**
*	fonction de rappel pour la requete asynchrone
*
*/
function rechsdlgRap(doc, elem){

  anaisRestoreCursor();

  if (null==doc){
    //resultat retourne
    window.arguments[0].doc=null;
    window.arguments[0].res=true;
    //fermeture fenetre
    let bt=document.getElementById("dlgrechs-btannuler");
    bt.click();
    return;
  }

  //resultat retourne
  window.arguments[0].doc=doc;
  window.arguments[0].res=true;

  //fermeture fenetre
  let bt=document.getElementById("dlgrechs-btannuler");
  bt.click();
}


/**
*	annulation de la recherche
*/
function rechsdlgAnnuler(){
  //ne pas faire
  //window.arguments[0].res=false;
  window.close();
}
