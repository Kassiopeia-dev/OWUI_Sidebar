// Ensure KnowledgeAPI is available
if (typeof window.KnowledgeAPI === 'undefined') {
    console.error('KnowledgeAPI not loaded. Waiting for OWUI_Knowledge_tools.js to load...');
}
// Function to adjust button font sizes to fit text without wrapping
function adjustButtonFontSizes() {
    const buttons = document.querySelectorAll('#attachWebpageBtn, #summarizePageBtn, #ragButton');
    
    buttons.forEach(button => {
        // Reset to default font size first
        button.style.fontSize = '13px';
        
        // Get the button's dimensions
        const buttonWidth = button.offsetWidth;
        const buttonPadding = 16; // 8px padding on each side
        const availableWidth = buttonWidth - buttonPadding;
        
        // Create a temporary span to measure text width
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.fontWeight = '500'; // Match button font weight
        tempSpan.textContent = button.textContent;
        document.body.appendChild(tempSpan);
        
        // Start with default font size and reduce if needed
        let fontSize = 13;
        tempSpan.style.fontSize = fontSize + 'px';
        
        // Reduce font size until text fits
        // Allow font size to go down to 5px minimum for very narrow buttons
        // Use smaller decrements for more precise fitting
        while (tempSpan.offsetWidth > availableWidth && fontSize > 5) {
            // Use smaller decrements as font gets smaller for better precision
            const decrement = fontSize > 10 ? 0.5 : 0.25;
            fontSize -= decrement;
            tempSpan.style.fontSize = fontSize + 'px';
        }
        
        // Apply the calculated font size
        button.style.fontSize = fontSize + 'px';
        
        // Clean up
        document.body.removeChild(tempSpan);
    });
}


// Helper function to format API URL
function formatApiUrl(url) {
    if (!url) return null;
    
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Ensure URL ends with /
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    
    return url;
}

// Show status message function (from old version)
function showStatusMessage(message, isError = false) {
    const messageDiv = document.getElementById('errorMessage');
    const messageText = messageDiv.querySelector('.message-text');
    const dismissButton = messageDiv.querySelector('.dismiss-button');
    
    // Clear any existing timeout
    if (messageDiv.hideTimeout) {
        clearTimeout(messageDiv.hideTimeout);
        messageDiv.hideTimeout = null;
    }
    
    messageText.textContent = message;
    messageDiv.style.display = 'block';
    dismissButton.style.display = 'none'; // Hide dismiss button as we're using timeouts
    
    if (isError) {
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
        // Show error messages for 10 seconds
        messageDiv.hideTimeout = setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 10000);
    } else {
        messageDiv.style.backgroundColor = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
        // Show success messages for 3 seconds
        messageDiv.hideTimeout = setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Update status icons based on which URL is active
function updateStatusIcons(urlSource) {
    const internalIcon = document.getElementById('internalIcon');
    const externalIcon = document.getElementById('externalIcon');
    
    if (internalIcon && externalIcon) {
        // Hide both icons first
        internalIcon.classList.remove('active');
        externalIcon.classList.remove('active');
        
        // Show the appropriate icon
        if (urlSource === 'internal') {
            internalIcon.classList.add('active');
        } else if (urlSource === 'external') {
            externalIcon.classList.add('active');
        }
    }
}

// Load the active URL into the iframe (determined by background script)
async function loadActiveUrl() {
    // First check if we have an active URL from the background script
    const localData = await chrome.storage.local.get(['activeUrl', 'activeUrlSource', 'lastUrlCheck']);
    
    if (localData.activeUrl && localData.activeUrl !== 'https://example.com') {
        // Use the active URL determined by background script
        console.log(`Loading active URL (${localData.activeUrlSource}):`, localData.activeUrl);
        const iframe = document.getElementById('sidebarFrame');
        iframe.src = localData.activeUrl;
        
        // Update status icons
        updateStatusIcons(localData.activeUrlSource);
        
        // Update status to show which URL is being used
        showStatusMessage(`Using ${localData.activeUrlSource} URL`);
    } else {
        // Fallback: request background script to determine active URL
        console.log('No active URL found, requesting check from background...');
        chrome.runtime.sendMessage({ action: 'recheckUrls' }, async (response) => {
            if (response && response.activeUrl && response.activeUrl !== 'https://example.com') {
                const iframe = document.getElementById('sidebarFrame');
                iframe.src = response.activeUrl;
                
                // Get the updated source from storage
                const updatedData = await chrome.storage.local.get(['activeUrlSource']);
                updateStatusIcons(updatedData.activeUrlSource);
            } else {
                // Final fallback: check if we have a saved internal URL
                chrome.storage.sync.get({
                    sidebarUrl: ''
                }, (items) => {
                    const iframe = document.getElementById('sidebarFrame');
                    
                    // If no URL is configured or it's the default example.com, show settings prompt
                    if (!items.sidebarUrl || items.sidebarUrl === 'https://example.com' || items.sidebarUrl === '') {
                        // Instead of using a data URL with postMessage, create the content directly in the iframe
                        // First set a blank page
                        iframe.src = 'about:blank';
                        
                        // Wait for iframe to load then write content directly
                        iframe.onload = function() {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            
                            const settingsPromptHtml = `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="UTF-8">
                                    <title>Configure OWUI Extension</title>
                                    <style>
                                        body {
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                            background: #1a1a1a;
                                            color: #ffffff;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            height: 100vh;
                                            margin: 0;
                                            padding: 20px;
                                            box-sizing: border-box;
                                        }
                                        .container {
                                            text-align: center;
                                            max-width: 400px;
                                        }
                                        h1 {
                                            font-size: 24px;
                                            margin-bottom: 20px;
                                            color: #ffffff;
                                        }
                                        p {
                                            font-size: 16px;
                                            line-height: 1.6;
                                            margin-bottom: 30px;
                                            color: #cccccc;
                                        }
                                        .settings-button {
                                            display: inline-block;
                                            padding: 12px 24px;
                                            background: #0066cc;
                                            color: white;
                                            text-decoration: none;
                                            border-radius: 6px;
                                            font-size: 16px;
                                            font-weight: 500;
                                            transition: background 0.2s;
                                            cursor: pointer;
                                            border: none;
                                        }
                                        .settings-button:hover {
                                            background: #0052a3;
                                        }
                                        .settings-button:active {
                                            background: #004080;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <h1>Welcome to OWUI Extension</h1>
                                        <p>Please configure your OWUI URL in the extension settings to get started.</p>
                                        <button class="settings-button" id="openSettingsBtn">
                                            Open Settings
                                        </button>
                                    </div>
                                </body>
                                </html>
                            `;
                            
                            doc.open();
                            doc.write(settingsPromptHtml);
                            doc.close();
                            
                            // Add click handler directly to the button in the iframe
                            const settingsBtn = doc.getElementById('openSettingsBtn');
                            if (settingsBtn) {
                                settingsBtn.addEventListener('click', function() {
                                    // Open the extension options page
                                    chrome.runtime.openOptionsPage();
                                });
                            }
                        };
                        
                        // Hide status icons since no URL is configured
                        updateStatusIcons(null);
                        
                        // Show a status message
                        showStatusMessage('Please configure OWUI URL in settings', true);
                    } else {
                        // Load the configured URL
                        iframe.src = items.sidebarUrl;
                        updateStatusIcons('internal');
                    }
                });
            }
        });
    }
}

// Helper function to check if URL is a PDF
function isPDFUrl(url) {
    if (!url) return false;
    // Check file extension
    if (url.toLowerCase().endsWith('.pdf')) return true;
    // Check common PDF URL patterns
    if (url.includes('/pdf/') || url.includes('?pdf=')) return true;
    return false;
}

// Helper function to check if URL is from YouTube
function isYouTubeUrl(url) {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        return hostname === 'youtube.com' ||
               hostname === 'www.youtube.com' ||
               hostname === 'm.youtube.com' ||
               hostname === 'youtu.be' ||
               hostname === 'www.youtu.be';
    } catch (e) {
        return false;
    }
}

