// upload.js - Handles file upload functionality

let selectedFile = null;
let selectedTags = [];

document.addEventListener('DOMContentLoaded', function() {
    setupDropZone();
    setupTagInput();
    setupUploadButton();
    setupNavigation();
});

function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['adg', 'adv'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(extension)) {
        alert('Please select a valid .adg or .adv file');
        return;
    }
    
    selectedFile = file;
    // Update the drop zone to show file name
    const dropZone = document.getElementById('drop-zone');
    dropZone.querySelector('p').textContent = `Selected: ${file.name}`;
    
    // Immediately start the analysis
    performInitialAnalysis();
}

function setupTagInput() {
    const tagInput = document.getElementById('tag-input');
    const tagSuggestions = document.getElementById('tag-suggestions');
    const selectedTagsDiv = document.getElementById('selected-tags');
    
    // Load popular tags
    loadPopularTags();
    
    // Handle tag input
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = tagInput.value.trim().toLowerCase();
            if (tag && !selectedTags.includes(tag)) {
                addTag(tag);
                tagInput.value = '';
            }
        }
    });
    
    // Handle tag suggestions
    tagInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 1) {
            // Show filtered suggestions
            showTagSuggestions(query);
        } else {
            tagSuggestions.style.display = 'none';
        }
    });
    
    // Handle clicks on popular tags
    document.querySelectorAll('.suggested-tags .tag-suggestion').forEach(tagEl => {
        tagEl.addEventListener('click', function() {
            const tag = this.getAttribute('data-tag');
            if (tag && !selectedTags.includes(tag)) {
                addTag(tag);
            }
        });
    });
}

function addTag(tag) {
    selectedTags.push(tag);
    updateSelectedTagsDisplay();
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    updateSelectedTagsDisplay();
}

// Make removeTag available globally for onclick handlers
window.removeTag = removeTag;
window.selectSuggestion = selectSuggestion;

function updateSelectedTagsDisplay() {
    const selectedTagsDiv = document.getElementById('selected-tags');
    selectedTagsDiv.innerHTML = selectedTags.map(tag => `
        <span class="tag">
            ${tag}
            <button onclick="removeTag('${tag}')" class="remove-tag">&times;</button>
        </span>
    `).join('');
}

async function loadPopularTags() {
    try {
        const response = await fetch('/api/tags/popular');
        const data = await response.json();
        
        if (data.success && data.tags) {
            // Store for suggestions
            window.popularTags = data.tags;
        }
    } catch (error) {
        console.error('Error loading popular tags:', error);
    }
}

function showTagSuggestions(query) {
    const tagSuggestions = document.getElementById('tag-suggestions');
    const suggestions = (window.popularTags || [])
        .map(tag => typeof tag === 'string' ? tag : tag.name)
        .filter(tag => tag && tag.toLowerCase().includes(query) && !selectedTags.includes(tag))
        .slice(0, 5);
    
    if (suggestions.length > 0) {
        tagSuggestions.innerHTML = suggestions.map(tag => `
            <div class="tag-suggestion" onclick="selectSuggestion('${tag}')">${tag}</div>
        `).join('');
        tagSuggestions.style.display = 'block';
    } else {
        tagSuggestions.style.display = 'none';
    }
}

function selectSuggestion(tag) {
    addTag(tag);
    document.getElementById('tag-input').value = '';
    document.getElementById('tag-suggestions').style.display = 'none';
}

function setupUploadButton() {
    // Setup submit and skip buttons
    const submitBtn = document.getElementById('submit-info');
    const skipBtn = document.getElementById('skip-info');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', completeUpload);
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            // Skip additional info and save with minimal metadata
            completeUpload(true);
        });
    }
}

