chrome.tabs.onCreated.addListener(update);
chrome.tabs.onUpdated.addListener(update);
chrome.tabs.onRemoved.addListener(update);
chrome.tabs.onActivated.addListener(update);
