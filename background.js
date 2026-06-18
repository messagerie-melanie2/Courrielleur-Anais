//var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr/";
var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr?courrielleur=true"

// --------------- SPACE TOOLBAR BUTTON ------
async function createSpaceButton() {
  // Délai de 1 seconde pour laisser WebApps s'enregistrer en premier (donc Pauline apparaît en dessous)
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    const spaceName = "Pauline";
    const defaultUrl = browser.runtime.getURL("content/pauline.html");
    const buttonProperties = {
      title: "Annuaire",
      themeIcons: [
        {
          "light": "skin/images/annuaire_light.svg",
          "dark": "skin/images/annuaire_dark.svg",
          "size": 18
        },
        {
          "light": "skin/images/annuaire_light.svg",
          "dark": "skin/images/annuaire_dark.svg",
          "size": 32
        }
      ]
    };

    const space = await browser.spaces.create(spaceName, defaultUrl, buttonProperties);
    console.log(`Pauline button created with space ID: ${space.id}`);
  } catch (error) {
    console.error("Error creating space:", error);
  }
}
// Make sure the Pauline spacestoolbar button is added
async function waitForMailTabAndRun() {
  const tabs = await browser.tabs.query({});

  for (const tab of tabs) {
    if (tab.mailTab) {
      createSpaceButton();
      return;
    }
  }

  // Wait until a mail tab is created
  browser.tabs.onCreated.addListener(async (tab) => {
    if (tab.mailTab) {
      createSpaceButton();
    }
  });
}
waitForMailTabAndRun();
// -------------------------------------------

// ----------- COMPOSE MAIL BUTTON -----------
async function openPauline(composeWindowId) {
  // TODO: use composeWindowId to add mail only to current window
  console.log("Opening compose Pauline");
  let composePaulineUrl = messenger.runtime.getURL("content/pauline.html") + "?compose=true";
  console.log(composePaulineUrl);
  await messenger.windows.create({ 'type': 'popup', 'url': composePaulineUrl, 'width': 1200, 'height': 700 });
}

messenger.composeAction.onClicked.addListener(async (tab) => {
  openPauline(tab.windowId);
});
// -------------------------------------------