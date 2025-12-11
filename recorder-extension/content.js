console.log("Content script loaded successfully!");
let isRecording = false;
let isAssertionMode = false;
let steps = [];

// Track click patterns for text selection
let clickTracker = {
  element: null,
  selector: null,
  count: 0,
  timer: null,
};

// Utility: Debounce function
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function recordEvent(action, selector, value = "") {
  steps.push({ action, selector, value });
  chrome.storage.local.set({ recordedSteps: steps });
}

const handleClickDebounced = debounce((e) => {
  if (isAssertionMode) {
    e.preventDefault();
    e.stopPropagation();

    const selector = getBestSelector(e.target);

    // ✅ Save selector in storage
    chrome.storage.local.set({ currentAssertionSelector: selector }, () => {
      chrome.runtime.sendMessage({ type: "ASSERT_SELECTED", selector });
    });

    isAssertionMode = false;
    return;
  }

  // ✅ Ignore clicks on assertion popup components
  if (
    e.target.closest("#cypress-assertion-popup") ||
    e.target.id === "cypress-assertion-popup" ||
    [
      "assertion-type",
      "assertion-value",
      "save-assertion",
      "cancel-assertion",
      "close-assertion-popup",
    ].includes(e.target.id)
  ) {
    return;
  }

  const tagName = e.target.tagName.toLowerCase();

  // Handle date picker day buttons (keep this in click handler)
  if (e.target.closest('[role="gridcell"]') && tagName === "button") {
    const dayText = e.target.textContent.trim();
    if (dayText) {
      // Use dialog as parent selector for uniqueness
      recordEvent("select-date", '[role="dialog"]', dayText);
      return;
    }
  }

  // Skip select elements - they're handled by change event listener
  if (tagName === "select") {
    console.log(
      `🔄 Skipping click on select element, will be handled by change event`
    );
    return;
  }

  // Check if this is the same element being clicked multiple times (text selection)
  const selector = getBestSelector(e.target);

  if (clickTracker.element === e.target && clickTracker.selector === selector) {
    // Same element clicked again - increment count but don't record yet
    clickTracker.count++;
    console.log(
      `🔄 Multiple clicks detected on ${selector} (count: ${clickTracker.count})`
    );

    // Clear previous timer
    if (clickTracker.timer) {
      clearTimeout(clickTracker.timer);
    }

    // Set timer to record click only if no more clicks come within 500ms
    clickTracker.timer = setTimeout(() => {
      if (clickTracker.count >= 3) {
        // Multiple clicks likely for text selection - don't record as click
        console.log(
          `🎯 Text selection detected on ${selector}, not recording clicks`
        );
      } else {
        // Single or double click - record normally
        recordEvent("click", selector);
        console.log(`🖱️ Click recorded: ${selector}`);
      }

      // Reset tracker
      clickTracker.element = null;
      clickTracker.selector = null;
      clickTracker.count = 0;
      clickTracker.timer = null;
    }, 500);
  } else {
    // Different element or first click
    // Clear any existing timer
    if (clickTracker.timer) {
      clearTimeout(clickTracker.timer);
      // Process previous element if it was a single/double click
      if (clickTracker.count <= 2 && clickTracker.selector) {
        recordEvent("click", clickTracker.selector);
        console.log(`🖱️ Previous click recorded: ${clickTracker.selector}`);
      }
    }

    // Set up new tracking
    clickTracker.element = e.target;
    clickTracker.selector = selector;
    clickTracker.count = 1;

    // Set timer for this click
    clickTracker.timer = setTimeout(() => {
      recordEvent("click", selector);
      console.log(`🖱️ Single click recorded: ${selector}`);

      // Reset tracker
      clickTracker.element = null;
      clickTracker.selector = null;
      clickTracker.count = 0;
      clickTracker.timer = null;
    }, 500);
  }
});

// ✅ Debounced input recording
const debouncedRecordInput = debounce((e) => {
  // Skip input recording for checkboxes, radio buttons, and select elements - they should only be recorded as clicks
  const inputType = e.target.type;
  const tagName = e.target.tagName.toLowerCase();

  if (
    inputType === "checkbox" ||
    inputType === "radio" ||
    tagName === "select"
  ) {
    console.log(
      `🔄 Skipping input recording for ${
        tagName === "select" ? tagName : inputType
      }, will be handled by click event`
    );
    return;
  }

  const selector = getBestSelector(e.target);
  recordEvent("type", selector, e.target.value);
}, 300);

