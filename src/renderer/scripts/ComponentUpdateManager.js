// Component Update Manager - Handles automatic updates for yt-dlp and FFmpeg
class ComponentUpdateManager {
    constructor() {
        this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.updateTimer = null;
        this.isChecking = false;
        this.isUpdating = false;
        this.lastCheckTime = null;
        this.updateHistory = [];
        this.components = {
            'yt-dlp': {
                name: 'yt-dlp',
                displayName: 'yt-dlp Video Downloader',
                currentVersion: null,
                latestVersion: null,
                releaseUrl: 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
                downloadUrl: null,
                isUpdateAvailable: false,
                lastChecked: null,
                isEssential: true,
                description: 'Core video downloading functionality'
            },
            'ffmpeg': {
                name: 'ffmpeg',
                displayName: 'FFmpeg Media Processor',
                currentVersion: null,
                latestVersion: null,
                releaseUrl: 'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest',
                downloadUrl: null,
                isUpdateAvailable: false,
                lastChecked: null,
                isEssential: true,
                description: 'Video/audio conversion and processing'
            }
        };
        
        this.settings = {
            autoCheckEnabled: true,
            autoUpdateEnabled: false, // Require user consent for updates
            checkOnStartup: true,
            notifyOnUpdates: true,
            backupBeforeUpdate: true,
            updateChannel: 'stable' // 'stable' or 'beta'
        };
        
        this.eventCallbacks = {
            onUpdateAvailable: null,
            onUpdateStart: null,
            onUpdateProgress: null,
            onUpdateComplete: null,
            onUpdateError: null,
            onVersionCheck: null
        };
        
        this.init();
    }

    async init() {
        try {
            // Load settings and update history
            await this.loadSettings();
            await this.loadUpdateHistory();
            
            // Get current versions
            await this.getCurrentVersions();
            
            // Set up automatic checking if enabled
            if (this.settings.autoCheckEnabled) {
                this.setupAutoCheck();
            }
            
            // Check on startup if enabled
            if (this.settings.checkOnStartup) {
                setTimeout(() => this.checkForUpdates(), 5000); // Delay to avoid startup conflicts
            }
            
            console.log('Component Update Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Component Update Manager:', error);
            this.handleError(error, 'initialization');
        }
    }

    // Event handler setup
    setEventHandlers(callbacks) {
        this.eventCallbacks = { ...this.eventCallbacks, ...callbacks };
    }

