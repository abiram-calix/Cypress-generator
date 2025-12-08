console.log("Content script loaded successfully!");
let isRecording = false;
let isAssertionMode = false;
let steps = [];

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

// ✅ Debounced input recording
const debouncedRecordInput = debounce((e) => {
  const selector = getBestSelector(e.target);
  recordEvent("type", selector, e.target.value);
}, 300);

// ✅ Click event listener
document.addEventListener("click", (e) => {
  if (!isRecording) return;

  const tagName = e.target.tagName.toLowerCase();

  // Handle <select> elements
  if (tagName === "select") {
    const selector = getBestSelector(e.target);
    const selectedValue = e.target.value;
    recordEvent("select", selector, selectedValue);
    return;
  }

  // Handle date picker day buttons
  if (e.target.closest('[role="gridcell"]') && tagName === "button") {
    const dayText = e.target.textContent.trim();
    if (dayText) {
      // Use dialog as parent selector for uniqueness
      recordEvent("select-date", '[role="dialog"]', dayText);
      return;
    }
  }

  // Default click behaviour
  const selector = getBestSelector(e.target);
  recordEvent("click", selector);
});

// ✅ Input event listener
document.addEventListener("input", (e) => {
  if (isRecording) {
    debouncedRecordInput(e);
  }
});

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
  }
  if (msg.type === "STOP") {
    isRecording = false;
  }
  if (msg.type === "ASSERT_MODE") {
    isAssertionMode = true;
  }
});

// for assert mode
document.addEventListener("click", (e) => {
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

  if (isRecording) {
    const selector = getBestSelector(e.target);
    recordEvent("click", selector);
  }
});
