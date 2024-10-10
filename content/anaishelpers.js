// Simple Replacement for MailServices.makeMimeAddress
function makeMimeAddress(displayName, email) {
    // If the display name contains special characters or spaces, quote it.
    if (displayName && /[^\w\s]/.test(displayName)) {
        displayName = `"${displayName.replace(/"/g, '\\"')}"`;
    }
    return `${displayName} <${email}>`;
}
// Displays a notification in the bottom right corner
function showNotification(title, message) {
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.runtime.getURL("skin/images/anais_icon_64.png"), // Path to your icon
        "title": title,
        "message": message
    });
}