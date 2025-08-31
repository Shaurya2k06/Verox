// Simple background script for Verox extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Verox Wallet extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by the popup, but we can add additional logic here if needed
  console.log('Verox Wallet clicked');
});
