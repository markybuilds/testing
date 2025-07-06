/**
 * PlaylistExportManager - Comprehensive playlist export and backup system
 * Supports multiple export formats and backup/restore functionality
 */

class PlaylistExportManager {
    constructor() {
        this.isInitialized = false;
        this.eventHandlers = {};
        this.exportHistory = [];
        this.supportedFormats = {
            json: {
                name: 'JSON (Full Data)',
                extension: 'json',
                description: 'Complete playlist data with all metadata',
                includesMetadata: true,
                supportsImport: true
            },
            csv: {
                name: 'CSV (Spreadsheet)',
                extension: 'csv',
                description: 'Comma-separated values for spreadsheet applications',
                includesMetadata: false,
                supportsImport: false
            },
            m3u: {
                name: 'M3U Playlist',
                extension: 'm3u',
                description: 'Standard playlist format compatible with media players',
                includesMetadata: false,
                supportsImport: false
            },
            m3u8: {
                name: 'M3U8 Extended',
                extension: 'm3u8',
                description: 'Extended M3U format with additional metadata',
                includesMetadata: true,
                supportsImport: false
            },
            txt: {
                name: 'Text File (URLs)',
                extension: 'txt',
                description: 'Plain text file with video URLs',
                includesMetadata: false,
                supportsImport: false
            },
            html: {
                name: 'HTML Report',
                extension: 'html',
                description: 'Formatted HTML report with thumbnails and descriptions',
                includesMetadata: true,
                supportsImport: false
            },
            backup: {
                name: 'Full Application Backup',
                extension: 'ypm-backup',
                description: 'Complete application backup including all playlists and settings',
                includesMetadata: true,
                supportsImport: true
            }
        };
        
        this.exportOptions = {
            includePrivatePlaylists: true,
            includeVideoMetadata: true,
            includeDownloadStatus: true,
            includeThumbnails: false,
            compressOutput: false,
            encryptBackup: false,
            exportPath: null
        };
    }

