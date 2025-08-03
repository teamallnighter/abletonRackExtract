import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const Upload = () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [selectedFile, setSelectedFile] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        rackType: '',
        description: '',
        tags: []
    })
    const [popularTags, setPopularTags] = useState([])
    const [tagInput, setTagInput] = useState('')
    const [progress, setProgress] = useState(0)

    const { makeAuthenticatedRequest } = useAuth()
    const { addToast } = useToast()
    const navigate = useNavigate()

    useEffect(() => {
        loadPopularTags()
    }, [])

    const loadPopularTags = async () => {
        try {
            const response = await fetch('/api/tags/popular')
            const data = await response.json()

            if (data.success && data.tags) {
                setPopularTags(data.tags.slice(0, 10)) // Show top 10 popular tags
            }
        } catch (error) {
            console.error('Error loading popular tags:', error)
        }
    }

    const handleFileSelect = (file) => {
        const validTypes = ['adg', 'adv']
        const extension = file.name.split('.').pop().toLowerCase()

        if (!validTypes.includes(extension)) {
            addToast('Please select a valid .adg or .adv file', 'error')
            return
        }

        setSelectedFile(file)
        performInitialAnalysis(file)
    }

    const performInitialAnalysis = async (file) => {
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (data.success) {
                setAnalysis(data.analysis)
                setCurrentStep(2)
                addToast('File analyzed successfully!', 'success')
            } else {
                addToast(data.error || 'Analysis failed', 'error')
            }
        } catch (error) {
            console.error('Analysis error:', error)
            addToast('An error occurred during analysis', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const addTag = (tag) => {
        if (tag && !formData.tags.includes(tag)) {
            setFormData({
                ...formData,
                tags: [...formData.tags, tag]
            })
        }
        setTagInput('')
    }

    const removeTag = (tagToRemove) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        })
    }

    const handleTagInputKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const tag = tagInput.trim().toLowerCase()
            addTag(tag)
        }
    }

    const handleSubmit = async () => {
        if (!formData.rackType) {
            addToast('Please select a rack type', 'error')
            return
        }

        setLoading(true)
        setProgress(0)

        try {
            const uploadFormData = new FormData()
            uploadFormData.append('file', selectedFile)
            uploadFormData.append('rack_type', formData.rackType)

            if (formData.description) {
                uploadFormData.append('description', formData.description)
            }

            if (formData.tags.length > 0) {
                uploadFormData.append('tags', JSON.stringify(formData.tags))
            }

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90))
            }, 200)

            const response = await makeAuthenticatedRequest('/api/racks/upload', {
                method: 'POST',
                body: uploadFormData
            })

            clearInterval(progressInterval)
            setProgress(100)

            const data = await response.json()

            if (data.success) {
                addToast('Rack uploaded successfully!', 'success')
                navigate(`/rack/${data.rack_id}`)
            } else {
                addToast(data.error || 'Upload failed', 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            addToast('An error occurred during upload', 'error')
        } finally {
            setLoading(false)
            setProgress(0)
        }
    }

    const Step1 = () => (
        <div className="step">
            <h3>Step 1: Upload Rack File</h3>
            <div
                className="drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input').click()}
            >
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>
                    {selectedFile
                        ? `Selected: ${selectedFile.name}`
                        : 'Drop .adg or .adv files here or click to browse'
                    }
                </p>
                <input
                    type="file"
                    id="file-input"
                    accept=".adg,.adv"
                    hidden
                    onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                />
            </div>
        </div>
    )

    const Step2 = () => (
        <div className="step">
            <h3>Step 2: Add Basic Information</h3>

            <div className="form-group">
                <label htmlFor="rack-type">Rack Type <span className="required">*</span></label>
                <select
                    id="rack-type"
                    name="rackType"
                    value={formData.rackType}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select a type...</option>
                    <option value="Audio Effect Rack">Audio Effect Rack</option>
                    <option value="Instrument Rack">Instrument Rack</option>
                    <option value="MIDI Effect Rack">MIDI Effect Rack</option>
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    rows="4"
                    placeholder="Describe the purpose and functionality..."
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Tags</label>
                <div className="tag-input-container">
                    <div className="selected-tags">
                        {formData.tags.map(tag => (
                            <span key={tag} className="tag">
                                {tag}
                                <button
                                    type="button"
                                    className="remove-tag"
                                    onClick={() => removeTag(tag)}
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Add tags (e.g., reverb, delay, mixing)..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagInputKeyPress}
                    />
                </div>

                <div className="suggested-tags">
                    <span className="suggested-label">Popular tags:</span>
                    {popularTags.map(tag => (
                        <span
                            key={typeof tag === 'string' ? tag : tag._id}
                            className="tag-suggestion"
                            onClick={() => addTag(typeof tag === 'string' ? tag : tag._id)}
                        >
                            {typeof tag === 'string' ? tag : tag._id}
                        </span>
                    ))}
                </div>
            </div>

            <div className="form-actions">
                <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(1)}
                >
                    Back
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!formData.rackType}
                >
                    Upload Recipe
                </button>
            </div>
        </div>
    )

    const ProgressSection = () => (
        <div className="progress-section">
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p>Uploading... {progress}%</p>
        </div>
    )

    if (loading && currentStep === 1) {
        return (
            <div className="upload-container">
                <h1>Upload New Recipe</h1>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Analyzing file...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="upload-container">
            <h1>Upload New Recipe</h1>

            {analysis && (
                <div className="analysis-preview">
                    <h3>Analysis Preview</h3>
                    <p><strong>Rack Name:</strong> {analysis.rack_name}</p>
                    <p><strong>Chains:</strong> {analysis.chains?.length || 0}</p>
                    <p><strong>Devices:</strong> {analysis.chains?.reduce((sum, chain) => sum + (chain.devices?.length || 0), 0) || 0}</p>
                    <p><strong>Macros:</strong> {analysis.macro_controls?.length || 0}</p>
                </div>
            )}

            <div className="upload-section">
                {currentStep === 1 && <Step1 />}
                {currentStep === 2 && <Step2 />}
                {loading && currentStep === 2 && <ProgressSection />}
            </div>
        </div>
    )
}

export default Upload
