/**
 * Sheet Music Analyzer for the Syberia Music AI Remix project
 * Handles rendering and analysis of sheet music PDF
 */

class SheetMusicAnalyzer {
    constructor(pdfUrl = null) {
        this.pdfUrl = pdfUrl;
        this.pdfDoc = null;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.scale = 1.0;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.themes = [];
        
        // Attach to DOM elements
        this.pdfViewer = document.getElementById('pdf-viewer');
        this.pageNumSpan = document.getElementById('page-num');
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.zoomSelect = document.getElementById('zoom-level');
        
        // Bind event handlers
        this.bindEvents();
        
        // Initialize PDF.js
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
        } else {
            console.warn('PDF.js not loaded.');
        }
    }
    
    /**
     * Bind event handlers for UI controls
     */
    bindEvents() {
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => {
                this.changePage(-1);
            });
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => {
                this.changePage(1);
            });
        }
        
        if (this.zoomSelect) {
            this.zoomSelect.addEventListener('change', () => {
                this.zoom(parseFloat(this.zoomSelect.value));
            });
        }
        
        // Add theme button
        const addThemeBtn = document.getElementById('add-theme');
        if (addThemeBtn) {
            addThemeBtn.addEventListener('click', () => {
                this.addThemeFromInput();
            });
        }
        
        // Apply score button
        const applyScoreBtn = document.getElementById('apply-score-btn');
        if (applyScoreBtn) {
            applyScoreBtn.addEventListener('click', () => {
                console.log('Applying score information');
                
                // Hide the score section and show the AI section
                const scoreSection = document.getElementById('score-section');
                const aiSection = document.getElementById('ai-section');
                
                if (scoreSection) {
                    scoreSection.classList.add('hidden');
                }
                
                if (aiSection) {
                    aiSection.classList.remove('hidden');
                    aiSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    /**
     * Set the PDF URL and load the document
     * @param {string} url - URL to the PDF file
     */
    setPdfUrl(url) {
        this.pdfUrl = url;
        this.loadPDF();
    }
    
    /**
     * Load the PDF document
     */
    loadPDF() {
        if (!this.pdfUrl || !window.pdfjsLib) {
            return;
        }
        
        // Show the score section
        const scoreSection = document.getElementById('score-section');
        if (scoreSection) {
            scoreSection.classList.remove('hidden');
        }
        
        window.pdfjsLib.getDocument(this.pdfUrl).promise.then(pdfDoc => {
            this.pdfDoc = pdfDoc;
            
            if (this.pageNumSpan) {
                this.pageNumSpan.textContent = `Page ${this.pageNum} of ${pdfDoc.numPages}`;
            }
            
            // Render the first page
            this.renderPage(this.pageNum);
        }).catch(error => {
            console.error('Error loading PDF:', error);
            
            // Show error message in the viewer
            if (this.pdfViewer) {
                this.pdfViewer.innerHTML = `
                    <div class="pdf-error">
                        <h3>Error Loading PDF</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        });
    }
    
    /**
     * Render a specific page
     * @param {number} num - Page number
     */
    renderPage(num) {
        if (!this.pdfDoc) return;
        
        this.pageRendering = true;
        
        // Get page
        this.pdfDoc.getPage(num).then(page => {
            // Prepare canvas using PDF page dimensions
            const viewport = page.getViewport({ scale: this.scale });
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;
            
            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            const renderTask = page.render(renderContext);
            
            // Wait for rendering to finish
            renderTask.promise.then(() => {
                this.pageRendering = false;
                
                if (this.pageNumPending !== null) {
                    // New page rendering is pending
                    this.renderPage(this.pageNumPending);
                    this.pageNumPending = null;
                }
                
                // Display the canvas
                if (this.pdfViewer) {
                    this.pdfViewer.innerHTML = '';
                    this.pdfViewer.appendChild(this.canvas);
                }
            });
        }).catch(error => {
            console.error('Error rendering page:', error);
            this.pageRendering = false;
            
            if (this.pdfViewer) {
                this.pdfViewer.innerHTML = `
                    <div class="pdf-error">
                        <h3>Error Rendering Page</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        });
    }
    
    /**
     * Change page
     * @param {number} offset - Page offset (e.g., -1 for previous, 1 for next)
     */
    changePage(offset) {
        if (!this.pdfDoc) return;
        
        const newPageNum = this.pageNum + offset;
        
        if (newPageNum >= 1 && newPageNum <= this.pdfDoc.numPages) {
            this.pageNum = newPageNum;
            
            if (this.pageNumSpan) {
                this.pageNumSpan.textContent = `Page ${this.pageNum} of ${this.pdfDoc.numPages}`;
            }
            
            if (this.pageRendering) {
                this.pageNumPending = this.pageNum;
            } else {
                this.renderPage(this.pageNum);
            }
        }
    }
    
    /**
     * Zoom the PDF
     * @param {number} newScale - New scale value
     */
    zoom(newScale) {
        if (!this.pdfDoc) return;
        
        this.scale = newScale;
        this.renderPage(this.pageNum);
    }
    
    /**
     * Add a theme from user input
     */
    addThemeFromInput() {
        const themeName = document.getElementById('theme-name');
        const themeNotes = document.getElementById('theme-notes');
        
        if (!themeName || !themeNotes) {
            console.error('Theme input elements not found');
            return;
        }
        
        const name = themeName.value.trim();
        const notes = themeNotes.value.trim();
        
        if (name === '' || notes === '') {
            alert('Please enter both theme name and notes');
            return;
        }
        
        // Add theme
        this.addTheme(name, notes);
        
        // Clear inputs
        themeName.value = '';
        themeNotes.value = '';
    }
    
    /**
     * Add a new theme to the list
     * @param {string} name - Theme name
     * @param {string} noteSequence - Note sequence (comma-separated)
     */
    addTheme(name, noteSequence) {
        // Parse note sequence
        const notes = noteSequence.split(',').map(note => note.trim());
        
        // Add to themes array
        this.themes.push({
            name: name,
            notes: notes
        });
        
        // Update UI
        this.updateThemeList();
    }
    
    /**
     * Update the theme list in the UI
     */
    updateThemeList() {
        const themeList = document.getElementById('theme-list');
        if (!themeList) return;
        
        // Clear existing content
        themeList.innerHTML = '';
        
        // Add each theme
        this.themes.forEach((theme, index) => {
            const themeItem = document.createElement('div');
            themeItem.className = 'theme-item';
            
            themeItem.innerHTML = `
                <span class="theme-name">${theme.name}</span>
                <span class="theme-notes">${theme.notes.join(', ')}</span>
                <div class="theme-actions">
                    <button class="apply-theme-btn" data-index="${index}">Apply to Generation</button>
                    <button class="remove-theme-btn" data-index="${index}">Remove</button>
                </div>
            `;
            
            themeList.appendChild(themeItem);
        });
        
        // Add event listeners for buttons
        const applyBtns = themeList.querySelectorAll('.apply-theme-btn');
        const removeBtns = themeList.querySelectorAll('.remove-theme-btn');
        
        applyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.applyTheme(index);
            });
        });
        
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeTheme(index);
            });
        });
    }
    
    /**
     * Apply a theme to the generation
     * @param {number} index - Theme index
     */
    applyTheme(index) {
        if (index < 0 || index >= this.themes.length) {
            console.error('Invalid theme index');
            return;
        }
        
        const theme = this.themes[index];
        console.log(`Applying theme: ${theme.name}`);
        
        // Mark this theme as active
        this.themes.forEach((t, i) => {
            t.active = i === index;
        });
        
        // Update UI
        this.updateThemeList();
        
        // Show a notification
        alert(`Theme "${theme.name}" will be applied during generation`);
    }
    
    /**
     * Remove a theme from the list
     * @param {number} index - Theme index
     */
    removeTheme(index) {
        if (index < 0 || index >= this.themes.length) {
            console.error('Invalid theme index');
            return;
        }
        
        // Remove the theme
        this.themes.splice(index, 1);
        
        // Update UI
        this.updateThemeList();
    }
    
    /**
     * Get all themes
     * @returns {Array} - Array of theme objects
     */
    getThemes() {
        return this.themes;
    }
    
    /**
     * Get active theme (if any)
     * @returns {Object|null} - Active theme or null
     */
    getActiveTheme() {
        return this.themes.find(theme => theme.active) || null;
    }
    
    /**
     * Extract musical information from the score
     * @returns {Object} - Extracted musical information
     */
    extractMusicalInfo() {
        // In a real implementation, this would analyze the PDF content
        // For now, we just return the themes and some basic information
        
        return {
            themes: this.themes,
            instrumentTracks: {
                strings: document.getElementById('track-strings')?.checked || true,
                brass: document.getElementById('track-brass')?.checked || true,
                woodwinds: document.getElementById('track-woodwinds')?.checked || true,
                percussion: document.getElementById('track-percussion')?.checked || true
            },
            timeSignature: '4/4', // Default
            keySignature: 'C',    // Default
        };
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetMusicAnalyzer;
}