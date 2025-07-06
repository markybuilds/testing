import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
  
  // Database operations (to be implemented)
  database: {
    getPlaylists: () => ipcRenderer.invoke('db:getPlaylists'),
    createPlaylist: (playlistData: any) => ipcRenderer.invoke('db:createPlaylist', playlistData),
    deletePlaylist: (id: number) => ipcRenderer.invoke('db:deletePlaylist', id),
    addVideoToPlaylist: (playlistId: number, videoData: any) => 
      ipcRenderer.invoke('db:addVideoToPlaylist', playlistId, videoData),
    removeVideoFromPlaylist: (playlistId: number, videoId: string) => 
      ipcRenderer.invoke('db:removeVideoFromPlaylist', playlistId, videoId),
    getPlaylistVideos: (playlistId: number) => 
      ipcRenderer.invoke('db:getPlaylistVideos', playlistId),
    savePlaylistVideoOrder: (playlistId: number, videoOrders: Array<{id: string, order: number}>) => 
      ipcRenderer.invoke('db:savePlaylistVideoOrder', playlistId, videoOrders),
    getVideoDetails: (videoId: string) => ipcRenderer.invoke('db:getVideoDetails', videoId),
    searchVideos: (query: string) => ipcRenderer.invoke('db:searchVideos', query)
  },
  
  // YouTube operations
  youtube: {
    validateUrl: (url: string) => ipcRenderer.invoke('youtube:validate-url', url),
    importPlaylist: (url: string) => ipcRenderer.invoke('youtube:import-playlist', url),
    getVideoInfo: (url: string) => ipcRenderer.invoke('youtube:get-video-info', url),
    getFormats: (url: string) => ipcRenderer.invoke('youtube:get-formats', url),
    getVersion: () => ipcRenderer.invoke('youtube:get-version'),
    update: () => ipcRenderer.invoke('youtube:update')
  },
  
  // Download operations
  downloads: {
    downloadVideo: (videoData: any, options: any) => 
      ipcRenderer.invoke('download:video', videoData, options),
    downloadPlaylist: (playlistId: number, options: any) => 
      ipcRenderer.invoke('download:playlist', playlistId, options),
    pauseDownload: (downloadId: string) => ipcRenderer.invoke('download:pause', downloadId),
    resumeDownload: (downloadId: string) => ipcRenderer.invoke('download:resume', downloadId),
    cancelDownload: (downloadId: string) => ipcRenderer.invoke('download:cancel', downloadId),
    removeDownload: (downloadId: string) => ipcRenderer.invoke('download:remove', downloadId),
    getDownloadQueue: () => ipcRenderer.invoke('download:getQueue'),
    getDownload: (downloadId: string) => ipcRenderer.invoke('download:get', downloadId),
    clearCompleted: () => ipcRenderer.invoke('download:clearCompleted'),
    getStats: () => ipcRenderer.invoke('download:getStats')
  },
  
  // Export operations
  exports: {
    exportData: (type: string, params: any) => ipcRenderer.invoke('exports:exportData', type, params),
    previewImport: (filePath: string, type: string) => 
      ipcRenderer.invoke('exports:previewImport', filePath, type),
    confirmImport: (importData: any) => ipcRenderer.invoke('exports:confirmImport', importData),
    cancelExport: (exportId?: string) => ipcRenderer.invoke('exports:cancelExport', exportId),
    getBackupStats: () => ipcRenderer.invoke('exports:getBackupStats'),
    getExportHistory: () => ipcRenderer.invoke('exports:getExportHistory')
  },
  
  // Duplicate detection operations
  duplicates: {
    scan: (options: any) => ipcRenderer.invoke('duplicates:scan', options),
    getDuplicateGroups: () => ipcRenderer.invoke('duplicates:getDuplicateGroups'),
    resolveDuplicate: (originalId: string, duplicateId: string, action: string) => 
      ipcRenderer.invoke('duplicates:resolveDuplicate', originalId, duplicateId, action),
    bulkResolve: (resolutions: any[]) => ipcRenderer.invoke('duplicates:bulkResolve', resolutions),
    ignoreDuplicate: (originalId: string, duplicateId: string) => 
      ipcRenderer.invoke('duplicates:ignoreDuplicate', originalId, duplicateId),
    getStats: () => ipcRenderer.invoke('duplicates:getStats'),
    checkBeforeDownload: (videoUrl: string, videoTitle: string) => 
      ipcRenderer.invoke('duplicates:checkBeforeDownload', videoUrl, videoTitle)
  },
  
  // Media operations (to be implemented)
  media: {
    convertVideo: (filePath: string, options: any) => 
      ipcRenderer.invoke('media:convert', filePath, options),
    getVideoMetadata: (filePath: string) => ipcRenderer.invoke('media:getMetadata', filePath)
  },
  
  // Event listeners for real-time updates
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download:progress', (_, data) => callback(data));
  },
  
  onDownloadComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('download:complete', (_, data) => callback(data));
  },
  
  onDownloadError: (callback: (data: any) => void) => {
    ipcRenderer.on('download:error', (_, data) => callback(data));
  },
  
  onYouTubeImportProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('youtube:import-progress', (_, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// TypeScript declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      database: {
        getPlaylists: () => Promise<any[]>;
        createPlaylist: (playlistData: any) => Promise<any>;
        deletePlaylist: (id: number) => Promise<void>;
        addVideoToPlaylist: (playlistId: number, videoData: any) => Promise<void>;
        removeVideoFromPlaylist: (playlistId: number, videoId: string) => Promise<void>;
        getPlaylistVideos: (playlistId: number) => Promise<any[]>;
        getVideoDetails: (videoId: string) => Promise<any>;
        searchVideos: (query: string) => Promise<any[]>;
      };
      youtube: {
        validateUrl: (url: string) => Promise<any>;
        importPlaylist: (url: string) => Promise<any>;
        getVideoInfo: (url: string) => Promise<any>;
        getFormats: (url: string) => Promise<any>;
        getVersion: () => Promise<string>;
        update: () => Promise<any>;
      };
      downloads: {
        downloadVideo: (videoData: any, options: any) => Promise<string>;
        downloadPlaylist: (playlistId: number, options: any) => Promise<string>;
        pauseDownload: (downloadId: string) => Promise<void>;
        resumeDownload: (downloadId: string) => Promise<void>;
        cancelDownload: (downloadId: string) => Promise<void>;
        getDownloadQueue: () => Promise<any[]>;
      };
      exports: {
        exportData: (type: string, params: any) => Promise<any>;
        previewImport: (filePath: string, type: string) => Promise<any>;
        confirmImport: (importData: any) => Promise<any>;
        cancelExport: (exportId?: string) => Promise<boolean>;
        getBackupStats: () => Promise<any>;
        getExportHistory: () => Promise<any[]>;
      };
      duplicates: {
        scan: (options: any) => Promise<any>;
        getDuplicateGroups: () => Promise<any[]>;
        resolveDuplicate: (originalId: string, duplicateId: string, action: string) => Promise<any>;
        bulkResolve: (resolutions: any[]) => Promise<any>;
        ignoreDuplicate: (originalId: string, duplicateId: string) => Promise<any>;
        getStats: () => Promise<any>;
        checkBeforeDownload: (videoUrl: string, videoTitle: string) => Promise<any>;
      };
      media: {
        convertVideo: (filePath: string, options: any) => Promise<string>;
        getVideoMetadata: (filePath: string) => Promise<any>;
      };
      onDownloadProgress: (callback: (data: any) => void) => void;
      onDownloadComplete: (callback: (data: any) => void) => void;
      onDownloadError: (callback: (data: any) => void) => void;
      onYouTubeImportProgress: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
