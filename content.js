// Cache storage value
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
const MAX_PASTE_ATTEMPTS = 5;

// Cache class names
const PARENT_CLASS = 'WVGVwZc0h0OScZ9YAaqM';
const TICKER_CLASS = 'siDxb5Gcy0nyxGjDtRQj';
const NAME_CLASS = 'fsYi35goS5HvMls5HBGU';

// Create style element
const style = document.createElement('style');
document.head.appendChild(style);

// Function to update highlight styles
function updateHighlightStyles(enabled) {
    style.textContent = enabled ? `
        .${NAME_CLASS} {
            background-color: #ffeb3b !important;
            transition: background-color 0.2s;
        }
        .${NAME_CLASS}:hover {
            background-color: #fdd835 !important;
            cursor: pointer;
        }
    ` : '';
}

// Initialize from storage
chrome.storage.local.get(['copyMode', 'highlightEnabled', 'autoPasteEnabled', 'autoCopyEnabled'], (settings) => {
    currentCopyMode = settings.copyMode || 'ticker';
    isHighlightEnabled = settings.highlightEnabled || false;
    isAutoPasteEnabled = settings.autoPasteEnabled ?? true;
    isAutoCopyEnabled = settings.autoCopyEnabled ?? true;
    updateHighlightStyles(isHighlightEnabled);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.copyMode) {
        currentCopyMode = changes.copyMode.newValue;
    }
    if (changes.highlightEnabled) {
        isHighlightEnabled = changes.highlightEnabled.newValue;
        updateHighlightStyles(isHighlightEnabled);
    }
    if (changes.autoPasteEnabled) {
        isAutoPasteEnabled = changes.autoPasteEnabled.newValue;
    }
    if (changes.autoCopyEnabled) {
        isAutoCopyEnabled = changes.autoCopyEnabled.newValue;
    }
});

// Optimized element text extraction
function getElementText(element) {
    if (!element) return null;

    const parent = element.classList.contains(PARENT_CLASS) ?
        element :
        element.closest(`.${PARENT_CLASS}`);

    if (!parent) return null;

    const targetClass = currentCopyMode === 'ticker' ? TICKER_CLASS : NAME_CLASS;
    const targetElement = parent.querySelector(`.${targetClass}`);

    return targetElement ? targetElement.textContent.trim() : null;
}

// Updated auto paste function
function autoPasteIntoSearch(text) {
    if (!isAutoPasteEnabled || !text || !isPastingActive) return;

    const searchSelectors = [
        '.c-autocomplete__input.js-autocomplete',
        'input.js-autocomplete',
        '.js-autocomplete'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
        searchInput = document.querySelector(selector);
        if (searchInput) break;
    }

    if (searchInput) {
        lastPastedText = text;
        searchInput.value = text;

        const events = [
            new Event('input', { bubbles: true }),
            new Event('change', { bubbles: true }),
            new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }),
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        ];

        events.forEach(event => searchInput.dispatchEvent(event));
        searchInput.focus();
        searchInput.setSelectionRange(text.length, text.length);
    } else {
        pasteAttempts++;
        if (pasteAttempts < MAX_PASTE_ATTEMPTS && isPastingActive) {
            setTimeout(() => autoPasteIntoSearch(text), 200);
        } else {
            pasteAttempts = 0;
        }
    }
}

// Add mutation observer
const observeSearchInput = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length && lastPastedText && isPastingActive) {
            autoPasteIntoSearch(lastPastedText);
        }
    }
});

// Start observing the document
observeSearchInput.observe(document.body, {
    childList: true,
    subtree: true
});

// Create tooltip
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

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Show tooltip function
function showTooltip(text, x, y) {
    tooltip.textContent = `Copied: ${text}`;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltip.style.display = 'block';
    setTimeout(() => tooltip.style.display = 'none', 1000);
}

// Handle mouse hover with debouncing - FIXED VERSION
document.addEventListener('mouseover', debounce(async (e) => {
    const text = getElementText(e.target);
    if (text && text !== lastHoveredText) {  // Removed isAutoCopyEnabled check from here
        lastHoveredText = text;
        try {
            if (isAutoCopyEnabled) {  // Moved check here
                await navigator.clipboard.writeText(text);
                chrome.storage.local.set({ lastCopied: text });
                showTooltip(text, e.clientX, e.clientY);
            }

            if (isAutoPasteEnabled) {
                if (currentPasteTimeout) {
                    clearTimeout(currentPasteTimeout);
                }
                pasteAttempts = 0;
                isPastingActive = true;
                autoPasteIntoSearch(text);
                currentPasteTimeout = setTimeout(() => {
                    isPastingActive = false;
                    pasteAttempts = 0;
                }, 5000);
            }
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }
}, 50));

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

// Cleanup function
function cleanup() {
    observeSearchInput.disconnect();
    if (currentPasteTimeout) {
        clearTimeout(currentPasteTimeout);
    }
}

// Listen for extension deactivation
chrome.runtime.onSuspend.addListener(cleanup);