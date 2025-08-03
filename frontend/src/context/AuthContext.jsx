import React, { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for stored authentication on mount
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('user_data')

        if (storedToken && storedUser) {
            try {
                setToken(storedToken)
                setUser(JSON.parse(storedUser))
            } catch (error) {
                console.error('Error parsing stored user data:', error)
                localStorage.removeItem('auth_token')
                localStorage.removeItem('user_data')
            }
        }
        setLoading(false)
    }, [])

    const login = (userData, authToken) => {
        setUser(userData)
        setToken(authToken)
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('user_data', JSON.stringify(userData))
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
    }

    const isAuthenticated = () => {
        return !!token && !!user
    }

    const makeAuthenticatedRequest = async (url, options = {}) => {
        if (!token) {
            throw new Error('Not authenticated')
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }

        const response = await fetch(url, {
            ...options,
            headers
        })

        if (response.status === 401) {
            // Token expired or invalid
            logout()
            throw new Error('Authentication expired')
        }

        return response
    }

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        makeAuthenticatedRequest
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
