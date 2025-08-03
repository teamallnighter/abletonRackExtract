import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Profile = () => {
    const { user, makeAuthenticatedRequest } = useAuth()
    const [userRacks, setUserRacks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserRacks = async () => {
            try {
                const response = await makeAuthenticatedRequest('/api/user/racks')
                const data = await response.json()

                if (data.success && data.racks) {
                    setUserRacks(data.racks)
                }
            } catch (error) {
                console.error('Error fetching user racks:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUserRacks()
    }, [makeAuthenticatedRequest])

    const formatRackName = (name) => {
        if (!name) return name
        return name.replace(/_/g, ' ')
    }

    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading your kitchen...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Welcome to Your Kitchen, {user?.username}!</h1>
                <p className="profile-subtitle">
                    Manage your uploaded rack recipes and track your contributions to the community.
                </p>
            </div>

            <div className="profile-stats">
                <div className="stat-card">
                    <div className="stat-value">{userRacks.length}</div>
                    <div className="stat-label">Recipes Shared</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {userRacks.reduce((sum, rack) => sum + (rack.download_count || 0), 0)}
                    </div>
                    <div className="stat-label">Total Downloads</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {userRacks.reduce((sum, rack) => sum + (rack.stats?.total_chains || 0), 0)}
                    </div>
                    <div className="stat-label">Total Chains</div>
                </div>
            </div>

            <div className="profile-actions">
                <Link to="/upload" className="btn btn-primary">
                    Upload New Recipe
                </Link>
                <Link to="/search" className="btn btn-secondary">
                    Browse Community Recipes
                </Link>
            </div>

            <div className="user-racks-section">
                <h2>Your Recipes</h2>

                {userRacks.length > 0 ? (
                    <div className="rack-grid">
                        {userRacks.map(rack => (
                            <div
                                key={rack._id}
                                className="rack-card clickable"
                                onClick={() => window.location.href = `/rack/${rack._id}`}
                            >
                                <h3>{formatRackName(rack.rack_name || rack.filename)}</h3>
                                <div className="rack-card-meta">
                                    <span>Uploaded: {new Date(rack.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="rack-card-stats">
                                    <span>Chains: {rack.stats?.total_chains || 0}</span>
                                    <span>Devices: {rack.stats?.total_devices || 0}</span>
                                    <span>Downloads: {rack.download_count || 0}</span>
                                </div>
                                {rack.user_info?.description && (
                                    <p className="rack-card-description">{rack.user_info.description}</p>
                                )}
                                {(rack.user_info?.tags || rack.tags || []).length > 0 && (
                                    <div className="rack-card-tags">
                                        {(rack.user_info?.tags || rack.tags || []).map(tag => (
                                            <span key={tag} className="rack-card-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-racks-message">
                        <p>You haven't uploaded any recipes yet.</p>
                        <p>
                            <Link to="/upload">Upload your first recipe</Link> to share your
                            creative Ableton Live setups with the community!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Profile
