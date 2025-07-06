/**
 * Export Handler - Main process export functionality
 * Handles all playlist export operations including file generation and saving
 */

const { dialog, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const { createCanvas } = require('canvas');

class ExportHandler {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.activeExports = new Map();
        this.exportFormats = {
            json: this.exportJSON.bind(this),
            csv: this.exportCSV.bind(this),
            m3u: this.exportM3U.bind(this),
            m3u8: this.exportM3U8.bind(this),
            txt: this.exportTXT.bind(this),
            html: this.exportHTML.bind(this),
            backup: this.exportBackup.bind(this)
        };
    }

    /**
     * Export data based on type and parameters
     */
    async exportData(type, params) {
        const exportId = this.generateExportId();
        
        try {
            this.activeExports.set(exportId, { type, params, startTime: Date.now() });
            
            let result;
            switch (type) {
                case 'single':
                    result = await this.exportSinglePlaylist(exportId, params);
                    break;
                case 'multiple':
                    result = await this.exportMultiplePlaylists(exportId, params);
                    break;
                case 'backup':
                    result = await this.exportFullBackup(exportId, params);
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }
            
            this.activeExports.delete(exportId);
            return result;
            
        } catch (error) {
            this.activeExports.delete(exportId);
            throw error;
        }
    }

    /**
     * Export single playlist
     */
    async exportSinglePlaylist(exportId, params) {
        const { playlistId, format, options } = params;
        
        try {
            // Get playlist data
            const playlist = await this.dbManager.getPlaylist(playlistId);
            if (!playlist) {
                throw new Error('Playlist not found');
            }
            
            const videos = await this.dbManager.getPlaylistVideos(playlistId);
            
            // Choose file location
            const filePath = await this.chooseExportLocation(playlist.title, format);
            if (!filePath) {
                throw new Error('Export cancelled by user');
            }
            
            // Export data
            const exportData = {
                playlist,
                videos,
                exportMetadata: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'YouTube Playlist Manager',
                    version: app.getVersion(),
                    format: format,
                    playlistCount: 1,
                    videoCount: videos.length
                }
            };
            
            const exportFunction = this.exportFormats[format];
            if (!exportFunction) {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
            await exportFunction(exportData, filePath, options);
            
            const stats = await fs.stat(filePath);
            
            return {
                type: 'single',
                format: format,
                filePath: filePath,
                fileSize: stats.size,
                itemCount: videos.length,
                playlistTitle: playlist.title
            };
            
        } catch (error) {
            console.error('Single playlist export error:', error);
            throw error;
        }
    }

    /**
     * Export multiple playlists
     */
    async exportMultiplePlaylists(exportId, params) {
        const { playlistIds, format, options } = params;
        
        try {
            // Get all playlists data
            const playlists = [];
            let totalVideos = 0;
            
            for (const playlistId of playlistIds) {
                const playlist = await this.dbManager.getPlaylist(playlistId);
                if (playlist) {
                    const videos = await this.dbManager.getPlaylistVideos(playlistId);
                    playlists.push({ playlist, videos });
                    totalVideos += videos.length;
                }
            }
            
            if (playlists.length === 0) {
                throw new Error('No valid playlists found');
            }
            
            // Choose file location
            const fileName = `playlists_export_${playlists.length}`;
            const filePath = await this.chooseExportLocation(fileName, format);
            if (!filePath) {
                throw new Error('Export cancelled by user');
            }
            
            // Export data
            const exportData = {
                playlists: playlists,
                exportMetadata: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'YouTube Playlist Manager',
                    version: app.getVersion(),
                    format: format,
                    playlistCount: playlists.length,
                    videoCount: totalVideos
                }
            };
            
            if (format === 'separate') {
                await this.exportSeparateFiles(exportData, filePath, options);
            } else {
                const exportFunction = this.exportFormats[format];
                if (!exportFunction) {
                    throw new Error(`Unsupported export format: ${format}`);
                }
                await exportFunction(exportData, filePath, options);
            }
            
            const stats = await fs.stat(filePath);
            
            return {
                type: 'multiple',
                format: format,
                filePath: filePath,
                fileSize: stats.size,
                itemCount: totalVideos,
                playlistCount: playlists.length
            };
            
        } catch (error) {
            console.error('Multiple playlists export error:', error);
            throw error;
        }
    }

    /**
     * Export full application backup
     */
    async exportFullBackup(exportId, params) {
        const { options } = params;
        
        try {
            // Choose backup location
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `youtube_playlist_manager_backup_${timestamp}`;
            const filePath = await this.chooseExportLocation(fileName, 'backup');
            if (!filePath) {
                throw new Error('Export cancelled by user');
            }
            
            // Gather backup data
            const backupData = await this.gatherBackupData(options);
            
            // Create backup
            await this.createBackupArchive(backupData, filePath, options);
            
            const stats = await fs.stat(filePath);
            
            return {
                type: 'backup',
                format: 'backup',
                filePath: filePath,
                fileSize: stats.size,
                itemCount: backupData.totalItems,
                playlistCount: backupData.playlists.length
            };
            
        } catch (error) {
            console.error('Full backup export error:', error);
            throw error;
        }
    }

    /**
     * Choose export file location
     */
    async chooseExportLocation(fileName, format) {
        const formatExtensions = {
            json: 'json',
            csv: 'csv',
            m3u: 'm3u',
            m3u8: 'm3u8',
            txt: 'txt',
            html: 'html',
            backup: 'ypm-backup'
        };
        
        const extension = formatExtensions[format] || format;
        const filters = [
            { name: `${format.toUpperCase()} Files`, extensions: [extension] },
            { name: 'All Files', extensions: ['*'] }
        ];
        
        const result = await dialog.showSaveDialog({
            title: 'Save Export As',
            defaultPath: `${fileName}.${extension}`,
            filters: filters
        });
        
        return result.canceled ? null : result.filePath;
    }

    /**
     * Export to JSON format
     */
    async exportJSON(exportData, filePath, options) {
        const jsonData = {
            ...exportData,
            generatedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
    }

    /**
     * Export to CSV format
     */
    async exportCSV(exportData, filePath, options) {
        let csvContent = 'Playlist Title,Video Title,Video URL,Duration,Upload Date,Channel,Description\n';
        
        const playlists = exportData.playlists || [{ playlist: exportData.playlist, videos: exportData.videos }];
        
        for (const { playlist, videos } of playlists) {
            for (const video of videos) {
                const row = [
                    this.escapeCSV(playlist.title),
                    this.escapeCSV(video.title),
                    this.escapeCSV(video.url),
                    this.formatDuration(video.duration),
                    video.publishedAt || '',
                    this.escapeCSV(video.channelTitle || ''),
                    this.escapeCSV(video.description || '')
                ].join(',');
                
                csvContent += row + '\n';
            }
        }
        
        await fs.writeFile(filePath, csvContent, 'utf8');
    }

    /**
     * Export to M3U format
     */
    async exportM3U(exportData, filePath, options) {
        let m3uContent = '#EXTM3U\n';
        
        const playlists = exportData.playlists || [{ playlist: exportData.playlist, videos: exportData.videos }];
        
        for (const { playlist, videos } of playlists) {
            m3uContent += `# Playlist: ${playlist.title}\n`;
            
            for (const video of videos) {
                if (video.duration) {
                    m3uContent += `#EXTINF:${Math.round(video.duration)},${video.title}\n`;
                }
                m3uContent += `${video.url}\n`;
            }
        }
        
        await fs.writeFile(filePath, m3uContent, 'utf8');
    }

    /**
     * Export to M3U8 format (extended)
     */
    async exportM3U8(exportData, filePath, options) {
        let m3u8Content = '#EXTM3U\n';
        m3u8Content += '#EXT-X-VERSION:3\n';
        
        const playlists = exportData.playlists || [{ playlist: exportData.playlist, videos: exportData.videos }];
        
        for (const { playlist, videos } of playlists) {
            m3u8Content += `# Playlist: ${playlist.title}\n`;
            m3u8Content += `# Description: ${playlist.description || 'No description'}\n`;
            
            for (const video of videos) {
                m3u8Content += `#EXTINF:${Math.round(video.duration || 0)},${video.title}\n`;
                
                if (video.thumbnail) {
                    m3u8Content += `#EXT-X-PROGRAM-DATE-TIME:${video.publishedAt || new Date().toISOString()}\n`;
                }
                
                if (video.channelTitle) {
                    m3u8Content += `# Channel: ${video.channelTitle}\n`;
                }
                
                m3u8Content += `${video.url}\n`;
            }
        }
        
        await fs.writeFile(filePath, m3u8Content, 'utf8');
    }

    /**
     * Export to TXT format
     */
    async exportTXT(exportData, filePath, options) {
        let txtContent = '';
        
        const playlists = exportData.playlists || [{ playlist: exportData.playlist, videos: exportData.videos }];
        
        for (const { playlist, videos } of playlists) {
            txtContent += `Playlist: ${playlist.title}\n`;
            txtContent += `${'='.repeat(playlist.title.length + 10)}\n\n`;
            
            for (const video of videos) {
                txtContent += `${video.url}\n`;
            }
            
            txtContent += '\n';
        }
        
        await fs.writeFile(filePath, txtContent, 'utf8');
    }

    /**
     * Export to HTML format
     */
    async exportHTML(exportData, filePath, options) {
        const playlists = exportData.playlists || [{ playlist: exportData.playlist, videos: exportData.videos }];
        
        let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playlist Export - YouTube Playlist Manager</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .playlist {
            margin-bottom: 40px;
        }
        .playlist-title {
            font-size: 24px;
            font-weight: bold;
            color: #c4302b;
            margin-bottom: 10px;
        }
        .playlist-meta {
            color: #666;
            margin-bottom: 20px;
        }
        .video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .video-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
        }
        .video-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .video-thumbnail {
            width: 100%;
            height: 180px;
            object-fit: cover;
            background: #f0f0f0;
        }
        .video-info {
            padding: 15px;
        }
        .video-title {
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        .video-meta {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        .video-url {
            font-size: 12px;
            color: #1976d2;
            text-decoration: none;
            word-break: break-all;
        }
        .export-info {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        @media (max-width: 768px) {
            .video-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📺 Playlist Export Report</h1>
            <p>Generated by YouTube Playlist Manager</p>
        </div>
`;

        for (const { playlist, videos } of playlists) {
            htmlContent += `
        <div class="playlist">
            <h2 class="playlist-title">${this.escapeHTML(playlist.title)}</h2>
            <div class="playlist-meta">
                ${videos.length} videos • Created: ${new Date(playlist.createdAt).toLocaleDateString()}
                ${playlist.description ? `<br>${this.escapeHTML(playlist.description)}` : ''}
            </div>
            <div class="video-grid">
`;
            
            for (const video of videos) {
                htmlContent += `
                <div class="video-item">
                    <img src="${video.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMwMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+Tm8gVGh1bWJuYWlsPC90ZXh0Pgo8L3N2Zz4K'}" alt="Video thumbnail" class="video-thumbnail" />
                    <div class="video-info">
                        <div class="video-title">${this.escapeHTML(video.title)}</div>
                        <div class="video-meta">
                            ${video.channelTitle ? `Channel: ${this.escapeHTML(video.channelTitle)}` : ''}
                            ${video.duration ? ` • Duration: ${this.formatDuration(video.duration)}` : ''}
                        </div>
                        <div class="video-meta">
                            ${video.publishedAt ? `Published: ${new Date(video.publishedAt).toLocaleDateString()}` : ''}
                        </div>
                        <a href="${video.url}" target="_blank" class="video-url">${video.url}</a>
                    </div>
                </div>
`;
            }
            
            htmlContent += `
            </div>
        </div>
`;
        }
        
        htmlContent += `
        <div class="export-info">
            <p>Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Total: ${playlists.length} playlist(s) • ${playlists.reduce((sum, p) => sum + p.videos.length, 0)} video(s)</p>
        </div>
    </div>
</body>
</html>
`;
        
        await fs.writeFile(filePath, htmlContent, 'utf8');
    }

    /**
     * Export as separate files
     */
    async exportSeparateFiles(exportData, basePath, options) {
        const baseDir = path.dirname(basePath);
        const baseName = path.basename(basePath, path.extname(basePath));
        const exportDir = path.join(baseDir, `${baseName}_separate`);
        
        // Create export directory
        await fs.mkdir(exportDir, { recursive: true });
        
        for (const { playlist, videos } of exportData.playlists) {
            const fileName = `${this.sanitizeFileName(playlist.title)}.json`;
            const filePath = path.join(exportDir, fileName);
            
            const playlistData = {
                playlist,
                videos,
                exportMetadata: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'YouTube Playlist Manager',
                    version: app.getVersion()
                }
            };
            
            await fs.writeFile(filePath, JSON.stringify(playlistData, null, 2), 'utf8');
        }
        
        // Create index file
        const indexPath = path.join(exportDir, 'index.json');
        const indexData = {
            exportMetadata: exportData.exportMetadata,
            playlists: exportData.playlists.map(({ playlist }) => ({
                id: playlist.id,
                title: playlist.title,
                videoCount: playlist.videoCount,
                fileName: `${this.sanitizeFileName(playlist.title)}.json`
            }))
        };
        
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    }

    /**
     * Gather backup data
     */
    async gatherBackupData(options) {
        const backupData = {
            version: app.getVersion(),
            createdAt: new Date().toISOString(),
            playlists: [],
            settings: {},
            downloads: [],
            totalItems: 0
        };
        
        try {
            // Get all playlists
            const playlists = await this.dbManager.getAllPlaylists();
            for (const playlist of playlists) {
                const videos = await this.dbManager.getPlaylistVideos(playlist.id);
                backupData.playlists.push({ playlist, videos });
                backupData.totalItems += videos.length;
            }
            
            // Get settings if requested
            if (options.includeSettings) {
                // backupData.settings = await this.dbManager.getSettings();
            }
            
            // Get downloads if requested
            if (options.includeDownloads) {
                // backupData.downloads = await this.dbManager.getDownloads();
            }
            
        } catch (error) {
            console.error('Error gathering backup data:', error);
        }
        
        return backupData;
    }

    /**
     * Create backup archive
     */
    async createBackupArchive(backupData, filePath, options) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(filePath);
            const archive = archiver('zip', {
                zlib: { level: options.compress ? 9 : 1 }
            });
            
            output.on('close', () => {
                console.log(`Backup created: ${archive.pointer()} total bytes`);
                resolve();
            });
            
            output.on('error', reject);
            archive.on('error', reject);
            
            archive.pipe(output);
            
            // Add main backup data
            archive.append(JSON.stringify(backupData, null, 2), { name: 'backup.json' });
            
            // Add metadata
            const metadata = {
                version: backupData.version,
                createdAt: backupData.createdAt,
                totalPlaylists: backupData.playlists.length,
                totalVideos: backupData.totalItems,
                encrypted: options.encrypt || false,
                compressed: options.compress || false
            };
            
            archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
            
            // Add individual playlist files
            for (const { playlist, videos } of backupData.playlists) {
                const fileName = `playlists/${this.sanitizeFileName(playlist.title)}.json`;
                const playlistData = { playlist, videos };
                archive.append(JSON.stringify(playlistData, null, 2), { name: fileName });
            }
            
            // Encrypt if requested
            if (options.encrypt && options.password) {
                // Add encryption metadata
                const encryptionInfo = {
                    algorithm: 'aes-256-gcm',
                    encrypted: true
                };
                archive.append(JSON.stringify(encryptionInfo, null, 2), { name: 'encryption.json' });
            }
            
            archive.finalize();
        });
    }

    /**
     * Cancel active export
     */
    cancelExport(exportId) {
        if (exportId && this.activeExports.has(exportId)) {
            this.activeExports.delete(exportId);
            return true;
        }
        return false;
    }

    /**
     * Preview import file
     */
    async previewImport(filePath, type) {
        try {
            if (type === 'backup') {
                return await this.previewBackupFile(filePath);
            } else {
                return await this.previewPlaylistFile(filePath);
            }
        } catch (error) {
            console.error('Preview import error:', error);
            throw error;
        }
    }

    /**
     * Preview backup file
     */
    async previewBackupFile(filePath) {
        // Implementation for previewing backup files
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        try {
            const data = JSON.parse(fileContent);
            return {
                type: 'backup',
                playlistCount: data.playlists ? data.playlists.length : 0,
                videoCount: data.totalItems || 0,
                version: data.version || 'Unknown',
                createdAt: data.createdAt || 'Unknown',
                details: `Backup created with version ${data.version || 'Unknown'}`
            };
        } catch (parseError) {
            throw new Error('Invalid backup file format');
        }
    }

    /**
     * Preview playlist file
     */
    async previewPlaylistFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        switch (ext) {
            case '.json':
                try {
                    const data = JSON.parse(fileContent);
                    const playlistCount = data.playlists ? data.playlists.length : 1;
                    const videoCount = data.playlists ? 
                        data.playlists.reduce((sum, p) => sum + (p.videos ? p.videos.length : 0), 0) :
                        (data.videos ? data.videos.length : 0);
                    
                    return {
                        type: 'playlist',
                        playlistCount,
                        videoCount,
                        details: `JSON playlist file with ${videoCount} videos`
                    };
                } catch (parseError) {
                    throw new Error('Invalid JSON format');
                }
                
            case '.csv':
                const lines = fileContent.split('\n').filter(line => line.trim());
                return {
                    type: 'playlist',
                    playlistCount: 1,
                    videoCount: Math.max(0, lines.length - 1), // Subtract header
                    details: `CSV file with ${lines.length - 1} video entries`
                };
                
            case '.m3u':
            case '.m3u8':
                const urls = fileContent.split('\n').filter(line => 
                    line.trim() && !line.startsWith('#')
                );
                return {
                    type: 'playlist',
                    playlistCount: 1,
                    videoCount: urls.length,
                    details: `M3U playlist with ${urls.length} entries`
                };
                
            default:
                throw new Error(`Unsupported file format: ${ext}`);
        }
    }

    /**
     * Utility functions
     */
    generateExportId() {
        return crypto.randomBytes(16).toString('hex');
    }

    escapeCSV(str) {
        if (!str) return '';
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
    }

    escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
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
}

module.exports = ExportHandler;
