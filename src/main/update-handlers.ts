// Component Update IPC Handlers - Main Process
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';
import * as os from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

interface DownloadProgress {
    progress: number;
    downloaded: number;
    total: number;
    status: 'downloading' | 'complete' | 'error';
    error?: string;
}

interface UpdateOptions {
    downloadUrl: string;
    version: string;
    backupEnabled?: boolean;
}

interface VersionResult {
    success: boolean;
    version?: string | undefined;
    path?: string | undefined;
    error?: string | undefined;
}

interface BackupResult {
    success: boolean;
    backupId?: string | undefined;
    backupPath?: string | undefined;
    version?: string | undefined;
    error?: string | undefined;
}

interface UpdateResult {
    success: boolean;
    error?: string;
    fromVersion?: string | undefined;
    toVersion?: string | undefined;
    backupCreated?: boolean;
    backupId?: string | undefined;
}

interface InstallResult {
    success: boolean;
    error?: string;
    version?: string | undefined;
    installedPath?: string;
}

interface VerifyResult {
    success: boolean;
    error?: string;
    version?: string | undefined;
    path?: string;
}

interface RestoreResult {
    success: boolean;
    error?: string;
    restoredVersion?: string;
    restoredPath?: string;
}

interface PlatformInfo {
    success: boolean;
    error?: string;
    platform: string;
    os?: string;
    arch?: string;
    osVersion?: string;
}

class ComponentUpdateHandler {
    private updateInProgress: boolean = false;
    private downloadProgress: Map<string, DownloadProgress> = new Map();
    private backupDir: string;
    private componentsDir: string;
    private tempDir: string;

    constructor() {
        this.backupDir = path.join(os.homedir(), '.youtube-playlist-manager', 'backups');
        this.componentsDir = path.join(os.homedir(), '.youtube-playlist-manager', 'components');
        this.tempDir = path.join(os.tmpdir(), 'youtube-playlist-manager-updates');
        
        this.initializeDirectories();
        this.setupIpcHandlers();
    }

