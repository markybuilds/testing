/**
 * BatchDownloadManager - Comprehensive batch download system for playlists
 * 
 * Features:
 * - Entire playlist batch downloads
 * - Concurrent download management
 * - Real-time progress tracking
 * - Download queue prioritization
 * - Bandwidth management
 * - Resume/pause functionality
 * - Error handling and retries
 * - Download statistics and reporting
 */

class BatchDownloadManager {
    constructor() {
        this.downloads = new Map(); // Track individual downloads
        this.batchJobs = new Map(); // Track batch download jobs
        this.maxConcurrentDownloads = 3;
        this.activeDownloads = new Set();
        this.downloadQueue = [];
        this.statistics = {
            totalFiles: 0,
            completedFiles: 0,
            failedFiles: 0,
            totalBytes: 0,
            downloadedBytes: 0,
            averageSpeed: 0,
            estimatedTimeRemaining: 0
        };
        
        // Event handlers
        this.onProgress = null;
        this.onBatchComplete = null;
        this.onBatchError = null;
        this.onDownloadComplete = null;
        this.onDownloadError = null;
        this.onStatisticsUpdate = null;
        
        this.initializeBatchSystem();
    }

    /**
     * Initialize the batch download system
     */
    initializeBatchSystem() {
        this.setupDownloadDirectories();
        this.loadSavedProgress();
        console.log('Batch download system initialized');
    }

