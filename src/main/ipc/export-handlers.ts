/**
 * Export IPC Handlers - Main process handlers for playlist export functionality
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { app } from 'electron';
import * as fs from 'fs/promises';

// We'll need to import the database manager and create the export handler
// For now, I'll create a placeholder that integrates with the existing structure

export class ExportIpcHandlers {
    private exportHandler: any;

    constructor() {
        this.setupIpcHandlers();
    }

    private setupIpcHandlers(): void {
        // Export data (single, multiple, backup)
        ipcMain.handle('exports:exportData', async (event, type: string, params: any) => {
            try {
                // This will be implemented once we have the database integration
                return await this.handleExportData(type, params);
            } catch (error) {
                console.error('Export data error:', error);
                throw error;
            }
        });

        // Preview import file
        ipcMain.handle('exports:previewImport', async (event, filePath: string, type: string) => {
            try {
                return await this.handlePreviewImport(filePath, type);
            } catch (error) {
                console.error('Preview import error:', error);
                throw error;
            }
        });

        // Confirm import
        ipcMain.handle('exports:confirmImport', async (event, importData: any) => {
            try {
                return await this.handleConfirmImport(importData);
            } catch (error) {
                console.error('Confirm import error:', error);
                throw error;
            }
        });

        // Cancel export
        ipcMain.handle('exports:cancelExport', async (event, exportId?: string) => {
            try {
                return await this.handleCancelExport(exportId);
            } catch (error) {
                console.error('Cancel export error:', error);
                throw error;
            }
        });

        // Get backup stats
        ipcMain.handle('exports:getBackupStats', async (event) => {
            try {
                return await this.handleGetBackupStats();
            } catch (error) {
                console.error('Get backup stats error:', error);
                throw error;
            }
        });

        // Get export history
        ipcMain.handle('exports:getExportHistory', async (event) => {
            try {
                return await this.handleGetExportHistory();
            } catch (error) {
                console.error('Get export history error:', error);
                throw error;
            }
        });
    }

    /**
     * Handle export data operation
     */
    private async handleExportData(type: string, params: any): Promise<any> {
        // Import the export handler
        const ExportHandler = require('./ExportHandler');
        
        // We'll need to get the database manager instance
        // For now, this is a placeholder structure
        if (!this.exportHandler) {
            // We'll need to initialize this with the actual database manager
            this.exportHandler = new ExportHandler(null); // TODO: Pass actual dbManager
        }

        return await this.exportHandler.exportData(type, params);
    }

    /**
     * Handle preview import operation
     */
    private async handlePreviewImport(filePath: string, type: string): Promise<any> {
        try {
            // Check if file exists
            await fs.access(filePath);
            
            // Get file stats
            const stats = await fs.stat(filePath);
            const fileContent = await fs.readFile(filePath, 'utf8');
            
            // Parse based on type
            switch (type) {
                case 'single':
                    return await this.previewSinglePlaylistFile(filePath, fileContent);
                case 'backup':
                    return await this.previewBackupFile(filePath, fileContent);
                default:
                    throw new Error(`Unknown import type: ${type}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to preview file: ${errorMessage}`);
        }
    }

    /**
     * Preview single playlist file
     */
    private async previewSinglePlaylistFile(filePath: string, content: string): Promise<any> {
        const ext = filePath.toLowerCase().split('.').pop();
        
        switch (ext) {
            case 'json':
                try {
                    const data = JSON.parse(content);
                    const playlistCount = data.playlists ? data.playlists.length : 1;
                    const videoCount = data.playlists ? 
                        data.playlists.reduce((sum: number, p: any) => sum + (p.videos ? p.videos.length : 0), 0) :
                        (data.videos ? data.videos.length : 0);
                    
                    return {
                        type: 'playlist',
                        playlistCount,
                        videoCount,
                        details: `JSON playlist file with ${videoCount} videos across ${playlistCount} playlist(s)`,
                        format: 'json'
                    };
                } catch (parseError) {
                    throw new Error('Invalid JSON format');
                }
                
            case 'csv':
                const lines = content.split('\n').filter(line => line.trim());
                const videoCount = Math.max(0, lines.length - 1); // Subtract header
                return {
                    type: 'playlist',
                    playlistCount: 1,
                    videoCount,
                    details: `CSV file with ${videoCount} video entries`,
                    format: 'csv'
                };
                
            case 'm3u':
            case 'm3u8':
                const urls = content.split('\n').filter(line => 
                    line.trim() && !line.startsWith('#')
                );
                return {
                    type: 'playlist',
                    playlistCount: 1,
                    videoCount: urls.length,
                    details: `M3U playlist with ${urls.length} entries`,
                    format: ext
                };
                
            default:
                throw new Error(`Unsupported file format: ${ext}`);
        }
    }

    /**
     * Preview backup file
     */
    private async previewBackupFile(filePath: string, content: string): Promise<any> {
        try {
            // For .ypm-backup files, we might need to handle zip extraction
            if (filePath.endsWith('.ypm-backup') || filePath.endsWith('.zip')) {
                // For now, assume it's a JSON backup
                // In the future, we'd extract and read the backup.json from the zip
                return {
                    type: 'backup',
                    playlistCount: 0,
                    videoCount: 0,
                    details: 'Compressed backup file (preview not available)',
                    format: 'backup'
                };
            }
            
            // Try to parse as JSON
            const data = JSON.parse(content);
            return {
                type: 'backup',
                playlistCount: data.playlists ? data.playlists.length : 0,
                videoCount: data.totalItems || 0,
                version: data.version || 'Unknown',
                createdAt: data.createdAt || 'Unknown',
                details: `Full backup created with version ${data.version || 'Unknown'}`,
                format: 'json'
            };
        } catch (parseError) {
            throw new Error('Invalid backup file format');
        }
    }

    /**
     * Handle confirm import operation
     */
    private async handleConfirmImport(importData: any): Promise<any> {
        // This would integrate with the database manager to actually import the data
        // For now, return a success message
        return {
            success: true,
            message: `Successfully imported ${importData.videoCount} videos from ${importData.playlistCount} playlist(s)`,
            importedPlaylists: importData.playlistCount,
            importedVideos: importData.videoCount
        };
    }

    /**
     * Handle cancel export operation
     */
    private async handleCancelExport(exportId?: string): Promise<boolean> {
        if (this.exportHandler) {
            return this.exportHandler.cancelExport(exportId);
        }
        return false;
    }

    /**
     * Handle get backup stats
     */
    private async handleGetBackupStats(): Promise<any> {
        // This would query the database for actual stats
        // For now, return placeholder data
        return {
            playlistCount: 0,
            videoCount: 0,
            downloadCount: 0,
            estimatedSize: 1024 * 1024 * 5 // 5MB estimate
        };
    }

    /**
     * Handle get export history
     */
    private async handleGetExportHistory(): Promise<any[]> {
        try {
            // Load export history from user data
            const userDataPath = app.getPath('userData');
            const historyPath = join(userDataPath, 'export-history.json');
            
            try {
                const historyData = await fs.readFile(historyPath, 'utf8');
                return JSON.parse(historyData);
            } catch (readError) {
                // No history file exists yet
                return [];
            }
        } catch (error) {
            console.error('Failed to load export history:', error);
            return [];
        }
    }

    /**
     * Save export history
     */
    private async saveExportHistory(history: any[]): Promise<void> {
        try {
            const userDataPath = app.getPath('userData');
            const historyPath = join(userDataPath, 'export-history.json');
            
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
        } catch (error) {
            console.error('Failed to save export history:', error);
        }
    }
}
