console.log("Content script loaded successfully!");
let isRecording = false;
let steps = [];

function recordEvent(action, selector, value = "") {
  steps.push({ action, selector, value });
  chrome.storage.local.set({ recordedSteps: steps });
}

document.addEventListener("click", (e) => {
  if (isRecording) {
    const selector = getBestSelector(e.target);

    if (e.target.tagName.toLowerCase() === "select") {
      // Capture select action instead of click
      const selectedValue = e.target.value;
      recordEvent("select", selector, selectedValue);
    } else {
      recordEvent("click", selector);
    }
  }
});

document.addEventListener("input", (e) => {
  if (isRecording) {
    debouncedRecordInput(e);
  }
});

// Legacy fallback (still useful for XPath conversion)
function getSelector(el) {
  if (!el) return "";

  // 1. Prefer data-testid or data-cy
  if (el.getAttribute("data-testid")) {
    return `[data-testid='${el.getAttribute("data-testid")}']`;
  }
  if (el.getAttribute("data-cy")) {
    return `[data-cy='${el.getAttribute("data-cy")}']`;
  }

  // 2. Use ID if available
  if (el.id) {
    return `#${el.id}`;
  }

  // 3. Use name attribute
  if (el.getAttribute("name")) {
    return `[name='${el.getAttribute("name")}']`;
  }

  // 4. XPath fallback
  return convertXPathToCSS(getXPath(el));
}

function convertXPathToCSS(xpath) {
  return xpath
    .replace(/\/\//g, " ") // Replace // with space
    .replace(/\//g, " > ") // Replace / with >
    .replace(/\[@id="([^"]+)"\]/g, "#$1") // id
    .replace(/\[@class="([^"]+)"\]/g, ".$1") // class
    .replace(/\[@([^=]+)="([^"]+)"\]/g, '[$1="$2"]') // attributes
    .replace(/\[(\d+)\]/g, ":nth-child($1)"); // index
}

function getXPath(element) {
  if (element.id) return `//*[@id="${element.id}"]`;
  if (element === document.body) return "/html/body";

  let ix = 0;
  const siblings = element.parentNode ? element.parentNode.childNodes : [];
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling.nodeType === 1 && sibling.nodeName === element.nodeName) {
      ix++;
      if (sibling === element) {
        return (
          getXPath(element.parentNode) +
          "/" +
          element.nodeName.toLowerCase() +
          "[" +
          ix +
          "]"
        );
      }
    }
  }
}

// ✅ Updated selector preferences with ID handling
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

// ✅ Improved getBestSelector logic
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
        // Combine unique parent with child tag or attribute
        const childTag = el.tagName.toLowerCase();
        return `${parentSelector} ${childTag}`;
      }
    }
    parent = parent.parentElement;
  }

  return selector; // fallback
}

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

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedRecordInput = debounce((e) => {
  const selector = getBestSelector(e.target);
  recordEvent("type", selector, e.target.value);
}, 300); // 300ms delay

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START") {
    console.log("Content script received message:", msg.type);
    isRecording = true;
    steps = [];
  }
  if (msg.type === "STOP") {
    isRecording = false;
  }
});
