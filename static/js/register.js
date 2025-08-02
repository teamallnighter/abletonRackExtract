// Register page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle register form submission
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorDiv = document.getElementById('error-message');
        const successDiv = document.getElementById('success-message');
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        // Validate passwords match
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: password
        };
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Store token and user info in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('email', data.user.email);
                localStorage.setItem('userId', data.user.id || data.user._id);
                
                // Show success message
                successDiv.textContent = 'Account created successfully! Redirecting...';
                successDiv.classList.remove('hidden');
                
                // Redirect to profile
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 1500);
            } else {
                errorDiv.textContent = data.error || 'Registration failed';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    });
});
