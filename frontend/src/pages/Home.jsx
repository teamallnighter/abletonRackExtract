import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Home = () => {
    const { isAuthenticated, makeAuthenticatedRequest } = useAuth()
    const [recentRacks, setRecentRacks] = useState([])
    const [popularRacks, setPopularRacks] = useState([])
    const [favoriteRacks, setFavoriteRacks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadFavoriteRacks = async () => {
            try {
                const response = await makeAuthenticatedRequest('/api/user/favorites')
                const data = await response.json()

                if (data.success) {
                    setFavoriteRacks(data.favorites)
                }
            } catch (error) {
                console.error('Error loading favorite racks:', error)
            }
        }

        loadRecentRacks()
        loadPopularRacks()
        if (isAuthenticated()) {
            loadFavoriteRacks()
        }
    }, [isAuthenticated, makeAuthenticatedRequest])

    const loadRecentRacks = async () => {
        try {
            const response = await fetch('/api/racks?limit=10')
            const data = await response.json()

            if (data.success) {
                setRecentRacks(data.racks)
            }
        } catch (error) {
            console.error('Error loading recent racks:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadPopularRacks = async () => {
        try {
            const response = await fetch('/api/racks/popular?limit=10')
            const data = await response.json()

            if (data.success) {
                setPopularRacks(data.racks)
            }
        } catch (error) {
            console.error('Error loading popular racks:', error)
        }
    }

    const RackList = ({ racks, title, emptyMessage }) => (
        <div className="rack-section">
            <h2>{title}</h2>
            <ul className="listOfRacks">
                {racks.length > 0 ? (
                    racks.map(rack => (
                        <li key={rack._id} className="rack-item">
                            <Link to={`/rack/${rack._id}`} className="rack-link">
                                <span className="rack-name">
                                    {rack.rack_name || rack.filename || 'Unnamed Rack'}
                                </span>
                                <span className="rack-info">
                                    {rack.stats?.total_chains || 0} chains, {rack.stats?.total_devices || 0} devices
                                </span>
                            </Link>
                            <div className="rack-meta">
                                {rack.user_info?.producer_name && (
                                    <span className="rack-producer">
                                        by {rack.user_info.producer_name}
                                    </span>
                                )}
                                {rack.download_count && (
                                    <span className="rack-downloads">
                                        {rack.download_count} downloads
                                    </span>
                                )}
                            </div>
                        </li>
                    ))
                ) : (
                    <li><p>{emptyMessage}</p></li>
                )}
            </ul>
        </div>
    )

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>Welcome to The Ableton Cookbook</h1>
                <p className="subtitle">
                    Discover, share, and learn from community-created Ableton Live rack recipes
                </p>
            </header>

            <RackList
                racks={recentRacks}
                title="Recent Racks"
                emptyMessage="No recent racks found"
            />

            <RackList
                racks={popularRacks}
                title="Popular Racks"
                emptyMessage="No popular racks found"
            />

            {isAuthenticated() ? (
                <RackList
                    racks={favoriteRacks}
                    title="Your Favorite Racks"
                    emptyMessage="You haven't favorited any racks yet"
                />
            ) : (
                <div className="rack-section">
                    <h2>Your Favorite Racks</h2>
                    <ul className="listOfRacks">
                        <li>
                            <p>
                                <Link to="/login">Login</Link> to see your favorite racks
                            </p>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    )
}

export default Home
