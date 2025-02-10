// Simple Replacement for MailServices.makeMimeAddress
function makeMimeAddress(displayName, email)
{
    // If the display name contains special characters or spaces, quote it.
    if (displayName && /[^\w\s]/.test(displayName)) {
        displayName = `"${displayName.replace(/"/g, '\\"')}"`;
    }
    return `${displayName} <${email}>`;
}

// Displays a notification in the bottom right corner
function showNotification(title, message)
{
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.runtime.getURL("skin/images/pauline_icon_64.png"), // Path to your icon
        "title": title,
        "message": message
    });
}

// We need to initialize the preferences for a synchronous usage
let preferenceCache = {};
// Function to load default preferences
async function loadDefaultPreferences()
{
    const defaultPrefsUrl = browser.runtime.getURL("default_prefs.json");
    try
    {
        const response = await fetch(defaultPrefsUrl);
        const defaultPrefs = await response.json();

        // Set default preferences if not already set
        const storedPrefs = await browser.storage.local.get();
        const prefsToSet = {};

        for (const [key, value] of Object.entries(defaultPrefs))
        if (!(key in storedPrefs))
            prefsToSet[key] = value;

        if (Object.keys(prefsToSet).length > 0)
        {
            await browser.storage.local.set(prefsToSet);
            console.log("Default preferences loaded:", prefsToSet);
        }
        else
        console.log("All preferences already set.");

        document.addEventListener("DOMContentLoaded", async () => { const prefs = await browser.storage.local.get(); });
    }
    catch (error)
    {
        console.error("Error loading default preferences:", error);
    }
}

// Get preference from Thunderbird profile
function getPreference(name)
{
    // Prevent infinite recursion
    if(name != "log")
        paulineLog("Getting pref "+name+": "+preferenceCache[name]);

    return preferenceCache[name] || null;
}

// Save preference to Thunderbird profile
function setPreference(name, value)
{
    paulineLog("Setting pref "+name+": "+value);
    browser.storage.local.set({ name: value });
}

function paulineLog(message)
{
    //if(getPreference("log"))
        console.log("[Pauline] - "+message);
}

function paulineTest(mail)
{
	console.log("paulineTest mail: "+mail);
}