// upload.js - Handles file upload functionality

let selectedFile = null;
let selectedTags = [];

document.addEventListener('DOMContentLoaded', function() {
    setupDropZone();
    setupTagInput();
    setupUploadButton();
});

function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['adg', 'adv'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(extension)) {
        alert('Please select a valid .adg or .adv file');
        return;
    }
    
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('uploadBtn').disabled = false;
}

function setupTagInput() {
    const tagInput = document.getElementById('tagInput');
    const tagSuggestions = document.getElementById('tagSuggestions');
    const selectedTagsDiv = document.getElementById('selectedTags');
    
    // Load popular tags
    loadPopularTags();
    
    // Handle tag input
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = tagInput.value.trim().toLowerCase();
            if (tag && !selectedTags.includes(tag)) {
                addTag(tag);
                tagInput.value = '';
            }
        }
    });
    
    // Handle tag suggestions
    tagInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 1) {
            // Show filtered suggestions
            showTagSuggestions(query);
        } else {
            tagSuggestions.style.display = 'none';
        }
    });
}

function addTag(tag) {
    selectedTags.push(tag);
    updateSelectedTagsDisplay();
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    updateSelectedTagsDisplay();
}

function updateSelectedTagsDisplay() {
    const selectedTagsDiv = document.getElementById('selectedTags');
    selectedTagsDiv.innerHTML = selectedTags.map(tag => `
        <span class="tag">
            ${tag}
            <button onclick="removeTag('${tag}')" class="remove-tag">&times;</button>
        </span>
    `).join('');
}

async function loadPopularTags() {
    try {
        const response = await fetch('/api/tags/popular');
        const data = await response.json();
        
        if (data.success && data.tags) {
            // Store for suggestions
            window.popularTags = data.tags;
        }
    } catch (error) {
        console.error('Error loading popular tags:', error);
    }
}

function showTagSuggestions(query) {
    const tagSuggestions = document.getElementById('tagSuggestions');
    const suggestions = (window.popularTags || [])
        .filter(tag => tag.toLowerCase().includes(query) && !selectedTags.includes(tag))
        .slice(0, 5);
    
    if (suggestions.length > 0) {
        tagSuggestions.innerHTML = suggestions.map(tag => `
            <div class="tag-suggestion" onclick="selectSuggestion('${tag}')">${tag}</div>
        `).join('');
        tagSuggestions.style.display = 'block';
    } else {
        tagSuggestions.style.display = 'none';
    }
}

function selectSuggestion(tag) {
    addTag(tag);
    document.getElementById('tagInput').value = '';
    document.getElementById('tagSuggestions').style.display = 'none';
}

function setupUploadButton() {
    document.getElementById('uploadBtn').addEventListener('click', uploadFile);
}

async function uploadFile() {
    if (!selectedFile) {
        alert('Please select a file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('description', document.getElementById('description').value);
    formData.append('tags', JSON.stringify(selectedTags));
    
    // Show progress
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('uploadBtn').disabled = true;
    
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success and redirect to rack page
            document.getElementById('progressText').textContent = 'Upload successful! Redirecting...';
            setTimeout(() => {
                window.location.href = `/rack/${data.rack_id}`;
            }, 1500);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('uploadBtn').disabled = false;
    }
}
