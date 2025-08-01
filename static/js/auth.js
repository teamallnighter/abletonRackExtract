// Authentication utilities
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

// Get stored token
function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Set token
function setToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// Remove token
function removeToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

// Get user data
function getUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

// Set user data
function setUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Make authenticated request
async function makeAuthenticatedRequest(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('Not authenticated');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        removeToken();
        window.location.href = '/login';
        throw new Error('Authentication expired');
    }
    
    return response;
}

// Logout function
function logout() {
    removeToken();
    window.location.href = '/';
}

// Update navigation based on auth status
function updateAuthUI() {
    const navUser = document.getElementById('navUser');
    if (!navUser) return;
    
    if (isAuthenticated()) {
        const userData = getUserData();
        navUser.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-toggle">
                    <span class="user-icon">👤</span>
                    <span class="username">${userData?.username || 'User'}</span>
                </button>
                <div class="user-dropdown">
                    <a href="/profile" class="dropdown-link">Profile</a>
                    <button onclick="logout()" class="dropdown-link logout-btn">Logout</button>
                </div>
            </div>
        `;
    } else {
        navUser.innerHTML = `
            <a href="/login" class="nav-link">Login</a>
            <a href="/register" class="nav-link register-btn">Sign Up</a>
        `;
    }
}

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', updateAuthUI);
