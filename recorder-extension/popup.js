let isRecording = false;

// Check current recording state when popup opens
chrome.storage.local.get(["isRecording"], (result) => {
  isRecording = result.isRecording || false;
  updateUIState();
});

document.getElementById("start").addEventListener("click", () => {
  console.log("Popup sending START message");
  chrome.runtime.sendMessage({ type: "START" });

  // Update UI state
  isRecording = true;
  chrome.storage.local.set({ isRecording: true });
  updateUIState();

  // Close the popup
  window.close();
});

document.getElementById("stop").addEventListener("click", () => {
  console.log("Popup sending STOP message");
  chrome.runtime.sendMessage({ type: "STOP" });

  // Update UI state
  isRecording = false;
  chrome.storage.local.set({ isRecording: false });
  updateUIState();
});

document.getElementById("export").addEventListener("click", () => {
  chrome.storage.local.get(["recordedSteps"], (result) => {
    const steps = result.recordedSteps || [];

    if (steps.length === 0) {
      alert("No recorded steps to export. Please record some actions first!");
      return;
    }

    const json = JSON.stringify(
      { tests: [{ name: "Recorded Test", steps: steps }] },
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cypress-test-${Date.now()}.json`;
    a.click();

    // Show success feedback
    const exportBtn = document.getElementById("export");
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = "<span>✅</span>Exported!";
    exportBtn.style.background = "linear-gradient(135deg, #11998e, #38ef7d)";

    setTimeout(() => {
      exportBtn.innerHTML = originalText;
      exportBtn.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
    }, 2000);
  });
});

// Update UI state based on recording status
function updateUIState() {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const status = document.getElementById("status");
  const statusText = document.getElementById("status-text");

  if (isRecording) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.className = "status recording";
    statusText.textContent = "Recording in progress...";
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    status.className = "status stopped";
    statusText.textContent = "Ready to record";
  }
}

// Initialize UI state
updateUIState();
