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

    // Get test name from input field and clean it
    const testNameInput = document.getElementById("test-name");
    let testName = testNameInput.value.trim();

    // If no name provided, use default
    if (!testName) {
      testName = "Recorded Test";
    }

    // Remove spaces and special characters for the name field
    const cleanTestName = testName.replace(/[^a-zA-Z0-9]/g, "");

    const data = { tests: [{ name: cleanTestName, steps: steps }] };

    // Send to backend API
    fetch("http://localhost:4000/generate-test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          // Show success feedback
          const exportBtn = document.getElementById("export");
          const originalText = exportBtn.innerHTML;
          exportBtn.innerHTML = "<span>✅</span>Generated!";
          exportBtn.style.background =
            "linear-gradient(135deg, #11998e, #38ef7d)";

          setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.style.background =
              "linear-gradient(135deg, #667eea, #764ba2)";
          }, 3000);

          // Show success message with filename
          alert(
            `Test generated successfully!\n\nFile: ${result.filename}\nSaved to: cypress/e2e/generated/`
          );
        } else {
          throw new Error(result.error || "Unknown error");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          `Failed to generate test: ${error.message}\n\nMake sure the server is running:\ncd cypress-test-generator\nnode server.js`
        );
      });
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
