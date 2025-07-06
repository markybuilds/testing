import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { app, BrowserWindow } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { EventEmitter } from 'events';

export interface DownloadItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string | undefined;
  duration?: string | undefined;
  fileSize?: number | undefined;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed?: string | undefined;
  eta?: string | undefined;
  filePath?: string | undefined;
  quality: string;
  format: string;
  playlistId?: number | undefined;
  addedAt: Date;
  startedAt?: Date | undefined;
  completedAt?: Date | undefined;
  error?: string | undefined;
}

export interface DownloadOptions {
  quality: string;
  format: string;
  outputPath?: string;
  audioOnly?: boolean;
}

export class DownloadManager extends EventEmitter {
  private downloads: Map<string, DownloadItem> = new Map();
  private activeDownloads: Map<string, ChildProcess> = new Map();
  private queue: string[] = [];
  private maxConcurrentDownloads = 3;
  private currentDownloads = 0;
  private defaultDownloadPath: string;

  constructor() {
    super();
    this.defaultDownloadPath = join(app.getPath('downloads'), 'YouTube Playlists');
    this.ensureDownloadDirectory();
  }

  private ensureDownloadDirectory() {
    if (!existsSync(this.defaultDownloadPath)) {
      mkdirSync(this.defaultDownloadPath, { recursive: true });
    }
  }

  async addDownload(
    videoData: { id: string; title: string; url: string; thumbnail?: string; duration?: string; playlistId?: number },
    options: DownloadOptions
  ): Promise<string> {
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const downloadItem: DownloadItem = {
      id: downloadId,
      title: videoData.title,
      url: videoData.url,
      thumbnail: videoData.thumbnail,
      duration: videoData.duration,
      status: 'pending',
      progress: 0,
      quality: options.quality,
      format: options.format,
      playlistId: videoData.playlistId,
      addedAt: new Date()
    };

    this.downloads.set(downloadId, downloadItem);
    this.queue.push(downloadId);
    
    this.emit('download-added', downloadItem);
    this.processQueue();
    
    return downloadId;
  }

  private async processQueue() {
    if (this.currentDownloads >= this.maxConcurrentDownloads || this.queue.length === 0) {
      return;
    }

    const downloadId = this.queue.shift();
    if (!downloadId) return;

    const downloadItem = this.downloads.get(downloadId);
    if (!downloadItem || downloadItem.status !== 'pending') {
      this.processQueue(); // Process next item
      return;
    }

    await this.startDownload(downloadId);
  }

