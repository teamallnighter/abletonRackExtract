document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading');
    const chainsContainer = document.getElementById('chains-container');
    const rackNameElement = document.getElementById('rack-name');
    const rackStatsElement = document.getElementById('rack-stats');
    const userInfoForm = document.getElementById('user-info-form');
    const rackDescriptionInput = document.getElementById('rack-description');
    const tagInput = document.getElementById('tag-input');
    const selectedTagsDiv = document.getElementById('selected-tags');
    const tagSuggestionsDiv = document.getElementById('tag-suggestions');
    
    let selectedFile = null;
    let selectedTags = [];
    let popularTags = [];
    let currentSuggestionIndex = -1;

    // Handle file browsing
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle file drop
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length) analyzeFiles(files);
    });

    // Handle file input changes
    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length) analyzeFiles(files);
    });

    // Handle file selection
    function analyzeFiles(files) {
        if (files.length === 0) return;
        
        selectedFile = files[0];
        
        // Hide drop zone and show user info form
        dropZone.classList.add('hidden');
        userInfoForm.classList.remove('hidden');
    }
    
    // Handle Skip button
    document.getElementById('skip-info').addEventListener('click', () => {
        submitAnalysis();
    });
    
    // Handle Submit button
    document.getElementById('submit-info').addEventListener('click', () => {
        submitAnalysis();
    });
    
    // Submit analysis with optional user info
    function submitAnalysis() {
        if (!selectedFile) return;
        
        // Get rack type
        const rackTypeSelect = document.getElementById('rack-type');
        const rackType = rackTypeSelect.value;
        
        // Validate rack type is selected
        if (!rackType) {
            alert('Please select a recipe type');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('rack_type', rackType);
        
        // Add user info if provided
        const description = rackDescriptionInput.value.trim();
        
        if (description) {
            formData.append('description', description);
        }
        
        // Add tags if any selected
        if (selectedTags.length > 0) {
            formData.append('tags', JSON.stringify(selectedTags));
        }

        // Hide form and show loading
        userInfoForm.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        // Add JWT token if user is logged in
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        fetch('/api/analyze', {
            method: 'POST',
            headers: headers,
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                loadingIndicator.classList.add('hidden');
                dropZone.classList.remove('hidden');
            } else if (data.analysis) {
                displayResults(data.analysis, data); // Pass full data for additional info
                loadingIndicator.classList.add('hidden');
                resultsSection.classList.remove('hidden');
            } else {
                alert('Invalid response from server');
                loadingIndicator.classList.add('hidden');
                dropZone.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to analyze file. Is the backend running?');
            loadingIndicator.classList.add('hidden');
            dropZone.classList.remove('hidden');
        });
    }

    // Helper function to format rack names (replace underscores with spaces)
    function formatRackName(name) {
        if (!name) return name;
        return name.replace(/_/g, ' ');
    }
    
    // Display results
    function displayResults(analysis, fullData) {
        rackNameElement.textContent = formatRackName(analysis.rack_name || 'Unknown Rack');
        
        // Handle View Rack button
        const viewRackBtn = document.getElementById('view-rack');
        if (fullData && fullData.rack_id) {
            viewRackBtn.classList.remove('hidden');
            viewRackBtn.onclick = () => {
                window.location.href = `/rack/${fullData.rack_id}`;
            };
        } else {
            viewRackBtn.classList.add('hidden');
        }
        
        // Display user info if available
        const userInfoDisplay = document.getElementById('user-info-display');
        const producerInfo = document.getElementById('producer-info');
        const descriptionInfo = document.getElementById('description-info');
        const tagsDisplay = document.getElementById('tags-display');
        
        if (analysis.user_info) {
            userInfoDisplay.classList.remove('hidden');
            
            if (analysis.user_info.producer_name) {
                producerInfo.textContent = `Created by ${analysis.user_info.producer_name}`;
                producerInfo.style.display = 'block';
            } else {
                producerInfo.style.display = 'none';
            }
            
            if (analysis.user_info.description) {
                descriptionInfo.textContent = analysis.user_info.description;
                descriptionInfo.style.display = 'block';
            } else {
                descriptionInfo.style.display = 'none';
            }
            
            if (analysis.user_info.tags && analysis.user_info.tags.length > 0) {
                tagsDisplay.innerHTML = analysis.user_info.tags.map(tag => 
                    `<span class="tag">${tag}</span>`
                ).join('');
                tagsDisplay.style.display = 'flex';
            } else {
                tagsDisplay.style.display = 'none';
            }
        } else {
            userInfoDisplay.classList.add('hidden');
        }

        // Handle macros
        const macroControls = document.getElementById('macro-controls');
        const macroList = document.getElementById('macro-list');
        
        if (analysis.macro_controls && analysis.macro_controls.length > 0) {
            macroControls.classList.remove('hidden');
            macroList.innerHTML = analysis.macro_controls.map(macro => `
                <div class="macro-item">
                    <span>${macro.name}</span>
                </div>
            `).join('');
        } else {
            macroControls.classList.add('hidden');
        }

        // Set rack stats
        const totalDevices = countAllDevices(analysis.chains);
        rackStatsElement.innerHTML = `
            <span>Chains: ${analysis.chains.length}</span>
            <span>Devices: ${totalDevices}</span>
        `;

        // Display chains and devices
        chainsContainer.innerHTML = '';
        analysis.chains.forEach(chain => {
            const chainDiv = createChainElement(chain);
            chainsContainer.appendChild(chainDiv);
        });
    }

    // Create chain element
    function createChainElement(chain) {
        const chainDiv = document.createElement('div');
        chainDiv.className = 'chain';
        
        const chainHeader = document.createElement('div');
        chainHeader.className = 'chain-header';
        chainHeader.textContent = chain.name;
        chainDiv.appendChild(chainHeader);
        
        const devicesDiv = document.createElement('div');
        devicesDiv.className = 'devices';
        
        chain.devices.forEach(device => {
            const deviceDiv = createDeviceElement(device);
            devicesDiv.appendChild(deviceDiv);
        });
        
        chainDiv.appendChild(devicesDiv);
        return chainDiv;
    }

    // Create device element
    function createDeviceElement(device) {
        const deviceDiv = document.createElement('div');
        deviceDiv.className = 'device' + (!device.is_on ? ' off' : '');
        
        const deviceName = document.createElement('div');
        deviceName.className = 'device-name';
        deviceName.textContent = device.name;
        deviceDiv.appendChild(deviceName);
        
        // Show preset name if available
        if (device.preset_name) {
            const presetName = document.createElement('div');
            presetName.className = 'device-type';
            presetName.textContent = `Preset: ${device.preset_name}`;
            deviceDiv.appendChild(presetName);
        }
        
        // Handle nested racks
        if (device.chains && device.chains.length > 0) {
            const nestedRack = document.createElement('div');
            nestedRack.className = 'nested-rack';
            device.chains.forEach(nestedChain => {
                const nestedChainDiv = createChainElement(nestedChain);
                nestedRack.appendChild(nestedChainDiv);
            });
            deviceDiv.appendChild(nestedRack);
        }
        
        return deviceDiv;
    }

    // Count all devices including nested
    function countAllDevices(chains) {
        let count = 0;
        chains.forEach(chain => {
            chain.devices.forEach(device => {
                count++;
                if (device.chains) {
                    count += countAllDevices(device.chains);
                }
            });
        });
        return count;
    }

    // Handle "Analyze Another" button
    document.getElementById('analyze-another').addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        fileInput.value = '';
        selectedFile = null;
        rackDescriptionInput.value = '';
        selectedTags = [];
        renderTags();
        dropZone.classList.remove('hidden');
    });

    // Handle "Export JSON" button
    document.getElementById('export-json').addEventListener('click', () => {
        const data = {
            rack_name: rackNameElement.textContent,
            // You'd need to store the full data for export
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rack-analysis.json';
        a.click();
    });
    
    // Tag System Functions
    function initTagSystem() {
        // Load popular tags on startup
        loadPopularTags();
        
        // Handle tag input
        tagInput.addEventListener('input', handleTagInput);
        tagInput.addEventListener('keydown', handleTagKeydown);
        tagInput.addEventListener('focus', () => {
            if (tagInput.value.trim()) {
                showTagSuggestions(tagInput.value);
            }
        });
        tagInput.addEventListener('blur', () => {
            // Delay to allow clicking on suggestions
            setTimeout(() => tagSuggestionsDiv.classList.add('hidden'), 200);
        });
        
        // Handle clicking on popular tags
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                addTag(tag.dataset.tag);
            });
        });
    }
    
    function loadPopularTags() {
        // Fetch popular tags from API
        fetch('/api/tags/popular')
            .then(response => response.json())
            .then(data => {
                if (data.tags) {
                    popularTags = data.tags;
                }
            })
            .catch(() => {
                // Use default popular tags if API fails
                popularTags = [
                    { name: 'mixing', count: 0 },
                    { name: 'mastering', count: 0 },
                    { name: 'reverb', count: 0 },
                    { name: 'delay', count: 0 },
                    { name: 'distortion', count: 0 },
                    { name: 'eq', count: 0 },
                    { name: 'compression', count: 0 },
                    { name: 'stereo-width', count: 0 },
                    { name: 'resampling', count: 0 },
                    { name: 'glitch', count: 0 }
                ];
            });
    }
    
    function handleTagInput(e) {
        const value = e.target.value.trim();
        if (value) {
            showTagSuggestions(value);
        } else {
            tagSuggestionsDiv.classList.add('hidden');
        }
    }
    
    function handleTagKeydown(e) {
        const suggestions = tagSuggestionsDiv.querySelectorAll('.tag-suggestion-item');
        
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                if (currentSuggestionIndex >= 0 && suggestions[currentSuggestionIndex]) {
                    const tagName = suggestions[currentSuggestionIndex].dataset.tag;
                    addTag(tagName);
                } else if (tagInput.value.trim()) {
                    addTag(tagInput.value.trim());
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
                updateSuggestionSelection(suggestions);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
                updateSuggestionSelection(suggestions);
                break;
                
            case 'Escape':
                tagSuggestionsDiv.classList.add('hidden');
                currentSuggestionIndex = -1;
                break;
        }
    }
    
    function updateSuggestionSelection(suggestions) {
        suggestions.forEach((item, index) => {
            if (index === currentSuggestionIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    function showTagSuggestions(query) {
        // Filter existing tags and popular tags
        const lowerQuery = query.toLowerCase();
        const suggestions = popularTags
            .filter(tag => tag.name.toLowerCase().includes(lowerQuery) && !selectedTags.includes(tag.name))
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            tagSuggestionsDiv.innerHTML = suggestions.map((tag, index) => `
                <div class="tag-suggestion-item" data-tag="${tag.name}" data-index="${index}">
                    ${tag.name}
                    ${tag.count > 0 ? `<span class="tag-count">${tag.count}</span>` : ''}
                </div>
            `).join('');
            
            // Add click handlers
            tagSuggestionsDiv.querySelectorAll('.tag-suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    addTag(item.dataset.tag);
                });
            });
            
            tagSuggestionsDiv.classList.remove('hidden');
        } else {
            tagSuggestionsDiv.classList.add('hidden');
        }
        
        currentSuggestionIndex = -1;
    }
    
    function addTag(tagName) {
        const normalizedTag = tagName.trim().toLowerCase();
        if (normalizedTag && !selectedTags.includes(normalizedTag)) {
            selectedTags.push(normalizedTag);
            renderTags();
        }
        tagInput.value = '';
        tagSuggestionsDiv.classList.add('hidden');
        currentSuggestionIndex = -1;
    }
    
    function removeTag(tagName) {
        selectedTags = selectedTags.filter(tag => tag !== tagName);
        renderTags();
    }
    
    function renderTags() {
        selectedTagsDiv.innerHTML = selectedTags.map(tag => `
            <span class="tag">
                ${tag}
                <span class="remove-tag" data-tag="${tag}">×</span>
            </span>
        `).join('');
        
        // Add remove handlers
        selectedTagsDiv.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                removeTag(btn.dataset.tag);
            });
        });
    }
    
    // Initialize tag system
    initTagSystem();
});
