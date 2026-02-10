// Background Service Worker

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'API_REQUEST') {
    handleApiRequest(request, sendResponse);
    return true; // Keep the message channel open for async response
  } else if (request.action === 'GET_COOKIE') {
    handleGetCookie(request, sendResponse);
    return true;
  } else if (request.action === 'NOTIFY') {
    handleNotify(request);
  }
});

// Handle generic API requests using fetch
async function handleApiRequest(request, sendResponse) {
  try {
    const { url, method = 'GET', data = null, headers = {} } = request.details;
    
    // Convert data to URLSearchParams for POST
    let body = undefined;
    if (method === 'POST' && data) {
      if (typeof data === 'string') {
        body = data;
      } else {
        const params = new URLSearchParams();
        for (const key in data) {
          params.append(key, data[key]);
        }
        body = params;
      }
    }

    const fetchOptions = {
      method,
      headers,
      body
    };

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    
    // Try to parse JSON
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      // Not JSON
    }

    sendResponse({
      success: true,
      data: responseJson || responseText,
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    console.error('API Request Error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Get cookies for a specific domain
async function handleGetCookie(request, sendResponse) {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.115.com' });
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    sendResponse({ success: true, cookie: cookieString });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Show notifications
function handleNotify(request) {
  const { title, message } = request.details;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png', // Ensure this exists or use a default
    title: title,
    message: message
  });
}
