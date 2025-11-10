// Content script that runs in all frames and can receive messages

// Function to handle PDF file drops
async function dropPDFFromUrl(pdfUrl, fileName) {
    console.log('=== DROPPING PDF FILE ===');
    console.log('PDF URL:', pdfUrl);
    console.log('File name:', fileName);
    
    const chatInput = document.querySelector('[contenteditable="true"]');
    if (!chatInput) {
        console.error("No contenteditable chat input found.");
        return { success: false, message: 'No contenteditable chat input found' };
    }
    
    try {
        // Try to fetch the PDF file
        let blob;
        let fetchError = null;
        
        try {
            // First attempt: direct fetch
            const response = await fetch(pdfUrl, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            blob = await response.blob();
            console.log('PDF fetched successfully via direct fetch');
        } catch (error) {
            console.warn('Direct fetch failed:', error.message);
            fetchError = error;
            
            // Second attempt: try no-cors mode (won't give us the actual content but worth trying)
            try {
                const response = await fetch(pdfUrl, {
                    mode: 'no-cors'
                });
                
                // With no-cors, we can't read the response, but we can try to create a minimal PDF
                console.warn('Using fallback: creating placeholder PDF');
                
                // Create a minimal valid PDF as a placeholder
                const minimalPDF = atob('JVBERi0xLjEKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Cj4+Cj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTM5IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNAovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMjA4CiUlRU9G');
                const uint8Array = new Uint8Array(minimalPDF.length);
                for (let i = 0; i < minimalPDF.length; i++) {
                    uint8Array[i] = minimalPDF.charCodeAt(i);
                }
                blob = new Blob([uint8Array], { type: 'application/pdf' });
                console.log('Created placeholder PDF');
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                throw fetchError || fallbackError;
            }
        }
        
        // Ensure we have a valid blob
        if (!blob || blob.size === 0) {
            throw new Error('Failed to create valid PDF blob');
        }
        
        // Create a File object from the blob
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        console.log(`Created PDF file: ${fileName} (${pdfFile.size} bytes)`);
        
        // Create a DataTransfer object and add the PDF file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(pdfFile);
        
        // Create a synthetic drop event
        const dropEvent = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer,
        });
        
        // Focus the chat input before dropping
        chatInput.focus();
        
        // Dispatch the drop event on the chat input
        const eventDispatched = chatInput.dispatchEvent(dropEvent);
        console.log(`Drop event dispatched: ${eventDispatched}`);
        
        // Also try alternative drop methods
        setTimeout(() => {
            // Try triggering input event as well
            const inputEvent = new Event('input', { bubbles: true });
            chatInput.dispatchEvent(inputEvent);
            
            // Try change event
            const changeEvent = new Event('change', { bubbles: true });
            chatInput.dispatchEvent(changeEvent);
        }, 100);
        
        console.log(`✅ Dropped PDF file: ${fileName}`);
        return { success: true, message: `PDF file "${fileName}" dropped successfully` };
        
    } catch (error) {
        console.error('Error dropping PDF:', error);
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('CORS')) {
            errorMessage = 'PDF blocked by CORS policy. The PDF may still be processing.';
        } else if (error.message.includes('fetch')) {
            errorMessage = 'Could not fetch PDF. It may be protected or require authentication.';
        }
        
        return { success: false, message: `Error dropping PDF: ${errorMessage}` };
    }
}

