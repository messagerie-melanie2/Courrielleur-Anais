// -------------- IFRAME PAULINE ------------------
// Function to add a cache-busting query parameter to the iframe src
function UpdateIframeSrc()
{
  console.log(getPreference("pauline.serverUrl"));
  const iframe = document.getElementById('pauline-iframe');
  //http://localhost:8000/
  //https://annuaire-preprod.e2.rie.gouv.fr/
  const currentSrc = 'http://localhost:8000/';  // Your iframe URL
  const cacheBustedSrc = currentSrc + '?nocache=' + new Date().getTime();  // Adding a timestamp as a cache-buster
  iframe.src = cacheBustedSrc;  // Set the iframe src to the new URL
  console.log("New iframe src: "+iframe.src);
}

// Call the function to set the iframe src on page load
UpdateIframeSrc();

// Listen for messages from the iframe
window.addEventListener('message', async function(event) {
    console.log(event.origin);
    // Ensure the message is from the correct origin (for security)
    // You can also replace '*' with the specific origin URL if needed
    //http://localhost:8000/
    //https://annuaire-preprod.e2.rie.gouv.fr/
    if (event.origin !== "http://localhost:8000") {
        showNotification("Message inconnu", "Message reçu de la source non reconnue: "+event.origin);
        return;
    }

    // Check the action and perform the desired script
    if (event.data.action === 'helloThunderbird') {
        console.log("helloThunderbird");
        showNotification("Message de Pauline", event.data.data);
        await addTextToRecipientField(event.data.data);
        return;
    }
});

async function addTextToRecipientField(text) {
    let windows = await messenger.windows.getAll();
    for(let currentWindow of windows) {
        if(currentWindow["type"] == "messageCompose"){
            await messenger.domapi.setInputs(
                [{"key": "mailToRecipientField", "value": text}],
                currentWindow.id);
            messenger.domapi.injectScriptInDom("resources/add-recipient.js", currentWindow.id, "", "add-recipient-script");
        }
    }
}
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