    /**
     * Setup download directories
     */
    async setupDownloadDirectories() {
        const fs = require('fs');
        const path = require('path');
        
        const downloadDir = path.join(process.cwd(), 'downloads');
        const batchDir = path.join(downloadDir, 'batch');
        const tempDir = path.join(downloadDir, 'temp');
        
        [downloadDir, batchDir, tempDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Load saved progress from previous sessions
     */
    loadSavedProgress() {
        try {
            const fs = require('fs');
            const path = require('path');
            const progressFile = path.join(process.cwd(), 'downloads', 'batch_progress.json');
            
            if (fs.existsSync(progressFile)) {
                const data = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
                this.batchJobs = new Map(data.batchJobs || []);
                this.downloadQueue = data.downloadQueue || [];
                console.log('Loaded saved batch progress');
            }
        } catch (error) {
            console.warn('Could not load saved progress:', error);
        }
    }

    /**
     * Save current progress
     */
    saveProgress() {
        try {
            const fs = require('fs');
            const path = require('path');
            const progressFile = path.join(process.cwd(), 'downloads', 'batch_progress.json');
            
            const data = {
                batchJobs: Array.from(this.batchJobs.entries()),
                downloadQueue: this.downloadQueue,
                timestamp: new Date().toISOString()
            };
            
            fs.writeFileSync(progressFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('Could not save progress:', error);
        }
    }

    /**
     * Start batch download for entire playlist
     */
    async startBatchDownload(playlistId, options = {}) {
        const batchId = this.generateBatchId();
        
        try {
            // Get playlist and videos
            const playlist = await this.getPlaylistData(playlistId);
            const videos = await this.getPlaylistVideos(playlistId);
            
            if (!videos || videos.length === 0) {
                throw new Error('No videos found in playlist');
            }

            // Create batch job
            const batchJob = {
                id: batchId,
                playlistId: playlistId,
                playlistTitle: playlist.title,
                videos: videos,
                options: {
                    quality: options.quality || 'best',
                    format: options.format || 'mp4',
                    audioOnly: options.audioOnly || false,
                    subtitles: options.subtitles || false,
                    downloadPath: options.downloadPath || this.getDefaultDownloadPath(playlist.title),
                    skipExisting: options.skipExisting !== false,
                    maxRetries: options.maxRetries || 3,
                    ...options
                },
                status: 'queued',
                progress: {
                    totalVideos: videos.length,
                    completedVideos: 0,
                    failedVideos: 0,
                    currentVideo: null,
                    overallProgress: 0,
                    downloadSpeed: 0,
                    estimatedTimeRemaining: 0
                },
                startTime: new Date(),
                endTime: null,
                errors: []
            };

            this.batchJobs.set(batchId, batchJob);
            
            // Queue individual downloads
            await this.queueBatchDownloads(batchJob);
            
            // Start processing queue
            this.processBatchQueue();
            
            this.saveProgress();
            
            console.log(`Batch download started: ${batchId} (${videos.length} videos)`);
            return batchId;
            
        } catch (error) {
            console.error('Failed to start batch download:', error);
            if (this.onBatchError) {
                this.onBatchError(batchId, error);
            }
            throw error;
        }
    }

    /**
     * Queue individual downloads for batch job
     */
    async queueBatchDownloads(batchJob) {
        const path = require('path');
        
        for (const [index, video] of batchJob.videos.entries()) {
            const downloadId = this.generateDownloadId();
            const outputPath = path.join(
                batchJob.options.downloadPath,
                this.sanitizeFilename(`${video.title}.${batchJob.options.format}`)
            );

            const downloadItem = {
                id: downloadId,
                batchId: batchJob.id,
                videoId: video.id,
                url: video.url,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
                outputPath: outputPath,
                options: batchJob.options,
                status: 'queued',
                progress: 0,
                downloadSpeed: 0,
                estimatedTime: 0,
                retryCount: 0,
                queuePosition: index + 1,
                error: null
            };

            // Skip if file already exists and skipExisting is enabled
            if (batchJob.options.skipExisting && await this.fileExists(outputPath)) {
                downloadItem.status = 'skipped';
                batchJob.progress.completedVideos++;
                console.log(`Skipping existing file: ${video.title}`);
            }

            this.downloads.set(downloadId, downloadItem);
            this.downloadQueue.push(downloadId);
        }
    }

    /**
     * Process the download queue
     */
    async processBatchQueue() {
        while (this.downloadQueue.length > 0 && this.activeDownloads.size < this.maxConcurrentDownloads) {
            const downloadId = this.downloadQueue.shift();
            const download = this.downloads.get(downloadId);
            
            if (!download || download.status !== 'queued') {
                continue;
            }

            this.activeDownloads.add(downloadId);
            this.startSingleDownload(download);
        }
    }

    /**
     * Start a single download within a batch
     */
    async startSingleDownload(download) {
        const batchJob = this.batchJobs.get(download.batchId);
        
        try {
            download.status = 'downloading';
            batchJob.progress.currentVideo = download.title;
            
            if (this.onProgress) {
                this.onProgress(download.batchId, this.calculateBatchProgress(batchJob));
            }

            // Use yt-dlp for download
            await this.downloadWithYtDlp(download);
            
            // Mark as completed
            download.status = 'completed';
            download.progress = 100;
            batchJob.progress.completedVideos++;
            
            if (this.onDownloadComplete) {
                this.onDownloadComplete(download.id, download);
            }
            
            console.log(`Download completed: ${download.title}`);
            
        } catch (error) {
            console.error(`Download failed: ${download.title}`, error);
            
            download.retryCount++;
            download.error = error.message;
            
            if (download.retryCount < download.options.maxRetries) {
                // Retry the download
                download.status = 'queued';
                this.downloadQueue.unshift(download.id);
                console.log(`Retrying download: ${download.title} (attempt ${download.retryCount + 1})`);
            } else {
                // Mark as failed
                download.status = 'failed';
                batchJob.progress.failedVideos++;
                batchJob.errors.push({
                    videoId: download.videoId,
                    title: download.title,
                    error: error.message,
                    timestamp: new Date()
                });
                
                if (this.onDownloadError) {
                    this.onDownloadError(download.id, error);
                }
            }
        } finally {
            this.activeDownloads.delete(download.id);
            
            // Update batch progress
            this.updateBatchProgress(batchJob);
            
            // Check if batch is complete
            if (this.isBatchComplete(batchJob)) {
                this.completeBatch(batchJob);
            } else {
                // Continue processing queue
                this.processBatchQueue();
            }
            
            this.saveProgress();
        }
    }

    /**
     * Download video using yt-dlp
     */
    async downloadWithYtDlp(download) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const path = require('path');
            
            // Build yt-dlp arguments
            const args = [
                download.url,
                '-o', download.outputPath,
                '--format', this.getFormatString(download.options),
                '--newline'
            ];

            // Add additional options
            if (download.options.subtitles) {
                args.push('--write-sub', '--sub-lang', 'en');
            }

            if (download.options.audioOnly) {
                args.push('--extract-audio', '--audio-format', 'mp3');
            }

            const ytdlp = spawn('yt-dlp', args);
            
            let stdout = '';
            let stderr = '';
            
            ytdlp.stdout.on('data', (data) => {
                stdout += data.toString();
                
                // Parse progress information
                const progress = this.parseYtDlpProgress(data.toString());
                if (progress) {
                    download.progress = progress.percent;
                    download.downloadSpeed = progress.speed;
                    download.estimatedTime = progress.eta;
                    
                    if (this.onProgress) {
                        const batchJob = this.batchJobs.get(download.batchId);
                        this.onProgress(download.batchId, this.calculateBatchProgress(batchJob));
                    }
                }
            });
            
            ytdlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            ytdlp.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
                }
            });
            
