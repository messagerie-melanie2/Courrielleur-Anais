//const paulineUrl = 'https://annuaire-preprod.e2.rie.gouv.fr/';
const paulineUrl = 'http://localhost:8000';

// Add a cache-busting query parameter to the iframe src
function UpdateIframeSrc()
{
  const cacheBustedUrl = paulineUrl + '?nocache=' + new Date().getTime();
  document.getElementById('pauline-iframe').src = cacheBustedUrl;
}

// Call the function to set the iframe src on page load
UpdateIframeSrc();

// Listen for messages from the iframe
window.addEventListener('message', async function(event) {
    handlePaulineMessage(event);
});

// Handle message from external Pauline website
async function handlePaulineMessage(event)
{
  // Ensure the message is from the correct origin
  if (event.origin !== paulineUrl) {
      showNotification("Message inconnu", "Message reçu de la source non reconnue: "+event.origin);
      return;
  }

  // Check the action and perform the desired script
  if (event.data.action === 'addRecipient') {
      console.log("addRecipient");
      showNotification("Ajout de destinataire", event.data.data);
      await addTextToRecipientField(event.data.data);
      return;
  }
}

document.addEventListener("DOMContentLoaded", async () =>
{
});