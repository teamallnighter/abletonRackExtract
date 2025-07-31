// Navigation menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    const navUser = document.getElementById('navUser');
    
    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Update user menu based on authentication status
    function updateUserMenu() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        if (token && username) {
            // User is logged in
            navUser.innerHTML = `
                <div class="nav-dropdown">
                    <button class="nav-link dropdown-toggle">
                        <span class="user-icon">👨‍🍳</span>
                        <span>${username}</span>
                    </button>
                    <div class="dropdown-menu">
                        <a href="/profile" class="dropdown-item">My Kitchen</a>
                        <a href="#" class="dropdown-item upload-btn">Upload Recipe</a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item logout-btn">Logout</a>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const uploadBtn = navUser.querySelector('.upload-btn');
            const logoutBtn = navUser.querySelector('.logout-btn');
            
            if (uploadBtn) {
                uploadBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    // Scroll to upload section or open upload modal
                    const uploadSection = document.getElementById('uploadSection');
                    if (uploadSection) {
                        uploadSection.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    logout();
                });
            }
        } else {
            // User is not logged in
            navUser.innerHTML = `
                <a href="/login" class="nav-link">Login</a>
                <a href="/register" class="nav-link nav-register">Join the Kitchen</a>
            `;
        }
    }
    
    // Handle dropdown menu
    document.addEventListener('click', function(e) {
        const dropdown = document.querySelector('.nav-dropdown');
        if (dropdown) {
            const isClickInside = dropdown.contains(e.target);
            const dropdownMenu = dropdown.querySelector('.dropdown-menu');
            
            if (isClickInside && e.target.closest('.dropdown-toggle')) {
                dropdownMenu.classList.toggle('show');
            } else if (!isClickInside) {
                dropdownMenu.classList.remove('show');
            }
        }
    });
    
    // Logout function
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('userId');
        
        // Show logout message
        showNotification('You have been logged out successfully', 'success');
        
        // Redirect to home after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Highlight active page
    function highlightActivePage() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
    
    // Initialize
    updateUserMenu();
    highlightActivePage();
    
    // Listen for auth changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'token' || e.key === 'username') {
            updateUserMenu();
        }
    });
});
