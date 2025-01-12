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

// Update CLASSES constant (keep existing classes)
const CLASSES = {
    NAME: 'fsYi35goS5HvMls5HBGU',
    PARENT: 'U3jLlAVrk5kIsp1eeF9L',
    TICKER: 'siDxb5Gcy0nyxGjDtRQj',
};

// Create style element
const style = document.createElement('style');
document.head.appendChild(style);

// Update highlight styles function
function updateHighlightStyles(enabled) {
    if (!enabled) {
        style.textContent = '';
        return;
    }

    // Dynamic class selection based on mode
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

// Initialize from storage
chrome.storage.local.get(['copyMode', 'highlightEnabled', 'autoPasteEnabled', 'autoCopyEnabled'], (settings) => {
    currentCopyMode = settings.copyMode || 'ticker';
    isHighlightEnabled = settings.highlightEnabled || false;
    isAutoPasteEnabled = settings.autoPasteEnabled ?? true;
    isAutoCopyEnabled = settings.autoCopyEnabled ?? true;
    updateHighlightStyles(isHighlightEnabled);
});

// Update storage listener to handle all settings changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.copyMode) {
        currentCopyMode = changes.copyMode.newValue;
        updateHighlightStyles(isHighlightEnabled);
    }
    if (changes.highlightEnabled) {
        isHighlightEnabled = changes.highlightEnabled.newValue;
        updateHighlightStyles(isHighlightEnabled);
    }
    if (changes.autoCopyEnabled) {
        isAutoCopyEnabled = changes.autoCopyEnabled.newValue;
        // Reset hover state when disabled
        if (!isAutoCopyEnabled) {
            lastHoveredText = '';
            isPastingActive = false;
        }
    }
    if (changes.autoPasteEnabled) {
        isAutoPasteEnabled = changes.autoPasteEnabled.newValue;
        // Reset paste state when disabled
        if (!isAutoPasteEnabled) {
            lastPastedText = '';
            isPastingActive = false;
            pasteAttempts = 0;
            if (currentPasteTimeout) {
                clearTimeout(currentPasteTimeout);
            }
        }
    }
});

// Update getElementText function to handle uppercase tickers
function getElementText(element) {
    if (!element || !isAutoCopyEnabled) {
        console.log('Debug: No element or auto-copy disabled');
        return null;
    }

    // Only use name element as entry point
    const nameElement = element.classList.contains(CLASSES.NAME) ?
        element :
        element.closest(`.${CLASSES.NAME}`);

    if (!nameElement) {
        console.log('Debug: No name element found');
        return null;
    }

    // Find parent row that contains both name and ticker
    const parent = nameElement.closest(`.${CLASSES.PARENT}`);
    if (!parent) {
        console.log('Debug: No parent row found');
        return null;
    }

    // For name mode - use name exactly as displayed
    if (currentCopyMode === 'name') {
        const text = nameElement.textContent;  // Remove trim() to preserve exact text
        console.log('Debug: Name mode - found:', text);
        return text;
    }

    // For ticker mode - find associated ticker and convert to uppercase
    if (currentCopyMode === 'ticker') {
        const tickerElement = parent.querySelector(`.${CLASSES.TICKER}`);
        if (tickerElement) {
            const text = tickerElement.textContent.trim().toUpperCase();
            console.log('Debug: Ticker mode - found:', text);
            return text;
        }
    }

    console.log('Debug: No matching text found');
    return null;
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

// Handle mouse hover with debouncing
document.addEventListener('mouseover', debounce(async (e) => {
    if (!isAutoCopyEnabled) return;  // Early return if auto-copy is OFF

    const text = getElementText(e.target);
    if (text && text !== lastHoveredText) {
        lastHoveredText = text;
        try {
            await navigator.clipboard.writeText(text);
            chrome.storage.local.set({ lastCopied: text });
            showTooltip(text, e.clientX, e.clientY);

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