// JavaScript for dynamically loading racks on the home page
document.addEventListener('DOMContentLoaded', function() {
    const recentRacksList = document.getElementById('recentRacks');
    const popularRacksList = document.getElementById('popularRacks');
    const favoriteRacksList = document.getElementById('favoriteRacks');

    // Fetch and render racks
    async function fetchRacks(endpoint, listElement) {
        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            if (response.ok) {
                renderRacks(data.racks, listElement);
            } else {
                showError('Failed to fetch racks.');
            }
        } catch (error) {
            showError('An error occurred while fetching racks.');
        }
    }

    function renderRacks(racks, listElement) {
        listElement.innerHTML = '';
        racks.forEach(rack => {
            const li = document.createElement('li');
            li.textContent = rack.name;
            listElement.appendChild(li);
        });
    }

    function showError(message) {
        const errorMessage = document.createElement('div');
        errorMessage.textContent = message;
        errorMessage.className = 'error-message';
        document.body.appendChild(errorMessage);
    }

    // Initialize the page
    fetchRacks('/api/racks/recent', recentRacksList);
    fetchRacks('/api/racks/popular', popularRacksList);
    fetchRacks('/api/user/favorites', favoriteRacksList);
});