    // Settings management
    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('component-update-settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('Failed to load update settings, using defaults:', error);
        }
    }

    async saveSettings() {
        try {
            localStorage.setItem('component-update-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save update settings:', error);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        // Restart auto-check if settings changed
        if (newSettings.autoCheckEnabled !== undefined) {
            if (newSettings.autoCheckEnabled) {
                this.setupAutoCheck();
            } else {
                this.stopAutoCheck();
            }
        }
    }

    // Update history management
    async loadUpdateHistory() {
        try {
            const savedHistory = localStorage.getItem('component-update-history');
            if (savedHistory) {
                this.updateHistory = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.warn('Failed to load update history:', error);
            this.updateHistory = [];
        }
    }

    async saveUpdateHistory() {
        try {
            localStorage.setItem('component-update-history', JSON.stringify(this.updateHistory));
        } catch (error) {
            console.error('Failed to save update history:', error);
        }
    }

    addToUpdateHistory(component, fromVersion, toVersion, status, error = null) {
        const historyEntry = {
            id: this.generateId(),
            component: component,
            fromVersion: fromVersion,
            toVersion: toVersion,
            status: status, // 'success', 'failed', 'cancelled'
            timestamp: new Date().toISOString(),
            error: error
        };
        
        this.updateHistory.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (this.updateHistory.length > 50) {
            this.updateHistory = this.updateHistory.slice(0, 50);
        }
        
        this.saveUpdateHistory();
    }

    // Get current versions of installed components
    async getCurrentVersions() {
        try {
            // Get yt-dlp version
            const ytdlpVersion = await this.getYtDlpVersion();
            this.components['yt-dlp'].currentVersion = ytdlpVersion;
            
            // Get FFmpeg version
            const ffmpegVersion = await this.getFFmpegVersion();
            this.components['ffmpeg'].currentVersion = ffmpegVersion;
            
            console.log('Current component versions:', {
                'yt-dlp': ytdlpVersion,
                'ffmpeg': ffmpegVersion
            });
            
        } catch (error) {
            console.error('Failed to get current versions:', error);
        }
    }

    async getYtDlpVersion() {
        try {
            if (window.electronAPI && window.electronAPI.updates) {
                const result = await window.electronAPI.updates.getYtDlpVersion();
                return result.success ? result.version : 'Unknown';
            }
            return 'Unknown';
        } catch (error) {
            console.warn('Failed to get yt-dlp version:', error);
            return 'Unknown';
        }
    }

    async getFFmpegVersion() {
        try {
            if (window.electronAPI && window.electronAPI.updates) {
                const result = await window.electronAPI.updates.getFFmpegVersion();
                return result.success ? result.version : 'Unknown';
            }
            return 'Unknown';
        } catch (error) {
            console.warn('Failed to get FFmpeg version:', error);
            return 'Unknown';
        }
    }

    // Auto-check functionality
    setupAutoCheck() {
        this.stopAutoCheck(); // Clear any existing timer
        
        if (this.settings.autoCheckEnabled) {
            this.updateTimer = setInterval(() => {
                this.checkForUpdates();
            }, this.updateCheckInterval);
            
            console.log('Auto-update check enabled (every 24 hours)');
        }
    }

    stopAutoCheck() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    // Main update checking function
    async checkForUpdates(forceCheck = false) {
        if (this.isChecking && !forceCheck) {
            console.log('Update check already in progress');
            return;
        }

        this.isChecking = true;
        this.lastCheckTime = new Date().toISOString();
        
        try {
            console.log('Checking for component updates...');
            
            if (this.eventCallbacks.onVersionCheck) {
                this.eventCallbacks.onVersionCheck({ status: 'checking' });
            }

            // Check each component
            const updatePromises = Object.keys(this.components).map(componentName => 
                this.checkComponentUpdate(componentName)
            );
            
            await Promise.all(updatePromises);
            
            // Determine if any updates are available
            const availableUpdates = Object.values(this.components)
                .filter(component => component.isUpdateAvailable);
            
            console.log(`Update check complete. ${availableUpdates.length} updates available.`);
            
            if (this.eventCallbacks.onVersionCheck) {
                this.eventCallbacks.onVersionCheck({ 
                    status: 'complete',
                    updatesAvailable: availableUpdates.length,
                    components: this.components
                });
            }
            
            // Notify about available updates
            if (availableUpdates.length > 0 && this.settings.notifyOnUpdates) {
                this.notifyUpdatesAvailable(availableUpdates);
            }
            
            return {
                success: true,
                updatesAvailable: availableUpdates.length,
                components: this.components
            };
            
        } catch (error) {
            console.error('Error checking for updates:', error);
            
            if (this.eventCallbacks.onVersionCheck) {
                this.eventCallbacks.onVersionCheck({ 
                    status: 'error',
                    error: error.message
                });
            }
            
            this.handleError(error, 'version-check');
            return { success: false, error: error.message };
        } finally {
            this.isChecking = false;
        }
    }

    async checkComponentUpdate(componentName) {
        const component = this.components[componentName];
        if (!component) return;

        try {
            console.log(`Checking updates for ${component.displayName}...`);
            
            let latestVersion = null;
            let downloadUrl = null;

            if (componentName === 'yt-dlp') {
                const updateInfo = await this.checkYtDlpUpdate();
                latestVersion = updateInfo.version;
                downloadUrl = updateInfo.downloadUrl;
            } else if (componentName === 'ffmpeg') {
                const updateInfo = await this.checkFFmpegUpdate();
                latestVersion = updateInfo.version;
                downloadUrl = updateInfo.downloadUrl;
            }

            component.latestVersion = latestVersion;
            component.downloadUrl = downloadUrl;
            component.lastChecked = new Date().toISOString();
            
            // Compare versions to determine if update is available
            component.isUpdateAvailable = this.isNewerVersion(
                latestVersion, 
                component.currentVersion
            );

            console.log(`${component.displayName}: Current=${component.currentVersion}, Latest=${latestVersion}, Update Available=${component.isUpdateAvailable}`);

        } catch (error) {
            console.error(`Failed to check updates for ${component.displayName}:`, error);
            component.lastChecked = new Date().toISOString();
            component.isUpdateAvailable = false;
        }
    }

    async checkYtDlpUpdate() {
        try {
            const response = await fetch(this.components['yt-dlp'].releaseUrl);
            if (!response.ok) {
                throw new Error(`GitHub API request failed: ${response.status}`);
            }
            
            const release = await response.json();
            
            // Extract version from tag name (remove 'v' prefix if present)
            const version = release.tag_name.replace(/^v/, '');
            
            // Find appropriate download URL based on platform
            const platform = await this.getPlatform();
            const asset = this.findAssetForPlatform(release.assets, platform, 'yt-dlp');
            
            return {
                version: version,
                downloadUrl: asset ? asset.browser_download_url : null,
                releaseNotes: release.body,
                publishedAt: release.published_at
            };
            
        } catch (error) {
            console.error('Failed to check yt-dlp updates:', error);
            throw error;
        }
    }

    async checkFFmpegUpdate() {
        try {
            const response = await fetch(this.components['ffmpeg'].releaseUrl);
            if (!response.ok) {
                throw new Error(`GitHub API request failed: ${response.status}`);
            }
            
            const release = await response.json();
            
            // Extract version from tag name
            const version = release.tag_name.replace(/^v/, '');
            
            // Find appropriate download URL based on platform
            const platform = await this.getPlatform();
            const asset = this.findAssetForPlatform(release.assets, platform, 'ffmpeg');
            
            return {
                version: version,
                downloadUrl: asset ? asset.browser_download_url : null,
                releaseNotes: release.body,
                publishedAt: release.published_at
            };
            
        } catch (error) {
            console.error('Failed to check FFmpeg updates:', error);
            throw error;
        }
    }

    async getPlatform() {
        try {
            if (window.electronAPI && window.electronAPI.updates) {
                const result = await window.electronAPI.updates.getPlatformInfo();
                return result.success ? result.platform : 'unknown';
            }
            
            // Fallback platform detection
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('win')) return 'win64';
            if (userAgent.includes('mac')) return 'macos';
            if (userAgent.includes('linux')) return 'linux64';
            return 'unknown';
        } catch (error) {
            console.warn('Failed to detect platform:', error);
            return 'unknown';
        }
    }

    findAssetForPlatform(assets, platform, component) {
        if (!assets || !Array.isArray(assets)) return null;
        
        const platformPatterns = {
            'yt-dlp': {
                'win64': /yt-dlp\.exe$/,
                'macos': /yt-dlp_macos$/,
                'linux64': /yt-dlp$/
            },
            'ffmpeg': {
                'win64': /ffmpeg.*win64.*\.zip$/,
                'macos': /ffmpeg.*macos.*\.zip$/,
                'linux64': /ffmpeg.*linux64.*\.tar\.xz$/
            }
        };
        
        const patterns = platformPatterns[component];
        if (!patterns || !patterns[platform]) return null;
        
        return assets.find(asset => patterns[platform].test(asset.name));
    }

    // Version comparison utility
    isNewerVersion(latest, current) {
        if (!latest || !current) return false;
        if (latest === current) return false;
        
        try {
            // Handle date-based versions (YYYY.MM.DD format)
            if (latest.match(/^\d{4}\.\d{2}\.\d{2}/) && current.match(/^\d{4}\.\d{2}\.\d{2}/)) {
                return new Date(latest.replace(/\./g, '-')) > new Date(current.replace(/\./g, '-'));
            }
            
            // Handle semantic versions (X.Y.Z format)
            const latestParts = latest.split('.').map(part => parseInt(part.replace(/\D/g, ''), 10) || 0);
            const currentParts = current.split('.').map(part => parseInt(part.replace(/\D/g, ''), 10) || 0);
            
            // Normalize to same length
            const maxLength = Math.max(latestParts.length, currentParts.length);
            while (latestParts.length < maxLength) latestParts.push(0);
            while (currentParts.length < maxLength) currentParts.push(0);
            
            // Compare each part
            for (let i = 0; i < maxLength; i++) {
                if (latestParts[i] > currentParts[i]) return true;
                if (latestParts[i] < currentParts[i]) return false;
            }
            
            return false;
        } catch (error) {
            console.warn('Version comparison failed:', error);
            return false;
        }
    }

    // Update installation functions
    async updateComponent(componentName) {
        const component = this.components[componentName];
        if (!component || !component.isUpdateAvailable) {
            throw new Error(`No update available for ${componentName}`);
        }

        if (this.isUpdating) {
            throw new Error('Another update is already in progress');
        }

        this.isUpdating = true;
        
        try {
            console.log(`Starting update for ${component.displayName}...`);
            
            if (this.eventCallbacks.onUpdateStart) {
                this.eventCallbacks.onUpdateStart({
                    component: componentName,
                    fromVersion: component.currentVersion,
                    toVersion: component.latestVersion
                });
            }

            // Create backup if enabled
            if (this.settings.backupBeforeUpdate) {
                await this.createBackup(componentName);
            }

            // Delegate to main process for actual update
            const result = await this.performUpdate(componentName);
            
            if (result.success) {
                // Update component info
                component.currentVersion = component.latestVersion;
                component.isUpdateAvailable = false;
                
                // Add to history
                this.addToUpdateHistory(
                    componentName,
                    result.fromVersion,
                    result.toVersion,
                    'success'
                );
                
                console.log(`${component.displayName} updated successfully to version ${component.latestVersion}`);
                
                if (this.eventCallbacks.onUpdateComplete) {
                    this.eventCallbacks.onUpdateComplete({
                        component: componentName,
                        fromVersion: result.fromVersion,
                        toVersion: result.toVersion,
                        success: true
                    });
                }
                
                return { success: true, version: component.latestVersion };
            } else {
                throw new Error(result.error || 'Update failed');
            }
            
        } catch (error) {
            console.error(`Failed to update ${component.displayName}:`, error);
            
            // Add to history
            this.addToUpdateHistory(
                componentName,
                component.currentVersion,
                component.latestVersion,
                'failed',
                error.message
            );
            
            if (this.eventCallbacks.onUpdateError) {
                this.eventCallbacks.onUpdateError({
                    component: componentName,
                    error: error.message
                });
            }
            
            this.handleError(error, 'component-update', {
                component: componentName,
                version: component.latestVersion
            });
            
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    async performUpdate(componentName) {
        try {
            if (window.electronAPI && window.electronAPI.updates) {
                return await window.electronAPI.updates.updateComponent(componentName, {
                    downloadUrl: this.components[componentName].downloadUrl,
                    version: this.components[componentName].latestVersion,
                    backupEnabled: this.settings.backupBeforeUpdate
                });
            } else {
                throw new Error('Update API not available');
            }
        } catch (error) {
            console.error('Update API call failed:', error);
            throw error;
        }
    }

    async createBackup(componentName) {
        try {
            if (window.electronAPI && window.electronAPI.updates) {
                const result = await window.electronAPI.updates.createBackup(componentName);
                if (!result.success) {
                    console.warn(`Backup creation failed for ${componentName}:`, result.error);
                }
                return result;
            }
        } catch (error) {
            console.warn('Backup creation failed:', error);
        }
    }

    // Update all components
    async updateAllComponents() {
        const availableUpdates = Object.keys(this.components)
            .filter(name => this.components[name].isUpdateAvailable);
        
        if (availableUpdates.length === 0) {
            throw new Error('No updates available');
        }

        const results = [];
        
        for (const componentName of availableUpdates) {
            try {
                const result = await this.updateComponent(componentName);
                results.push({ component: componentName, success: true, ...result });
            } catch (error) {
                results.push({ 
                    component: componentName, 
                    success: false, 
                    error: error.message 
                });
            }
        }
        
        return results;
    }

    // Notification system
    notifyUpdatesAvailable(availableUpdates) {
        const updateList = availableUpdates
            .map(comp => `${comp.displayName} (${comp.currentVersion} → ${comp.latestVersion})`)
            .join(', ');
        
        // Use error manager if available for consistent notifications
        if (window.app && window.app.errorManager) {
            window.app.errorManager.showNotification(
                `Updates available for: ${updateList}`,
                'info',
                {
                    persistent: true,
                    actions: [
                        {
                            label: 'View Updates',
                            action: () => this.showUpdateDialog()
                        },
                        {
                            label: 'Update Now',
                            action: () => this.showUpdateDialog(true)
                        }
                    ]
                }
            );
        } else {
            // Fallback notification
            console.log(`Updates available for: ${updateList}`);
        }
        
        if (this.eventCallbacks.onUpdateAvailable) {
            this.eventCallbacks.onUpdateAvailable({
                updates: availableUpdates,
                count: availableUpdates.length
            });
        }
    }

    // UI Methods
    showUpdateDialog(autoUpdate = false) {
        // Create and show update dialog
        this.createUpdateModal(autoUpdate);
    }

    createUpdateModal(autoUpdate = false) {
        // Remove existing modal if present
        const existingModal = document.getElementById('component-update-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'component-update-modal';
        modal.className = 'modal component-update-modal';
        modal.style.display = 'flex';
        
        const availableUpdates = Object.values(this.components)
            .filter(comp => comp.isUpdateAvailable);
        
        modal.innerHTML = `
            <div class="modal-content update-modal-content">
                <div class="modal-header">
                    <h3>Component Updates Available</h3>
                    <button class="modal-close update-modal-close">&times;</button>
                </div>
                <div class="modal-body update-modal-body">
                    <div class="update-summary">
                        <p>${availableUpdates.length} component${availableUpdates.length === 1 ? '' : 's'} ha${availableUpdates.length === 1 ? 's' : 've'} updates available:</p>
                    </div>
                    <div class="update-components-list">
                        ${availableUpdates.map(comp => `
                            <div class="update-component-item" data-component="${comp.name}">
                                <div class="component-info">
                                    <div class="component-name">${comp.displayName}</div>
                                    <div class="component-description">${comp.description}</div>
                                    <div class="version-info">
                                        <span class="current-version">Current: ${comp.currentVersion}</span>
                                        <span class="version-arrow">→</span>
                                        <span class="latest-version">Latest: ${comp.latestVersion}</span>
                                    </div>
                                </div>
                                <div class="component-actions">
                                    <input type="checkbox" id="update-${comp.name}" class="update-checkbox" ${autoUpdate ? 'checked' : ''}>
                                    <label for="update-${comp.name}" class="update-checkbox-label">Update</label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="update-options">
                        <label class="update-option">
                            <input type="checkbox" id="backup-before-update" ${this.settings.backupBeforeUpdate ? 'checked' : ''}>
                            <span>Create backup before updating</span>
                        </label>
                        <label class="update-option">
                            <input type="checkbox" id="auto-check-updates" ${this.settings.autoCheckEnabled ? 'checked' : ''}>
                            <span>Automatically check for updates daily</span>
                        </label>
                    </div>
                    <div class="update-progress" id="update-progress" style="display: none;">
                        <div class="progress-info">
                            <span id="update-status">Preparing update...</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="update-progress-fill"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer update-modal-footer">
                    <button class="btn btn-secondary update-cancel-btn">Cancel</button>
                    <button class="btn btn-outline update-check-btn">Check Again</button>
                    <button class="btn btn-primary update-install-btn">Install Updates</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupUpdateModalEvents(modal);
    }

    setupUpdateModalEvents(modal) {
        // Close modal events
        const closeBtn = modal.querySelector('.update-modal-close');
        const cancelBtn = modal.querySelector('.update-cancel-btn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Settings checkboxes
        const backupCheckbox = modal.querySelector('#backup-before-update');
        const autoCheckCheckbox = modal.querySelector('#auto-check-updates');
        
        backupCheckbox?.addEventListener('change', (e) => {
            this.updateSettings({ backupBeforeUpdate: e.target.checked });
        });
        
        autoCheckCheckbox?.addEventListener('change', (e) => {
            this.updateSettings({ autoCheckEnabled: e.target.checked });
        });

        // Check again button
        const checkBtn = modal.querySelector('.update-check-btn');
        checkBtn?.addEventListener('click', async () => {
            checkBtn.disabled = true;
            checkBtn.textContent = 'Checking...';
            
            try {
                await this.checkForUpdates(true);
                modal.remove();
                this.showUpdateDialog();
            } catch (error) {
                this.handleError(error, 'version-check');
            } finally {
                checkBtn.disabled = false;
                checkBtn.textContent = 'Check Again';
            }
        });

        // Install updates button
        const installBtn = modal.querySelector('.update-install-btn');
        installBtn?.addEventListener('click', async () => {
            await this.handleInstallUpdates(modal);
        });
    }

    async handleInstallUpdates(modal) {
        const selectedComponents = Array.from(modal.querySelectorAll('.update-checkbox:checked'))
            .map(checkbox => checkbox.id.replace('update-', ''));
        
        if (selectedComponents.length === 0) {
            alert('Please select at least one component to update.');
            return;
        }

        const installBtn = modal.querySelector('.update-install-btn');
        const cancelBtn = modal.querySelector('.update-cancel-btn');
        const progressContainer = modal.querySelector('#update-progress');
        const statusElement = modal.querySelector('#update-status');
        const progressFill = modal.querySelector('#update-progress-fill');

        // Show progress and disable buttons
        progressContainer.style.display = 'block';
        installBtn.disabled = true;
        cancelBtn.disabled = true;

        try {
            for (let i = 0; i < selectedComponents.length; i++) {
                const componentName = selectedComponents[i];
                const component = this.components[componentName];
                
                statusElement.textContent = `Updating ${component.displayName}...`;
                progressFill.style.width = `${(i / selectedComponents.length) * 100}%`;
                
                await this.updateComponent(componentName);
                
                statusElement.textContent = `${component.displayName} updated successfully`;
                progressFill.style.width = `${((i + 1) / selectedComponents.length) * 100}%`;
                
                // Brief pause between updates
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            statusElement.textContent = 'All updates completed successfully!';
            progressFill.style.width = '100%';
            
            // Close modal after success
            setTimeout(() => {
                modal.remove();
            }, 2000);
            
        } catch (error) {
            statusElement.textContent = `Update failed: ${error.message}`;
            progressFill.style.width = '0%';
            
            // Re-enable buttons
            installBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    }

    // Show update history
    showUpdateHistory() {
        this.createUpdateHistoryModal();
    }

    createUpdateHistoryModal() {
        const existingModal = document.getElementById('update-history-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'update-history-modal';
        modal.className = 'modal update-history-modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content history-modal-content">
                <div class="modal-header">
                    <h3>Update History</h3>
                    <button class="modal-close history-modal-close">&times;</button>
                </div>
                <div class="modal-body history-modal-body">
                    <div class="history-controls">
                        <div class="history-stats">
                            <span>Total Updates: ${this.updateHistory.length}</span>
                            <span>•</span>
                            <span>Last Check: ${this.lastCheckTime ? this.formatDate(this.lastCheckTime) : 'Never'}</span>
                        </div>
                        <button class="btn btn-outline clear-history-btn">Clear History</button>
                    </div>
                    <div class="history-list">
                        ${this.updateHistory.length === 0 ? 
                            '<div class="history-empty">No update history available</div>' :
                            this.updateHistory.map(entry => `
                                <div class="history-item status-${entry.status}">
                                    <div class="history-component">${this.components[entry.component]?.displayName || entry.component}</div>
                                    <div class="history-version">${entry.fromVersion} → ${entry.toVersion}</div>
                                    <div class="history-status">${this.capitalizeFirst(entry.status)}</div>
                                    <div class="history-date">${this.formatDate(entry.timestamp)}</div>
                                    ${entry.error ? `<div class="history-error">${entry.error}</div>` : ''}
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary history-close-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupHistoryModalEvents(modal);
    }

    setupHistoryModalEvents(modal) {
        // Close events
        const closeBtn = modal.querySelector('.history-modal-close');
        const closeBtnFooter = modal.querySelector('.history-close-btn');
        
        [closeBtn, closeBtnFooter].forEach(btn => {
            btn?.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Clear history
        const clearBtn = modal.querySelector('.clear-history-btn');
        clearBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the update history?')) {
                this.updateHistory = [];
                this.saveUpdateHistory();
                modal.remove();
                this.showUpdateHistory(); // Refresh the modal
            }
        });
    }

    // Utility methods
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return dateString;
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    handleError(error, context, details = {}) {
        const errorInfo = {
            error: error,
            context: context,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        console.error('Component Update Manager Error:', errorInfo);
        
        // Use application error manager if available
        if (window.app && window.app.errorManager) {
            window.app.errorManager.handleError(error, 'system', {
                operation: context,
                component: details.component,
                userMessage: `Component update operation failed: ${context}`,
                retryable: context === 'version-check',
                retryAction: context === 'version-check' ? () => this.checkForUpdates(true) : null
            });
        }
    }

    // Public API methods
    getComponentInfo() {
        return { ...this.components };
    }

    getSettings() {
        return { ...this.settings };
    }

    getUpdateHistory() {
        return [...this.updateHistory];
    }

    getStatus() {
        return {
            isChecking: this.isChecking,
            isUpdating: this.isUpdating,
            lastCheckTime: this.lastCheckTime,
            autoCheckEnabled: this.settings.autoCheckEnabled,
            updatesAvailable: Object.values(this.components)
                .filter(comp => comp.isUpdateAvailable).length
        };
    }

    // Cleanup
    destroy() {
        this.stopAutoCheck();
        this.eventCallbacks = {};
        
        // Remove any modals
        const modals = document.querySelectorAll('#component-update-modal, #update-history-modal');
        modals.forEach(modal => modal.remove());
    }
}
