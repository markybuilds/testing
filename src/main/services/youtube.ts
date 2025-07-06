import { spawn } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { FormatDetectionService, VideoFormats, VideoFormat } from './format-detection';

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration: number;
  views?: number;
  url: string;
  uploadDate?: string;
  uploader?: string;
  uploaderId?: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  uploader?: string;
  uploaderUrl?: string;
  videoCount: number;
  videos: VideoInfo[];
}

export interface ImportProgress {
  stage: 'validating' | 'extracting' | 'processing' | 'saving' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  videosProcessed: number;
  totalVideos: number;
}

export class YouTubeService {
  private ytDlpPath: string;
  private progressCallback?: (progress: ImportProgress) => void;
  private formatDetectionService: FormatDetectionService;

  constructor() {
    this.ytDlpPath = this.getYtDlpPath();
    this.formatDetectionService = new FormatDetectionService();
    this.ensureYtDlpExists();
  }

  private getYtDlpPath(): string {
    const binariesPath = join(app.getPath('userData'), 'binaries');
    
    // Platform-specific executable name
    const execName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    return join(binariesPath, execName);
  }

  private ensureYtDlpExists(): void {
    const binariesPath = join(app.getPath('userData'), 'binaries');
    
    if (!existsSync(binariesPath)) {
      mkdirSync(binariesPath, { recursive: true });
    }

    // Check if yt-dlp exists, if not, we'll need to download it
    if (!existsSync(this.ytDlpPath)) {
      console.log('yt-dlp not found, will need to download');
      // For now, we'll use system yt-dlp or youtube-dl-exec npm package
      this.ytDlpPath = 'yt-dlp'; // Assume it's in PATH
    }
  }

  public setProgressCallback(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback;
  }

  private emitProgress(progress: ImportProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  public validateUrl(url: string): boolean {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+&list=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+\?list=[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/user\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  public async getPlaylistInfo(url: string): Promise<PlaylistInfo> {
    this.emitProgress({
      stage: 'validating',
      message: 'Validating YouTube URL...',
      progress: 10,
      videosProcessed: 0,
      totalVideos: 0
    });

    if (!this.validateUrl(url)) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube playlist, channel, or user URL.');
    }

    this.emitProgress({
      stage: 'extracting',
      message: 'Extracting playlist information...',
      progress: 20,
      videosProcessed: 0,
      totalVideos: 0
    });

    try {
      // First, get playlist metadata
      const playlistData = await this.executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--playlist-end', '1',
        url
      ]);

      const firstLine = playlistData.split('\n')[0];
      if (!firstLine) {
        throw new Error('No playlist data returned');
      }
      const playlistInfo = JSON.parse(firstLine);
      
      this.emitProgress({
        stage: 'extracting',
        message: 'Getting video list...',
        progress: 40,
        videosProcessed: 0,
        totalVideos: 0
      });

      // Get all video IDs in the playlist
      const videoListData = await this.executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--get-id',
        url
      ]);

      const videoIds = videoListData.trim().split('\n').filter(id => id.length > 0);
      
      this.emitProgress({
        stage: 'processing',
        message: `Processing ${videoIds.length} videos...`,
        progress: 50,
        videosProcessed: 0,
        totalVideos: videoIds.length
      });

      // Get detailed info for each video (in batches to avoid overwhelming)
      const videos: VideoInfo[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const batchPromises = batch.map(videoId => this.getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`));
        
        try {
          const batchResults = await Promise.allSettled(batchPromises);
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              videos.push(result.value);
            } else {
              console.warn('Failed to get video info:', result.reason);
            }
          }
        } catch (error) {
          console.warn('Batch processing error:', error);
        }

        const progress = 50 + ((i + batch.length) / videoIds.length) * 40;
        this.emitProgress({
          stage: 'processing',
          message: `Processed ${Math.min(i + batch.length, videoIds.length)} of ${videoIds.length} videos...`,
          progress: Math.round(progress),
          videosProcessed: videos.length,
          totalVideos: videoIds.length
        });
      }

      const result: PlaylistInfo = {
        id: playlistInfo.id || this.extractPlaylistId(url),
        title: playlistInfo.title || playlistInfo.uploader || 'Unknown Playlist',
        description: playlistInfo.description,
        thumbnail: playlistInfo.thumbnail,
        uploader: playlistInfo.uploader,
        uploaderUrl: playlistInfo.uploader_url,
        videoCount: videos.length,
        videos: videos
      };

      this.emitProgress({
        stage: 'complete',
        message: `Successfully imported ${videos.length} videos`,
        progress: 100,
        videosProcessed: videos.length,
        totalVideos: videoIds.length
      });

      return result;

    } catch (error) {
      this.emitProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        progress: 0,
        videosProcessed: 0,
        totalVideos: 0
      });
      throw error;
    }
  }

  public async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const data = await this.executeYtDlp([
        '--dump-json',
        '--no-playlist',
        url
      ]);

      const videoData = JSON.parse(data);

      return {
        id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration || 0,
        views: videoData.view_count,
        url: videoData.webpage_url || url,
        uploadDate: videoData.upload_date,
        uploader: videoData.uploader,
        uploaderId: videoData.uploader_id
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getAvailableFormats(url: string): Promise<any[]> {
    try {
      const data = await this.executeYtDlp([
        '--dump-json',
        '--no-playlist',
        url
      ]);

      const videoData = JSON.parse(data);
      return videoData.formats || [];
    } catch (error) {
      throw new Error(`Failed to get available formats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getVideoFormats(url: string): Promise<VideoFormats | null> {
    return await this.formatDetectionService.getAvailableFormats(url);
  }

  public getFormatDisplayName(format: VideoFormat): string {
    return this.formatDetectionService.getFormatDisplayName(format);
  }

  public generateFormatSelector(formats: VideoFormat[], selectedFormatId?: string): string {
    return this.formatDetectionService.generateFormatSelector(formats, selectedFormatId);
  }

  private extractPlaylistId(url: string): string {
    const listMatch = url.match(/[?&]list=([\w-]+)/);
    if (listMatch && listMatch[1]) {
      return listMatch[1];
    }
    
    // For channel/user URLs, use the URL as ID
    const channelMatch = url.match(/\/channel\/([\w-]+)/);
    if (channelMatch) {
      return `channel_${channelMatch[1]}`;
    }
    
    const userMatch = url.match(/\/user\/([\w-]+)/);
    if (userMatch) {
      return `user_${userMatch[1]}`;
    }
    
    const handleMatch = url.match(/\/@([\w-]+)/);
    if (handleMatch) {
      return `handle_${handleMatch[1]}`;
    }
    
    return `unknown_${Date.now()}`;
  }

  private executeYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.ytDlpPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: any) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: any) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(new Error(`Failed to execute yt-dlp: ${error.message}`));
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('yt-dlp operation timed out'));
      }, 60000);
    });
  }

  public async updateYtDlp(): Promise<void> {
    try {
      await this.executeYtDlp(['--update']);
    } catch (error) {
      throw new Error(`Failed to update yt-dlp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getVersion(): Promise<string> {
    try {
      const version = await this.executeYtDlp(['--version']);
      return version.trim();
    } catch (error) {
      return 'Unknown';
    }
  }
}
