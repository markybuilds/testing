// Duplicate Video Management System - Frontend
class DuplicateManager {
    constructor() {
        this.duplicateGroups = [];
        this.stats = null;
        this.scanInProgress = false;
        this.isVisible = false;
        this.selectedResolutions = new Map();
        
        this.init();
    }

    init() {
        this.createDuplicateModal();
        this.setupEventListeners();
        console.log('Duplicate Manager initialized');
    }

    createDuplicateModal() {
        const modalHtml = `
            <div id="duplicate-manager-modal" class="modal duplicate-modal">
                <div class="modal-content duplicate-modal-content">
                    <div class="modal-header">
                        <h3>Duplicate Video Manager</h3>
                        <button class="modal-close" id="duplicate-modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="duplicate-stats-section">
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-number" id="total-videos-stat">0</div>
                                    <div class="stat-label">Total Videos</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number" id="duplicate-groups-stat">0</div>
                                    <div class="stat-label">Duplicate Groups</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number" id="total-duplicates-stat">0</div>
                                    <div class="stat-label">Total Duplicates</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number" id="potential-savings-stat">0 MB</div>
                                    <div class="stat-label">Potential Savings</div>
                                </div>
                            </div>
                        </div>

                        <div class="duplicate-controls">
                            <div class="control-group">
                                <button id="scan-duplicates-btn" class="btn btn-primary">
                                    <span class="btn-icon">🔍</span>
                                    Scan for Duplicates
                                </button>
                                <button id="auto-resolve-btn" class="btn btn-secondary" disabled>
                                    <span class="btn-icon">⚡</span>
                                    Auto-Resolve Exact Matches
                                </button>
                                <button id="bulk-resolve-btn" class="btn btn-success" disabled>
                                    <span class="btn-icon">✅</span>
                                    Apply Selected Resolutions
                                </button>
                            </div>
                            
                            <div class="scan-options">
                                <h4>Scan Options</h4>
                                <label class="option-label">
                                    <input type="checkbox" id="include-cross-platform" checked>
                                    Include cross-platform duplicates
                                </label>
                                <label class="option-label">
                                    <input type="checkbox" id="check-file-hashes" checked>
                                    Check file hashes (downloaded files)
                                </label>
                                <label class="option-label">
                                    <input type="range" id="similarity-threshold" min="0.5" max="1.0" step="0.05" value="0.85">
                                    Title similarity threshold: <span id="threshold-value">85%</span>
                                </label>
                            </div>
                        </div>

                        <div id="scan-progress" class="scan-progress hidden">
                            <div class="progress-header">
                                <h4>Scanning for duplicates...</h4>
                                <div class="progress-spinner"></div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="scan-progress-fill"></div>
                            </div>
                            <div class="progress-text" id="scan-progress-text">Initializing scan...</div>
                        </div>

                        <div class="duplicate-groups-section">
                            <div class="section-header">
                                <h4>Duplicate Groups</h4>
                                <div class="group-filters">
                                    <select id="detection-method-filter">
                                        <option value="">All Detection Methods</option>
                                        <option value="video_id">Exact Video ID</option>
                                        <option value="url_match">URL Match</option>
                                        <option value="title_similarity">Title Similarity</option>
                                        <option value="file_hash">File Hash</option>
                                    </select>
                                    <select id="similarity-filter">
                                        <option value="">All Similarities</option>
                                        <option value="1.0">Exact Match (100%)</option>
                                        <option value="0.9">Very High (90%+)</option>
                                        <option value="0.8">High (80%+)</option>
                                        <option value="0.7">Medium (70%+)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div id="duplicate-groups-list" class="duplicate-groups-list">
                                <div class="no-duplicates-message">
                                    <div class="no-duplicates-icon">🎉</div>
                                    <h3>No duplicates found</h3>
                                    <p>Click "Scan for Duplicates" to check for duplicate videos in your playlists.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('duplicate-modal-close').addEventListener('click', () => {
            this.hide();
        });

        // Scan button
        document.getElementById('scan-duplicates-btn').addEventListener('click', () => {
            this.scanForDuplicates();
        });

        // Auto-resolve button
        document.getElementById('auto-resolve-btn').addEventListener('click', () => {
            this.autoResolveExactMatches();
        });

        // Bulk resolve button
        document.getElementById('bulk-resolve-btn').addEventListener('click', () => {
            this.applySelectedResolutions();
        });

        // Similarity threshold slider
        const thresholdSlider = document.getElementById('similarity-threshold');
        const thresholdValue = document.getElementById('threshold-value');
        
        thresholdSlider.addEventListener('input', (e) => {
            const value = Math.round(e.target.value * 100);
            thresholdValue.textContent = `${value}%`;
        });

        // Filter controls
        document.getElementById('detection-method-filter').addEventListener('change', () => {
            this.filterDuplicateGroups();
        });

        document.getElementById('similarity-filter').addEventListener('change', () => {
            this.filterDuplicateGroups();
        });

        // Close modal when clicking outside
        document.getElementById('duplicate-manager-modal').addEventListener('click', (e) => {
            if (e.target.id === 'duplicate-manager-modal') {
                this.hide();
            }
        });
    }

    async show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        const modal = document.getElementById('duplicate-manager-modal');
        modal.classList.add('active');
        
        // Load initial data
        await this.loadStats();
        await this.loadDuplicateGroups();
    }

    hide() {
        this.isVisible = false;
        const modal = document.getElementById('duplicate-manager-modal');
        modal.classList.remove('active');
    }

    async loadStats() {
        try {
            this.stats = await window.electronAPI.invoke('duplicates:getStats');
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Failed to load duplicate stats:', error);
        }
    }

    updateStatsDisplay() {
        if (!this.stats) return;

        document.getElementById('total-videos-stat').textContent = this.stats.total_videos.toLocaleString();
        document.getElementById('duplicate-groups-stat').textContent = this.stats.duplicate_groups.toLocaleString();
        document.getElementById('total-duplicates-stat').textContent = this.stats.total_duplicates.toLocaleString();
        
        const savingsMB = Math.round(this.stats.potential_savings / 1024 / 1024);
        document.getElementById('potential-savings-stat').textContent = `${savingsMB} MB`;
    }

    async loadDuplicateGroups() {
        try {
            this.duplicateGroups = await window.electronAPI.invoke('duplicates:getDuplicateGroups');
            this.renderDuplicateGroups();
            this.updateControlStates();
        } catch (error) {
            console.error('Failed to load duplicate groups:', error);
        }
    }

    renderDuplicateGroups() {
        const container = document.getElementById('duplicate-groups-list');
        
        if (this.duplicateGroups.length === 0) {
            container.innerHTML = `
                <div class="no-duplicates-message">
                    <div class="no-duplicates-icon">🎉</div>
                    <h3>No duplicates found</h3>
                    <p>Your video library appears to be duplicate-free!</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.duplicateGroups.forEach((group, index) => {
            html += this.renderDuplicateGroup(group, index);
        });

        container.innerHTML = html;
        this.attachGroupEventListeners();
    }

