document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ocr-form');
    const apiKeyInput = document.getElementById('api-key');
    const fileInput = document.getElementById('pdf-files');
    const apiKeyToggle = document.getElementById('api-key-toggle');
    const submitBtn = document.getElementById('submit-btn');
    const statusLog = document.getElementById('status-log');
    const loader = document.getElementById('loader');

    // Page separator elements
    const includeSeparatorCheckbox = document.getElementById('include-separator');
    const separatorTextInput = document.getElementById('separator-text');
    
    // API Key elements
    const apiKeyGroup = document.getElementById('api-key-group');
    const apiKeyConfigured = document.getElementById('api-key-configured');

    // Result Areas
    const resultsArea = document.getElementById('results-area');
    const downloadLinksList = document.getElementById('download-links');
    const previewArea = document.getElementById('preview-area'); // New preview area
    const previewContent = document.getElementById('preview-content'); // Container for previews

    // Error Area
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');
    
    // Check if API key is configured in environment
    async function checkApiKey() {
        try {
            const response = await fetch('/check-api-key');
            const result = await response.json();
            if (result.has_api_key) {
                // Hide API key input, show configured message
                apiKeyGroup.style.display = 'none';
                apiKeyConfigured.style.display = 'block';
                logStatus('API Key loaded from environment variables.');
            } else {
                // Show API key input
                apiKeyGroup.style.display = 'block';
                apiKeyConfigured.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            // Default to showing input if check fails
            apiKeyGroup.style.display = 'block';
            apiKeyConfigured.style.display = 'none';
        }
    }
    
    // Check API key on page load
    checkApiKey();

    if (includeSeparatorCheckbox && separatorTextInput) {
        separatorTextInput.disabled = !includeSeparatorCheckbox.checked;
        includeSeparatorCheckbox.addEventListener('change', () => {
            separatorTextInput.disabled = !includeSeparatorCheckbox.checked;
        });
    }

    function logStatus(message) {
        console.log(message);
        statusLog.textContent += message + '\n';
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    function resetUI() {
        statusLog.textContent = '';
        resultsArea.style.display = 'none';
        downloadLinksList.innerHTML = '';
        previewArea.style.display = 'none';   // Hide preview area
        previewContent.innerHTML = '';        // Clear preview content
        errorArea.style.display = 'none';
        errorMessage.textContent = '';
        submitBtn.disabled = false;
        loader.style.display = 'none';
    }

    // --- Function to render preview ---
    function renderPreview(resultItem, sessionId) {
        if (!resultItem.preview) return;

        const previewContainer = document.createElement('div');
        previewContainer.classList.add('preview-item');
        previewContainer.classList.add('collapsed'); // Initially collapse

        const title = document.createElement('h3');
        title.textContent = `Preview for: ${resultItem.original_filename}`;
        previewContainer.appendChild(title);

        // --- Create the TOGGLE element ---
        const toggleButton = document.createElement('div');
        toggleButton.classList.add('preview-toggle');
        toggleButton.textContent = 'Show/Hide Preview'; // Initial text (will be updated by CSS)
        previewContainer.appendChild(toggleButton);



        // --- Create the INNER CONTENT div (that will be shown/hidden) ---
        const contentInner = document.createElement('div');
        contentInner.classList.add('preview-content-inner');


        // --- Markdown Preview ---
        const markdownSection = document.createElement('div');
        markdownSection.classList.add('markdown-preview');
        const markdownTitle = document.createElement('h4');
        markdownTitle.textContent = 'Markdown Content';
        markdownSection.appendChild(markdownTitle);

        let markdownForDisplay = resultItem.preview.markdown;

        markdownForDisplay = markdownForDisplay.replace(
            /!\[\[(.*?)\]\]/g,
            (match, filename) => {
                const imageUrl = `/view_image/${sessionId}/${resultItem.preview.pdf_base}/${filename.trim()}`;
                const safeAltText = filename.trim().replace(/"/g, '"');
                return `<img src="${imageUrl}" alt="${safeAltText}" style="max-width: 90%; height: auto; display: block; margin: 10px 0; border: 1px solid #ccc;">`;
            }
        );

        if (typeof marked !== 'undefined') {
            const renderedMarkdownDiv = document.createElement('div');
            renderedMarkdownDiv.innerHTML = marked.parse(markdownForDisplay);
            markdownSection.appendChild(renderedMarkdownDiv);
        } else {
            logStatus("Warning: Marked.js library not found. Falling back to raw Markdown preview.");
            const markdownPre = document.createElement('pre');
            markdownPre.textContent = markdownForDisplay;
            markdownSection.appendChild(markdownPre);
        }

        contentInner.appendChild(markdownSection);


        // --- Image Preview (Optional: List images separately) ---
        if (resultItem.preview.images && resultItem.preview.images.length > 0) {
            const imageSection = document.createElement('div');
            imageSection.classList.add('image-preview');
            const imageTitle = document.createElement('h4');
            imageTitle.textContent = 'Extracted Images (Gallery)';
            imageSection.appendChild(imageTitle);

            resultItem.preview.images.forEach(imageFilename => {
                const img = document.createElement('img');
                img.src = `/view_image/${sessionId}/${resultItem.preview.pdf_base}/${imageFilename}`;
                const safeAltText = imageFilename.replace(/"/g, '"');
                img.alt = safeAltText;
                img.style.maxWidth = '150px';
                img.style.height = 'auto';
                img.style.margin = '5px';
                img.style.border = '1px solid #ddd';
                img.style.display = 'inline-block';
                img.onerror = () => {
                    img.alt = `Could not load: ${imageFilename}`;
                    img.style.border = '1px solid red';
                 };
                imageSection.appendChild(img);
            });
            contentInner.appendChild(imageSection);
        }

        // --- Append the inner content to the preview container ---
        previewContainer.appendChild(contentInner);


        // --- Add EVENT LISTENER to toggle button ---
        toggleButton.addEventListener('click', () => {
            previewContainer.classList.toggle('collapsed'); // Toggle collapsed class
            toggleButton.setAttribute('aria-expanded', 
                previewContainer.classList.contains('collapsed') ? 'false' : 'true');
        });

        // Make toggle button keyboard accessible
        toggleButton.setAttribute('tabindex', '0');
        toggleButton.setAttribute('role', 'button');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                previewContainer.classList.toggle('collapsed');
                toggleButton.setAttribute('aria-expanded', 
                    previewContainer.classList.contains('collapsed') ? 'false' : 'true');
            }
        });

        previewContent.appendChild(previewContainer);

        // Trigger MathJax to render any math formulas in the preview
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise([previewContainer]).catch((err) => {
                console.warn('MathJax typesetting error:', err);
            });
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        resetUI();

        const apiKey = apiKeyInput.value.trim();
        const files = fileInput.files;

        // Check if we need API key from user (only if not configured in environment)
        const needsApiKey = apiKeyGroup.style.display !== 'none';
        
        if (needsApiKey && !apiKey) {
             logStatus('Error: API Key is required.');
             errorMessage.textContent = 'API Key is required.';
             errorArea.style.display = 'block';
             return;
        }
        
        if (files.length === 0) {
             logStatus('Error: At least one PDF file is required.');
             errorMessage.textContent = 'At least one PDF file is required.';
             errorArea.style.display = 'block';
             return;
        }

        submitBtn.disabled = true;
        loader.style.display = 'block';
        logStatus('Starting PDF processing...');

        const formData = new FormData();
        // Only append API key if user provided one (environment key will be used automatically)
        if (apiKey) {
            formData.append('api_key', apiKey);
        }
        if (includeSeparatorCheckbox) {
            const sepValue = includeSeparatorCheckbox.checked ? separatorTextInput.value : '';
            formData.append('page_separator', sepValue);
        }
        for (let i = 0; i < files.length; i++) {
            formData.append('pdf_files', files[i]);
            logStatus(`Adding file: ${files[i].name}`);
        }

        try {
            logStatus('Uploading files and sending request to server...');
            const response = await fetch('/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorData = { error: `Server error: ${response.status} ${response.statusText}` };
                try { errorData = await response.json(); } catch (e) { /* Ignore if response not JSON */ }
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.results && result.session_id) { // Check for session_id
                logStatus('Processing complete!');
                const sessionId = result.session_id; // Get session ID

                // Populate Download Links
                if (result.results.length > 0) {
                    resultsArea.style.display = 'block'; // Show downloads area
                    result.results.forEach(item => {
                        const li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = item.download_url;
                        link.textContent = `Download ${item.zip_filename}`;
                        li.appendChild(link);
                        downloadLinksList.appendChild(li);

                        // --- Generate Preview for this item ---
                        renderPreview(item, sessionId);
                    });

                    if (previewContent.hasChildNodes()) {
                       previewArea.style.display = 'block'; // Show preview area if previews were added
                    }

                } else {
                     logStatus("Processing finished, but no successful results to download or preview.");
                }


                 // Display any partial errors/warnings
                 if (result.errors && result.errors.length > 0) {
                    logStatus('\n--- Warnings/Partial Errors ---');
                    result.errors.forEach(err => logStatus(`- ${err}`));
                    logStatus('-------------------------------\n');
                }

            } else if (result.error) {
                 throw new Error(result.error);
            } else {
                 throw new Error('Received unexpected response from server.');
            }

        } catch (error) {
            logStatus(`An error occurred: ${error.message}`);
            console.error('Processing error:', error);
            errorMessage.textContent = error.message;
            errorArea.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            loader.style.display = 'none';
            logStatus('Ready for next operation.');
        }
    });

    if (apiKeyToggle && apiKeyInput) {
        apiKeyToggle.addEventListener('change', function() {
            if (this.checked) {
                apiKeyInput.type = 'text';
            } else {
                apiKeyInput.type = 'password';
            }
        });
    }  
});
