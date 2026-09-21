//var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr/";
var paulineUrl = "https://annuaire-preprod.e2.rie.gouv.fr?courrielleur=true"

// Helper pour créer un espace ou mettre à jour ses propriétés s'il existe déjà
async function registerOrUpdateSpace(name, url, buttonProperties) {
  try {
    const existingSpaces = await browser.spaces.query({ isSelfOwned: true });
    const existing = existingSpaces?.find(s => s.name === name);
    if (existing) {
      const spaceId = existing.id ?? existing.spaceId;
      console.log(`[Pauline] - Space ${name} déjà existant (id: ${spaceId}), mise à jour des propriétés...`);
      await browser.spaces.update(spaceId, { url }, buttonProperties);
      console.log(`[Pauline] - Space ${name} mis à jour avec succès`);
      return existing;
    }
    const created = await browser.spaces.create(name, url, buttonProperties);
    console.log(`[Pauline] - Space ${name} créé avec succès, id:`, created?.id);
    return created;
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log(`[Pauline] - Space ${name} déjà existant lors du create, tentative de mise à jour...`);
      try {
        const existingSpaces = await browser.spaces.query({ isSelfOwned: true });
        const existing = existingSpaces?.find(s => s.name === name);
        if (existing) {
          const spaceId = existing.id ?? existing.spaceId;
          await browser.spaces.update(spaceId, { url }, buttonProperties);
          console.log(`[Pauline] - Space ${name} mis à jour après exception`);
          return existing;
        }
      } catch (updateErr) {
        console.error(`[Pauline] - Erreur lors de la mise à jour de ${name}:`, updateErr);
      }
    } else {
      console.error(`[Pauline] - Erreur registerOrUpdateSpace (${name}):`, e);
    }
  }
}

// --------------- SPACE TOOLBAR BUTTON ------
async function createSpaceButton() {
  // Délai pour laisser WebApps s'enregistrer en premier (donc Pauline apparaît en dessous)
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    try {
      browser.domapi?.init?.();
    } catch (e) { }

    const spaceName = "Pauline";
    const defaultUrl = browser.runtime.getURL("content/pauline.html");
    const buttonProperties = {
      title: "Annuaire",
      themeIcons: [
        {
          "dark": "skin/images/annuaire_light.svg",
          "light": "skin/images/annuaire_dark.svg",
          "size": 16
        },
        {
          "dark": "skin/images/annuaire_light.svg",
          "light": "skin/images/annuaire_dark.svg",
          "size": 18
        },
        {
          "dark": "skin/images/annuaire_light.svg",
          "light": "skin/images/annuaire_dark.svg",
          "size": 32
        }
      ]
    };

    await registerOrUpdateSpace(spaceName, defaultUrl, buttonProperties);
    console.log(`[Pauline] - Space button initialisé avec succès`);
  } catch (error) {
    console.error("[Pauline] - Error creating/updating space:", error);
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