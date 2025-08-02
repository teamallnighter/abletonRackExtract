document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const rackGrid = document.getElementById('rack-grid');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    const loadingSpinner = document.getElementById('loading-spinner');

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
                        rackElement.innerHTML = `
                            <h4>${rack.rack_name}</h4>
                            <p>${rack.description}</p>
                        `;
                        rackGrid.appendChild(rackElement);
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
});

