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

function updateUI() {
  elements.lastCopied.textContent = currentState.lastCopied;
  elements.highlightToggle.checked = currentState.highlightEnabled;
  elements.autoPasteToggle.checked = currentState.autoPasteEnabled;
  elements.themeToggle.checked = currentState.darkMode;
  elements.autoCopyToggle.checked = currentState.autoCopyEnabled;
  elements.copyTicker.classList.toggle('active', currentState.copyMode === 'ticker');
  elements.copyName.classList.toggle('active', currentState.copyMode === 'name');
  document.body.classList.toggle('dark-theme', currentState.darkMode);
}

elements.copyTicker.addEventListener('click', () => {
  currentState.copyMode = 'ticker';
  chrome.storage.local.set({ copyMode: 'ticker' }, () => {
    updateUI();
  });
});

elements.copyName.addEventListener('click', () => {
  currentState.copyMode = 'name';
  chrome.storage.local.set({ copyMode: 'name' }, () => {
    updateUI();
  });
});

elements.highlightToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.highlightEnabled = isEnabled;
  chrome.storage.local.set({ highlightEnabled: isEnabled }, () => {
    chrome.storage.local.get(['highlightEnabled'], (result) => {
      currentState.highlightEnabled = result.highlightEnabled;
      updateUI();
    });
  });
});

elements.autoPasteToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.autoPasteEnabled = isEnabled;
  chrome.storage.local.set({ autoPasteEnabled: isEnabled }, () => {
    chrome.storage.local.get(['autoPasteEnabled'], (result) => {
      currentState.autoPasteEnabled = result.autoPasteEnabled;
      updateUI();
    });
  });
});

elements.themeToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.darkMode = isEnabled;
  chrome.storage.local.set({ darkMode: isEnabled }, () => {
    chrome.storage.local.get(['darkMode'], (result) => {
      currentState.darkMode = result.darkMode;
      updateUI();
    });
  });
});

elements.autoCopyToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  currentState.autoCopyEnabled = isEnabled;
  chrome.storage.local.set({ autoCopyEnabled: isEnabled }, () => {
    chrome.storage.local.get(['autoCopyEnabled'], (result) => {
      currentState.autoCopyEnabled = result.autoCopyEnabled;
      updateUI();
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(null, (result) => {
    currentState = {
      copyMode: result.copyMode || DEFAULT_STATE.copyMode,
      lastCopied: result.lastCopied || DEFAULT_STATE.lastCopied,
      highlightEnabled: typeof result.highlightEnabled !== 'undefined' ? result.highlightEnabled : DEFAULT_STATE.highlightEnabled,
      autoPasteEnabled: typeof result.autoPasteEnabled !== 'undefined' ? result.autoPasteEnabled : DEFAULT_STATE.autoPasteEnabled,
      darkMode: typeof result.darkMode !== 'undefined' ? result.darkMode : DEFAULT_STATE.darkMode,
      autoCopyEnabled: typeof result.autoCopyEnabled !== 'undefined' ? result.autoCopyEnabled : DEFAULT_STATE.autoCopyEnabled
    };
    updateUI();
  });
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.lastCopied) {
    currentState.lastCopied = request.lastCopied;
    chrome.storage.local.set({ lastCopied: request.lastCopied }, () => {
      elements.lastCopied.textContent = request.lastCopied;
    });
  }
});