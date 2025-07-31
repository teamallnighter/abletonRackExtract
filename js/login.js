// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorDiv = document.getElementById('error-message');
        const successDiv = document.getElementById('success-message');
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Show success message
                successDiv.textContent = 'Login successful! Redirecting...';
                successDiv.classList.remove('hidden');
                
                // Redirect to profile or previous page
                setTimeout(() => {
                    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/profile';
                    window.location.href = redirect;
                }, 1000);
            } else {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });
});