async function performInitialAnalysis() {
    if (!selectedFile) {
        alert('Please select a file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
// Advance to Step 2
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        const data = await response.json();
        console.log('Initial analysis response:', data); // Debug log
        
        if (data.success) {
            // Store analysis result for later completion
            window.analysisResult = data;
            
            // Analysis complete, user is already on step 2
            document.getElementById('progressSection').style.display = 'none';
        } else {
            throw new Error(data.error || 'Initial analysis failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Initial analysis failed: ' + error.message);
        document.getElementById('progressSection').style.display = 'none';
        // Stay on step 2 if analysis fails
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
    }
}

function setupNavigation() {
    const nextToStep3Btn = document.getElementById('next-to-step-3');
    const backToStep2Btn = document.getElementById('back-to-step-2');
    const finalSubmitBtn = document.getElementById('final-submit');

    if (nextToStep3Btn) {
        nextToStep3Btn.addEventListener('click', function() {
            // Validate step 2 inputs before proceeding
            const rackType = document.getElementById('rack-type').value;
            if (!rackType) {
                alert('Please select a rack type.');
                return;
            }
            
            // Move to step 3 and populate it with analysis data
            document.getElementById('step-2').style.display = 'none';
            document.getElementById('step-3').style.display = 'block';
            populateStep3();
        });
    }

    if (backToStep2Btn) {
        backToStep2Btn.addEventListener('click', function() {
            document.getElementById('step-3').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
        });
    }

    if (finalSubmitBtn) {
        finalSubmitBtn.addEventListener('click', completeUpload);
    }
}

function collectStep3Data() {
    const analysis = window.analysisResult.analysis;
    const detailedInfo = {
        chains: [],
        devices: [],
        macros: []
    };
    
    // Collect chain data
    if (analysis.chains) {
        analysis.chains.forEach((chain, index) => {
            const nameInput = document.getElementById(`chain-name-${index}`);
            const descInput = document.getElementById(`chain-desc-${index}`);
            if (nameInput || descInput) {
                detailedInfo.chains.push({
                    index: index,
                    name: nameInput ? nameInput.value : chain.name,
                    description: descInput ? descInput.value : ''
                });
            }
        });
    }
    
    // Collect device data
    if (analysis.devices) {
        analysis.devices.forEach((device, index) => {
            const nameInput = document.getElementById(`device-name-${index}`);
            const descInput = document.getElementById(`device-desc-${index}`);
            if (nameInput || descInput) {
                detailedInfo.devices.push({
                    index: index,
                    name: nameInput ? nameInput.value : device.name,
                    description: descInput ? descInput.value : ''
                });
            }
        });
    }
    
    // Collect macro data
    if (analysis.macros) {
        analysis.macros.forEach((macro, index) => {
            const nameInput = document.getElementById(`macro-name-${index}`);
            const descInput = document.getElementById(`macro-desc-${index}`);
            if (nameInput || descInput) {
                detailedInfo.macros.push({
                    index: index,
                    name: nameInput ? nameInput.value : macro.name,
                    description: descInput ? descInput.value : ''
                });
            }
        });
    }
    
    return detailedInfo;
}

function populateStep3() {
    if (!window.analysisResult || !window.analysisResult.analysis) {
        return;
    }
    
    const analysis = window.analysisResult.analysis;
    const step3 = document.getElementById('step-3');
    
    // Clear any previous content
    const existingContent = step3.querySelector('.rack-details-container');
    if (existingContent) {
        existingContent.remove();
    }
    
    let detailsHtml = '<div class="rack-details-container">';
    
    // Add rack visualization
    detailsHtml += `
        <div class="rack-preview">
            <h4>Rack Structure</h4>
            <div class="rack-stats">
                <span class="stat-badge">${analysis.chains ? analysis.chains.length : 0} Chains</span>
                <span class="stat-badge">${analysis.devices ? analysis.devices.length : 0} Devices</span>
                <span class="stat-badge">${analysis.macros ? analysis.macros.length : 0} Macros</span>
            </div>
            <div class="chains-visualization">
    `;
    
    // Show chain structure visually
    if (analysis.chains && analysis.chains.length > 0) {
        analysis.chains.forEach((chain, chainIndex) => {
            detailsHtml += `
                <div class="chain-preview">
                    <div class="chain-header">Chain ${chainIndex + 1}: ${chain.name || 'Chain ' + (chainIndex + 1)}</div>
                    <div class="devices-in-chain">
            `;
            
            // Show devices in this chain
            if (chain.devices && chain.devices.length > 0) {
                chain.devices.forEach((device, deviceIndex) => {
                    detailsHtml += `<div class="device-block">${device.name || 'Device'}</div>`;
                });
            } else {
                detailsHtml += `<div class="empty-chain">No devices</div>`;
            }
            
            detailsHtml += `
                    </div>
                </div>
            `;
        });
    }
    
    detailsHtml += `
            </div>
        </div>
    `;
    
    // Add editable sections
    detailsHtml += '<div class="editable-sections">';
    
    // Add chains section
    if (analysis.chains && analysis.chains.length > 0) {
        detailsHtml += '<div class="details-section"><h4>Chain Names & Descriptions</h4>';
        analysis.chains.forEach((chain, index) => {
            detailsHtml += `
                <div class="form-group chain-edit">
                    <label>Chain ${index + 1}</label>
                    <input type="text" id="chain-name-${index}" value="${chain.name || ''}" placeholder="Enter chain name">
                    <textarea id="chain-desc-${index}" rows="2" placeholder="Describe what this chain does..."></textarea>
                </div>
            `;
        });
        detailsHtml += '</div>';
    }
    
    // Add devices section
    if (analysis.devices && analysis.devices.length > 0) {
        detailsHtml += '<div class="details-section"><h4>Device Names & Descriptions</h4>';
        analysis.devices.forEach((device, index) => {
            detailsHtml += `
                <div class="form-group device-edit">
                    <label>${device.name || 'Device ' + (index + 1)}</label>
                    <input type="text" id="device-name-${index}" value="${device.name || ''}" placeholder="Enter device name">
                    <textarea id="device-desc-${index}" rows="2" placeholder="Describe device settings or purpose..."></textarea>
                </div>
            `;
        });
        detailsHtml += '</div>';
    }
    
    // Add macros section
    if (analysis.macros && analysis.macros.length > 0) {
        detailsHtml += '<div class="details-section"><h4>Macro Names & Descriptions</h4>';
        analysis.macros.forEach((macro, index) => {
            detailsHtml += `
                <div class="form-group macro-edit">
                    <label>Macro ${index + 1}</label>
                    <input type="text" id="macro-name-${index}" value="${macro.name || ''}" placeholder="Enter macro name">
                    <textarea id="macro-desc-${index}" rows="2" placeholder="Describe what this macro controls..."></textarea>
                </div>
            `;
        });
        detailsHtml += '</div>';
    }
    
    detailsHtml += '</div></div>'; // Close editable-sections and rack-details-container
    
    // Insert the HTML before the form actions
    const formActions = step3.querySelector('.form-actions');
    const container = document.createElement('div');
    container.innerHTML = detailsHtml;
    step3.insertBefore(container, formActions);
}

async function completeUpload() {
    if (!window.analysisResult) {
        alert('Please complete the initial analysis first.');
        return;
    }
    
    // Collect data from step 3
    const detailedInfo = collectStep3Data();
    
    const userInfo = {
        rack_type: document.getElementById('rack-type').value,
        description: document.getElementById('rack-description').value,
        tags: selectedTags,
        chains: detailedInfo.chains,
        devices: detailedInfo.devices,
        macros: detailedInfo.macros
    };
    
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('step-3').style.display = 'none';
    
    try {
        const response = await fetch('/api/analyze/complete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                analysis: window.analysisResult.analysis,
                filename: window.analysisResult.filename,
                file_content: window.analysisResult.file_content,
                user_info: userInfo
            })
        });

        const data = await response.json();
        console.log('Completion response:', data); // Debug log

        if (data.success) {
            document.getElementById('progressText').textContent = 'Analysis completed! Redirecting...';
            console.log('Redirecting to:', `/rack/${data.rack_id}`);
            setTimeout(() => {
                window.location.href = `/rack/${data.rack_id}`;
            }, 1500);
        } else {
            throw new Error(data.error || 'Completion failed');
        }
    } catch (error) {
        console.error('Completion error:', error);
        alert('Completion failed: ' + error.message);
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('user-info-form').style.display = 'block';
    }
}
