document.getElementById("start").addEventListener("click", () => {
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
