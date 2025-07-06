// Main renderer process script
class YouTubePlaylistManager {
    constructor() {
        this.currentPage = 'import';
        this.playlists = [];
        this.allPlaylists = [];
        this.downloadQueue = [];
        this.currentView = localStorage.getItem('playlistView') || 'grid';
        this.playlistVideoManager = null; // Enhanced video management system
        this.searchFilterManager = null; // Advanced search and filter system
        this.ffmpegManager = null; // FFmpeg conversion system
        this.batchDownloadManager = null; // Batch download system
        this.videoPreviewManager = null; // Video preview system
        this.offlineVideoManager = null; // Offline video access system
        this.selectedPlaylists = new Set(); // Track selected playlists for batch download
        this.errorManager = null; // Comprehensive error handling system
        this.componentUpdateManager = null; // Component update management system
        this.init();
    }

    async init() {
        // Initialize error handling first
        this.initializeErrorHandling();
        
        // Initialize component update management
        this.initializeComponentUpdates();
        
        this.setupNavigation();
        this.setupEventListeners();
        await this.loadAppVersion();
        this.loadComponentUpdateSettings(); // Load component update settings
        await this.loadPlaylists();
        this.setupDownloadEventListeners();
        
        // Update component status on startup
        setTimeout(() => {
            this.updateComponentStatus();
        }, 1000);
    }

    initializeErrorHandling() {
        try {
            // Initialize the comprehensive error handling system
            this.errorManager = new ErrorManager();
            
            // Set up global error handlers
            this.errorManager.setupGlobalHandlers();
            
            console.log('Error handling system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize error handling system:', error);
            // Fallback error display
            this.showStatus('Error handling system initialization failed', 'error');
        }
    }

