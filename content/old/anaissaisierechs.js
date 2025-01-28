
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


// Get elements
const searchBox = document.getElementById("anais-rechtxt");
const suggestionsContainer = document.getElementById("suggestions");

// Load saved searches from localStorage
let searchHistory = JSON.parse(browser.storage.local.get("anais.searchhistory")) || [];

// Display suggestions that match the current input
function displaySuggestions(input)
{
  console.log("suggestions ??");
    suggestionsContainer.innerHTML = ""; // Clear previous suggestions
    suggestionsContainer.style.display = "none"; // Hide if no matches

    const filteredSuggestions = searchHistory.filter(term => term.toLowerCase().includes(input.toLowerCase()));

    if (filteredSuggestions.length > 0) {
        filteredSuggestions.forEach(term => {
            const suggestionItem = document.createElement("div");
            suggestionItem.textContent = term;
            suggestionItem.className = "suggestion-item";
            suggestionItem.style.padding = "5px";
            suggestionItem.style.cursor = "pointer";

            // Click to select the suggestion
            suggestionItem.onclick = () => {
                searchBox.value = term;
                suggestionsContainer.style.display = "none";
            };

            suggestionsContainer.appendChild(suggestionItem);
        });
        suggestionsContainer.style.display = "block";
    }
}

// Event listeners
searchBox.addEventListener("input", (e) => displaySuggestions(e.target.value));

document.addEventListener("click", (e) => {
    if (!suggestionsContainer.contains(e.target) && e.target !== searchBox) {
        suggestionsContainer.style.display = "none"; // Close suggestions when clicking outside
    }
});