/**
 * ErrorManager - Comprehensive error handling system with user-friendly messages and retry mechanisms
 * Provides centralized error management, notification display, and recovery options
 */

class ErrorManager {
    constructor() {
        this.isInitialized = false;
        this.errorHistory = [];
        this.retryAttempts = new Map(); // Track retry attempts for operations
        this.errorCallbacks = new Map(); // Store callbacks for different error types
        this.notificationQueue = [];
        this.activeNotifications = new Set();
        this.maxRetryAttempts = 3;
        this.retryDelay = 1000; // Base delay in ms
        
        // Error type definitions with user-friendly messages and recovery options
        this.errorTypes = {
            NETWORK_ERROR: {
                title: 'Network Connection Error',
                icon: '🌐',
                defaultMessage: 'Unable to connect to the internet. Please check your connection.',
                retryable: true,
                severity: 'error',
                category: 'network'
            },
            YOUTUBE_API_ERROR: {
                title: 'YouTube Service Error',
                icon: '📺',
                defaultMessage: 'Unable to access YouTube services. This may be temporary.',
                retryable: true,
                severity: 'error',
                category: 'youtube'
            },
            DOWNLOAD_ERROR: {
                title: 'Download Failed',
                icon: '⬇️',
                defaultMessage: 'Failed to download the video. The video might be unavailable.',
                retryable: true,
                severity: 'error',
                category: 'download'
            },
            DATABASE_ERROR: {
                title: 'Database Error',
                icon: '💾',
                defaultMessage: 'Unable to save or retrieve data. Please try again.',
                retryable: true,
                severity: 'error',
                category: 'database'
            },
            FILE_SYSTEM_ERROR: {
                title: 'File System Error',
                icon: '📁',
                defaultMessage: 'Unable to access files or folders. Check permissions.',
                retryable: false,
                severity: 'error',
                category: 'filesystem'
            },
            VALIDATION_ERROR: {
                title: 'Invalid Input',
                icon: '⚠️',
                defaultMessage: 'Please check your input and try again.',
                retryable: false,
                severity: 'warning',
                category: 'validation'
            },
            FFMPEG_ERROR: {
                title: 'Video Conversion Error',
                icon: '🎬',
                defaultMessage: 'Failed to convert video. The file might be corrupted.',
                retryable: true,
                severity: 'error',
                category: 'conversion'
            },
            PERMISSION_ERROR: {
                title: 'Permission Denied',
                icon: '🔒',
                defaultMessage: 'Insufficient permissions to perform this action.',
                retryable: false,
                severity: 'error',
                category: 'permission'
            },
            STORAGE_ERROR: {
                title: 'Storage Error',
                icon: '💿',
                defaultMessage: 'Not enough disk space or storage is unavailable.',
                retryable: false,
                severity: 'error',
                category: 'storage'
            },
            UNKNOWN_ERROR: {
                title: 'Unexpected Error',
                icon: '❓',
                defaultMessage: 'An unexpected error occurred. Please try again.',
                retryable: true,
                severity: 'error',
                category: 'unknown'
            }
        };
        
        // Common error patterns and their classifications
        this.errorPatterns = [
            {
                pattern: /network|connection|timeout|ENOTFOUND|ECONNREFUSED/i,
                type: 'NETWORK_ERROR'
            },
            {
                pattern: /youtube|yt-dlp|403|404|video.*unavailable|private.*video/i,
                type: 'YOUTUBE_API_ERROR'
            },
            {
                pattern: /download.*failed|unable.*download|ERROR.*downloading/i,
                type: 'DOWNLOAD_ERROR'
            },
            {
                pattern: /database|sqlite|SQLITE_/i,
                type: 'DATABASE_ERROR'
            },
            {
                pattern: /ENOENT|EACCES|file.*not.*found|permission.*denied/i,
                type: 'FILE_SYSTEM_ERROR'
            },
            {
                pattern: /ENOSPC|disk.*full|no.*space/i,
                type: 'STORAGE_ERROR'
            },
            {
                pattern: /ffmpeg|conversion.*failed|codec.*error/i,
                type: 'FFMPEG_ERROR'
            },
            {
                pattern: /validation|invalid.*input|required.*field/i,
                type: 'VALIDATION_ERROR'
            }
        ];
    }