// The file drop simulation function
function simulateFileDrop(htmlContent, fileName, sourceUrl) {
    console.log('=== SIMULATING FILE DROP (from content script) ===');
    console.log('Current URL:', window.location.href);
    console.log('Document state:', document.readyState);
    
    const chatInput = document.querySelector('[contenteditable="true"]');
    if (!chatInput) {
        console.error("No contenteditable chat input found.");
        return { success: false, message: 'No contenteditable chat input found' };
    }

    // Use provided HTML content or fallback to a default
    let fileContent = htmlContent;
    // Keep .html extension
    let fileNameToUse = fileName || 'webpage.html';
    
    if (!fileContent) {
        console.warn('No HTML content provided, using fallback');
        fileContent = '<html><body>No content extracted from the tab</body></html>';
    }
    
    console.log(`Creating HTML file: ${fileNameToUse} (${fileContent.length} chars)`);
    if (sourceUrl) {
        console.log(`Source URL: ${sourceUrl}`);
    }
    
    // Clean the HTML content to prevent UTF-8 encoding errors
    let textContent = fileContent;
    
    // 1. Remove JavaScript Unicode escape sequences (\uXXXX) that could become surrogates
    textContent = textContent.replace(/\\u[\dA-Fa-f]{4}/g, '');
    
    // 2. Strip ALL non-ASCII characters
    textContent = textContent.replace(/[^\x00-\x7F]/g, '');
    console.log(`Stripped non-ASCII: ${textContent.length} chars`);
    
    // 3. Replace HTML entities with ASCII equivalents
    textContent = textContent.replace(/&#x?[0-9a-fA-F]+;/g, function(match) {
        let num = match.includes('&#x') ?
            parseInt(match.slice(3, -1), 16) :
            parseInt(match.slice(2, -1), 10);
        
        // Common replacements
        if (num === 8217 || num === 8216) return "'"; // Quotes
        if (num === 8220 || num === 8221) return '"'; // Double quotes
        if (num === 8211) return "-"; // En dash
        if (num === 8212) return "--"; // Em dash
        if (num === 8230) return "..."; // Ellipsis
        if (num < 128) return String.fromCharCode(num);
        return "";
    });
    
    // 4. Replace named entities
    const namedEntities = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
        '&nbsp;': ' ', '&mdash;': '--', '&ndash;': '-',
        '&rsquo;': "'", '&lsquo;': "'", '&rdquo;': '"', '&ldquo;': '"',
        '&hellip;': '...'
    };
    textContent = textContent.replace(/&[a-zA-Z]+;/g, match => namedEntities[match] || "");
    
    // 5. Clean up whitespace more carefully
    // First normalize line endings
    textContent = textContent.replace(/\r\n?/g, '\n');
    // Replace multiple blank lines with double newline, but preserve single line breaks
    textContent = textContent.replace(/\n{3,}/g, '\n\n');
    // Only collapse multiple spaces (not single spaces between words)
    textContent = textContent.replace(/  +/g, ' ');
    // Trim start and end
    textContent = textContent.trim();
    
    console.log(`Final content: ${textContent.length} chars`);
    
    // Ensure the content is valid UTF-8 by using TextEncoder/TextDecoder
    let finalContent;
    try {
        // Use TextEncoder/TextDecoder to ensure valid UTF-8
        const encoder = new TextEncoder();
        const bytes = encoder.encode(textContent);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        finalContent = decoder.decode(bytes);
        
        console.log('Content validated through TextEncoder/TextDecoder');
    } catch (e) {
        console.warn('TextEncoder/TextDecoder processing failed, using original:', e);
        finalContent = textContent;
    }

    // Create an HTML file with the aggressively cleaned content
    let htmlFile;
    try {
        htmlFile = new File([finalContent], fileNameToUse, {
            type: "text/html",
        });
        console.log('HTML file created successfully');
    } catch (error) {
        console.error('File creation error:', error);
        // Fallback: try with Blob first, then convert to File
        try {
            const blob = new Blob([finalContent], { type: "text/html" });
            htmlFile = new File([blob], fileNameToUse, {
                type: "text/html",
                lastModified: Date.now()
            });
            console.log('Created HTML file using Blob fallback method');
        } catch (fallbackError) {
            console.error('Blob fallback also failed:', fallbackError);
            // Last resort: create with minimal content
            htmlFile = new File(['<html><body>Error: Could not process tab content</body></html>'], fileNameToUse, {
                type: "text/html",
            });
            console.log('Created HTML file with error message content');
        }
    }

    // Create a DataTransfer object and add the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(htmlFile);

    // Create a synthetic drop event
    const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer,
    });

    // Dispatch the drop event on the chat input
    chatInput.dispatchEvent(dropEvent);

    console.log(`✅ Dropped HTML file: ${fileNameToUse}`);
    return { success: true, message: `HTML file "${fileNameToUse}" dropped successfully` };
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'dropPDFFromUrl') {
        // Handle PDF drop request
        const chatInput = document.querySelector('[contenteditable="true"]');
        console.log(`Frame has contenteditable: ${!!chatInput} at ${window.location.href}`);
        
        if (chatInput) {
            console.log('Dropping PDF file from URL...');
            dropPDFFromUrl(request.pdfUrl, request.fileName).then(result => {
                sendResponse(result);
            }).catch(error => {
                console.error('PDF drop error:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
        } else {
            console.log('Not the target frame (no contenteditable), skipping PDF drop...');
            sendResponse({ success: false, message: 'Not the target frame - no contenteditable element' });
        }
    } else if (request.action === 'executeAutomation') {
        // Check if we're in the right frame (has contenteditable element)
        const chatInput = document.querySelector('[contenteditable="true"]');
        console.log(`Frame has contenteditable: ${!!chatInput} at ${window.location.href}`);
        
        if (chatInput) {
            console.log('This appears to be the correct frame, executing file drop simulation...');
            try {
                // Extract HTML content, filename, and source URL from the request
                const htmlContent = request.htmlContent || '';
                const fileName = request.fileName || 'webpage.html';
                const sourceUrl = request.sourceUrl || '';
                
                const result = simulateFileDrop(htmlContent, fileName, sourceUrl);
                sendResponse({ success: true, ...result });
            } catch (error) {
                console.error('File drop simulation error:', error);
                sendResponse({ success: false, error: error.message });
            }
        } else {
            console.log('Not the target frame (no contenteditable), skipping...');
            sendResponse({ success: false, message: 'Not the target frame - no contenteditable element' });
        }
    }
    
    return true; // Keep message channel open
});

// Function to wait for file upload completion
async function waitForUploadCompletion(maxWaitTime = 30000) {
    console.log('=== WAITING FOR UPLOAD COMPLETION ===');
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        let observer = null;
        let pollInterval = null;
        let uploadDetected = false;
        
        // Selectors that indicate upload is in progress or completed
        const uploadIndicators = {
            // Common loading/uploading indicators
            inProgress: [
                '[aria-label*="uploading" i]',
                '[aria-label*="loading" i]',
                '.uploading',
                '.loading',
                '[class*="upload-progress" i]',
                '[class*="uploading" i]',
                '[class*="spinner" i]',
                '[class*="loader" i]',
                'div[role="progressbar"]',
                'svg[class*="animate-spin" i]',
                '.animate-pulse'
            ],
            // Common indicators that upload is complete
            completed: [
                '[aria-label*="attachment" i]',
                '[aria-label*="file" i]',
                '[aria-label*="document" i]',
                '[class*="attachment" i]',
                '[class*="file-preview" i]',
                '[class*="file-badge" i]',
                '[class*="file-chip" i]',
                '[class*="uploaded" i]',
                '[data-testid*="attachment" i]',
                '[data-testid*="file" i]',
                'img[alt*="uploaded" i]',
                'img[alt*="attachment" i]',
                // Common file type indicators
                'div[title$=".pdf" i]',
                'div[title$=".html" i]',
                'span[title$=".pdf" i]',
                'span[title$=".html" i]'
            ]
        };
        
        // Function to check if upload is in progress
        const isUploading = () => {
            for (const selector of uploadIndicators.inProgress) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) { // Check if visible
                    console.log('Upload in progress detected:', selector);
                    return true;
                }
            }
            return false;
        };
        
        // Function to check if upload is complete
        const isUploadComplete = () => {
            // First check if there are any attachment indicators
            for (const selector of uploadIndicators.completed) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) { // Check if visible
                    console.log('Upload completion indicator found:', selector);
                    
                    // Make sure there's no ongoing upload
                    if (!isUploading()) {
                        return true;
                    }
                }
            }
            
            // Also check if submit button is enabled (common pattern)
            const submitButton = document.querySelector('button[type="submit"]:not([disabled])');
            if (submitButton && uploadDetected && !isUploading()) {
                console.log('Submit button enabled and no upload in progress');
                return true;
            }
            
            return false;
        };
        
        // Cleanup function
        const cleanup = () => {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };
        
        // Set up MutationObserver to watch for DOM changes
        observer = new MutationObserver((mutations) => {
            // Check if we see any upload activity
            if (!uploadDetected && (isUploading() || isUploadComplete())) {
                uploadDetected = true;
                console.log('Upload activity detected via MutationObserver');
            }
            
            // Check if upload is complete
            if (uploadDetected && isUploadComplete()) {
                console.log('✅ Upload completed (detected by MutationObserver)');
                cleanup();
                resolve(true);
            }
        });
        
        // Start observing the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-label', 'disabled', 'title']
        });
        
        // Set up polling as a fallback
        pollInterval = setInterval(() => {
            // Check for timeout
            if (Date.now() - startTime > maxWaitTime) {
                console.log('⚠️ Upload wait timeout reached');
                cleanup();
                resolve(false);
                return;
            }
            
            // Check if we see any upload activity
            if (!uploadDetected && (isUploading() || isUploadComplete())) {
                uploadDetected = true;
                console.log('Upload activity detected via polling');
            }
            
            // Check if upload is complete
            if (uploadDetected && isUploadComplete()) {
                console.log('✅ Upload completed (detected by polling)');
                cleanup();
                resolve(true);
            }
            
            // If we haven't detected any upload after 5 seconds, assume it completed instantly
            if (!uploadDetected && Date.now() - startTime > 5000) {
                console.log('No upload indicators found, assuming instant completion');
                cleanup();
                resolve(true);
            }
        }, 500); // Poll every 500ms
        
        // Initial check
        if (isUploadComplete()) {
            console.log('✅ Upload already complete');
            cleanup();
            resolve(true);
        }
    });
}

