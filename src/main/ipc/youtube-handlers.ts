import { ipcMain } from 'electron';
import { YouTubeService, ImportProgress } from '../services/youtube';
import { VideoFormat } from '../services/format-detection';

export class YouTubeIpcHandlers {
  private youtubeService: YouTubeService;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Validate YouTube URL
    ipcMain.handle('youtube:validate-url', async (_, url: string) => {
      try {
        return {
          success: true,
          isValid: this.youtubeService.validateUrl(url)
        };
      } catch (error) {
        console.error('YouTube URL validation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          isValid: false
        };
      }
    });

    // Import playlist from YouTube
    ipcMain.handle('youtube:import-playlist', async (_, url: string) => {
      try {
        // Set up progress callback to send updates to renderer
        this.youtubeService.setProgressCallback((progress: ImportProgress) => {
          // Find the sender window to send progress updates
          // Note: In a real implementation, you'd want to track which window made the request
          const { BrowserWindow } = require('electron');
          const allWindows = BrowserWindow.getAllWindows();
          allWindows.forEach((window: any) => {
            window.webContents.send('youtube:import-progress', progress);
          });
        });

        const playlistInfo = await this.youtubeService.getPlaylistInfo(url);
        
        return {
          success: true,
          playlist: playlistInfo
        };
      } catch (error) {
        console.error('YouTube playlist import error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Get video information
    ipcMain.handle('youtube:get-video-info', async (_, url: string) => {
      try {
        const videoInfo = await this.youtubeService.getVideoInfo(url);
        
        return {
          success: true,
          video: videoInfo
        };
      } catch (error) {
        console.error('YouTube video info error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Get available video formats
    ipcMain.handle('youtube:get-formats', async (_, url: string) => {
      try {
        const formats = await this.youtubeService.getAvailableFormats(url);
        
        return {
          success: true,
          formats: formats
        };
      } catch (error) {
        console.error('YouTube formats error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Get yt-dlp version
    ipcMain.handle('youtube:get-version', async () => {
      try {
        const version = await this.youtubeService.getVersion();
        
        return {
          success: true,
          version: version
        };
      } catch (error) {
        console.error('YouTube version error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          version: 'Unknown'
        };
      }
    });

    // Update yt-dlp
    ipcMain.handle('youtube:update', async () => {
      try {
        await this.youtubeService.updateYtDlp();
        
        return {
          success: true,
          message: 'yt-dlp updated successfully'
        };
      } catch (error) {
        console.error('YouTube update error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Get video formats for quality selection
    ipcMain.handle('get-video-formats', async (_, url: string) => {
      try {
        const formats = await this.youtubeService.getVideoFormats(url);
        return formats;
      } catch (error) {
        console.error('Get video formats error:', error);
        throw error;
      }
    });

    // Get video info for quality selection dialog
    ipcMain.handle('get-video-info', async (_, url: string) => {
      try {
        const videoInfo = await this.youtubeService.getVideoInfo(url);
        return videoInfo;
      } catch (error) {
        console.error('Get video info error:', error);
        throw error;
      }
    });

    // Get format display name
    ipcMain.handle('get-format-display-name', async (_, format: VideoFormat) => {
      try {
        return this.youtubeService.getFormatDisplayName(format);
      } catch (error) {
        console.error('Get format display name error:', error);
        return 'Unknown Format';
      }
    });

    // Generate format selector HTML
    ipcMain.handle('generate-format-selector', async (_, formats: VideoFormat[], selectedFormatId?: string) => {
      try {
        return this.youtubeService.generateFormatSelector(formats, selectedFormatId);
      } catch (error) {
        console.error('Generate format selector error:', error);
        return '<option value="">Error loading formats</option>';
      }
    });
  }

  // Method to set progress callback for specific window
  public setProgressCallbackForWindow(windowId: number): void {
    this.youtubeService.setProgressCallback((progress: ImportProgress) => {
      const window = require('electron').BrowserWindow.fromId(windowId);
      if (window && !window.isDestroyed()) {
        window.webContents.send('youtube:import-progress', progress);
      }
    });
  }
}
