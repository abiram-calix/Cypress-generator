let isRecording = false;
let steps = [];

function recordEvent(action, selector, value = "") {
  steps.push({ action, selector, value });
  chrome.storage.local.set({ recordedSteps: steps });
}

document.addEventListener("click", (e) => {
  if (isRecording) {
    const selector = getSelector(e.target);
    recordEvent("click", selector);
  }
});

document.addEventListener("input", (e) => {
  if (isRecording) {
    const selector = getSelector(e.target);
    recordEvent("type", selector, e.target.value);
  }
});

function getSelector(el) {
  return el.id ? `#${el.id}` : el.tagName.toLowerCase();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START") {
    isRecording = true;
    steps = [];
  }
  if (msg.type === "STOP") {
    isRecording = false;
  }
});