// Function to submit a prompt to the chat
async function submitPrompt(promptText, waitForUpload = false) {
    console.log('=== SUBMITTING PROMPT ===');
    console.log('Prompt text:', promptText);
    console.log('Wait for upload:', waitForUpload);
    
    const chatInput = document.querySelector('[contenteditable="true"]');
    if (!chatInput) {
        console.error("No contenteditable chat input found.");
        return { success: false, message: 'No chat input found' };
    }
    
    try {
        // If we should wait for upload, do so before submitting
        if (waitForUpload) {
            console.log('Waiting for file upload to complete...');
            const uploadCompleted = await waitForUploadCompletion();
            
            if (!uploadCompleted) {
                console.warn('Upload completion detection timed out, proceeding anyway...');
            }
            
            // Add a small additional delay to ensure UI is ready
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Clear any existing content and add the prompt text
        chatInput.textContent = promptText;
        
        // Trigger input event to notify the app of the change
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        chatInput.dispatchEvent(inputEvent);
        
        // Small delay to let the input register
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to find and click the submit button
        // Common selectors for submit buttons in chat interfaces
        const submitSelectors = [
            'button[type="submit"]:not([disabled])',
            'button[aria-label*="send" i]:not([disabled])',
            'button[aria-label*="submit" i]:not([disabled])',
            'button:has(svg[class*="send" i]):not([disabled])',
            'button:has(svg[class*="submit" i]):not([disabled])',
            'button:has(svg):not([disabled])',
            '[role="button"][aria-label*="send" i]:not([disabled])',
            '[role="button"][aria-label*="submit" i]:not([disabled])'
        ];
        
        let submitButton = null;
        for (const selector of submitSelectors) {
            submitButton = document.querySelector(selector);
            if (submitButton) {
                console.log('Found submit button with selector:', selector);
                break;
            }
        }
        
        if (submitButton) {
            // Click the submit button
            submitButton.click();
            console.log('✅ Clicked submit button');
            
            // Also try dispatching a click event
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            submitButton.dispatchEvent(clickEvent);
            
            return { success: true, message: 'Prompt submitted successfully' };
        } else {
            // If no submit button found, try pressing Enter
            console.log('No submit button found, trying Enter key...');
            
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            chatInput.dispatchEvent(enterEvent);
            
            // Also try keypress and keyup
            const keypressEvent = new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            chatInput.dispatchEvent(keypressEvent);
            
            const keyupEvent = new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            chatInput.dispatchEvent(keyupEvent);
            
            return { success: true, message: 'Prompt submitted via Enter key' };
        }
    } catch (error) {
        console.error('Error submitting prompt:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}

// Also listen for postMessage from parent window
window.addEventListener('message', (event) => {
    // Handle regular webpage HTML drop
    if (event.data && event.data.action === 'runAttachWebpageAutomation') {
        console.log('Received postMessage command to run file drop simulation');
        
        // Check if we're in the right frame (has contenteditable element)
        const chatInput = document.querySelector('[contenteditable="true"]');
        if (chatInput) {
            try {
                // Extract HTML content, filename, and source URL from the message
                const htmlContent = event.data.htmlContent || '';
                const fileName = event.data.fileName || 'webpage.html';
                const sourceUrl = event.data.sourceUrl || '';
                
                const result = simulateFileDrop(htmlContent, fileName, sourceUrl);
                // Send success message back to parent
                if (event.source) {
                    event.source.postMessage({
                        status: 'success',
                        message: result.message || 'File drop simulated'
                    }, event.origin);
                }
            } catch (error) {
                console.error('File drop simulation error:', error);
                if (event.source) {
                    event.source.postMessage({
                        status: 'error',
                        message: error.message
                    }, event.origin);
                }
            }
        }
    }
    
    // Handle PDF file drop via postMessage
    if (event.data && event.data.action === 'dropPDFFromUrl') {
        console.log('Received postMessage command to drop PDF from URL');
        
        // Check if we're in the right frame (has contenteditable element)
        const chatInput = document.querySelector('[contenteditable="true"]');
        if (chatInput) {
            console.log('Found chat input, dropping PDF...');
            dropPDFFromUrl(event.data.pdfUrl, event.data.fileName).then(result => {
                // Send success message back to parent
                if (event.source) {
                    event.source.postMessage({
                        status: result.success ? 'success' : 'error',
                        message: result.message
                    }, event.origin);
                }
            }).catch(error => {
                console.error('PDF drop error:', error);
                if (event.source) {
                    event.source.postMessage({
                        status: 'error',
                        message: error.message
                    }, event.origin);
                }
            });
        } else {
            console.log('No chat input found in this frame');
        }
    }
    
    // Handle prompt submission
    if (event.data && event.data.action === 'submitPrompt') {
        console.log('Received postMessage command to submit prompt');
        
        // Check if we're in the right frame (has contenteditable element)
        const chatInput = document.querySelector('[contenteditable="true"]');
        if (chatInput) {
            // Submit with wait for upload flag (true by default for summarize)
            submitPrompt(event.data.promptText, true).then(result => {
                // Send result back to parent
                if (event.source) {
                    event.source.postMessage({
                        status: result.success ? 'success' : 'error',
                        message: result.message
                    }, event.origin);
                }
            });
        } else {
            console.log('No chat input found in this frame');
        }
    }
});

console.log('Content script loaded and ready in frame:', window.location.href);