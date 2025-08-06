// Simple authentication utility for Ableton Cookbook
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = this.token ? this.parseTokenPayload(this.token) : null;
    }
    
    parseTokenPayload(token) {
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch (e) {
            return null;
        }
    }
    
    isAuthenticated() {
        if (!this.token) return false;
        
        // Check if token is expired
        const payload = this.parseTokenPayload(this.token);
        if (!payload || payload.exp < Date.now() / 1000) {
            this.logout();
            return false;
        }
        
        return true;
    }
    
    getAuthHeaders() {
        if (!this.isAuthenticated()) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }
    
    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', this.token);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    async register(username, email, password) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('auth_token', this.token);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
    }
    
    getUser() {
        return this.user;
    }
}

// Create global instance
window.Be = new AuthManager();