            ytdlp.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Parse yt-dlp progress output
     */
    parseYtDlpProgress(output) {
        const lines = output.split('\n');
        
        for (const line of lines) {
            const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
            const speedMatch = line.match(/(\d+(?:\.\d+)?)(MiB|KiB|B)\/s/);
            const etaMatch = line.match(/ETA (\d+:\d+)/);
            
            if (percentMatch) {
                return {
                    percent: parseFloat(percentMatch[1]),
                    speed: speedMatch ? this.parseSpeed(speedMatch[1], speedMatch[2]) : 0,
                    eta: etaMatch ? this.parseETA(etaMatch[1]) : 0
                };
            }
        }
        
        return null;
    }

    /**
     * Parse download speed
     */
    parseSpeed(value, unit) {
        const speed = parseFloat(value);
        switch (unit) {
            case 'MiB': return speed * 1024 * 1024;
            case 'KiB': return speed * 1024;
            case 'B': return speed;
            default: return speed;
        }
    }

    /**
     * Parse ETA time
     */
    parseETA(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
    }

    /**
     * Get format string for yt-dlp
     */
    getFormatString(options) {
        if (options.audioOnly) {
            return 'bestaudio';
        }
        
        const quality = options.quality;
        const format = options.format;
        
        if (quality === 'best') {
            return `best[ext=${format}]/best`;
        }
        
        // Specific quality
        return `best[height<=${quality.replace('p', '')}][ext=${format}]/best[height<=${quality.replace('p', '')}]/best`;
    }

    /**
     * Calculate batch progress
     */
    calculateBatchProgress(batchJob) {
        const totalVideos = batchJob.progress.totalVideos;
        const completedVideos = batchJob.progress.completedVideos;
        const failedVideos = batchJob.progress.failedVideos;
        
        // Calculate overall progress
        let overallProgress = 0;
        if (totalVideos > 0) {
            overallProgress = ((completedVideos + failedVideos) / totalVideos) * 100;
            
            // Add current download progress
            const currentDownload = this.getCurrentDownload(batchJob.id);
            if (currentDownload && currentDownload.status === 'downloading') {
                overallProgress += (currentDownload.progress / totalVideos);
            }
        }
        
        // Calculate average speed and ETA
        const activeDownloads = Array.from(this.activeDownloads)
            .map(id => this.downloads.get(id))
            .filter(d => d && d.batchId === batchJob.id && d.status === 'downloading');
        
        const totalSpeed = activeDownloads.reduce((sum, d) => sum + (d.downloadSpeed || 0), 0);
        const remainingVideos = totalVideos - completedVideos - failedVideos;
        const estimatedTime = remainingVideos > 0 && totalSpeed > 0 ? 
            (remainingVideos * 50 * 1024 * 1024) / totalSpeed : 0; // Rough estimate
        
        batchJob.progress.overallProgress = Math.min(100, Math.max(0, overallProgress));
        batchJob.progress.downloadSpeed = totalSpeed;
        batchJob.progress.estimatedTimeRemaining = estimatedTime;
        
        return {
            batchId: batchJob.id,
            playlistTitle: batchJob.playlistTitle,
            totalVideos: totalVideos,
            completedVideos: completedVideos,
            failedVideos: failedVideos,
            currentVideo: batchJob.progress.currentVideo,
            overallProgress: batchJob.progress.overallProgress,
            downloadSpeed: batchJob.progress.downloadSpeed,
            estimatedTimeRemaining: batchJob.progress.estimatedTimeRemaining,
            status: batchJob.status
        };
    }