    renderDuplicateGroup(group, index) {
        const similarityPercent = Math.round((group.similarity_score || 1) * 100);
        const detectionIcon = this.getDetectionMethodIcon(group.detection_method);
        
        let duplicatesHtml = '';
        group.duplicates.forEach((duplicate, dupIndex) => {
            const resolutionKey = `${group.original.id}-${duplicate.id}`;
            duplicatesHtml += `
                <div class="duplicate-item" data-original="${group.original.id}" data-duplicate="${duplicate.id}">
                    <div class="video-info">
                        <div class="video-title">${this.escapeHtml(duplicate.title)}</div>
                        <div class="video-meta">
                            <span class="playlist-name">📁 ${this.escapeHtml(duplicate.playlist_name || 'Unknown Playlist')}</span>
                            <span class="video-url">${this.escapeHtml(duplicate.url)}</span>
                        </div>
                    </div>
                    <div class="resolution-controls">
                        <select class="resolution-select" data-key="${resolutionKey}">
                            <option value="">Choose action...</option>
                            <option value="keep_original">Keep Original</option>
                            <option value="keep_duplicate">Keep This Copy</option>
                            <option value="keep_both">Keep Both</option>
                            <option value="ignore">Ignore</option>
                        </select>
                    </div>
                </div>
            `;
        });

        return `
            <div class="duplicate-group" data-detection="${group.detection_method}" data-similarity="${group.similarity_score}">
                <div class="group-header">
                    <div class="detection-info">
                        <span class="detection-icon">${detectionIcon}</span>
                        <span class="detection-method">${this.getDetectionMethodLabel(group.detection_method)}</span>
                        <span class="similarity-badge">${similarityPercent}%</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn btn-sm btn-outline expand-btn" data-group="${index}">
                            <span class="expand-icon">▼</span>
                            Show Details
                        </button>
                    </div>
                </div>
                
                <div class="original-video">
                    <div class="video-label">Original Video</div>
                    <div class="video-info">
                        <div class="video-title">${this.escapeHtml(group.original.title)}</div>
                        <div class="video-meta">
                            <span class="playlist-name">📁 ${this.escapeHtml(group.original.playlist_name || 'Unknown Playlist')}</span>
                            <span class="video-url">${this.escapeHtml(group.original.url)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="duplicates-list" style="display: none;">
                    <div class="video-label">Duplicate Videos (${group.duplicates.length})</div>
                    ${duplicatesHtml}
                </div>
            </div>
        `;
    }

