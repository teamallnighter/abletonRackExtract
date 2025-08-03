import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { rackApi } from '../utils/api'
import RackFlowVisualization from '../components/RackFlowVisualization'

const RackDetails = () => {
    const { id } = useParams()
    const [rack, setRack] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const loadRackDetails = async () => {
            try {
                setLoading(true)
                const data = await rackApi.getById(id)
                if (data.success && data.rack) {
                    setRack(data.rack)
                } else {
                    setError('Rack not found')
                }
            } catch (err) {
                console.error('Failed to load rack details:', err)
                setError(err.message || 'Failed to load rack details')
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            loadRackDetails()
        }
    }, [id])

    const handleDownload = async () => {
        if (!rack) return

        try {
            const blob = await rackApi.download(rack._id)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = rack.filename || 'rack.adg'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error('Download failed:', err)
            alert('Failed to download rack file')
        }
    }

    if (loading) {
        return (
            <div className="rack-details-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading rack details...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rack-details-page">
                <div className="error-container">
                    <h2>Error</h2>
                    <p>{error}</p>
                    <Link to="/search" className="btn btn-primary">
                        Back to Search
                    </Link>
                </div>
            </div>
        )
    }

    if (!rack) {
        return (
            <div className="rack-details-page">
                <div className="error-container">
                    <h2>Rack Not Found</h2>
                    <p>The requested rack could not be found.</p>
                    <Link to="/search" className="btn btn-primary">
                        Back to Search
                    </Link>
                </div>
            </div>
        )
    }

    const formatRackName = (name) => {
        if (!name) return 'Unknown Rack'
        return name.replace(/_/g, ' ')
    }

    const chains = rack.analysis?.chains || []
    const macros = rack.analysis?.macro_controls || []
    const totalDevices = rack.stats?.total_devices || 0

    return (
        <div className="rack-details-page">
            <Link to="/search" className="back-link">
                ← Back to Search
            </Link>

            <div className="rack-header">
                <div className="rack-title">
                    <h1>{formatRackName(rack.rack_name || rack.filename)}</h1>
                    <div className="rack-meta">
                        <span>by {rack.user_info?.producer_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(rack.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="rack-actions">
                    <button onClick={handleDownload} className="btn btn-secondary">
                        Download .adg
                    </button>
                    <button
                        onClick={() => {
                            const dataStr = JSON.stringify(rack.analysis, null, 2)
                            const dataBlob = new Blob([dataStr], { type: 'application/json' })
                            const url = URL.createObjectURL(dataBlob)
                            const link = document.createElement('a')
                            link.href = url
                            link.download = `${rack.rack_name || 'rack'}-analysis.json`
                            link.click()
                        }}
                        className="btn btn-secondary"
                    >
                        Download JSON
                    </button>
                </div>
            </div>

            <div className="rack-info">
                <div className="rack-stats">
                    <div className="stat-item">
                        <span className="stat-value">{chains.length}</span>
                        <span className="stat-label">Chains</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{totalDevices}</span>
                        <span className="stat-label">Devices</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{macros.length}</span>
                        <span className="stat-label">Macros</span>
                    </div>
                </div>

                {rack.user_info?.description && (
                    <div className="rack-description">
                        <h3>Description</h3>
                        <p>{rack.user_info.description}</p>
                    </div>
                )}

                {(rack.user_info?.tags || rack.tags) && (
                    <div className="rack-tags">
                        <h3>Tags</h3>
                        <div className="tags-container">
                            {(rack.user_info?.tags || rack.tags || []).map((tag, index) => (
                                <span key={index} className="tag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="rack-visualization">
                <h3>Rack Structure</h3>
                <RackFlowVisualization rackData={rack} />
            </div>

            {macros.length > 0 && (
                <div className="macro-controls">
                    <h3>Macro Controls</h3>
                    <div className="macro-list">
                        {macros.map((macro, index) => (
                            <div key={index} className="macro-item">
                                <div className="macro-name">M{macro.index + 1}: {macro.name}</div>
                                <div className="macro-value-display">
                                    <div className="macro-bar">
                                        <div
                                            className="macro-fill"
                                            style={{ width: `${(macro.value || 0) * 100}%` }}
                                        />
                                    </div>
                                    <span>{Math.round((macro.value || 0) * 100)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default RackDetails