// Handler for PDF files
async function handlePDFFile(activeTab, iframe, statusEl, shouldSummarize = false) {
    showStatusMessage('Processing PDF file...');
    console.log('Handling PDF file:', activeTab.url);
    
    try {
        // Extract filename from URL
        const fileName = activeTab.url.split('/').pop().split('?')[0] || 'document.pdf';
        
        showStatusMessage('Dropping PDF file...');
        
        // Method 1: Send message directly to the iframe content window
        // The content script in the iframe will handle fetching and dropping the PDF
        iframe.contentWindow.postMessage({
            action: 'dropPDFFromUrl',
            pdfUrl: activeTab.url,
            fileName: fileName,
            shouldSummarize: shouldSummarize
        }, '*');
        console.log('Sent PDF drop request to iframe:', fileName);
        
        // Method 2: Try to inject the content script and send message to all frames in all tabs
        // This ensures we reach the iframe even if it's nested
        chrome.tabs.query({}, async (tabs) => {
            for (const tab of tabs) {
                if (!tab.id) continue;
                
                try {
                    // Get all frames in this tab
                    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
                    
                    for (const frame of frames) {
                        // Skip if it's the main frame (frameId 0)
                        if (frame.frameId === 0) continue;
                        
                        // Try to send message to this frame
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'dropPDFFromUrl',
                            pdfUrl: activeTab.url,
                            fileName: fileName
                        }, { frameId: frame.frameId }, (response) => {
                            if (!chrome.runtime.lastError && response && response.success) {
                                console.log('PDF drop successful in frame:', frame.frameId, response);
                                showStatusMessage('PDF dropped successfully');
                            }
                        });
                    }
                } catch (err) {
                    // webNavigation might fail for some tabs, that's okay
                    console.log('Could not get frames for tab:', tab.id);
                }
            }
        });
        
        // Set a timeout to update status if no response is received
        setTimeout(() => {
            const messageDiv = document.getElementById('errorMessage');
            if (messageDiv.style.display === 'block' && messageDiv.querySelector('.message-text').textContent === 'Dropping PDF file...') {
                showStatusMessage('PDF drop initiated');
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error handling PDF:', error);
        showStatusMessage('Failed to process PDF', true);
    }
}

// Handler for YouTube videos - uses postMessage approach to avoid reload
async function handleYouTubeVideo(activeTab, iframe, statusEl, shouldSummarize = false) {
    showStatusMessage('Processing YouTube video...');
    console.log('Handling YouTube video:', activeTab.url);
    
    try {
        // Get the current YouTube URL
        const currentUrl = activeTab.url;
        
        console.log(`⚠️ METHOD: URL Parameter method - Loading YouTube URL via ?load-url parameter`);
        console.log(`🔄 Using ?load-url parameter approach for YouTube content`);
        
        // Get the base OWUI URL without any existing parameters
        const baseUrl = iframe.src.split('?')[0];
        
        // Encode the YouTube URL to safely pass it as a parameter
        const encodedYouTubeUrl = encodeURIComponent(currentUrl);
        
        // Build the new URL with the load-url parameter
        let newIframeUrl = `${baseUrl}?load-url=${encodedYouTubeUrl}`;
        
        // If summarize is requested, we might need to handle the prompt differently
        // For now, we'll just load the URL and note that summarization was requested
        if (shouldSummarize) {
            // Get settings from storage for summary prompt
            const summarySettings = await chrome.storage.sync.get({
                overridePrompt: false,
                customPrompt: '',
                summaryLanguage: 'en'
            });
            
            // Determine the prompt to use
            let promptText = '';
            if (summarySettings.overridePrompt && summarySettings.customPrompt) {
                promptText = summarySettings.customPrompt;
            } else {
                // Map language codes to language names
                const languageNames = {
                    'en': 'English',
                    'es': 'Spanish',
                    'fr': 'French',
                    'de': 'German',
                    'it': 'Italian',
                    'pt': 'Portuguese',
                    'ru': 'Russian',
                    'ja': 'Japanese',
                    'ko': 'Korean',
                    'zh': 'Chinese',
                    'ar': 'Arabic',
                    'hi': 'Hindi',
                    'nl': 'Dutch',
                    'sv': 'Swedish',
                    'pl': 'Polish'
                };
                const language = languageNames[summarySettings.summaryLanguage] || 'English';
                promptText = `Summarize this in ${language}`;
            }
            console.log(`📝 Prepared summarize prompt: ${promptText}`);
            
            // Note: OWUI may support additional parameters for prompts
            // If OWUI supports a prompt parameter, you could add it like:
            // newIframeUrl += `&prompt=${encodeURIComponent(promptText)}`;
        }
        
        // Load the YouTube URL into the iframe using the ?load-url parameter
        iframe.src = newIframeUrl;
        
        console.log(`✅ SUCCESS: URL Parameter method - YouTube URL loaded via ?load-url=${encodedYouTubeUrl}`);
        
        // Update status message
        const statusMessage = shouldSummarize ?
            'Loading YouTube content with summarize prompt...' :
            'Loading YouTube content...';
        showStatusMessage(statusMessage);
        
        // Clear status after a delay
        setTimeout(() => {
            const messageDiv = document.getElementById('errorMessage');
            if (messageDiv.style.display === 'block' && messageDiv.querySelector('.message-text').textContent === statusMessage) {
                showStatusMessage('YouTube content loaded');
            }
        }, 3000);
        
    } catch (error) {
        console.error('Error handling YouTube video:', error);
        showStatusMessage('Failed to process YouTube video', true);
    }
}

// Handler for regular webpages (existing logic)
async function handleRegularWebpage(activeTab, iframe, statusEl, shouldSummarize = false) {
    showStatusMessage('Extracting tab HTML...');
    console.log('Handling regular webpage:', activeTab.url);
    
    try {
        
        // Inject script to capture the current DOM state without images/media
        const results = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
                // Function to capture the page content with semantic HTML structure
                function capturePageState() {
                    // Get page metadata
                    const pageTitle = document.title || 'Untitled';
                    const pageUrl = window.location.href;
                    
                    // Try to find the main content area
                    let mainContent = null;
                    const contentSelectors = [
                        'main', 'article', '[role="main"]',
                        '.entry-content', '.post-content', '.content',
                        '.entry', '#content', '.blog-content'
                    ];
                    
                    for (const selector of contentSelectors) {
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim().length > 100) {
                            mainContent = element.cloneNode(true);
                            break;
                        }
                    }
                    
                    // Fallback to body if no content area found
                    if (!mainContent) {
                        mainContent = document.body.cloneNode(true);
                        // Remove navigation, headers, footers
                        ['header', 'nav', 'footer', 'aside', '.sidebar', '.menu'].forEach(sel => {
                            mainContent.querySelectorAll(sel).forEach(el => el.remove());
                        });
                    }
                    
                    // Clean the content - remove media elements
                    if (mainContent) {
                        const mediaSelectors = ['img', 'video', 'audio', 'iframe',
                                               'embed', 'object', 'canvas', 'svg',
                                               'picture', 'source'];
                        
                        mediaSelectors.forEach(selector => {
                            mainContent.querySelectorAll(selector).forEach(el => {
                                if (el.tagName === 'IMG' && el.alt) {
                                    const textNode = document.createTextNode(`[Image: ${el.alt}]`);
                                    el.parentNode?.replaceChild(textNode, el);
                                } else {
                                    el.remove();
                                }
                            });
                        });
                        
                        // Remove scripts and styles
                        mainContent.querySelectorAll('script, style, link').forEach(el => el.remove());
                    }
                    
                    // Create clean HTML with semantic structure
                    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        main { margin-top: 20px; }
        article { padding: 20px 0; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        a { color: #0066cc; }
        pre, code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <header>
        <h1>${pageTitle}</h1>
        <p>Source: <a href="${pageUrl}">${pageUrl}</a></p>
    </header>
    <main>
        <article>
            ${mainContent ? mainContent.innerHTML : '<p>No content extracted.</p>'}
        </article>
    </main>
</body>
</html>`;
                    
                    // IMPORTANT: Escape backslashes FIRST to prevent Unicode escape errors
                    // This prevents Python from interpreting \U, \u, \x as escape sequences
                    html = html.replace(/\\/g, '\\\\');
                    
                    // Clean problematic characters and entities
                    // Convert non-ASCII characters to HTML entities instead of removing them
                    html = html.replace(/[\u0080-\uFFFF]/g, function(match) {
                        return '&#' + match.charCodeAt(0) + ';';
                    });
                    
                    // Replace HTML entities
                    html = html.replace(/&#x?[0-9a-fA-F]+;/g, function(match) {
                        let num = match.includes('&#x') ?
                            parseInt(match.slice(3, -1), 16) :
                            parseInt(match.slice(2, -1), 10);
                        
                        if (num === 8217 || num === 0x2019) return "'";
                        if (num === 8216 || num === 0x2018) return "'";
                        if (num === 8220 || num === 0x201C) return '"';
                        if (num === 8221 || num === 0x201D) return '"';
                        if (num === 8211 || num === 0x2013) return "-";
                        if (num === 8212 || num === 0x2014) return "--";
                        if (num === 8230 || num === 0x2026) return "...";
                        if (num < 128) return String.fromCharCode(num);
                        return "";
                    });
                    
                    // Replace named entities
                    html = html.replace(/&[a-zA-Z]+;/g, function(match) {
                        const entities = {
                            '&amp;': '&', '&lt;': '<', '&gt;': '>',
                            '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
                            '&mdash;': '--', '&ndash;': '-',
                            '&rsquo;': "'", '&lsquo;': "'",
                            '&rdquo;': '"', '&ldquo;': '"',
                            '&hellip;': '...'
                        };
                        return entities[match] || "";
                    });
                    
                    // Clean up whitespace carefully
                    html = html.replace(/\n{3,}/g, '\n\n');  // Multiple blank lines to double
                    html = html.replace(/  +/g, ' ');  // Multiple spaces to single (preserves single spaces)
                    
                    // Add DOCTYPE and wrap in html tags if needed
                    if (!html.includes('<!DOCTYPE')) {
                        html = '<!DOCTYPE html>\n' + html;
                    }
                    if (!html.includes('<html')) {
                        html = html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n<html>') + '</html>';
                    }
                    
                    return html;
                }
                
                try {
                    const capturedHtml = capturePageState();
                    return {
                        html: capturedHtml,
                        title: document.title || 'webpage',
                        url: window.location.href
                    };
                } catch (error) {
                    console.error('Error capturing page state:', error);
                    // Fallback to simple outerHTML
                    return {
                        html: document.documentElement.outerHTML,
                        title: document.title || 'webpage',
                        url: window.location.href
                    };
                }
            }
        });
        
        if (!results || !results[0] || !results[0].result) {
            showStatusMessage('Failed to extract HTML', true);
            return;
        }
        
        const pageData = results[0].result;
        console.log(`Extracted HTML from ${pageData.url} (${pageData.html.length} chars)`);
        showStatusMessage('Dropping text file...');
        
        // Method 1: Try postMessage to the iframe with the HTML content (as text file)
        try {
            iframe.contentWindow.postMessage({
                action: 'runAttachWebpageAutomation',
                htmlContent: pageData.html,
                fileName: `${pageData.title.replace(/[^a-z0-9]/gi, '_')}.html`,
                sourceUrl: pageData.url,
                shouldSummarize: shouldSummarize
            }, '*');
            console.log('Sent postMessage to iframe with text content');
        } catch (e) {
            console.error('PostMessage error:', e);
        }
    } catch (error) {
        console.error('Error extracting HTML:', error);
        showStatusMessage('Error extracting HTML', true);
        return;
    }
}

// Main function to execute the file drop simulation
async function executeFileDropInIframe(shouldSummarize = false) {
    const iframe = document.getElementById('sidebarFrame');
    const statusEl = document.getElementById('status');
    
    if (!iframe.src || iframe.src === 'about:blank') {
        showStatusMessage('No tab loaded', true);
        return;
    }
    
    // Get the active tab
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
            showStatusMessage('No active tab found', true);
            return;
        }
        
        const url = activeTab.url;
        console.log('Processing URL:', url);
        
        // Store whether we should summarize after drop
        if (shouldSummarize) {
            // Store flag to trigger summary after successful drop
            await chrome.storage.local.set({ pendingSummary: true });
        }
        
        // Route based on URL type
        if (isPDFUrl(url)) {
            await handlePDFFile(activeTab, iframe, statusEl, shouldSummarize);
        } else if (isYouTubeUrl(url)) {
            await handleYouTubeVideo(activeTab, iframe, statusEl, shouldSummarize);
        } else {
            await handleRegularWebpage(activeTab, iframe, statusEl, shouldSummarize);
        }
        
    } catch (error) {
        console.error('Error in executeFileDropInIframe:', error);
        showStatusMessage('Error processing tab', true);
    }
    
    // Method 2: Send message to all tabs to find the right frame (with HTML content)
    chrome.tabs.query({}, async (tabs) => {
        console.log(`Found ${tabs.length} tabs`);
        
        // Get the HTML content again for the chrome.tabs.sendMessage approach
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let pageData = null;
        
        if (activeTab && activeTab.id) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: () => {
                        // Simplified version - same as first method
                        function capturePageState() {
                            // Get page metadata
                            const pageTitle = document.title || 'Untitled';
                            const pageUrl = window.location.href;
                            
                            // Try to find the main content area
                            let mainContent = null;
                            const contentSelectors = [
                                'main', 'article', '[role="main"]',
                                '.entry-content', '.post-content', '.content',
                                '.entry', '#content', '.blog-content'
                            ];
                            
                            for (const selector of contentSelectors) {
                                const element = document.querySelector(selector);
                                if (element && element.textContent.trim().length > 100) {
                                    mainContent = element.cloneNode(true);
                                    break;
                                }
                            }
                            
                            // Fallback to body if no content area found
                            if (!mainContent) {
                                mainContent = document.body.cloneNode(true);
                                // Remove navigation, headers, footers
                                ['header', 'nav', 'footer', 'aside', '.sidebar', '.menu'].forEach(sel => {
                                    mainContent.querySelectorAll(sel).forEach(el => el.remove());
                                });
                            }
                            
                            // Clean the content - remove media elements
                            if (mainContent) {
                                const mediaSelectors = ['img', 'video', 'audio', 'iframe',
                                                       'embed', 'object', 'canvas', 'svg',
                                                       'picture', 'source'];
                                
                                mediaSelectors.forEach(selector => {
                                    mainContent.querySelectorAll(selector).forEach(el => {
                                        if (el.tagName === 'IMG' && el.alt) {
                                            const textNode = document.createTextNode(`[Image: ${el.alt}]`);
                                            el.parentNode?.replaceChild(textNode, el);
                                        } else {
                                            el.remove();
                                        }
                                    });
                                });
                                
                                // Remove scripts and styles
                                mainContent.querySelectorAll('script, style, link').forEach(el => el.remove());
                            }
                            
                            // Create clean HTML with semantic structure
                            let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        main { margin-top: 20px; }
        article { padding: 20px 0; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        a { color: #0066cc; }
        pre, code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <header>
        <h1>${pageTitle}</h1>
        <p>Source: <a href="${pageUrl}">${pageUrl}</a></p>
    </header>
    <main>
        <article>
            ${mainContent ? mainContent.innerHTML : '<p>No content extracted.</p>'}
        </article>
    </main>
</body>
</html>`;
                            
                            // IMPORTANT: Escape backslashes FIRST to prevent Unicode escape errors
                            // This prevents Python from interpreting \U, \u, \x as escape sequences
                            html = html.replace(/\\/g, '\\\\');
                            
                            // Clean problematic characters inline (no external function)
                            // Convert non-ASCII characters to HTML entities instead of removing them
                            html = html.replace(/[\u0080-\uFFFF]/g, function(match) {
                                return '&#' + match.charCodeAt(0) + ';';
                            });
                            
                            // Replace HTML entities
                            html = html.replace(/&#x?[0-9a-fA-F]+;/g, function(match) {
                                let num = match.includes('&#x') ?
                                    parseInt(match.slice(3, -1), 16) :
                                    parseInt(match.slice(2, -1), 10);
                                
                                if (num === 8217 || num === 0x2019) return "'";
                                if (num === 8216 || num === 0x2018) return "'";
                                if (num === 8220 || num === 0x201C) return '"';
                                if (num === 8221 || num === 0x201D) return '"';
                                if (num === 8211 || num === 0x2013) return "-";
                                if (num === 8212 || num === 0x2014) return "--";
                                if (num === 8230 || num === 0x2026) return "...";
                                if (num < 128) return String.fromCharCode(num);
                                return "";
                            });
                            
                            // Replace named entities
                            html = html.replace(/&[a-zA-Z]+;/g, function(match) {
                                const entities = {
                                    '&amp;': '&', '&lt;': '<', '&gt;': '>',
                                    '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
                                    '&mdash;': '--', '&ndash;': '-',
                                    '&rsquo;': "'", '&lsquo;': "'",
                                    '&rdquo;': '"', '&ldquo;': '"',
                                    '&hellip;': '...'
                                };
                                return entities[match] || "";
                            });
                            
                            // Clean up whitespace carefully
                            html = html.replace(/\n{3,}/g, '\n\n');  // Multiple blank lines to double
                            html = html.replace(/  +/g, ' ');  // Multiple spaces to single (preserves single spaces)
                            
                            return html;
                        }
                        
                        try {
                            return {
                                html: capturePageState(),
                                title: document.title || 'webpage',
                                url: window.location.href
                            };
                        } catch (error) {
                            // Fallback: convert the outerHTML to safe ASCII if capture fails
                            let fallbackHtml = document.documentElement.outerHTML;
                            // Convert to safe ASCII
                            let cleanedFallback = '';
                            for (let i = 0; i < fallbackHtml.length; i++) {
                                const code = fallbackHtml.charCodeAt(i);
                                if (code >= 32 && code <= 126) {
                                    cleanedFallback += fallbackHtml[i];
                                } else if (code === 9 || code === 10 || code === 13) {
                                    cleanedFallback += fallbackHtml[i];
                                } else if (code >= 160) {
                                    cleanedFallback += `&#${code};`;
                                } else {
                                    cleanedFallback += ' ';
                                }
                            }
                            return {
                                html: cleanedFallback,
                                title: document.title || 'webpage',
                                url: window.location.href
                            };
                        }
                    }
                });
                
                if (results && results[0] && results[0].result) {
                    pageData = results[0].result;
                }
            } catch (err) {
                console.error('Error getting HTML for tabs.sendMessage:', err);
            }
        }
        
        for (const tab of tabs) {
            if (!tab.id) continue;
            
            // Send message to all frames in this tab with HTML content (as text file)
            const messageData = {
                action: 'executeAutomation',
                htmlContent: pageData?.html || '',
                fileName: pageData ? `${pageData.title.replace(/[^a-z0-9]/gi, '_')}.html` : 'webpage.html',
                sourceUrl: pageData?.url || ''
            };
            
            chrome.tabs.sendMessage(tab.id, messageData, { frameId: 0 }, (response) => {
                // Try main frame
                if (!chrome.runtime.lastError && response && response.success) {
                    console.log('Main frame responded:', response);
                    showStatusMessage('File dropped');
                }
            });
            
            // Also try all frames
            try {
                // Get all frames for this tab
                const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
                console.log(`Tab ${tab.id} has ${frames.length} frames`);
                
                for (const frame of frames) {
                    // Skip main frame (already tried)
                    if (frame.frameId === 0) continue;
                    
                    // Check if this might be our iframe
                    if (frame.url && (frame.url === iframe.src || iframe.src.includes(frame.url))) {
                        console.log(`Found matching frame: ${frame.url} (frameId: ${frame.frameId})`);
                        
                        // Send message to this specific frame with HTML content (as text file)
                        const messageData = {
                            action: 'executeAutomation',
                            htmlContent: pageData?.html || '',
                            fileName: pageData ? `${pageData.title.replace(/[^a-z0-9]/gi, '_')}.html` : 'webpage.html',
                            sourceUrl: pageData?.url || ''
                        };
                        
                        chrome.tabs.sendMessage(tab.id, messageData, { frameId: frame.frameId }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Frame message error:', chrome.runtime.lastError);
                            } else if (response) {
                                console.log('Frame responded:', response);
                                if (response.success) {
                                    showStatusMessage('File dropped');
                                } else {
                                    showStatusMessage(response.message || 'Check console', true);
                                }
                            }
                        });
                    }
                }
            } catch (err) {
                console.log('Error getting frames for tab', tab.id, ':', err);
            }
        }
    });
    
    // Set a timeout to update status if nothing happens
    setTimeout(() => {
        const messageDiv = document.getElementById('errorMessage');
        if (messageDiv.style.display === 'block' && messageDiv.querySelector('.message-text').textContent === 'Simulating file drop...') {
            showStatusMessage('Check console for results', true);
        }
    }, 2000);
}

