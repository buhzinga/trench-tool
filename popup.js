const DEFAULT_STATE = Object.freeze({
  copyMode: 'ticker',
  lastCopied: 'None',
  highlightEnabled: false,
  autoPasteEnabled: true,
  darkMode: false
});

let currentState = { ...DEFAULT_STATE };

// Cache DOM elements
const elements = {
  copyTicker: document.getElementById('copyTicker'),
  copyName: document.getElementById('copyName'),
  lastCopied: document.getElementById('lastCopied'),
  highlightToggle: document.getElementById('highlightToggle'),
  autoPasteToggle: document.getElementById('autoPasteToggle'),
  themeToggle: document.getElementById('themeToggle')
};

// Update UI based on current state
function updateUI() {
  elements.lastCopied.textContent = currentState.lastCopied;
  elements.highlightToggle.checked = currentState.highlightEnabled;
  elements.autoPasteToggle.checked = currentState.autoPasteEnabled;
  elements.themeToggle.checked = currentState.darkMode;
  elements.copyTicker.classList.toggle('active', currentState.copyMode === 'ticker');
  elements.copyName.classList.toggle('active', currentState.copyMode === 'name');
  document.body.classList.toggle('dark-theme', currentState.darkMode);
}

// Event Listeners
elements.copyTicker.addEventListener('click', () => {
  currentState.copyMode = 'ticker';
  chrome.storage.local.set({ copyMode: 'ticker' });
  updateUI();
});

elements.copyName.addEventListener('click', () => {
  currentState.copyMode = 'name';
  chrome.storage.local.set({ copyMode: 'name' });
  updateUI();
});

// Fixed highlight toggle
elements.highlightToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.highlightEnabled = isEnabled;
  chrome.storage.local.set({ highlightEnabled: isEnabled }, () => {
    updateUI();
  });
});

// Fixed auto paste toggle
elements.autoPasteToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.autoPasteEnabled = isEnabled;
  chrome.storage.local.set({ autoPasteEnabled: isEnabled }, () => {
    updateUI();
  });
});

elements.themeToggle.addEventListener('change', (e) => {
  currentState.darkMode = e.target.checked;
  chrome.storage.local.set({ darkMode: e.target.checked });
  updateUI();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request) => {
  if (request.lastCopied) {
    currentState.lastCopied = request.lastCopied;
    elements.lastCopied.textContent = request.lastCopied;
    chrome.storage.local.set({ lastCopied: request.lastCopied });
  }
});

// Initialize state from storage
chrome.storage.local.get(Object.keys(DEFAULT_STATE), (result) => {
  currentState = { ...DEFAULT_STATE, ...result };
  updateUI();
});