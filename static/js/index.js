// Inline JavaScript extracted from index.html
document.addEventListener('DOMContentLoaded', function() {
    const itemList = document.getElementById('item-list');
    const loadingMessage = document.getElementById('loading-message');

    // Simulate fetching data from an API
    async function fetchData() {
        loadingMessage.style.display = 'block';
        try {
            const response = await fetch('/api/items');
            const data = await response.json();

            if (response.ok) {
                renderItems(data);
            } else {
                showError('Failed to fetch items.');
            }
        } catch (error) {
            showError('An error occurred while fetching items.');
        }
        loadingMessage.style.display = 'none';
    }

    // Render items in the list
    function renderItems(items) {
        itemList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name;
            itemList.appendChild(li);
        });
    }

    // Display an error message
    function showError(message) {
        const errorMessage = document.createElement('div');
        errorMessage.textContent = message;
        errorMessage.className = 'error-message';
        document.body.appendChild(errorMessage);
    }

    // Initialize the page
    fetchData();
});

