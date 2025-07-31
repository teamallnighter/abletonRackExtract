// home.js - Handles the home page functionality

document.addEventListener('DOMContentLoaded', function() {
    loadRecentRacks();
    loadPopularRacks();
    if (isLoggedIn()) {
        loadFavoriteRacks();
    } else {
        document.getElementById('favoriteRacks').innerHTML = '<p>Login to see your favorite racks</p>';
    }
});

function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

async function loadRecentRacks() {
    try {
        const response = await fetch('/api/racks?limit=10');
        const data = await response.json();
        
        if (data.success) {
            displayRacks(data.racks, 'recentRacks');
        }
    } catch (error) {
        console.error('Error loading recent racks:', error);
        document.getElementById('recentRacks').innerHTML = '<p>Error loading recent racks</p>';
    }
}

async function loadPopularRacks() {
    try {
        const response = await fetch('/api/racks/popular?limit=10');
        const data = await response.json();
        
        if (data.success) {
            displayRacks(data.racks, 'popularRacks');
        }
    } catch (error) {
        console.error('Error loading popular racks:', error);
        document.getElementById('popularRacks').innerHTML = '<p>Error loading popular racks</p>';
    }
}

async function loadFavoriteRacks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            displayRacks(data.favorites, 'favoriteRacks');
        }
    } catch (error) {
        console.error('Error loading favorite racks:', error);
        document.getElementById('favoriteRacks').innerHTML = '<p>Error loading favorite racks</p>';
    }
}

function displayRacks(racks, containerId) {
    const container = document.getElementById(containerId);
    
    if (!racks || racks.length === 0) {
        container.innerHTML = '<p>No racks found</p>';
        return;
    }
    
    container.innerHTML = '';
    
    racks.forEach(rack => {
        const li = document.createElement('li');
        li.className = 'rack-item';
        
        const rackLink = document.createElement('a');
        rackLink.href = `/rack/${rack._id}`;
        rackLink.className = 'rack-link';
        
        const rackName = document.createElement('span');
        rackName.className = 'rack-name';
        rackName.textContent = rack.name || rack.filename || 'Unnamed Rack';
        
        const rackInfo = document.createElement('span');
        rackInfo.className = 'rack-info';
        rackInfo.textContent = `${rack.chainCount || 0} chains, ${rack.deviceCount || 0} devices`;
        
        const rackMeta = document.createElement('div');
        rackMeta.className = 'rack-meta';
        
        if (rack.user_info?.producer_name) {
            const producer = document.createElement('span');
            producer.className = 'rack-producer';
            producer.textContent = `by ${rack.user_info.producer_name}`;
            rackMeta.appendChild(producer);
        }
        
        if (rack.downloads) {
            const downloads = document.createElement('span');
            downloads.className = 'rack-downloads';
            downloads.textContent = `${rack.downloads} downloads`;
            rackMeta.appendChild(downloads);
        }
        
        rackLink.appendChild(rackName);
        rackLink.appendChild(rackInfo);
        
        li.appendChild(rackLink);
        li.appendChild(rackMeta);
        
        container.appendChild(li);
    });
}