    /**
     * Get current download for batch
     */
    getCurrentDownload(batchId) {
        return Array.from(this.downloads.values())
            .find(d => d.batchId === batchId && d.status === 'downloading');
    }

    /**
     * Update batch progress
     */
    updateBatchProgress(batchJob) {
        const progress = this.calculateBatchProgress(batchJob);
        
        if (this.onProgress) {
            this.onProgress(batchJob.id, progress);
        }
        
        // Update statistics
        this.updateStatistics();
    }

    /**
     * Check if batch is complete
     */
    isBatchComplete(batchJob) {
        const totalVideos = batchJob.progress.totalVideos;
        const completedVideos = batchJob.progress.completedVideos;
        const failedVideos = batchJob.progress.failedVideos;
        
        return (completedVideos + failedVideos) >= totalVideos;
    }

    /**
     * Complete batch download
     */
    completeBatch(batchJob) {
        batchJob.status = 'completed';
        batchJob.endTime = new Date();
        batchJob.progress.overallProgress = 100;
        
        const summary = {
            batchId: batchJob.id,
            playlistTitle: batchJob.playlistTitle,
            totalVideos: batchJob.progress.totalVideos,
            completedVideos: batchJob.progress.completedVideos,
            failedVideos: batchJob.progress.failedVideos,
            duration: batchJob.endTime - batchJob.startTime,
            errors: batchJob.errors
        };
        
        if (this.onBatchComplete) {
            this.onBatchComplete(batchJob.id, summary);
        }
        
        console.log(`Batch download completed: ${batchJob.id}`);
        console.log(`Summary: ${summary.completedVideos}/${summary.totalVideos} videos downloaded`);
        
        this.saveProgress();
    }

    /**
     * Update download statistics
     */
    updateStatistics() {
        const allDownloads = Array.from(this.downloads.values());
        
        this.statistics = {
            totalFiles: allDownloads.length,
            completedFiles: allDownloads.filter(d => d.status === 'completed').length,
            failedFiles: allDownloads.filter(d => d.status === 'failed').length,
            totalBytes: 0, // Would need file size info
            downloadedBytes: 0, // Would need progress tracking
            averageSpeed: this.calculateAverageSpeed(),
            estimatedTimeRemaining: this.calculateTotalETA()
        };
        
        if (this.onStatisticsUpdate) {
            this.onStatisticsUpdate(this.statistics);
        }
    }

    /**
     * Calculate average download speed
     */
    calculateAverageSpeed() {
        const activeDownloads = Array.from(this.activeDownloads)
            .map(id => this.downloads.get(id))
            .filter(d => d && d.status === 'downloading');
        
        if (activeDownloads.length === 0) return 0;
        
        const totalSpeed = activeDownloads.reduce((sum, d) => sum + (d.downloadSpeed || 0), 0);
        return totalSpeed / activeDownloads.length;
    }