    /**
     * Initialize the error handling system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Create error notification container
            this.createErrorNotificationContainer();
            
            // Setup global error handlers
            this.setupGlobalErrorHandlers();
            
            // Load error history
            await this.loadErrorHistory();
            
            // Setup cleanup intervals
            this.setupCleanupIntervals();
            
            this.isInitialized = true;
            console.log('ErrorManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize ErrorManager:', error);
            throw error;
        }
    }

    /**
     * Create the error notification container
     */
    createErrorNotificationContainer() {
        if (document.getElementById('error-notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'error-notification-container';
        container.className = 'error-notification-container';
        container.innerHTML = `
            <div id="error-notifications" class="error-notifications">
                <!-- Error notifications will be inserted here -->
            </div>
            
            <!-- Error Details Modal -->
            <div id="error-details-modal" class="modal error-details-modal">
                <div class="modal-content error-details-content">
                    <div class="modal-header">
                        <h3 id="error-details-title">Error Details</h3>
                        <button class="modal-close error-details-close">&times;</button>
                    </div>
                    <div class="modal-body error-details-body">
                        <div class="error-details-info">
                            <div class="error-details-section">
                                <h4>Error Information</h4>
                                <div class="error-info-grid">
                                    <div class="error-info-item">
                                        <label>Type:</label>
                                        <span id="error-details-type">Unknown</span>
                                    </div>
                                    <div class="error-info-item">
                                        <label>Occurred:</label>
                                        <span id="error-details-time">Unknown</span>
                                    </div>
                                    <div class="error-info-item">
                                        <label>Category:</label>
                                        <span id="error-details-category">Unknown</span>
                                    </div>
                                    <div class="error-info-item">
                                        <label>Retry Attempts:</label>
                                        <span id="error-details-attempts">0</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="error-details-section">
                                <h4>Description</h4>
                                <div id="error-details-message" class="error-details-message">
                                    No details available
                                </div>
                            </div>
                            
                            <div class="error-details-section">
                                <h4>Technical Details</h4>
                                <div class="error-technical-details">
                                    <textarea id="error-details-stack" class="error-stack-trace" readonly>
                                        No technical details available
                                    </textarea>
                                </div>
                            </div>
                            
                            <div class="error-details-section">
                                <h4>Suggested Actions</h4>
                                <div id="error-details-suggestions" class="error-suggestions">
                                    <ul>
                                        <li>Try refreshing the page or restarting the application</li>
                                        <li>Check your internet connection</li>
                                        <li>Contact support if the problem persists</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer error-details-footer">
                        <button id="copy-error-details" class="btn btn-outline">📋 Copy Details</button>
                        <button id="retry-from-details" class="btn btn-primary" style="display: none;">🔄 Retry</button>
                        <button class="btn btn-secondary error-details-close">Close</button>
                    </div>
                </div>
            </div>
            
            <!-- Error History Modal -->
            <div id="error-history-modal" class="modal error-history-modal">
                <div class="modal-content error-history-content">
                    <div class="modal-header">
                        <h3>Error History</h3>
                        <button class="modal-close error-history-close">&times;</button>
                    </div>
                    <div class="modal-body error-history-body">
                        <div class="error-history-controls">
                            <div class="error-history-filters">
                                <select id="error-history-category" class="error-history-filter">
                                    <option value="">All Categories</option>
                                    <option value="network">Network</option>
                                    <option value="youtube">YouTube</option>
                                    <option value="download">Download</option>
                                    <option value="database">Database</option>
                                    <option value="filesystem">File System</option>
                                    <option value="conversion">Conversion</option>
                                    <option value="other">Other</option>
                                </select>
                                <select id="error-history-severity" class="error-history-filter">
                                    <option value="">All Severities</option>
                                    <option value="error">Error</option>
                                    <option value="warning">Warning</option>
                                    <option value="info">Info</option>
                                </select>
                                <button id="clear-error-history" class="btn btn-outline">Clear History</button>
                            </div>
                        </div>
                        <div id="error-history-list" class="error-history-list">
                            <!-- Error history items will be inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="export-error-history" class="btn btn-outline">📤 Export</button>
                        <button class="btn btn-secondary error-history-close">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.setupErrorModalEventListeners();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Global JavaScript error handler
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'UNKNOWN_ERROR',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error ? event.error.stack : null
            });
        });

        // Global promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'UNKNOWN_ERROR',
                message: event.reason.message || 'Unhandled promise rejection',
                stack: event.reason.stack || null,
                promise: true
            });
        });

        // Console error override for capturing application errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
            
            // Only capture errors that look like actual errors
            if (args.length > 0 && (args[0] instanceof Error || typeof args[0] === 'string')) {
                this.handleError({
                    type: 'UNKNOWN_ERROR',
                    message: args[0].toString(),
                    stack: args[0].stack || null,
                    source: 'console.error'
                });
            }
        };
    }

    /**
     * Setup event listeners for error modals
     */
    setupErrorModalEventListeners() {
        // Error details modal
        document.querySelectorAll('.error-details-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeErrorDetailsModal());
        });

        document.getElementById('copy-error-details').addEventListener('click', () => {
            this.copyErrorDetails();
        });

        document.getElementById('retry-from-details').addEventListener('click', () => {
            this.retryFromDetails();
        });

        // Error history modal
        document.querySelectorAll('.error-history-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeErrorHistoryModal());
        });

        document.getElementById('clear-error-history').addEventListener('click', () => {
            this.clearErrorHistory();
        });

        document.getElementById('export-error-history').addEventListener('click', () => {
            this.exportErrorHistory();
        });

        // History filters
        document.getElementById('error-history-category').addEventListener('change', () => {
            this.filterErrorHistory();
        });

        document.getElementById('error-history-severity').addEventListener('change', () => {
            this.filterErrorHistory();
        });
    }

    /**
     * Handle an error with comprehensive processing
     */
    async handleError(errorData, context = {}) {
        try {
            // Normalize error data
            const error = this.normalizeError(errorData);
            
            // Classify error type
            const errorType = this.classifyError(error);
            
            // Create error record
            const errorRecord = {
                id: this.generateErrorId(),
                type: errorType,
                message: error.message,
                stack: error.stack,
                context: context,
                timestamp: new Date().toISOString(),
                severity: this.errorTypes[errorType].severity,
                category: this.errorTypes[errorType].category,
                retryable: this.errorTypes[errorType].retryable,
                retryAttempts: this.getRetryAttempts(context.operationId) || 0,
                resolved: false
            };
            
            // Add to error history
            this.addToErrorHistory(errorRecord);
            
            // Show notification if appropriate
            if (this.shouldShowNotification(errorRecord)) {
                this.showErrorNotification(errorRecord);
            }
            
            // Log error for debugging
            this.logError(errorRecord);
            
            // Execute error callbacks if any
            this.executeErrorCallbacks(errorRecord);
            
            return errorRecord;
            
        } catch (handlingError) {
            console.error('Error while handling error:', handlingError);
        }
    }

    /**
     * Normalize error data to a consistent format
     */
    normalizeError(errorData) {
        if (errorData instanceof Error) {
            return {
                message: errorData.message,
                stack: errorData.stack,
                name: errorData.name
            };
        }
        
        if (typeof errorData === 'string') {
            return {
                message: errorData,
                stack: null,
                name: 'Error'
            };
        }
        
        if (typeof errorData === 'object' && errorData !== null) {
            return {
                message: errorData.message || 'Unknown error',
                stack: errorData.stack || null,
                name: errorData.name || 'Error',
                ...errorData
            };
        }
        
        return {
            message: 'Unknown error occurred',
            stack: null,
            name: 'Error'
        };
    }

    /**
     * Classify error type based on patterns
     */
    classifyError(error) {
        const errorText = `${error.message} ${error.stack || ''}`;
        
        for (const pattern of this.errorPatterns) {
            if (pattern.pattern.test(errorText)) {
                return pattern.type;
            }
        }
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * Show error notification to user
     */
    showErrorNotification(errorRecord) {
        const errorType = this.errorTypes[errorRecord.type];
        const notificationId = `error-notification-${errorRecord.id}`;
        
        // Don't show duplicate notifications
        if (this.activeNotifications.has(notificationId)) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `error-notification error-${errorRecord.severity} error-category-${errorRecord.category}`;
        
        notification.innerHTML = `
            <div class="error-notification-content">
                <div class="error-notification-header">
                    <div class="error-notification-icon">${errorType.icon}</div>
                    <div class="error-notification-title">${errorType.title}</div>
                    <div class="error-notification-actions">
                        ${errorRecord.retryable ? `<button class="error-notification-retry" data-error-id="${errorRecord.id}">🔄</button>` : ''}
                        <button class="error-notification-details" data-error-id="${errorRecord.id}">ℹ️</button>
                        <button class="error-notification-close" data-error-id="${errorRecord.id}">&times;</button>
                    </div>
                </div>
                <div class="error-notification-message">
                    ${this.generateUserFriendlyMessage(errorRecord)}
                </div>
                ${errorRecord.retryable && errorRecord.retryAttempts > 0 ? 
                    `<div class="error-notification-retry-info">Retry attempt ${errorRecord.retryAttempts}/${this.maxRetryAttempts}</div>` : 
                    ''
                }
                <div class="error-notification-time">
                    ${this.formatTimeAgo(errorRecord.timestamp)}
                </div>
            </div>
            <div class="error-notification-progress"></div>
        `;
        
        // Add event listeners
        notification.querySelector('.error-notification-close').addEventListener('click', () => {
            this.dismissNotification(notificationId);
        });
        
        notification.querySelector('.error-notification-details').addEventListener('click', () => {
            this.showErrorDetails(errorRecord);
        });
        
        const retryBtn = notification.querySelector('.error-notification-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retryOperation(errorRecord);
            });
        }
        
        // Add to container
        const container = document.getElementById('error-notifications');
        container.appendChild(notification);
        
        // Track active notification
        this.activeNotifications.add(notificationId);
        
        // Auto-dismiss after delay (unless it's a critical error)
        if (errorRecord.severity !== 'error') {
            setTimeout(() => {
                this.dismissNotification(notificationId);
            }, 5000);
        }
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('error-notification-show');
        }, 100);
    }

    /**
     * Generate user-friendly error message
     */
    generateUserFriendlyMessage(errorRecord) {
        const errorType = this.errorTypes[errorRecord.type];
        let message = errorType.defaultMessage;
        
        // Customize message based on context
        if (errorRecord.context) {
            switch (errorRecord.type) {
                case 'DOWNLOAD_ERROR':
                    if (errorRecord.context.videoTitle) {
                        message = `Failed to download "${errorRecord.context.videoTitle}". The video might be unavailable or restricted.`;
                    }
                    break;
                case 'YOUTUBE_API_ERROR':
                    if (errorRecord.message.includes('403')) {
                        message = 'YouTube blocked the request. Please wait a few minutes before trying again.';
                    } else if (errorRecord.message.includes('404')) {
                        message = 'The requested video or playlist was not found. It may have been deleted or made private.';
                    }
                    break;
                case 'NETWORK_ERROR':
                    message = 'Network connection failed. Please check your internet connection and try again.';
                    break;
                case 'STORAGE_ERROR':
                    message = 'Not enough disk space available. Please free up some space and try again.';
                    break;
            }
        }
        
        return message;
    }

    /**
     * Retry an operation with exponential backoff
     */
    async retryOperation(errorRecord) {
        const operationId = errorRecord.context.operationId;
        if (!operationId) {
            console.warn('Cannot retry operation: no operation ID provided');
            return;
        }
        
        const currentAttempts = this.getRetryAttempts(operationId);
        if (currentAttempts >= this.maxRetryAttempts) {
            this.showErrorNotification({
                ...errorRecord,
                type: 'VALIDATION_ERROR',
                message: 'Maximum retry attempts reached. Please try again later.'
            });
            return;
        }
        
        // Increment retry attempts
        this.setRetryAttempts(operationId, currentAttempts + 1);
        
        // Calculate delay with exponential backoff
        const delay = this.retryDelay * Math.pow(2, currentAttempts);
        
        // Show retry notification
        this.showRetryNotification(errorRecord, delay);
        
        // Wait for delay
        await this.sleep(delay);
        
        // Execute retry callback if available
        const retryCallback = this.errorCallbacks.get(`retry:${operationId}`);
        if (retryCallback) {
            try {
                await retryCallback(errorRecord);
                // Reset retry attempts on success
                this.setRetryAttempts(operationId, 0);
            } catch (retryError) {
                // Handle retry failure
                this.handleError(retryError, {
                    ...errorRecord.context,
                    retryAttempt: currentAttempts + 1
                });
            }
        }
    }

    /**
     * Show retry notification
     */
    showRetryNotification(errorRecord, delay) {
        const notification = document.createElement('div');
        notification.className = 'error-notification error-info retry-notification';
        notification.innerHTML = `
            <div class="error-notification-content">
                <div class="error-notification-header">
                    <div class="error-notification-icon">🔄</div>
                    <div class="error-notification-title">Retrying Operation</div>
                </div>
                <div class="error-notification-message">
                    Retrying in ${Math.ceil(delay / 1000)} seconds...
                </div>
            </div>
        `;
        
        const container = document.getElementById('error-notifications');
        container.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, delay);
    }

    /**
     * Show error details modal
     */
    showErrorDetails(errorRecord) {
        const modal = document.getElementById('error-details-modal');
        const errorType = this.errorTypes[errorRecord.type];
        
        // Populate modal content
        document.getElementById('error-details-title').textContent = `${errorType.icon} ${errorType.title}`;
        document.getElementById('error-details-type').textContent = errorRecord.type;
        document.getElementById('error-details-time').textContent = new Date(errorRecord.timestamp).toLocaleString();
        document.getElementById('error-details-category').textContent = errorRecord.category;
        document.getElementById('error-details-attempts').textContent = errorRecord.retryAttempts;
        document.getElementById('error-details-message').textContent = this.generateUserFriendlyMessage(errorRecord);
        document.getElementById('error-details-stack').value = errorRecord.stack || 'No technical details available';
        
        // Show retry button if applicable
        const retryBtn = document.getElementById('retry-from-details');
        if (errorRecord.retryable && errorRecord.context.operationId) {
            retryBtn.style.display = 'inline-block';
            retryBtn.onclick = () => {
                this.retryOperation(errorRecord);
                this.closeErrorDetailsModal();
            };
        } else {
            retryBtn.style.display = 'none';
        }
        
        // Generate suggestions
        const suggestions = this.generateErrorSuggestions(errorRecord);
        document.getElementById('error-details-suggestions').innerHTML = suggestions;
        
        // Store current error for copying
        this.currentErrorDetails = errorRecord;
        
        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Generate error suggestions based on error type
     */
    generateErrorSuggestions(errorRecord) {
        const suggestions = [];
        
        switch (errorRecord.type) {
            case 'NETWORK_ERROR':
                suggestions.push(
                    'Check your internet connection',
                    'Try disabling VPN or proxy if enabled',
                    'Wait a few minutes and try again',
                    'Check if YouTube is accessible in your browser'
                );
                break;
            case 'YOUTUBE_API_ERROR':
                suggestions.push(
                    'Wait 10-15 minutes before trying again',
                    'Check if the video/playlist URL is still valid',
                    'Try using a different video or playlist',
                    'Update yt-dlp to the latest version'
                );
                break;
            case 'DOWNLOAD_ERROR':
                suggestions.push(
                    'Check available disk space',
                    'Verify the download folder exists and is writable',
                    'Try a different video quality/format',
                    'Check if the video is geo-restricted'
                );
                break;
            case 'DATABASE_ERROR':
                suggestions.push(
                    'Restart the application',
                    'Check if the database file is not corrupted',
                    'Ensure sufficient disk space',
                    'Contact support if the problem persists'
                );
                break;
            case 'FILE_SYSTEM_ERROR':
                suggestions.push(
                    'Check file and folder permissions',
                    'Ensure the target directory exists',
                    'Try running the application as administrator',
                    'Check available disk space'
                );
                break;
            case 'FFMPEG_ERROR':
                suggestions.push(
                    'Check if FFmpeg is properly installed',
                    'Try a different output format',
                    'Verify the input file is not corrupted',
                    'Update FFmpeg to the latest version'
                );
                break;
            default:
                suggestions.push(
                    'Try refreshing the page or restarting the application',
                    'Check your internet connection',
                    'Wait a few minutes and try again',
                    'Contact support if the problem persists'
                );
        }
        
        return '<ul>' + suggestions.map(suggestion => `<li>${suggestion}</li>`).join('') + '</ul>';
    }

    /**
     * Copy error details to clipboard
     */
    async copyErrorDetails() {
        if (!this.currentErrorDetails) return;
        
        const errorInfo = `
Error Report - YouTube Playlist Manager
Generated: ${new Date().toISOString()}

Error Type: ${this.currentErrorDetails.type}
Category: ${this.currentErrorDetails.category}
Severity: ${this.currentErrorDetails.severity}
Occurred: ${this.currentErrorDetails.timestamp}
Retry Attempts: ${this.currentErrorDetails.retryAttempts}

Message:
${this.currentErrorDetails.message}

Technical Details:
${this.currentErrorDetails.stack || 'No technical details available'}

Context:
${JSON.stringify(this.currentErrorDetails.context, null, 2)}
        `.trim();
        
        try {
            await navigator.clipboard.writeText(errorInfo);
            this.showSuccessNotification('Error details copied to clipboard');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showErrorNotification({
                type: 'UNKNOWN_ERROR',
                message: 'Failed to copy to clipboard'
            });
        }
    }

    /**
     * Show error history modal
     */
    showErrorHistoryModal() {
        const modal = document.getElementById('error-history-modal');
        this.renderErrorHistory();
        modal.style.display = 'flex';
    }

    /**
     * Render error history list
     */
    renderErrorHistory() {
        const container = document.getElementById('error-history-list');
        const categoryFilter = document.getElementById('error-history-category').value;
        const severityFilter = document.getElementById('error-history-severity').value;
        
        let filteredHistory = this.errorHistory;
        
        if (categoryFilter) {
            filteredHistory = filteredHistory.filter(error => error.category === categoryFilter);
        }
        
        if (severityFilter) {
            filteredHistory = filteredHistory.filter(error => error.severity === severityFilter);
        }
        
        if (filteredHistory.length === 0) {
            container.innerHTML = `
                <div class="error-history-empty">
                    <div class="error-history-empty-icon">✅</div>
                    <h4>No errors found</h4>
                    <p>No errors match your current filter criteria</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredHistory.map(error => this.createErrorHistoryItem(error)).join('');
        
        // Add event listeners for history items
        container.querySelectorAll('.error-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const errorId = item.dataset.errorId;
                const errorRecord = this.errorHistory.find(e => e.id === errorId);
                if (errorRecord) {
                    this.showErrorDetails(errorRecord);
                }
            });
        });
    }

    /**
     * Create error history item HTML
     */
    createErrorHistoryItem(errorRecord) {
        const errorType = this.errorTypes[errorRecord.type];
        const timeAgo = this.formatTimeAgo(errorRecord.timestamp);
        
        return `
            <div class="error-history-item error-severity-${errorRecord.severity}" data-error-id="${errorRecord.id}">
                <div class="error-history-icon">${errorType.icon}</div>
                <div class="error-history-content">
                    <div class="error-history-title">${errorType.title}</div>
                    <div class="error-history-message">${errorRecord.message}</div>
                    <div class="error-history-meta">
                        <span class="error-history-time">${timeAgo}</span>
                        <span class="error-history-category">${errorRecord.category}</span>
                        ${errorRecord.retryAttempts > 0 ? `<span class="error-history-retries">${errorRecord.retryAttempts} retries</span>` : ''}
                    </div>
                </div>
                <div class="error-history-actions">
                    ${errorRecord.retryable ? '<button class="btn btn-icon" title="Retry">🔄</button>' : ''}
                    <button class="btn btn-icon" title="Details">ℹ️</button>
                </div>
            </div>
        `;
    }

    /**
     * Register error callback for specific operations
     */
    registerErrorCallback(operationId, callback) {
        this.errorCallbacks.set(`retry:${operationId}`, callback);
    }

    /**
     * Register operation for retry tracking
     */
    registerOperation(operationId) {
        this.setRetryAttempts(operationId, 0);
    }

    /**
     * Utility methods
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getRetryAttempts(operationId) {
        return this.retryAttempts.get(operationId) || 0;
    }

    setRetryAttempts(operationId, attempts) {
        this.retryAttempts.set(operationId, attempts);
    }

    addToErrorHistory(errorRecord) {
        this.errorHistory.unshift(errorRecord);
        
        // Keep only last 100 errors
        if (this.errorHistory.length > 100) {
            this.errorHistory = this.errorHistory.slice(0, 100);
        }
        
        this.saveErrorHistory();
    }

    shouldShowNotification(errorRecord) {
        // Don't show notifications for validation errors that are very recent
        if (errorRecord.type === 'VALIDATION_ERROR') {
            const recentValidationErrors = this.errorHistory.filter(e => 
                e.type === 'VALIDATION_ERROR' && 
                Date.now() - new Date(e.timestamp).getTime() < 5000
            );
            return recentValidationErrors.length <= 1;
        }
        
        return true;
    }

    logError(errorRecord) {
        const errorType = this.errorTypes[errorRecord.type];
        console.group(`${errorType.icon} ${errorType.title}`);
        console.error('Message:', errorRecord.message);
        console.error('Type:', errorRecord.type);
        console.error('Category:', errorRecord.category);
        console.error('Context:', errorRecord.context);
        if (errorRecord.stack) {
            console.error('Stack:', errorRecord.stack);
        }
        console.groupEnd();
    }

    executeErrorCallbacks(errorRecord) {
        const callback = this.errorCallbacks.get(`error:${errorRecord.type}`);
        if (callback) {
            try {
                callback(errorRecord);
            } catch (callbackError) {
                console.error('Error callback failed:', callbackError);
            }
        }
    }

    dismissNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.classList.add('error-notification-hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.activeNotifications.delete(notificationId);
            }, 300);
        }
    }

    closeErrorDetailsModal() {
        document.getElementById('error-details-modal').style.display = 'none';
        this.currentErrorDetails = null;
    }

    closeErrorHistoryModal() {
        document.getElementById('error-history-modal').style.display = 'none';
    }

    filterErrorHistory() {
        this.renderErrorHistory();
    }

    clearErrorHistory() {
        if (confirm('Are you sure you want to clear all error history?')) {
            this.errorHistory = [];
            this.saveErrorHistory();
            this.renderErrorHistory();
        }
    }

    async exportErrorHistory() {
        try {
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: await window.electronAPI.getVersion(),
                errors: this.errorHistory
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `error-history-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccessNotification('Error history exported successfully');
        } catch (error) {
            this.handleError(error, { operation: 'export_error_history' });
        }
    }

    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification error-success';
        notification.innerHTML = `
            <div class="error-notification-content">
                <div class="error-notification-header">
                    <div class="error-notification-icon">✅</div>
                    <div class="error-notification-title">Success</div>
                    <button class="error-notification-close">&times;</button>
                </div>
                <div class="error-notification-message">${message}</div>
            </div>
        `;
        
        notification.querySelector('.error-notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        document.getElementById('error-notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('error-notification-show');
        }, 100);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    async loadErrorHistory() {
        try {
            const history = localStorage.getItem('errorHistory');
            if (history) {
                this.errorHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Failed to load error history:', error);
            this.errorHistory = [];
        }
    }

    saveErrorHistory() {
        try {
            localStorage.setItem('errorHistory', JSON.stringify(this.errorHistory));
        } catch (error) {
            console.error('Failed to save error history:', error);
        }
    }

    setupCleanupIntervals() {
        // Clean up old notifications every 30 seconds
        setInterval(() => {
            this.cleanupOldNotifications();
        }, 30000);
        
        // Clean up retry attempts every 5 minutes
        setInterval(() => {
            this.cleanupOldRetryAttempts();
        }, 300000);
    }

    cleanupOldNotifications() {
        const notifications = document.querySelectorAll('.error-notification');
        notifications.forEach(notification => {
            if (notification.classList.contains('error-notification-hide')) {
                notification.remove();
            }
        });
    }

    cleanupOldRetryAttempts() {
        // Remove retry attempts older than 1 hour
        const cutoff = Date.now() - 3600000;
        for (const [operationId, timestamp] of this.retryAttempts.entries()) {
            if (timestamp < cutoff) {
                this.retryAttempts.delete(operationId);
            }
        }
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return time.toLocaleDateString();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.saveErrorHistory();
        this.retryAttempts.clear();
        this.errorCallbacks.clear();
        this.activeNotifications.clear();
        this.isInitialized = false;
    }
}

// Global error manager instance
window.errorManager = new ErrorManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorManager;
}
