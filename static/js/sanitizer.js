// sanitizer.js - Simple XSS protection utility

// Escape HTML entities to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Sanitize content before inserting into DOM
function sanitizeHtml(dirty) {
    // Basic sanitization for text content
    // For more complex HTML, consider using DOMPurify library
    const tempDiv = document.createElement('div');
    tempDiv.textContent = dirty;
    return tempDiv.innerHTML;
}

// Create text node to safely insert content
function createSafeTextNode(text) {
    return document.createTextNode(text);
}

// Safe element creation with text content
function createSafeElement(tagName, textContent, attributes = {}) {
    const element = document.createElement(tagName);
    if (textContent) {
        element.textContent = textContent;
    }
    
    // Safely set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'href' || key === 'src') {
            // Validate URLs to prevent javascript: protocol
            if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
                element.setAttribute(key, value);
            }
        } else {
            element.setAttribute(key, value);
        }
    });
    
    return element;
}

export { escapeHtml, sanitizeHtml, createSafeTextNode, createSafeElement };
