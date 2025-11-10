// Handle API access toggle
function toggleApiAccess(enabled) {
    const apiSettings = document.querySelectorAll('.api-settings');
    const owuiApiKey = document.getElementById('owuiApiKey');
    const knowledgeCollection = document.getElementById('knowledgeCollection');
    
    apiSettings.forEach(element => {
        element.style.opacity = enabled ? '1' : '0.5';
    });
    
    owuiApiKey.disabled = !enabled;
    knowledgeCollection.disabled = !enabled;
    
    // Enable/disable new knowledge collection fields
    const newKnowledgeName = document.getElementById('newKnowledgeName');
    const newKnowledgeDescription = document.getElementById('newKnowledgeDescription');
    const createKnowledge = document.getElementById('createKnowledge');
    
    newKnowledgeName.disabled = !enabled;
    newKnowledgeDescription.disabled = !enabled;
    createKnowledge.disabled = !enabled;
}

// URL validation and knowledge collection loading
async function validateUrlAndLoadCollections() {
    const url = document.getElementById('sidebarUrl').value.trim();
    const urlExternal = document.getElementById('externalUrl').value.trim();
    const apiKey = document.getElementById('owuiApiKey').value.trim();
    const collectionStatus = document.getElementById('collectionStatus');
    const knowledgeCollection = document.getElementById('knowledgeCollection');
    
    if (!url && !urlExternal) {
        collectionStatus.textContent = 'Please enter OpenWebUI URL first';
        return;
    }
    
    if (!apiKey) {
        collectionStatus.textContent = 'Please enter API key';
        return;
    }
    
    const rawUrl = url || urlExternal;
    const activeUrl = formatApiUrl(rawUrl);
    
    if (!activeUrl) {
        collectionStatus.textContent = 'Please enter a valid URL';
        return;
    }
    
    try {
        collectionStatus.textContent = 'Loading collections...';
        const response = await fetch(`${activeUrl}api/v1/knowledge/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format. Expected JSON.');
        }
        
        const collections = await response.json();
        
        // Store current selection
        const currentValue = knowledgeCollection.value;
        
        // Clear existing options
        knowledgeCollection.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a collection --';
        knowledgeCollection.appendChild(defaultOption);
        
        // Add collections to dropdown
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.name;
            knowledgeCollection.appendChild(option);
        });

        // Restore previous selection if it exists in the new options
        if (currentValue) {
            knowledgeCollection.value = currentValue;
        }
        
        collectionStatus.textContent = `${collections.length} collections loaded`;
    } catch (error) {
        console.error('Error loading collections:', error);
        if (error.message.includes('Invalid response format')) {
            collectionStatus.textContent = 'Error: Server returned invalid format. Please check the URL.';
        } else if (error.message.includes('HTTP error')) {
            collectionStatus.textContent = 'Error: Failed to connect to server. Please check URL and API key.';
        } else {
            collectionStatus.textContent = 'Error loading collections. Please check URL and API key.';
        }
        
        // Store current selection before clearing
        const currentValue = knowledgeCollection.value;
        
        // Clear the dropdown and add a default disabled option
        knowledgeCollection.innerHTML = '';
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = '-- Error loading collections --';
        errorOption.disabled = true;
        knowledgeCollection.appendChild(errorOption);
        
        // Restore the previous selection if it existed
        if (currentValue) {
            const preserveOption = document.createElement('option');
            preserveOption.value = currentValue;
            preserveOption.textContent = '(Previously selected collection)';
            knowledgeCollection.appendChild(preserveOption);
            knowledgeCollection.value = currentValue;
        }
    }
}

// Check if a URL is reachable
async function checkUrlReachability(url) {
    try {
        // Use fetch with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // Allow checking cross-origin URLs
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        // In no-cors mode, we can't read the status, but if fetch succeeds, the URL is reachable
        return true;
    } catch (error) {
        console.log(`URL ${url} is not reachable:`, error.message);
        return false;
    }
}

// Show status message
function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';
    status.className = isError ? 'error' : 'success';
    
    if (!isError) {
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// Save options to chrome.storage
async function saveOptions() {
    const sidebarUrl = document.getElementById('sidebarUrl').value;
    const externalUrl = document.getElementById('externalUrl').value;
    const summaryLanguage = document.getElementById('summaryLanguage').value;
    const overridePrompt = document.getElementById('overridePrompt').checked;
    const customPrompt = document.getElementById('customPrompt').value;
    const enableApiAccess = document.getElementById('enableApiAccess').checked;
    const owuiApiKey = document.getElementById('owuiApiKey').value;
    const knowledgeCollection = document.getElementById('knowledgeCollection').value;
    
    // Disable save button during validation
    const saveButton = document.getElementById('save');
    saveButton.disabled = true;
    saveButton.textContent = 'Checking URLs...';
    
    // Check URL reachability
    const urlsToCheck = [];
    const urlResults = {};
    
    if (sidebarUrl) {
        urlsToCheck.push({ name: 'Internal OWUI URL', url: sidebarUrl, key: 'internal' });
    }
    if (externalUrl) {
        urlsToCheck.push({ name: 'External URL', url: externalUrl, key: 'external' });
    }
    
    // Check all URLs
    for (const urlInfo of urlsToCheck) {
        showStatus(`Checking ${urlInfo.name}...`);
        const isReachable = await checkUrlReachability(urlInfo.url);
        urlResults[urlInfo.key] = isReachable;
        
        if (!isReachable) {
            showStatus(`Warning: ${urlInfo.name} is not reachable. It will be saved but may not work.`, true);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Show warning for 2 seconds
        }
    }
    
    // Save the settings regardless of reachability (with warnings shown)
    chrome.storage.sync.set({
        sidebarUrl: sidebarUrl,
        externalUrl: externalUrl,
        summaryLanguage: summaryLanguage,
        overridePrompt: overridePrompt,
        customPrompt: customPrompt,
        enableApiAccess: enableApiAccess,
        owuiApiKey: owuiApiKey,
        knowledgeCollection: knowledgeCollection,
        // Store reachability status for reference
        lastReachabilityCheck: {
            internal: urlResults.internal || false,
            external: urlResults.external || false,
            timestamp: Date.now()
        }
    }, () => {
        // Re-enable save button
        saveButton.disabled = false;
        saveButton.textContent = 'Save Settings';
        
        // Show final status
        if (Object.values(urlResults).some(r => !r)) {
            showStatus('Settings saved with warnings. Some URLs may not be reachable.');
        } else {
            showStatus('Settings saved successfully. All URLs are reachable.');
        }
        
        // Close the options page after a short delay to allow the user to see the success message
        setTimeout(() => {
            window.close();
        }, 1500);
    });
}

// Restore options from chrome.storage
async function restoreOptions() {
    const items = await new Promise(resolve => {
        chrome.storage.sync.get({
            sidebarUrl: 'https://example.com', // default value
            externalUrl: '',
            summaryLanguage: 'en',
            overridePrompt: false,
            customPrompt: '',
            enableApiAccess: false,
            owuiApiKey: '',
            knowledgeCollection: ''
        }, resolve);
    });

    document.getElementById('sidebarUrl').value = items.sidebarUrl;
    document.getElementById('externalUrl').value = items.externalUrl || '';
    document.getElementById('summaryLanguage').value = items.summaryLanguage || 'en';
    document.getElementById('overridePrompt').checked = items.overridePrompt || false;
    document.getElementById('customPrompt').value = items.customPrompt || '';
    document.getElementById('enableApiAccess').checked = items.enableApiAccess || false;
    document.getElementById('owuiApiKey').value = items.owuiApiKey || '';
    
    // Update field visibility based on checkbox states
    toggleCustomPromptField(items.overridePrompt || false);
    toggleApiAccess(items.enableApiAccess || false);
    
    // If we have URLs and API access is enabled, load collections
    if ((items.sidebarUrl || items.externalUrl) && items.enableApiAccess && items.owuiApiKey) {
        await validateUrlAndLoadCollections();
        // Set the knowledge collection value after loading collections
        const knowledgeCollection = document.getElementById('knowledgeCollection');
        knowledgeCollection.value = items.knowledgeCollection || '';
    }
}

// Add error styling to the CSS
const style = document.createElement('style');
style.textContent = `
    .error {
        background-color: #f2dede;
        color: #a94442;
        border: 1px solid #ebccd1;
        padding: 10px;
        border-radius: 4px;
    }
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Toggle custom prompt field based on checkbox state
function toggleCustomPromptField(isChecked) {
    const customPromptGroup = document.getElementById('customPromptGroup');
    if (isChecked) {
        customPromptGroup.classList.remove('disabled');
    } else {
        customPromptGroup.classList.add('disabled');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await restoreOptions();
    
    // Add event listener for checkbox to toggle custom prompt field
    const overridePromptCheckbox = document.getElementById('overridePrompt');
    overridePromptCheckbox.addEventListener('change', (e) => {
        toggleCustomPromptField(e.target.checked);
    });
    
    // Add API access toggle listener
    document.getElementById('enableApiAccess').addEventListener('change', (e) => {
        toggleApiAccess(e.target.checked);
        if (e.target.checked && document.getElementById('owuiApiKey').value) {
            validateUrlAndLoadCollections();
        }
    });
    
    // Add URL and API key input event listeners for loading collections
    ['sidebarUrl', 'externalUrl', 'owuiApiKey'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (document.getElementById('enableApiAccess').checked) {
                validateUrlAndLoadCollections();
            }
        });
    });
    
    // Handle new knowledge collection creation
    document.getElementById('createKnowledge').addEventListener('click', async () => {
        const name = document.getElementById('newKnowledgeName').value.trim();
        const description = document.getElementById('newKnowledgeDescription').value.trim();
        const apiKey = document.getElementById('owuiApiKey').value.trim();
        const url = document.getElementById('sidebarUrl').value.trim() || document.getElementById('externalUrl').value.trim();
        const createStatus = document.getElementById('createStatus');
        
        if (!name) {
            createStatus.textContent = 'Please enter a collection name';
            return;
        }
        
        try {
            createStatus.textContent = 'Creating collection...';
            const collection = await window.KnowledgeAPI.createKnowledge(url, apiKey, name, description);
            
            // Clear input fields
            document.getElementById('newKnowledgeName').value = '';
            document.getElementById('newKnowledgeDescription').value = '';
            
            // Refresh collections list
            await validateUrlAndLoadCollections();
            
            // Set the newly created collection as selected
            document.getElementById('knowledgeCollection').value = collection.id;
            
            // Set success message
            createStatus.textContent = 'Collection created successfully!';
            setTimeout(() => {
                createStatus.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('Error creating collection:', error);
            createStatus.textContent = 'Error creating collection. Please check your inputs and try again.';
        }
    });
    
    // Add save button listener
    document.getElementById('save').addEventListener('click', saveOptions);
});