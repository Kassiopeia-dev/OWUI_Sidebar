// knowledge-api.js - Browser compatible API functions for Open WebUI

/**
 * Format API URL to ensure proper endpoint construction
 * @param {string} baseUrl - The base URL to format
 * @returns {string|null} Formatted URL or null if invalid
 */
function formatApiUrl(baseUrl) {
    try {
        const urlObj = new URL(baseUrl);
        return urlObj.href.endsWith('/') ? urlObj.href : `${urlObj.href}/`;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

/**
 * Get list of knowledge bases
 * @param {string} OPEN_WEBUI_API_URL - The base API URL
 * @param {string} OPEN_WEBUI_API_KEY - The API key
 * @returns {Promise<Array>} Array of knowledge bases
 */
async function getListKnowledge(OPEN_WEBUI_API_URL, OPEN_WEBUI_API_KEY) {
    const baseUrl = formatApiUrl(OPEN_WEBUI_API_URL);
    if (!baseUrl) {
        throw new Error('Invalid API URL provided');
    }
    const url = `${baseUrl}api/v1/knowledge/`;
    const headers = {
        'Authorization': `Bearer ${OPEN_WEBUI_API_KEY}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.map(knowledge => ({
            id: knowledge.id,
            name: knowledge.name,
            description: knowledge.description
        }));
    } catch (error) {
        console.error('Error fetching knowledge list:', error);
        throw error;
    }
}

/**
 * Create a new knowledge base
 * @param {string} OPEN_WEBUI_API_URL - The base API URL
 * @param {string} OPEN_WEBUI_API_KEY - The API key
 * @param {string} name - Knowledge base name
 * @param {string} description - Knowledge base description
 * @param {Object} data - Additional data
 * @param {Object} accessControl - Access control settings
 * @returns {Promise<Object>} Created knowledge base data
 */
async function createKnowledge(OPEN_WEBUI_API_URL, OPEN_WEBUI_API_KEY, name = 'Open WebUI Docs', description = 'Lorem Ipsum', data = {}, accessControl = {}) {
    const baseUrl = formatApiUrl(OPEN_WEBUI_API_URL);
    if (!baseUrl) {
        throw new Error('Invalid API URL provided');
    }
    const url = `${baseUrl}api/v1/knowledge/create`;
    const payload = {
        name: name,
        description: description,
        data: data,
        access_control: accessControl
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPEN_WEBUI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating knowledge:', error);
        throw error;
    }
}

/**
 * Upload a file to the server
 * @param {string} token - Authentication token
 * @param {File} file - File object from input element
 * @returns {Promise<Object>} Upload response data
 */
async function uploadFile(baseUrl, token, file) {
    const formattedUrl = formatApiUrl(baseUrl);
    if (!formattedUrl) {
        throw new Error('Invalid API URL');
    }
    const url = `${formattedUrl}api/v1/files/`;
    
    try {
        // Validate file before upload
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (file.size === 0) {
            throw new Error('File is empty (0 bytes)');
        }
        
        console.log('Uploading file:', {
            name: file.name,
            size: file.size,
            type: file.type || 'unknown'
        });
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            
            let errorDetail;
            try {
                const errorData = JSON.parse(errorText);
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = errorText;
            }
            
            throw new Error(
                `Failed to upload file. Status: ${response.status}. Details: ${errorDetail}`
            );
        }
        
        const result = await response.json();
        console.log('Upload response:', result);
        
        if (!result.id) {
            console.error('Upload response missing ID:', result);
            throw new Error('Upload successful but no file ID received. Response: ' + JSON.stringify(result));
        }
        
        // Check if the file has content in the response
        if (result.size === 0 || result.content_length === 0) {
            console.warn('Warning: Uploaded file appears to be empty on server');
        }
        
        return result;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

/**
 * Add a file to a knowledge base
 * @param {string} token - Authentication token
 * @param {string} knowledgeId - Knowledge base ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} API response
 */
async function addFileToKnowledge(baseUrl, token, knowledgeId, fileId) {
    const formattedUrl = formatApiUrl(baseUrl);
    if (!formattedUrl) {
        throw new Error('Invalid API URL');
    }
    const url = `${formattedUrl}api/v1/knowledge/${knowledgeId}/file/add`;
    
    try {
        // Log the request details for debugging
        console.log('Adding file to knowledge:', {
            knowledgeId,
            fileId,
            url
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: fileId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            
            let errorDetail;
            try {
                const errorData = JSON.parse(errorText);
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = errorText;
            }
            
            throw new Error(
                `Failed to add file to knowledge. Status: ${response.status}. Details: ${errorDetail}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding file to knowledge:', error);
        throw error;
    }
}

/**
 * Complete workflow: Create knowledge base, upload file, and add file to knowledge
 * @param {string} OPEN_WEBUI_API_URL - The base API URL
 * @param {string} OPEN_WEBUI_API_KEY - The API key
 * @param {string} knowledgeName - Knowledge base name
 * @param {string} knowledgeDescription - Knowledge base description
 * @param {File} file - File to upload and add
 * @returns {Promise<Object>} Complete workflow result
 */
async function completeKnowledgeWorkflow(OPEN_WEBUI_API_URL, OPEN_WEBUI_API_KEY, knowledgeName, knowledgeDescription, file) {
    try {
        // Step 1: Create knowledge base
        console.log('Creating knowledge base...');
        const knowledge = await createKnowledge(OPEN_WEBUI_API_URL, OPEN_WEBUI_API_KEY, knowledgeName, knowledgeDescription);
        console.log('Knowledge base created:', knowledge);

        // Step 2: Upload file
        console.log('Uploading file...');
        const fileUpload = await uploadFile(OPEN_WEBUI_API_KEY, file);
        console.log('File uploaded:', fileUpload);

        // Step 3: Add file to knowledge base
        console.log('Adding file to knowledge base...');
        const addResult = await addFileToKnowledge(OPEN_WEBUI_API_KEY, knowledge.id, fileUpload.id);
        console.log('File added to knowledge:', addResult);

        return {
            knowledge: knowledge,
            file: fileUpload,
            addResult: addResult,
            success: true
        };
    } catch (error) {
        console.error('Workflow failed:', error);
        throw error;
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        getListKnowledge,
        createKnowledge,
        uploadFile,
        addFileToKnowledge,
        completeKnowledgeWorkflow
    };
} else {
    // Browser environment - attach to window object
    window.KnowledgeAPI = {
        getListKnowledge,
        createKnowledge,
        uploadFile,
        addFileToKnowledge,
        completeKnowledgeWorkflow
    };
}