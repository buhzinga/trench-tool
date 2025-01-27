const DEFAULT_STATE = Object.freeze({
  copyMode: 'ticker',
  lastCopied: 'None',
  highlightEnabled: false,
  autoPasteEnabled: true,
  darkMode: false,
  autoCopyEnabled: true
});

let currentState = { ...DEFAULT_STATE };

const elements = {
  copyTicker: document.getElementById('copyTicker'),
  copyName: document.getElementById('copyName'),
  lastCopied: document.getElementById('lastCopied'),
  highlightToggle: document.getElementById('highlightToggle'),
  autoPasteToggle: document.getElementById('autoPasteToggle'),
  themeToggle: document.getElementById('themeToggle'),
  autoCopyToggle: document.getElementById('autoCopyToggle')
};

// Apply theme state immediately
function applyThemeState(isDarkMode) {
  document.documentElement.classList.toggle('dark-theme', isDarkMode);
  document.body.classList.toggle('dark-theme', isDarkMode);
  elements.themeToggle.checked = isDarkMode;
}

// Update UI with current state
function updateUI() {
  elements.lastCopied.textContent = currentState.lastCopied;
  elements.highlightToggle.checked = currentState.highlightEnabled;
  elements.autoPasteToggle.checked = currentState.autoPasteEnabled;
  elements.autoCopyToggle.checked = currentState.autoCopyEnabled;
  elements.copyTicker.classList.toggle('active', currentState.copyMode === 'ticker');
  elements.copyName.classList.toggle('active', currentState.copyMode === 'name');
  applyThemeState(currentState.darkMode);
}

// Initialize state on load
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(null, (result) => {
    // Apply theme immediately before other state updates
    const savedDarkMode = typeof result.darkMode !== 'undefined' ? result.darkMode : DEFAULT_STATE.darkMode;
    applyThemeState(savedDarkMode);

    currentState = {
      copyMode: result.copyMode || DEFAULT_STATE.copyMode,
      lastCopied: result.lastCopied || DEFAULT_STATE.lastCopied,
      highlightEnabled: typeof result.highlightEnabled !== 'undefined' ? result.highlightEnabled : DEFAULT_STATE.highlightEnabled,
      autoPasteEnabled: typeof result.autoPasteEnabled !== 'undefined' ? result.autoPasteEnabled : DEFAULT_STATE.autoPasteEnabled,
      darkMode: savedDarkMode,
      autoCopyEnabled: typeof result.autoCopyEnabled !== 'undefined' ? result.autoCopyEnabled : DEFAULT_STATE.autoCopyEnabled
    };

    updateUI();

    // Add a small delay to enable transitions after the UI is fully loaded
    setTimeout(() => {
      document.body.classList.add('initialized');
    }, 50);
  });
});

elements.copyTicker.addEventListener('click', () => {
  currentState.copyMode = 'ticker';
  chrome.storage.local.set({ copyMode: 'ticker' }, updateUI);
});

elements.copyName.addEventListener('click', () => {
  currentState.copyMode = 'name';
  chrome.storage.local.set({ copyMode: 'name' }, updateUI);
});

elements.highlightToggle.addEventListener('change', (e) => {
  currentState.highlightEnabled = e.target.checked;
  chrome.storage.local.set({ highlightEnabled: e.target.checked }, updateUI);
});

elements.autoPasteToggle.addEventListener('change', (e) => {
  currentState.autoPasteEnabled = e.target.checked;
  chrome.storage.local.set({ autoPasteEnabled: e.target.checked }, updateUI);
});

elements.themeToggle.addEventListener('change', (e) => {
  const isDarkMode = e.target.checked;
  currentState.darkMode = isDarkMode;
  applyThemeState(isDarkMode);
  chrome.storage.local.set({ darkMode: isDarkMode });
});

elements.autoCopyToggle.addEventListener('change', (e) => {
  currentState.autoCopyEnabled = e.target.checked;
  chrome.storage.local.set({ autoCopyEnabled: e.target.checked }, updateUI);
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.lastCopied) {
    currentState.lastCopied = request.lastCopied;
    chrome.storage.local.set({ lastCopied: request.lastCopied }, () => {
      elements.lastCopied.textContent = request.lastCopied;
    });
  }
});