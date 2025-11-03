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

// Add mail to recipient field in the current compose window (or open one)
async function addTextToRecipientField(text) {
  if (!text) return;

  // Normalize: allow "a@b,c@d" or "a@b; c@d"
  const addrs = text.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  if (!addrs.length) return;

  // Prefer the active compose in the current window
  const tabs = await browser.tabs.query({
    type: "messageCompose",
    active: true,
    currentWindow: true
  });

  if (!tabs.length) {
    // No compose open: open a new one prefilled
    await browser.compose.beginNew({ to: addrs });
    return;
  }

  const tab = tabs[0];
  const details = await browser.compose.getComposeDetails(tab.id);

  // De-dupe with existing recipients
  const to = new Set(details.to || []);
  for (const a of addrs) to.add(a);

  await browser.compose.setComposeDetails(tab.id, { to: [...to] });
  console.log("Recipient(s) added:", addrs.join(", "));
}