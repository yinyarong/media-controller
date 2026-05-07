const statusEl = document.getElementById("status");
const loopToggle = document.getElementById("loop-toggle");
const loopState = document.getElementById("loop-state");
const speedButtons = document.querySelectorAll(".speed-btn");
const controls = document.querySelectorAll(".speed-btn, #loop-toggle");

let pollInterval = null;

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

async function send(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

function setControlsEnabled(enabled) {
  controls.forEach((el) => {
    el.disabled = !enabled;
  });
}

function highlightSpeed(rate) {
  speedButtons.forEach((btn) => {
    btn.classList.toggle("active", parseFloat(btn.dataset.speed) === rate);
  });
}

function reflectLoop(isLoop) {
  loopToggle.checked = isLoop;
  loopState.textContent = isLoop ? "On" : "Off";
  loopState.classList.toggle("on", isLoop);
}

function applyState(media) {
  const count = media.length;

  if (count === 0) {
    return false; // caller decides what to show when empty
  }

  statusEl.textContent = `${count} media element${count > 1 ? "s" : ""} found`;
  statusEl.classList.remove("scanning");
  setControlsEnabled(true);

  const first = media[0];
  highlightSpeed(first.playbackRate);
  reflectLoop(first.loop);
  return true;
}

function stopPolling() {
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function startPolling(tabId) {
  statusEl.textContent = "Scanning for media…";
  statusEl.classList.add("scanning");
  setControlsEnabled(false);

  pollInterval = setInterval(async () => {
    const res = await send(tabId, { type: "getMediaState" });
    const found = applyState(res?.media ?? []);
    if (found) stopPolling();
  }, 1000);
}

// ── Init ─────────────────────────────────────────────────────

(async () => {
  const tabId = await getActiveTabId();
  if (!tabId) {
    statusEl.textContent = "Unable to access this tab";
    setControlsEnabled(false);
    return;
  }

  const response = await send(tabId, { type: "getMediaState" });
  const media = response?.media ?? [];
  const found = applyState(media);

  if (!found) {
    // Nothing yet — poll until something appears.
    startPolling(tabId);
  } else {
    // Media found immediately; do one late refresh to catch stragglers.
    setTimeout(async () => {
      const res = await send(tabId, { type: "getMediaState" });
      if (res?.media?.length) applyState(res.media);
    }, 1500);
  }

  // ── Speed buttons ────────────────────────────────────────────

  speedButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = parseFloat(btn.dataset.speed);
      const res = await send(tabId, { type: "setSpeed", value });
      if (res?.media) highlightSpeed(value);
    });
  });

  // ── Loop toggle ──────────────────────────────────────────────

  loopToggle.addEventListener("change", async () => {
    const value = loopToggle.checked;
    const res = await send(tabId, { type: "setLoop", value });
    if (res?.media) reflectLoop(value);
  });
})();

// ── Cleanup ──────────────────────────────────────────────────

window.addEventListener("unload", stopPolling);