    getDetectionMethodIcon(method) {
        const icons = {
            'video_id': '🎯',
            'url_match': '🔗',
            'title_similarity': '📝',
            'file_hash': '📊'
        };
        return icons[method] || '❓';
    }

    getDetectionMethodLabel(method) {
        const labels = {
            'video_id': 'Exact Video ID',
            'url_match': 'URL Match',
            'title_similarity': 'Title Similarity',
            'file_hash': 'File Hash'
        };
        return labels[method] || 'Unknown';
    }

    attachGroupEventListeners() {
        // Expand/collapse group details
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupIndex = e.target.closest('.expand-btn').dataset.group;
                this.toggleGroupExpanded(groupIndex);
            });
        });

        // Resolution select changes
        document.querySelectorAll('.resolution-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const action = e.target.value;
                
                if (action) {
                    this.selectedResolutions.set(key, action);
                } else {
                    this.selectedResolutions.delete(key);
                }
                
                this.updateControlStates();
            });
        });
    }

    toggleGroupExpanded(groupIndex) {
        const group = document.querySelectorAll('.duplicate-group')[groupIndex];
        const duplicatesList = group.querySelector('.duplicates-list');
        const expandBtn = group.querySelector('.expand-btn');
        const expandIcon = expandBtn.querySelector('.expand-icon');
        
        if (duplicatesList.style.display === 'none') {
            duplicatesList.style.display = 'block';
            expandIcon.textContent = '▲';
            expandBtn.innerHTML = '<span class="expand-icon">▲</span> Hide Details';
        } else {
            duplicatesList.style.display = 'none';
            expandIcon.textContent = '▼';
            expandBtn.innerHTML = '<span class="expand-icon">▼</span> Show Details';
        }
    }

    updateControlStates() {
        const autoResolveBtn = document.getElementById('auto-resolve-btn');
        const bulkResolveBtn = document.getElementById('bulk-resolve-btn');
        
        // Enable auto-resolve if there are exact matches
        const hasExactMatches = this.duplicateGroups.some(group => 
            group.detection_method === 'video_id' || group.detection_method === 'url_match'
        );
        autoResolveBtn.disabled = !hasExactMatches;
        
        // Enable bulk resolve if there are selected resolutions
        bulkResolveBtn.disabled = this.selectedResolutions.size === 0;
    }

    async scanForDuplicates() {
        if (this.scanInProgress) return;
        
        this.scanInProgress = true;
        
        try {
            // Show progress
            this.showScanProgress();
            
            // Get scan options
            const options = {
                includeCrossPlatform: document.getElementById('include-cross-platform').checked,
                titleSimilarityThreshold: parseFloat(document.getElementById('similarity-threshold').value),
                checkFileHashes: document.getElementById('check-file-hashes').checked,
                checkExistingFiles: true
            };
            
            // Update progress
            this.updateScanProgress(25, 'Analyzing video database...');
            
            // Perform scan
            const result = await window.electronAPI.invoke('duplicates:scan', options);
            
            if (result.success) {
                this.updateScanProgress(75, 'Loading results...');
                
                // Reload data
                await this.loadStats();
                await this.loadDuplicateGroups();
                
                this.updateScanProgress(100, 'Scan completed!');
                
                setTimeout(() => {
                    this.hideScanProgress();
                    this.showScanResults(result.duplicatesFound);
                }, 1000);
            } else {
                throw new Error(result.error || 'Scan failed');
            }
        } catch (error) {
            console.error('Failed to scan for duplicates:', error);
            this.hideScanProgress();
            this.showError('Failed to scan for duplicates: ' + error.message);
        } finally {
            this.scanInProgress = false;
        }
    }

    showScanProgress() {
        document.getElementById('scan-progress').classList.remove('hidden');
        document.getElementById('scan-duplicates-btn').disabled = true;
    }

    updateScanProgress(percent, text) {
        document.getElementById('scan-progress-fill').style.width = `${percent}%`;
        document.getElementById('scan-progress-text').textContent = text;
    }

    hideScanProgress() {
        document.getElementById('scan-progress').classList.add('hidden');
        document.getElementById('scan-duplicates-btn').disabled = false;
    }

    showScanResults(duplicatesFound) {
        const message = duplicatesFound > 0 
            ? `Found ${duplicatesFound} duplicate relationships in your video library.`
            : 'No duplicates found in your video library.';
            
        // You could show a toast notification here
        console.log('Scan results:', message);
    }

    async autoResolveExactMatches() {
        try {
            const exactMatches = this.duplicateGroups.filter(group => 
                group.detection_method === 'video_id' || group.detection_method === 'url_match'
            );
            
            if (exactMatches.length === 0) {
                this.showError('No exact matches found to auto-resolve.');
                return;
            }
            
            const resolutions = [];
            exactMatches.forEach(group => {
                group.duplicates.forEach(duplicate => {
                    resolutions.push({
                        originalId: group.original.id,
                        duplicateId: duplicate.id,
                        action: 'keep_original'
                    });
                });
            });
            
            const result = await window.electronAPI.invoke('duplicates:bulkResolve', resolutions);
            
            if (result.success) {
                await this.loadStats();
                await this.loadDuplicateGroups();
                console.log(`Auto-resolved ${result.resolved} duplicate relationships.`);
            } else {
                throw new Error(result.error || 'Auto-resolve failed');
            }
        } catch (error) {
            console.error('Failed to auto-resolve duplicates:', error);
            this.showError('Failed to auto-resolve duplicates: ' + error.message);
        }
    }

    async applySelectedResolutions() {
        if (this.selectedResolutions.size === 0) {
            this.showError('No resolutions selected.');
            return;
        }
        
        try {
            const resolutions = [];
            this.selectedResolutions.forEach((action, key) => {
                const [originalId, duplicateId] = key.split('-');
                resolutions.push({ originalId, duplicateId, action });
            });
            
            const result = await window.electronAPI.invoke('duplicates:bulkResolve', resolutions);
            
            if (result.success) {
                this.selectedResolutions.clear();
                await this.loadStats();
                await this.loadDuplicateGroups();
                console.log(`Applied ${result.resolved} duplicate resolutions.`);
            } else {
                throw new Error(result.error || 'Bulk resolve failed');
            }
        } catch (error) {
            console.error('Failed to apply resolutions:', error);
            this.showError('Failed to apply resolutions: ' + error.message);
        }
    }

    filterDuplicateGroups() {
        const methodFilter = document.getElementById('detection-method-filter').value;
        const similarityFilter = document.getElementById('similarity-filter').value;
        
        const groups = document.querySelectorAll('.duplicate-group');
        
        groups.forEach(group => {
            let visible = true;
            
            if (methodFilter && group.dataset.detection !== methodFilter) {
                visible = false;
            }
            
            if (similarityFilter) {
                const similarity = parseFloat(group.dataset.similarity);
                const threshold = parseFloat(similarityFilter);
                if (similarity < threshold) {
                    visible = false;
                }
            }
            
            group.style.display = visible ? 'block' : 'none';
        });
    }

    showError(message) {
        // This could integrate with your existing error handling system
        console.error('Duplicate Manager Error:', message);
        // Show toast notification or error dialog
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to check for duplicates before download
    async checkBeforeDownload(videoUrl, videoTitle) {
        try {
            const result = await window.electronAPI.invoke('duplicates:checkBeforeDownload', videoUrl, videoTitle);
            
            if (result.hasDuplicates && result.suggestions.length > 0) {
                return await this.showDuplicateWarning(result.suggestions);
            }
            
            return { proceed: true };
        } catch (error) {
            console.error('Failed to check for duplicates before download:', error);
            return { proceed: true }; // Continue on error
        }
    }

    async showDuplicateWarning(suggestions) {
        return new Promise((resolve) => {
            // Create a warning modal
            const warningHtml = `
                <div id="duplicate-warning-modal" class="modal duplicate-warning-modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>⚠️ Potential Duplicate Detected</h3>
                        </div>
                        <div class="modal-body">
                            <p>This video might already exist in your library:</p>
                            <div class="suggestions-list">
                                ${suggestions.map(suggestion => `
                                    <div class="suggestion-item">
                                        <div class="suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                                        <div class="suggestion-playlist">In: ${this.escapeHtml(suggestion.playlist_name || 'Unknown Playlist')}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="warning-actions">
                                <button id="download-anyway-btn" class="btn btn-primary">Download Anyway</button>
                                <button id="cancel-download-btn" class="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', warningHtml);
            
            const modal = document.getElementById('duplicate-warning-modal');
            modal.classList.add('active');
            
            document.getElementById('download-anyway-btn').addEventListener('click', () => {
                modal.remove();
                resolve({ proceed: true });
            });
            
            document.getElementById('cancel-download-btn').addEventListener('click', () => {
                modal.remove();
                resolve({ proceed: false });
            });
        });
    }
}

// Global instance for integration with main app
window.duplicateManager = new DuplicateManager();