    initializeComponentUpdates() {
        try {
            // Initialize the component update management system
            this.componentUpdateManager = new ComponentUpdateManager();
            
            console.log('Component update system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize component update system:', error);
            this.showStatus('Component update system initialization failed', 'error');
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const pages = document.querySelectorAll('.page');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetPage = button.dataset.page;
                
                // Update navigation
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update pages
                pages.forEach(page => page.classList.remove('active'));
                document.getElementById(`${targetPage}-page`).classList.add('active');
                
                this.currentPage = targetPage;
                
                // Load page specific data
                this.loadPageData(targetPage);
            });
        });
    }

    setupEventListeners() {
        // Import playlist
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importPlaylist();
        });

        // Create custom playlist (simple)
        document.getElementById('create-playlist-btn').addEventListener('click', () => {
            this.createCustomPlaylist();
        });

        // Advanced playlist creation
        document.getElementById('advanced-create-btn').addEventListener('click', () => {
            this.showPlaylistCreationModal();
        });

        // Playlist creation modal form
        document.getElementById('create-playlist-modal-btn').addEventListener('click', () => {
            this.createAdvancedPlaylist();
        });

        // Auto-download checkbox handler
        document.getElementById('playlist-auto-download').addEventListener('change', (e) => {
            const downloadSettings = document.getElementById('download-settings');
            downloadSettings.style.display = e.target.checked ? 'block' : 'none';
        });

        // Thumbnail upload handler
        document.getElementById('playlist-thumbnail').addEventListener('change', (e) => {
            this.handleThumbnailUpload(e);
        });

        // Video addition functionality
        document.getElementById('floating-add-video-btn').addEventListener('click', () => {
            this.showAddVideoModal();
        });

        document.getElementById('fetch-video-info-btn').addEventListener('click', () => {
            this.fetchVideoInfo();
        });

        document.getElementById('preview-video-btn').addEventListener('click', () => {
            this.previewVideoFromModal();
        });

        document.getElementById('add-video-btn').addEventListener('click', () => {
            this.addVideoToPlaylist();
        });

        document.getElementById('add-video-to-playlist-btn').addEventListener('click', () => {
            this.showAddVideoModal();
        });

        // My Playlists page enhancements
        document.getElementById('create-playlist-header-btn').addEventListener('click', () => {
            this.showPlaylistCreationModal();
        });

        // Duplicate Manager button
        document.getElementById('duplicate-manager-btn').addEventListener('click', () => {
            if (window.duplicateManager) {
                window.duplicateManager.show();
            }
        });

        document.getElementById('clear-search-btn').addEventListener('click', () => {
            this.clearSearch();
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterPlaylists();
        });

        document.getElementById('source-filter').addEventListener('change', (e) => {
            this.filterPlaylists();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortPlaylists(e.target.value);
        });

        document.getElementById('grid-view-btn').addEventListener('click', () => {
            this.setPlaylistView('grid');
        });

        document.getElementById('list-view-btn').addEventListener('click', () => {
            this.setPlaylistView('list');
        });

        // Auto-download video checkbox handler
        document.getElementById('auto-download-video').addEventListener('change', (e) => {
            const downloadSettings = document.getElementById('video-download-settings');
            downloadSettings.style.display = e.target.checked ? 'block' : 'none';
        });

        // Video URL input handler
        document.getElementById('video-url').addEventListener('input', (e) => {
            this.validateVideoUrl(e.target.value);
        });

        // Target playlist selection handler
        document.getElementById('target-playlist').addEventListener('change', (e) => {
            this.updateAddVideoButton();
        });

        // Search functionality with debouncing
        let searchTimeout;
        document.getElementById('playlist-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            // Show/hide clear button
            const clearBtn = document.getElementById('clear-search-btn');
            clearBtn.style.display = query ? 'block' : 'none';
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                this.searchPlaylists(query);
            }, 300);
        });

        // Enter key support for inputs
        document.getElementById('playlist-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.importPlaylist();
        });

        document.getElementById('new-playlist-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createCustomPlaylist();
        });

        document.getElementById('playlist-title').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createAdvancedPlaylist();
        });

        document.getElementById('video-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchVideoInfo();
        });

        // Search functionality
        document.getElementById('playlist-search').addEventListener('input', (e) => {
            this.searchPlaylists(e.target.value);
        });

        // Settings
        document.getElementById('browse-location-btn').addEventListener('click', () => {
            this.browseDownloadLocation();
        });

        // Component Update Settings
        document.getElementById('check-components-btn').addEventListener('click', () => {
            this.checkComponentUpdates();
        });

        document.getElementById('manage-components-btn').addEventListener('click', () => {
            this.showComponentManagementModal();
        });

        // Auto-update checkboxes
        document.getElementById('auto-update-components').addEventListener('change', (e) => {
            this.saveComponentUpdateSettings();
        });

        document.getElementById('auto-update-ytdl').addEventListener('change', (e) => {
            this.saveComponentUpdateSettings();
        });

        document.getElementById('auto-update-ffmpeg').addEventListener('change', (e) => {
            this.saveComponentUpdateSettings();
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        document.getElementById('modal-download-btn').addEventListener('click', () => {
            this.downloadVideoFromModal();
        });

        // Clear completed downloads
        document.getElementById('clear-completed-btn').addEventListener('click', () => {
            this.clearCompletedDownloads();
        });

        // Download control buttons
        document.getElementById('pause-all-btn').addEventListener('click', () => {
            this.pauseAllDownloads();
        });

        document.getElementById('resume-all-btn').addEventListener('click', () => {
            this.resumeAllDownloads();
        });

        // Download status filter
        document.getElementById('download-status-filter').addEventListener('change', (e) => {
            this.filterDownloads(e.target.value);
        });

        // Offline video library controls
        document.getElementById('open-offline-library-btn').addEventListener('click', () => {
            this.toggleOfflineLibrary();
        });

        document.getElementById('refresh-offline-library-btn').addEventListener('click', () => {
            this.refreshOfflineLibrary();
        });

        document.getElementById('offline-video-search').addEventListener('input', (e) => {
            this.searchOfflineVideos(e.target.value);
        });

        document.getElementById('offline-format-filter').addEventListener('change', (e) => {
            this.filterOfflineVideosByFormat(e.target.value);
        });

        document.getElementById('offline-sort-filter').addEventListener('change', (e) => {
            this.sortOfflineVideos(e.target.value);
        });
    }

    setupDownloadEventListeners() {
        // Listen for download progress updates
        window.electronAPI.onDownloadProgress((data) => {
            this.updateDownloadProgress(data);
        });

        window.electronAPI.onDownloadComplete((data) => {
            this.handleDownloadComplete(data);
        });

        window.electronAPI.onDownloadError((data) => {
            this.handleDownloadError(data);
        });

        // Export functionality
        this.setupExportEventListeners();
    }

    async loadAppVersion() {
        try {
            const version = await window.electronAPI.getVersion();
            document.getElementById('app-version').textContent = version;
        } catch (error) {
            console.error('Failed to load app version:', error);
        }
    }

    async loadPageData(page) {
        switch (page) {
            case 'playlists':
                await this.loadPlaylists();
                this.initializePlaylistPageControls();
                await this.initializeExportSystem();
                break;
            case 'downloads':
                await this.loadDownloadQueue();
                this.initializeOfflineVideoSystem();
                break;
            case 'conversion':
                this.initializeConversionPage();
                break;
            case 'settings':
                this.updateComponentStatus();
                break;
        }
        
        // Initialize video preview system if not already done
        this.initializeVideoPreviewSystem();
    }

    initializePlaylistPageControls() {
        // Initialize view mode buttons
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if (gridBtn) gridBtn.classList.toggle('active', this.currentView === 'grid');
        if (listBtn) listBtn.classList.toggle('active', this.currentView === 'list');
        
        // Initialize filter dropdowns with actual data
        this.populateFilterDropdowns();
        
        // Initialize search and filter system
        this.initializeSearchSystem();
        
        // Initialize batch download system
        this.initializeBatchDownloadSystem();
    }

    populateFilterDropdowns() {
        const categoryFilter = document.getElementById('category-filter');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!categoryFilter || !sourceFilter || !this.allPlaylists) return;
        
        // Get unique categories
        const categories = [...new Set(this.allPlaylists.map(p => p.category || 'Uncategorized'))];
        const sources = [...new Set(this.allPlaylists.map(p => p.source || 'custom'))];
        
        // Populate category filter
        categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
        // Populate source filter
        sourceFilter.innerHTML = '<option value="all">All Sources</option>' +
            sources.map(source => `<option value="${source}">${source}</option>`).join('');
    }

    initializeSearchSystem() {
        // Clean up existing search system if it exists
        if (this.searchFilterManager) {
            this.searchFilterManager.destroy();
        }

        // Initialize the search and filter manager
        try {
            this.searchFilterManager = new SearchFilterManager({
                enableFuzzySearch: true,
                enableRealTimeSearch: true,
                debounceMs: 300,
                maxResults: 50,
                highlightMatches: true,
                enableFilters: true,
                enableSavedSearches: true
            });

            console.log('Search and filter system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize search system:', error);
        }
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        text.textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    showStatus(message, type = 'info') {
        // Use ErrorManager if available, otherwise fall back to old method
        if (this.errorManager) {
            const severityMap = {
                'success': 'success',
                'info': 'info',
                'warning': 'warning',
                'error': 'error'
            };
            
            this.errorManager.showNotification(message, severityMap[type] || 'info');
        } else {
            // Fallback to original status display
            const statusElement = document.getElementById('import-status');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `status-message ${type}`;
                statusElement.style.display = 'block';
                
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 5000);
            }
        }
    }

    async importPlaylist() {
        const urlInput = document.getElementById('playlist-url');
        const url = urlInput.value.trim();

        if (!url) {
            this.showStatus('Please enter a YouTube playlist URL', 'error');
            return;
        }

        // Validate URL using our new service
        try {
            const validation = await window.electronAPI.youtube.validateUrl(url);
            if (!validation.success || !validation.isValid) {
                this.showStatus('Please enter a valid YouTube playlist, channel, or user URL', 'error');
                return;
            }
        } catch (error) {
            if (this.errorManager) {
                this.errorManager.handleError(error, 'youtube', {
                    operation: 'validateUrl',
                    url: url,
                    userMessage: 'Failed to validate YouTube URL',
                    retryable: true
                });
            } else {
                this.showStatus('Error validating URL: ' + error.message, 'error');
            }
            return;
        }

        this.showLoading('Importing playlist...');
        
        // Set up progress listener
        let progressShown = false;
        window.electronAPI.onYouTubeImportProgress((progress) => {
            if (!progressShown) {
                this.showLoading(progress.message);
                progressShown = true;
            } else {
                // Update loading message
                const loadingElement = document.querySelector('.loading-text');
                if (loadingElement) {
                    loadingElement.textContent = progress.message + 
                        (progress.videosProcessed > 0 ? ` (${progress.videosProcessed}/${progress.totalVideos})` : '');
                }
            }
        });
        
        try {
            const result = await window.electronAPI.youtube.importPlaylist(url);
            this.hideLoading();
            
            if (result.success && result.playlist) {
                // Save playlist to database
                const dbResult = await window.electronAPI.database.createPlaylist(
                    result.playlist.title || 'Imported Playlist',
                    result.playlist.description || 'Imported from YouTube'
                );
                
                if (dbResult.success) {
                    // Add videos to the playlist
                    const playlistId = dbResult.playlist.id;
                    
                    for (const video of result.playlist.videos) {
                        await window.electronAPI.database.addVideoToPlaylist(playlistId, {
                            youtubeId: video.id,
                            title: video.title,
                            description: video.description || '',
                            thumbnail: video.thumbnail,
                            duration: video.duration || 0,
                            url: video.url,
                            uploader: video.uploader,
                            uploadDate: video.uploadDate
                        });
                    }
                    
                    this.showStatus(`Successfully imported "${result.playlist.title}" with ${result.playlist.videos.length} videos`, 'success');
                    urlInput.value = '';
                    await this.loadPlaylists();
                } else {
                    const error = new Error(dbResult.error || 'Unknown database error');
                    if (this.errorManager) {
                        this.errorManager.handleError(error, 'database', {
                            operation: 'createPlaylist',
                            playlistTitle: result.playlist.title,
                            userMessage: 'Failed to save playlist to database',
                            retryable: true
                        });
                    } else {
                        this.showStatus('Error saving playlist to database: ' + (dbResult.error || 'Unknown error'), 'error');
                    }
                }
            } else {
                const error = new Error(result.error || 'Failed to import playlist');
                if (this.errorManager) {
                    this.errorManager.handleError(error, 'youtube', {
                        operation: 'importPlaylist',
                        url: url,
                        userMessage: 'Failed to import playlist from YouTube',
                        retryable: true
                    });
                } else {
                    this.showStatus(result.error || 'Failed to import playlist', 'error');
                }
            }
        } catch (error) {
            this.hideLoading();
            if (this.errorManager) {
                this.errorManager.handleError(error, 'youtube', {
                    operation: 'importPlaylist',
                    url: url,
                    userMessage: 'Failed to import playlist',
                    retryable: true
                });
            } else {
                this.showStatus('Error importing playlist: ' + error.message, 'error');
            }
        } finally {
            // Remove progress listener
            window.electronAPI.removeAllListeners('youtube:import-progress');
        }
    }

    async createCustomPlaylist() {
        const nameInput = document.getElementById('new-playlist-name');
        const name = nameInput.value.trim();

        if (!name) {
            this.showStatus('Please enter a playlist name', 'error');
            return;
        }

        if (name.length > 100) {
            this.showStatus('Playlist name is too long (max 100 characters)', 'error');
            return;
        }

        this.showLoading('Creating playlist...');
        
        try {
            // Create simple playlist with basic metadata
            const playlistData = {
                title: name,
                description: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                category: 'uncategorized',
                thumbnail: '',
                is_private: false,
                auto_download_enabled: false
            };
            
            await window.electronAPI.database.createPlaylist(playlistData);
            this.hideLoading();
            this.showStatus(`Successfully created playlist "${name}"`, 'success');
            nameInput.value = '';
            await this.loadPlaylists();
        } catch (error) {
            this.hideLoading();
            this.showStatus('Error creating playlist: ' + error.message, 'error');
        }
    }

    showPlaylistCreationModal() {
        document.getElementById('playlist-creation-modal').style.display = 'flex';
        document.getElementById('playlist-title').focus();
        
        // Reset form
        document.getElementById('playlist-title').value = '';
        document.getElementById('playlist-description').value = '';
        document.getElementById('playlist-category').value = 'uncategorized';
        document.getElementById('playlist-thumbnail').value = '';
        document.getElementById('playlist-private').checked = false;
        document.getElementById('playlist-auto-download').checked = false;
        document.getElementById('download-settings').style.display = 'none';
        document.getElementById('thumbnail-preview').style.display = 'none';
    }

    async createAdvancedPlaylist() {
        const title = document.getElementById('playlist-title').value.trim();
        const description = document.getElementById('playlist-description').value.trim();
        const category = document.getElementById('playlist-category').value;
        const isPrivate = document.getElementById('playlist-private').checked;
        const autoDownload = document.getElementById('playlist-auto-download').checked;
        
        // Validation
        if (!title) {
            this.showStatus('Please enter a playlist title', 'error');
            return;
        }

        if (title.length > 100) {
            this.showStatus('Playlist title is too long (max 100 characters)', 'error');
            return;
        }

        if (description.length > 500) {
            this.showStatus('Playlist description is too long (max 500 characters)', 'error');
            return;
        }

        // Get download settings if auto-download is enabled
        let downloadSettings = null;
        if (autoDownload) {
            const quality = document.getElementById('download-quality').value;
            const format = document.getElementById('download-format').value;
            const audioOnly = document.getElementById('audio-only').checked;
            
            downloadSettings = {
                quality,
                format,
                audio_only: audioOnly
            };
        }

        // Get thumbnail (base64 if uploaded)
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnail = thumbnailPreview.style.display === 'block' ? 
            thumbnailPreview.querySelector('img').src : '';

        const playlistData = {
            title,
            description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category,
            thumbnail,
            is_private: isPrivate,
            auto_download_enabled: autoDownload,
            download_settings: downloadSettings ? JSON.stringify(downloadSettings) : null
        };

        this.showLoading('Creating playlist...');

        try {
            await window.electronAPI.database.createPlaylist(playlistData);
            this.hideLoading();
            this.closeModal();
            this.showStatus(`Successfully created playlist "${title}"`, 'success');
            await this.loadPlaylists();
        } catch (error) {
            this.hideLoading();
            this.showStatus('Error creating playlist: ' + error.message, 'error');
        }
    }

    handleThumbnailUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showStatus('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showStatus('Image file is too large (max 5MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const thumbnailPreview = document.getElementById('thumbnail-preview');
            const img = thumbnailPreview.querySelector('img');
            
            img.src = e.target.result;
            thumbnailPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset forms when closing modals
        document.getElementById('add-video-form').reset();
        document.getElementById('video-info-preview').style.display = 'none';
        document.getElementById('video-download-settings').style.display = 'none';
        document.getElementById('add-video-btn').disabled = true;
        
        // Reset quality selection
        if (window.qualitySelectionBridge) {
            window.qualitySelectionBridge.resetSelection();
        }
    }

    showAddVideoModal() {
        // Populate playlist options
        this.populatePlaylistOptions();
        
        // Show modal
        document.getElementById('add-video-modal').style.display = 'flex';
        document.getElementById('video-url').focus();
        
        // Reset form
        document.getElementById('add-video-form').reset();
        document.getElementById('video-info-preview').style.display = 'none';
        document.getElementById('video-download-settings').style.display = 'none';
        document.getElementById('add-video-btn').disabled = true;
        
        // Reset quality selection
        if (window.qualitySelectionBridge) {
            window.qualitySelectionBridge.resetSelection();
        }
    }

    async populatePlaylistOptions() {
        const select = document.getElementById('target-playlist');
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        try {
            const playlists = await window.electronAPI.database.getPlaylists();
            playlists.forEach(playlist => {
                const option = document.createElement('option');
                option.value = playlist.id;
                option.textContent = playlist.title;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load playlists:', error);
            this.showStatus('Failed to load playlists', 'error');
        }
    }

    validateVideoUrl(url) {
        const isValid = url && (
            url.includes('youtube.com/watch?v=') ||
            url.includes('youtu.be/') ||
            url.includes('youtube.com/shorts/')
        );
        
        // Enable/disable fetch button
        document.getElementById('fetch-video-info-btn').disabled = !isValid;
        
        // Update add video button state
        this.updateAddVideoButton();
        
        return isValid;
    }

    async fetchVideoInfo() {
        const url = document.getElementById('video-url').value.trim();
        
        if (!this.validateVideoUrl(url)) {
            this.showStatus('Please enter a valid YouTube URL', 'error');
            return;
        }

        this.showLoading('Fetching video information...');
        
        try {
            const videoInfo = await window.electronAPI.youtube.getVideoInfo(url);
            
            if (videoInfo.success) {
                this.displayVideoPreview(videoInfo.data);
                this.currentVideoInfo = videoInfo.data;
                this.updateAddVideoButton();
                this.hideLoading();
                this.showStatus('Video information loaded successfully', 'success');
            } else {
                this.hideLoading();
                this.showStatus(`Failed to fetch video info: ${videoInfo.error}`, 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error fetching video info:', error);
            this.showStatus('Failed to fetch video information', 'error');
        }
    }

    displayVideoPreview(videoInfo) {
        const preview = document.getElementById('video-info-preview');
        const thumbnail = document.getElementById('preview-thumbnail');
        const title = document.getElementById('preview-title');
        const description = document.getElementById('preview-description');
        const duration = document.getElementById('preview-duration');
        const views = document.getElementById('preview-views');
        const uploadDate = document.getElementById('preview-upload-date');
        const uploader = document.getElementById('preview-uploader');

        thumbnail.src = videoInfo.thumbnail || '';
        title.textContent = videoInfo.title || 'Unknown Title';
        description.textContent = videoInfo.description || 'No description available';
        duration.textContent = `Duration: ${this.formatDuration(videoInfo.duration)}`;
        views.textContent = `Views: ${this.formatNumber(videoInfo.view_count)}`;
        uploadDate.textContent = `Uploaded: ${this.formatDate(videoInfo.upload_date)}`;
        uploader.textContent = `Channel: ${videoInfo.uploader || 'Unknown'}`;

        preview.style.display = 'block';
    }

    async previewVideoFromModal() {
        const url = document.getElementById('video-url').value.trim();
        
        if (!this.validateVideoUrl(url)) {
            this.showStatus('Please enter a valid YouTube URL', 'error');
            return;
        }

        if (this.videoPreviewManager) {
            await this.videoPreviewManager.showVideoPreview(url);
        } else {
            this.showStatus('Video preview system not available', 'error');
        }
    }

    formatDuration(seconds) {
        if (!seconds) return '--:--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }

    updateAddVideoButton() {
        const url = document.getElementById('video-url').value.trim();
        const playlist = document.getElementById('target-playlist').value;
        const hasVideoInfo = !!this.currentVideoInfo;
        
        const isValid = this.validateVideoUrl(url) && playlist && hasVideoInfo;
        document.getElementById('add-video-btn').disabled = !isValid;
    }

    async addVideoToPlaylist() {
        const playlistId = document.getElementById('target-playlist').value;
        const autoDownload = document.getElementById('auto-download-video').checked;
        
        if (!this.currentVideoInfo || !playlistId) {
            this.showStatus('Please select a playlist and fetch video information', 'error');
            return;
        }

        this.showLoading('Adding video to playlist...');

        try {
            // Prepare video data for database
            const videoData = {
                id: this.currentVideoInfo.id,
                title: this.currentVideoInfo.title,
                description: this.currentVideoInfo.description,
                thumbnail: this.currentVideoInfo.thumbnail,
                duration: this.currentVideoInfo.duration,
                views: this.currentVideoInfo.view_count,
                url: this.currentVideoInfo.webpage_url,
                upload_date: this.currentVideoInfo.upload_date,
                uploader: this.currentVideoInfo.uploader,
                uploader_id: this.currentVideoInfo.uploader_id
            };

            // Add video to playlist
            await window.electronAPI.database.addVideoToPlaylist(parseInt(playlistId), videoData);

            // Handle auto-download if enabled
            if (autoDownload) {
                const audioOnly = document.getElementById('video-audio-only').checked;
                let quality = 'best'; // Default fallback
                let format = 'mp4';   // Default fallback

                // Get selected quality from quality selection bridge
                if (window.qualitySelectionBridge) {
                    const selectedFormat = window.qualitySelectionBridge.getSelectedFormat();
                    if (selectedFormat) {
                        quality = selectedFormat.formatId;
                        // Extract format from format ID if possible, otherwise use default
                        if (quality.includes('mp4')) format = 'mp4';
                        else if (quality.includes('webm')) format = 'webm';
                        else if (quality.includes('mkv')) format = 'mkv';
                    }
                }

                const downloadOptions = {
                    quality,
                    format,
                    audio_only: audioOnly
                };

                // Add to download queue
                await window.electronAPI.downloads.downloadVideo(videoData, downloadOptions);
            }

            this.hideLoading();
            this.closeModal();
            this.showStatus(`Video "${this.currentVideoInfo.title}" added to playlist successfully`, 'success');
            
            // Refresh playlists to update video counts
            await this.loadPlaylists();
            
            // Clear current video info
            this.currentVideoInfo = null;

        } catch (error) {
            this.hideLoading();
            console.error('Error adding video to playlist:', error);
            this.showStatus('Failed to add video to playlist', 'error');
        }
    }

    async loadPlaylists() {
        try {
            this.playlists = await window.electronAPI.database.getPlaylists();
            this.renderPlaylists();
        } catch (error) {
            console.error('Failed to load playlists:', error);
            if (this.errorManager) {
                this.errorManager.handleError(error, 'database', {
                    operation: 'getPlaylists',
                    userMessage: 'Failed to load playlists from database',
                    retryable: true,
                    retryAction: () => this.loadPlaylists()
                });
            } else {
                this.showStatus('Failed to load playlists', 'error');
            }
        }
    }

    async renderPlaylists() {
        try {
            console.log('Rendering playlists...');
            const playlists = await window.electronAPI.getPlaylists();
            console.log('Retrieved playlists:', playlists);
            
            // Store all playlists for filtering/searching
            this.allPlaylists = playlists;
            this.playlists = playlists; // Maintain compatibility
            
            // Update statistics
            this.updatePlaylistStats(playlists);
            
            // Display playlists
            this.displayPlaylists(playlists);
            
        } catch (error) {
            console.error('Error rendering playlists:', error);
            this.showStatus('Error loading playlists', 'error');
        }
    }

    updatePlaylistStats(playlists) {
        const totalPlaylists = playlists.length;
        const totalVideos = playlists.reduce((sum, playlist) => sum + (playlist.video_count || 0), 0);
        const avgVideosPerPlaylist = totalPlaylists > 0 ? Math.round(totalVideos / totalPlaylists) : 0;

        // Count categories
        const categories = {};
        playlists.forEach(playlist => {
            const category = playlist.category || 'Uncategorized';
            categories[category] = (categories[category] || 0) + 1;
        });
        const totalCategories = Object.keys(categories).length;

        // Update stats display
        const totalPlaylistsEl = document.getElementById('total-playlists');
        const totalVideosEl = document.getElementById('total-videos');
        const avgVideosEl = document.getElementById('avg-videos');
        const totalCategoriesEl = document.getElementById('total-categories');

        if (totalPlaylistsEl) totalPlaylistsEl.textContent = totalPlaylists;
        if (totalVideosEl) totalVideosEl.textContent = totalVideos;
        if (avgVideosEl) avgVideosEl.textContent = avgVideosPerPlaylist;
        if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories;
    }

    displayPlaylists(playlists) {
        // Check for new container first, fall back to legacy grid
        let container = document.getElementById('playlists-container');
        if (!container) {
            container = document.getElementById('playlists-grid');
        }
        
        if (!container) {
            console.error('No playlist container found');
            return;
        }
        
        if (!playlists || playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📺</div>
                    <h3>No playlists found</h3>
                    <p>Create your first playlist to get started!</p>
                    <button class="btn btn-primary" onclick="app.showPlaylistCreationModal()">
                        Create Playlist
                    </button>
                </div>
            `;
            return;
        }

        // Get current view mode
        const isGridView = this.currentView === 'grid';
        if (container.id === 'playlists-container') {
            container.className = `playlists-${this.currentView || 'grid'}-container`;
        }
        
        container.innerHTML = playlists.map(playlist => {
            const videoCount = playlist.video_count || 0;
            const category = playlist.category || 'Uncategorized';
            const source = playlist.source || 'custom';
            const thumbnailUrl = playlist.thumbnail || 'assets/default-playlist.jpg';
            const title = playlist.title || playlist.name || 'Untitled Playlist';
            
            return `
                <div class="playlist-card playlist-item" data-playlist-id="${playlist.id}">
                    <div class="playlist-thumbnail">
                        <img src="${thumbnailUrl}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+UGxheWxpc3Q8L3RleHQ+Cjwvc3ZnPg=='">
                        <div class="playlist-overlay">
                            <div class="video-count">${videoCount} videos</div>
                            <div class="playlist-actions">
                                <button class="btn-icon" onclick="app.viewPlaylistDetails(${playlist.id})" title="View Details">
                                    👁️
                                </button>
                                <button class="btn-icon" onclick="app.editPlaylist && app.editPlaylist(${playlist.id})" title="Edit">
                                    ✏️
                                </button>
                                <button class="btn-icon btn-danger" onclick="app.deletePlaylist && app.deletePlaylist(${playlist.id})" title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="playlist-info">
                        <h3 class="playlist-title" title="${this.escapeHtml(title)}">${this.escapeHtml(title)}</h3>
                        <div class="playlist-meta">
                            <span class="playlist-category">${category}</span>
                            <span class="playlist-source">${source}</span>
                        </div>
                        ${playlist.description ? `<p class="playlist-description">${this.escapeHtml(playlist.description)}</p>` : ''}
                        <div class="playlist-stats">
                            <span>${videoCount} videos</span>
                            <span>•</span>
                            <span>Updated ${this.formatDate(playlist.updated_at || playlist.created_at)}</span>
                        </div>
                        <div class="playlist-actions-bottom">
                            <button class="btn btn-primary" onclick="app.viewPlaylistDetails(${playlist.id})">View Details</button>
                            <button class="btn btn-secondary" onclick="app.addVideoToPlaylistDirect(${playlist.id})">Add Video</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    searchPlaylists(query) {
        if (!this.allPlaylists && !this.playlists) return;
        
        const playlists = this.allPlaylists || this.playlists;
        
        if (!query) {
            this.displayPlaylists(playlists);
            return;
        }
        
        const filtered = playlists.filter(playlist => {
            const title = playlist.title || playlist.name || '';
            const description = playlist.description || '';
            const category = playlist.category || '';
            
            return title.toLowerCase().includes(query.toLowerCase()) ||
                   description.toLowerCase().includes(query.toLowerCase()) ||
                   category.toLowerCase().includes(query.toLowerCase());
        });
        
        this.displayPlaylists(filtered);
    }

    clearSearch() {
        const searchInput = document.getElementById('playlist-search');
        const clearBtn = document.getElementById('clear-search-btn');
        
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        
        this.displayPlaylists(this.allPlaylists || this.playlists);
    }

    filterPlaylists() {
        if (!this.allPlaylists && !this.playlists) return;
        
        const playlists = this.allPlaylists || this.playlists;
        const categoryFilter = document.getElementById('category-filter');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!categoryFilter || !sourceFilter) return;
        
        let filtered = playlists;
        
        if (categoryFilter.value !== 'all') {
            filtered = filtered.filter(playlist => 
                (playlist.category || 'Uncategorized') === categoryFilter.value
            );
        }
        
        if (sourceFilter.value !== 'all') {
            filtered = filtered.filter(playlist => 
                (playlist.source || 'custom') === sourceFilter.value
            );
        }
        
        this.displayPlaylists(filtered);
    }

    sortPlaylists(sortBy) {
        if (!this.allPlaylists && !this.playlists) return;
        
        const playlists = this.allPlaylists || this.playlists;
        let sorted = [...playlists];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
                break;
            case 'created':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'updated':
                sorted.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
                break;
            case 'videos':
                sorted.sort((a, b) => (b.video_count || 0) - (a.video_count || 0));
                break;
            case 'category':
                sorted.sort((a, b) => (a.category || 'Uncategorized').localeCompare(b.category || 'Uncategorized'));
                break;
            default:
                // Default sorting by name
                sorted.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        }
        
        this.displayPlaylists(sorted);
    }

    setPlaylistView(viewType) {
        this.currentView = viewType;
        
        // Update button states
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if (gridBtn) gridBtn.classList.toggle('active', viewType === 'grid');
        if (listBtn) listBtn.classList.toggle('active', viewType === 'list');
        
        // Save preference
        localStorage.setItem('playlistView', viewType);
        
        // Re-render playlists with new view
        if (this.allPlaylists || this.playlists) {
            this.displayPlaylists(this.allPlaylists || this.playlists);
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        
        return date.toLocaleDateString();
    }

    async editPlaylist(playlistId) {
        try {
            const playlists = this.allPlaylists || this.playlists;
            const playlist = playlists.find(p => p.id === playlistId);
            if (!playlist) {
                this.showStatus('Playlist not found', 'error');
                return;
            }
            
            // Show edit modal (reuse creation modal with pre-filled data)
            this.showPlaylistCreationModal(playlist);
            
        } catch (error) {
            console.error('Error editing playlist:', error);
            this.showStatus('Error editing playlist', 'error');
        }
    }

    async deletePlaylist(playlistId) {
        if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
            return;
        }
        
        try {
            await window.electronAPI.deletePlaylist(playlistId);
            this.showStatus('Playlist deleted successfully', 'success');
            this.renderPlaylists();
            
        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showStatus('Error deleting playlist', 'error');
        }
    }

    async viewPlaylist(playlistId) {
        // Navigate to a detailed playlist view (to be implemented)
        console.log('Viewing playlist:', playlistId);
    }

    addVideoToPlaylistDirect(playlistId) {
        this.showAddVideoModal();
        
        // Pre-select the playlist
        setTimeout(() => {
            document.getElementById('target-playlist').value = playlistId;
        }, 100);
    }

    async viewPlaylistDetails(playlistId) {
        try {
            this.showLoading('Loading playlist details...');
            
            // Get playlist details and videos
            const playlist = this.playlists.find(p => p.id === playlistId);
            const videos = await window.electronAPI.database.getPlaylistVideos(playlistId);
            
            if (!playlist) {
                this.hideLoading();
                this.showStatus('Playlist not found', 'error');
                return;
            }

            // Populate playlist details modal
            this.populatePlaylistDetailsModal(playlist, videos);
            
            // Show modal
            document.getElementById('playlist-details-modal').style.display = 'flex';
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('Error loading playlist details:', error);
            this.showStatus('Failed to load playlist details', 'error');
        }
    }

    populatePlaylistDetailsModal(playlist, videos) {
        // Update playlist info
        document.getElementById('playlist-details-title').textContent = playlist.title;
        document.getElementById('playlist-details-description').textContent = 
            playlist.description || 'No description available';
        
        // Update thumbnail
        const thumbnail = document.getElementById('playlist-details-thumbnail');
        if (playlist.thumbnail) {
            thumbnail.src = playlist.thumbnail;
            thumbnail.style.display = 'block';
        } else {
            thumbnail.style.display = 'none';
        }
        
        // Update stats
        document.getElementById('playlist-video-count').textContent = `${videos.length} videos`;
        document.getElementById('playlist-category').textContent = 
            `Category: ${playlist.category || 'uncategorized'}`;
        document.getElementById('playlist-created').textContent = 
            `Created: ${this.formatDate(playlist.created_at)}`;
        
        // Update action buttons with playlist ID
        document.getElementById('add-video-to-playlist-btn').onclick = () => {
            this.addVideoToPlaylistDirect(playlist.id);
        };
        
        document.getElementById('download-all-videos-btn').onclick = () => {
            this.downloadPlaylist(playlist.id);
        };
        
        document.getElementById('edit-playlist-btn').onclick = () => {
            this.editPlaylist(playlist.id);
        };
        
        // Initialize enhanced video management system
        this.initializePlaylistVideoManager(playlist, videos);
    }

    initializePlaylistVideoManager(playlist, videos) {
        // Clean up existing manager if it exists
        if (this.playlistVideoManager) {
            this.playlistVideoManager.destroy();
        }

        // Initialize enhanced video manager
        this.playlistVideoManager = new PlaylistVideoManager('playlist-videos-list', {
            enableDragDrop: true,
            enableBulkSelection: true,
            enableSorting: true,
            enableKeyboardShortcuts: true,
            autoSave: true
        });

        // Store playlist ID for auto-save functionality
        this.playlistVideoManager.playlistId = playlist.id;

        // Transform videos to include necessary properties
        const enhancedVideos = videos.map((video, index) => ({
            id: video.id,
            title: video.title || 'Untitled Video',
            description: video.description || '',
            thumbnail: video.thumbnail || 'https://via.placeholder.com/140x80',
            duration: this.formatDuration(video.duration),
            channel: video.uploader || video.channel || 'Unknown Channel',
            channelUrl: video.uploader_url || video.channel_url || '#',
            url: video.webpage_url || video.url || '#',
            views: video.view_count || 0,
            addedDate: video.added_at || new Date().toISOString(),
            order: video.order || (index + 1)
        }));

        // Load videos into the manager
        this.playlistVideoManager.loadVideos(enhancedVideos);
    }

    // Keep the old function for backward compatibility but make it use the new manager
    populatePlaylistVideosList(videos) {
        const videosList = document.getElementById('playlist-videos-list');
        
        if (videos.length === 0) {
            videosList.innerHTML = `
                <div class="videos-list-empty">
                    <h4>No videos in this playlist</h4>
                    <p>Add some videos to get started!</p>
                    <button class="btn btn-primary" onclick="app.showAddVideoModal()">Add Video</button>
                </div>
            `;
            return;
        }
        
        videosList.innerHTML = videos.map(video => `
            <div class="video-item" data-video-id="${video.id}" data-video-url="${video.webpage_url || video.url || ''}">
                <img src="${video.thumbnail || ''}" alt="${this.escapeHtml(video.title)}" />
                <div class="video-item-info">
                    <h5>${this.escapeHtml(video.title)}</h5>
                    <p>${this.escapeHtml(video.description || 'No description')}</p>
                    <div class="video-item-meta">
                        <span>Duration: ${this.formatDuration(video.duration)}</span>
                        <span>Views: ${this.formatNumber(video.views)}</span>
                        <span>Channel: ${this.escapeHtml(video.uploader || 'Unknown')}</span>
                    </div>
                </div>
                <div class="video-item-actions">
                    <button class="btn btn-outline video-preview-btn" onclick="app.showVideoPreview('${video.webpage_url || video.url || ''}')">👁️ Preview</button>
                    <button class="btn btn-primary" onclick="app.downloadSingleVideo('${video.id}')">Download</button>
                    <button class="btn btn-secondary" onclick="app.viewVideo('${video.id}')">View</button>
                    <button class="btn btn-outline" onclick="app.removeVideoFromPlaylist('${video.id}')">Remove</button>
                </div>
            </div>
        `).join('');
    }

    async downloadSingleVideo(videoId) {
        try {
            this.showLoading('Starting video download...');
            
            // Get video details
            const videoDetails = await window.electronAPI.database.getVideoDetails(videoId);
            
            if (!videoDetails) {
                this.hideLoading();
                this.showStatus('Video not found', 'error');
                return;
            }

            // Use default download options
            const downloadOptions = {
                quality: 'best',
                format: 'mp4',
                audio_only: false
            };

            await window.electronAPI.downloads.downloadVideo(videoDetails, downloadOptions);
            
            this.hideLoading();
            this.showStatus(`Download started for "${videoDetails.title}"`, 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('Error downloading video:', error);
            this.showStatus('Failed to start download', 'error');
        }
    }

    async viewVideo(videoId) {
        try {
            const videoDetails = await window.electronAPI.database.getVideoDetails(videoId);
            
            if (!videoDetails) {
                this.showStatus('Video not found', 'error');
                return;
            }

            // Open video URL in default browser or show video modal
            if (videoDetails.url) {
                window.electronAPI.shell.openExternal(videoDetails.url);
            } else {
                this.showStatus('Video URL not available', 'error');
            }
            
        } catch (error) {
            console.error('Error viewing video:', error);
            this.showStatus('Failed to open video', 'error');
        }
    }

    async removeVideoFromPlaylist(videoId) {
        try {
            // Get current playlist ID from modal or manager
            let playlistId;
            
            if (this.playlistVideoManager && this.playlistVideoManager.playlistId) {
                playlistId = this.playlistVideoManager.playlistId;
            } else {
                // Fallback to finding by title
                const playlistTitle = document.getElementById('playlist-details-title').textContent;
                const playlist = this.playlists.find(p => p.title === playlistTitle);
                if (!playlist) {
                    this.showStatus('Playlist not found', 'error');
                    return;
                }
                playlistId = playlist.id;
            }

            // Remove from database
            await window.electronAPI.database.removeVideoFromPlaylist(playlistId, videoId);
            
            // Update the video manager
            if (this.playlistVideoManager) {
                this.playlistVideoManager.removeVideo(videoId);
            }
            
            this.showStatus('Video removed from playlist', 'success');
            
            // Refresh main playlists view
            await this.loadPlaylists();
            
        } catch (error) {
            console.error('Error removing video from playlist:', error);
            this.showStatus('Failed to remove video', 'error');
        }
    }

    async editPlaylist(playlistId) {
        // TODO: Implement playlist editing functionality
        this.showStatus('Playlist editing feature coming soon!', 'info');
    }

    async downloadPlaylist(playlistId) {
        try {
            this.showLoading('Starting playlist download...');
            const downloadId = await window.electronAPI.downloads.downloadPlaylist(playlistId, {
                quality: document.getElementById('download-quality').value,
                format: document.getElementById('download-format').value
            });
            this.hideLoading();
            this.showStatus('Playlist download started', 'success');
            
            // Switch to downloads page to show progress
            document.querySelector('[data-page="downloads"]').click();
        } catch (error) {
            this.hideLoading();
            this.showStatus('Error starting download: ' + error.message, 'error');
        }
    }

    async deletePlaylist(playlistId) {
        if (!confirm('Are you sure you want to delete this playlist?')) {
            return;
        }

        try {
            await window.electronAPI.database.deletePlaylist(playlistId);
            this.showStatus('Playlist deleted successfully', 'success');
            await this.loadPlaylists();
        } catch (error) {
            this.showStatus('Error deleting playlist: ' + error.message, 'error');
        }
    }

    async loadDownloadQueue() {
        try {
            const response = await window.electronAPI.downloads.getDownloadQueue();
            if (response.success) {
                this.downloadQueue = response.downloads || [];
                this.renderDownloadQueue();
                this.updateDownloadStats();
            } else {
                console.error('Failed to load download queue:', response.error);
                this.downloadQueue = [];
                this.renderDownloadQueue();
            }
        } catch (error) {
            console.error('Failed to load download queue:', error);
            this.downloadQueue = [];
            this.renderDownloadQueue();
        }
    }

    async updateDownloadStats() {
        try {
            const response = await window.electronAPI.downloads.getStats();
            if (response.success && response.stats) {
                const stats = response.stats;
                
                document.getElementById('stats-total').textContent = stats.total;
                document.getElementById('stats-downloading').textContent = stats.downloading;
                document.getElementById('stats-completed').textContent = stats.completed;
                document.getElementById('stats-failed').textContent = stats.failed;
            }
        } catch (error) {
            console.error('Failed to update download stats:', error);
        }
    }

    renderDownloadQueue() {
        const queue = document.getElementById('download-queue');
        const statusFilter = document.getElementById('download-status-filter')?.value || 'all';
        
        // Filter downloads based on status
        let filteredDownloads = this.downloadQueue;
        if (statusFilter !== 'all') {
            filteredDownloads = this.downloadQueue.filter(item => item.status === statusFilter);
        }
        
        if (filteredDownloads.length === 0) {
            queue.innerHTML = `
                <div class="download-queue-empty">
                    <div class="empty-icon">📥</div>
                    <h3>No downloads found</h3>
                    <p>${statusFilter === 'all' ? 'Your download queue is empty' : `No ${statusFilter} downloads`}</p>
                </div>
            `;
            return;
        }

        queue.innerHTML = filteredDownloads.map(item => this.renderDownloadItem(item)).join('');
    }

    renderDownloadItem(item) {
        const statusBadge = `<span class="download-status-badge status-${item.status}">${item.status}</span>`;
        
        return `
            <div class="download-item" data-download-id="${item.id}">
                <div class="download-thumbnail">
                    ${item.thumbnail ? 
                        `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />` :
                        '📹'
                    }
                </div>
                <div class="download-info">
                    <div class="download-title" title="${this.escapeHtml(item.title)}">${this.escapeHtml(item.title)}</div>
                    <div class="download-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${item.progress || 0}%"></div>
                        </div>
                    </div>
                    <div class="download-status">
                        ${statusBadge}
                        <span>${item.progress || 0}%</span>
                        ${item.speed ? `<span class="download-speed">${item.speed}</span>` : ''}
                        ${item.eta ? `<span class="download-eta">ETA: ${item.eta}</span>` : ''}
                    </div>
                    <div class="download-metadata">
                        <span>🎯 ${item.quality}</span>
                        <span>📁 ${item.format}</span>
                        <span>📅 ${this.formatDate(item.addedAt)}</span>
                        ${item.playlistId ? `<span>📂 Playlist</span>` : ''}
                    </div>
                </div>
                <div class="download-actions">
                    ${item.url ? `<button class="btn btn-outline video-preview-btn" onclick="app.showVideoPreview('${item.url}')">👁️ Preview</button>` : ''}
                    ${this.getDownloadActionButtons(item)}
                </div>
            </div>
        `;
    }

    getDownloadActionButtons(item) {
        switch (item.status) {
            case 'downloading':
                return `
                    <button class="btn btn-secondary" onclick="app.pauseDownload('${item.id}')">⏸️ Pause</button>
                    <button class="btn btn-danger" onclick="app.cancelDownload('${item.id}')">❌ Cancel</button>
                `;
            case 'paused':
                return `
                    <button class="btn btn-primary" onclick="app.resumeDownload('${item.id}')">▶️ Resume</button>
                    <button class="btn btn-danger" onclick="app.cancelDownload('${item.id}')">❌ Cancel</button>
                `;
            case 'pending':
                return `
                    <button class="btn btn-secondary" onclick="app.cancelDownload('${item.id}')">❌ Cancel</button>
                `;
            case 'completed':
                return `
                    <button class="btn btn-primary" onclick="app.openDownloadLocation('${item.id}')">📂 Open</button>
                    <button class="btn btn-secondary" onclick="app.removeDownload('${item.id}')">🗑️ Remove</button>
                `;
            case 'failed':
                return `
                    <button class="btn btn-primary" onclick="app.retryDownload('${item.id}')">🔄 Retry</button>
                    <button class="btn btn-secondary" onclick="app.removeDownload('${item.id}')">🗑️ Remove</button>
                `;
            case 'cancelled':
                return `
                    <button class="btn btn-primary" onclick="app.retryDownload('${item.id}')">🔄 Retry</button>
                    <button class="btn btn-secondary" onclick="app.removeDownload('${item.id}')">🗑️ Remove</button>
                `;
            default:
                return `<button class="btn btn-secondary" onclick="app.removeDownload('${item.id}')">🗑️ Remove</button>`;
        }
    }

    async pauseDownload(downloadId) {
        try {
            const response = await window.electronAPI.downloads.pauseDownload(downloadId);
            if (response.success) {
                this.loadDownloadQueue(); // Refresh the queue
            } else {
                this.showStatus('Error pausing download: ' + response.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error pausing download: ' + error.message, 'error');
        }
    }

    async resumeDownload(downloadId) {
        try {
            const response = await window.electronAPI.downloads.resumeDownload(downloadId);
            if (response.success) {
                this.loadDownloadQueue(); // Refresh the queue
            } else {
                this.showStatus('Error resuming download: ' + response.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error resuming download: ' + error.message, 'error');
        }
    }

    async cancelDownload(downloadId) {
        try {
            const response = await window.electronAPI.downloads.cancelDownload(downloadId);
            if (response.success) {
                this.loadDownloadQueue(); // Refresh the queue
            } else {
                this.showStatus('Error canceling download: ' + response.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error canceling download: ' + error.message, 'error');
        }
    }

    async removeDownload(downloadId) {
        try {
            const response = await window.electronAPI.downloads.removeDownload(downloadId);
            if (response.success) {
                this.loadDownloadQueue(); // Refresh the queue
            } else {
                this.showStatus('Error removing download: ' + response.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error removing download: ' + error.message, 'error');
        }
    }

    async retryDownload(downloadId) {
        try {
            // Get the original download info and create a new download
            const downloadResponse = await window.electronAPI.downloads.getDownload(downloadId);
            if (downloadResponse.success && downloadResponse.download) {
                const download = downloadResponse.download;
                
                // Remove the failed download
                await this.removeDownload(downloadId);
                
                // Create a new download with the same parameters
                const videoData = {
                    id: download.id,
                    title: download.title,
                    url: download.url,
                    thumbnail: download.thumbnail,
                    duration: download.duration,
                    playlistId: download.playlistId
                };
                
                const options = {
                    quality: download.quality,
                    format: download.format
                };
                
                const newDownloadResponse = await window.electronAPI.downloads.downloadVideo(videoData, options);
                if (newDownloadResponse.success) {
                    this.showStatus('Download restarted successfully', 'success');
                    this.loadDownloadQueue();
                } else {
                    this.showStatus('Error restarting download: ' + newDownloadResponse.error, 'error');
                }
            }
        } catch (error) {
            this.showStatus('Error retrying download: ' + error.message, 'error');
        }
    }

    async openDownloadLocation(downloadId) {
        try {
            const downloadResponse = await window.electronAPI.downloads.getDownload(downloadId);
            if (downloadResponse.success && downloadResponse.download && downloadResponse.download.filePath) {
                // This would need to be implemented in the main process
                // For now, just show a message
                this.showStatus('Download location: ' + downloadResponse.download.filePath, 'info');
            } else {
                this.showStatus('Download file not found', 'error');
            }
        } catch (error) {
            this.showStatus('Error opening download location: ' + error.message, 'error');
        }
    }

    async pauseAllDownloads() {
        try {
            const activeDownloads = this.downloadQueue.filter(d => d.status === 'downloading');
            for (const download of activeDownloads) {
                await this.pauseDownload(download.id);
            }
            this.showStatus(`Paused ${activeDownloads.length} downloads`, 'success');
        } catch (error) {
            this.showStatus('Error pausing downloads: ' + error.message, 'error');
        }
    }

    async resumeAllDownloads() {
        try {
            const pausedDownloads = this.downloadQueue.filter(d => d.status === 'paused');
            for (const download of pausedDownloads) {
                await this.resumeDownload(download.id);
            }
            this.showStatus(`Resumed ${pausedDownloads.length} downloads`, 'success');
        } catch (error) {
            this.showStatus('Error resuming downloads: ' + error.message, 'error');
        }
    }

    filterDownloads(status) {
        this.renderDownloadQueue();
    }

    async clearCompletedDownloads() {
        try {
            const response = await window.electronAPI.downloads.clearCompleted();
            if (response.success) {
                this.loadDownloadQueue(); // Refresh the queue
                this.showStatus('Completed downloads cleared', 'success');
            } else {
                this.showStatus('Error clearing downloads: ' + response.error, 'error');
            }
        } catch (error) {
            this.showStatus('Error clearing downloads: ' + error.message, 'error');
        }
    }

    updateDownloadProgress(data) {
        // Update the download item in the queue
        const downloadIndex = this.downloadQueue.findIndex(d => d.id === data.id);
        if (downloadIndex !== -1) {
            this.downloadQueue[downloadIndex] = { ...this.downloadQueue[downloadIndex], ...data };
        }
        
        // Update the UI element
        const item = document.querySelector(`[data-download-id="${data.id}"]`);
        if (item) {
            const progressFill = item.querySelector('.progress-fill');
            const statusText = item.querySelector('.download-status');
            
            if (progressFill) {
                progressFill.style.width = `${data.progress || 0}%`;
            }
            
            if (statusText) {
                // Update status with badge and additional info
                const statusBadge = `<span class="download-status-badge status-${data.status}">${data.status}</span>`;
                let statusContent = `${statusBadge} <span>${data.progress || 0}%</span>`;
                
                if (data.speed) {
                    statusContent += ` <span class="download-speed">${data.speed}</span>`;
                }
                
                if (data.eta) {
                    statusContent += ` <span class="download-eta">ETA: ${data.eta}</span>`;
                }
                
                statusText.innerHTML = statusContent;
            }
            
            // Update action buttons if status changed
            const actionsContainer = item.querySelector('.download-actions');
            if (actionsContainer && data.status) {
                const downloadItem = this.downloadQueue[downloadIndex];
                actionsContainer.innerHTML = this.getDownloadActionButtons(downloadItem);
            }
        }
        
        // Update overall stats
        this.updateDownloadStats();
    }

    handleDownloadComplete(data) {
        this.updateDownloadProgress(data);
        this.showStatus(`Download completed: ${data.title}`, 'success');
        
        // Play a completion sound or show notification here if desired
        console.log('Download completed:', data);
    }

    handleDownloadError(data) {
        this.updateDownloadProgress(data);
        
        if (this.errorManager) {
            const error = new Error(data.error || 'Download failed');
            this.errorManager.handleError(error, 'download', {
                operation: 'downloadVideo',
                videoTitle: data.title,
                videoId: data.id,
                userMessage: `Download failed for "${data.title}"`,
                retryable: true,
                retryAction: () => this.retryDownload(data.id)
            });
        } else {
            this.showStatus(`Download failed: ${data.title} - ${data.error || 'Unknown error'}`, 'error');
        }
        
        console.error('Download failed:', data);
    }

    async browseDownloadLocation() {
        // This would typically open a file dialog
        // For now, just show the current location
        try {
            const userDataPath = await window.electronAPI.getUserDataPath();
            document.getElementById('download-location').value = userDataPath + '/downloads';
        } catch (error) {
            console.error('Error getting download location:', error);
        }
    }

    closeModal() {
        document.getElementById('video-modal').classList.remove('active');
    }

    downloadVideoFromModal() {
        // Implementation for downloading individual video from modal
        this.closeModal();
    }

    isValidYouTubeURL(url) {
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=/,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=.*&list=/,
            /^https?:\/\/youtu\.be\/.*\?list=/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize FFmpeg conversion page
    initializeConversionPage() {
        if (!this.ffmpegManager) {
            try {
                this.ffmpegManager = new FFmpegManager();
                this.setupFFmpegEventHandlers();
                this.setupConversionPageListeners();
                console.log('FFmpeg conversion system initialized');
            } catch (error) {
                console.error('Failed to initialize FFmpeg:', error);
                this.showFFmpegError(error.message);
            }
        }
    }

    setupFFmpegEventHandlers() {
        this.ffmpegManager.setEventHandlers({
            onProgress: (conversionId, progress) => {
                this.updateConversionProgress(conversionId, progress);
            },
            onComplete: (conversionId, outputPath) => {
                this.onConversionComplete(conversionId, outputPath);
            },
            onError: (conversionId, error) => {
                this.onConversionError(conversionId, error);
            },
            onQueueUpdate: (queueStatus) => {
                this.updateQueueStatus(queueStatus);
            }
        });
    }

    setupConversionPageListeners() {
        // Tab switching
        document.querySelectorAll('.conversion-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchConversionTab(tab.dataset.tab);
            });
        });

        // File selection
        document.getElementById('single-file-select').addEventListener('click', () => {
            document.getElementById('single-file-input').click();
        });

        document.getElementById('batch-file-select').addEventListener('click', () => {
            document.getElementById('batch-file-input').click();
        });

        document.getElementById('analysis-file-select').addEventListener('click', () => {
            document.getElementById('analysis-file-input').click();
        });

        // File input changes
        document.getElementById('single-file-input').addEventListener('change', (e) => {
            this.handleSingleFileSelection(e.target.files);
        });

        document.getElementById('batch-file-input').addEventListener('change', (e) => {
            this.handleBatchFileSelection(e.target.files);
        });

        document.getElementById('analysis-file-input').addEventListener('change', (e) => {
            this.handleAnalysisFileSelection(e.target.files);
        });

        // Preset changes
        document.getElementById('conversion-preset').addEventListener('change', (e) => {
            this.updatePresetDescription(e.target.value, 'preset-description');
        });

        document.getElementById('batch-preset').addEventListener('change', (e) => {
            this.updatePresetDescription(e.target.value, 'batch-preset-description');
        });

        // Advanced options toggle
        document.getElementById('advanced-toggle').addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });

        // Output directory selection
        document.getElementById('browse-output-btn').addEventListener('click', () => {
            this.selectOutputDirectory('output-directory');
        });

        document.getElementById('batch-browse-output-btn').addEventListener('click', () => {
            this.selectOutputDirectory('batch-output-directory');
        });

        // Conversion actions
        document.getElementById('start-single-conversion').addEventListener('click', () => {
            this.startSingleConversion();
        });

        document.getElementById('start-batch-conversion').addEventListener('click', () => {
            this.startBatchConversion();
        });

        document.getElementById('clear-batch-queue').addEventListener('click', () => {
            this.clearBatchQueue();
        });

        document.getElementById('analyze-file-btn').addEventListener('click', () => {
            this.analyzeSelectedFile();
        });

        document.getElementById('start-analysis').addEventListener('click', () => {
            this.analyzeSelectedFile();
        });

        // Analysis modal
        document.querySelector('.analysis-close').addEventListener('click', () => {
            this.closeAnalysisModal();
        });

        // Drag and drop support
        this.setupDragAndDrop();

        // Initialize with default preset descriptions
        this.updatePresetDescription('balanced', 'preset-description');
        this.updatePresetDescription('balanced', 'batch-preset-description');
    }

    switchConversionTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.conversion-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content panels
        document.querySelectorAll('.conversion-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-conversion`);
        });
    }

    handleSingleFileSelection(files) {
        if (files.length > 0) {
            this.displaySelectedFiles(files, 'single-selected-files');
            document.getElementById('start-single-conversion').disabled = false;
            document.getElementById('analyze-file-btn').disabled = false;
        }
    }

    handleBatchFileSelection(files) {
        if (files.length > 0) {
            this.displaySelectedFiles(files, 'batch-selected-files');
            document.getElementById('start-batch-conversion').disabled = false;
        }
    }

    handleAnalysisFileSelection(files) {
        if (files.length > 0) {
            this.displaySelectedFiles(files, 'analysis-selected-files');
            document.getElementById('start-analysis').disabled = false;
        }
    }

    displaySelectedFiles(files, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'selected-file';
            fileElement.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${this.getFileTypeIcon(file.name)}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${this.formatFileSize(file.size)} • ${file.type || 'Unknown type'}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="this.parentElement.remove()" title="Remove file">×</button>
            `;
            container.appendChild(fileElement);
        });
    }

    getFileTypeIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'webm', 'flv', 'm4v', '3gp', 'ts'];
        const audioExts = ['mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a', 'wma'];
        
        if (videoExts.includes(ext)) return '🎬';
        if (audioExts.includes(ext)) return '🎵';
        return '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updatePresetDescription(presetId, elementId) {
        const presets = this.ffmpegManager ? this.ffmpegManager.getPresets() : [];
        const preset = presets.find(p => p.id === presetId);
        const element = document.getElementById(elementId);
        
        if (preset && element) {
            element.textContent = preset.description;
        }
    }

    toggleAdvancedOptions() {
        const content = document.getElementById('advanced-content');
        const toggle = document.getElementById('advanced-toggle');
        const icon = toggle.querySelector('.toggle-icon');
        
        content.classList.toggle('expanded');
        icon.textContent = content.classList.contains('expanded') ? '▲' : '▼';
    }

    async selectOutputDirectory(inputId) {
        try {
            const result = await window.electronAPI.dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Output Directory'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById(inputId).value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
        }
    }

    async startSingleConversion() {
        const fileInput = document.getElementById('single-file-input');
        const files = fileInput.files;
        
        if (files.length === 0) {
            alert('Please select a file to convert');
            return;
        }

        const preset = document.getElementById('conversion-preset').value;
        const outputDir = document.getElementById('output-directory').value || process.cwd() + '/conversions';
        const outputFormat = document.getElementById('output-format').value;
        
        const file = files[0];
        const inputPath = file.path;
        const fileName = file.name.split('.')[0];
        const outputPath = `${outputDir}/${fileName}_converted.${outputFormat}`;

        try {
            const conversionId = this.ffmpegManager.addToQueue({
                inputPath,
                outputPath,
                preset,
                customOptions: this.getAdvancedOptions()
            });

            console.log('Conversion started:', conversionId);
        } catch (error) {
            console.error('Failed to start conversion:', error);
            alert('Failed to start conversion: ' + error.message);
        }
    }

    async startBatchConversion() {
        const fileInput = document.getElementById('batch-file-input');
        const files = fileInput.files;
        
        if (files.length === 0) {
            alert('Please select files to convert');
            return;
        }

        const preset = document.getElementById('batch-preset').value;
        const outputDir = document.getElementById('batch-output-directory').value || process.cwd() + '/conversions';
        
        try {
            const conversions = await this.ffmpegManager.batchConvert(
                Array.from(files),
                preset,
                outputDir
            );

            console.log('Batch conversion started:', conversions);
        } catch (error) {
            console.error('Failed to start batch conversion:', error);
            alert('Failed to start batch conversion: ' + error.message);
        }
    }

    clearBatchQueue() {
        document.getElementById('batch-file-input').value = '';
        document.getElementById('batch-selected-files').innerHTML = '';
        document.getElementById('start-batch-conversion').disabled = true;
    }

    getAdvancedOptions() {
        const options = {};
        
        const videoCodec = document.getElementById('video-codec').value;
        const audioCodec = document.getElementById('audio-codec').value;
        const videoBitrate = document.getElementById('video-bitrate').value;
        const audioBitrate = document.getElementById('audio-bitrate').value;
        const resolution = document.getElementById('resolution').value;
        const frameRate = document.getElementById('frame-rate').value;
        
        if (videoCodec && videoCodec !== 'libx264') options['c:v'] = videoCodec;
        if (audioCodec && audioCodec !== 'aac') options['c:a'] = audioCodec;
        if (videoBitrate) options['b:v'] = videoBitrate + 'k';
        if (audioBitrate) options['b:a'] = audioBitrate + 'k';
        if (resolution) options['s'] = resolution;
        if (frameRate) options['r'] = frameRate;
        
        return options;
    }

    async analyzeSelectedFile() {
        const tabName = document.querySelector('.conversion-tab.active').dataset.tab;
        let fileInput;
        
        if (tabName === 'analysis') {
            fileInput = document.getElementById('analysis-file-input');
        } else {
            fileInput = document.getElementById('single-file-input');
        }
        
        const files = fileInput.files;
        if (files.length === 0) {
            alert('Please select a file to analyze');
            return;
        }

        const file = files[0];
        
        try {
            const analysis = await this.ffmpegManager.analyzeVideo(file.path);
            this.showAnalysisResults(analysis);
        } catch (error) {
            console.error('Failed to analyze file:', error);
            alert('Failed to analyze file: ' + error.message);
        }
    }

    showAnalysisResults(analysis) {
        // Populate general information
        document.getElementById('analysis-filename').textContent = analysis.general.filename || 'Unknown';
        document.getElementById('analysis-format').textContent = analysis.general.format || 'Unknown';
        document.getElementById('analysis-duration').textContent = this.formatDuration(analysis.general.duration);
        document.getElementById('analysis-filesize').textContent = this.formatFileSize(analysis.general.size);
        document.getElementById('analysis-bitrate').textContent = analysis.general.bitrate ? `${Math.round(analysis.general.bitrate / 1000)} kbps` : 'Unknown';

        // Populate video information
        if (analysis.video) {
            document.getElementById('analysis-video-codec').textContent = analysis.video.codec || 'Unknown';
            document.getElementById('analysis-resolution').textContent = `${analysis.video.width}x${analysis.video.height}`;
            document.getElementById('analysis-framerate').textContent = `${analysis.video.frameRate.toFixed(2)} fps`;
            document.getElementById('analysis-video-bitrate').textContent = analysis.video.bitrate ? `${Math.round(analysis.video.bitrate / 1000)} kbps` : 'Unknown';
            document.getElementById('analysis-pixel-format').textContent = analysis.video.pixelFormat || 'Unknown';
            document.getElementById('analysis-video-profile').textContent = analysis.video.profile || 'Unknown';
            document.getElementById('video-analysis-section').style.display = 'block';
        } else {
            document.getElementById('video-analysis-section').style.display = 'none';
        }

        // Populate audio information
        if (analysis.audio) {
            document.getElementById('analysis-audio-codec').textContent = analysis.audio.codec || 'Unknown';
            document.getElementById('analysis-sample-rate').textContent = `${analysis.audio.sampleRate} Hz`;
            document.getElementById('analysis-channels').textContent = analysis.audio.channels.toString();
            document.getElementById('analysis-audio-bitrate').textContent = analysis.audio.bitrate ? `${Math.round(analysis.audio.bitrate / 1000)} kbps` : 'Unknown';
            document.getElementById('analysis-channel-layout').textContent = analysis.audio.channelLayout || 'Unknown';
            document.getElementById('audio-analysis-section').style.display = 'block';
        } else {
            document.getElementById('audio-analysis-section').style.display = 'none';
        }

        // Populate metadata
        const metadataContainer = document.getElementById('analysis-metadata');
        metadataContainer.innerHTML = '';
        
        if (analysis.metadata && Object.keys(analysis.metadata).length > 0) {
            Object.entries(analysis.metadata).forEach(([key, value]) => {
                const item = document.createElement('div');
                item.className = 'analysis-item';
                item.innerHTML = `
                    <span class="analysis-label">${key}:</span>
                    <span class="analysis-value">${value}</span>
                `;
                metadataContainer.appendChild(item);
            });
            document.getElementById('metadata-analysis-section').style.display = 'block';
        } else {
            document.getElementById('metadata-analysis-section').style.display = 'none';
        }

        // Show the modal
        document.getElementById('analysis-modal').classList.add('show');
    }

    closeAnalysisModal() {
        document.getElementById('analysis-modal').classList.remove('show');
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    setupDragAndDrop() {
        ['single-conversion', 'batch-conversion', 'analysis-conversion'].forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const fileInputSection = section.querySelector('.file-input-section');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                fileInputSection.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                fileInputSection.addEventListener(eventName, () => {
                    fileInputSection.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                fileInputSection.addEventListener(eventName, () => {
                    fileInputSection.classList.remove('drag-over');
                }, false);
            });

            fileInputSection.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleDroppedFiles(files, sectionId);
            }, false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDroppedFiles(files, sectionId) {
        if (sectionId === 'single-conversion') {
            document.getElementById('single-file-input').files = files;
            this.handleSingleFileSelection(files);
        } else if (sectionId === 'batch-conversion') {
            document.getElementById('batch-file-input').files = files;
            this.handleBatchFileSelection(files);
        } else if (sectionId === 'analysis-conversion') {
            document.getElementById('analysis-file-input').files = files;
            this.handleAnalysisFileSelection(files);
        }
    }

    updateConversionProgress(conversionId, progress) {
        const queueItem = document.querySelector(`[data-conversion-id="${conversionId}"]`);
        if (queueItem) {
            const progressBar = queueItem.querySelector('.progress-fill');
            const progressText = queueItem.querySelector('.progress-text');
            
            if (progressBar) {
                progressBar.style.width = `${progress.progress}%`;
            }
            
            if (progressText) {
                progressText.textContent = `${Math.round(progress.progress)}% • ${this.formatDuration(progress.remainingTime)} remaining`;
            }
        }
    }

    onConversionComplete(conversionId, outputPath) {
        const queueItem = document.querySelector(`[data-conversion-id="${conversionId}"]`);
        if (queueItem) {
            queueItem.querySelector('.queue-item-status').className = 'queue-item-status status-completed';
            queueItem.querySelector('.queue-item-status').textContent = 'COMPLETED';
            
            // Add open file button
            const actions = queueItem.querySelector('.queue-actions');
            if (actions) {
                actions.innerHTML = `
                    <button class="queue-action open" onclick="window.electronAPI.shell.showItemInFolder('${outputPath}')">
                        Open File
                    </button>
                `;
            }
        }
        
        console.log('Conversion completed:', conversionId, outputPath);
    }

    onConversionError(conversionId, error) {
        const queueItem = document.querySelector(`[data-conversion-id="${conversionId}"]`);
        if (queueItem) {
            queueItem.querySelector('.queue-item-status').className = 'queue-item-status status-failed';
            queueItem.querySelector('.queue-item-status').textContent = 'FAILED';
            
            // Add retry button
            const actions = queueItem.querySelector('.queue-actions');
            if (actions) {
                actions.innerHTML = `
                    <button class="queue-action retry" onclick="app.retryConversion('${conversionId}')">
                        Retry
                    </button>
                `;
            }
        }
        
        console.error('Conversion failed:', conversionId, error);
    }

    updateQueueStatus(queueStatus) {
        document.getElementById('queue-total').textContent = queueStatus.total;
        document.getElementById('queue-processing').textContent = queueStatus.processing;
        document.getElementById('queue-completed').textContent = queueStatus.completed;
        
        // Update queue items display
        this.renderQueueItems(queueStatus);
    }

    renderQueueItems(queueStatus) {
        const container = document.getElementById('conversion-queue-items');
        
        if (queueStatus.total === 0) {
            container.innerHTML = `
                <div class="queue-empty">
                    <div class="queue-empty-icon">📂</div>
                    <p>No conversions in queue</p>
                    <small>Add files above to start converting</small>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        [...queueStatus.active, ...queueStatus.queued].forEach(item => {
            const queueElement = this.createQueueItemElement(item);
            container.appendChild(queueElement);
        });
    }

    createQueueItemElement(item) {
        const element = document.createElement('div');
        element.className = `queue-item ${item.status}`;
        element.setAttribute('data-conversion-id', item.id);
        
        element.innerHTML = `
            <div class="queue-item-header">
                <div class="queue-item-info">
                    <div class="queue-item-name">${item.inputPath.split('/').pop()}</div>
                    <div class="queue-item-details">
                        ${item.preset} preset • Output: ${item.outputPath.split('/').pop()}
                    </div>
                </div>
                <div class="queue-item-status status-${item.status}">${item.status.toUpperCase()}</div>
            </div>
            ${item.status === 'processing' ? `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${item.progress}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(item.progress)}%</div>
                </div>
            ` : ''}
            <div class="queue-actions">
                ${item.status === 'queued' ? `
                    <button class="queue-action cancel" onclick="app.cancelConversion('${item.id}')">Cancel</button>
                ` : ''}
            </div>
        `;
        
        return element;
    }

    cancelConversion(conversionId) {
        if (this.ffmpegManager) {
            this.ffmpegManager.cancelConversion(conversionId);
        }
    }

    retryConversion(conversionId) {
        // TODO: Implement retry functionality
        console.log('Retry conversion:', conversionId);
    }

    showFFmpegError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ffmpeg-error';
        errorDiv.innerHTML = `
            <div style="background: var(--danger-color); color: white; padding: 16px; margin: 20px; border-radius: 8px;">
                <h4>FFmpeg Not Available</h4>
                <p>${message}</p>
                <p>Please install FFmpeg on your system to use the conversion features.</p>
                <button onclick="window.electronAPI.shell.openExternal('https://ffmpeg.org/download.html')" 
                        style="background: white; color: var(--danger-color); border: none; padding: 8px 16px; border-radius: 4px; margin-top: 8px; cursor: pointer;">
                    Download FFmpeg
                </button>
            </div>
        `;
        
        const conversionInterface = document.querySelector('.conversion-interface');
        if (conversionInterface) {
            conversionInterface.appendChild(errorDiv);
        }
    }

    // Initialize video preview system
    initializeVideoPreviewSystem() {
        if (!this.videoPreviewManager) {
            try {
                this.videoPreviewManager = new VideoPreviewManager();
                this.setupVideoPreviewEventHandlers();
                this.videoPreviewManager.initialize();
                console.log('Video preview system initialized');
            } catch (error) {
                console.error('Failed to initialize video preview system:', error);
            }
        }
    }

    setupVideoPreviewEventHandlers() {
        this.videoPreviewManager.setEventHandlers({
            onDownloadFromPreview: async (videoData, downloadOptions) => {
                await this.downloadVideoFromPreview(videoData, downloadOptions);
            },
            onAddToPlaylistFromPreview: async (videoData) => {
                await this.addVideoToPlaylistFromPreview(videoData);
            },
            onPreviewShown: (videoData) => {
                console.log('Video preview shown:', videoData.title);
            },
            onPreviewError: (error) => {
                console.error('Video preview error:', error);
                this.showStatus('Failed to load video preview: ' + error.message, 'error');
            }
        });
    }

    async downloadVideoFromPreview(videoData, downloadOptions) {
        try {
            this.showLoading('Starting video download...');
            
            // Convert preview data to download format
            const downloadData = {
                id: videoData.id,
                title: videoData.title,
                url: videoData.originalUrl || videoData.webpage_url,
                thumbnail: videoData.previewData.bestThumbnail.url,
                duration: videoData.duration,
                uploader: videoData.uploader
            };

            // Start download using existing download system
            await window.electronAPI.downloads.downloadVideo(downloadData, downloadOptions);
            
            this.hideLoading();
            this.showStatus(`Download started for "${videoData.title}"`, 'success');
            
            // Switch to downloads page to show progress
            document.querySelector('[data-page="downloads"]').click();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error downloading video from preview:', error);
            this.showStatus('Failed to start download: ' + error.message, 'error');
        }
    }

    async addVideoToPlaylistFromPreview(videoData) {
        try {
            // Show playlist selection modal or use the existing add video modal
            this.showAddVideoModal();
            
            // Pre-fill the URL field
            setTimeout(() => {
                const urlInput = document.getElementById('video-url');
                if (urlInput) {
                    urlInput.value = videoData.originalUrl || videoData.webpage_url;
                }
            }, 100);
            
        } catch (error) {
            console.error('Error adding video to playlist from preview:', error);
            this.showStatus('Failed to add video to playlist: ' + error.message, 'error');
        }
    }

    // Show video preview for a given URL
    async showVideoPreview(videoUrl) {
        if (this.videoPreviewManager) {
            await this.videoPreviewManager.showVideoPreview(videoUrl);
        } else {
            console.warn('Video preview system not initialized');
        }
    }

    // Add preview buttons to video items
    addPreviewButtonsToVideoItems() {
        const videoItems = document.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            // Check if preview button already exists
            if (item.querySelector('.video-preview-btn')) return;
            
            const videoUrl = item.dataset.videoUrl;
            if (!videoUrl) return;
            
            const actionsContainer = item.querySelector('.video-item-actions');
            if (!actionsContainer) return;
            
            const previewBtn = document.createElement('button');
            previewBtn.className = 'btn btn-outline video-preview-btn';
            previewBtn.innerHTML = '👁️ Preview';
            previewBtn.onclick = (e) => {
                e.stopPropagation();
                this.showVideoPreview(videoUrl);
            };
            
            // Insert preview button as first action
            actionsContainer.insertBefore(previewBtn, actionsContainer.firstChild);
        });
    }

    // Add preview functionality to playlist videos list
    enhancePlaylistVideosWithPreview(videos) {
        return videos.map(video => {
            // Add preview action to video items
            const originalActions = video.actions || [];
            const previewAction = {
                label: 'Preview',
                icon: '👁️',
                action: () => this.showVideoPreview(video.url || video.webpage_url),
                className: 'btn-outline'
            };
            
            return {
                ...video,
                actions: [previewAction, ...originalActions]
            };
        });
    }

    // Initialize batch download system
    initializeBatchDownloadSystem() {
        if (!this.batchDownloadManager) {
            try {
                this.batchDownloadManager = new BatchDownloadManager();
                this.setupBatchDownloadEventHandlers();
                this.setupBatchDownloadListeners();
                console.log('Batch download system initialized');
            } catch (error) {
                console.error('Failed to initialize batch download system:', error);
            }
        }
    }

    setupBatchDownloadEventHandlers() {
        this.batchDownloadManager.setEventHandlers({
            onProgress: (batchId, progress) => {
                this.updateBatchProgress(batchId, progress);
            },
            onBatchComplete: (batchId, summary) => {
                this.onBatchDownloadComplete(batchId, summary);
            },
            onBatchError: (batchId, error) => {
                this.onBatchDownloadError(batchId, error);
            },
            onDownloadComplete: (downloadId, download) => {
                this.onSingleDownloadComplete(downloadId, download);
            },
            onDownloadError: (downloadId, error) => {
                this.onSingleDownloadError(downloadId, error);
            },
            onStatisticsUpdate: (statistics) => {
                this.updateBatchStatistics(statistics);
            }
        });
    }

    setupBatchDownloadListeners() {
        // Batch download toggle button
        document.getElementById('batch-download-btn').addEventListener('click', () => {
            this.toggleBatchDownloadSection();
        });

        // Close batch section
        document.getElementById('close-batch-section').addEventListener('click', () => {
            this.closeBatchDownloadSection();
        });

        // Start batch download
        document.getElementById('start-batch-btn').addEventListener('click', () => {
            this.startBatchDownload();
        });

        // Clear batch selection
        document.getElementById('clear-batch-btn').addEventListener('click', () => {
            this.clearBatchSelection();
        });

        // Configure batch settings
        document.getElementById('configure-batch-btn').addEventListener('click', () => {
            this.showBatchConfigModal();
        });

        // Browse download path
        document.getElementById('batch-browse-path').addEventListener('click', () => {
            this.selectBatchDownloadPath();
        });

        // Batch config modal
        document.getElementById('batch-config-cancel').addEventListener('click', () => {
            this.closeBatchConfigModal();
        });

        document.getElementById('batch-config-save').addEventListener('click', () => {
            this.saveBatchConfig();
        });

        document.querySelector('.batch-config-close').addEventListener('click', () => {
            this.closeBatchConfigModal();
        });

        // Advanced options toggles
        document.querySelectorAll('.batch-advanced-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.toggleBatchAdvancedOptions(toggle);
            });
        });

        // Custom naming pattern
        document.getElementById('batch-naming-pattern').addEventListener('change', (e) => {
            const customOption = document.getElementById('custom-naming-option');
            customOption.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        // Concurrent downloads change
        document.getElementById('batch-concurrent').addEventListener('change', (e) => {
            if (this.batchDownloadManager) {
                this.batchDownloadManager.maxConcurrentDownloads = parseInt(e.target.value);
            }
        });
    }

    toggleBatchDownloadSection() {
        const section = document.getElementById('batch-download-section');
        const isVisible = section.style.display !== 'none';
        
        if (isVisible) {
            this.closeBatchDownloadSection();
        } else {
            section.style.display = 'block';
            // Enable playlist selection mode
            this.enablePlaylistSelectionMode();
        }
    }

    closeBatchDownloadSection() {
        document.getElementById('batch-download-section').style.display = 'none';
        this.disablePlaylistSelectionMode();
        this.clearBatchSelection();
    }

    enablePlaylistSelectionMode() {
        // Add selection checkboxes to playlist cards
        const playlistCards = document.querySelectorAll('.playlist-card');
        playlistCards.forEach(card => {
            if (!card.querySelector('.playlist-selection-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'playlist-selection-checkbox';
                checkbox.style.cssText = 'position: absolute; top: 10px; left: 10px; width: 20px; height: 20px; z-index: 10;';
                
                const playlistId = card.dataset.playlistId;
                checkbox.addEventListener('change', (e) => {
                    this.togglePlaylistSelection(playlistId, e.target.checked);
                });
                
                card.style.position = 'relative';
                card.appendChild(checkbox);
            }
        });
        
        // Show instructions
        this.showBatchSelectionInstructions();
    }

    disablePlaylistSelectionMode() {
        // Remove selection checkboxes
        const checkboxes = document.querySelectorAll('.playlist-selection-checkbox');
        checkboxes.forEach(checkbox => checkbox.remove());
        
        // Clear selection state
        this.selectedPlaylists.clear();
        this.updateBatchSelectionDisplay();
    }

    togglePlaylistSelection(playlistId, selected) {
        if (selected) {
            this.selectedPlaylists.add(playlistId);
        } else {
            this.selectedPlaylists.delete(playlistId);
        }
        
        this.updateBatchSelectionDisplay();
        this.updateStartBatchButton();
    }

    updateBatchSelectionDisplay() {
        const selectedSection = document.getElementById('selected-playlists-section');
        const selectedList = document.getElementById('selected-playlists-list');
        
        if (this.selectedPlaylists.size === 0) {
            selectedSection.style.display = 'none';
            return;
        }
        
        selectedSection.style.display = 'block';
        selectedList.innerHTML = '';
        
        this.selectedPlaylists.forEach(playlistId => {
            const playlist = this.playlists.find(p => p.id === parseInt(playlistId));
            if (playlist) {
                const item = document.createElement('div');
                item.className = 'selected-playlist-item';
                item.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 8px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 8px;';
                item.innerHTML = `
                    <img src="${playlist.thumbnail || '/placeholder-thumbnail.jpg'}" alt="${playlist.title}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: var(--text-primary);">${playlist.title}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${playlist.video_count || 0} videos</div>
                    </div>
                    <button onclick="app.removePlaylistFromBatch('${playlistId}')" style="background: var(--danger-color); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer;">×</button>
                `;
                selectedList.appendChild(item);
            }
        });
    }

    removePlaylistFromBatch(playlistId) {
        this.selectedPlaylists.delete(playlistId);
        
        // Uncheck the checkbox
        const checkbox = document.querySelector(`[data-playlist-id="${playlistId}"] .playlist-selection-checkbox`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        this.updateBatchSelectionDisplay();
        this.updateStartBatchButton();
    }

    updateStartBatchButton() {
        const startBtn = document.getElementById('start-batch-btn');
        startBtn.disabled = this.selectedPlaylists.size === 0;
    }

    clearBatchSelection() {
        this.selectedPlaylists.clear();
        
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('.playlist-selection-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        this.updateBatchSelectionDisplay();
        this.updateStartBatchButton();
    }

    showBatchSelectionInstructions() {
        // You could show a toast or notification here
        console.log('Select playlists by clicking the checkboxes that appear on each playlist card');
    }

    async startBatchDownload() {
        if (this.selectedPlaylists.size === 0) {
            alert('Please select at least one playlist for batch download');
            return;
        }

        try {
            const options = this.getBatchDownloadOptions();
            
            // Start batch downloads for each selected playlist
            const batchPromises = Array.from(this.selectedPlaylists).map(async (playlistId) => {
                try {
                    const batchId = await this.batchDownloadManager.startBatchDownload(parseInt(playlistId), options);
                    console.log(`Started batch download for playlist ${playlistId}: ${batchId}`);
                    return batchId;
                } catch (error) {
                    console.error(`Failed to start batch download for playlist ${playlistId}:`, error);
                    throw error;
                }
            });

            await Promise.all(batchPromises);
            
            // Clear selection and show success message
            this.clearBatchSelection();
            this.showBatchDownloadStarted();
            
        } catch (error) {
            console.error('Failed to start batch downloads:', error);
            alert('Failed to start batch downloads: ' + error.message);
        }
    }

    getBatchDownloadOptions() {
        return {
            quality: document.getElementById('batch-quality').value,
            format: document.getElementById('batch-format').value,
            audioOnly: document.getElementById('batch-audio-only').checked,
            subtitles: document.getElementById('batch-subtitles').checked,
            skipExisting: document.getElementById('batch-skip-existing').checked,
            downloadPath: document.getElementById('batch-download-path').value || null,
            maxConcurrentDownloads: parseInt(document.getElementById('batch-concurrent').value),
            maxRetries: parseInt(document.getElementById('batch-max-retries')?.value || 3),
            organizeFolders: document.getElementById('batch-organize-folders').checked
        };
    }

    showBatchDownloadStarted() {
        // Create a success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = '✅ Batch downloads started successfully!';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async selectBatchDownloadPath() {
        try {
            const result = await window.electronAPI.dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Batch Download Directory'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById('batch-download-path').value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Failed to select download directory:', error);
        }
    }

    showBatchConfigModal() {
        document.getElementById('batch-config-modal').classList.add('show');
    }

    closeBatchConfigModal() {
        document.getElementById('batch-config-modal').classList.remove('show');
    }

    saveBatchConfig() {
        // Save the configuration (you could persist this to localStorage)
        const config = {
            maxRetries: document.getElementById('batch-max-retries').value,
            timeout: document.getElementById('batch-timeout').value,
            rateLimit: document.getElementById('batch-rate-limit').value,
            priority: document.getElementById('batch-priority').value,
            namingPattern: document.getElementById('batch-naming-pattern').value,
            customPattern: document.getElementById('batch-custom-pattern').value,
            createPlaylistFolders: document.getElementById('batch-create-playlist-folders').checked,
            downloadThumbnails: document.getElementById('batch-download-thumbnails').checked,
            downloadMetadata: document.getElementById('batch-download-metadata').checked
        };
        
        localStorage.setItem('batchDownloadConfig', JSON.stringify(config));
        this.closeBatchConfigModal();
        
        console.log('Batch configuration saved:', config);
    }

    toggleBatchAdvancedOptions(toggle) {
        const content = toggle.nextElementSibling;
        const icon = toggle.querySelector('.toggle-icon');
        
        content.classList.toggle('expanded');
        icon.textContent = content.classList.contains('expanded') ? '▲' : '▼';
    }

    updateBatchProgress(batchId, progress) {
        const batchItem = document.querySelector(`[data-batch-id="${batchId}"]`);
        if (!batchItem) {
            // Create new batch item
            this.createBatchItem(progress);
        } else {
            // Update existing batch item
            this.updateBatchItem(batchItem, progress);
        }
        
        this.updateBatchStatistics();
    }

    createBatchItem(progress) {
        const container = document.getElementById('batch-items-container');
        
        // Remove empty state if present
        const emptyState = container.querySelector('.batch-empty');
        if (emptyState) {
            emptyState.remove();
        }
        
        const batchElement = document.createElement('div');
        batchElement.className = `batch-item ${progress.status}`;
        batchElement.setAttribute('data-batch-id', progress.batchId);
        
        batchElement.innerHTML = `
            <div class="batch-item-header">
                <div class="batch-item-info">
                    <div class="batch-item-title">${progress.playlistTitle}</div>
                    <div class="batch-item-details">${progress.completedVideos}/${progress.totalVideos} videos completed</div>
                    <div class="batch-item-current">${progress.currentVideo || 'Preparing...'}</div>
                </div>
                <div class="batch-item-status batch-status-${progress.status}">${progress.status.toUpperCase()}</div>
            </div>
            <div class="batch-progress">
                <div class="batch-progress-header">
                    <span class="batch-progress-text">Overall Progress</span>
                    <span class="batch-progress-percent">${Math.round(progress.overallProgress)}%</span>
                </div>
                <div class="batch-progress-bar">
                    <div class="batch-progress-fill" style="width: ${progress.overallProgress}%"></div>
                </div>
                <div class="batch-progress-stats">
                    <div class="batch-speed">
                        <span class="speed-indicator">${this.formatSpeed(progress.downloadSpeed)}</span>
                    </div>
                    <div class="batch-eta">
                        <span class="eta-indicator">${this.formatETA(progress.estimatedTimeRemaining)}</span>
                    </div>
                </div>
            </div>
            <div class="batch-controls">
                <button class="batch-control-btn batch-pause-btn" onclick="app.pauseBatchDownload('${progress.batchId}')">
                    ⏸️ Pause
                </button>
                <button class="batch-control-btn batch-cancel-btn" onclick="app.cancelBatchDownload('${progress.batchId}')">
                    ❌ Cancel
                </button>
                <button class="batch-control-btn batch-details-btn" onclick="app.showBatchDetails('${progress.batchId}')">
                    📊 Details
                </button>
            </div>
        `;
        
        container.appendChild(batchElement);
    }

    updateBatchItem(batchItem, progress) {
        // Update progress information
        batchItem.querySelector('.batch-item-details').textContent = `${progress.completedVideos}/${progress.totalVideos} videos completed`;
        batchItem.querySelector('.batch-item-current').textContent = progress.currentVideo || 'Preparing...';
        batchItem.querySelector('.batch-item-status').textContent = progress.status.toUpperCase();
        batchItem.querySelector('.batch-item-status').className = `batch-item-status batch-status-${progress.status}`;
        batchItem.querySelector('.batch-progress-percent').textContent = `${Math.round(progress.overallProgress)}%`;
        batchItem.querySelector('.batch-progress-fill').style.width = `${progress.overallProgress}%`;
        batchItem.querySelector('.speed-indicator').textContent = this.formatSpeed(progress.downloadSpeed);
        batchItem.querySelector('.eta-indicator').textContent = this.formatETA(progress.estimatedTimeRemaining);
        
        // Update item class
        batchItem.className = `batch-item ${progress.status}`;
    }

    formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
        
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const threshold = 1024;
        let speed = bytesPerSecond;
        let unitIndex = 0;
        
        while (speed >= threshold && unitIndex < units.length - 1) {
            speed /= threshold;
            unitIndex++;
        }
        
        return `${speed.toFixed(1)} ${units[unitIndex]}`;
    }

    formatETA(seconds) {
        if (!seconds || seconds === 0) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    updateBatchStatistics() {
        const allBatches = this.batchDownloadManager.getAllBatches();
        
        const totalCount = allBatches.length;
        const activeCount = allBatches.filter(b => b.status === 'downloading').length;
        const completedCount = allBatches.filter(b => b.status === 'completed').length;
        
        document.getElementById('batch-total-count').textContent = totalCount;
        document.getElementById('batch-active-count').textContent = activeCount;
        document.getElementById('batch-completed-count').textContent = completedCount;
    }

    onBatchDownloadComplete(batchId, summary) {
        console.log('Batch download completed:', summary);
        
        // Show completion notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = `
            ✅ Batch download completed!<br>
            <small>${summary.completedVideos}/${summary.totalVideos} videos downloaded</small>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    onBatchDownloadError(batchId, error) {
        console.error('Batch download error:', error);
        
        // Show error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--danger-color);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.innerHTML = `❌ Batch download failed: ${error.message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    onSingleDownloadComplete(downloadId, download) {
        console.log('Single download completed:', download.title);
    }

    onSingleDownloadError(downloadId, error) {
        console.error('Single download error:', error);
    }

    pauseBatchDownload(batchId) {
        if (this.batchDownloadManager) {
            this.batchDownloadManager.pauseBatch(batchId);
            
            // Update button to show resume option
            const batchItem = document.querySelector(`[data-batch-id="${batchId}"]`);
            if (batchItem) {
                const pauseBtn = batchItem.querySelector('.batch-pause-btn');
                pauseBtn.innerHTML = '▶️ Resume';
                pauseBtn.onclick = () => this.resumeBatchDownload(batchId);
            }
        }
    }

    resumeBatchDownload(batchId) {
        if (this.batchDownloadManager) {
            this.batchDownloadManager.resumeBatch(batchId);
            
            // Update button to show pause option
            const batchItem = document.querySelector(`[data-batch-id="${batchId}"]`);
            if (batchItem) {
                const resumeBtn = batchItem.querySelector('.batch-pause-btn');
                resumeBtn.innerHTML = '⏸️ Pause';
                resumeBtn.onclick = () => this.pauseBatchDownload(batchId);
            }
        }
    }

    cancelBatchDownload(batchId) {
        if (confirm('Are you sure you want to cancel this batch download?')) {
            if (this.batchDownloadManager) {
                this.batchDownloadManager.cancelBatch(batchId);
                
                // Remove the batch item from UI
                const batchItem = document.querySelector(`[data-batch-id="${batchId}"]`);
                if (batchItem) {
                    batchItem.remove();
                }
                
                this.updateBatchStatistics();
            }
        }
    }

    showBatchDetails(batchId) {
        if (this.batchDownloadManager) {
            const status = this.batchDownloadManager.getBatchStatus(batchId);
            if (status) {
                // You could show a detailed modal here
                alert(`
Batch Details:
Playlist: ${status.playlistTitle}
Progress: ${status.completedVideos}/${status.totalVideos} videos
Status: ${status.status}
Speed: ${this.formatSpeed(status.downloadSpeed)}
ETA: ${this.formatETA(status.estimatedTimeRemaining)}
                `.trim());
            }
        }
    }

    // Initialize offline video access system
    initializeOfflineVideoSystem() {
        if (!this.offlineVideoManager) {
            try {
                this.offlineVideoManager = new OfflineVideoManager();
                this.setupOfflineVideoEventHandlers();
                this.offlineVideoManager.initialize();
                console.log('Offline video system initialized');
            } catch (error) {
                console.error('Failed to initialize offline video system:', error);
            }
        }
    }

    setupOfflineVideoEventHandlers() {
        this.offlineVideoManager.setEventHandlers({
            onVideoDiscovered: (videoInfo) => {
                console.log('Video discovered:', videoInfo.name);
                this.updateOfflineVideoStats();
            },
            onVideoPlay: (videoInfo) => {
                console.log('Playing video:', videoInfo.name);
            },
            onScanComplete: (totalVideos) => {
                console.log(`Offline video scan complete: ${totalVideos} videos found`);
                this.displayOfflineVideos();
                this.updateOfflineVideoStats();
            }
        });
    }

    // Toggle offline video library visibility
    toggleOfflineLibrary() {
        const offlineSection = document.getElementById('offline-library-section');
        const toggleBtn = document.getElementById('open-offline-library-btn');
        
        if (offlineSection.style.display === 'none' || !offlineSection.style.display) {
            offlineSection.style.display = 'block';
            toggleBtn.textContent = '📁 Hide Library';
            this.displayOfflineVideos();
        } else {
            offlineSection.style.display = 'none';
            toggleBtn.textContent = '📁 Offline Library';
        }
    }

    // Refresh offline video library
    async refreshOfflineLibrary() {
        if (this.offlineVideoManager) {
            try {
                this.showLoading('Scanning for offline videos...');
                await this.offlineVideoManager.scanDownloadedVideos();
                this.hideLoading();
                this.showStatus('Offline library refreshed successfully', 'success');
            } catch (error) {
                this.hideLoading();
                this.showStatus('Failed to refresh offline library: ' + error.message, 'error');
            }
        }
    }

    // Display offline videos in the grid
    displayOfflineVideos() {
        if (!this.offlineVideoManager) return;
        
        const grid = document.getElementById('offline-videos-grid');
        const videos = this.offlineVideoManager.getAvailableVideos();
        
        if (videos.length === 0) {
            grid.innerHTML = `
                <div class="offline-empty-state">
                    <div class="offline-empty-icon">📼</div>
                    <h4>No offline videos found</h4>
                    <p>Download some videos to build your offline library</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = videos.map(video => this.createOfflineVideoCard(video)).join('');
        
        // Add event listeners to video cards
        this.setupOfflineVideoCardListeners();
    }

    // Create offline video card HTML
    createOfflineVideoCard(video) {
        const duration = this.formatDuration(video.duration || 0);
        const fileSize = this.formatFileSize(video.size);
        const watchProgress = video.watchPosition && video.duration ? 
            (video.watchPosition / video.duration) * 100 : 0;
        
        return `
            <div class="offline-video-card" data-video-path="${video.path}">
                <div class="offline-video-thumbnail">
                    ${video.thumbnail ? 
                        `<img src="file://${video.thumbnail}" alt="${video.name}" />` : 
                        '<div class="placeholder">🎬</div>'
                    }
                    <div class="video-duration-badge">${duration}</div>
                    ${video.isBookmarked ? '<div class="bookmark-indicator">🔖</div>' : ''}
                    ${video.inWatchlist ? '<div class="watchlist-indicator">👁️</div>' : ''}
                    ${watchProgress > 5 ? `<div class="watch-progress" style="width: ${watchProgress}%"></div>` : ''}
                    ${video.resolution ? `<div class="quality-indicator">${video.resolution}</div>` : ''}
                </div>
                <div class="offline-video-info">
                    <div class="offline-video-title" title="${video.name}">${video.name}</div>
                    <div class="offline-video-meta">
                        <span>${fileSize}</span>
                        <span>${video.extension.toUpperCase()}</span>
                    </div>
                    <div class="offline-video-actions">
                        <button class="btn btn-primary play-integrated-btn" data-video-path="${video.path}">
                            ▶️ Play
                        </button>
                        <button class="btn btn-outline play-system-btn" data-video-path="${video.path}">
                            🖥️ System
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Setup event listeners for offline video cards
    setupOfflineVideoCardListeners() {
        // Play with integrated player
        document.querySelectorAll('.play-integrated-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const videoPath = btn.dataset.videoPath;
                try {
                    await this.offlineVideoManager.playVideoIntegrated(videoPath);
                } catch (error) {
                    this.showStatus('Failed to play video: ' + error.message, 'error');
                }
            });
        });

        // Play with system default
        document.querySelectorAll('.play-system-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const videoPath = btn.dataset.videoPath;
                try {
                    await this.offlineVideoManager.playVideoSystem(videoPath);
                } catch (error) {
                    this.showStatus('Failed to open video: ' + error.message, 'error');
                }
            });
        });

        // Video card click to show integrated player
        document.querySelectorAll('.offline-video-card').forEach(card => {
            card.addEventListener('click', async () => {
                const videoPath = card.dataset.videoPath;
                try {
                    await this.offlineVideoManager.playVideoIntegrated(videoPath);
                } catch (error) {
                    this.showStatus('Failed to play video: ' + error.message, 'error');
                }
            });
        });
    }

    // Update offline video statistics
    updateOfflineVideoStats() {
        if (!this.offlineVideoManager) return;
        
        const videos = this.offlineVideoManager.getAvailableVideos();
        const bookmarked = this.offlineVideoManager.getBookmarkedVideos();
        const recentlyWatched = this.offlineVideoManager.getRecentlyWatched();
        
        // Calculate total size
        const totalSize = videos.reduce((sum, video) => sum + (video.size || 0), 0);
        const totalSizeFormatted = this.formatFileSize(totalSize);
        
        // Update stats
        document.getElementById('offline-total-videos').textContent = videos.length;
        document.getElementById('offline-total-size').textContent = totalSizeFormatted;
        document.getElementById('offline-recently-watched').textContent = recentlyWatched.length;
        document.getElementById('offline-bookmarked').textContent = bookmarked.length;
        
        // Update recently watched list
        this.displayRecentlyWatchedVideos(recentlyWatched.slice(0, 5));
    }

    // Display recently watched videos
    displayRecentlyWatchedVideos(recentVideos) {
        const container = document.getElementById('recently-watched-list');
        
        if (recentVideos.length === 0) {
            container.innerHTML = '<div class="no-recent-videos">No recently watched videos</div>';
            return;
        }
        
        container.innerHTML = recentVideos.map(item => `
            <div class="recent-video-item" data-video-path="${item.path}">
                <div class="recent-video-thumbnail">
                    ${item.thumbnail ? 
                        `<img src="file://${item.thumbnail}" alt="${item.name}" />` : 
                        '<div class="placeholder">🎬</div>'
                    }
                </div>
                <div class="recent-video-info">
                    <div class="recent-video-title">${item.name}</div>
                    <div class="recent-video-time">${this.formatTimeAgo(item.playedAt)}</div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to recently watched items
        container.querySelectorAll('.recent-video-item').forEach(item => {
            item.addEventListener('click', async () => {
                const videoPath = item.dataset.videoPath;
                try {
                    await this.offlineVideoManager.playVideoIntegrated(videoPath);
                } catch (error) {
                    this.showStatus('Failed to play video: ' + error.message, 'error');
                }
            });
        });
    }

    // Search offline videos
    searchOfflineVideos(query) {
        if (!this.offlineVideoManager) return;
        
        if (!query.trim()) {
            this.displayOfflineVideos();
            return;
        }
        
        const results = this.offlineVideoManager.searchVideos(query);
        this.displayFilteredOfflineVideos(results);
    }

    // Filter offline videos by format
    filterOfflineVideosByFormat(format) {
        if (!this.offlineVideoManager) return;
        
        if (!format) {
            this.displayOfflineVideos();
            return;
        }
        
        const results = this.offlineVideoManager.filterVideosByFormat(format);
        this.displayFilteredOfflineVideos(results);
    }

    // Sort offline videos
    sortOfflineVideos(sortBy) {
        if (!this.offlineVideoManager) return;
        
        const videos = this.offlineVideoManager.getAvailableVideos();
        let sortedVideos;
        
        switch (sortBy) {
            case 'alphabetical':
                sortedVideos = videos.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'duration':
                sortedVideos = videos.sort((a, b) => (b.duration || 0) - (a.duration || 0));
                break;
            case 'size':
                sortedVideos = videos.sort((a, b) => (b.size || 0) - (a.size || 0));
                break;
            case 'watched':
                sortedVideos = videos.sort((a, b) => (b.watchCount || 0) - (a.watchCount || 0));
                break;
            default: // recent
                sortedVideos = videos.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        }
        
        this.displayFilteredOfflineVideos(sortedVideos);
    }

    // Display filtered offline videos
    displayFilteredOfflineVideos(videos) {
        const grid = document.getElementById('offline-videos-grid');
        
        if (videos.length === 0) {
            grid.innerHTML = `
                <div class="offline-empty-state">
                    <div class="offline-empty-icon">🔍</div>
                    <h4>No videos match your criteria</h4>
                    <p>Try adjusting your search or filter settings</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = videos.map(video => this.createOfflineVideoCard(video)).join('');
        this.setupOfflineVideoCardListeners();
    }

    // Utility function to format time ago
    formatTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return new Date(date).toLocaleDateString();
    }

    // =================================================================
    // EXPORT SYSTEM INITIALIZATION & METHODS
    // =================================================================

    /**
     * Setup export event listeners
     */
    setupExportEventListeners() {
        // Export button in header
        const exportBtn = document.getElementById('export-playlists-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        // Export button in playlists page
        const playlistExportBtn = document.getElementById('playlists-export-btn');
        if (playlistExportBtn) {
            playlistExportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        // Quick export buttons for individual playlists
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-export-btn')) {
                const playlistId = e.target.dataset.playlistId;
                this.quickExportPlaylist(playlistId);
            }
        });
    }

    /**
     * Initialize the playlist export system
     */
    async initializeExportSystem() {
        if (!this.exportManager) {
            try {
                this.exportManager = new PlaylistExportManager();
                this.setupExportEventHandlers();
                await this.exportManager.initialize();
                console.log('Export system initialized');
            } catch (error) {
                console.error('Failed to initialize export system:', error);
            }
        }
    }

    /**
     * Setup export event handlers
     */
    setupExportEventHandlers() {
        if (!this.exportManager) return;

        this.exportManager.setEventHandlers({
            onExportSuccess: (result) => {
                console.log('Export completed successfully:', result);
                this.showExportSuccessNotification(result);
            },
            onExportError: (error) => {
                console.error('Export failed:', error);
                this.showExportErrorNotification(error);
            },
            onImportSuccess: (result) => {
                console.log('Import completed successfully:', result);
                this.showImportSuccessNotification(result);
                this.loadPlaylists(); // Refresh playlists after import
            },
            onExportModalShown: () => {
                // Refresh modal data when shown
                this.refreshExportModalData();
            }
        });
    }

    /**
     * Show the export modal
     */
    async showExportModal(tab = 'single') {
        await this.initializeExportSystem();
        if (this.exportManager) {
            this.exportManager.showExportModal(tab);
        }
    }

    /**
     * Quick export for a single playlist
     */
    async quickExportPlaylist(playlistId) {
        await this.initializeExportSystem();
        
        if (!this.exportManager) {
            alert('Export system not available');
            return;
        }

        try {
            const playlist = await window.electronAPI.database.getPlaylist(playlistId);
            if (!playlist) {
                alert('Playlist not found');
                return;
            }

            // Show export modal with single playlist pre-selected
            this.exportManager.showExportModal('single');
            
            // Set the playlist selection
            setTimeout(() => {
                const playlistSelect = document.getElementById('single-playlist-select');
                if (playlistSelect) {
                    playlistSelect.value = playlistId;
                    playlistSelect.dispatchEvent(new Event('change'));
                }
            }, 100);

        } catch (error) {
            console.error('Quick export error:', error);
            alert(`Failed to start export: ${error.message}`);
        }
    }

    /**
     * Export multiple selected playlists
     */
    async exportSelectedPlaylists() {
        const selectedPlaylists = Array.from(this.selectedPlaylists);
        
        if (selectedPlaylists.length === 0) {
            alert('Please select playlists to export');
            return;
        }

        await this.initializeExportSystem();
        
        if (!this.exportManager) {
            alert('Export system not available');
            return;
        }

        // Show export modal with multiple playlists tab
        this.exportManager.showExportModal('multiple');
        
        // Pre-select the playlists
        setTimeout(() => {
            selectedPlaylists.forEach(playlistId => {
                const checkbox = document.querySelector(`.playlist-checkbox[value="${playlistId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            // Update selected count
            const event = new Event('change');
            const firstCheckbox = document.querySelector('.playlist-checkbox');
            if (firstCheckbox) {
                firstCheckbox.dispatchEvent(event);
            }
        }, 100);
    }

    /**
     * Create full backup
     */
    async createFullBackup() {
        await this.initializeExportSystem();
        
        if (!this.exportManager) {
            alert('Export system not available');
            return;
        }

        this.exportManager.showExportModal('backup');
    }

    /**
     * Import playlists from file
     */
    async importFromFile() {
        await this.initializeExportSystem();
        
        if (!this.exportManager) {
            alert('Export system not available');
            return;
        }

        this.exportManager.showExportModal('import');
    }

    /**
     * Refresh export modal data
     */
    async refreshExportModalData() {
        // This will be called when the export modal is shown
        // to ensure data is up to date
        if (this.exportManager) {
            await this.exportManager.loadPlaylistsForExport();
            await this.exportManager.loadBackupStats();
        }
    }

    /**
     * Show export success notification
     */
    showExportSuccessNotification(result) {
        const message = `
            ✅ Export completed successfully!
            
            Type: ${result.type}
            Format: ${result.format}
            Items: ${result.itemCount}
            File: ${result.filePath}
        `;
        
        // You could use a proper notification system here
        alert(message);
    }

    /**
     * Show export error notification
     */
    showExportErrorNotification(error) {
        const message = `
            ❌ Export failed!
            
            Error: ${error.message}
        `;
        
        alert(message);
    }

    /**
     * Show import success notification
     */
    showImportSuccessNotification(result) {
        const message = `
            ✅ Import completed successfully!
            
            Playlists: ${result.importedPlaylists}
            Videos: ${result.importedVideos}
        `;
        
        alert(message);
    }

    /**
     * Add export controls to playlist cards
     */
    addExportControlsToPlaylistCard(playlistCard, playlist) {
        const actionsContainer = playlistCard.querySelector('.playlist-actions');
        if (actionsContainer) {
            // Add quick export button
            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn btn-outline quick-export-btn';
            exportBtn.dataset.playlistId = playlist.id;
            exportBtn.innerHTML = '📤 Export';
            exportBtn.title = 'Export this playlist';
            
            actionsContainer.appendChild(exportBtn);
        }
    }

    /**
     * Add bulk export controls to playlists page
     */
    addBulkExportControls() {
        const playlistsControls = document.querySelector('.playlists-controls');
        if (playlistsControls && !document.getElementById('bulk-export-controls')) {
            const bulkControls = document.createElement('div');
            bulkControls.id = 'bulk-export-controls';
            bulkControls.className = 'bulk-export-controls';
            bulkControls.innerHTML = `
                <div class="bulk-export-section">
                    <div class="bulk-export-header">
                        <span id="selected-playlists-count">0 playlists selected</span>
                        <div class="bulk-export-actions">
                            <button id="select-all-for-export" class="btn btn-outline">Select All</button>
                            <button id="deselect-all-export" class="btn btn-outline">Deselect All</button>
                            <button id="export-selected-btn" class="btn btn-primary" disabled>
                                📤 Export Selected
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            playlistsControls.appendChild(bulkControls);
            
            // Setup bulk export listeners
            this.setupBulkExportListeners();
        }
    }

    /**
     * Setup bulk export event listeners
     */
    setupBulkExportListeners() {
        document.getElementById('select-all-for-export')?.addEventListener('click', () => {
            this.selectAllPlaylistsForExport(true);
        });

        document.getElementById('deselect-all-export')?.addEventListener('click', () => {
            this.selectAllPlaylistsForExport(false);
        });

        document.getElementById('export-selected-btn')?.addEventListener('click', () => {
            this.exportSelectedPlaylists();
        });
    }

    /**
     * Select/deselect all playlists for export
     */
    selectAllPlaylistsForExport(select) {
        const checkboxes = document.querySelectorAll('.playlist-card input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
            const playlistId = checkbox.dataset.playlistId;
            if (select) {
                this.selectedPlaylists.add(playlistId);
            } else {
                this.selectedPlaylists.delete(playlistId);
            }
        });
        
        this.updateSelectedPlaylistsCount();
    }

    /**
     * Update selected playlists count display
     */
    updateSelectedPlaylistsCount() {
        const count = this.selectedPlaylists.size;
        const countElement = document.getElementById('selected-playlists-count');
        const exportBtn = document.getElementById('export-selected-btn');
        
        if (countElement) {
            countElement.textContent = `${count} playlist${count !== 1 ? 's' : ''} selected`;
        }
        
        if (exportBtn) {
            exportBtn.disabled = count === 0;
        }
    }

    // Component Update Methods
    async checkComponentUpdates() {
        if (!this.componentUpdateManager) {
            this.showStatus('Component update system not initialized', 'error');
            return;
        }

        try {
            this.showStatus('Checking for component updates...', 'info');
            await this.componentUpdateManager.checkForUpdates();
            this.updateComponentStatus();
        } catch (error) {
            console.error('Failed to check for component updates:', error);
            this.showStatus('Failed to check for updates', 'error');
        }
    }

    showComponentManagementModal() {
        if (!this.componentUpdateManager) {
            this.showStatus('Component update system not initialized', 'error');
            return;
        }

        this.componentUpdateManager.showComponentManager();
    }

    async updateComponentStatus() {
        if (!this.componentUpdateManager) return;

        try {
            // Update yt-dlp status
            const ytdlpVersion = await this.componentUpdateManager.getCurrentComponentVersion('yt-dlp');
            const ytdlpVersionElement = document.getElementById('ytdlp-version');
            const ytdlpStatusElement = document.getElementById('ytdlp-status');
            
            if (ytdlpVersionElement && ytdlpStatusElement) {
                ytdlpVersionElement.textContent = ytdlpVersion.version || 'Not installed';
                ytdlpStatusElement.textContent = ytdlpVersion.success ? 'Installed' : 'Not found';
                ytdlpStatusElement.className = `status-badge ${ytdlpVersion.success ? 'success' : 'error'}`;
            }

            // Update FFmpeg status
            const ffmpegVersion = await this.componentUpdateManager.getCurrentComponentVersion('ffmpeg');
            const ffmpegVersionElement = document.getElementById('ffmpeg-version');
            const ffmpegStatusElement = document.getElementById('ffmpeg-status');
            
            if (ffmpegVersionElement && ffmpegStatusElement) {
                ffmpegVersionElement.textContent = ffmpegVersion.version || 'Not installed';
                ffmpegStatusElement.textContent = ffmpegVersion.success ? 'Installed' : 'Not found';
                ffmpegStatusElement.className = `status-badge ${ffmpegVersion.success ? 'success' : 'error'}`;
            }
        } catch (error) {
            console.error('Failed to update component status:', error);
        }
    }

    saveComponentUpdateSettings() {
        try {
            const settings = {
                autoUpdateComponents: document.getElementById('auto-update-components').checked,
                autoUpdateYtdl: document.getElementById('auto-update-ytdl').checked,
                autoUpdateFFmpeg: document.getElementById('auto-update-ffmpeg').checked
            };

            localStorage.setItem('componentUpdateSettings', JSON.stringify(settings));
            this.showStatus('Component update settings saved', 'success');
        } catch (error) {
            console.error('Failed to save component update settings:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    loadComponentUpdateSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('componentUpdateSettings') || '{}');
            
            if (settings.autoUpdateComponents !== undefined) {
                document.getElementById('auto-update-components').checked = settings.autoUpdateComponents;
            }
            if (settings.autoUpdateYtdl !== undefined) {
                document.getElementById('auto-update-ytdl').checked = settings.autoUpdateYtdl;
            }
            if (settings.autoUpdateFFmpeg !== undefined) {
                document.getElementById('auto-update-ffmpeg').checked = settings.autoUpdateFFmpeg;
            }
        } catch (error) {
            console.error('Failed to load component update settings:', error);
        }
    }
}

// Global functions for PlaylistVideoManager integration
window.removeVideoFromPlaylist = (videoId) => {
    if (window.app) {
        window.app.removeVideoFromPlaylist(videoId);
    }
};

window.downloadSingleVideo = (videoId) => {
    if (window.app) {
        window.app.downloadSingleVideo(videoId);
    }
};

window.viewVideo = (videoUrl) => {
    if (videoUrl && videoUrl !== '#') {
        window.electronAPI.shell.openExternal(videoUrl);
    }
};

window.showVideoInfo = (videoId) => {
    // TODO: Implement video info modal
    console.log('Show video info for:', videoId);
};

// Initialize the application
const app = new YouTubePlaylistManager();
window.app = app; // Make available globally for conversion functions
window.app = app; // Make app globally accessible

// Initialize the app
app.init();
