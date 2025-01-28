// -------------------------------------------
// --------------- SPACE TOOLBAR BUTTON ------
async function CreateSpaceButton() {
  try {
    const spaceName = "Pauline";
    const defaultUrl = browser.runtime.getURL("content/pauline.html");
    const buttonProperties = {
      title: "Contacts ministériels",
      defaultIcons: {
        "18": "skin/images/anais_icon_18.png",
        "32": "skin/images/anais_icon_32.png"
      }
    };

    const space = await browser.spaces.create(spaceName, defaultUrl, buttonProperties);
    console.log(`Space created with ID: ${space.id}`);
  } catch (error) {
    console.error("Error creating space:", error);
  }
}

// Call createSpace when the extension is installed
browser.runtime.onInstalled.addListener(() => {
  // Bouton Pauline dans la "spaceToolbar"
  CreateSpaceButton();
  loadDefaultPreferences();
});
// -------------------------------------------
// -------------------------------------------

// -------------------------------------------
// --------------- NEW MAIL BUTTON -----------
messenger.compose.onComposeStateChanged.addListener(async (tab, state) => {
  console.log("--- onComposeStateChanged:", state);
  await addPaulineButton(tab.id);
});

async function addPaulineButton(tabId) {
  try {
    console.log("--- addPaulineButton: "+tabId);
    // Inject button into compose window DOM
    await messenger.compose.getComposeDetails(tabId).then(() => {
        const composeDoc = document.querySelector(`#tab-${tabId} iframe`).contentDocument;
        const buttonContainer = composeDoc.querySelector('#compose-toolbar'); // Select the toolbar
        const newButton = composeDoc.createElement('button');
        newButton.textContent = "My Custom Button"; // Customize button text
        newButton.id = "customComposeButton";
        newButton.addEventListener('click', onButtonClick); // Attach an event handler for the button

        // Append the button to the toolbar
        buttonContainer.appendChild(newButton);
    });
  } catch (error) {
    console.error("Error adding button to compose window:", error);
  }
}
// -------------------------------------------
// -------------------------------------------