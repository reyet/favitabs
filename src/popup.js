function closePopup() {
  window.close();
}
chrome.tabs.onRemoved.addListener(update);
