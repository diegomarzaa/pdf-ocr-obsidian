document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ocr-form');
    const apiKeyInput = document.getElementById('api-key');
    const fileInput = document.getElementById('pdf-files');
    const apiKeyToggle = document.getElementById('api-key-toggle');
    const submitBtn = document.getElementById('submit-btn');
    const submitIcon = document.getElementById('submit-icon');
    const submitText = document.getElementById('submit-text');
    const statusLog = document.getElementById('status-log');
    const loader = document.getElementById('loader');

    // Progress elements
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Page separator elements
    const includeSeparatorCheckbox = document.getElementById('include-separator');
    const separatorTextInput = document.getElementById('separator-text');
    
    // API Key elements
    const apiKeyGroup = document.getElementById('api-key-group');
    const apiKeyConfigured = document.getElementById('api-key-configured');

    // File upload elements
    const fileUploadArea = document.getElementById('file-upload-area');
    const selectedFilesContainer = document.getElementById('selected-files');

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');

    // Toast container
    const toastContainer = document.getElementById('toast-container');

    // Result Areas
    const resultsArea = document.getElementById('results-area');
    const downloadLinksList = document.getElementById('download-links');
    const previewArea = document.getElementById('preview-area');
    const previewContent = document.getElementById('preview-content');

    // Error Area
    const errorArea = document.getElementById('error-area');
    const errorMessage = document.getElementById('error-message');

    // Toast notification system
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Progress bar helpers
    function showProgress(percent, text) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    function hideProgress() {
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }

    // Initialize theme from localStorage or system preference
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggle(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeToggle('dark');
        }
    }

    function updateThemeToggle(theme) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light';
        } else {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark';
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggle(newTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        initTheme();
    }

    // Keyboard shortcut: Ctrl+Enter to submit
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (!submitBtn.disabled && fileInput.files.length > 0) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });
    
    // Check if API key is configured in environment
    async function checkApiKey() {
        try {
            const response = await fetch('/check-api-key');
            const result = await response.json();
            if (result.has_api_key) {
                apiKeyGroup.style.display = 'none';
                apiKeyConfigured.style.display = 'block';
                logStatus('✓ API Key loaded from environment');
            } else {
                apiKeyGroup.style.display = 'block';
                apiKeyConfigured.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            apiKeyGroup.style.display = 'block';
            apiKeyConfigured.style.display = 'none';
        }
    }
    
    checkApiKey();

    // File upload drag and drop functionality
    if (fileUploadArea && fileInput) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-over');
        });
        
        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                updateSelectedFiles(files);
            }
        });

        fileInput.addEventListener('change', () => {
            updateSelectedFiles(fileInput.files);
        });
    }

    function updateSelectedFiles(files) {
        if (!selectedFilesContainer) return;
        
        if (files.length === 0) {
            selectedFilesContainer.style.display = 'none';
            selectedFilesContainer.innerHTML = '';
            return;
        }

        selectedFilesContainer.style.display = 'block';
        selectedFilesContainer.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>${file.name}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">(${formatFileSize(file.size)})</span>
            `;
            selectedFilesContainer.appendChild(fileItem);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

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
        resultsArea.classList.remove('success-animation');
        downloadLinksList.innerHTML = '';
        previewArea.style.display = 'none';
        previewContent.innerHTML = '';
        errorArea.style.display = 'none';
        errorMessage.textContent = '';
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        if (submitIcon) submitIcon.className = 'fas fa-magic';
        if (submitText) submitText.textContent = 'Convert PDFs';
        loader.style.display = 'none';
        hideProgress();
    }

    // --- Function to render preview ---
    function renderPreview(resultItem, sessionId) {
        if (!resultItem.preview) return;

        const previewContainer = document.createElement('div');
        previewContainer.classList.add('preview-item');
        previewContainer.classList.add('collapsed');

        const title = document.createElement('h3');
        title.innerHTML = `<i class="fas fa-file-alt" style="margin-right: 8px;"></i>${resultItem.original_filename}`;
        previewContainer.appendChild(title);

        const toggleButton = document.createElement('div');
        toggleButton.classList.add('preview-toggle');
        toggleButton.textContent = 'Show/Hide Preview';
        previewContainer.appendChild(toggleButton);

        const contentInner = document.createElement('div');
        contentInner.classList.add('preview-content-inner');

        const markdownSection = document.createElement('div');
        markdownSection.classList.add('markdown-preview');
        
        // Add copy button
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(resultItem.preview.markdown).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('copied');
                showToast('Markdown copied to clipboard!', 'success');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });
        markdownSection.appendChild(copyBtn);
        
        const markdownTitle = document.createElement('h4');
        markdownTitle.innerHTML = '<i class="fas fa-markdown" style="margin-right: 6px;"></i>Markdown Content';
        markdownSection.appendChild(markdownTitle);

        let markdownForDisplay = resultItem.preview.markdown;

        markdownForDisplay = markdownForDisplay.replace(
            /!\[\[(.*?)\]\]/g,
            (match, filename) => {
                const imageUrl = `/view_image/${sessionId}/${resultItem.preview.pdf_base}/${filename.trim()}`;
                const safeAltText = filename.trim().replace(/"/g, '"');
                return `<img src="${imageUrl}" alt="${safeAltText}" style="max-width: 90%; height: auto; display: block; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
            }
        );

        if (typeof marked !== 'undefined') {
            const renderedMarkdownDiv = document.createElement('div');
            renderedMarkdownDiv.innerHTML = marked.parse(markdownForDisplay);
            markdownSection.appendChild(renderedMarkdownDiv);
        } else {
            logStatus("⚠ Marked.js not found. Showing raw Markdown.");
            const markdownPre = document.createElement('pre');
            markdownPre.textContent = markdownForDisplay;
            markdownSection.appendChild(markdownPre);
        }

        contentInner.appendChild(markdownSection);

        if (resultItem.preview.images && resultItem.preview.images.length > 0) {
            const imageSection = document.createElement('div');
            imageSection.classList.add('image-preview');
            const imageTitle = document.createElement('h4');
            imageTitle.innerHTML = `<i class="fas fa-images" style="margin-right: 6px;"></i>Extracted Images (${resultItem.preview.images.length})`;
            imageSection.appendChild(imageTitle);

            resultItem.preview.images.forEach(imageFilename => {
                const img = document.createElement('img');
                img.src = `/view_image/${sessionId}/${resultItem.preview.pdf_base}/${imageFilename}`;
                const safeAltText = imageFilename.replace(/"/g, '"');
                img.alt = safeAltText;
                img.style.maxWidth = '150px';
                img.style.height = 'auto';
                img.style.margin = '5px';
                img.style.border = '1px solid var(--border)';
                img.style.borderRadius = '8px';
                img.style.display = 'inline-block';
                img.onerror = () => {
                    img.alt = `Could not load: ${imageFilename}`;
                    img.style.border = '1px solid var(--error)';
                };
                imageSection.appendChild(img);
            });
            contentInner.appendChild(imageSection);
        }

        previewContainer.appendChild(contentInner);

        toggleButton.addEventListener('click', () => {
            previewContainer.classList.toggle('collapsed');
            toggleButton.setAttribute('aria-expanded', 
                previewContainer.classList.contains('collapsed') ? 'false' : 'true');
        });

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
             logStatus('✗ Error: API Key is required.');
             errorMessage.textContent = 'API Key is required.';
             errorArea.style.display = 'block';
             showToast('Please enter your API key', 'error');
             return;
        }
        
        if (files.length === 0) {
             logStatus('✗ Error: At least one PDF file is required.');
             errorMessage.textContent = 'At least one PDF file is required.';
             errorArea.style.display = 'block';
             showToast('Please select at least one PDF file', 'error');
             return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        if (submitIcon) submitIcon.className = 'fas fa-spinner fa-spin';
        if (submitText) submitText.textContent = 'Converting...';
        loader.style.display = 'block';
        showProgress(10, 'Preparing files...');
        logStatus('→ Starting PDF processing...');

        const formData = new FormData();
        if (apiKey) {
            formData.append('api_key', apiKey);
        }
        if (includeSeparatorCheckbox) {
            const sepValue = includeSeparatorCheckbox.checked ? separatorTextInput.value : '';
            formData.append('page_separator', sepValue);
        }
        for (let i = 0; i < files.length; i++) {
            formData.append('pdf_files', files[i]);
            logStatus(`  + Adding: ${files[i].name}`);
        }

        try {
            showProgress(30, 'Uploading files...');
            logStatus('→ Uploading files to server...');
            const response = await fetch('/process', {
                method: 'POST',
                body: formData,
            });

            showProgress(60, 'Processing with AI...');

            if (!response.ok) {
                let errorData = { error: `Server error: ${response.status} ${response.statusText}` };
                try { errorData = await response.json(); } catch (e) { /* Ignore if response not JSON */ }
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            showProgress(90, 'Finalizing...');
            const result = await response.json();

            if (result.success && result.results && result.session_id) {
                showProgress(100, 'Complete!');
                logStatus('✓ Processing complete!');
                showToast(`Successfully converted ${result.results.length} file(s)!`, 'success');
                const sessionId = result.session_id;

                if (result.results.length > 0) {
                    resultsArea.style.display = 'block';
                    resultsArea.classList.add('success-animation');
                    result.results.forEach(item => {
                        const li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = item.download_url;
                        link.textContent = `${item.zip_filename}`;
                        li.appendChild(link);
                        downloadLinksList.appendChild(li);

                        renderPreview(item, sessionId);
                    });

                    if (previewContent.hasChildNodes()) {
                       previewArea.style.display = 'block';
                    }

                } else {
                     logStatus("⚠ Processing finished, but no results to download.");
                     showToast('Processing finished with no results', 'info');
                }

                 if (result.errors && result.errors.length > 0) {
                    logStatus('\n⚠ Warnings:');
                    result.errors.forEach(err => logStatus(`  - ${err}`));
                }

            } else if (result.error) {
                 throw new Error(result.error);
            } else {
                 throw new Error('Received unexpected response from server.');
            }

        } catch (error) {
            logStatus(`✗ Error: ${error.message}`);
            console.error('Processing error:', error);
            errorMessage.textContent = error.message;
            errorArea.style.display = 'block';
            showToast('Conversion failed. Check error details.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            if (submitIcon) submitIcon.className = 'fas fa-magic';
            if (submitText) submitText.textContent = 'Convert PDFs';
            loader.style.display = 'none';
            hideProgress();
            logStatus('\n→ Ready for next operation.');
        }
    });

    if (apiKeyToggle && apiKeyInput) {
        apiKeyToggle.addEventListener('change', function() {
            apiKeyInput.type = this.checked ? 'text' : 'password';
        });
    }  
});
