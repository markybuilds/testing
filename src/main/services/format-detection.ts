import { spawn } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import { existsSync } from 'fs';

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  format_note?: string;
  quality?: number;
  tbr?: number; // Total bitrate
  vbr?: number; // Video bitrate
  abr?: number; // Audio bitrate
  width?: number;
  height?: number;
  format: string; // Full format description
}

export interface VideoFormats {
  formats: VideoFormat[];
  best_video?: VideoFormat | undefined;
  best_audio?: VideoFormat | undefined;
  best_combined?: VideoFormat | undefined;
  requested_formats?: VideoFormat[] | undefined;
}

export class FormatDetectionService {
  private ytDlpPath: string;

  constructor() {
    this.ytDlpPath = this.getYtDlpPath();
  }

  private getYtDlpPath(): string {
    const binariesPath = join(app.getPath('userData'), 'binaries');
    
    // Platform-specific executable name
    const execName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const fullPath = join(binariesPath, execName);
    
    // Check if yt-dlp exists, if not, use system yt-dlp
    if (!existsSync(fullPath)) {
      console.log('yt-dlp not found in app directory, using system yt-dlp');
      return 'yt-dlp'; // Assume it's in PATH
    }
    
    return fullPath;
  }

  async getAvailableFormats(url: string): Promise<VideoFormats | null> {
    try {
      const formats = await this.extractFormats(url);
      if (!formats || formats.length === 0) {
        return null;
      }

      return this.categorizeFormats(formats);
    } catch (error) {
      console.error('Error getting available formats:', error);
      return null;
    }
  }

