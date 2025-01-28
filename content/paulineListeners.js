// -------------- IFRAME PAULINE ------------------
// Function to add a cache-busting query parameter to the iframe src
function UpdateIframeSrc()
{
  console.log(getPreference("pauline.serverUrl"));
  const iframe = document.getElementById('pauline-iframe');
  const currentSrc = 'https://annuaire-preprod.e2.rie.gouv.fr/';  // Your iframe URL
  const cacheBustedSrc = currentSrc + '?nocache=' + new Date().getTime();  // Adding a timestamp as a cache-buster
  iframe.src = cacheBustedSrc;  // Set the iframe src to the new URL
  console.log("New iframe src: "+iframe.src);
}

// Call the function to set the iframe src on page load
UpdateIframeSrc();

// Listen for messages from the iframe
window.addEventListener('message', function(event) {
    // Ensure the message is from the correct origin (for security)
    // You can also replace '*' with the specific origin URL if needed
    if (event.origin !== "https://annuaire-preprod.e2.rie.gouv.fr/") {
        showNotification("Message inconnu", "Message reçu de la source non reconnue: "+event.origin);
        return;
    }

    // Check the action and perform the desired script
    if (event.data.action === 'helloThunderbird') {
        showNotification("Message de Pauline", event.data.data);
        return;
    }
});
// -------------- IFRAME PAULINE ------------------

document.addEventListener("DOMContentLoaded", async () =>
{
    await initializePreferences();

    // Call to search function
    /*document.getElementById("pauline-rechbt").addEventListener("click", function()
    {
        search(document.getElementById("pauline-tbsearch").value, true)
    });

    // Suggestions
    document.getElementById("pauline-tbsearch").addEventListener("input", (event) =>
    {
        let query = event.target.value;
        showSuggestions(query);
    });*/

    //document.getElementById("paulinemoz-btprop").addEventListener("click", paulineDlgPropBal);
    //document.getElementById("paulinemoz-btcompose").addEventListener("click", paulineDlgComposeMsg);
    //document.getElementById("paulinemoz-btpauline").addEventListener("click", paulineDlgPauline);
    //document.getElementById("paulinemoz-btlegend").addEventListener("click", paulineBoiteLegende);
    //document.getElementById("paulinemoz-btabout").addEventListener("click", paulineBoiteApropos);
});