    async initializeDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.mkdir(this.componentsDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to initialize component update directories:', error);
        }
    }

    setupIpcHandlers(): void {
        // Check component versions
        ipcMain.handle('component-update:check-version', async (event: IpcMainInvokeEvent, componentName: string) => {
            return await this.getCurrentComponentVersion(componentName);
        });

        // Get platform information
        ipcMain.handle('component-update:get-platform', async () => {
            return await this.getPlatformInfo();
        });

        // Update component
        ipcMain.handle('component-update:update', async (event: IpcMainInvokeEvent, componentName: string, options: UpdateOptions) => {
            return await this.updateComponent(componentName, options);
        });

        // Get download progress
        ipcMain.handle('component-update:get-progress', async (event: IpcMainInvokeEvent, downloadId: string) => {
            return this.getDownloadProgress(downloadId);
        });

        // Create backup
        ipcMain.handle('component-update:create-backup', async (event: IpcMainInvokeEvent, componentName: string) => {
            return await this.createBackup(componentName);
        });

        // Restore backup
        ipcMain.handle('component-update:restore-backup', async (event: IpcMainInvokeEvent, componentName: string, backupId: string) => {
            return await this.restoreBackup(componentName, backupId);
        });

        // Verify component
        ipcMain.handle('component-update:verify', async (event: IpcMainInvokeEvent, componentName: string) => {
            return await this.verifyComponent(componentName);
        });
    }

    async getYtDlpVersion(): Promise<VersionResult> {
        try {
            const ytDlpPath = await this.getYtDlpPath();
            if (!ytDlpPath) {
                return {
                    success: false,
                    error: 'yt-dlp not found',
                    version: 'Not installed'
                };
            }

            const { stdout } = await execAsync(`"${ytDlpPath}" --version`);
            const version = stdout.trim();
            
            return {
                success: true,
                version: version,
                path: ytDlpPath
            };
        } catch (error: any) {
            console.error('yt-dlp version check failed:', error);
            return {
                success: false,
                error: error?.message || 'Version check failed',
                version: 'Unknown'
            };
        }
    }

    async getFFmpegVersion(): Promise<VersionResult> {
        try {
            const ffmpegPath = await this.getFFmpegPath();
            if (!ffmpegPath) {
                return {
                    success: false,
                    error: 'FFmpeg not found',
                    version: 'Not installed'
                };
            }

            const { stdout } = await execAsync(`"${ffmpegPath}" -version`);
            const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
            const version = versionMatch ? versionMatch[1] : 'Unknown';
            
            return {
                success: true,
                version: version,
                path: ffmpegPath
            };
        } catch (error: any) {
            console.error('FFmpeg version check failed:', error);
            return {
                success: false,
                error: error?.message || 'Version check failed',
                version: 'Unknown'
            };
        }
    }

    async getPlatformInfo(): Promise<PlatformInfo> {
        try {
            const platform = os.platform();
            const arch = os.arch();
            
            let platformString = '';
            if (platform === 'win32') {
                platformString = arch === 'x64' ? 'win64' : 'win32';
            } else if (platform === 'darwin') {
                platformString = 'macos';
            } else if (platform === 'linux') {
                platformString = arch === 'x64' ? 'linux64' : 'linux32';
            } else {
                platformString = 'unknown';
            }
            
            return {
                success: true,
                platform: platformString,
                os: platform,
                arch: arch,
                osVersion: os.release()
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || 'Platform info error',
                platform: 'unknown'
            };
        }
    }

    async getYtDlpPath(): Promise<string | null> {
        // Try different possible locations
        const possiblePaths = [
            path.join(this.componentsDir, 'yt-dlp.exe'),
            path.join(this.componentsDir, 'yt-dlp'),
            'yt-dlp.exe',
            'yt-dlp'
        ];

        for (const testPath of possiblePaths) {
            try {
                await fs.access(testPath);
                return testPath;
            } catch {
                continue;
            }
        }

        // Try system PATH
        try {
            const { stdout } = await execAsync(os.platform() === 'win32' ? 'where yt-dlp' : 'which yt-dlp');
            return stdout.trim().split('\n')[0] || null;
        } catch {
            return null;
        }
    }

    async getFFmpegPath(): Promise<string | null> {
        // Try different possible locations
        const possiblePaths = [
            path.join(this.componentsDir, 'ffmpeg.exe'),
            path.join(this.componentsDir, 'ffmpeg'),
            'ffmpeg.exe',
            'ffmpeg'
        ];

        for (const testPath of possiblePaths) {
            try {
                await fs.access(testPath);
                return testPath;
            } catch {
                continue;
            }
        }

        // Try system PATH
        try {
            const { stdout } = await execAsync(os.platform() === 'win32' ? 'where ffmpeg' : 'which ffmpeg');
            return stdout.trim().split('\n')[0] || null;
        } catch {
            return null;
        }
    }

    async updateComponent(componentName: string, options: UpdateOptions): Promise<UpdateResult> {
        if (this.updateInProgress) {
            return {
                success: false,
                error: 'Another update is already in progress'
            };
        }

        this.updateInProgress = true;

        try {
            console.log(`Starting update for ${componentName}...`);
            
            const { downloadUrl, version, backupEnabled = true } = options;
            
            if (!downloadUrl) {
                throw new Error('Download URL not provided');
            }

            // Get current version for backup naming
            const currentVersion = await this.getCurrentComponentVersion(componentName);
            
            // Create backup if enabled
            let backupInfo: BackupResult | null = null;
            if (backupEnabled) {
                backupInfo = await this.createBackup(componentName);
                if (!backupInfo.success) {
                    console.warn('Backup creation failed, continuing with update:', backupInfo.error);
                }
            }

            // Download new version
            const downloadId = this.generateDownloadId();
            const downloadPath = await this.downloadComponent(downloadId, downloadUrl, componentName);
            
            // Install new version
            const installResult = await this.installComponent(componentName, downloadPath, version);
            
            if (installResult.success) {
                // Verify installation
                const verifyResult = await this.verifyComponent(componentName);
                
                if (verifyResult.success) {
                    // Clean up download
                    await this.cleanupTempFiles(downloadPath);
                    
                    return {
                        success: true,
                        fromVersion: currentVersion.version,
                        toVersion: version,
                        backupCreated: backupInfo?.success || false,
                        backupId: backupInfo?.backupId
                    };
                } else {
                    // Installation verification failed, restore backup if available
                    if (backupInfo?.success && backupInfo.backupId) {
                        await this.restoreBackup(componentName, backupInfo.backupId);
                    }
                    throw new Error(`Installation verification failed: ${verifyResult.error}`);
                }
            } else {
                throw new Error(`Installation failed: ${installResult.error}`);
            }
            
        } catch (error: any) {
            console.error(`Component update failed for ${componentName}:`, error);
            return {
                success: false,
                error: error?.message || 'Unknown error'
            };
        } finally {
            this.updateInProgress = false;
        }
    }

    async getCurrentComponentVersion(componentName: string): Promise<VersionResult> {
        if (componentName === 'yt-dlp') {
            return await this.getYtDlpVersion();
        } else if (componentName === 'ffmpeg') {
            return await this.getFFmpegVersion();
        } else {
            return { success: false, error: 'Unknown component' };
        }
    }

    async downloadComponent(downloadId: string, downloadUrl: string, componentName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const fileName = path.basename(new URL(downloadUrl).pathname);
            const downloadPath = path.join(this.tempDir, `${componentName}-${Date.now()}-${fileName}`);
            const file = require('fs').createWriteStream(downloadPath);
            
            // Initialize progress tracking
            this.downloadProgress.set(downloadId, {
                progress: 0,
                downloaded: 0,
                total: 0,
                status: 'downloading'
            });

            const request = https.get(downloadUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Download failed with status: ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedSize = 0;

                this.downloadProgress.set(downloadId, {
                    progress: 0,
                    downloaded: 0,
                    total: totalSize,
                    status: 'downloading'
                });

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
                    
                    this.downloadProgress.set(downloadId, {
                        progress: progress,
                        downloaded: downloadedSize,
                        total: totalSize,
                        status: 'downloading'
                    });
                });

                response.on('end', () => {
                    this.downloadProgress.set(downloadId, {
                        progress: 100,
                        downloaded: downloadedSize,
                        total: totalSize,
                        status: 'complete'
                    });
                });

                response.pipe(file);
            });

            file.on('finish', () => {
                file.close(() => {
                    resolve(downloadPath);
                });
            });

            file.on('error', (error: any) => {
                fs.unlink(downloadPath).catch(() => {}); // Clean up on error
                this.downloadProgress.set(downloadId, {
                    progress: 0,
                    downloaded: 0,
                    total: 0,
                    status: 'error',
                    error: error?.message || 'Download error'
                });
                reject(error);
            });

            request.on('error', (error: any) => {
                fs.unlink(downloadPath).catch(() => {}); // Clean up on error
                this.downloadProgress.set(downloadId, {
                    progress: 0,
                    downloaded: 0,
                    total: 0,
                    status: 'error',
                    error: error?.message || 'Request error'
                });
                reject(error);
            });
        });
    }

    async installComponent(componentName: string, downloadPath: string, version?: string): Promise<InstallResult> {
        try {
            const targetPath = path.join(this.componentsDir, componentName + (os.platform() === 'win32' ? '.exe' : ''));
            
            // For archives (zip, tar.xz), extract first
            if (downloadPath.endsWith('.zip') || downloadPath.endsWith('.tar.xz')) {
                const extractedPath = await this.extractArchive(downloadPath, componentName);
                await fs.copyFile(extractedPath, targetPath);
            } else {
                // Direct binary file
                await fs.copyFile(downloadPath, targetPath);
            }
            
            // Make executable on Unix systems
            if (os.platform() !== 'win32') {
                await fs.chmod(targetPath, 0o755);
            }
            
            return {
                success: true,
                installedPath: targetPath,
                version: version
            };
            
        } catch (error: any) {
            console.error('Installation failed:', error);
            return {
                success: false,
                error: error?.message || 'Installation failed'
            };
        }
    }

    async extractArchive(archivePath: string, componentName: string): Promise<string> {
        const extractDir = path.join(this.tempDir, `extract-${Date.now()}`);
        await fs.mkdir(extractDir, { recursive: true });
        
        try {
            if (archivePath.endsWith('.zip')) {
                // Extract ZIP file
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(archivePath);
                zip.extractAllTo(extractDir, true);
            } else if (archivePath.endsWith('.tar.xz')) {
                // Extract tar.xz file
                await execAsync(`tar -xf "${archivePath}" -C "${extractDir}"`);
            }
            
            // Find the executable in the extracted files
            const executablePath = await this.findExecutableInDirectory(extractDir, componentName);
            if (!executablePath) {
                throw new Error(`Executable not found in extracted archive for ${componentName}`);
            }
            
            return executablePath;
            
        } catch (error) {
            // Clean up extraction directory
            await fs.rmdir(extractDir, { recursive: true }).catch(() => {});
            throw error;
        }
    }

    async findExecutableInDirectory(directory: string, componentName: string): Promise<string | null> {
        const searchPatterns: Record<string, RegExp[]> = {
            'yt-dlp': [/yt-dlp(\.exe)?$/i],
            'ffmpeg': [/ffmpeg(\.exe)?$/i]
        };
        
        const patterns = searchPatterns[componentName] || [];
        
        async function searchRecursively(dir: string): Promise<string | null> {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isFile()) {
                    for (const pattern of patterns) {
                        if (pattern.test(entry.name)) {
                            return fullPath;
                        }
                    }
                } else if (entry.isDirectory()) {
                    const found = await searchRecursively(fullPath);
                    if (found) return found;
                }
            }
            
            return null;
        }
        
        return await searchRecursively(directory);
    }

    async createBackup(componentName: string): Promise<BackupResult> {
        try {
            const currentPath = await this.getComponentPath(componentName);
            if (!currentPath) {
                return {
                    success: false,
                    error: `Component ${componentName} not found for backup`
                };
            }
            
            const currentVersion = await this.getCurrentComponentVersion(componentName);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `${componentName}-${currentVersion.version || 'unknown'}-${timestamp}`;
            const backupPath = path.join(this.backupDir, backupId + (os.platform() === 'win32' ? '.exe' : ''));
            
            await fs.copyFile(currentPath, backupPath);
            
            // Create backup metadata
            const metadataPath = backupPath + '.meta.json';
            const metadata = {
                component: componentName,
                version: currentVersion.version,
                originalPath: currentPath,
                backupId: backupId,
                created: new Date().toISOString(),
                size: (await fs.stat(currentPath)).size
            };
            
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            
            console.log(`Backup created for ${componentName}: ${backupId}`);
            
            return {
                success: true,
                backupId: backupId,
                backupPath: backupPath,
                version: currentVersion.version
            };
            
        } catch (error: any) {
            console.error(`Backup creation failed for ${componentName}:`, error);
            return {
                success: false,
                error: error?.message || 'Backup creation failed'
            };
        }
    }

    async restoreBackup(componentName: string, backupId: string): Promise<RestoreResult> {
        try {
            const backupPath = path.join(this.backupDir, backupId + (os.platform() === 'win32' ? '.exe' : ''));
            const metadataPath = backupPath + '.meta.json';
            
            // Verify backup exists
            await fs.access(backupPath);
            await fs.access(metadataPath);
            
            // Read metadata
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            // Restore backup
            const targetPath = await this.getComponentPath(componentName) || 
                path.join(this.componentsDir, componentName + (os.platform() === 'win32' ? '.exe' : ''));
            
            await fs.copyFile(backupPath, targetPath);
            
            // Make executable on Unix systems
            if (os.platform() !== 'win32') {
                await fs.chmod(targetPath, 0o755);
            }
            
            console.log(`Backup restored for ${componentName}: ${backupId}`);
            
            return {
                success: true,
                restoredVersion: metadata.version,
                restoredPath: targetPath
            };
            
        } catch (error: any) {
            console.error(`Backup restoration failed for ${componentName}:`, error);
            return {
                success: false,
                error: error?.message || 'Backup restoration failed'
            };
        }
    }

    async getComponentPath(componentName: string): Promise<string | null> {
        if (componentName === 'yt-dlp') {
            return await this.getYtDlpPath();
        } else if (componentName === 'ffmpeg') {
            return await this.getFFmpegPath();
        }
        return null;
    }

    async verifyComponent(componentName: string): Promise<VerifyResult> {
        try {
            const componentPath = await this.getComponentPath(componentName);
            if (!componentPath) {
                return {
                    success: false,
                    error: `Component ${componentName} not found after installation`
                };
            }
            
            // Verify file exists and is executable
            await fs.access(componentPath);
            
            // Test execution
            const versionResult = await this.getCurrentComponentVersion(componentName);
            if (!versionResult.success) {
                return {
                    success: false,
                    error: `Component ${componentName} is not functional: ${versionResult.error}`
                };
            }
            
            return {
                success: true,
                version: versionResult.version,
                path: componentPath
            };
            
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || 'Component verification failed'
            };
        }
    }

    async cleanupTempFiles(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            
            // Clean up extraction directories
            const tempDirs = await fs.readdir(this.tempDir);
            for (const dir of tempDirs) {
                if (dir.startsWith('extract-')) {
                    const dirPath = path.join(this.tempDir, dir);
                    await fs.rmdir(dirPath, { recursive: true }).catch(() => {});
                }
            }
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }

    generateDownloadId(): string {
        return randomBytes(16).toString('hex');
    }

    getDownloadProgress(downloadId: string): DownloadProgress | null {
        return this.downloadProgress.get(downloadId) || null;
    }

    // Cleanup method for graceful shutdown
    async cleanup(): Promise<void> {
        try {
            // Clear any ongoing downloads
            this.downloadProgress.clear();
            
            // Clean up temp directory
            await fs.rmdir(this.tempDir, { recursive: true }).catch(() => {});
            
            console.log('Component update handler cleanup completed');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

export default ComponentUpdateHandler;
