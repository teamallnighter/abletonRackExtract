import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Search = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState([])
    const [searchResults, setSearchResults] = useState([])
    const [popularTags, setPopularTags] = useState([])
    const [loading, setLoading] = useState(false)
    const [resultsCount, setResultsCount] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        loadPopularTags()
    }, [])

    const loadPopularTags = async () => {
        try {
            const response = await fetch('/api/tags/popular')
            const data = await response.json()

            if (data.success && data.tags) {
                setPopularTags(data.tags)
            }
        } catch (error) {
            console.error('Error loading popular tags:', error)
        }
    }

    const performSearch = async (query = searchQuery) => {
        if (!query.trim()) return

        setLoading(true)
        setSearchResults([])

        try {
            const response = await fetch(`/api/racks/search?q=${encodeURIComponent(query)}`)
            const data = await response.json()

            if (data.success && data.racks) {
                setSearchResults(data.racks)
                setResultsCount(data.racks.length)
            } else {
                setSearchResults([])
                setResultsCount(0)
            }
        } catch (error) {
            console.error('Error during search:', error)
            setSearchResults([])
            setResultsCount(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const searchWithTags = async () => {
            if (selectedTags.length === 0) return

            setLoading(true)
            setSearchResults([])

            try {
                const response = await fetch('/api/racks/by-tags', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tags: selectedTags })
                })
                const data = await response.json()

                if (data.success && data.racks) {
                    setSearchResults(data.racks)
                    setResultsCount(data.racks.length)
                } else {
                    setSearchResults([])
                    setResultsCount(0)
                }
            } catch (error) {
                console.error('Error during tag search:', error)
                setSearchResults([])
                setResultsCount(0)
            } finally {
                setLoading(false)
            }
        }

        if (selectedTags.length > 0) {
            searchWithTags()
        }
    }, [selectedTags])

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag))
        } else {
            setSelectedTags([...selectedTags, tag])
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        performSearch()
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            performSearch()
        }
    }

    const RackCard = ({ rack }) => (
        <div
            className="rack-card"
            onClick={() => navigate(`/rack/${rack._id}`)}
        >
            <h3>{rack.rack_name || rack.filename}</h3>
            <div className="rack-card-meta">
                by {rack.user_info?.producer_name || rack.producer_name || 'Unknown'}
            </div>
            <p className="rack-card-description">
                {rack.user_info?.description || rack.description || 'No description'}
            </p>
            {(rack.user_info?.tags || rack.tags || []).length > 0 && (
                <div className="rack-card-tags">
                    {(rack.user_info?.tags || rack.tags || []).map(tag => (
                        <span key={tag} className="rack-card-tag">{tag}</span>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <div className="search-container">
            <div className="search-header">
                <h1>Browse Rack Recipes</h1>
                <p>Discover amazing rack configurations from the community</p>
            </div>

            <div className="search-controls">
                <form onSubmit={handleSubmit} className="search-input-group">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search for racks, devices, or producers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button type="submit" className="search-button">Search</button>
                </form>

                <div className="filter-tags">
                    <label className="filter-tags-label">Filter by tags:</label>
                    <div className="filter-tags-container">
                        {popularTags.map(tag => (
                            <span
                                key={typeof tag === 'string' ? tag : tag._id}
                                className={`filter-tag ${selectedTags.includes(typeof tag === 'string' ? tag : tag._id) ? 'active' : ''}`}
                                onClick={() => toggleTag(typeof tag === 'string' ? tag : tag._id)}
                            >
                                {typeof tag === 'string' ? tag : `${tag._id} (${tag.count})`}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="search-results">
                <div className="results-header">
                    <span className="results-count">
                        {resultsCount} results found
                    </span>
                </div>

                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Searching...</p>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="rack-grid">
                        {searchResults.map(rack => (
                            <RackCard key={rack._id} rack={rack} />
                        ))}
                    </div>
                ) : resultsCount === 0 && (searchQuery || selectedTags.length > 0) ? (
                    <div className="no-results">
                        <p>No racks found matching your search criteria.</p>
                        <p>Try different keywords or tags.</p>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default Search