// Function to submit summary prompt after file drop
async function submitSummaryPrompt() {
    const iframe = document.getElementById('sidebarFrame');
    const statusEl = document.getElementById('status');
    
    // Get settings from storage
    const settings = await chrome.storage.sync.get({
        overridePrompt: false,
        customPrompt: '',
        summaryLanguage: 'en'
    });
    
    // Determine the prompt to use
    let promptText = '';
    if (settings.overridePrompt && settings.customPrompt) {
        promptText = settings.customPrompt;
    } else {
        // Map language codes to language names
        const languageNames = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'pl': 'Polish'
        };
        const language = languageNames[settings.summaryLanguage] || 'English';
        promptText = `Summarize this in ${language}`;
    }
    
    console.log('Submitting summary prompt:', promptText);
    showStatusMessage('Submitting prompt...');
    
    // Send message to iframe to submit the prompt
    iframe.contentWindow.postMessage({
        action: 'submitPrompt',
        promptText: promptText
    }, '*');
    
    // Clear the pending summary flag
    await chrome.storage.local.remove('pendingSummary');
}

// Listen for messages from iframe
window.addEventListener('message', async (event) => {
    console.log('Received message from iframe:', event.data);
    const statusEl = document.getElementById('status');
    
    if (event.data && event.data.status) {
        if (event.data.status === 'success') {
            showStatusMessage(event.data.message);
            
            // Check if we should submit a summary prompt
            const { pendingSummary } = await chrome.storage.local.get('pendingSummary');
            if (pendingSummary && event.data.message.includes('dropped')) {
                // Submit prompt immediately - the content script will handle waiting for upload
                showStatusMessage('Waiting for upload to complete...');
                submitSummaryPrompt();
            }
        } else if (event.data.status === 'error') {
            showStatusMessage(event.data.message, true);
            // Clear pending summary on error
            await chrome.storage.local.remove('pendingSummary');
        }
    }
});

