// Shared types and interfaces
export interface Playlist {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  videoCount: number;
  created: string;
  updated: string;
  source: 'youtube' | 'custom';
  sourceId?: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration: number;
  views?: number;
  url: string;
  uploadDate?: string;
  uploader?: string;
  playlistId: number;
}

export interface DownloadItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail?: string;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  quality: string;
  format: string;
  filePath?: string;
  error?: string;
  startTime: string;
  endTime?: string;
}

export interface DownloadOptions {
  quality: string;
  format: string;
  audioOnly?: boolean;
  subtitles?: boolean;
  outputPath?: string;
}

export interface VideoFormat {
  formatId: string;
  quality: string;
  extension: string;
  filesize?: number;
  codec?: string;
  fps?: number;
}

export interface ImportResult {
  success: boolean;
  title?: string;
  videoCount?: number;
  error?: string;
}

export interface AppSettings {
  downloadPath: string;
  defaultQuality: string;
  defaultFormat: string;
  autoUpdateYtdl: boolean;
  minimizeToTray: boolean;
}