    /**
     * Initialize the playlist export system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load export history
            await this.loadExportHistory();
            
            // Setup export interface
            this.setupExportInterface();
            
            // Load saved export options
            this.loadExportOptions();
            
            this.isInitialized = true;
            console.log('PlaylistExportManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize PlaylistExportManager:', error);
            throw error;
        }
    }

    /**
     * Set event handlers for export events
     */
    setEventHandlers(handlers) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
    }

    /**
     * Setup export interface elements
     */
    setupExportInterface() {
        // Create export modal if it doesn't exist
        if (!document.getElementById('playlist-export-modal')) {
            this.createExportModal();
        }
        
        this.setupExportEventListeners();
    }

    /**
     * Create the playlist export modal interface
     */
    createExportModal() {
        const modal = document.createElement('div');
        modal.id = 'playlist-export-modal';
        modal.className = 'modal export-modal';
        
        modal.innerHTML = `
            <div class="modal-content export-modal-content">
                <div class="modal-header">
                    <h3>Export Playlists</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body export-modal-body">
                    <div class="export-tabs">
                        <button class="export-tab active" data-tab="single">Single Playlist</button>
                        <button class="export-tab" data-tab="multiple">Multiple Playlists</button>
                        <button class="export-tab" data-tab="backup">Full Backup</button>
                        <button class="export-tab" data-tab="import">Import/Restore</button>
                    </div>
                    
                    <!-- Single Playlist Export -->
                    <div id="single-export" class="export-content active">
                        <div class="export-section">
                            <h4>🎵 Select Playlist</h4>
                            <select id="single-playlist-select" class="export-select">
                                <option value="">Choose a playlist to export...</option>
                            </select>
                            <div id="single-playlist-info" class="playlist-info" style="display: none;">
                                <div class="playlist-preview">
                                    <img id="single-playlist-thumbnail" src="" alt="Playlist thumbnail" />
                                    <div class="playlist-details">
                                        <h5 id="single-playlist-title">Playlist Title</h5>
                                        <p id="single-playlist-description">Playlist description...</p>
                                        <div class="playlist-stats">
                                            <span id="single-playlist-count">0 videos</span>
                                            <span id="single-playlist-duration">0:00:00 total</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <h4>📁 Export Format</h4>
                            <div class="format-options">
                                <div class="format-grid">
                                    <label class="format-option">
                                        <input type="radio" name="single-format" value="json" checked />
                                        <div class="format-card">
                                            <div class="format-icon">📋</div>
                                            <div class="format-name">JSON</div>
                                            <div class="format-desc">Complete data</div>
                                        </div>
                                    </label>
                                    <label class="format-option">
                                        <input type="radio" name="single-format" value="csv" />
                                        <div class="format-card">
                                            <div class="format-icon">📊</div>
                                            <div class="format-name">CSV</div>
                                            <div class="format-desc">Spreadsheet</div>
                                        </div>
                                    </label>
                                    <label class="format-option">
                                        <input type="radio" name="single-format" value="m3u" />
                                        <div class="format-card">
                                            <div class="format-icon">🎶</div>
                                            <div class="format-name">M3U</div>
                                            <div class="format-desc">Media player</div>
                                        </div>
                                    </label>
                                    <label class="format-option">
                                        <input type="radio" name="single-format" value="html" />
                                        <div class="format-card">
                                            <div class="format-icon">🌐</div>
                                            <div class="format-name">HTML</div>
                                            <div class="format-desc">Web report</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div id="single-format-description" class="format-description">
                                Complete playlist data with all metadata
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="single-export-btn" class="btn btn-primary" disabled>
                                📤 Export Playlist
                            </button>
                        </div>
                    </div>
                    
                    <!-- Multiple Playlists Export -->
                    <div id="multiple-export" class="export-content">
                        <div class="export-section">
                            <h4>🎵 Select Playlists</h4>
                            <div class="playlist-selection">
                                <div class="selection-header">
                                    <button id="select-all-playlists" class="btn btn-outline">Select All</button>
                                    <button id="deselect-all-playlists" class="btn btn-outline">Deselect All</button>
                                    <span id="selected-count">0 playlists selected</span>
                                </div>
                                <div id="multiple-playlists-list" class="playlists-checklist">
                                    <!-- Playlist checkboxes will be populated here -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <h4>📁 Export Options</h4>
                            <div class="export-options">
                                <div class="option-group">
                                    <label for="multiple-format">Export Format:</label>
                                    <select id="multiple-format" class="export-select">
                                        <option value="json">JSON (Recommended)</option>
                                        <option value="csv">CSV (Spreadsheet)</option>
                                        <option value="separate">Separate Files</option>
                                    </select>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="multiple-include-metadata" checked />
                                        Include video metadata
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="multiple-include-private" checked />
                                        Include private playlists
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="multiple-compress" />
                                        Compress output file
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="multiple-export-btn" class="btn btn-primary" disabled>
                                📤 Export Selected Playlists
                            </button>
                        </div>
                    </div>
                    
                    <!-- Full Backup -->
                    <div id="backup-export" class="export-content">
                        <div class="export-section">
                            <h4>💾 Application Backup</h4>
                            <p class="backup-description">
                                Create a complete backup of all your playlists, settings, and application data. 
                                This backup can be used to restore your entire library on another device or after reinstallation.
                            </p>
                            
                            <div class="backup-stats">
                                <div class="backup-stat">
                                    <span class="stat-value" id="backup-playlist-count">0</span>
                                    <span class="stat-label">Playlists</span>
                                </div>
                                <div class="backup-stat">
                                    <span class="stat-value" id="backup-video-count">0</span>
                                    <span class="stat-label">Videos</span>
                                </div>
                                <div class="backup-stat">
                                    <span class="stat-value" id="backup-download-count">0</span>
                                    <span class="stat-label">Downloads</span>
                                </div>
                                <div class="backup-stat">
                                    <span class="stat-value" id="backup-size-estimate">0 MB</span>
                                    <span class="stat-label">Est. Size</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <h4>⚙️ Backup Options</h4>
                            <div class="backup-options">
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backup-include-settings" checked />
                                        Include application settings
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backup-include-downloads" />
                                        Include download queue and history
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backup-include-thumbnails" />
                                        Include thumbnail images
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backup-compress" checked />
                                        Compress backup file
                                    </label>
                                </div>
                                
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backup-encrypt" />
                                        Encrypt backup with password
                                    </label>
                                </div>
                                
                                <div class="option-group" id="backup-password-group" style="display: none;">
                                    <label for="backup-password">Backup Password:</label>
                                    <input type="password" id="backup-password" class="export-input" placeholder="Enter password for encryption" />
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="backup-export-btn" class="btn btn-primary">
                                💾 Create Full Backup
                            </button>
                        </div>
                    </div>
                    
                    <!-- Import/Restore -->
                    <div id="import-export" class="export-content">
                        <div class="export-section">
                            <h4>📥 Import/Restore Data</h4>
                            <p class="import-description">
                                Import playlists from exported files or restore from a full application backup.
                            </p>
                            
                            <div class="import-options">
                                <div class="import-type">
                                    <h5>Import Single Playlist</h5>
                                    <div class="file-input-area">
                                        <input type="file" id="import-single-file" accept=".json,.csv,.m3u,.m3u8" style="display: none;" />
                                        <button id="import-single-btn" class="btn btn-outline">
                                            📁 Choose Playlist File
                                        </button>
                                        <div class="supported-formats">
                                            Supports: JSON, CSV, M3U, M3U8
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="import-separator">or</div>
                                
                                <div class="import-type">
                                    <h5>Restore Full Backup</h5>
                                    <div class="file-input-area">
                                        <input type="file" id="import-backup-file" accept=".ypm-backup,.zip" style="display: none;" />
                                        <button id="import-backup-btn" class="btn btn-outline">
                                            💾 Choose Backup File
                                        </button>
                                        <div class="supported-formats">
                                            Supports: .ypm-backup, .zip
                                        </div>
                                    </div>
                                    
                                    <div class="restore-options" id="restore-options" style="display: none;">
                                        <h6>Restore Options</h6>
                                        <div class="option-group">
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="restore-merge" checked />
                                                Merge with existing data (recommended)
                                            </label>
                                        </div>
                                        
                                        <div class="option-group">
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="restore-settings" checked />
                                                Restore application settings
                                            </label>
                                        </div>
                                        
                                        <div class="option-group" id="backup-decrypt-group" style="display: none;">
                                            <label for="restore-password">Backup Password:</label>
                                            <input type="password" id="restore-password" class="export-input" placeholder="Enter backup password" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="import-preview" class="import-preview" style="display: none;">
                            <h4>📋 Import Preview</h4>
                            <div id="import-preview-content">
                                <!-- Import preview will be shown here -->
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="confirm-import-btn" class="btn btn-primary" style="display: none;">
                                📥 Confirm Import
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Export Progress -->
                <div id="export-progress-section" class="export-progress-section" style="display: none;">
                    <div class="progress-header">
                        <h4 id="export-progress-title">Exporting...</h4>
                        <button id="cancel-export-btn" class="btn btn-outline">Cancel</button>
                    </div>
                    <div class="progress-content">
                        <div class="progress-bar">
                            <div id="export-progress-fill" class="progress-fill"></div>
                        </div>
                        <div class="progress-info">
                            <span id="export-progress-text">Preparing export...</span>
                            <span id="export-progress-percent">0%</span>
                        </div>
                        <div id="export-progress-details" class="progress-details">
                            <!-- Progress details will be shown here -->
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Setup event listeners for export functionality
     */
    setupExportEventListeners() {
        // Tab switching
        document.querySelectorAll('.export-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchExportTab(tab.dataset.tab));
        });

        // Single playlist export
        document.getElementById('single-playlist-select').addEventListener('change', (e) => {
            this.onSinglePlaylistSelect(e.target.value);
        });

        document.querySelectorAll('input[name="single-format"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateFormatDescription(radio.value, 'single'));
        });

        document.getElementById('single-export-btn').addEventListener('click', () => {
            this.exportSinglePlaylist();
        });

        // Multiple playlists export
        document.getElementById('select-all-playlists').addEventListener('click', () => {
            this.selectAllPlaylists(true);
        });

        document.getElementById('deselect-all-playlists').addEventListener('click', () => {
            this.selectAllPlaylists(false);
        });

        document.getElementById('multiple-export-btn').addEventListener('click', () => {
            this.exportMultiplePlaylists();
        });

        // Backup options
        document.getElementById('backup-encrypt').addEventListener('change', (e) => {
            document.getElementById('backup-password-group').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        document.getElementById('backup-export-btn').addEventListener('click', () => {
            this.createFullBackup();
        });

        // Import functionality
        document.getElementById('import-single-btn').addEventListener('click', () => {
            document.getElementById('import-single-file').click();
        });

        document.getElementById('import-backup-btn').addEventListener('click', () => {
            document.getElementById('import-backup-file').click();
        });

        document.getElementById('import-single-file').addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0], 'single');
        });

        document.getElementById('import-backup-file').addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0], 'backup');
        });

        document.getElementById('confirm-import-btn').addEventListener('click', () => {
            this.confirmImport();
        });

        // Progress controls
        document.getElementById('cancel-export-btn').addEventListener('click', () => {
            this.cancelExport();
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeExportModal());
        });
    }

    /**
     * Show the export modal
     */
    showExportModal(tab = 'single') {
        const modal = document.getElementById('playlist-export-modal');
        modal.style.display = 'flex';
        
        // Switch to specified tab
        this.switchExportTab(tab);
        
        // Load playlists data
        this.loadPlaylistsForExport();
        
        // Load backup stats
        this.loadBackupStats();
        
        // Emit modal shown event
        if (this.eventHandlers.onExportModalShown) {
            this.eventHandlers.onExportModalShown();
        }
    }

    /**
     * Close the export modal
     */
    closeExportModal() {
        const modal = document.getElementById('playlist-export-modal');
        modal.style.display = 'none';
        
        // Reset progress section
        document.getElementById('export-progress-section').style.display = 'none';
        
        // Clear any ongoing operations
        this.cancelExport();
    }

    /**
     * Switch between export tabs
     */
    switchExportTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.export-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update content sections
        document.querySelectorAll('.export-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-export`);
        });
    }

    /**
     * Load playlists for export selection
     */
    async loadPlaylistsForExport() {
        try {
            const playlists = await window.electronAPI.database.getAllPlaylists();
            
            // Update single playlist selector
            const singleSelect = document.getElementById('single-playlist-select');
            singleSelect.innerHTML = '<option value="">Choose a playlist to export...</option>';
            
            playlists.forEach(playlist => {
                const option = document.createElement('option');
                option.value = playlist.id;
                option.textContent = `${playlist.title} (${playlist.videoCount} videos)`;
                singleSelect.appendChild(option);
            });
            
            // Update multiple playlists checklist
            const multipleList = document.getElementById('multiple-playlists-list');
            multipleList.innerHTML = '';
            
            playlists.forEach(playlist => {
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'playlist-checkbox-item';
                checkboxItem.innerHTML = `
                    <label class="playlist-checkbox-label">
                        <input type="checkbox" value="${playlist.id}" class="playlist-checkbox" />
                        <div class="playlist-checkbox-content">
                            <img src="${playlist.thumbnail || 'assets/default-playlist.png'}" alt="Playlist thumbnail" />
                            <div class="playlist-checkbox-info">
                                <div class="playlist-checkbox-title">${playlist.title}</div>
                                <div class="playlist-checkbox-meta">
                                    ${playlist.videoCount} videos • ${playlist.category || 'Uncategorized'}
                                    ${playlist.isPrivate ? ' • Private' : ''}
                                </div>
                            </div>
                        </div>
                    </label>
                `;
                multipleList.appendChild(checkboxItem);
            });
            
            // Add change listeners to checkboxes
            this.setupPlaylistCheckboxListeners();
            
        } catch (error) {
            console.error('Failed to load playlists for export:', error);
        }
    }

    /**
     * Setup listeners for playlist checkboxes
     */
    setupPlaylistCheckboxListeners() {
        document.querySelectorAll('.playlist-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedPlaylistsCount();
            });
        });
    }

    /**
     * Update selected playlists count
     */
    updateSelectedPlaylistsCount() {
        const selected = document.querySelectorAll('.playlist-checkbox:checked').length;
        document.getElementById('selected-count').textContent = `${selected} playlists selected`;
        
        // Enable/disable export button
        document.getElementById('multiple-export-btn').disabled = selected === 0;
    }

    /**
     * Select/deselect all playlists
     */
    selectAllPlaylists(select) {
        document.querySelectorAll('.playlist-checkbox').forEach(checkbox => {
            checkbox.checked = select;
        });
        this.updateSelectedPlaylistsCount();
    }

    /**
     * Handle single playlist selection
     */
    async onSinglePlaylistSelect(playlistId) {
        const exportBtn = document.getElementById('single-export-btn');
        const playlistInfo = document.getElementById('single-playlist-info');
        
        if (!playlistId) {
            exportBtn.disabled = true;
            playlistInfo.style.display = 'none';
            return;
        }
        
        try {
            const playlist = await window.electronAPI.database.getPlaylist(playlistId);
            const videos = await window.electronAPI.database.getPlaylistVideos(playlistId);
            
            // Calculate total duration
            const totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
            
            // Update playlist info display
            document.getElementById('single-playlist-thumbnail').src = 
                playlist.thumbnail || 'assets/default-playlist.png';
            document.getElementById('single-playlist-title').textContent = playlist.title;
            document.getElementById('single-playlist-description').textContent = 
                playlist.description || 'No description available';
            document.getElementById('single-playlist-count').textContent = `${videos.length} videos`;
            document.getElementById('single-playlist-duration').textContent = 
                this.formatDuration(totalDuration);
            
            playlistInfo.style.display = 'block';
            exportBtn.disabled = false;
            
        } catch (error) {
            console.error('Failed to load playlist info:', error);
            exportBtn.disabled = true;
            playlistInfo.style.display = 'none';
        }
    }

    /**
     * Update format description
     */
    updateFormatDescription(format, type) {
        const descElement = document.getElementById(`${type}-format-description`);
        const formatInfo = this.supportedFormats[format];
        
        if (formatInfo && descElement) {
            descElement.textContent = formatInfo.description;
        }
    }

    /**
     * Load backup statistics
     */
    async loadBackupStats() {
        try {
            const stats = await window.electronAPI.database.getBackupStats();
            
            document.getElementById('backup-playlist-count').textContent = stats.playlistCount || 0;
            document.getElementById('backup-video-count').textContent = stats.videoCount || 0;
            document.getElementById('backup-download-count').textContent = stats.downloadCount || 0;
            document.getElementById('backup-size-estimate').textContent = 
                this.formatFileSize(stats.estimatedSize || 0);
                
        } catch (error) {
            console.error('Failed to load backup stats:', error);
        }
    }

    /**
     * Export single playlist
     */
    async exportSinglePlaylist() {
        const playlistId = document.getElementById('single-playlist-select').value;
        const format = document.querySelector('input[name="single-format"]:checked').value;
        
        if (!playlistId || !format) return;
        
        try {
            this.showExportProgress('Exporting playlist...');
            
            const result = await this.performExport('single', {
                playlistId: playlistId,
                format: format,
                options: this.exportOptions
            });
            
            this.hideExportProgress();
            this.showExportSuccess(result);
            
        } catch (error) {
            this.hideExportProgress();
            this.showExportError(error);
        }
    }

    /**
     * Export multiple playlists
     */
    async exportMultiplePlaylists() {
        const selectedIds = Array.from(document.querySelectorAll('.playlist-checkbox:checked'))
            .map(cb => cb.value);
        const format = document.getElementById('multiple-format').value;
        
        if (selectedIds.length === 0) return;
        
        const options = {
            includeMetadata: document.getElementById('multiple-include-metadata').checked,
            includePrivate: document.getElementById('multiple-include-private').checked,
            compress: document.getElementById('multiple-compress').checked
        };
        
        try {
            this.showExportProgress('Exporting playlists...');
            
            const result = await this.performExport('multiple', {
                playlistIds: selectedIds,
                format: format,
                options: { ...this.exportOptions, ...options }
            });
            
            this.hideExportProgress();
            this.showExportSuccess(result);
            
        } catch (error) {
            this.hideExportProgress();
            this.showExportError(error);
        }
    }

    /**
     * Create full backup
     */
    async createFullBackup() {
        const options = {
            includeSettings: document.getElementById('backup-include-settings').checked,
            includeDownloads: document.getElementById('backup-include-downloads').checked,
            includeThumbnails: document.getElementById('backup-include-thumbnails').checked,
            compress: document.getElementById('backup-compress').checked,
            encrypt: document.getElementById('backup-encrypt').checked,
            password: document.getElementById('backup-password').value
        };
        
        if (options.encrypt && !options.password) {
            alert('Please enter a password for encryption');
            return;
        }
        
        try {
            this.showExportProgress('Creating backup...');
            
            const result = await this.performExport('backup', {
                format: 'backup',
                options: { ...this.exportOptions, ...options }
            });
            
            this.hideExportProgress();
            this.showExportSuccess(result);
            
        } catch (error) {
            this.hideExportProgress();
            this.showExportError(error);
        }
    }

    /**
     * Perform the actual export operation
     */
    async performExport(type, params) {
        // This will call the main process to handle the export
        return await window.electronAPI.exports.exportData(type, params);
    }

    /**
     * Show export progress
     */
    showExportProgress(title) {
        document.getElementById('export-progress-section').style.display = 'block';
        document.getElementById('export-progress-title').textContent = title;
        document.getElementById('export-progress-fill').style.width = '0%';
        document.getElementById('export-progress-text').textContent = 'Starting...';
        document.getElementById('export-progress-percent').textContent = '0%';
    }

    /**
     * Update export progress
     */
    updateExportProgress(progress, text) {
        document.getElementById('export-progress-fill').style.width = `${progress}%`;
        document.getElementById('export-progress-text').textContent = text;
        document.getElementById('export-progress-percent').textContent = `${Math.round(progress)}%`;
    }

    /**
     * Hide export progress
     */
    hideExportProgress() {
        document.getElementById('export-progress-section').style.display = 'none';
    }

    /**
     * Show export success message
     */
    showExportSuccess(result) {
        alert(`Export completed successfully!\nFile saved to: ${result.filePath}`);
        
        // Add to export history
        this.addToExportHistory({
            type: result.type,
            format: result.format,
            filePath: result.filePath,
            fileSize: result.fileSize,
            itemCount: result.itemCount,
            timestamp: new Date()
        });
        
        // Emit success event
        if (this.eventHandlers.onExportSuccess) {
            this.eventHandlers.onExportSuccess(result);
        }
    }

    /**
     * Show export error message
     */
    showExportError(error) {
        console.error('Export error:', error);
        alert(`Export failed: ${error.message}`);
        
        // Emit error event
        if (this.eventHandlers.onExportError) {
            this.eventHandlers.onExportError(error);
        }
    }

    /**
     * Cancel ongoing export
     */
    cancelExport() {
        // Implementation for canceling export
        if (window.electronAPI.exports.cancelExport) {
            window.electronAPI.exports.cancelExport();
        }
    }

    /**
     * Handle import file selection
     */
    async handleImportFile(file, type) {
        if (!file) return;
        
        try {
            // Read file and preview contents
            const preview = await this.previewImportFile(file, type);
            this.showImportPreview(preview);
            
        } catch (error) {
            console.error('Failed to preview import file:', error);
            alert(`Failed to read file: ${error.message}`);
        }
    }

    /**
     * Preview import file contents
     */
    async previewImportFile(file, type) {
        // This will be implemented to analyze the import file
        return await window.electronAPI.exports.previewImport(file.path, type);
    }

    /**
     * Show import preview
     */
    showImportPreview(preview) {
        const previewSection = document.getElementById('import-preview');
        const previewContent = document.getElementById('import-preview-content');
        
        previewContent.innerHTML = `
            <div class="import-summary">
                <h5>Import Summary</h5>
                <div class="import-stats">
                    <div class="import-stat">
                        <span class="stat-value">${preview.playlistCount || 0}</span>
                        <span class="stat-label">Playlists</span>
                    </div>
                    <div class="import-stat">
                        <span class="stat-value">${preview.videoCount || 0}</span>
                        <span class="stat-label">Videos</span>
                    </div>
                </div>
                <div class="import-details">
                    ${preview.details || 'No additional details available'}
                </div>
            </div>
        `;
        
        previewSection.style.display = 'block';
        document.getElementById('confirm-import-btn').style.display = 'block';
    }

    /**
     * Confirm import operation
     */
    async confirmImport() {
        // Implementation for confirming and executing import
        try {
            const result = await window.electronAPI.exports.confirmImport();
            alert(`Import completed successfully! ${result.message}`);
            this.closeExportModal();
            
            // Emit import success event
            if (this.eventHandlers.onImportSuccess) {
                this.eventHandlers.onImportSuccess(result);
            }
            
        } catch (error) {
            console.error('Import error:', error);
            alert(`Import failed: ${error.message}`);
        }
    }

    /**
     * Add to export history
     */
    addToExportHistory(exportRecord) {
        this.exportHistory.unshift(exportRecord);
        
        // Keep only last 50 exports
        if (this.exportHistory.length > 50) {
            this.exportHistory = this.exportHistory.slice(0, 50);
        }
        
        this.saveExportHistory();
    }

    /**
     * Load export history
     */
    async loadExportHistory() {
        try {
            const history = localStorage.getItem('playlistExportHistory');
            if (history) {
                this.exportHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Failed to load export history:', error);
            this.exportHistory = [];
        }
    }

    /**
     * Save export history
     */
    saveExportHistory() {
        try {
            localStorage.setItem('playlistExportHistory', JSON.stringify(this.exportHistory));
        } catch (error) {
            console.error('Failed to save export history:', error);
        }
    }

    /**
     * Load export options
     */
    loadExportOptions() {
        try {
            const options = localStorage.getItem('playlistExportOptions');
            if (options) {
                this.exportOptions = { ...this.exportOptions, ...JSON.parse(options) };
            }
        } catch (error) {
            console.error('Failed to load export options:', error);
        }
    }

    /**
     * Save export options
     */
    saveExportOptions() {
        try {
            localStorage.setItem('playlistExportOptions', JSON.stringify(this.exportOptions));
        } catch (error) {
            console.error('Failed to save export options:', error);
        }
    }

    /**
     * Get export history
     */
    getExportHistory() {
        return this.exportHistory;
    }

    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return this.supportedFormats;
    }

    /**
     * Utility: Format duration
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Utility: Format file size
     */
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.saveExportOptions();
        this.saveExportHistory();
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaylistExportManager;
}
