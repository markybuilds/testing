/**
 * OfflineVideoManager - Comprehensive offline video access system
 * Provides integrated media player and system default application support
 */

class OfflineVideoManager {
    constructor() {
        this.downloadedVideos = new Map();
        this.mediaPlayer = null;
        this.isInitialized = false;
        this.eventHandlers = {};
        this.currentVideo = null;
        this.playbackHistory = [];
        this.bookmarks = new Map();
        this.watchlist = new Set();
        
        // Configuration
        this.config = {
            enableIntegratedPlayer: true,
            enableSystemPlayer: true,
            autoResizePlayer: true,
            rememberPlaybackPosition: true,
            maxHistoryItems: 100,
            supportedFormats: [
                'mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 
                'm4v', '3gp', 'ts', 'mp3', 'aac', 'wav', 
                'flac', 'ogg', 'm4a', 'wma'
            ],
            playerSettings: {
                volume: 0.8,
                playbackRate: 1.0,
                autoplay: false,
                loop: false,
                muted: false,
                controls: true,
                preload: 'metadata'
            }
        };
        
        this.scanInterval = null;
        this.watchPositions = new Map();
    }

    /**
     * Initialize the offline video access system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Load saved data
            await this.loadSavedData();
            
            // Initialize media player
            this.initializeMediaPlayer();
            
            // Setup file system monitoring
            await this.setupFileSystemMonitoring();
            
            // Scan for downloaded videos
            await this.scanDownloadedVideos();
            
            // Initialize interface
            this.initializeOfflineInterface();
            
            // Start periodic scanning
            this.startPeriodicScanning();
            
            this.isInitialized = true;
            console.log('OfflineVideoManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize OfflineVideoManager:', error);
            throw error;
        }
    }

    /**
     * Set event handlers for offline video events
     */
    setEventHandlers(handlers) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
    }

    /**
     * Initialize the integrated media player
     */
    initializeMediaPlayer() {
        // Create media player container if it doesn't exist
        if (!document.getElementById('integrated-media-player')) {
            this.createMediaPlayerInterface();
        }
        
        this.setupMediaPlayerEventListeners();
        
        // Load saved player settings
        this.loadPlayerSettings();
    }

    /**
     * Create the integrated media player interface
     */
    createMediaPlayerInterface() {
        const playerContainer = document.createElement('div');
        playerContainer.id = 'integrated-media-player';
        playerContainer.className = 'media-player-container';
        
        playerContainer.innerHTML = `
            <div class="media-player-header">
                <h3 id="player-video-title">Media Player</h3>
                <div class="player-controls-header">
                    <button id="player-minimize-btn" class="player-btn" title="Minimize">−</button>
                    <button id="player-fullscreen-btn" class="player-btn" title="Fullscreen">⛶</button>
                    <button id="player-close-btn" class="player-btn" title="Close">×</button>
                </div>
            </div>
            
            <div class="media-player-content">
                <div class="video-container">
                    <video id="media-video-element" 
                           controls 
                           preload="metadata"
                           poster="assets/video-poster.jpg">
                        Your browser does not support the video tag.
                    </video>
                    
                    <div class="video-overlay">
                        <div id="loading-overlay" class="overlay-item" style="display: none;">
                            <div class="loading-spinner"></div>
                            <p>Loading video...</p>
                        </div>
                        
                        <div id="error-overlay" class="overlay-item" style="display: none;">
                            <div class="error-icon">⚠️</div>
                            <p id="error-message">Failed to load video</p>
                            <button id="retry-video-btn" class="btn btn-primary">Retry</button>
                        </div>
                    </div>
                </div>
                
                <div class="player-info-panel">
                    <div class="video-metadata">
                        <div class="metadata-row">
                            <span class="metadata-label">Duration:</span>
                            <span id="video-duration">--:--</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">Resolution:</span>
                            <span id="video-resolution">Unknown</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">File Size:</span>
                            <span id="video-filesize">Unknown</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">Format:</span>
                            <span id="video-format">Unknown</span>
                        </div>
                    </div>
                    
                    <div class="player-actions">
                        <button id="open-folder-btn" class="btn btn-outline">📁 Open Folder</button>
                        <button id="video-info-btn" class="btn btn-outline">ℹ️ Video Info</button>
                        <button id="bookmark-btn" class="btn btn-outline">🔖 Bookmark</button>
                        <button id="add-to-watchlist-btn" class="btn btn-outline">👁️ Watchlist</button>
                    </div>
                </div>
                
                <div class="playback-controls">
                    <div class="timeline-container">
                        <div class="timeline">
                            <div id="timeline-progress" class="timeline-progress"></div>
                            <div id="timeline-buffered" class="timeline-buffered"></div>
                            <input type="range" id="timeline-scrubber" min="0" max="100" value="0" class="timeline-scrubber">
                        </div>
                        <div class="time-display">
                            <span id="current-time">0:00</span>
                            <span>/</span>
                            <span id="total-time">0:00</span>
                        </div>
                    </div>
                    
                    <div class="control-buttons">
                        <button id="previous-btn" class="control-btn">⏮️</button>
                        <button id="rewind-btn" class="control-btn">⏪</button>
                        <button id="play-pause-btn" class="control-btn play-btn">▶️</button>
                        <button id="forward-btn" class="control-btn">⏩</button>
                        <button id="next-btn" class="control-btn">⏭️</button>
                    </div>
                    
                    <div class="volume-controls">
                        <button id="mute-btn" class="control-btn">🔊</button>
                        <input type="range" id="volume-slider" min="0" max="100" value="80" class="volume-slider">
                    </div>
                    
                    <div class="additional-controls">
                        <select id="playback-speed" class="speed-select">
                            <option value="0.25">0.25x</option>
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                        <button id="loop-btn" class="control-btn">🔁</button>
                        <button id="pip-btn" class="control-btn" title="Picture in Picture">📺</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(playerContainer);
    }

    /**
     * Setup media player event listeners
     */
    setupMediaPlayerEventListeners() {
        const video = document.getElementById('media-video-element');
        
        // Video element events
        video.addEventListener('loadstart', () => this.onVideoLoadStart());
        video.addEventListener('loadedmetadata', () => this.onVideoMetadataLoaded());
        video.addEventListener('canplaythrough', () => this.onVideoCanPlayThrough());
        video.addEventListener('play', () => this.onVideoPlay());
        video.addEventListener('pause', () => this.onVideoPause());
        video.addEventListener('ended', () => this.onVideoEnded());
        video.addEventListener('error', (e) => this.onVideoError(e));
        video.addEventListener('timeupdate', () => this.onTimeUpdate());
        video.addEventListener('volumechange', () => this.onVolumeChange());
        video.addEventListener('ratechange', () => this.onRateChange());
        video.addEventListener('progress', () => this.onProgress());
        
        // Control button events
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('previous-btn').addEventListener('click', () => this.playPrevious());
        document.getElementById('next-btn').addEventListener('click', () => this.playNext());
        document.getElementById('rewind-btn').addEventListener('click', () => this.rewind());
        document.getElementById('forward-btn').addEventListener('click', () => this.fastForward());
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
        document.getElementById('loop-btn').addEventListener('click', () => this.toggleLoop());
        document.getElementById('pip-btn').addEventListener('click', () => this.togglePictureInPicture());
        
        // Player window controls
        document.getElementById('player-minimize-btn').addEventListener('click', () => this.minimizePlayer());
        document.getElementById('player-fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('player-close-btn').addEventListener('click', () => this.closePlayer());
        
        // Slider controls
        document.getElementById('volume-slider').addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        document.getElementById('playback-speed').addEventListener('change', (e) => this.setPlaybackRate(e.target.value));
        document.getElementById('timeline-scrubber').addEventListener('input', (e) => this.seekTo(e.target.value));
        
        // Action buttons
        document.getElementById('open-folder-btn').addEventListener('click', () => this.openVideoFolder());
        document.getElementById('video-info-btn').addEventListener('click', () => this.showVideoInfo());
        document.getElementById('bookmark-btn').addEventListener('click', () => this.toggleBookmark());
        document.getElementById('add-to-watchlist-btn').addEventListener('click', () => this.toggleWatchlist());
        document.getElementById('retry-video-btn').addEventListener('click', () => this.retryVideo());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Scan for downloaded videos in the system
     */
    async scanDownloadedVideos() {
        try {
            const downloadPaths = await this.getDownloadPaths();
            
            for (const path of downloadPaths) {
                await this.scanDirectory(path);
            }
            
            // Emit scan complete event
            if (this.eventHandlers.onScanComplete) {
                this.eventHandlers.onScanComplete(this.downloadedVideos.size);
            }
            
        } catch (error) {
            console.error('Error scanning downloaded videos:', error);
        }
    }

    /**
     * Get all download paths to scan
     */
    async getDownloadPaths() {
        const paths = [];
        
        try {
            // Get default download path
            const defaultPath = await window.electronAPI.getDownloadPath();
            if (defaultPath) paths.push(defaultPath);
            
            // Get user-configured download paths
            const configPaths = await window.electronAPI.settings.getDownloadPaths();
            if (configPaths) paths.push(...configPaths);
            
            // Get playlist-specific download paths
            const playlistPaths = await window.electronAPI.database.getPlaylistDownloadPaths();
            if (playlistPaths) paths.push(...playlistPaths);
            
        } catch (error) {
            console.error('Error getting download paths:', error);
        }
        
        return [...new Set(paths)]; // Remove duplicates
    }

    /**
     * Scan a directory for video files
     */
    async scanDirectory(directoryPath) {
        try {
            const files = await window.electronAPI.fs.readDirectory(directoryPath, {
                recursive: true,
                extensions: this.config.supportedFormats
            });
            
            for (const file of files) {
                await this.processVideoFile(file);
            }
            
        } catch (error) {
            console.error(`Error scanning directory ${directoryPath}:`, error);
        }
    }

    /**
     * Process and catalog a video file
     */
    async processVideoFile(filePath) {
        try {
            const fileStats = await window.electronAPI.fs.getFileStats(filePath);
            const videoInfo = {
                path: filePath,
                name: this.getFileName(filePath),
                extension: this.getFileExtension(filePath),
                size: fileStats.size,
                dateModified: fileStats.mtime,
                dateAdded: fileStats.ctime,
                duration: null,
                resolution: null,
                format: null,
                metadata: null,
                thumbnail: null,
                watchPosition: 0,
                watchCount: 0,
                lastWatched: null,
                isBookmarked: false,
                inWatchlist: false
            };
            
            // Try to extract video metadata
            try {
                const metadata = await this.extractVideoMetadata(filePath);
                videoInfo.duration = metadata.duration;
                videoInfo.resolution = metadata.resolution;
                videoInfo.format = metadata.format;
                videoInfo.metadata = metadata;
            } catch (error) {
                console.warn(`Failed to extract metadata for ${filePath}:`, error);
            }
            
            // Generate thumbnail if possible
            try {
                const thumbnail = await this.generateThumbnail(filePath);
                videoInfo.thumbnail = thumbnail;
            } catch (error) {
                console.warn(`Failed to generate thumbnail for ${filePath}:`, error);
            }
            
            // Store the video info
            this.downloadedVideos.set(filePath, videoInfo);
            
            // Emit video discovered event
            if (this.eventHandlers.onVideoDiscovered) {
                this.eventHandlers.onVideoDiscovered(videoInfo);
            }
            
        } catch (error) {
            console.error(`Error processing video file ${filePath}:`, error);
        }
    }

    /**
     * Extract video metadata using FFprobe
     */
    async extractVideoMetadata(filePath) {
        try {
            const metadata = await window.electronAPI.ffmpeg.probe(filePath);
            
            return {
                duration: metadata.duration,
                resolution: `${metadata.width}x${metadata.height}`,
                format: metadata.format,
                codec: metadata.codec,
                bitrate: metadata.bitrate,
                fps: metadata.fps,
                audioCodec: metadata.audioCodec,
                channels: metadata.channels,
                sampleRate: metadata.sampleRate
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Generate video thumbnail
     */
    async generateThumbnail(filePath) {
        try {
            const thumbnailPath = await window.electronAPI.ffmpeg.generateThumbnail(filePath, {
                timeOffset: '00:00:10',
                size: '320x180',
                quality: 3
            });
            
            return thumbnailPath;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Play video in integrated player
     */
    async playVideoIntegrated(videoPath) {
        try {
            const videoInfo = this.downloadedVideos.get(videoPath);
            if (!videoInfo) {
                throw new Error('Video not found in catalog');
            }
            
            this.currentVideo = videoInfo;
            
            // Show player
            this.showPlayer();
            
            // Load video
            const video = document.getElementById('media-video-element');
            video.src = `file://${videoPath}`;
            
            // Update UI
            this.updatePlayerUI(videoInfo);
            
            // Show loading overlay
            this.showLoadingOverlay();
            
            // Restore playback position if remembered
            if (this.config.rememberPlaybackPosition && videoInfo.watchPosition > 0) {
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = videoInfo.watchPosition;
                }, { once: true });
            }
            
            // Add to playback history
            this.addToPlaybackHistory(videoInfo);
            
            // Emit play event
            if (this.eventHandlers.onVideoPlay) {
                this.eventHandlers.onVideoPlay(videoInfo);
            }
            
        } catch (error) {
            console.error('Error playing video in integrated player:', error);
            this.showErrorOverlay(error.message);
        }
    }

    /**
     * Play video with system default application
     */
    async playVideoSystem(videoPath) {
        try {
            const videoInfo = this.downloadedVideos.get(videoPath);
            if (!videoInfo) {
                throw new Error('Video not found in catalog');
            }
            
            // Open with system default
            await window.electronAPI.shell.openPath(videoPath);
            
            // Add to playback history
            this.addToPlaybackHistory(videoInfo);
            
            // Update watch count
            videoInfo.watchCount++;
            videoInfo.lastWatched = new Date();
            
            // Emit play event
            if (this.eventHandlers.onVideoPlay) {
                this.eventHandlers.onVideoPlay(videoInfo);
            }
            
            // Save data
            this.saveData();
            
        } catch (error) {
            console.error('Error opening video with system application:', error);
            throw error;
        }
    }

    /**
     * Show the integrated media player
     */
    showPlayer() {
        const player = document.getElementById('integrated-media-player');
        player.classList.add('show');
        player.classList.remove('minimized');
    }

    /**
     * Hide the integrated media player
     */
    hidePlayer() {
        const player = document.getElementById('integrated-media-player');
        player.classList.remove('show');
    }

    /**
     * Minimize the media player
     */
    minimizePlayer() {
        const player = document.getElementById('integrated-media-player');
        player.classList.add('minimized');
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const video = document.getElementById('media-video-element');
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            video.requestFullscreen();
        }
    }

    /**
     * Close the media player
     */
    closePlayer() {
        const video = document.getElementById('media-video-element');
        
        // Save current position
        if (this.currentVideo && this.config.rememberPlaybackPosition) {
            this.currentVideo.watchPosition = video.currentTime;
            this.saveData();
        }
        
        // Stop video
        video.pause();
        video.src = '';
        
        // Hide player
        this.hidePlayer();
        
        this.currentVideo = null;
    }

    /**
     * Update player UI with video information
     */
    updatePlayerUI(videoInfo) {
        document.getElementById('player-video-title').textContent = videoInfo.name;
        document.getElementById('video-duration').textContent = this.formatDuration(videoInfo.duration);
        document.getElementById('video-resolution').textContent = videoInfo.resolution || 'Unknown';
        document.getElementById('video-filesize').textContent = this.formatFileSize(videoInfo.size);
        document.getElementById('video-format').textContent = videoInfo.extension.toUpperCase();
        
        // Update bookmark button
        const bookmarkBtn = document.getElementById('bookmark-btn');
        bookmarkBtn.classList.toggle('active', videoInfo.isBookmarked);
        
        // Update watchlist button
        const watchlistBtn = document.getElementById('add-to-watchlist-btn');
        watchlistBtn.classList.toggle('active', videoInfo.inWatchlist);
    }

    /**
     * Media player event handlers
     */
    onVideoLoadStart() {
        this.showLoadingOverlay();
    }

    onVideoMetadataLoaded() {
        const video = document.getElementById('media-video-element');
        
        // Update timeline
        document.getElementById('timeline-scrubber').max = video.duration;
        document.getElementById('total-time').textContent = this.formatDuration(video.duration);
        
        this.hideLoadingOverlay();
    }

    onVideoCanPlayThrough() {
        this.hideLoadingOverlay();
    }

    onVideoPlay() {
        document.getElementById('play-pause-btn').textContent = '⏸️';
        document.getElementById('play-pause-btn').classList.add('pause-btn');
        document.getElementById('play-pause-btn').classList.remove('play-btn');
    }

    onVideoPause() {
        document.getElementById('play-pause-btn').textContent = '▶️';
        document.getElementById('play-pause-btn').classList.add('play-btn');
        document.getElementById('play-pause-btn').classList.remove('pause-btn');
    }

    onVideoEnded() {
        // Update watch count
        if (this.currentVideo) {
            this.currentVideo.watchCount++;
            this.currentVideo.lastWatched = new Date();
            this.currentVideo.watchPosition = 0; // Reset position
            this.saveData();
        }
        
        // Auto-play next video if in playlist
        if (this.playlistMode && this.currentPlaylist.length > 0) {
            this.playNext();
        }
    }

    onVideoError(event) {
        console.error('Video error:', event);
        this.showErrorOverlay('Failed to load video. The file may be corrupted or in an unsupported format.');
    }

    onTimeUpdate() {
        const video = document.getElementById('media-video-element');
        
        // Update timeline
        const progress = (video.currentTime / video.duration) * 100;
        document.getElementById('timeline-progress').style.width = `${progress}%`;
        document.getElementById('timeline-scrubber').value = video.currentTime;
        document.getElementById('current-time').textContent = this.formatDuration(video.currentTime);
        
        // Save position periodically
        if (this.currentVideo && this.config.rememberPlaybackPosition) {
            this.currentVideo.watchPosition = video.currentTime;
            
            // Save every 10 seconds
            if (Math.floor(video.currentTime) % 10 === 0) {
                this.saveData();
            }
        }
    }

    onVolumeChange() {
        const video = document.getElementById('media-video-element');
        
        // Update volume slider
        document.getElementById('volume-slider').value = video.volume * 100;
        
        // Update mute button
        const muteBtn = document.getElementById('mute-btn');
        muteBtn.textContent = video.muted ? '🔇' : '🔊';
        
        // Save volume setting
        this.config.playerSettings.volume = video.volume;
        this.config.playerSettings.muted = video.muted;
        this.savePlayerSettings();
    }

    onRateChange() {
        const video = document.getElementById('media-video-element');
        document.getElementById('playback-speed').value = video.playbackRate;
        
        // Save playback rate setting
        this.config.playerSettings.playbackRate = video.playbackRate;
        this.savePlayerSettings();
    }

    onProgress() {
        const video = document.getElementById('media-video-element');
        
        // Update buffered indicator
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const bufferedProgress = (bufferedEnd / video.duration) * 100;
            document.getElementById('timeline-buffered').style.width = `${bufferedProgress}%`;
        }
    }

    /**
     * Media control functions
     */
    togglePlayPause() {
        const video = document.getElementById('media-video-element');
        
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    playPrevious() {
        // Implementation for playlist previous
        console.log('Play previous video');
    }

    playNext() {
        // Implementation for playlist next
        console.log('Play next video');
    }

    rewind() {
        const video = document.getElementById('media-video-element');
        video.currentTime = Math.max(0, video.currentTime - 10);
    }

    fastForward() {
        const video = document.getElementById('media-video-element');
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
    }

    toggleMute() {
        const video = document.getElementById('media-video-element');
        video.muted = !video.muted;
    }

    toggleLoop() {
        const video = document.getElementById('media-video-element');
        video.loop = !video.loop;
        
        const loopBtn = document.getElementById('loop-btn');
        loopBtn.classList.toggle('active', video.loop);
        
        // Save loop setting
        this.config.playerSettings.loop = video.loop;
        this.savePlayerSettings();
    }

    async togglePictureInPicture() {
        const video = document.getElementById('media-video-element');
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Picture-in-Picture error:', error);
        }
    }

    setVolume(volume) {
        const video = document.getElementById('media-video-element');
        video.volume = Math.max(0, Math.min(1, volume));
    }

    setPlaybackRate(rate) {
        const video = document.getElementById('media-video-element');
        video.playbackRate = parseFloat(rate);
    }

    seekTo(time) {
        const video = document.getElementById('media-video-element');
        video.currentTime = parseFloat(time);
    }

    /**
     * Additional action handlers
     */
    async openVideoFolder() {
        if (this.currentVideo) {
            try {
                await window.electronAPI.shell.showItemInFolder(this.currentVideo.path);
            } catch (error) {
                console.error('Error opening video folder:', error);
            }
        }
    }

    showVideoInfo() {
        if (this.currentVideo) {
            // Show detailed video information modal
            this.displayVideoInfoModal(this.currentVideo);
        }
    }

    toggleBookmark() {
        if (this.currentVideo) {
            this.currentVideo.isBookmarked = !this.currentVideo.isBookmarked;
            
            if (this.currentVideo.isBookmarked) {
                this.bookmarks.set(this.currentVideo.path, {
                    ...this.currentVideo,
                    bookmarkedAt: new Date()
                });
            } else {
                this.bookmarks.delete(this.currentVideo.path);
            }
            
            // Update UI
            const bookmarkBtn = document.getElementById('bookmark-btn');
            bookmarkBtn.classList.toggle('active', this.currentVideo.isBookmarked);
            
            this.saveData();
        }
    }

    toggleWatchlist() {
        if (this.currentVideo) {
            this.currentVideo.inWatchlist = !this.currentVideo.inWatchlist;
            
            if (this.currentVideo.inWatchlist) {
                this.watchlist.add(this.currentVideo.path);
            } else {
                this.watchlist.delete(this.currentVideo.path);
            }
            
            // Update UI
            const watchlistBtn = document.getElementById('add-to-watchlist-btn');
            watchlistBtn.classList.toggle('active', this.currentVideo.inWatchlist);
            
            this.saveData();
        }
    }

    retryVideo() {
        if (this.currentVideo) {
            this.playVideoIntegrated(this.currentVideo.path);
        }
    }

    /**
     * Keyboard shortcuts handler
     */
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts when player is active
        if (!document.getElementById('integrated-media-player').classList.contains('show')) {
            return;
        }
        
        // Prevent default for handled keys
        const handledKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyM', 'KeyF'];
        if (handledKeys.includes(event.code)) {
            event.preventDefault();
        }
        
        switch (event.code) {
            case 'Space':
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                this.rewind();
                break;
            case 'ArrowRight':
                this.fastForward();
                break;
            case 'ArrowUp':
                const video = document.getElementById('media-video-element');
                this.setVolume(video.volume + 0.1);
                break;
            case 'ArrowDown':
                const videoDown = document.getElementById('media-video-element');
                this.setVolume(videoDown.volume - 0.1);
                break;
            case 'KeyM':
                this.toggleMute();
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
        }
    }

    /**
     * Overlay management
     */
    showLoadingOverlay() {
        document.getElementById('loading-overlay').style.display = 'flex';
        document.getElementById('error-overlay').style.display = 'none';
    }

    hideLoadingOverlay() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showErrorOverlay(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-overlay').style.display = 'flex';
        document.getElementById('loading-overlay').style.display = 'none';
    }

    /**
     * Utility functions
     */
    getFileName(filePath) {
        return filePath.split('/').pop().split('\\').pop();
    }

    getFileExtension(filePath) {
        return filePath.split('.').pop().toLowerCase();
    }

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

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        
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
     * Data persistence
     */
    async loadSavedData() {
        try {
            const savedData = localStorage.getItem('offlineVideoManager');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                this.playbackHistory = data.playbackHistory || [];
                this.bookmarks = new Map(data.bookmarks || []);
                this.watchlist = new Set(data.watchlist || []);
                this.watchPositions = new Map(data.watchPositions || []);
                
                if (data.config) {
                    this.config = { ...this.config, ...data.config };
                }
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    saveData() {
        try {
            const data = {
                playbackHistory: this.playbackHistory,
                bookmarks: Array.from(this.bookmarks.entries()),
                watchlist: Array.from(this.watchlist),
                watchPositions: Array.from(this.watchPositions.entries()),
                config: this.config,
                lastSaved: Date.now()
            };
            
            localStorage.setItem('offlineVideoManager', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    loadPlayerSettings() {
        const video = document.getElementById('media-video-element');
        const settings = this.config.playerSettings;
        
        video.volume = settings.volume;
        video.playbackRate = settings.playbackRate;
        video.autoplay = settings.autoplay;
        video.loop = settings.loop;
        video.muted = settings.muted;
        video.controls = settings.controls;
        video.preload = settings.preload;
        
        // Update UI elements
        document.getElementById('volume-slider').value = settings.volume * 100;
        document.getElementById('playback-speed').value = settings.playbackRate;
    }

    savePlayerSettings() {
        this.saveData();
    }

    /**
     * File system monitoring
     */
    async setupFileSystemMonitoring() {
        try {
            // Setup file system watchers for download directories
            const paths = await this.getDownloadPaths();
            
            for (const path of paths) {
                await window.electronAPI.fs.watchDirectory(path, (event, filename) => {
                    this.onFileSystemChange(event, filename, path);
                });
            }
            
        } catch (error) {
            console.error('Error setting up file system monitoring:', error);
        }
    }

    onFileSystemChange(event, filename, basePath) {
        if (event === 'add' || event === 'change') {
            const fullPath = `${basePath}/${filename}`;
            const extension = this.getFileExtension(fullPath);
            
            if (this.config.supportedFormats.includes(extension)) {
                // Debounce the processing
                setTimeout(() => {
                    this.processVideoFile(fullPath);
                }, 1000);
            }
        } else if (event === 'unlink') {
            const fullPath = `${basePath}/${filename}`;
            this.downloadedVideos.delete(fullPath);
        }
    }

    /**
     * Periodic scanning
     */
    startPeriodicScanning() {
        // Scan for new videos every 5 minutes
        this.scanInterval = setInterval(() => {
            this.scanDownloadedVideos();
        }, 5 * 60 * 1000);
    }

    stopPeriodicScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    /**
     * Initialize offline interface
     */
    initializeOfflineInterface() {
        // This will be implemented when integrating with the main UI
        console.log('Offline video interface initialized');
    }

    /**
     * Playback history management
     */
    addToPlaybackHistory(videoInfo) {
        const historyItem = {
            path: videoInfo.path,
            name: videoInfo.name,
            playedAt: new Date(),
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail
        };
        
        // Remove existing entry if present
        this.playbackHistory = this.playbackHistory.filter(item => item.path !== videoInfo.path);
        
        // Add to beginning
        this.playbackHistory.unshift(historyItem);
        
        // Limit history size
        if (this.playbackHistory.length > this.config.maxHistoryItems) {
            this.playbackHistory = this.playbackHistory.slice(0, this.config.maxHistoryItems);
        }
        
        this.saveData();
    }

    /**
     * Get available videos
     */
    getAvailableVideos() {
        return Array.from(this.downloadedVideos.values());
    }

    getBookmarkedVideos() {
        return Array.from(this.bookmarks.values());
    }

    getWatchlistVideos() {
        return this.getAvailableVideos().filter(video => this.watchlist.has(video.path));
    }

    getRecentlyWatched() {
        return this.playbackHistory.slice(0, 20);
    }

    /**
     * Search and filter videos
     */
    searchVideos(query) {
        const videos = this.getAvailableVideos();
        const lowercaseQuery = query.toLowerCase();
        
        return videos.filter(video => 
            video.name.toLowerCase().includes(lowercaseQuery) ||
            (video.metadata && video.metadata.title && video.metadata.title.toLowerCase().includes(lowercaseQuery))
        );
    }

    filterVideosByFormat(format) {
        return this.getAvailableVideos().filter(video => video.extension === format.toLowerCase());
    }

    filterVideosByDuration(minDuration, maxDuration) {
        return this.getAvailableVideos().filter(video => 
            video.duration >= minDuration && video.duration <= maxDuration
        );
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopPeriodicScanning();
        this.closePlayer();
        this.saveData();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineVideoManager;
}
