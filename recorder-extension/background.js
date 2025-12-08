chrome.runtime.onInstalled.addListener(() => {
  console.log("Recorder Extension Installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    if (message.type === "START") {
      // Inject content.js only if not already injected
      chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["content.js"],
            },
            () => {
              console.log("Injected content.js");
              // After injection, send START message
              chrome.tabs.sendMessage(tabId, message);
            }
          );
        } else {
          // Already injected, just send START message
          chrome.tabs.sendMessage(tabId, message);
        }
      });
    }

    if (message.type === "STOP") {
      chrome.tabs.sendMessage(tabId, message);
    }
  });
});