// Handle file upload to default collection
async function handleUploadToDefault(ragDropdown) {
    try {
        // Get the active URL from local storage (different from old version which used checkUrls)
        const localData = await chrome.storage.local.get(['activeUrl']);
        const activeUrl = localData.activeUrl;
        
        if (!activeUrl) {
            throw new Error('No active OWUI URL found. Please check your connection.');
        }
        
        // Get settings from storage
        const { owuiApiKey, knowledgeCollection, enableApiAccess } = await chrome.storage.sync.get({
            owuiApiKey: '',
            knowledgeCollection: '',
            enableApiAccess: false
        });

        // Validate settings
        if (!enableApiAccess) {
            throw new Error('API access is not enabled. Please enable it in the extension settings.');
        }
        if (!owuiApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }
        if (!knowledgeCollection) {
            throw new Error('No default knowledge collection selected. Please select one in the extension settings.');
        }

        // Close the RAG menu
        ragDropdown.classList.remove('show');

        // Create a new file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Handle file selection
        fileInput.onchange = async (e) => {
            if (!e.target.files.length) {
                document.body.removeChild(fileInput);
                return;
            }
            
            const file = e.target.files[0];
            try {
                // Validate file before upload
                console.log('Selected file:', {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                });
                
                if (file.size === 0) {
                    throw new Error('The selected file is empty. Please choose a file with content.');
                }
                
                // Try to read a small portion of the file to verify it's readable
                const reader = new FileReader();
                const readPromise = new Promise((resolve, reject) => {
                    reader.onload = () => {
                        console.log('File preview (first 100 chars):', reader.result.substring(0, 100));
                        resolve();
                    };
                    reader.onerror = () => reject(new Error('Failed to read file'));
                });
                reader.readAsText(file.slice(0, 1000)); // Read first 1KB
                await readPromise;
                
                showStatusMessage(`Uploading ${file.name}...`);
                
                // Upload the file using the KnowledgeAPI from OWUI_Knowledge_tools.js
                const uploadResult = await window.KnowledgeAPI.uploadFile(activeUrl, owuiApiKey, file);
                
                console.log('Upload result:', uploadResult);
                
                if (!uploadResult || !uploadResult.id) {
                    throw new Error('Failed to upload file - no file ID received');
                }
                
                // Add a small delay to ensure file is processed on server
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                showStatusMessage('Adding to knowledge collection...');
                
                console.log('Adding file to knowledge:', {
                    fileId: uploadResult.id,
                    knowledgeCollection: knowledgeCollection
                });
                
                // Add file to knowledge collection
                await window.KnowledgeAPI.addFileToKnowledge(activeUrl, owuiApiKey, knowledgeCollection, uploadResult.id);
                
                showStatusMessage('File uploaded to knowledge collection successfully!');
            } catch (error) {
                console.error('Upload failed:', error);
                showStatusMessage(error.message || 'Upload failed', true);
            } finally {
                // Clean up the file input
                document.body.removeChild(fileInput);
            }
        };
        
        // Trigger file selection
        fileInput.click();
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage(error.message, true);
    }
}