// ✅ Click event listener
document.addEventListener("click", (e) => {
  if (!isRecording) return;
  handleClickDebounced(e);
});

// ✅ Input event listener
document.addEventListener("input", (e) => {
  if (!isRecording) return;

  // ✅ Ignore input events on assertion popup components
  if (
    e.target.closest("#cypress-assertion-popup") ||
    e.target.id === "cypress-assertion-popup" ||
    [
      "assertion-type",
      "assertion-value",
      "save-assertion",
      "cancel-assertion",
      "close-assertion-popup",
    ].includes(e.target.id)
  ) {
    return;
  }

  debouncedRecordInput(e);
});

// ✅ Change event listener specifically for select elements
document.addEventListener("change", (e) => {
  if (!isRecording) return;

  const tagName = e.target.tagName.toLowerCase();

  // Only handle select elements in change event
  if (tagName === "select") {
    const selector = getBestSelector(e.target);
    const selectedValue = e.target.value;
    recordEvent("select", selector, selectedValue);
    console.log(`📋 Select recorded: ${selector} = ${selectedValue}`);
  }
});

// ✅ Double-click event listener for assertions
document.addEventListener("dblclick", (e) => {
  if (!isRecording) return;

  e.preventDefault();
  e.stopPropagation();

  const selector = getBestSelector(e.target);
  showAssertionPopup(selector, e.clientX, e.clientY);
});

// Create assertion popup
function showAssertionPopup(selector, x, y) {
  // Remove any existing popup
  const existingPopup = document.querySelector("#cypress-assertion-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "cypress-assertion-popup";
  popup.style.cssText = `
    position: fixed;
    top: ${Math.min(y + 10, window.innerHeight - 200)}px;
    left: ${Math.min(x + 10, window.innerWidth - 300)}px;
    width: 280px;
    background: white;
    border: 2px solid #007ACC;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
  `;

  popup.innerHTML = `
    <div style="margin-bottom: 10px;">
      <strong>Add Assertion</strong>
      <button id="close-assertion-popup" style="float: right; background: none; border: none; font-size: 16px; cursor: pointer;">&times;</button>
    </div>
    <div style="margin-bottom: 8px; font-size: 11px; color: #666; word-break: break-all;">
      Element: <code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${selector}</code>
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px;">Assertion Type:</label>
      <select id="assertion-type" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
        <option value="assertText">Text content assertion</option>
        <option value="assertValue">Input value assertion</option>
        <option value="should('be.visible')">Should be visible</option>
        <option value="should('be.disabled')">Should be disabled</option>
        <option value="should('be.enabled')">Should be enabled</option>
        <option value="should('be.checked')">Should be checked</option>
      </select>
    </div>
    <div id="assertion-value-container" style="margin-bottom: 10px; display: none;">
      <label style="display: block; margin-bottom: 5px;">Expected Value:</label>
      <input type="text" id="assertion-value" placeholder="Enter expected value" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="save-assertion" style="flex: 1; padding: 8px; background: #007ACC; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Assertion</button>
      <button id="cancel-assertion" style="flex: 1; padding: 8px; background: #ccc; color: black; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Handle assertion type change
  const assertionType = popup.querySelector("#assertion-type");
  const valueContainer = popup.querySelector("#assertion-value-container");
  const valueInput = popup.querySelector("#assertion-value");

  // Show input field by default since "assertText" is selected by default
  const initialValue = assertionType.value;
  if (initialValue === "assertText" || initialValue === "assertValue") {
    valueContainer.style.display = "block";
  }

  assertionType.addEventListener("change", () => {
    const selectedValue = assertionType.value;
    if (selectedValue === "assertText" || selectedValue === "assertValue") {
      valueContainer.style.display = "block";
      valueInput.focus();
    } else {
      valueContainer.style.display = "none";
    }
  });

  // Handle save assertion
  popup.querySelector("#save-assertion").addEventListener("click", () => {
    const assertionValue = valueInput.value;
    const selectedAssertion = assertionType.value;

    // Generate the correct action type based on selection
    if (selectedAssertion === "assertText") {
      if (assertionValue) {
        recordEvent("assertText", selector, assertionValue);
        console.log(
          `🔍 Text assertion added: ${selector} should contain "${assertionValue}"`
        );
      } else {
        alert("Please enter the expected text value");
        return;
      }
    } else if (selectedAssertion === "assertValue") {
      if (assertionValue) {
        recordEvent("assertValue", selector, assertionValue);
        console.log(
          `🔍 Value assertion added: ${selector} should have value "${assertionValue}"`
        );
      } else {
        alert("Please enter the expected input value");
        return;
      }
    } else {
      // For other assertions that don't need the new action types
      recordEvent("assert", selector, selectedAssertion);
      console.log(`🔍 Assertion added: ${selector}.${selectedAssertion}`);
    }

    popup.remove();
  });

  // Handle cancel/close
  popup
    .querySelector("#cancel-assertion")
    .addEventListener("click", () => popup.remove());
  popup
    .querySelector("#close-assertion-popup")
    .addEventListener("click", () => popup.remove());

  // Close on Escape key
  document.addEventListener("keydown", function escapeHandler(e) {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  });

  // Focus the select dropdown
  assertionType.focus();
}

// Selector preferences (with ID handling)
const selectorPreferences = [
  (el) =>
    el.getAttribute("data-cy")
      ? `[data-cy="${escapeAttr(el.getAttribute("data-cy"))}"]`
      : null,
  (el) =>
    el.getAttribute("data-test")
      ? `[data-test="${escapeAttr(el.getAttribute("data-test"))}"]`
      : null,
  (el) =>
    el.getAttribute("data-testid")
      ? `[data-testid="${escapeAttr(el.getAttribute("data-testid"))}"]`
      : null,
  (el) => {
    if (el.id) {
      const idSelector = `#${CSS.escape(el.id)}`;
      return document.querySelectorAll(idSelector).length === 1
        ? idSelector
        : null;
    }
    return null;
  },
  (el) =>
    el.getAttribute("aria-label")
      ? `[aria-label="${escapeAttr(el.getAttribute("aria-label"))}"]`
      : null,
];

