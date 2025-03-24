//var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr/";
var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr/"

// --------------- SPACE TOOLBAR BUTTON ------
// adding Pauline button inv the "spacesToolbar"
async function createSpaceButton() {
  try {
    const spaceName = "Pauline";
    const defaultUrl = browser.runtime.getURL("content/pauline.html");
    const buttonProperties = {
      title: "Contacts ministériels",
      defaultIcons: {
        "18": "skin/images/logo-18.png",
        "32": "skin/images/logo-32.png"
      }
    };

    const space = await browser.spaces.create(spaceName, defaultUrl, buttonProperties);
    console.log(`Space created with ID: ${space.id}`);
  } catch (error) {
    console.error("Error creating space:", error);
  }
}

// Add button on extension launch
browser.runtime.onInstalled.addListener(() => {
  createSpaceButton();
});
// -------------------------------------------

// ----------- COMPOSE MAIL BUTTON -----------
async function openPauline(composeWindowId) {
  // TODO: use composeWindowId to add mail only to current window
  await messenger.windows.create({'type': 'popup', 'url': messenger.extension.getURL("content/pauline.html")});
}

messenger.composeAction.onClicked.addListener(async (tab) => {
  openPauline(tab.windowId);
});
// -------------------------------------------