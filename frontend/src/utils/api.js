// API utility functions for the React frontend

const API_BASE_URL = import.meta.env.PROD
    ? '/api'  // Same domain in production
    : 'http://localhost:5001/api'

// Helper function to handle API responses
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.json()
}

// Authentication
export const authApi = {
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        return handleResponse(response)
    },

    register: async (username, email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        })
        return handleResponse(response)
    }
}

// Racks
export const rackApi = {
    // Get recent racks
    getRecent: async (limit = 10) => {
        const response = await fetch(`${API_BASE_URL}/racks?limit=${limit}`)
        return handleResponse(response)
    },

    // Get popular racks
    getPopular: async (limit = 10) => {
        const response = await fetch(`${API_BASE_URL}/racks/popular?limit=${limit}`)
        return handleResponse(response)
    },

    // Get rack by ID
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/racks/${id}`)
        return handleResponse(response)
    },

    // Search racks
    search: async (query) => {
        const response = await fetch(`${API_BASE_URL}/racks/search?q=${encodeURIComponent(query)}`)
        return handleResponse(response)
    },

    // Search by tags
    searchByTags: async (tags) => {
        const response = await fetch(`${API_BASE_URL}/racks/by-tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags })
        })
        return handleResponse(response)
    },

    // Upload rack (requires authentication)
    upload: async (formData, token) => {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        return handleResponse(response)
    },

    // Analyze rack (initial analysis without saving)
    analyze: async (formData) => {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            body: formData
        })
        return handleResponse(response)
    },

    // Download rack file
    download: async (id) => {
        const response = await fetch(`${API_BASE_URL}/racks/${id}/download`)
        if (!response.ok) {
            throw new Error('Failed to download rack')
        }
        return response.blob()
    }
}

// User operations (require authentication)
export const userApi = {
    // Get user's racks
    getUserRacks: async (token) => {
        const response = await fetch(`${API_BASE_URL}/user/racks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        return handleResponse(response)
    },

    // Get user's favorites
    getFavorites: async (token) => {
        const response = await fetch(`${API_BASE_URL}/user/favorites`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        return handleResponse(response)
    },

    // Toggle favorite
    toggleFavorite: async (rackId, token) => {
        const response = await fetch(`${API_BASE_URL}/racks/${rackId}/favorite`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        return handleResponse(response)
    }
}

// Tags
export const tagApi = {
    // Get popular tags
    getPopular: async () => {
        const response = await fetch(`${API_BASE_URL}/tags/popular`)
        return handleResponse(response)
    }
}

export default {
    auth: authApi,
    racks: rackApi,
    user: userApi,
    tags: tagApi
}
