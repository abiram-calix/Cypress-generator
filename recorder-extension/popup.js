document.getElementById("start").addEventListener("click", () => {
  console.log("Popup sending message:");
  chrome.runtime.sendMessage({ type: "START" });
});

document.getElementById("stop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP" });
});

document.getElementById("export").addEventListener("click", () => {
  chrome.storage.local.get(["recordedSteps"], (result) => {
    const json = JSON.stringify(
      { tests: [{ name: "Recorded Test", steps: result.recordedSteps }] },
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recorded-test.json";
    a.click();
  });
});

// ✅ Enable assertion mode
document.getElementById("assertMode").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ASSERT_MODE" });
  document.getElementById("assertForm").style.display = "block";
  document.getElementById("selectedElement").textContent =
    "Click an element...";
});

// ✅ Listen for selected element from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ASSERT_SELECTED") {
    const selectedElement = document.getElementById("selectedElement");
    selectedElement.textContent = msg.selector;
    selectedElement.dataset.selector = msg.selector; // ✅ Ensure dataset is set
  }
});

// ✅ Save assertion
document.getElementById("saveAssertion").addEventListener("click", () => {
  const selector = document.getElementById("selectedElement").dataset.selector;
  const assertType = document.getElementById("assertType").value;
  const expectedValue = document.getElementById("expectedValue").value;

  if (!selector) {
    alert("Please select an element before saving the assertion.");
    return;
  }

  chrome.storage.local.get(["recordedSteps"], (result) => {
    const steps = result.recordedSteps || [];
    steps.push({ action: assertType, selector, value: expectedValue }); // ✅ Add assertion
    chrome.storage.local.set({ recordedSteps: steps }, () => {
      alert("Assertion added!");
      document.getElementById("assertForm").style.display = "none";
    });
  });
});

// ✅ Restore selector when popup opens
chrome.storage.local.get(["currentAssertionSelector"], (result) => {
  if (result.currentAssertionSelector) {
    document.getElementById("assertForm").style.display = "block";
    const selectedElement = document.getElementById("selectedElement");
    selectedElement.textContent = result.currentAssertionSelector;
    selectedElement.dataset.selector = result.currentAssertionSelector;
  }
});
