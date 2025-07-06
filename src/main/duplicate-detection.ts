// Duplicate Video Detection System - Main Process
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

interface VideoInfo {
    id: string;
    video_id: string;
    title: string;
    url: string;
    duration?: number;
    playlist_id: string;
    playlist_name?: string;
    file_path?: string;
    file_size?: number;
    created_at: string;
}

interface DuplicateGroup {
    original: VideoInfo;
    duplicates: VideoInfo[];
    detection_method: 'video_id' | 'title_similarity' | 'url_match' | 'file_hash';
    similarity_score?: number;
}

interface DuplicateDetectionOptions {
    includeCrossPlatform: boolean;
    titleSimilarityThreshold: number;
    checkFileHashes: boolean;
    checkExistingFiles: boolean;
}

interface DuplicateStats {
    total_videos: number;
    duplicate_groups: number;
    total_duplicates: number;
    storage_saved: number; // in bytes
    potential_savings: number; // in bytes
}

class DuplicateDetectionHandler {
    private db: Database.Database | null = null;
    private dbPath: string;

    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'database', 'playlists.db');
        this.initializeDatabase();
        this.setupIpcHandlers();
    }

    private initializeDatabase(): void {
        try {
            this.db = new Database(this.dbPath);
            this.createDuplicatesTables();
        } catch (error) {
            console.error('Failed to initialize duplicate detection database:', error);
        }
    }

    private createDuplicatesTables(): void {
        if (!this.db) return;

        // Table to store duplicate relationships
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS video_duplicates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_video_id TEXT NOT NULL,
                duplicate_video_id TEXT NOT NULL,
                detection_method TEXT NOT NULL,
                similarity_score REAL,
                confirmed_by_user BOOLEAN DEFAULT FALSE,
                ignored_by_user BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(original_video_id, duplicate_video_id)
            )
        `);

        // Table to store file hashes for physical duplicate detection
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS video_file_hashes (
                video_id TEXT PRIMARY KEY,
                file_hash TEXT NOT NULL,
                file_size INTEGER,
                hash_algorithm TEXT DEFAULT 'sha256',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Indexes for performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_duplicates_original ON video_duplicates(original_video_id);
            CREATE INDEX IF NOT EXISTS idx_duplicates_duplicate ON video_duplicates(duplicate_video_id);
            CREATE INDEX IF NOT EXISTS idx_duplicates_method ON video_duplicates(detection_method);
            CREATE INDEX IF NOT EXISTS idx_file_hashes_hash ON video_file_hashes(file_hash);
        `);
    }

    private setupIpcHandlers(): void {
        // Scan for duplicates
        ipcMain.handle('duplicates:scan', async (event: IpcMainInvokeEvent, options?: DuplicateDetectionOptions) => {
            return await this.scanForDuplicates(options);
        });

        // Get duplicate groups
        ipcMain.handle('duplicates:getDuplicateGroups', async () => {
            return await this.getDuplicateGroups();
        });

        // Get duplicate statistics
        ipcMain.handle('duplicates:getStats', async () => {
            return await this.getDuplicateStats();
        });

        // Resolve duplicate (keep original, remove duplicate)
        ipcMain.handle('duplicates:resolve', async (event: IpcMainInvokeEvent, originalId: string, duplicateId: string, action: 'keep_original' | 'keep_duplicate' | 'keep_both') => {
            return await this.resolveDuplicate(originalId, duplicateId, action);
        });

        // Mark duplicate as ignored
        ipcMain.handle('duplicates:ignore', async (event: IpcMainInvokeEvent, originalId: string, duplicateId: string) => {
            return await this.ignoreDuplicate(originalId, duplicateId);
        });

        // Get video suggestions before download
        ipcMain.handle('duplicates:checkBeforeDownload', async (event: IpcMainInvokeEvent, videoUrl: string, videoTitle: string) => {
            return await this.checkBeforeDownload(videoUrl, videoTitle);
        });

        // Update file hash after download
        ipcMain.handle('duplicates:updateFileHash', async (event: IpcMainInvokeEvent, videoId: string, filePath: string) => {
            return await this.updateFileHash(videoId, filePath);
        });

        // Bulk resolve duplicates
        ipcMain.handle('duplicates:bulkResolve', async (event: IpcMainInvokeEvent, resolutions: Array<{originalId: string, duplicateId: string, action: string}>) => {
            return await this.bulkResolveDuplicates(resolutions);
        });
    }

    async scanForDuplicates(options?: DuplicateDetectionOptions): Promise<{ success: boolean; duplicatesFound: number; error?: string }> {
        if (!this.db) {
            return { success: false, duplicatesFound: 0, error: 'Database not initialized' };
        }

        try {
            const defaultOptions: DuplicateDetectionOptions = {
                includeCrossPlatform: true,
                titleSimilarityThreshold: 0.85,
                checkFileHashes: true,
                checkExistingFiles: true,
                ...options
            };

            let duplicatesFound = 0;

            // Clear existing non-confirmed duplicates for fresh scan
            this.db.prepare(`
                DELETE FROM video_duplicates 
                WHERE confirmed_by_user = FALSE AND ignored_by_user = FALSE
            `).run();

            // 1. Detect exact video ID matches (same YouTube video in different playlists)
            duplicatesFound += await this.detectExactVideoIdDuplicates();

            // 2. Detect URL-based duplicates
            duplicatesFound += await this.detectUrlDuplicates();

            // 3. Detect title similarity duplicates
            if (defaultOptions.titleSimilarityThreshold > 0) {
                duplicatesFound += await this.detectTitleSimilarityDuplicates(defaultOptions.titleSimilarityThreshold);
            }

            // 4. Detect file hash duplicates (for downloaded files)
            if (defaultOptions.checkFileHashes) {
                duplicatesFound += await this.detectFileHashDuplicates();
            }

            return { success: true, duplicatesFound };
        } catch (error) {
            console.error('Error scanning for duplicates:', error);
            return { success: false, duplicatesFound: 0, error: (error as Error).message };
        }
    }

    private async detectExactVideoIdDuplicates(): Promise<number> {
        if (!this.db) return 0;

        const query = `
            SELECT v1.id as original_id, v2.id as duplicate_id
            FROM videos v1
            JOIN videos v2 ON v1.video_id = v2.video_id AND v1.id < v2.id
            WHERE v1.video_id IS NOT NULL AND v1.video_id != ''
        `;

        const duplicates = this.db.prepare(query).all() as Array<{original_id: string, duplicate_id: string}>;
        
        const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO video_duplicates 
            (original_video_id, duplicate_video_id, detection_method, similarity_score)
            VALUES (?, ?, 'video_id', 1.0)
        `);

        let count = 0;
        for (const dup of duplicates) {
            insertStmt.run(dup.original_id, dup.duplicate_id);
            count++;
        }

        return count;
    }

    private async detectUrlDuplicates(): Promise<number> {
        if (!this.db) return 0;

        const query = `
            SELECT v1.id as original_id, v2.id as duplicate_id
            FROM videos v1
            JOIN videos v2 ON v1.url = v2.url AND v1.id < v2.id
            WHERE v1.url IS NOT NULL AND v1.url != ''
        `;

        const duplicates = this.db.prepare(query).all() as Array<{original_id: string, duplicate_id: string}>;
        
        const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO video_duplicates 
            (original_video_id, duplicate_video_id, detection_method, similarity_score)
            VALUES (?, ?, 'url_match', 1.0)
        `);

        let count = 0;
        for (const dup of duplicates) {
            insertStmt.run(dup.original_id, dup.duplicate_id);
            count++;
        }

        return count;
    }

    private async detectTitleSimilarityDuplicates(threshold: number): Promise<number> {
        if (!this.db) return 0;

        // Get all videos with titles
        const videos = this.db.prepare(`
            SELECT id, title FROM videos 
            WHERE title IS NOT NULL AND title != ''
            ORDER BY id
        `).all() as Array<{id: string, title: string}>;

        const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO video_duplicates 
            (original_video_id, duplicate_video_id, detection_method, similarity_score)
            VALUES (?, ?, 'title_similarity', ?)
        `);

        let count = 0;
        
        // Compare each video with every other video
        for (let i = 0; i < videos.length; i++) {
            for (let j = i + 1; j < videos.length; j++) {
                const video1 = videos[i];
                const video2 = videos[j];
                
                if (video1 && video2 && video1.title && video2.title) {
                    const similarity = this.calculateTitleSimilarity(video1.title, video2.title);
                    
                    if (similarity >= threshold) {
                        insertStmt.run(video1.id, video2.id, similarity);
                        count++;
                    }
                }
            }
        }

        return count;
    }

    private calculateTitleSimilarity(title1: string, title2: string): number {
        // Normalize titles for comparison
        const normalize = (title: string) => {
            return title.toLowerCase()
                .replace(/[^\w\s]/g, '') // Remove special characters
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim();
        };

        const norm1 = normalize(title1);
        const norm2 = normalize(title2);

        // If exactly the same after normalization
        if (norm1 === norm2) return 1.0;

        // Calculate Jaccard similarity using word sets
        const words1 = new Set(norm1.split(' '));
        const words2 = new Set(norm2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    private async detectFileHashDuplicates(): Promise<number> {
        if (!this.db) return 0;

        // This would be implemented to hash downloaded files and compare
        // For now, return 0 as file hashing requires actual file access
        return 0;
    }

    async getDuplicateGroups(): Promise<DuplicateGroup[]> {
        if (!this.db) return [];

        const query = `
            SELECT 
                vd.original_video_id,
                vd.duplicate_video_id,
                vd.detection_method,
                vd.similarity_score,
                vd.ignored_by_user,
                vo.title as original_title,
                vo.url as original_url,
                vo.video_id as original_video_id_yt,
                vd_dup.title as duplicate_title,
                vd_dup.url as duplicate_url,
                vd_dup.video_id as duplicate_video_id_yt,
                po.title as original_playlist,
                pd.title as duplicate_playlist
            FROM video_duplicates vd
            JOIN videos vo ON vd.original_video_id = vo.id
            JOIN videos vd_dup ON vd.duplicate_video_id = vd_dup.id
            LEFT JOIN playlists po ON vo.playlist_id = po.id
            LEFT JOIN playlists pd ON vd_dup.playlist_id = pd.id
            WHERE vd.ignored_by_user = FALSE
            ORDER BY vd.similarity_score DESC, vo.title
        `;

        const rows = this.db.prepare(query).all() as Array<any>;
        
        // Group duplicates by original video
        const groups = new Map<string, DuplicateGroup>();
        
        for (const row of rows) {
            const originalId = row.original_video_id;
            
            if (!groups.has(originalId)) {
                groups.set(originalId, {
                    original: {
                        id: originalId,
                        video_id: row.original_video_id_yt,
                        title: row.original_title,
                        url: row.original_url,
                        playlist_id: '',
                        playlist_name: row.original_playlist,
                        created_at: ''
                    },
                    duplicates: [],
                    detection_method: row.detection_method,
                    similarity_score: row.similarity_score
                });
            }
            
            const group = groups.get(originalId)!;
            group.duplicates.push({
                id: row.duplicate_video_id,
                video_id: row.duplicate_video_id_yt,
                title: row.duplicate_title,
                url: row.duplicate_url,
                playlist_id: '',
                playlist_name: row.duplicate_playlist,
                created_at: ''
            });
        }
        
        return Array.from(groups.values());
    }

    async getDuplicateStats(): Promise<DuplicateStats> {
        if (!this.db) {
            return {
                total_videos: 0,
                duplicate_groups: 0,
                total_duplicates: 0,
                storage_saved: 0,
                potential_savings: 0
            };
        }

        const totalVideos = this.db.prepare(`SELECT COUNT(*) as count FROM videos`).get() as {count: number};
        
        const duplicateGroups = this.db.prepare(`
            SELECT COUNT(DISTINCT original_video_id) as count 
            FROM video_duplicates 
            WHERE ignored_by_user = FALSE
        `).get() as {count: number};
        
        const totalDuplicates = this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM video_duplicates 
            WHERE ignored_by_user = FALSE
        `).get() as {count: number};

        // Calculate storage statistics (simplified - would need actual file sizes)
        const storageInfo = this.db.prepare(`
            SELECT 
                COUNT(*) as duplicate_count,
                AVG(COALESCE(file_size, 100000000)) as avg_size
            FROM videos v
            JOIN video_duplicates vd ON v.id = vd.duplicate_video_id
            WHERE vd.ignored_by_user = FALSE
        `).get() as {duplicate_count: number, avg_size: number} || {duplicate_count: 0, avg_size: 0};

        return {
            total_videos: totalVideos.count,
            duplicate_groups: duplicateGroups.count,
            total_duplicates: totalDuplicates.count,
            storage_saved: 0, // Would be calculated from resolved duplicates
            potential_savings: Math.round(storageInfo.duplicate_count * (storageInfo.avg_size || 0))
        };
    }

    async resolveDuplicate(originalId: string, duplicateId: string, action: 'keep_original' | 'keep_duplicate' | 'keep_both'): Promise<{success: boolean; error?: string}> {
        if (!this.db) {
            return { success: false, error: 'Database not initialized' };
        }

        try {
            this.db.transaction(() => {
                if (action === 'keep_original') {
                    // Remove the duplicate video
                    this.db!.prepare(`DELETE FROM videos WHERE id = ?`).run(duplicateId);
                    
                } else if (action === 'keep_duplicate') {
                    // Remove the original video and update duplicate record
                    this.db!.prepare(`DELETE FROM videos WHERE id = ?`).run(originalId);
                    
                } else if (action === 'keep_both') {
                    // Mark as ignored (keep both)
                    this.db!.prepare(`
                        UPDATE video_duplicates 
                        SET ignored_by_user = TRUE 
                        WHERE original_video_id = ? AND duplicate_video_id = ?
                    `).run(originalId, duplicateId);
                    return;
                }
                
                // Remove the duplicate relationship
                this.db!.prepare(`
                    DELETE FROM video_duplicates 
                    WHERE original_video_id = ? AND duplicate_video_id = ?
                `).run(originalId, duplicateId);
                
            })();

            return { success: true };
        } catch (error) {
            console.error('Error resolving duplicate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    async ignoreDuplicate(originalId: string, duplicateId: string): Promise<{success: boolean; error?: string}> {
        if (!this.db) {
            return { success: false, error: 'Database not initialized' };
        }

        try {
            this.db.prepare(`
                UPDATE video_duplicates 
                SET ignored_by_user = TRUE 
                WHERE original_video_id = ? AND duplicate_video_id = ?
            `).run(originalId, duplicateId);

            return { success: true };
        } catch (error) {
            console.error('Error ignoring duplicate:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    async checkBeforeDownload(videoUrl: string, videoTitle: string): Promise<{hasDuplicates: boolean; suggestions: VideoInfo[]}> {
        if (!this.db) {
            return { hasDuplicates: false, suggestions: [] };
        }

        try {
            // Extract video ID from URL if possible
            const videoId = this.extractVideoIdFromUrl(videoUrl);
            
            let suggestions: VideoInfo[] = [];
            
            // Check for exact video ID match
            if (videoId) {
                const exactMatches = this.db.prepare(`
                    SELECT id, video_id, title, url, playlist_id, created_at
                    FROM videos 
                    WHERE video_id = ?
                `).all(videoId) as VideoInfo[];
                
                suggestions.push(...exactMatches);
            }
            
            // Check for URL match
            const urlMatches = this.db.prepare(`
                SELECT id, video_id, title, url, playlist_id, created_at
                FROM videos 
                WHERE url = ?
            `).all(videoUrl) as VideoInfo[];
            
            suggestions.push(...urlMatches);
            
            // Check for title similarity (high threshold for suggestions)
            if (videoTitle) {
                const titleMatches = this.db.prepare(`
                    SELECT id, video_id, title, url, playlist_id, created_at
                    FROM videos 
                    WHERE title IS NOT NULL
                `).all() as VideoInfo[];
                
                for (const video of titleMatches) {
                    const similarity = this.calculateTitleSimilarity(videoTitle, video.title);
                    if (similarity >= 0.9) { // High threshold for pre-download suggestions
                        suggestions.push(video);
                    }
                }
            }
            
            // Remove duplicates from suggestions
            const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
                index === self.findIndex(s => s.id === suggestion.id)
            );

            return {
                hasDuplicates: uniqueSuggestions.length > 0,
                suggestions: uniqueSuggestions
            };
        } catch (error) {
            console.error('Error checking for duplicates before download:', error);
            return { hasDuplicates: false, suggestions: [] };
        }
    }

    private extractVideoIdFromUrl(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
        }
        
        return null;
    }

    async updateFileHash(videoId: string, filePath: string): Promise<{success: boolean; error?: string}> {
        if (!this.db) {
            return { success: false, error: 'Database not initialized' };
        }

        try {
            // This would hash the file and store it
            // For now, just acknowledge the request
            console.log(`File hash update requested for video ${videoId} at ${filePath}`);
            return { success: true };
        } catch (error) {
            console.error('Error updating file hash:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    async bulkResolveDuplicates(resolutions: Array<{originalId: string, duplicateId: string, action: string}>): Promise<{success: boolean; resolved: number; error?: string}> {
        if (!this.db) {
            return { success: false, resolved: 0, error: 'Database not initialized' };
        }

        try {
            let resolved = 0;
            
            this.db.transaction(() => {
                for (const resolution of resolutions) {
                    try {
                        this.resolveDuplicate(resolution.originalId, resolution.duplicateId, resolution.action as any);
                        resolved++;
                    } catch (error) {
                        console.error('Error resolving individual duplicate:', error);
                    }
                }
            })();

            return { success: true, resolved };
        } catch (error) {
            console.error('Error bulk resolving duplicates:', error);
            return { success: false, resolved: 0, error: (error as Error).message };
        }
    }

    /**
     * Cleanup method for graceful shutdown
     */
    async cleanup(): Promise<void> {
        try {
            console.log('Cleaning up duplicate detection handler...');
            
            // Close database connections
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // Remove all IPC handlers
            ipcMain.removeHandler('duplicates:scan');
            ipcMain.removeHandler('duplicates:getDuplicateGroups');
            ipcMain.removeHandler('duplicates:resolveDuplicate');
            ipcMain.removeHandler('duplicates:bulkResolve');
            ipcMain.removeHandler('duplicates:ignoreDuplicate');
            ipcMain.removeHandler('duplicates:getStats');
            ipcMain.removeHandler('duplicates:checkBeforeDownload');
            
            console.log('Duplicate detection handler cleanup completed');
        } catch (error) {
            console.error('Error during duplicate detection handler cleanup:', error);
        }
    }
}

export default DuplicateDetectionHandler;
