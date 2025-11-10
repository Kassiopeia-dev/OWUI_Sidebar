# OWUI Sidebar Extension

A Chrome/Edge(tested)/Brave extension that integrates Open WebUI (OWUI) directly into your browser's sidebar, providing seamless access to AI chat capabilities while preserving your browsing context and authentication.
**Key advantages**: Smart dual-URL routing avoids tunnel overhead (Tailscale/Cloudflare) when using internal URLs, and content extraction ensures authenticated pages remain accessible to OWUI (unlike URL-only attachment).

## Overview

The OWUI Sidebar Extension allows you to:
- Access Open WebUI in a convenient sidebar panel without leaving your current tab
- Interact with web content through AI-powered chat and summarization

- Upload documents to knowledge collections for RAG (Retrieval-Augmented Generation)
- Maintain full Open WebUI functionality within the sidebar

## Key Features


### 📝 Content Interaction Buttons

#### Chat with Tab
- **Function**: Extracts the current tab's HTML content and sends it to Open WebUI as a file attachment
- **Use case**: Analyze, discuss, or ask questions about the current tab content
- **How it works**: Captures the full HTML including text, structure, and metadata while preserving the page context
- **Why extraction instead of URL**: The extension extracts the actual content rather than just passing the URL to OWUI (as with the default "Attach URL" functionality) to ensure that content requiring authentication or specific credentials remains accessible. This prevents OWUI from receiving empty or error pages when it cannot access protected content directly.

#### Summarize Tab
- **Function**: Extracts the current tab's HTML and automatically requests a summary
- **Use case**: Quickly get key points from long articles, documentation, or reports
- **How it works**: Combines content extraction with an automatic summarization prompt
- **Content preservation**: Like "Chat with Tab", this extracts the actual content to ensure authenticated or private content can be properly summarized

#### RAG (Retrieval-Augmented Generation)
A dropdown menu with knowledge management options:
- **Upload File to Default**: Quickly upload documents (PDF, DOC, TXT, etc.) to your default knowledge collection
- **Upload to...**: Choose a specific knowledge collection for targeted document organization
- **Manage Collections**: Direct link to Open WebUI's knowledge management interface

**Note**: The RAG button only appears after you have entered your API key in the extension settings.

### 🔗 Smart URL Handling

The extension intelligently manages different URL types to ensure optimal connectivity:

#### Internal vs External URLs
- **Internal URL (Green indicator ![Internal](icons/Internal_url.png))**: Your local or private Open WebUI instance (e.g., `http://localhost:3000`)
- **External URL (Yellow indicator ![External](icons/External_url.png))**: Public or remote Open WebUI instance (e.g., `https://openwebui.example.com`)

The extension automatically:
1. Checks if your internal URL is reachable
2. Falls back to the external URL if the internal one is unavailable
3. Displays a status indicator showing which URL is currently active

#### Why This Matters
This dual-URL approach ensures that:
- **Authentication is preserved**: Your login sessions, cookies, and user context remain intact
- **Content consistency**: You see the same content as in your regular browser session
- **Private access works**: Internal tools, localhost servers, and VPN-protected resources remain accessible
- **Seamless fallback**: If you're away from your local network, the extension automatically uses your external URL
- **Optimized performance**: When you have access to the internal URL, queries are processed directly without going through tunnels (Tailscale, Cloudflare, etc.), resulting in faster response times and reduced latency

Without this approach, you might encounter:
- Login prompts when already authenticated
- Different content due to missing session context
- Inability to access private or internal resources
- Broken functionality for sites requiring specific cookies or tokens
- Unnecessary network overhead when routing local traffic through external tunnels

### 🔍 Status Indicators

The extension displays visual indicators to show the current connection status:
- **Green icon** ![Internal](icons/Internal_url.png): Connected to internal/local Open WebUI instance
- **Yellow icon** ![External](icons/External_url.png): Connected to external/remote Open WebUI instance
- **Status messages**: Temporary notifications for successful operations or errors

## Installation Instructions

### Prerequisites
- Google Chrome or Chromium-based browser (Edge, Brave, etc.)
- Access to an Open WebUI instance (local or remote)

### Step-by-Step Installation

1. **Download the Extension**
   - Download or clone this repository to your local machine
   - Extract the files to a folder if downloaded as a ZIP

2. **Prepare the Extension Directory**
   ```
   ⚠️ IMPORTANT: Choose a permanent location for the extension folder.
   This directory must remain in place after installation.
   Moving or deleting it will break the extension.
   
   Recommended locations:
   - Windows: C:\Users\[YourName]\Documents\Extensions\owui-sidebar
   - Mac: ~/Documents/Extensions/owui-sidebar
   - Linux: ~/extensions/owui-sidebar
   ```

3. **Open Chrome Extension Management**
   - Open Chrome/Edge/Brave browser
   - Navigate to the extensions page:
     - Chrome: `chrome://extensions`
     - Edge: `edge://extensions`
     - Brave: `brave://extensions`
   - Or use the menu: **Three dots menu → Extensions → Manage Extensions**

4. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner of the extensions page
   - This allows you to install unpacked extensions

5. **Load the Extension**
   - Click the "Load unpacked" button
   - Navigate to and select the extension folder containing `manifest.json`
   - The extension should appear in your extensions list

6. **Configure the Extension**
   - Click on the extension icon in the toolbar (you may need to pin it from the extensions menu)
   - If you haven't configured a URL yet, you'll see a welcome message with a button to open settings
   - Right-click the extension icon and select "Options" or click "Details" → "Extension options"
   - Configure your URLs:
     - **Internal URL**: Your local Open WebUI instance (e.g., `http://localhost:3000`)
     - **External URL**: Your remote Open WebUI instance (optional fallback)
     - **API/JWT Key**: Your Open WebUI API key (found in Settings → Account → API Keys)

7. **Access the Sidebar**
   - Click the extension icon to open the Open WebUI sidebar
   - If no URL is configured, you'll see a welcome screen with a direct link to settings
   - Once configured, the sidebar will automatically connect to the appropriate URL
   - You can now use all features while browsing

### Post-Installation Notes

- **Do not delete the extension folder**: The folder you selected during "Load unpacked" must remain in place
- **Updates**: To update the extension, replace the files in the folder and click the refresh icon in the extensions page
- **Permissions**: The extension requires various permissions to function properly:
  - `storage`: Save your configuration
  - `sidePanel`: Display the sidebar interface
  - `activeTab`: Interact with the current tab
  - `scripting`: Extract page content for chat/summarization

## Technical Details

### URL Processing Methods

The extension uses sophisticated methods to handle different types of URLs:

1. **Direct HTML Extraction**: For standard web pages, the extension extracts the full HTML content, preserving structure and context

2. **YouTube URLs**: YouTube video URLs are sent directly to Open WebUI without extraction:
   - The URL itself is passed to OWUI's chat interface (not the content)
   - Open WebUI can then process the video using its built-in YouTube handling capabilities
   - This allows for video transcription, summarization, and Q&A features
   - YouTube URLs are an exception to content extraction since they are publicly accessible

3. **PDF Handling**: For PDF URLs, the extension:
   - Extracts the actual PDF content when possible to preserve authentication context
   - Attempts to fetch the PDF with appropriate credentials
   - Falls back to creating a reference if direct access fails
   - Maintains the original filename for clarity

4. **Authentication Preservation**: By loading Open WebUI in an iframe within the extension context:
   - Cookies and session data are maintained
   - Login states persist across browser sessions
   - Private resources remain accessible with proper authentication

### File Structure

```
owui-sidebar/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for URL checking and message handling
├── content_script.js      # Injected script for page interaction
├── sidepanel.html        # Sidebar UI structure
├── sidepanel.js          # Sidebar functionality
├── options.html          # Settings page structure
├── options.js            # Settings functionality
├── OWUI_Knowledge_tools.js # Knowledge API integration
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   ├── Internal_url.png  # Internal URL indicator
│   └── External_url.png # External URL indicator
```

## Troubleshooting

### Extension Not Loading
- Ensure Developer Mode is enabled
- Check that all files are present in the extension folder
- Verify the manifest.json file is not corrupted

### First Time Setup
- If you see a welcome message instead of Open WebUI, click the "Open Settings" button
- This appears when no URL has been configured yet
- After configuring your URLs in settings, reload the sidebar

### Sidebar Not Connecting
- Verify your Open WebUI URLs in the extension options
- Check that your Open WebUI instance is running
- Ensure your API key is correct if using knowledge features

### Content Extraction Not Working
- Some websites may block content extraction due to security policies
- Try refreshing the page and attempting again
- Check the browser console for specific error messages

### Knowledge Upload Failing
- Verify your API key has the necessary permissions
- Ensure the API URL matches your Open WebUI instance
- Check that the file type is supported (PDF, DOC, TXT, etc.)

## Privacy & Security

- The extension only connects to the URLs you configure
- No data is sent to third parties
- All processing happens locally in your browser
- Your Open WebUI credentials and session data remain secure

## Support

For issues, feature requests, or contributions, please:
1. Check the troubleshooting section above
2. Review existing issues in the repository
3. Create a new issue with detailed information about your problem

## Known Limitations

- **Text-to-Speech (TTS) and Speech-to-Text (STT)**: These features do not currently work within the extension due to browser security restrictions on iframe audio permissions. You'll need to use the main Open WebUI interface for voice features.

## License & Usage

This extension is provided as open source software for the Open WebUI community. You are free to:
- Use the extension for personal or commercial purposes
- Modify and customize the code to suit your needs
- Fork and create your own versions
- Incorporate components into other projects
- Distribute modified versions

When distributing modified versions, please:
- Add your preferred open source license (MIT, Apache 2.0, GPL, etc.)
- Consider contributing improvements back to the community
- Maintain attribution where appropriate

The extension is provided "as-is" without warranty of any kind, express or implied.

---

**Note**: This extension retains full Open WebUI functionality in the sidebar (except for TTS/STT features), meaning most features available in your Open WebUI instance will work seamlessly within the extension interface.