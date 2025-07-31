// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Fetching user info from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Redirect to login if not authenticated
    if (!user || !token) {
        window.location.href = '/login';
        return;
    }

    // Display user greeting
    const greetingDiv = document.getElementById('greeting');
    greetingDiv.textContent = `Welcome, ${user.username}!`;

    // Fetch user racks
    async function fetchUserRacks() {
        try {
            const response = await fetch('/api/user/racks', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                greetingDiv.textContent = 'Failed to fetch racks.';
                return;
            }

            const data = await response.json();
            const rackList = document.getElementById('rack-list');
            const noRacksMessage = document.getElementById('no-racks-message');
            
            // Clear loading message
            rackList.innerHTML = '';
            
            if (data.racks && data.racks.length > 0) {
                data.racks.forEach(rack => {
                    const rackItem = document.createElement('div');
                    rackItem.classList.add('rack-item');
                    rackItem.classList.add('clickable');
                    
                    rackItem.innerHTML = `
                        <h3>${rack.rack_name ? rack.rack_name.replace(/_/g, ' ') : rack.filename.replace(/_/g, ' ')}</h3>
                        <div class="rack-info">
                            <span>Uploaded: ${new Date(rack.created_at).toLocaleString()}</span><br>
                            <span>Chains: ${rack.stats?.total_chains || 0} | Devices: ${rack.stats?.total_devices || 0}</span>
                        </div>
                    `;
                    
                    // Make rack clickable
                    rackItem.onclick = () => {
                        window.location.href = `/rack/${rack._id}`;
                    };
                    
                    rackList.appendChild(rackItem);
                });
            } else {
                rackList.innerHTML = '<p class="no-racks-message">You haven\'t uploaded any racks yet.</p>';
            }
            
        } catch (error) {
            greetingDiv.textContent = 'Error loading racks.';
        }
    }

    // Logout function
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }

    // Fetch racks on page load
    fetchUserRacks();
});
