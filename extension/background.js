// RFPEngine Background Service Worker — Central Event & State Bus

// Enable side panel to open on action button click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Listen for external messages directly from the RFPEngine web app (rfpengine.net / localhost)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_WORKSPACE_ANSWERS') {
    const payload = {
      questions: message.questions || [],
      answers: message.answers || {},
      sourceUrl: message.sourceUrl || '',
      timestamp: message.timestamp || Date.now(),
    };

    chrome.storage.local.set({ active_handoff: payload }, () => {
      console.log('RFPEngine Service Worker: Stored active handoff with', Object.keys(payload.answers).length, 'answers');
      sendResponse({ ok: true, count: Object.keys(payload.answers).length });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_ACTIVE_HANDOFF') {
    chrome.storage.local.get(['active_handoff'], (result) => {
      sendResponse(result?.active_handoff || null);
    });
    return true;
  }
});

// Listen for internal messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_WORKSPACE_ANSWERS') {
    const payload = {
      questions: message.questions || [],
      answers: message.answers || {},
      sourceUrl: message.sourceUrl || '',
      timestamp: message.timestamp || Date.now(),
    };

    chrome.storage.local.set({ active_handoff: payload }, () => {
      console.log('RFPEngine Service Worker: Synced handoff internally');
      sendResponse({ ok: true, count: Object.keys(payload.answers).length });
    });
    return true;
  }

  if (message.type === 'GET_ACTIVE_HANDOFF') {
    chrome.storage.local.get(['active_handoff'], (result) => {
      sendResponse(result?.active_handoff || null);
    });
    return true;
  }

  if (message.type === 'CLEAR_ACTIVE_HANDOFF') {
    chrome.storage.local.remove(['active_handoff'], () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
