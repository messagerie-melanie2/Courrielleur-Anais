async function createSpace() {
  try {
    const spaceName = "Anais";
    const defaultUrl = browser.runtime.getURL("content/anais.html");
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
  createSpace();
});
