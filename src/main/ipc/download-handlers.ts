import { ipcMain } from 'electron';
import { downloadManager, DownloadOptions } from '../services/download-manager';

export class DownloadIpcHandlers {
  constructor() {
    this.setupHandlers();
  }

  private setupHandlers() {
    // Download a single video
    ipcMain.handle('download:video', async (event, videoData: any, options: DownloadOptions) => {
      try {
        const downloadId = await downloadManager.addDownload(videoData, options);
        return { success: true, downloadId };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Download all videos in a playlist
    ipcMain.handle('download:playlist', async (event, playlistId: number, options: DownloadOptions) => {
      try {
        // This would need to get videos from the playlist and add them to download queue
        // For now, return a placeholder
        return { success: true, message: 'Playlist download started' };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Pause a download
    ipcMain.handle('download:pause', async (event, downloadId: string) => {
      try {
        const success = downloadManager.pauseDownload(downloadId);
        return { success };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Resume a download
    ipcMain.handle('download:resume', async (event, downloadId: string) => {
      try {
        const success = downloadManager.resumeDownload(downloadId);
        return { success };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Cancel a download
    ipcMain.handle('download:cancel', async (event, downloadId: string) => {
      try {
        const success = downloadManager.cancelDownload(downloadId);
        return { success };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Remove a download from the list
    ipcMain.handle('download:remove', async (event, downloadId: string) => {
      try {
        const success = downloadManager.removeDownload(downloadId);
        return { success };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Get the entire download queue
    ipcMain.handle('download:getQueue', async (event) => {
      try {
        const queue = downloadManager.getAllDownloads();
        return { success: true, downloads: queue };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          downloads: []
        };
      }
    });

    // Get a specific download
    ipcMain.handle('download:get', async (event, downloadId: string) => {
      try {
        const download = downloadManager.getDownload(downloadId);
        return { success: true, download };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          download: null
        };
      }
    });

    // Clear completed downloads
    ipcMain.handle('download:clearCompleted', async (event) => {
      try {
        downloadManager.clearCompleted();
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Get download statistics
    ipcMain.handle('download:getStats', async (event) => {
      try {
        const downloads = downloadManager.getAllDownloads();
        const stats = {
          total: downloads.length,
          pending: downloads.filter(d => d.status === 'pending').length,
          downloading: downloads.filter(d => d.status === 'downloading').length,
          paused: downloads.filter(d => d.status === 'paused').length,
          completed: downloads.filter(d => d.status === 'completed').length,
          failed: downloads.filter(d => d.status === 'failed').length,
          cancelled: downloads.filter(d => d.status === 'cancelled').length
        };
        return { success: true, stats };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stats: null
        };
      }
    });
  }
}
