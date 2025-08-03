// Rack details page functionality
document.addEventListener('DOMContentLoaded', function () {
    let currentRackData = null;

    // Helper function to format rack names (replace underscores with spaces)
    function formatRackName(name) {
        if (!name) return name;
        return name.replace(/_/g, ' ');
    }

    // Get rack ID from URL
    function getRackId() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    // Load rack details
    async function loadRackDetails() {
        const rackId = getRackId();
        console.log('Loading rack with ID:', rackId); // Debug log

        try {
            const response = await fetch(`/api/racks/${rackId}`);
            console.log('API response status:', response.status); // Debug log
            const data = await response.json();
            console.log('API response data:', data); // Debug log

            if (!data.success || !data.rack) {
                showError();
                return;
            }

            const rack = data.rack;
            currentRackData = rack;

            // Update page title with formatted name
            const displayName = formatRackName(rack.rack_name || rack.filename);
            document.title = `${displayName} - Ableton Rack Analyzer`;

            // Update rack content with formatted name
            document.getElementById('rack-name').textContent = displayName;
            document.getElementById('producer').textContent = rack.user_info?.producer_name || 'Unknown';
            document.getElementById('date').textContent = new Date(rack.created_at).toLocaleDateString();
            document.getElementById('type').textContent = rack.analysis?.rack_type || 'Audio Effect Rack';
            document.getElementById('description').textContent = rack.user_info?.description || 'No description provided';

            // Render tags
            const tags = rack.tags || rack.user_info?.tags || [];
            const tagsContainer = document.getElementById('tags');
            if (tags.length > 0) {
                tagsContainer.innerHTML = `
                    <h4 class="tags-header">Tags</h4>
                    <div class="tags-container">
                        ${tags.map(tag => `<span class="rack-card-tag">${tag}</span>`).join('')}
                    </div>
                `;
            } else {
                tagsContainer.innerHTML = '';
            }

            // Update stats
            const chains = rack.analysis?.chains || [];
            const totalDevices = rack.stats?.total_devices || chains.reduce((sum, chain) => sum + (chain.devices?.length || 0), 0);
            const macros = rack.analysis?.macro_controls || [];

            document.getElementById('stat-chains').textContent = chains.length;
            document.getElementById('stat-devices').textContent = totalDevices;
            document.getElementById('stat-macros').textContent = macros.length;

            // Render rack visualization using the new RackVisualizer
            renderRackVisualization(rack);

            // Show content
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('rack-content').classList.remove('hidden');

        } catch (error) {
            console.error('Failed to load rack details:', error);
            showError();
        }
    }

    // Show error state
    function showError() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error-content').classList.remove('hidden');
    }

    // Render rack visualization using RackVisualizer
    function renderRackVisualization(rack) {
        const container = document.getElementById('rack-visualizer');

        if (!container) {
            console.error('Rack visualizer container not found');
            return;
        }

        // Create the rack visualizer instance
        const visualizer = new RackVisualizer(container);

        // Render the rack
        visualizer.render(rack);
    }

    // Download ADG file
    window.downloadADG = function () {
        if (!currentRackData || !currentRackData._id) return;

        const link = document.createElement('a');
        link.href = `/api/racks/${currentRackData._id}/download`;
        link.download = currentRackData.filename || 'rack.adg';
        link.click();
    }

    // Download JSON
    window.downloadJSON = function () {
        if (!currentRackData) return;

        const dataStr = JSON.stringify(currentRackData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentRackData.filename || 'rack'}_analysis.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Initialize
    loadRackDetails();
});

