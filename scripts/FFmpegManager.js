/**
 * FFmpegManager - Comprehensive video format conversion and media optimization
 * 
 * Features:
 * - Video format detection and analysis
 * - Multi-format conversion support
 * - Real-time conversion progress tracking
 * - Batch conversion queue management
 * - Media optimization presets
 * - Quality and compression controls
 * - Audio/video stream manipulation
 * - Metadata preservation and editing
 */

class FFmpegManager {
    constructor() {
        this.ffmpegPath = null;
        this.ffprobePath = null;
        this.conversionQueue = [];
        this.activeConversions = new Map();
        this.maxConcurrentConversions = 2;
        this.presets = this.initializePresets();
        this.supportedFormats = this.initializeSupportedFormats();
        
        // Event emitters for UI updates
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.onQueueUpdate = null;
        
        this.initializeFFmpeg();
    }

    /**
     * Initialize FFmpeg and FFprobe paths
     */
    async initializeFFmpeg() {
        try {
            // Check if FFmpeg is available in system PATH
            await this.checkFFmpegAvailability();
            
            // Initialize conversion directories
            await this.setupConversionDirectories();
            
            console.log('FFmpeg initialized successfully');
            return true;
        } catch (error) {
            console.error('FFmpeg initialization failed:', error);
            throw new Error('FFmpeg not available. Please install FFmpeg or ensure it\'s in your system PATH.');
        }
    }