  private async startDownload(downloadId: string): Promise<void> {
    const downloadItem = this.downloads.get(downloadId);
    if (!downloadItem) return;

    this.currentDownloads++;
    downloadItem.status = 'downloading';
    downloadItem.startedAt = new Date();
    
    this.emit('download-started', downloadItem);

    try {
      const outputPath = this.getOutputPath(downloadItem);
      const ytDlpPath = join(__dirname, '../../bin/yt-dlp');
      
      const args = [
        downloadItem.url,
        '--output', outputPath,
        '--format', this.getFormatString(downloadItem.quality, downloadItem.format),
        '--write-info-json',
        '--write-thumbnail',
        '--embed-metadata',
        '--progress',
        '--newline'
      ];

      const ytDlpProcess = spawn(ytDlpPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeDownloads.set(downloadId, ytDlpProcess);

      let progressData = '';

      ytDlpProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        progressData += output;
        
        // Parse progress information
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (progressMatch && progressMatch[1]) {
          const progress = parseFloat(progressMatch[1]);
          downloadItem.progress = progress;
          
          // Extract speed and ETA
          const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
          const etaMatch = output.match(/ETA\s+([\d:]+)/);
          
          if (speedMatch && speedMatch[1]) downloadItem.speed = speedMatch[1];
          if (etaMatch && etaMatch[1]) downloadItem.eta = etaMatch[1];
          
          this.emit('download-progress', downloadItem);
        }
      });

      ytDlpProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`yt-dlp stderr: ${data.toString()}`);
      });

      ytDlpProcess.on('close', (code: number) => {
        this.activeDownloads.delete(downloadId);
        this.currentDownloads--;

        if (code === 0) {
          downloadItem.status = 'completed';
          downloadItem.progress = 100;
          downloadItem.completedAt = new Date();
          const foundFile = this.findDownloadedFile(outputPath);
          if (foundFile) downloadItem.filePath = foundFile;
          this.emit('download-completed', downloadItem);
        } else {
          downloadItem.status = 'failed';
          downloadItem.error = `Download failed with code ${code}`;
          this.emit('download-failed', downloadItem);
        }

        // Continue processing queue
        this.processQueue();
      });

      ytDlpProcess.on('error', (error: Error) => {
        this.activeDownloads.delete(downloadId);
        this.currentDownloads--;
        
        downloadItem.status = 'failed';
        downloadItem.error = error.message;
        this.emit('download-failed', downloadItem);
        
        // Continue processing queue
        this.processQueue();
      });

    } catch (error) {
      this.currentDownloads--;
      downloadItem.status = 'failed';
      downloadItem.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('download-failed', downloadItem);
      
      // Continue processing queue
      this.processQueue();
    }
  }

  pauseDownload(downloadId: string): boolean {
    const downloadItem = this.downloads.get(downloadId);
    const process = this.activeDownloads.get(downloadId);
    
    if (!downloadItem || !process || downloadItem.status !== 'downloading') {
      return false;
    }

    // Send SIGSTOP to pause the process
    try {
      process.kill('SIGSTOP');
      downloadItem.status = 'paused';
      this.emit('download-paused', downloadItem);
      return true;
    } catch (error) {
      console.error('Failed to pause download:', error);
      return false;
    }
  }

  resumeDownload(downloadId: string): boolean {
    const downloadItem = this.downloads.get(downloadId);
    const process = this.activeDownloads.get(downloadId);
    
    if (!downloadItem || !process || downloadItem.status !== 'paused') {
      return false;
    }

    // Send SIGCONT to resume the process
    try {
      process.kill('SIGCONT');
      downloadItem.status = 'downloading';
      this.emit('download-resumed', downloadItem);
      return true;
    } catch (error) {
      console.error('Failed to resume download:', error);
      return false;
    }
  }

  cancelDownload(downloadId: string): boolean {
    const downloadItem = this.downloads.get(downloadId);
    const process = this.activeDownloads.get(downloadId);
    
    if (!downloadItem) return false;

    if (process) {
      try {
        process.kill('SIGTERM');
        this.activeDownloads.delete(downloadId);
        this.currentDownloads--;
      } catch (error) {
        console.error('Failed to kill download process:', error);
      }
    }

    // Remove from queue if pending
    const queueIndex = this.queue.indexOf(downloadId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }

    downloadItem.status = 'cancelled';
    this.emit('download-cancelled', downloadItem);
    
    // Continue processing queue
    this.processQueue();
    
    return true;
  }

  removeDownload(downloadId: string): boolean {
    const downloadItem = this.downloads.get(downloadId);
    if (!downloadItem) return false;

    // Cancel if active
    if (downloadItem.status === 'downloading' || downloadItem.status === 'paused') {
      this.cancelDownload(downloadId);
    }

    this.downloads.delete(downloadId);
    this.emit('download-removed', downloadItem);
    
    return true;
  }

  getDownload(downloadId: string): DownloadItem | undefined {
    return this.downloads.get(downloadId);
  }

  getAllDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  getDownloadQueue(): DownloadItem[] {
    return this.getAllDownloads().filter(item => 
      item.status === 'pending' || item.status === 'downloading' || item.status === 'paused'
    );
  }

  clearCompleted(): void {
    const completedIds = Array.from(this.downloads.entries())
      .filter(([_, item]) => item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled')
      .map(([id]) => id);
    
    completedIds.forEach(id => {
      const item = this.downloads.get(id);
      this.downloads.delete(id);
      if (item) {
        this.emit('download-removed', item);
      }
    });
  }

  private getOutputPath(downloadItem: DownloadItem): string {
    const sanitizedTitle = downloadItem.title.replace(/[<>:"/\\|?*]/g, '_');
    return join(this.defaultDownloadPath, `${sanitizedTitle}.%(ext)s`);
  }

  private getFormatString(quality: string, format: string): string {
    // Convert quality and format to yt-dlp format string
    switch (quality) {
      case 'best':
        return `best[ext=${format}]/best`;
      case 'audio':
        return 'bestaudio/best';
      default:
        return `best[height<=${quality.replace('p', '')}][ext=${format}]/best[height<=${quality.replace('p', '')}]/best`;
    }
  }

  private findDownloadedFile(outputTemplate: string): string | undefined {
    // This would need to be implemented to find the actual downloaded file
    // For now, return the template path without the %(ext)s placeholder
    return outputTemplate.replace('.%(ext)s', '.mp4');
  }

  // Emit progress updates to all renderer processes
  private broadcastUpdate(event: string, data: any) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(event, data);
    });
  }
}

// Global download manager instance
export const downloadManager = new DownloadManager();

// Set up event forwarding to renderer processes
downloadManager.on('download-progress', (item) => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('download-progress', item);
  });
});

downloadManager.on('download-completed', (item) => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('download-completed', item);
  });
});

downloadManager.on('download-failed', (item) => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send('download-error', item);
  });
});