    /**
     * Calculate total estimated time remaining
     */
    calculateTotalETA() {
        const queuedDownloads = this.downloadQueue.length;
        const averageSpeed = this.calculateAverageSpeed();
        
        if (queuedDownloads === 0 || averageSpeed === 0) return 0;
        
        // Rough estimate: 50MB average per video
        return (queuedDownloads * 50 * 1024 * 1024) / averageSpeed;
    }

    /**
     * Pause batch download
     */
    pauseBatch(batchId) {
        const batchJob = this.batchJobs.get(batchId);
        if (batchJob) {
            batchJob.status = 'paused';
            
            // Remove queued downloads from this batch
            this.downloadQueue = this.downloadQueue.filter(downloadId => {
                const download = this.downloads.get(downloadId);
                return !download || download.batchId !== batchId;
            });
            
            console.log(`Batch download paused: ${batchId}`);
        }
    }

    /**
     * Resume batch download
     */
    resumeBatch(batchId) {
        const batchJob = this.batchJobs.get(batchId);
        if (batchJob && batchJob.status === 'paused') {
            batchJob.status = 'downloading';
            
            // Re-queue remaining downloads
            const remainingDownloads = Array.from(this.downloads.values())
                .filter(d => d.batchId === batchId && d.status === 'queued')
                .map(d => d.id);
            
            this.downloadQueue.unshift(...remainingDownloads);
            this.processBatchQueue();
            
            console.log(`Batch download resumed: ${batchId}`);
        }
    }

    /**
     * Cancel batch download
     */
    cancelBatch(batchId) {
        const batchJob = this.batchJobs.get(batchId);
        if (batchJob) {
            batchJob.status = 'cancelled';
            
            // Remove all downloads for this batch
            this.downloadQueue = this.downloadQueue.filter(downloadId => {
                const download = this.downloads.get(downloadId);
                return !download || download.batchId !== batchId;
            });
            
            // Cancel active downloads
            Array.from(this.activeDownloads).forEach(downloadId => {
                const download = this.downloads.get(downloadId);
                if (download && download.batchId === batchId) {
                    this.activeDownloads.delete(downloadId);
                    download.status = 'cancelled';
                }
            });
            
            console.log(`Batch download cancelled: ${batchId}`);
        }
    }

    /**
     * Get batch status
     */
    getBatchStatus(batchId) {
        const batchJob = this.batchJobs.get(batchId);
        return batchJob ? this.calculateBatchProgress(batchJob) : null;
    }

    /**
     * Get all batch jobs
     */
    getAllBatches() {
        return Array.from(this.batchJobs.values()).map(batch => this.calculateBatchProgress(batch));
    }

    /**
     * Get playlist data
     */
    async getPlaylistData(playlistId) {
        // This would connect to the existing database
        const db = await this.getDatabase();
        const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
        return playlist;
    }

    /**
     * Get playlist videos
     */
    async getPlaylistVideos(playlistId) {
        // This would connect to the existing database
        const db = await this.getDatabase();
        const videos = db.prepare('SELECT * FROM videos WHERE playlist_id = ? ORDER BY position').all(playlistId);
        return videos;
    }

    /**
     * Get database connection
     */
    async getDatabase() {
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'playlist_manager.db');
        return new Database(dbPath);
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        const fs = require('fs');
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get default download path
     */
    getDefaultDownloadPath(playlistTitle) {
        const path = require('path');
        const sanitized = this.sanitizeFilename(playlistTitle);
        return path.join(process.cwd(), 'downloads', 'batch', sanitized);
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    }

    /**
     * Generate batch ID
     */
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate download ID
     */
    generateDownloadId() {
        return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set event handlers
     */
    setEventHandlers(handlers) {
        this.onProgress = handlers.onProgress;
        this.onBatchComplete = handlers.onBatchComplete;
        this.onBatchError = handlers.onBatchError;
        this.onDownloadComplete = handlers.onDownloadComplete;
        this.onDownloadError = handlers.onDownloadError;
        this.onStatisticsUpdate = handlers.onStatisticsUpdate;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.saveProgress();
        console.log('Batch download manager cleanup completed');
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchDownloadManager;
}
