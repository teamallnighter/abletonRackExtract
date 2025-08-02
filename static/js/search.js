document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const rackGrid = document.getElementById('rack-grid');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    const loadingSpinner = document.getElementById('loading-spinner');
    const filterTagsContainer = document.getElementById('filter-tags-container');
    
    // Store selected tags
    let selectedTags = [];

    // Search function
    function performSearch(query) {
        if (!query) return;

        loadingSpinner.classList.remove('hidden');
        rackGrid.innerHTML = '';

        fetch(`/api/racks/search?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                loadingSpinner.classList.add('hidden');
                if (data.success && data.racks.length > 0) {
                    resultsCount.textContent = `${data.racks.length} results found`;
                    noResults.classList.add('hidden');
                    data.racks.forEach(rack => {
                        const rackElement = document.createElement('div');
                        rackElement.className = 'rack-card';
                        const description = rack.user_info?.description || rack.description || 'No description';
                        const producer = rack.user_info?.producer_name || rack.producer_name || 'Unknown';
                        const tags = rack.user_info?.tags || rack.tags || [];
                        
                        rackElement.innerHTML = `
                            <h3>${rack.rack_name || rack.filename}</h3>
                            <div class="rack-card-meta">by ${producer}</div>
                            <p class="rack-card-description">${description}</p>
                            ${tags.length > 0 ? `
                                <div class="rack-card-tags">
                                    ${tags.map(tag => `<span class="rack-card-tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                        `;
                        rackGrid.appendChild(rackElement);
                        // Add click event to open rack details
                        rackElement.addEventListener('click', function() {
                            window.location.href = `/rack/${rack._id}`;
                        });
                    });
                } else {
                    noResults.classList.remove('hidden');
                    resultsCount.textContent = '0 results found';
                }
            })
            .catch(error => {
                loadingSpinner.classList.add('hidden');
                console.error('Error during search:', error);
                resultsCount.textContent = 'Search failed';
            });
    }

    // Event listener for search button
    searchButton.addEventListener('click', function() {
        const query = searchInput.value.trim();
        performSearch(query);
    });

    // Enter key triggers search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    });
    
    // Load popular tags
    function loadPopularTags() {
        fetch('/api/tags/popular')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.tags) {
                    filterTagsContainer.innerHTML = data.tags.map(tag => `
                        <span class="filter-tag" data-tag="${tag._id}">${tag._id} (${tag.count})</span>
                    `).join('');
                    
                    // Add click handlers to tags
                    filterTagsContainer.querySelectorAll('.filter-tag').forEach(tagElement => {
                        tagElement.addEventListener('click', function() {
                            const tag = this.getAttribute('data-tag');
                            toggleTag(tag, this);
                        });
                    });
                }
            })
            .catch(error => console.error('Error loading tags:', error));
    }
    
    // Toggle tag selection
    function toggleTag(tag, element) {
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
            element.classList.remove('active');
        } else {
            selectedTags.push(tag);
            element.classList.add('active');
        }
        
        // Perform search with selected tags
        performSearchWithTags();
    }
    
    // Search with tags
    function performSearchWithTags() {
        if (selectedTags.length === 0) return;
        
        loadingSpinner.classList.remove('hidden');
        rackGrid.innerHTML = '';
        
        fetch('/api/racks/by-tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tags: selectedTags })
        })
            .then(response => response.json())
            .then(data => {
                loadingSpinner.classList.add('hidden');
                if (data.success && data.racks.length > 0) {
                    resultsCount.textContent = `${data.racks.length} results found`;
                    noResults.classList.add('hidden');
                    data.racks.forEach(rack => {
                        const rackElement = document.createElement('div');
                        rackElement.className = 'rack-card';
                        const description = rack.user_info?.description || rack.description || 'No description';
                        const producer = rack.user_info?.producer_name || rack.producer_name || 'Unknown';
                        const tags = rack.user_info?.tags || rack.tags || [];
                        
                        rackElement.innerHTML = `
                            <h3>${rack.rack_name || rack.filename}</h3>
                            <div class="rack-card-meta">by ${producer}</div>
                            <p class="rack-card-description">${description}</p>
                            ${tags.length > 0 ? `
                                <div class="rack-card-tags">
                                    ${tags.map(tag => `<span class="rack-card-tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                        `;
                        rackGrid.appendChild(rackElement);
                        // Add click event to open rack details
                        rackElement.addEventListener('click', function() {
                            window.location.href = `/rack/${rack._id}`;
                        });
                    });
                } else {
                    noResults.classList.remove('hidden');
                    resultsCount.textContent = '0 results found';
                }
            })
            .catch(error => {
                loadingSpinner.classList.add('hidden');
                console.error('Error searching by tags:', error);
                resultsCount.textContent = 'Search failed';
            });
    }
    
    // Initialize
    loadPopularTags();
});

