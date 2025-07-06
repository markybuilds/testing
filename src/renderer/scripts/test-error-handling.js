// Test script for demonstrating the error handling system
// This is for development and testing purposes only

class ErrorHandlingTest {
    constructor() {
        this.errorManager = null;
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        // Initialize error manager
        this.errorManager = new ErrorManager();
        this.errorManager.setupGlobalHandlers();
        
        console.log('Error handling test system initialized');
        
        // Add test buttons to the interface (development only)
        this.addTestButtons();
    }

    addTestButtons() {
        // Create a test panel
        const testPanel = document.createElement('div');
        testPanel.id = 'error-test-panel';
        testPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: var(--bg-secondary);
            border: 2px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            max-width: 300px;
        `;
        
        testPanel.innerHTML = `
            <h4 style="margin: 0 0 12px 0; color: var(--text-primary);">Error Testing Panel</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button id="test-network-error" class="test-btn">Test Network Error</button>
                <button id="test-youtube-error" class="test-btn">Test YouTube Error</button>
                <button id="test-download-error" class="test-btn">Test Download Error</button>
                <button id="test-database-error" class="test-btn">Test Database Error</button>
                <button id="test-success-notification" class="test-btn">Test Success</button>
                <button id="test-warning-notification" class="test-btn">Test Warning</button>
                <button id="show-error-history" class="test-btn">Show Error History</button>
                <button id="clear-error-history" class="test-btn">Clear History</button>
                <button id="hide-test-panel" class="test-btn" style="background: #e74c3c;">Hide Panel</button>
            </div>
        `;
        
        // Add styles for test buttons
        const style = document.createElement('style');
        style.textContent = `
            .test-btn {
                padding: 6px 12px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-primary);
                color: var(--text-primary);
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s ease;
            }
            .test-btn:hover {
                background: var(--bg-hover);
                border-color: var(--accent-color);
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(testPanel);
        
        // Add event listeners
        this.setupTestEventListeners();
    }

    setupTestEventListeners() {
        document.getElementById('test-network-error').addEventListener('click', () => {
            this.testNetworkError();
        });

        document.getElementById('test-youtube-error').addEventListener('click', () => {
            this.testYouTubeError();
        });

        document.getElementById('test-download-error').addEventListener('click', () => {
            this.testDownloadError();
        });

        document.getElementById('test-database-error').addEventListener('click', () => {
            this.testDatabaseError();
        });

        document.getElementById('test-success-notification').addEventListener('click', () => {
            this.testSuccessNotification();
        });

        document.getElementById('test-warning-notification').addEventListener('click', () => {
            this.testWarningNotification();
        });

        document.getElementById('show-error-history').addEventListener('click', () => {
            this.errorManager.showErrorHistory();
        });

        document.getElementById('clear-error-history').addEventListener('click', () => {
            this.errorManager.clearErrorHistory();
        });

        document.getElementById('hide-test-panel').addEventListener('click', () => {
            document.getElementById('error-test-panel').style.display = 'none';
        });
    }

    testNetworkError() {
        const error = new Error('Failed to connect to YouTube servers');
        error.code = 'NETWORK_ERROR';
        error.status = 503;
        
        this.errorManager.handleError(error, 'network', {
            operation: 'fetchPlaylist',
            url: 'https://youtube.com/api/playlist/123',
            userMessage: 'Unable to connect to YouTube. Please check your internet connection.',
            retryable: true,
            retryAction: () => {
                this.errorManager.showNotification('Retrying network operation...', 'info');
                setTimeout(() => {
                    this.errorManager.showNotification('Network operation completed successfully', 'success');
                }, 2000);
            }
        });
    }

    testYouTubeError() {
        const error = new Error('Video is private or unavailable');
        error.code = 'VIDEO_UNAVAILABLE';
        
        this.errorManager.handleError(error, 'youtube', {
            operation: 'getVideoInfo',
            videoId: 'dQw4w9WgXcQ',
            userMessage: 'This video is private or has been removed by the owner.',
            retryable: false,
            suggestions: [
                'Try a different video URL',
                'Check if the video is still available on YouTube',
                'Contact the video owner if you believe this is an error'
            ]
        });
    }

    testDownloadError() {
        const error = new Error('Insufficient disk space');
        error.code = 'ENOSPC';
        
        this.errorManager.handleError(error, 'download', {
            operation: 'downloadVideo',
            videoTitle: 'Test Video - Amazing Content',
            userMessage: 'Download failed due to insufficient disk space.',
            retryable: true,
            retryAction: () => {
                this.errorManager.showNotification('Retrying download with lower quality...', 'info');
                setTimeout(() => {
                    this.errorManager.showNotification('Download completed successfully', 'success');
                }, 3000);
            },
            suggestions: [
                'Free up disk space and try again',
                'Choose a lower quality format',
                'Change the download location to a drive with more space'
            ]
        });
    }

    testDatabaseError() {
        const error = new Error('Database is locked');
        error.code = 'SQLITE_BUSY';
        
        this.errorManager.handleError(error, 'database', {
            operation: 'savePlaylist',
            playlistId: 123,
            userMessage: 'Unable to save playlist data. Database is temporarily busy.',
            retryable: true,
            retryAction: () => {
                this.errorManager.showNotification('Retrying database operation...', 'info');
                setTimeout(() => {
                    this.errorManager.showNotification('Playlist saved successfully', 'success');
                }, 1500);
            }
        });
    }

    testSuccessNotification() {
        this.errorManager.showNotification(
            'Playlist "My Awesome Videos" has been successfully imported with 25 videos!',
            'success'
        );
    }

    testWarningNotification() {
        this.errorManager.showNotification(
            'Some videos in the playlist may be region-blocked and might not download properly.',
            'warning'
        );
    }

    // Utility method to trigger unhandled errors for testing global handlers
    testUnhandledError() {
        setTimeout(() => {
            throw new Error('This is a test unhandled error');
        }, 100);
    }

    testUnhandledPromiseRejection() {
        Promise.reject(new Error('This is a test unhandled promise rejection'));
    }
}

// Initialize test system when DOM is ready
const errorTest = new ErrorHandlingTest();
errorTest.init();

// Expose to global scope for console testing
window.errorTest = errorTest;

// Console testing examples
console.log(`
🧪 Error Handling Test System Loaded!

Try these commands in the console:
- errorTest.testNetworkError()
- errorTest.testYouTubeError() 
- errorTest.testDownloadError()
- errorTest.testDatabaseError()
- errorTest.testUnhandledError()
- errorTest.testUnhandledPromiseRejection()

Or use the test panel in the bottom-left corner.
`);
