// Cache storage values
let currentCopyMode = 'ticker';
let lastHoveredText = '';
let lastPastedText = '';
let isSearchBoxFocused = false;
let isHighlightEnabled = false;
let isAutoPasteEnabled = true;
let isAutoCopyEnabled = true;
let activeSearchInput = null;
let pasteAttempts = 0;
let currentPasteTimeout = null;
let isPastingActive = false;
const MAX_PASTE_ATTEMPTS = 3; // Reduced from 5 to 3 for faster retries

// Constants for class names
const CLASSES = {
    NAME: 'fsYi35goS5HvMls5HBGU',
    PARENT: 'U3jLlAVrk5kIsp1eeF9L',
    TICKER: 'siDxb5Gcy0nyxGjDtRQj',
};

// Create and append style element
const style = document.createElement('style');
document.head.appendChild(style);

// Update highlight styles based on mode
function updateHighlightStyles(enabled) {
    if (!enabled) {
        style.textContent = '';
        return;
    }

    const highlightClass = currentCopyMode === 'ticker' ? CLASSES.TICKER : CLASSES.NAME;
    style.textContent = `
        .${highlightClass} {
            background-color: #ffeb3b !important;
            transition: background-color 0.2s;
        }
        .${highlightClass}:hover {
            background-color: #fdd835 !important;
            cursor: pointer;
        }
    `;
}

// Initialize settings from storage
chrome.storage.local.get(['copyMode', 'highlightEnabled', 'autoPasteEnabled', 'autoCopyEnabled'], (settings) => {
    currentCopyMode = settings.copyMode || 'ticker';
    isHighlightEnabled = settings.highlightEnabled || false;
    isAutoPasteEnabled = settings.autoPasteEnabled ?? true;
    isAutoCopyEnabled = settings.autoCopyEnabled ?? true;
    updateHighlightStyles(isHighlightEnabled);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.copyMode) currentCopyMode = changes.copyMode.newValue;
    if (changes.highlightEnabled) isHighlightEnabled = changes.highlightEnabled.newValue;
    if (changes.autoCopyEnabled) isAutoCopyEnabled = changes.autoCopyEnabled.newValue;
    if (changes.autoPasteEnabled) isAutoPasteEnabled = changes.autoPasteEnabled.newValue;

    updateHighlightStyles(isHighlightEnabled);

    if (!isAutoCopyEnabled) {
        lastHoveredText = '';
        isPastingActive = false;
    }
    if (!isAutoPasteEnabled) {
        lastPastedText = '';
        isPastingActive = false;
        pasteAttempts = 0;
        clearTimeout(currentPasteTimeout);
    }
});

// Get text from element based on mode
function getElementText(element) {
    if (!element || !isAutoCopyEnabled) return null;

    const nameElement = element.classList.contains(CLASSES.NAME) ? element : element.closest(`.${CLASSES.NAME}`);
    if (!nameElement) return null;

    const parent = nameElement.closest(`.${CLASSES.PARENT}`);
    if (!parent) return null;

    if (currentCopyMode === 'name') return nameElement.textContent;

    if (currentCopyMode === 'ticker') {
        const tickerElement = parent.querySelector(`.${CLASSES.TICKER}`);
        return tickerElement ? tickerElement.textContent.trim().toUpperCase() : null;
    }

    return null;
}

// Auto-paste text into search input
function autoPasteIntoSearch(text) {
    if (!isAutoPasteEnabled || !text || !isPastingActive) return;

    const searchInput = document.querySelector('.c-autocomplete__input.js-autocomplete, input.js-autocomplete, .js-autocomplete');
    if (searchInput) {
        lastPastedText = text;
        searchInput.value = text;

        const events = ['input', 'change', 'keyup', 'keydown'].map(event =>
            new KeyboardEvent(event, { key: 'Enter', bubbles: true })
        );
        events.forEach(event => searchInput.dispatchEvent(event));

        searchInput.focus();
        searchInput.setSelectionRange(text.length, text.length);
    } else if (pasteAttempts < MAX_PASTE_ATTEMPTS && isPastingActive) {
        pasteAttempts++;
        setTimeout(() => autoPasteIntoSearch(text), 100); // Reduced delay from 200ms to 100ms
    } else {
        pasteAttempts = 0;
    }
}

// Mutation observer for search input
const observeSearchInput = new MutationObserver((mutations) => {
    if (lastPastedText && isPastingActive) {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) autoPasteIntoSearch(lastPastedText);
        });
    }
});

observeSearchInput.observe(document.body, { childList: true, subtree: true });

// Tooltip element
const tooltip = document.createElement('div');
tooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    display: none;
`;
document.body.appendChild(tooltip);

// Show tooltip
function showTooltip(text, x, y) {
    tooltip.textContent = `Copied: ${text}`;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltip.style.display = 'block';
    setTimeout(() => tooltip.style.display = 'none', 1000);
}

// Debounced mouseover handler
document.addEventListener('mouseover', debounce(async (e) => {
    if (!isAutoCopyEnabled) return;

    const text = getElementText(e.target);
    if (text && text !== lastHoveredText) {
        lastHoveredText = text;
        try {
            await navigator.clipboard.writeText(text);
            chrome.storage.local.set({ lastCopied: text });
            showTooltip(text, e.clientX, e.clientY);

            if (isAutoPasteEnabled) {
                clearTimeout(currentPasteTimeout);
                pasteAttempts = 0;
                isPastingActive = true;
                autoPasteIntoSearch(text);
                currentPasteTimeout = setTimeout(() => {
                    isPastingActive = false;
                    pasteAttempts = 0;
                }, 1250);
            }
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }
}, 30)); // Reduced debounce delay from 50ms to 30ms

// Track focused search input
document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('js-autocomplete')) {
        isSearchBoxFocused = true;
        activeSearchInput = e.target;
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('js-autocomplete')) {
        isSearchBoxFocused = false;
        activeSearchInput = null;
    }
});

// Cleanup on extension deactivation
window.addEventListener('unload', () => {
    observeSearchInput.disconnect();
    clearTimeout(currentPasteTimeout);
});

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}