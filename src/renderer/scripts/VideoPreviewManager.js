/**
 * VideoPreviewManager - Comprehensive video preview system
 * Provides detailed video information, thumbnails, and metadata before download
 */

class VideoPreviewManager {
    constructor() {
        this.previewCache = new Map();
        this.thumbnailCache = new Map();
        this.videoInfoCache = new Map();
        this.previewQueue = new Set();
        this.isInitialized = false;
        this.eventHandlers = {};
        
        // Configuration
        this.config = {
            maxCacheSize: 500,
            thumbnailSizes: ['default', 'medium', 'high', 'standard', 'maxres'],
            cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
            previewTimeout: 30000, // 30 seconds
            maxConcurrentPreviews: 3,
            enableThumbnailFallback: true,
            enableMetadataExtraction: true,
            enableQualityAnalysis: true
        };
        
        this.activeRequests = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Initialize the video preview system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load cached preview data from localStorage
            await this.loadCachedData();
            
            // Initialize preview interface
            this.initializePreviewInterface();
            
            // Start queue processor
            this.startQueueProcessor();
            
            this.isInitialized = true;
            console.log('VideoPreviewManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize VideoPreviewManager:', error);
            throw error;
        }
    }

    /**
     * Set event handlers for preview events
     */
    setEventHandlers(handlers) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
    }

    /**
     * Get video preview information
     */
    async getVideoPreview(videoUrl, options = {}) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube video URL');
        }

        // Check cache first
        const cacheKey = `${videoId}_${JSON.stringify(options)}`;
        if (this.previewCache.has(cacheKey)) {
            const cached = this.previewCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
                return cached.data;
            }
        }

        // Add to processing queue
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                videoId,
                videoUrl,
                options,
                cacheKey,
                resolve,
                reject,
                timestamp: Date.now()
            });

            this.processQueue();
        });
    }

    /**
     * Get detailed video information from yt-dlp
     */
    async getDetailedVideoInfo(videoUrl, options = {}) {
        try {
            const videoInfo = await window.electronAPI.ytdlp.getVideoInfo(videoUrl, {
                extractFlat: false,
                writeInfoJson: false,
                noPlaylist: true,
                dumpSingleJson: true,
                ...options
            });

            if (!videoInfo) {
                throw new Error('Failed to extract video information');
            }

            return this.processVideoInfo(videoInfo);

        } catch (error) {
            console.error('Error getting detailed video info:', error);
            throw error;
        }
    }

    /**
     * Process and normalize video information
     */
    processVideoInfo(rawVideoInfo) {
        const info = {
            // Basic information
            id: rawVideoInfo.id,
            title: rawVideoInfo.title || 'Unknown Title',
            description: rawVideoInfo.description || '',
            uploader: rawVideoInfo.uploader || rawVideoInfo.channel || 'Unknown Channel',
            uploaderUrl: rawVideoInfo.uploader_url || rawVideoInfo.channel_url,
            uploadDate: rawVideoInfo.upload_date,
            duration: rawVideoInfo.duration,
            viewCount: rawVideoInfo.view_count || 0,
            likeCount: rawVideoInfo.like_count || 0,
            dislikeCount: rawVideoInfo.dislike_count || 0,
            subscriberCount: rawVideoInfo.subscriber_count || 0,
            
            // Thumbnails
            thumbnails: this.processThumbnails(rawVideoInfo.thumbnails || []),
            
            // Video quality and formats
            formats: this.processFormats(rawVideoInfo.formats || []),
            qualities: this.extractQualitiesFromFormats(rawVideoInfo.formats || []),
            
            // Audio information
            audioFormats: this.processAudioFormats(rawVideoInfo.formats || []),
            
            // Additional metadata
            tags: rawVideoInfo.tags || [],
            categories: rawVideoInfo.categories || [],
            language: rawVideoInfo.language,
            subtitles: rawVideoInfo.subtitles || {},
            automaticCaptions: rawVideoInfo.automatic_captions || {},
            
            // Technical details
            webpage_url: rawVideoInfo.webpage_url,
            originalUrl: rawVideoInfo.original_url || rawVideoInfo.webpage_url,
            extractor: rawVideoInfo.extractor,
            extractorKey: rawVideoInfo.extractor_key,
            
            // Processed timestamp
            processedAt: Date.now(),
            
            // Preview-specific data
            previewData: {
                bestThumbnail: this.getBestThumbnail(rawVideoInfo.thumbnails || []),
                recommendedQuality: this.getRecommendedQuality(rawVideoInfo.formats || []),
                estimatedFileSize: this.estimateFileSize(rawVideoInfo.formats || []),
                downloadTimes: this.estimateDownloadTimes(rawVideoInfo.formats || [])
            }
        };

        return info;
    }

    /**
     * Process and normalize thumbnail data
     */
    processThumbnails(thumbnails) {
        const processed = thumbnails.map(thumb => ({
            id: thumb.id,
            url: thumb.url,
            width: thumb.width || 0,
            height: thumb.height || 0,
            resolution: thumb.resolution,
            preference: thumb.preference || 0
        })).sort((a, b) => (b.preference || 0) - (a.preference || 0));

        return processed;
    }

    /**
     * Get the best quality thumbnail
     */
    getBestThumbnail(thumbnails) {
        if (!thumbnails || thumbnails.length === 0) {
            return {
                url: 'assets/default-video-thumbnail.jpg',
                width: 320,
                height: 180,
                type: 'default'
            };
        }

        // Prefer maxresdefault, then hqdefault, then mqdefault
        const priorities = ['maxresdefault', 'hqdefault', 'mqdefault', 'sddefault', 'default'];
        
        for (const priority of priorities) {
            const thumb = thumbnails.find(t => t.id === priority);
            if (thumb) return thumb;
        }

        // Fallback to highest resolution
        return thumbnails.reduce((best, current) => {
            const bestSize = (best.width || 0) * (best.height || 0);
            const currentSize = (current.width || 0) * (current.height || 0);
            return currentSize > bestSize ? current : best;
        });
    }

    /**
     * Process video formats and extract quality information
     */
    processFormats(formats) {
        return formats.map(format => ({
            formatId: format.format_id,
            ext: format.ext,
            quality: format.quality,
            height: format.height,
            width: format.width,
            fps: format.fps,
            vcodec: format.vcodec,
            acodec: format.acodec,
            filesize: format.filesize,
            filesizeApprox: format.filesize_approx,
            tbr: format.tbr, // Total bitrate
            vbr: format.vbr, // Video bitrate
            abr: format.abr, // Audio bitrate
            format: format.format,
            formatNote: format.format_note,
            url: format.url,
            protocol: format.protocol,
            container: format.container
        }));
    }

    /**
     * Extract unique qualities from formats
     */
    extractQualitiesFromFormats(formats) {
        const qualities = new Set();
        
        formats.forEach(format => {
            if (format.height) {
                if (format.height >= 2160) qualities.add('4K (2160p)');
                else if (format.height >= 1440) qualities.add('2K (1440p)');
                else if (format.height >= 1080) qualities.add('Full HD (1080p)');
                else if (format.height >= 720) qualities.add('HD (720p)');
                else if (format.height >= 480) qualities.add('SD (480p)');
                else if (format.height >= 360) qualities.add('SD (360p)');
                else if (format.height >= 240) qualities.add('Low (240p)');
                else qualities.add('Very Low (144p)');
            }
        });

        return Array.from(qualities).sort((a, b) => {
            const getHeight = (q) => parseInt(q.match(/\((\d+)p\)/)?.[1] || '0');
            return getHeight(b) - getHeight(a);
        });
    }

    /**
     * Process audio-only formats
     */
    processAudioFormats(formats) {
        return formats
            .filter(format => format.vcodec === 'none' && format.acodec !== 'none')
            .map(format => ({
                formatId: format.format_id,
                ext: format.ext,
                abr: format.abr,
                acodec: format.acodec,
                filesize: format.filesize,
                quality: format.quality,
                format: format.format
            }))
            .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    }

    /**
     * Get recommended quality based on format analysis
     */
    getRecommendedQuality(formats) {
        // Logic to determine best quality/filesize balance
        const videoFormats = formats.filter(f => f.height && f.vcodec !== 'none');
        
        if (videoFormats.length === 0) return null;

        // Prefer 1080p if available, otherwise highest available
        const preferred1080 = videoFormats.find(f => f.height === 1080);
        if (preferred1080) return preferred1080;

        // Fallback to highest quality
        return videoFormats.reduce((best, current) => {
            return (current.height || 0) > (best.height || 0) ? current : best;
        });
    }

    /**
     * Estimate file sizes for different qualities
     */
    estimateFileSize(formats) {
        const estimates = {};
        
        formats.forEach(format => {
            if (format.height && format.filesize) {
                const quality = `${format.height}p`;
                if (!estimates[quality] || format.filesize > estimates[quality]) {
                    estimates[quality] = {
                        bytes: format.filesize,
                        formatted: this.formatFileSize(format.filesize)
                    };
                }
            }
        });

        return estimates;
    }

    /**
     * Estimate download times based on typical connection speeds
     */
    estimateDownloadTimes(formats) {
        const connectionSpeeds = {
            'slow': 1 * 1024 * 1024, // 1 Mbps
            'medium': 10 * 1024 * 1024, // 10 Mbps
            'fast': 50 * 1024 * 1024, // 50 Mbps
            'veryfast': 100 * 1024 * 1024 // 100 Mbps
        };

        const estimates = {};

        formats.forEach(format => {
            if (format.height && format.filesize) {
                const quality = `${format.height}p`;
                if (!estimates[quality]) {
                    estimates[quality] = {};
                    
                    Object.entries(connectionSpeeds).forEach(([speed, bytesPerSecond]) => {
                        const timeSeconds = format.filesize / bytesPerSecond;
                        estimates[quality][speed] = this.formatDuration(timeSeconds);
                    });
                }
            }
        });

        return estimates;
    }

    /**
     * Show video preview modal
     */
    async showVideoPreview(videoUrl, options = {}) {
        try {
            this.showPreviewLoading();
            
            const previewData = await this.getVideoPreview(videoUrl, options);
            
            this.hidePreviewLoading();
            this.populatePreviewModal(previewData);
            this.showPreviewModal();
            
            // Emit preview shown event
            if (this.eventHandlers.onPreviewShown) {
                this.eventHandlers.onPreviewShown(previewData);
            }
            
        } catch (error) {
            this.hidePreviewLoading();
            this.showPreviewError(error.message);
            
            if (this.eventHandlers.onPreviewError) {
                this.eventHandlers.onPreviewError(error);
            }
        }
    }

    /**
     * Populate the preview modal with video data
     */
    populatePreviewModal(videoData) {
        // Basic information
        document.getElementById('preview-title').textContent = videoData.title;
        document.getElementById('preview-description').textContent = 
            this.truncateText(videoData.description, 500);
        document.getElementById('preview-channel').textContent = videoData.uploader;
        document.getElementById('preview-duration').textContent = 
            this.formatDuration(videoData.duration);
        document.getElementById('preview-views').textContent = 
            this.formatNumber(videoData.viewCount);
        document.getElementById('preview-upload-date').textContent = 
            this.formatUploadDate(videoData.uploadDate);

        // Thumbnail
        const thumbnail = document.getElementById('preview-thumbnail');
        const bestThumbnail = videoData.previewData.bestThumbnail;
        thumbnail.src = bestThumbnail.url;
        thumbnail.alt = videoData.title;

        // Quality options
        this.populateQualityOptions(videoData.qualities, videoData.formats);

        // File size estimates
        this.populateFileSizeEstimates(videoData.previewData.estimatedFileSize);

        // Download time estimates
        this.populateDownloadTimeEstimates(videoData.previewData.downloadTimes);

        // Tags
        this.populateTags(videoData.tags);

        // Additional metadata
        this.populateAdditionalMetadata(videoData);

        // Store video data for download
        this.currentPreviewData = videoData;
    }

    /**
     * Populate quality selection options
     */
    populateQualityOptions(qualities, formats) {
        const qualitySelect = document.getElementById('preview-quality-select');
        qualitySelect.innerHTML = '';

        qualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality;
            option.textContent = quality;
            qualitySelect.appendChild(option);
        });

        // Set recommended quality
        const recommended = formats.find(f => f.height === 1080);
        if (recommended) {
            qualitySelect.value = `Full HD (1080p)`;
        }
    }

    /**
     * Populate file size estimates
     */
    populateFileSizeEstimates(estimates) {
        const container = document.getElementById('preview-filesize-estimates');
        container.innerHTML = '';

        Object.entries(estimates).forEach(([quality, sizeData]) => {
            const item = document.createElement('div');
            item.className = 'filesize-estimate-item';
            item.innerHTML = `
                <span class="quality-label">${quality}:</span>
                <span class="filesize-value">${sizeData.formatted}</span>
            `;
            container.appendChild(item);
        });
    }

    /**
     * Populate download time estimates
     */
    populateDownloadTimeEstimates(estimates) {
        const container = document.getElementById('preview-download-times');
        container.innerHTML = '';

        Object.entries(estimates).forEach(([quality, times]) => {
            const item = document.createElement('div');
            item.className = 'download-time-item';
            item.innerHTML = `
                <div class="quality-header">${quality}</div>
                <div class="time-estimates">
                    <span>Slow: ${times.slow}</span>
                    <span>Medium: ${times.medium}</span>
                    <span>Fast: ${times.fast}</span>
                    <span>Very Fast: ${times.veryfast}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    /**
     * Populate video tags
     */
    populateTags(tags) {
        const container = document.getElementById('preview-tags');
        container.innerHTML = '';

        if (!tags || tags.length === 0) {
            container.innerHTML = '<span class="no-tags">No tags available</span>';
            return;
        }

        tags.slice(0, 20).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'video-tag';
            tagElement.textContent = tag;
            container.appendChild(tagElement);
        });

        if (tags.length > 20) {
            const moreElement = document.createElement('span');
            moreElement.className = 'video-tag more-tags';
            moreElement.textContent = `+${tags.length - 20} more`;
            container.appendChild(moreElement);
        }
    }

    /**
     * Populate additional metadata
     */
    populateAdditionalMetadata(videoData) {
        const container = document.getElementById('preview-metadata');
        container.innerHTML = '';

        const metadata = [
            { label: 'Video ID', value: videoData.id },
            { label: 'Language', value: videoData.language || 'Unknown' },
            { label: 'Categories', value: videoData.categories?.join(', ') || 'None' },
            { label: 'Subtitles', value: Object.keys(videoData.subtitles || {}).length > 0 ? 'Available' : 'None' },
            { label: 'Like Count', value: this.formatNumber(videoData.likeCount) },
            { label: 'Subscriber Count', value: this.formatNumber(videoData.subscriberCount) }
        ];

        metadata.forEach(item => {
            const metaElement = document.createElement('div');
            metaElement.className = 'metadata-item';
            metaElement.innerHTML = `
                <span class="metadata-label">${item.label}:</span>
                <span class="metadata-value">${item.value}</span>
            `;
            container.appendChild(metaElement);
        });
    }

    /**
     * Initialize the preview interface
     */
    initializePreviewInterface() {
        // Create preview modal if it doesn't exist
        if (!document.getElementById('video-preview-modal')) {
            this.createPreviewModal();
        }

        this.setupPreviewEventListeners();
    }

    /**
     * Create the video preview modal
     */
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'video-preview-modal';
        modal.className = 'preview-modal';
        
        modal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-modal-header">
                    <h3>Video Preview</h3>
                    <button class="preview-modal-close">&times;</button>
                </div>
                
                <div class="preview-modal-body">
                    <!-- Loading state -->
                    <div id="preview-loading" class="preview-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading video information...</p>
                    </div>
                    
                    <!-- Error state -->
                    <div id="preview-error" class="preview-error" style="display: none;">
                        <div class="error-icon">⚠️</div>
                        <p id="preview-error-message">Failed to load video information</p>
                        <button id="preview-retry-btn" class="btn btn-primary">Retry</button>
                    </div>
                    
                    <!-- Content -->
                    <div id="preview-content" class="preview-content">
                        <div class="preview-main">
                            <div class="preview-thumbnail-section">
                                <img id="preview-thumbnail" class="preview-thumbnail" alt="Video thumbnail">
                                <div class="preview-duration-overlay">
                                    <span id="preview-duration"></span>
                                </div>
                            </div>
                            
                            <div class="preview-info-section">
                                <h4 id="preview-title"></h4>
                                <div class="preview-meta">
                                    <span class="preview-channel">
                                        <strong>Channel:</strong> <span id="preview-channel"></span>
                                    </span>
                                    <span class="preview-views">
                                        <strong>Views:</strong> <span id="preview-views"></span>
                                    </span>
                                    <span class="preview-upload-date">
                                        <strong>Uploaded:</strong> <span id="preview-upload-date"></span>
                                    </span>
                                </div>
                                <div class="preview-description">
                                    <p id="preview-description"></p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="preview-details">
                            <div class="preview-tabs">
                                <button class="preview-tab active" data-tab="quality">Quality & Download</button>
                                <button class="preview-tab" data-tab="metadata">Details</button>
                                <button class="preview-tab" data-tab="tags">Tags</button>
                            </div>
                            
                            <div class="preview-tab-content">
                                <!-- Quality & Download Tab -->
                                <div id="quality-tab" class="tab-panel active">
                                    <div class="quality-selection">
                                        <label for="preview-quality-select">Select Quality:</label>
                                        <select id="preview-quality-select"></select>
                                    </div>
                                    
                                    <div class="filesize-estimates">
                                        <h5>Estimated File Sizes:</h5>
                                        <div id="preview-filesize-estimates"></div>
                                    </div>
                                    
                                    <div class="download-times">
                                        <h5>Estimated Download Times:</h5>
                                        <div id="preview-download-times"></div>
                                    </div>
                                    
                                    <div class="download-options">
                                        <label>
                                            <input type="checkbox" id="preview-audio-only"> Audio Only
                                        </label>
                                        <label>
                                            <input type="checkbox" id="preview-subtitles"> Include Subtitles
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Metadata Tab -->
                                <div id="metadata-tab" class="tab-panel">
                                    <div id="preview-metadata"></div>
                                </div>
                                
                                <!-- Tags Tab -->
                                <div id="tags-tab" class="tab-panel">
                                    <div id="preview-tags"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="preview-modal-footer">
                    <button id="preview-cancel-btn" class="btn btn-secondary">Cancel</button>
                    <button id="preview-add-to-playlist-btn" class="btn btn-outline">Add to Playlist</button>
                    <button id="preview-download-btn" class="btn btn-primary">Download</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Setup event listeners for the preview modal
     */
    setupPreviewEventListeners() {
        // Close modal
        document.querySelector('.preview-modal-close').addEventListener('click', () => {
            this.hidePreviewModal();
        });

        document.getElementById('preview-cancel-btn').addEventListener('click', () => {
            this.hidePreviewModal();
        });

        // Tab switching
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPreviewTab(tab.dataset.tab);
            });
        });

        // Download button
        document.getElementById('preview-download-btn').addEventListener('click', () => {
            this.downloadFromPreview();
        });

        // Add to playlist button
        document.getElementById('preview-add-to-playlist-btn').addEventListener('click', () => {
            this.addToPlaylistFromPreview();
        });

        // Retry button
        document.getElementById('preview-retry-btn').addEventListener('click', () => {
            this.retryPreview();
        });

        // Close on outside click
        document.getElementById('video-preview-modal').addEventListener('click', (e) => {
            if (e.target.id === 'video-preview-modal') {
                this.hidePreviewModal();
            }
        });
    }

    /**
     * Switch preview tabs
     */
    switchPreviewTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        });
    }

    /**
     * Download video from preview
     */
    async downloadFromPreview() {
        if (!this.currentPreviewData) return;

        try {
            const quality = document.getElementById('preview-quality-select').value;
            const audioOnly = document.getElementById('preview-audio-only').checked;
            const subtitles = document.getElementById('preview-subtitles').checked;

            const downloadOptions = {
                quality,
                audioOnly,
                subtitles,
                format: audioOnly ? 'mp3' : 'mp4'
            };

            // Emit download event
            if (this.eventHandlers.onDownloadFromPreview) {
                await this.eventHandlers.onDownloadFromPreview(this.currentPreviewData, downloadOptions);
            }

            this.hidePreviewModal();

        } catch (error) {
            console.error('Failed to download from preview:', error);
            alert('Failed to start download: ' + error.message);
        }
    }

    /**
     * Add video to playlist from preview
     */
    async addToPlaylistFromPreview() {
        if (!this.currentPreviewData) return;

        try {
            // Emit add to playlist event
            if (this.eventHandlers.onAddToPlaylistFromPreview) {
                await this.eventHandlers.onAddToPlaylistFromPreview(this.currentPreviewData);
            }

            this.hidePreviewModal();

        } catch (error) {
            console.error('Failed to add to playlist from preview:', error);
            alert('Failed to add to playlist: ' + error.message);
        }
    }

    /**
     * Retry preview loading
     */
    retryPreview() {
        if (this.lastPreviewUrl) {
            this.showVideoPreview(this.lastPreviewUrl);
        }
    }

    /**
     * Show/hide modal states
     */
    showPreviewModal() {
        document.getElementById('video-preview-modal').classList.add('show');
        document.getElementById('preview-content').style.display = 'block';
        document.getElementById('preview-loading').style.display = 'none';
        document.getElementById('preview-error').style.display = 'none';
    }

    hidePreviewModal() {
        document.getElementById('video-preview-modal').classList.remove('show');
        this.currentPreviewData = null;
        this.lastPreviewUrl = null;
    }

    showPreviewLoading() {
        document.getElementById('video-preview-modal').classList.add('show');
        document.getElementById('preview-content').style.display = 'none';
        document.getElementById('preview-loading').style.display = 'block';
        document.getElementById('preview-error').style.display = 'none';
    }

    hidePreviewLoading() {
        document.getElementById('preview-loading').style.display = 'none';
    }

    showPreviewError(message) {
        document.getElementById('video-preview-modal').classList.add('show');
        document.getElementById('preview-content').style.display = 'none';
        document.getElementById('preview-loading').style.display = 'none';
        document.getElementById('preview-error').style.display = 'block';
        document.getElementById('preview-error-message').textContent = message;
    }

    /**
     * Queue processing
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;
        
        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0 && this.activeRequests.size < this.config.maxConcurrentPreviews) {
            const request = this.requestQueue.shift();
            this.processRequest(request);
        }

        this.isProcessingQueue = false;
    }

    async processRequest(request) {
        const { videoId, videoUrl, options, cacheKey, resolve, reject } = request;
        
        this.activeRequests.set(videoId, request);

        try {
            const videoInfo = await this.getDetailedVideoInfo(videoUrl, options);
            
            // Cache the result
            this.previewCache.set(cacheKey, {
                data: videoInfo,
                timestamp: Date.now()
            });

            // Save to localStorage
            this.saveCachedData();

            resolve(videoInfo);

        } catch (error) {
            reject(error);
        } finally {
            this.activeRequests.delete(videoId);
            
            // Process next in queue
            setTimeout(() => this.processQueue(), 100);
        }
    }

    /**
     * Utility methods
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatNumber(num) {
        if (!num) return '0';
        
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else {
            return num.toString();
        }
    }

    formatUploadDate(dateString) {
        if (!dateString) return 'Unknown';
        
        // Parse YYYYMMDD format
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        
        const date = new Date(`${year}-${month}-${day}`);
        return date.toLocaleDateString();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Cache management
     */
    async loadCachedData() {
        try {
            const cached = localStorage.getItem('videoPreviewCache');
            if (cached) {
                const data = JSON.parse(cached);
                this.previewCache = new Map(data.previewCache || []);
                this.thumbnailCache = new Map(data.thumbnailCache || []);
                this.videoInfoCache = new Map(data.videoInfoCache || []);
            }
        } catch (error) {
            console.error('Failed to load cached data:', error);
        }
    }

    saveCachedData() {
        try {
            const data = {
                previewCache: Array.from(this.previewCache.entries()),
                thumbnailCache: Array.from(this.thumbnailCache.entries()),
                videoInfoCache: Array.from(this.videoInfoCache.entries()),
                timestamp: Date.now()
            };
            
            localStorage.setItem('videoPreviewCache', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save cached data:', error);
        }
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 1000);
        
        // Initialize hover preview functionality
        this.initializeHoverPreview();
    }

    /**
     * Initialize hover preview for video thumbnails
     */
    initializeHoverPreview() {
        let hoverTimeout;
        let quickPreviewCard;
        
        document.addEventListener('mouseover', (e) => {
            const videoItem = e.target.closest('[data-video-url]');
            if (!videoItem) return;
            
            const videoUrl = videoItem.dataset.videoUrl;
            if (!videoUrl) return;
            
            // Clear any existing timeout
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            
            // Set a delay before showing preview
            hoverTimeout = setTimeout(async () => {
                try {
                    const previewData = await this.getVideoPreview(videoUrl, { quick: true });
                    quickPreviewCard = this.showQuickPreviewCard(e.target, previewData);
                } catch (error) {
                    console.error('Failed to show quick preview:', error);
                }
            }, 500); // 500ms delay
        });
        
        document.addEventListener('mouseout', (e) => {
            const videoItem = e.target.closest('[data-video-url]');
            if (!videoItem) return;
            
            // Clear timeout if mouse leaves before delay
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            
            // Hide quick preview card
            if (quickPreviewCard) {
                this.hideQuickPreviewCard(quickPreviewCard);
                quickPreviewCard = null;
            }
        });
    }

    /**
     * Show quick preview card
     */
    showQuickPreviewCard(targetElement, videoData) {
        // Remove any existing quick preview
        const existingCard = document.querySelector('.quick-preview-card');
        if (existingCard) {
            existingCard.remove();
        }
        
        const card = document.createElement('div');
        card.className = 'quick-preview-card';
        
        const rect = targetElement.getBoundingClientRect();
        const thumbnail = videoData.previewData.bestThumbnail;
        
        card.innerHTML = `
            <img src="${thumbnail.url}" alt="${videoData.title}" class="quick-preview-thumbnail">
            <div class="quick-preview-title">${this.truncateText(videoData.title, 100)}</div>
            <div class="quick-preview-meta">
                ${this.formatDuration(videoData.duration)} • ${this.formatNumber(videoData.viewCount)} views
            </div>
            <div class="quick-preview-actions">
                <button class="btn btn-outline" onclick="app.showVideoPreview('${videoData.originalUrl}')">Full Preview</button>
                <button class="btn btn-primary" onclick="app.downloadVideoFromPreview(${JSON.stringify(videoData).replace(/"/g, '&quot;')}, { quality: 'best', format: 'mp4' })">Download</button>
            </div>
        `;
        
        // Position the card
        card.style.position = 'fixed';
        card.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
        card.style.top = Math.max(rect.bottom + 10, 10) + 'px';
        card.style.zIndex = '9999';
        
        document.body.appendChild(card);
        
        // Animate in
        setTimeout(() => {
            card.classList.add('show');
        }, 10);
        
        return card;
    }

    /**
     * Hide quick preview card
     */
    hideQuickPreviewCard(card) {
        if (card && card.parentNode) {
            card.classList.remove('show');
            setTimeout(() => {
                if (card.parentNode) {
                    card.parentNode.removeChild(card);
                }
            }, 200);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.previewCache.clear();
        this.thumbnailCache.clear();
        this.videoInfoCache.clear();
        localStorage.removeItem('videoPreviewCache');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            previewCache: this.previewCache.size,
            thumbnailCache: this.thumbnailCache.size,
            videoInfoCache: this.videoInfoCache.size,
            activeRequests: this.activeRequests.size,
            queueLength: this.requestQueue.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoPreviewManager;
}
