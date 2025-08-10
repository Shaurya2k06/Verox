// Background service worker for Verox Wallet Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Verox] Extension installed');
});

chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
  if (msg && msg.type === 'PING') {
    sendResponse({ ok: true, time: Date.now() });
  }
  return true; // indicate async
});