// Extract page content and return as File object
async function extractPageAsFile() {
    // Get the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) {
        throw new Error('No active tab found');
    }
    
    const url = activeTab.url;
    console.log('Extracting page content from:', url);
    
    // Check if it's a YouTube URL and reject it
    if (isYouTubeUrl(url)) {
        throw new Error('YouTube videos cannot be uploaded to knowledge collections. Please use a regular tab or document.');
    }
    
    if (isPDFUrl(url)) {
        throw new Error('PDF files should be uploaded using the file selector.');
    }
    
    // Extract HTML content from the page
    const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
            // Function to capture the page content with semantic HTML structure
            function capturePageState() {
                // Get page metadata
                const pageTitle = document.title || 'Untitled';
                const pageUrl = window.location.href;
                
                // Try to find the main content area
                let mainContent = null;
                const contentSelectors = [
                    'main', 'article', '[role="main"]',
                    '.entry-content', '.post-content', '.content',
                    '.entry', '#content', '.blog-content'
                ];
                
                for (const selector of contentSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim().length > 100) {
                        mainContent = element.cloneNode(true);
                        break;
                    }
                }
                
                // Fallback to body if no content area found
                if (!mainContent) {
                    mainContent = document.body.cloneNode(true);
                    // Remove navigation, headers, footers
                    ['header', 'nav', 'footer', 'aside', '.sidebar', '.menu'].forEach(sel => {
                        mainContent.querySelectorAll(sel).forEach(el => el.remove());
                    });
                }
                
                // Clean the content - remove media elements
                if (mainContent) {
                    const mediaSelectors = ['img', 'video', 'audio', 'iframe',
                                           'embed', 'object', 'canvas', 'svg',
                                           'picture', 'source'];
                    
                    mediaSelectors.forEach(selector => {
                        mainContent.querySelectorAll(selector).forEach(el => {
                            if (el.tagName === 'IMG' && el.alt) {
                                const textNode = document.createTextNode(`[Image: ${el.alt}]`);
                                el.parentNode?.replaceChild(textNode, el);
                            } else {
                                el.remove();
                            }
                        });
                    });
                    
                    // Remove scripts and styles
                    mainContent.querySelectorAll('script, style, link').forEach(el => el.remove());
                }
                
                // Create clean HTML with semantic structure
                let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        main { margin-top: 20px; }
        article { padding: 20px 0; }
        h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin: 1em 0; }
        a { color: #0066cc; }
        pre, code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <header>
        <h1>${pageTitle}</h1>
        <p>Source: <a href="${pageUrl}">${pageUrl}</a></p>
    </header>
    <main>
        <article>
            ${mainContent ? mainContent.innerHTML : '<p>No content extracted.</p>'}
        </article>
    </main>
</body>
</html>`;
                
                // Clean problematic characters and entities
                html = html.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII
                
                // Replace HTML entities
                html = html.replace(/&#x?[0-9a-fA-F]+;/g, function(match) {
                    let num = match.includes('&#x') ?
                        parseInt(match.slice(3, -1), 16) :
                        parseInt(match.slice(2, -1), 10);
                    
                    if (num === 8217 || num === 0x2019) return "'";
                    if (num === 8216 || num === 0x2018) return "'";
                    if (num === 8220 || num === 0x201C) return '"';
                    if (num === 8221 || num === 0x201D) return '"';
                    if (num === 8211 || num === 0x2013) return "-";
                    if (num === 8212 || num === 0x2014) return "--";
                    if (num === 8230 || num === 0x2026) return "...";
                    if (num < 128) return String.fromCharCode(num);
                    return "";
                });
                
                // Replace named entities
                html = html.replace(/&[a-zA-Z]+;/g, function(match) {
                    const entities = {
                        '&amp;': '&', '&lt;': '<', '&gt;': '>',
                        '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
                        '&mdash;': '--', '&ndash;': '-',
                        '&rsquo;': "'", '&lsquo;': "'",
                        '&rdquo;': '"', '&ldquo;': '"',
                        '&hellip;': '...'
                    };
                    return entities[match] || "";
                });
                
                // Clean up whitespace carefully
                html = html.replace(/\n{3,}/g, '\n\n');
                html = html.replace(/  +/g, ' ');
                
                return html;
            }
            
            try {
                const capturedHtml = capturePageState();
                return {
                    html: capturedHtml,
                    title: document.title || 'webpage',
                    url: window.location.href
                };
            } catch (error) {
                console.error('Error capturing page state:', error);
                // Fallback to simple outerHTML
                return {
                    html: document.documentElement.outerHTML,
                    title: document.title || 'webpage',
                    url: window.location.href
                };
            }
        }
    });
    
    if (!results || !results[0] || !results[0].result) {
        throw new Error('Failed to extract page content');
    }
    
    const pageData = results[0].result;
    console.log(`Extracted HTML from ${pageData.url} (${pageData.html.length} chars)`);
    
    // Create a File object from the extracted HTML
    const fileName = `${pageData.title.replace(/[^a-z0-9]/gi, '_')}.html`;
    const blob = new Blob([pageData.html], { type: 'text/html' });
    const file = new File([blob], fileName, { type: 'text/html' });
    
    console.log('Created file for upload:', {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    return file;
}

// Handle upload page content to default collection
async function handleUploadPageToDefault(ragDropdown) {
    try {
        // Get the active URL from local storage
        const localData = await chrome.storage.local.get(['activeUrl']);
        const activeUrl = localData.activeUrl;
        
        if (!activeUrl) {
            throw new Error('No active OWUI URL found. Please check your connection.');
        }
        
        // Get settings from storage
        const { owuiApiKey, knowledgeCollection, enableApiAccess } = await chrome.storage.sync.get({
            owuiApiKey: '',
            knowledgeCollection: '',
            enableApiAccess: false
        });

        // Validate settings
        if (!enableApiAccess) {
            throw new Error('API access is not enabled. Please enable it in the extension settings.');
        }
        if (!owuiApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }
        if (!knowledgeCollection) {
            throw new Error('No default knowledge collection selected. Please select one in the extension settings.');
        }

        // Close the RAG menu
        ragDropdown.classList.remove('show');
        
        showStatusMessage('Extracting tab content...');
        
        // Extract page as file
        const file = await extractPageAsFile();
        
        showStatusMessage(`Uploading ${file.name}...`);
        
        // Upload the file using the KnowledgeAPI
        const uploadResult = await window.KnowledgeAPI.uploadFile(activeUrl, owuiApiKey, file);
        
        console.log('Upload result:', uploadResult);
        
        if (!uploadResult || !uploadResult.id) {
            throw new Error('Failed to upload tab content - no file ID received');
        }
        
        // Add a small delay to ensure file is processed on server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showStatusMessage('Adding to default knowledge collection...');
        
        console.log('Adding file to knowledge:', {
            fileId: uploadResult.id,
            knowledgeCollection: knowledgeCollection
        });
        
        // Add file to knowledge collection
        await window.KnowledgeAPI.addFileToKnowledge(activeUrl, owuiApiKey, knowledgeCollection, uploadResult.id);
        
        showStatusMessage('Tab uploaded to default knowledge collection successfully!');
        
    } catch (error) {
        console.error('Upload page failed:', error);
        showStatusMessage(error.message || 'Failed to upload tab', true);
    }
}

// Handle upload to specific collection with modal UI
async function handleUploadToSpecific(ragDropdown) {
    try {
        // Get the active URL from local storage
        const localData = await chrome.storage.local.get(['activeUrl']);
        const activeUrl = localData.activeUrl;
        
        if (!activeUrl) {
            throw new Error('No active OWUI URL found. Please check your connection.');
        }
        
        // Get settings from storage
        const { owuiApiKey, enableApiAccess } = await chrome.storage.sync.get({
            owuiApiKey: '',
            enableApiAccess: false
        });

        // Validate settings
        if (!enableApiAccess) {
            throw new Error('API access is not enabled. Please enable it in the extension settings.');
        }
        if (!owuiApiKey) {
            throw new Error('API key not found. Please set it in the extension settings.');
        }

        // Close the RAG menu
        ragDropdown.classList.remove('show');
        
        // Show the modal
        const modal = document.getElementById('uploadModal');
        const collectionSelect = document.getElementById('collectionSelect');
        const fileInput = document.getElementById('fileInput');
        const confirmButton = document.getElementById('confirmUpload');
        const cancelButton = document.getElementById('cancelUpload');
        const modalStatus = document.getElementById('modalStatus');
        const selectedFileName = document.getElementById('selectedFileName');
        
        // Reset modal state
        modal.style.display = 'flex';
        collectionSelect.innerHTML = '<option value="">Loading collections...</option>';
        collectionSelect.disabled = true;
        fileInput.value = '';
        selectedFileName.textContent = '';
        confirmButton.disabled = true;
        modalStatus.style.display = 'none';
        
        // Enable upload button when collection is selected and either file or page is chosen
        const checkEnableUpload = () => {
            const hasCollection = collectionSelect.value;
            const hasFile = fileInput.files.length > 0;
            const hasPage = uploadPageCheckbox.checked;
            confirmButton.disabled = !(hasCollection && (hasFile || hasPage));
        };
        
        // Load collections
        try {
            // Check if KnowledgeAPI is available
            if (!window.KnowledgeAPI || typeof window.KnowledgeAPI.getListKnowledge !== 'function') {
                throw new Error('Knowledge API not loaded. Please refresh the extension.');
            }
            
            const collections = await window.KnowledgeAPI.getListKnowledge(activeUrl, owuiApiKey);
            
            if (!collections || collections.length === 0) {
                throw new Error('No knowledge collections found. Please create one first.');
            }
            
            // Get the last used collection from storage
            const storedData = await chrome.storage.local.get(['lastUsedCollectionId']);
            const lastUsedCollectionId = storedData.lastUsedCollectionId;
            
            // Populate dropdown
            collectionSelect.innerHTML = '<option value="">-- Select a collection --</option>';
            collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                option.dataset.collectionName = collection.name;
                collectionSelect.appendChild(option);
            });
            collectionSelect.disabled = false;
            
            // Pre-select the last used collection if it exists
            if (lastUsedCollectionId) {
                const optionToSelect = Array.from(collectionSelect.options).find(
                    option => option.value === lastUsedCollectionId
                );
                if (optionToSelect) {
                    collectionSelect.value = lastUsedCollectionId;
                    // Trigger the change event to enable the upload button if needed
                    checkEnableUpload();
                }
            }
            
        } catch (error) {
            modalStatus.style.display = 'block';
            modalStatus.style.backgroundColor = '#f8d7da';
            modalStatus.style.color = '#721c24';
            modalStatus.textContent = 'Error loading collections: ' + error.message;
            collectionSelect.innerHTML = '<option value="">Error loading collections</option>';
        }
        
        // Handle upload page checkbox
        uploadPageCheckbox.onchange = async () => {
            if (uploadPageCheckbox.checked) {
                // Disable file input and show current page info
                fileInput.disabled = true;
                fileInput.value = '';
                
                try {
                    // Get current tab info to show what will be uploaded
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (activeTab) {
                        const title = activeTab.title || 'Current Tab';
                        selectedFileName.textContent = `Will upload: ${title}`;
                    }
                } catch (err) {
                    selectedFileName.textContent = 'Will upload current tab content';
                }
            } else {
                // Enable file input and clear page info
                fileInput.disabled = false;
                selectedFileName.textContent = '';
            }
            checkEnableUpload();
        };
        
        // Handle collection selection
        collectionSelect.onchange = checkEnableUpload;
        
        // Handle file selection
        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                selectedFileName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            } else if (!uploadPageCheckbox.checked) {
                selectedFileName.textContent = '';
            }
            checkEnableUpload();
        };
        
        // Handle upload confirmation
        confirmButton.onclick = async () => {
            const selectedCollectionId = collectionSelect.value;
            const selectedCollectionName = collectionSelect.options[collectionSelect.selectedIndex].dataset.collectionName;
            const isUploadingPage = uploadPageCheckbox.checked;
            
            if (!selectedCollectionId) {
                return;
            }
            
            // Disable controls during upload
            collectionSelect.disabled = true;
            fileInput.disabled = true;
            uploadPageCheckbox.disabled = true;
            confirmButton.disabled = true;
            cancelButton.disabled = true;
            
            try {
                let file;
                
                if (isUploadingPage) {
                    // Extract current page as file
                    modalStatus.style.display = 'block';
                    modalStatus.style.backgroundColor = '#d4edda';
                    modalStatus.style.color = '#155724';
                    modalStatus.textContent = 'Extracting tab content...';
                    
                    file = await extractPageAsFile();
                } else {
                    // Use selected file
                    file = fileInput.files[0];
                    if (!file) {
                        throw new Error('No file selected');
                    }
                    
                    // Validate file
                    if (file.size === 0) {
                        throw new Error('The selected file is empty. Please choose a file with content.');
                    }
                }
                
                modalStatus.style.display = 'block';
                modalStatus.style.backgroundColor = '#d4edda';
                modalStatus.style.color = '#155724';
                modalStatus.textContent = `Uploading ${file.name}...`;
                
                // Upload the file
                const uploadResult = await window.KnowledgeAPI.uploadFile(activeUrl, owuiApiKey, file);
                
                if (!uploadResult || !uploadResult.id) {
                    throw new Error('Failed to upload file - no file ID received');
                }
                
                // Add a small delay to ensure file is processed on server
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                modalStatus.textContent = `Adding to ${selectedCollectionName}...`;
                
                // Add file to selected knowledge collection
                await window.KnowledgeAPI.addFileToKnowledge(activeUrl, owuiApiKey, selectedCollectionId, uploadResult.id);
                
                // Store the last used collection ID
                await chrome.storage.local.set({
                    lastUsedCollectionId: selectedCollectionId
                });
                
                modalStatus.textContent = `File uploaded to ${selectedCollectionName} successfully!`;
                
                // Close modal after success
                setTimeout(() => {
                    modal.style.display = 'none';
                    showStatusMessage(`File uploaded to ${selectedCollectionName} successfully!`);
                }, 2000);
                
            } catch (error) {
                console.error('Upload failed:', error);
                modalStatus.style.display = 'block';
                modalStatus.style.backgroundColor = '#f8d7da';
                modalStatus.style.color = '#721c24';
                modalStatus.textContent = 'Upload failed: ' + (error.message || 'Unknown error');
                
                // Re-enable controls on error
                collectionSelect.disabled = false;
                fileInput.disabled = !uploadPageCheckbox.checked;
                uploadPageCheckbox.disabled = false;
                confirmButton.disabled = false;
                cancelButton.disabled = false;
            }
        };
        
        // Handle cancel
        cancelButton.onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
        
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage(error.message, true);
    }
}

// Handle manage collections
async function handleManageCollections(ragDropdown) {
    // Close the dropdown
    ragDropdown.classList.remove('show');
    
    // Open the options page to the knowledge section
    chrome.runtime.openOptionsPage();
    
    showStatusMessage('Opening settings...');
}

// Handle RAG dropdown actions
function handleRagAction(action, ragDropdown) {
    switch (action) {
        case 'uploadPageDefault':
            handleUploadPageToDefault(ragDropdown);
            break;
        case 'uploadDefault':
            handleUploadToDefault(ragDropdown);
            break;
        case 'uploadTo':
            handleUploadToSpecific(ragDropdown);
            break;
        case 'manageKnowledge':
            handleManageCollections(ragDropdown);
            break;
    }
}

// Function to check and update RAG button visibility
async function updateRagButtonVisibility() {
    const ragButtonContainer = document.querySelector('.rag-button-container');
    
    if (ragButtonContainer) {
        // Get API key from storage
        const { owuiApiKey, enableApiAccess } = await chrome.storage.sync.get({
            owuiApiKey: '',
            enableApiAccess: false
        });
        
        // Show RAG button only if API access is enabled and API key exists
        if (enableApiAccess && owuiApiKey && owuiApiKey.trim() !== '') {
            ragButtonContainer.style.display = 'block';
        } else {
            ragButtonContainer.style.display = 'none';
        }
        
        // Adjust font sizes after visibility change
        setTimeout(adjustButtonFontSizes, 10);
    }
}

// Load URL when the panel opens
document.addEventListener('DOMContentLoaded', async () => {
    // Load the active URL immediately (no recheck on every open)
    await loadActiveUrl();
    
    // Check and update RAG button visibility
    await updateRagButtonVisibility();
    
    // Adjust button font sizes to fit text
    adjustButtonFontSizes();
    
    // Re-adjust font sizes when window is resized
    window.addEventListener('resize', adjustButtonFontSizes);
    
    // Message listener removed - we now handle settings button directly in the iframe
    
    // Set up button click handlers
    const attachBtn = document.getElementById('attachWebpageBtn');
    if (attachBtn) {
        attachBtn.addEventListener('click', () => executeFileDropInIframe(false));
    }
    
    const summarizeBtn = document.getElementById('summarizePageBtn');
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', () => executeFileDropInIframe(true));
    }
    
    // Setup RAG dropdown
    const ragButton = document.getElementById('ragButton');
    const ragDropdown = document.getElementById('ragDropdown');
    
    if (ragButton && ragDropdown) {
        // Toggle dropdown on RAG button click
        ragButton.addEventListener('click', (e) => {
            e.stopPropagation();
            ragDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!ragDropdown.contains(e.target) && !ragButton.contains(e.target)) {
                ragDropdown.classList.remove('show');
            }
        });
        
        // Handle dropdown item clicks
        document.getElementById('uploadPageDefault')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleRagAction('uploadPageDefault', ragDropdown);
        });
        
        document.getElementById('uploadDefault')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleRagAction('uploadDefault', ragDropdown);
        });
        
        document.getElementById('uploadTo')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleRagAction('uploadTo', ragDropdown);
        });
        
        document.getElementById('manageKnowledge')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleRagAction('manageKnowledge', ragDropdown);
        });
    }
    
    // Wait for iframe to load
    const iframe = document.getElementById('sidebarFrame');
    iframe.addEventListener('load', () => {
        showStatusMessage('Ready');
        
        // Log that iframe has loaded
        console.log('Iframe loaded:', iframe.src);
    });
});

// Listen for changes in storage (both sync and local)
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.activeUrl) {
        // Active URL has been updated by background script
        const iframe = document.getElementById('sidebarFrame');
        const newUrl = changes.activeUrl.newValue;
        
        // Only update if URL actually changed
        if (iframe.src !== newUrl) {
            console.log('Active URL changed, updating iframe:', newUrl);
            iframe.src = newUrl;
            
            // Show which URL is being used
            const source = changes.activeUrlSource?.newValue || 'updated';
            showStatusMessage(`Switched to ${source} URL`);
            
            // Update status icons
            updateStatusIcons(source);
        }
    } else if (namespace === 'sync') {
        // Check if API key or enableApiAccess changed
        if (changes.owuiApiKey || changes.enableApiAccess) {
            // Update RAG button visibility when API settings change
            await updateRagButtonVisibility();
        }
        
        // Handle URL changes
        if (changes.sidebarUrl || changes.externalUrl) {
            // Settings have been updated, request recheck
            console.log('Settings changed, requesting URL recheck...');
            chrome.runtime.sendMessage({ action: 'recheckUrls' }, async (response) => {
                if (response && response.activeUrl) {
                    const iframe = document.getElementById('sidebarFrame');
                    // Directly update the iframe with the new URL
                    if (iframe.src !== response.activeUrl) {
                        console.log('Updating iframe with new active URL:', response.activeUrl);
                        iframe.src = response.activeUrl;
                        updateStatusIcons(response.activeUrlSource);
                        showStatusMessage(`Settings saved - using ${response.activeUrlSource} URL`);
                    }
                } else {
                    // Fallback to loadActiveUrl if response doesn't include URL
                    await loadActiveUrl();
                }
            });
        }
    }
});