  private async extractFormats(url: string): Promise<VideoFormat[]> {
    return new Promise((resolve, reject) => {
      const args = [
        url,
        '--list-formats',
        '--no-warnings',
        '--dump-json',
        '--no-playlist'
      ];

      const ytDlpProcess = spawn(this.ytDlpPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      ytDlpProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      ytDlpProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      ytDlpProcess.on('close', (code: number) => {
        if (code === 0) {
          try {
            // Parse the JSON output to get video info including formats
            const lines = stdout.trim().split('\n');
            if (lines.length === 0) {
              resolve([]);
              return;
            }
            const lastLine = lines[lines.length - 1];
            if (!lastLine) {
              resolve([]);
              return;
            }
            const videoData = JSON.parse(lastLine); // Last line contains the video data
            
            if (videoData.formats && Array.isArray(videoData.formats)) {
              resolve(videoData.formats);
            } else {
              resolve([]);
            }
          } catch (parseError) {
            console.error('Error parsing yt-dlp JSON output:', parseError);
            resolve([]);
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });

      ytDlpProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private categorizeFormats(formats: VideoFormat[]): VideoFormats {
    // Filter and categorize formats
    const videoFormats = formats.filter(f => 
      f.vcodec && f.vcodec !== 'none' && 
      (!f.acodec || f.acodec === 'none')
    );
    
    const audioFormats = formats.filter(f => 
      f.acodec && f.acodec !== 'none' && 
      (!f.vcodec || f.vcodec === 'none')
    );
    
    const combinedFormats = formats.filter(f => 
      f.vcodec && f.vcodec !== 'none' && 
      f.acodec && f.acodec !== 'none'
    );

    // Find best formats
    const bestVideo = this.findBestVideoFormat(videoFormats);
    const bestAudio = this.findBestAudioFormat(audioFormats);
    const bestCombined = this.findBestCombinedFormat(combinedFormats);

    return {
      formats: formats.sort((a, b) => (b.quality || 0) - (a.quality || 0)),
      best_video: bestVideo,
      best_audio: bestAudio,
      best_combined: bestCombined
    };
  }

  private findBestVideoFormat(formats: VideoFormat[]): VideoFormat | undefined {
    if (formats.length === 0) return undefined;
    
    return formats.reduce((best, current) => {
      // Prefer higher resolution
      const bestHeight = best.height || 0;
      const currentHeight = current.height || 0;
      
      if (currentHeight > bestHeight) return current;
      if (currentHeight < bestHeight) return best;
      
      // Same resolution, prefer higher bitrate
      const bestBitrate = best.vbr || best.tbr || 0;
      const currentBitrate = current.vbr || current.tbr || 0;
      
      return currentBitrate > bestBitrate ? current : best;
    });
  }

  private findBestAudioFormat(formats: VideoFormat[]): VideoFormat | undefined {
    if (formats.length === 0) return undefined;
    
    return formats.reduce((best, current) => {
      const bestBitrate = best.abr || best.tbr || 0;
      const currentBitrate = current.abr || current.tbr || 0;
      
      return currentBitrate > bestBitrate ? current : best;
    });
  }

  private findBestCombinedFormat(formats: VideoFormat[]): VideoFormat | undefined {
    if (formats.length === 0) return undefined;
    
    return formats.reduce((best, current) => {
      // Prefer higher resolution first
      const bestHeight = best.height || 0;
      const currentHeight = current.height || 0;
      
      if (currentHeight > bestHeight) return current;
      if (currentHeight < bestHeight) return best;
      
      // Same resolution, prefer higher total bitrate
      const bestBitrate = best.tbr || 0;
      const currentBitrate = current.tbr || 0;
      
      return currentBitrate > bestBitrate ? current : best;
    });
  }

  getFormatDisplayName(format: VideoFormat): string {
    const parts: string[] = [];
    
    // Resolution
    if (format.height) {
      parts.push(`${format.height}p`);
    } else if (format.resolution && format.resolution !== 'audio only') {
      parts.push(format.resolution);
    }
    
    // FPS
    if (format.fps && format.fps > 30) {
      parts.push(`${format.fps}fps`);
    }
    
    // Format/Container
    if (format.ext) {
      parts.push(format.ext.toUpperCase());
    }
    
    // Codec info
    if (format.vcodec && format.vcodec !== 'none') {
      const codec = format.vcodec.split('.')[0]; // Get main codec name
      if (codec && codec !== 'unknown') {
        parts.push(codec);
      }
    }
    
    // Audio info for video-only formats
    if (format.acodec === 'none' && format.vcodec !== 'none') {
      parts.push('video only');
    }
    
    // Audio-only formats
    if (format.vcodec === 'none' && format.acodec !== 'none') {
      parts.push('audio only');
      if (format.abr) {
        parts.push(`${format.abr}k`);
      }
    }
    
    // Bitrate info for combined formats
    if (format.vcodec !== 'none' && format.acodec !== 'none' && format.tbr) {
      parts.push(`${Math.round(format.tbr)}k`);
    }
    
    // File size
    if (format.filesize) {
      const sizeMB = Math.round(format.filesize / (1024 * 1024));
      if (sizeMB > 0) {
        parts.push(`${sizeMB}MB`);
      }
    }
    
    // Format note
    if (format.format_note && !parts.some(p => p.toLowerCase().includes(format.format_note!.toLowerCase()))) {
      parts.push(format.format_note);
    }
    
    return parts.join(' | ') || format.format_id;
  }

  getQualityGroups(formats: VideoFormat[]): Map<string, VideoFormat[]> {
    const groups = new Map<string, VideoFormat[]>();
    
    for (const format of formats) {
      let groupKey = 'Other';
      
      if (format.height) {
        if (format.height >= 2160) groupKey = '4K (2160p)';
        else if (format.height >= 1440) groupKey = '1440p';
        else if (format.height >= 1080) groupKey = '1080p';
        else if (format.height >= 720) groupKey = '720p';
        else if (format.height >= 480) groupKey = '480p';
        else if (format.height >= 360) groupKey = '360p';
        else if (format.height >= 240) groupKey = '240p';
        else groupKey = 'Low Quality';
      } else if (format.acodec !== 'none' && format.vcodec === 'none') {
        groupKey = 'Audio Only';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(format);
    }
    
    // Sort groups by quality (descending)
    const sortedGroups = new Map<string, VideoFormat[]>();
    const keyOrder = ['4K (2160p)', '1440p', '1080p', '720p', '480p', '360p', '240p', 'Low Quality', 'Audio Only', 'Other'];
    
    for (const key of keyOrder) {
      if (groups.has(key)) {
        // Sort formats within each group by bitrate/quality
        const formatList = groups.get(key)!.sort((a, b) => {
          const aBitrate = a.tbr || a.vbr || a.abr || 0;
          const bBitrate = b.tbr || b.vbr || b.abr || 0;
          return bBitrate - aBitrate;
        });
        sortedGroups.set(key, formatList);
      }
    }
    
    return sortedGroups;
  }

  generateFormatSelector(formats: VideoFormat[], selectedFormatId?: string): string {
    const groups = this.getQualityGroups(formats);
    let html = '<option value="">Select Quality...</option>';
    
    // Add best quality option
    if (formats.length > 0) {
      html += '<option value="best">Best Available Quality</option>';
      html += '<option value="worst">Lowest Available Quality</option>';
      html += '<optgroup label="──────────────────"></optgroup>';
    }
    
    for (const [groupName, groupFormats] of groups) {
      if (groupFormats.length === 0) continue;
      
      html += `<optgroup label="${groupName}">`;
      
      for (const format of groupFormats) {
        const displayName = this.getFormatDisplayName(format);
        const selected = selectedFormatId === format.format_id ? 'selected' : '';
        html += `<option value="${format.format_id}" ${selected}>${displayName}</option>`;
      }
      
      html += '</optgroup>';
    }
    
    return html;
  }
}
