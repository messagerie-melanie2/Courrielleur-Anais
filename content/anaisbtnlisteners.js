document.addEventListener("DOMContentLoaded", function() {
    // Adding event listeners to buttons
    document.getElementById("anais-rechbt").addEventListener("click", btRechercheSimple);
    document.getElementById("anaismoz-btprop").addEventListener("click", anaisDlgPropBal);
    document.getElementById("anaismoz-btcompose").addEventListener("click", anaisDlgComposeMsg);
    document.getElementById("anaismoz-btpauline").addEventListener("click", anaisDlgPauline);
    document.getElementById("anaismoz-btlegende").addEventListener("click", anaisBoiteLegende);
    document.getElementById("anaismoz-btabout").addEventListener("click", anaisBoiteApropos);
});