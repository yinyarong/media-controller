// ── Media registry ────────────────────────────────────────────────────────────

const mediaRegistry = [];

function register(el) {
  if (!mediaRegistry.includes(el)) {
    mediaRegistry.push(el);
  }
}

// ── Deep scan (including Shadow DOM) ─────────────────────────────────────────

function deepQueryMediaElements(root) {
  const results = [];

  // Walk every element in this root; descend into shadow roots along the way.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;

  while (node) {
    if (node.nodeName === "VIDEO" || node.nodeName === "AUDIO") {
      results.push(node);
    }
    if (node.shadowRoot) {
      results.push(...deepQueryMediaElements(node.shadowRoot));
    }
    node = walker.nextNode();
  }

  return results;
}

function refreshRegistry() {
  deepQueryMediaElements(document).forEach(register);
}

// ── MutationObserver ──────────────────────────────────────────────────────────

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const added of mutation.addedNodes) {
      if (added.nodeType !== Node.ELEMENT_NODE) continue;

      // The added node itself might be a media element.
      if (added.nodeName === "VIDEO" || added.nodeName === "AUDIO") {
        register(added);
      }

      // Or it might contain / shadow-host media elements deeper down.
      deepQueryMediaElements(added).forEach(register);
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// ── State helpers ─────────────────────────────────────────────────────────────

function collectState() {
  return mediaRegistry.map((el, index) => ({
    index,
    tag: el.tagName.toLowerCase(),
    src: el.currentSrc || el.src || "",
    playbackRate: el.playbackRate,
    loop: el.loop,
  }));
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Always re-scan before responding so freshly injected elements are captured.
  refreshRegistry();

  if (message.type === "getMediaState") {
    sendResponse({ media: collectState() });
    return;
  }

  if (message.type === "setSpeed") {
    mediaRegistry.forEach((el) => {
      el.playbackRate = message.value;
    });
    sendResponse({ media: collectState() });
    return;
  }

  if (message.type === "setLoop") {
    mediaRegistry.forEach((el) => {
      el.loop = message.value;
    });
    sendResponse({ media: collectState() });
    return;
  }
});

// ── Initial scan ──────────────────────────────────────────────────────────────

refreshRegistry();
