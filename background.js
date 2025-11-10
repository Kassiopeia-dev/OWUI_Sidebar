// Background service worker to handle messages and script injection

// Check if a URL is reachable
async function checkUrlReachability(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.log(`URL ${url} is not reachable:`, error.message);
        return false;
    }
}

// Determine which URL to use based on availability
async function determineActiveUrl() {
    const settings = await chrome.storage.sync.get(['sidebarUrl', 'externalUrl']);
    
    // Don't set a default URL if nothing is configured
    let activeUrl = null;
    let urlSource = null;
    
    // First try internal URL
    if (settings.sidebarUrl && settings.sidebarUrl !== '' && settings.sidebarUrl !== 'https://example.com') {
        console.log('Checking internal URL:', settings.sidebarUrl);
        const isInternalReachable = await checkUrlReachability(settings.sidebarUrl);
        
        if (isInternalReachable) {
            console.log('Internal URL is reachable, using it');
            activeUrl = settings.sidebarUrl;
            urlSource = 'internal';
        } else if (settings.externalUrl && settings.externalUrl !== '') {
            console.log('Internal URL not reachable, checking external URL:', settings.externalUrl);
            const isExternalReachable = await checkUrlReachability(settings.externalUrl);
            
            if (isExternalReachable) {
                console.log('External URL is reachable, using it');
                activeUrl = settings.externalUrl;
                urlSource = 'external';
            } else {
                console.log('Neither URL is reachable, defaulting to internal URL');
                activeUrl = settings.sidebarUrl;
                urlSource = 'internal';
            }
        } else {
            // Internal URL not reachable and no external URL
            console.log('Internal URL not reachable, no external URL configured');
            activeUrl = settings.sidebarUrl;
            urlSource = 'internal';
        }
    } else if (settings.externalUrl && settings.externalUrl !== '') {
        // No internal URL set, try external
        console.log('No internal URL set, checking external URL:', settings.externalUrl);
        const isExternalReachable = await checkUrlReachability(settings.externalUrl);
        
        if (isExternalReachable) {
            console.log('External URL is reachable, using it');
            activeUrl = settings.externalUrl;
            urlSource = 'external';
        } else {
            console.log('External URL not reachable');
            activeUrl = settings.externalUrl;
            urlSource = 'external';
        }
    } else {
        // No URLs configured at all
        console.log('No URLs configured, will show setup prompt');
        activeUrl = null;
        urlSource = null;
    }
    
    // Store the active URL for use throughout the extension (or clear it if none)
    if (activeUrl) {
        await chrome.storage.local.set({
            activeUrl: activeUrl,
            activeUrlSource: urlSource,
            lastUrlCheck: Date.now()
        });
        console.log(`Active URL set to: ${activeUrl} (source: ${urlSource})`);
    } else {
        // Clear any existing active URL
        await chrome.storage.local.remove(['activeUrl', 'activeUrlSource']);
        console.log('No active URL - user needs to configure settings');
    }
    
    return activeUrl;
}

// Check URLs on extension startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension starting up, determining active URL...');
    await determineActiveUrl();
});

// Check URLs on installation/update
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed/updated, determining active URL...');
    await determineActiveUrl();
    
    // Also set up initial check for first-time setup
    const settings = await chrome.storage.sync.get(['sidebarUrl', 'externalUrl']);
    if (!settings.sidebarUrl && !settings.externalUrl) {
        console.log('No URLs configured yet, waiting for initial setup...');
    }
});

// Listen for messages from the sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'executeAttachWebpage') {
        // This can be used for future enhancements
        sendResponse({ success: true, message: 'Background received message' });
    } else if (request.action === 'recheckUrls') {
        // Allow manual recheck of URLs
        determineActiveUrl().then(async activeUrl => {
            // Get the source information from storage
            const localData = await chrome.storage.local.get(['activeUrlSource']);
            sendResponse({
                success: true,
                activeUrl: activeUrl,
                activeUrlSource: localData.activeUrlSource
            });
        });
        return true; // Keep channel open for async response
    } else if (request.action === 'getUrlStatus') {
        // Get current URL status without rechecking
        chrome.storage.local.get(['activeUrl', 'activeUrlSource'], (data) => {
            sendResponse({
                success: true,
                activeUrl: data.activeUrl,
                activeUrlSource: data.activeUrlSource
            });
        });
        return true; // Keep channel open for async response
    }
    return true; // Keep message channel open for async responses
});

// Listen for storage changes to update active URL when settings are saved
chrome.storage.onChanged.addListener(async (changes, areaName) => {
    // Only listen to sync storage changes (where settings are stored)
    if (areaName === 'sync') {
        // Check if URL settings have changed
        if (changes.sidebarUrl || changes.externalUrl) {
            console.log('URL settings changed, rechecking active URL...');
            
            // Check if this is the first time URLs are being set
            const oldSidebarUrl = changes.sidebarUrl?.oldValue;
            const oldExternalUrl = changes.externalUrl?.oldValue;
            const isFirstTimeSetup = (!oldSidebarUrl && !oldExternalUrl) &&
                                     (changes.sidebarUrl?.newValue || changes.externalUrl?.newValue);
            
            if (isFirstTimeSetup) {
                console.log('First time URL setup detected');
            }
            
            // Determine the new active URL immediately
            const activeUrl = await determineActiveUrl();
            
            // Get the URL source for status display
            const localData = await chrome.storage.local.get(['activeUrlSource']);
            
            console.log(`Active URL updated to: ${activeUrl} (source: ${localData.activeUrlSource})`);
            
            // Notify any open sidepanels to reload with the new URL
            // This is redundant with the storage listener in sidepanel.js but ensures immediate update
            chrome.runtime.sendMessage({
                action: 'urlSettingsChanged',
                newUrl: activeUrl,
                urlSource: localData.activeUrlSource
            }).catch(() => {
                // Ignore errors if no listeners
                console.log('No sidepanel listeners found');
            });
            
            // Also try to send to all tabs in case sidepanel is open
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'urlSettingsChanged',
                            newUrl: activeUrl,
                            urlSource: localData.activeUrlSource
                        }).catch(() => {
                            // Ignore errors for tabs without content scripts
                        });
                    }
                });
            });
        }
    }
});

// Also check when browser action is clicked or side panel is opened
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error('Failed to set panel behavior:', error);
});