// ✅ Best selector logic
function getBestSelector(el) {
  let selector = null;

  // 1. Try preferred strategies on the element
  for (const strategy of selectorPreferences) {
    selector = strategy(el);
    if (selector) break;
  }

  // 2. If no selector, check children for data-testid or ID
  if (!selector) {
    const childWithAttr = el.querySelector(
      "[data-testid], [data-cy], [data-test], [id]"
    );
    if (childWithAttr) {
      if (childWithAttr.id) {
        selector = `#${CSS.escape(childWithAttr.id)}`;
      } else {
        selector = `[data-testid="${childWithAttr.getAttribute(
          "data-testid"
        )}"]`;
      }
    }
  }

  // 3. If still no selector, fallback to CSS path
  if (!selector) {
    selector = buildCssPath(el);
  }

  // 4. Check uniqueness
  if (document.querySelectorAll(selector).length === 1) {
    return selector;
  }

  // 5. Traverse up for unique parent
  let parent = el.parentElement;
  while (parent) {
    for (const strategy of selectorPreferences) {
      const parentSelector = strategy(parent);
      if (
        parentSelector &&
        document.querySelectorAll(parentSelector).length === 1
      ) {
        const childTag = el.tagName.toLowerCase();
        return `${parentSelector} ${childTag}`;
      }
    }
    parent = parent.parentElement;
  }

  return selector; // fallback
}

// ✅ Fallback CSS path builder
function buildCssPath(el) {
  if (!el || el.nodeType !== 1) return "";
  let path = "";
  while (el && el.nodeType === 1 && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.parentNode) {
      const siblings = Array.from(el.parentNode.children).filter(
        (sib) => sib.nodeName === el.nodeName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    path = selector + (path ? " > " + path : "");
    el = el.parentElement;
  }
  return path;
}

function escapeAttr(value) {
  return value.replace(/"/g, '\\"'); // Escape quotes for CSS safety
}

// ✅ Chrome message listener
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START") {
    console.log("Content script received message:", msg.type);
    isRecording = true;
    steps = [];

    // Record the current URL as the first step
    const currentUrl = window.location.href;
    recordEvent("visit", "", currentUrl);
    console.log(`🌐 Recording started with URL: ${currentUrl}`);
  }
  if (msg.type === "STOP") {
    isRecording = false;
    console.log("⏹️ Recording stopped");
  }
  if (msg.type === "ASSERT_MODE") {
    isAssertionMode = true;
  }
});