    /**
     * Check FFmpeg availability
     */
    async checkFFmpegAvailability() {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            // Test FFmpeg
            const ffmpeg = spawn('ffmpeg', ['-version']);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    this.ffmpegPath = 'ffmpeg';
                    
                    // Test FFprobe
                    const ffprobe = spawn('ffprobe', ['-version']);
                    ffprobe.on('close', (probeCode) => {
                        if (probeCode === 0) {
                            this.ffprobePath = 'ffprobe';
                            resolve();
                        } else {
                            reject(new Error('FFprobe not found'));
                        }
                    });
                } else {
                    reject(new Error('FFmpeg not found'));
                }
            });
        });
    }

    /**
     * Setup conversion directories
     */
    async setupConversionDirectories() {
        const fs = require('fs');
        const path = require('path');
        
        const conversionsDir = path.join(process.cwd(), 'conversions');
        const tempDir = path.join(conversionsDir, 'temp');
        
        if (!fs.existsSync(conversionsDir)) {
            fs.mkdirSync(conversionsDir, { recursive: true });
        }
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    }

    /**
     * Initialize conversion presets
     */
    initializePresets() {
        return {
            // Video compression presets
            'high_quality': {
                name: 'High Quality',
                description: 'Best quality with larger file size',
                video: {
                    codec: 'libx264',
                    crf: 18,
                    preset: 'slow',
                    profile: 'high',
                    level: '4.1'
                },
                audio: {
                    codec: 'aac',
                    bitrate: '192k',
                    sampleRate: 48000
                }
            },
            'balanced': {
                name: 'Balanced',
                description: 'Good quality with reasonable file size',
                video: {
                    codec: 'libx264',
                    crf: 23,
                    preset: 'medium',
                    profile: 'high',
                    level: '4.0'
                },
                audio: {
                    codec: 'aac',
                    bitrate: '128k',
                    sampleRate: 44100
                }
            },
            'web_optimized': {
                name: 'Web Optimized',
                description: 'Optimized for web streaming',
                video: {
                    codec: 'libx264',
                    crf: 28,
                    preset: 'fast',
                    profile: 'baseline',
                    level: '3.1',
                    maxBitrate: '2000k',
                    bufferSize: '4000k'
                },
                audio: {
                    codec: 'aac',
                    bitrate: '96k',
                    sampleRate: 44100
                }
            },
            'mobile_friendly': {
                name: 'Mobile Friendly',
                description: 'Small file size for mobile devices',
                video: {
                    codec: 'libx264',
                    crf: 32,
                    preset: 'fast',
                    profile: 'baseline',
                    level: '3.0',
                    scale: '720:-2'
                },
                audio: {
                    codec: 'aac',
                    bitrate: '64k',
                    sampleRate: 22050
                }
            },
            'audio_only': {
                name: 'Audio Only',
                description: 'Extract audio from video',
                video: null,
                audio: {
                    codec: 'libmp3lame',
                    bitrate: '192k',
                    sampleRate: 44100
                }
            }
        };
    }

    /**
     * Initialize supported formats
     */
    initializeSupportedFormats() {
        return {
            video: {
                input: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts'],
                output: ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv']
            },
            audio: {
                input: ['.mp3', '.aac', '.wav', '.flac', '.ogg', '.m4a', '.wma'],
                output: ['.mp3', '.aac', '.wav', '.flac', '.ogg', '.m4a']
            }
        };
    }

    /**
     * Analyze video file metadata
     */
    async analyzeVideo(inputPath) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            const args = [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                inputPath
            ];
            
            const ffprobe = spawn(this.ffprobePath, args);
            let output = '';
            let error = '';
            
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ffprobe.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const metadata = JSON.parse(output);
                        const analysis = this.parseVideoMetadata(metadata);
                        resolve(analysis);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse video metadata: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`FFprobe failed: ${error}`));
                }
            });
        });
    }

    /**
     * Parse video metadata into structured format
     */
    parseVideoMetadata(metadata) {
        const format = metadata.format || {};
        const videoStream = metadata.streams?.find(s => s.codec_type === 'video') || {};
        const audioStream = metadata.streams?.find(s => s.codec_type === 'audio') || {};
        
        return {
            general: {
                filename: format.filename || '',
                format: format.format_name || 'unknown',
                duration: parseFloat(format.duration) || 0,
                size: parseInt(format.size) || 0,
                bitrate: parseInt(format.bit_rate) || 0
            },
            video: videoStream.codec_name ? {
                codec: videoStream.codec_name,
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                frameRate: this.parseFrameRate(videoStream.r_frame_rate),
                bitrate: parseInt(videoStream.bit_rate) || 0,
                pixelFormat: videoStream.pix_fmt || 'unknown',
                profile: videoStream.profile || 'unknown',
                level: videoStream.level || 'unknown'
            } : null,
            audio: audioStream.codec_name ? {
                codec: audioStream.codec_name,
                sampleRate: parseInt(audioStream.sample_rate) || 0,
                channels: audioStream.channels || 0,
                bitrate: parseInt(audioStream.bit_rate) || 0,
                channelLayout: audioStream.channel_layout || 'unknown'
            } : null,
            metadata: format.tags || {}
        };
    }

    /**
     * Parse frame rate from FFmpeg format
     */
    parseFrameRate(frameRateStr) {
        if (!frameRateStr) return 0;
        
        const parts = frameRateStr.split('/');
        if (parts.length === 2) {
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        return parseFloat(frameRateStr);
    }

    /**
     * Add conversion to queue
     */
    addToQueue(conversionConfig) {
        const conversionId = this.generateConversionId();
        
        const queueItem = {
            id: conversionId,
            inputPath: conversionConfig.inputPath,
            outputPath: conversionConfig.outputPath,
            preset: conversionConfig.preset || 'balanced',
            customOptions: conversionConfig.customOptions || {},
            status: 'queued',
            progress: 0,
            createdAt: new Date(),
            estimatedDuration: 0,
            actualDuration: 0
        };
        
        this.conversionQueue.push(queueItem);
        
        if (this.onQueueUpdate) {
            this.onQueueUpdate(this.getQueueStatus());
        }
        
        // Start processing if not at max capacity
        this.processQueue();
        
        return conversionId;
    }

    /**
     * Process conversion queue
     */
    async processQueue() {
        if (this.activeConversions.size >= this.maxConcurrentConversions) {
            return;
        }
        
        const nextItem = this.conversionQueue.find(item => item.status === 'queued');
        if (!nextItem) {
            return;
        }
        
        nextItem.status = 'processing';
        this.activeConversions.set(nextItem.id, nextItem);
        
        try {
            await this.convertVideo(nextItem);
        } catch (error) {
            console.error(`Conversion failed for ${nextItem.id}:`, error);
            nextItem.status = 'failed';
            nextItem.error = error.message;
            
            if (this.onError) {
                this.onError(nextItem.id, error);
            }
        } finally {
            this.activeConversions.delete(nextItem.id);
            
            // Remove completed item from queue
            const queueIndex = this.conversionQueue.findIndex(item => item.id === nextItem.id);
            if (queueIndex >= 0) {
                this.conversionQueue.splice(queueIndex, 1);
            }
            
            if (this.onQueueUpdate) {
                this.onQueueUpdate(this.getQueueStatus());
            }
            
            // Process next item in queue
            setTimeout(() => this.processQueue(), 100);
        }
    }

    /**
     * Convert video with specified configuration
     */
    async convertVideo(queueItem) {
        const { spawn } = require('child_process');
        const path = require('path');
        
        const preset = this.presets[queueItem.preset];
        if (!preset) {
            throw new Error(`Unknown preset: ${queueItem.preset}`);
        }
        
        // Build FFmpeg arguments
        const args = this.buildFFmpegArgs(queueItem, preset);
        
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, args);
            
            let stderr = '';
            const startTime = Date.now();
            
            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
                
                // Parse progress information
                const progress = this.parseProgress(stderr, queueItem);
                if (progress && this.onProgress) {
                    this.onProgress(queueItem.id, progress);
                }
            });
            
            ffmpeg.on('close', (code) => {
                const endTime = Date.now();
                queueItem.actualDuration = endTime - startTime;
                
                if (code === 0) {
                    queueItem.status = 'completed';
                    queueItem.progress = 100;
                    
                    if (this.onComplete) {
                        this.onComplete(queueItem.id, queueItem.outputPath);
                    }
                    
                    resolve(queueItem);
                } else {
                    queueItem.status = 'failed';
                    reject(new Error(`FFmpeg conversion failed with code ${code}: ${stderr}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                queueItem.status = 'failed';
                reject(error);
            });
        });
    }

    /**
     * Build FFmpeg arguments for conversion
     */
    buildFFmpegArgs(queueItem, preset) {
        const args = ['-i', queueItem.inputPath];
        
        // Video codec and settings
        if (preset.video) {
            args.push('-c:v', preset.video.codec);
            
            if (preset.video.crf !== undefined) {
                args.push('-crf', preset.video.crf.toString());
            }
            
            if (preset.video.preset) {
                args.push('-preset', preset.video.preset);
            }
            
            if (preset.video.profile) {
                args.push('-profile:v', preset.video.profile);
            }
            
            if (preset.video.level) {
                args.push('-level', preset.video.level);
            }
            
            if (preset.video.maxBitrate) {
                args.push('-maxrate', preset.video.maxBitrate);
            }
            
            if (preset.video.bufferSize) {
                args.push('-bufsize', preset.video.bufferSize);
            }
            
            if (preset.video.scale) {
                args.push('-vf', `scale=${preset.video.scale}`);
            }
        } else {
            // No video (audio only)
            args.push('-vn');
        }
        
        // Audio codec and settings
        if (preset.audio) {
            args.push('-c:a', preset.audio.codec);
            
            if (preset.audio.bitrate) {
                args.push('-b:a', preset.audio.bitrate);
            }
            
            if (preset.audio.sampleRate) {
                args.push('-ar', preset.audio.sampleRate.toString());
            }
        } else {
            // No audio
            args.push('-an');
        }
        
        // Custom options from queue item
        if (queueItem.customOptions) {
            Object.entries(queueItem.customOptions).forEach(([key, value]) => {
                args.push(`-${key}`, value.toString());
            });
        }
        
        // Progress reporting
        args.push('-progress', 'pipe:2');
        
        // Overwrite output files
        args.push('-y');
        
        // Output file
        args.push(queueItem.outputPath);
        
        return args;
    }

    /**
     * Parse FFmpeg progress output
     */
    parseProgress(stderr, queueItem) {
        const lines = stderr.split('\n');
        let currentTime = 0;
        let totalDuration = queueItem.estimatedDuration || 0;
        
        for (const line of lines) {
            if (line.startsWith('out_time=')) {
                const timeStr = line.split('=')[1];
                currentTime = this.parseTimeToSeconds(timeStr);
            } else if (line.startsWith('total_size=')) {
                // Could be used for file size progress
            }
        }
        
        if (totalDuration > 0 && currentTime > 0) {
            const progress = Math.min(100, (currentTime / totalDuration) * 100);
            queueItem.progress = progress;
            
            return {
                progress: progress,
                currentTime: currentTime,
                totalDuration: totalDuration,
                remainingTime: totalDuration - currentTime
            };
        }
        
        return null;
    }

    /**
     * Parse time string to seconds
     */
    parseTimeToSeconds(timeStr) {
        if (!timeStr) return 0;
        
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        }
        
        return parseFloat(timeStr) || 0;
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            total: this.conversionQueue.length,
            queued: this.conversionQueue.filter(item => item.status === 'queued').length,
            processing: this.conversionQueue.filter(item => item.status === 'processing').length,
            completed: this.conversionQueue.filter(item => item.status === 'completed').length,
            failed: this.conversionQueue.filter(item => item.status === 'failed').length,
            active: Array.from(this.activeConversions.values())
        };
    }

    /**
     * Cancel conversion
     */
    cancelConversion(conversionId) {
        const queueItem = this.conversionQueue.find(item => item.id === conversionId);
        if (queueItem && queueItem.status === 'queued') {
            queueItem.status = 'cancelled';
            const index = this.conversionQueue.findIndex(item => item.id === conversionId);
            if (index >= 0) {
                this.conversionQueue.splice(index, 1);
            }
            
            if (this.onQueueUpdate) {
                this.onQueueUpdate(this.getQueueStatus());
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Get conversion info
     */
    getConversionInfo(conversionId) {
        const queueItem = this.conversionQueue.find(item => item.id === conversionId);
        const activeItem = this.activeConversions.get(conversionId);
        
        return queueItem || activeItem || null;
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Object.entries(this.presets).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            description: preset.description
        }));
    }

    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return this.supportedFormats;
    }

    /**
     * Generate unique conversion ID
     */
    generateConversionId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Estimate conversion duration based on input file
     */
    async estimateConversionDuration(inputPath, preset) {
        try {
            const analysis = await this.analyzeVideo(inputPath);
            const presetConfig = this.presets[preset];
            
            if (!analysis.general.duration || !presetConfig) {
                return 0;
            }
            
            // Rough estimation based on preset complexity
            let complexityMultiplier = 1;
            
            if (presetConfig.video) {
                if (presetConfig.video.preset === 'slow') complexityMultiplier *= 2;
                if (presetConfig.video.preset === 'veryslow') complexityMultiplier *= 4;
                if (presetConfig.video.crf < 20) complexityMultiplier *= 1.5;
            }
            
            // Base estimation: 1x for simple conversions
            return analysis.general.duration * complexityMultiplier;
        } catch (error) {
            console.warn('Could not estimate conversion duration:', error);
            return 0;
        }
    }

    /**
     * Batch convert multiple files
     */
    async batchConvert(files, preset, outputDirectory) {
        const path = require('path');
        const conversions = [];
        
        for (const inputFile of files) {
            const inputPath = inputFile.path || inputFile;
            const inputName = path.basename(inputPath, path.extname(inputPath));
            const outputExtension = this.getOutputExtension(preset);
            const outputPath = path.join(outputDirectory, `${inputName}_converted${outputExtension}`);
            
            const conversionId = this.addToQueue({
                inputPath,
                outputPath,
                preset
            });
            
            conversions.push(conversionId);
        }
        
        return conversions;
    }

    /**
     * Get output extension for preset
     */
    getOutputExtension(presetName) {
        const preset = this.presets[presetName];
        
        if (!preset.video && preset.audio) {
            // Audio only
            if (preset.audio.codec === 'libmp3lame') return '.mp3';
            if (preset.audio.codec === 'aac') return '.m4a';
            if (preset.audio.codec === 'libvorbis') return '.ogg';
            return '.mp3'; // default
        }
        
        // Video formats
        return '.mp4'; // default for most video presets
    }

    /**
     * Clean up temporary files
     */
    async cleanup() {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const tempDir = path.join(process.cwd(), 'conversions', 'temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(tempDir, file));
                }
            }
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }

    /**
     * Set event handlers
     */
    setEventHandlers({ onProgress, onComplete, onError, onQueueUpdate }) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.onError = onError;
        this.onQueueUpdate = onQueueUpdate;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FFmpegManager;
}
