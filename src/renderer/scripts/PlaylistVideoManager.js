/**
 * Enhanced Playlist Video Management System
 * Provides drag-and-drop reordering, bulk operations, and advanced video management
 */
class PlaylistVideoManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        // Configuration
        this.options = {
            enableDragDrop: true,
            enableBulkSelection: true,
            enableSorting: true,
            enableKeyboardShortcuts: true,
            autoSave: true,
            animationDuration: 300,
            ...options
        };

        // State
        this.videos = [];
        this.selectedVideos = new Set();
        this.isSelectionMode = false;
        this.isDragging = false;
        this.draggedElement = null;
        this.sortOrder = 'order'; // order, title, title-desc, duration, date

        // Initialize components
        this.initializeEventListeners();
        this.initializeKeyboardShortcuts();
        this.setupUI();
    }

    /**
     * Initialize event listeners for the management interface
     */
    initializeEventListeners() {
        // Selection mode toggle
        const selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn) {
            selectModeBtn.addEventListener('click', () => this.toggleSelectionMode());
        }

        // Sort functionality
        const sortBtn = document.getElementById('sort-btn');
        const sortDropdown = document.getElementById('sort-dropdown');
        if (sortBtn && sortDropdown) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sortDropdown.style.display = sortDropdown.style.display === 'none' ? 'block' : 'none';
            });

            // Sort options
            sortDropdown.addEventListener('click', (e) => {
                if (e.target.dataset.sort) {
                    this.setSortOrder(e.target.dataset.sort);
                    sortDropdown.style.display = 'none';
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                sortDropdown.style.display = 'none';
            });
        }

        // Bulk actions
        const bulkDownloadBtn = document.getElementById('bulk-download-btn');
        const bulkRemoveBtn = document.getElementById('bulk-remove-btn');
        const cancelSelectionBtn = document.getElementById('cancel-selection-btn');

        if (bulkDownloadBtn) {
            bulkDownloadBtn.addEventListener('click', () => this.bulkDownload());
        }
        if (bulkRemoveBtn) {
            bulkRemoveBtn.addEventListener('click', () => this.bulkRemove());
        }
        if (cancelSelectionBtn) {
            cancelSelectionBtn.addEventListener('click', () => this.exitSelectionMode());
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        if (!this.options.enableKeyboardShortcuts) return;

        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when playlist modal is open
            const modal = document.getElementById('playlist-details-modal');
            if (!modal || modal.style.display === 'none') return;

            switch (e.key) {
                case 'Escape':
                    if (this.isSelectionMode) {
                        this.exitSelectionMode();
                        e.preventDefault();
                    }
                    break;
                case 'a':
                case 'A':
                    if (e.ctrlKey || e.metaKey) {
                        if (this.isSelectionMode) {
                            this.selectAll();
                            e.preventDefault();
                        }
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.selectedVideos.size > 0) {
                        this.bulkRemove();
                        e.preventDefault();
                    }
                    break;
                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) {
                        this.toggleSelectionMode();
                        e.preventDefault();
                    }
                    break;
            }
        });
    }

    /**
     * Setup UI components
     */
    setupUI() {
        // Ensure bulk action bar is hidden initially
        const bulkActionBar = document.getElementById('bulk-action-bar');
        if (bulkActionBar) {
            bulkActionBar.style.display = 'none';
        }
    }

    /**
     * Load videos into the manager
     */
    loadVideos(videos) {
        this.videos = videos.map((video, index) => ({
            ...video,
            order: video.order || index + 1
        }));
        this.selectedVideos.clear();
        this.renderVideos();
        this.updateVideoCount();
    }

    /**
     * Render videos in the container
     */
    renderVideos() {
        if (!this.container) return;

        // Sort videos based on current sort order
        const sortedVideos = this.getSortedVideos();

        if (sortedVideos.length === 0) {
            this.container.innerHTML = `
                <div class="videos-list-empty">
                    <div class="empty-icon">📺</div>
                    <h4>No videos in this playlist</h4>
                    <p>Add some videos to get started</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = sortedVideos.map((video, index) => 
            this.renderVideoItem(video, index)
        ).join('');

        // Initialize drag and drop for rendered items
        if (this.options.enableDragDrop && this.sortOrder === 'order') {
            this.initializeDragAndDrop();
        }

        // Initialize selection checkboxes
        this.initializeSelectionCheckboxes();
    }

    /**
     * Render a single video item
     */
    renderVideoItem(video, index) {
        const isSelected = this.selectedVideos.has(video.id);
        const selectionClass = this.isSelectionMode ? 'selection-mode' : '';
        const selectedClass = isSelected ? 'selected' : '';

        return `
            <div class="video-item ${selectionClass} ${selectedClass}" 
                 data-video-id="${video.id}" 
                 draggable="${this.options.enableDragDrop && this.sortOrder === 'order'}">
                
                ${this.isSelectionMode ? `
                    <div class="video-selection-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               data-video-id="${video.id}">
                    </div>
                ` : ''}
                
                ${this.options.enableDragDrop && this.sortOrder === 'order' ? `
                    <div class="video-drag-handle">
                        <div class="drag-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="video-thumbnail">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/140x80'}" 
                         alt="${this.escapeHtml(video.title)}" 
                         loading="lazy">
                    ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                    ${this.sortOrder === 'order' ? `<div class="video-order-badge">${video.order}</div>` : ''}
                </div>
                
                <div class="video-item-info">
                    <h5 class="video-title">${this.escapeHtml(video.title)}</h5>
                    ${video.description ? `<p class="video-description">${this.escapeHtml(video.description)}</p>` : ''}
                    <div class="video-item-meta">
                        ${video.channel ? `
                            <div class="meta-item">
                                <span class="icon-user"></span>
                                <a href="${video.channelUrl || '#'}" target="_blank">${this.escapeHtml(video.channel)}</a>
                            </div>
                        ` : ''}
                        ${video.duration ? `
                            <div class="meta-item">
                                <span class="icon-clock"></span>
                                <span>${video.duration}</span>
                            </div>
                        ` : ''}
                        ${video.addedDate ? `
                            <div class="meta-item">
                                <span class="icon-calendar"></span>
                                <span>${new Date(video.addedDate).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="video-item-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewVideo('${video.url}')">
                        <span class="icon-eye"></span> Watch
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="downloadSingleVideo('${video.id}')">
                        <span class="icon-download"></span> Download
                    </button>
                    <button class="btn btn-sm btn-outline video-info-btn" onclick="showVideoInfo('${video.id}')">
                        <span class="icon-info"></span> Info
                    </button>
                    <button class="btn btn-sm btn-outline video-remove-btn" onclick="removeVideoFromPlaylist('${video.id}')">
                        <span class="icon-trash"></span> Remove
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Initialize drag and drop functionality
     */
    initializeDragAndDrop() {
        const videoItems = this.container.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    /**
     * Initialize selection checkboxes
     */
    initializeSelectionCheckboxes() {
        const checkboxes = this.container.querySelectorAll('.video-selection-checkbox input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const videoId = e.target.dataset.videoId;
                if (e.target.checked) {
                    this.selectedVideos.add(videoId);
                } else {
                    this.selectedVideos.delete(videoId);
                }
                this.updateSelectionUI();
            });
        });

        // Handle video item clicks in selection mode
        const videoItems = this.container.querySelectorAll('.video-item.selection-mode');
        videoItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('.video-item-actions')) {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    /**
     * Drag and drop event handlers
     */
    handleDragStart(e) {
        this.isDragging = true;
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        if (e.target.classList.contains('video-item') && e.target !== this.draggedElement) {
            e.target.classList.add('drop-target');
        }
    }

    handleDragLeave(e) {
        if (e.target.classList.contains('video-item')) {
            e.target.classList.remove('drop-target');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const dropTarget = e.target.closest('.video-item');
        
        if (dropTarget && dropTarget !== this.draggedElement) {
            this.reorderVideos(this.draggedElement, dropTarget);
        }
        
        this.cleanupDragState();
    }

    handleDragEnd(e) {
        this.cleanupDragState();
    }

    cleanupDragState() {
        this.isDragging = false;
        this.draggedElement = null;
        
        const items = this.container.querySelectorAll('.video-item');
        items.forEach(item => {
            item.classList.remove('dragging', 'drop-target');
        });
    }

    /**
     * Reorder videos after drag and drop
     */
    reorderVideos(draggedElement, dropTarget) {
        const draggedId = draggedElement.dataset.videoId;
        const dropTargetId = dropTarget.dataset.videoId;
        
        const draggedVideo = this.videos.find(v => v.id === draggedId);
        const dropTargetVideo = this.videos.find(v => v.id === dropTargetId);
        
        if (!draggedVideo || !dropTargetVideo) return;

        // Get container children for positioning
        const items = Array.from(this.container.children);
        const draggedIndex = items.indexOf(draggedElement);
        const dropIndex = items.indexOf(dropTarget);

        // Reorder videos array
        this.videos.splice(this.videos.indexOf(draggedVideo), 1);
        this.videos.splice(this.videos.indexOf(dropTargetVideo) + (draggedIndex < dropIndex ? 1 : 0), 0, draggedVideo);

        // Update order numbers
        this.videos.forEach((video, index) => {
            video.order = index + 1;
        });

        // Re-render to show new order
        this.renderVideos();

        // Auto-save if enabled
        if (this.options.autoSave) {
            this.saveVideoOrder();
        }
    }

    /**
     * Toggle selection mode
     */
    toggleSelectionMode() {
        this.isSelectionMode = !this.isSelectionMode;
        
        if (this.isSelectionMode) {
            this.enterSelectionMode();
        } else {
            this.exitSelectionMode();
        }
    }

    /**
     * Enter selection mode
     */
    enterSelectionMode() {
        this.isSelectionMode = true;
        this.selectedVideos.clear();
        
        const selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn) {
            selectModeBtn.textContent = 'Cancel';
            selectModeBtn.classList.add('active');
        }
        
        this.renderVideos();
        this.updateSelectionUI();
    }

    /**
     * Exit selection mode
     */
    exitSelectionMode() {
        this.isSelectionMode = false;
        this.selectedVideos.clear();
        
        const selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn) {
            selectModeBtn.textContent = 'Select';
            selectModeBtn.classList.remove('active');
        }
        
        const bulkActionBar = document.getElementById('bulk-action-bar');
        if (bulkActionBar) {
            bulkActionBar.style.display = 'none';
        }
        
        this.renderVideos();
    }

    /**
     * Select all videos
     */
    selectAll() {
        if (!this.isSelectionMode) return;
        
        this.videos.forEach(video => {
            this.selectedVideos.add(video.id);
        });
        
        this.updateSelectionUI();
        this.updateVideoItemSelection();
    }

    /**
     * Update selection UI
     */
    updateSelectionUI() {
        const bulkActionBar = document.getElementById('bulk-action-bar');
        const selectedCountSpan = document.getElementById('selected-count');
        
        if (this.selectedVideos.size > 0) {
            if (bulkActionBar) bulkActionBar.style.display = 'flex';
            if (selectedCountSpan) selectedCountSpan.textContent = this.selectedVideos.size;
        } else {
            if (bulkActionBar) bulkActionBar.style.display = 'none';
        }
    }

    /**
     * Update video item selection state
     */
    updateVideoItemSelection() {
        const videoItems = this.container.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            const videoId = item.dataset.videoId;
            const checkbox = item.querySelector('input[type="checkbox"]');
            const isSelected = this.selectedVideos.has(videoId);
            
            if (checkbox) {
                checkbox.checked = isSelected;
            }
            
            if (isSelected) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Set sort order
     */
    setSortOrder(order) {
        this.sortOrder = order;
        this.renderVideos();
        
        // Update sort button text
        const sortBtn = document.getElementById('sort-btn');
        if (sortBtn) {
            const orderNames = {
                'order': 'Default Order',
                'title': 'Title (A-Z)',
                'title-desc': 'Title (Z-A)',
                'duration': 'Duration',
                'date': 'Date Added'
            };
            sortBtn.textContent = `${orderNames[order] || 'Sort'} ▼`;
        }
    }

    /**
     * Get sorted videos based on current sort order
     */
    getSortedVideos() {
        const videos = [...this.videos];
        
        switch (this.sortOrder) {
            case 'title':
                return videos.sort((a, b) => a.title.localeCompare(b.title));
            case 'title-desc':
                return videos.sort((a, b) => b.title.localeCompare(a.title));
            case 'duration':
                return videos.sort((a, b) => this.parseDuration(a.duration) - this.parseDuration(b.duration));
            case 'date':
                return videos.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
            case 'order':
            default:
                return videos.sort((a, b) => a.order - b.order);
        }
    }

    /**
     * Parse duration string to seconds for sorting
     */
    parseDuration(duration) {
        if (!duration) return 0;
        
        const parts = duration.split(':').map(p => parseInt(p, 10));
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    /**
     * Bulk download selected videos
     */
    async bulkDownload() {
        if (this.selectedVideos.size === 0) return;
        
        const selectedVideoIds = Array.from(this.selectedVideos);
        const message = `Download ${selectedVideoIds.length} selected video${selectedVideoIds.length > 1 ? 's' : ''}?`;
        
        if (await this.showConfirmDialog('Bulk Download', message)) {
            try {
                // Call the main download function for each selected video
                for (const videoId of selectedVideoIds) {
                    await downloadSingleVideo(videoId);
                }
                this.exitSelectionMode();
            } catch (error) {
                console.error('Bulk download failed:', error);
                alert('Some downloads may have failed. Please check the downloads section.');
            }
        }
    }

    /**
     * Bulk remove selected videos
     */
    async bulkRemove() {
        if (this.selectedVideos.size === 0) return;
        
        const selectedVideoIds = Array.from(this.selectedVideos);
        const message = `Remove ${selectedVideoIds.length} selected video${selectedVideoIds.length > 1 ? 's' : ''} from this playlist?`;
        
        if (await this.showConfirmDialog('Remove Videos', message, 'danger')) {
            try {
                // Remove videos from the current playlist
                for (const videoId of selectedVideoIds) {
                    await removeVideoFromPlaylist(videoId);
                }
                
                // Update local state
                this.videos = this.videos.filter(video => !selectedVideoIds.includes(video.id));
                this.selectedVideos.clear();
                
                this.renderVideos();
                this.updateVideoCount();
                this.exitSelectionMode();
            } catch (error) {
                console.error('Bulk remove failed:', error);
                alert('Some videos could not be removed. Please try again.');
            }
        }
    }

    /**
     * Show confirmation dialog
     */
    showConfirmDialog(title, message, type = 'warning') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const iconEl = document.getElementById('confirm-icon');
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            
            if (!modal || !titleEl || !messageEl || !iconEl || !okBtn || !cancelBtn) {
                resolve(false);
                return;
            }
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            // Set icon and button style based on type
            if (type === 'danger') {
                iconEl.textContent = '🗑️';
                iconEl.className = 'confirm-icon danger';
                okBtn.className = 'btn btn-danger';
                okBtn.textContent = 'Remove';
            } else {
                iconEl.textContent = '⚠️';
                iconEl.className = 'confirm-icon warning';
                okBtn.className = 'btn btn-warning';
                okBtn.textContent = 'Confirm';
            }
            
            // Setup event handlers
            const handleOk = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            
            // Show modal
            modal.style.display = 'flex';
        });
    }

    /**
     * Update video count display
     */
    updateVideoCount() {
        const videoCountBadge = document.getElementById('video-count-badge');
        if (videoCountBadge) {
            const count = this.videos.length;
            videoCountBadge.textContent = `${count} video${count !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Save video order to database
     */
    async saveVideoOrder() {
        try {
            // Call the main process to save video order
            if (window.electronAPI && window.electronAPI.savePlaylistVideoOrder) {
                await window.electronAPI.savePlaylistVideoOrder(
                    this.playlistId,
                    this.videos.map(v => ({ id: v.id, order: v.order }))
                );
            }
        } catch (error) {
            console.error('Failed to save video order:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Public API methods
     */
    
    /**
     * Add a video to the playlist
     */
    addVideo(video) {
        const newVideo = {
            ...video,
            order: this.videos.length + 1,
            addedDate: new Date().toISOString()
        };
        
        this.videos.push(newVideo);
        this.renderVideos();
        this.updateVideoCount();
        
        if (this.options.autoSave) {
            this.saveVideoOrder();
        }
    }

    /**
     * Remove a video from the playlist
     */
    removeVideo(videoId) {
        const index = this.videos.findIndex(v => v.id === videoId);
        if (index !== -1) {
            this.videos.splice(index, 1);
            this.selectedVideos.delete(videoId);
            
            // Update order numbers
            this.videos.forEach((video, idx) => {
                video.order = idx + 1;
            });
            
            this.renderVideos();
            this.updateVideoCount();
            this.updateSelectionUI();
            
            if (this.options.autoSave) {
                this.saveVideoOrder();
            }
        }
    }

    /**
     * Get currently selected video IDs
     */
    getSelectedVideos() {
        return Array.from(this.selectedVideos);
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedVideos.clear();
        this.updateSelectionUI();
        this.updateVideoItemSelection();
    }

    /**
     * Refresh the video list
     */
    refresh() {
        this.renderVideos();
        this.updateVideoCount();
    }

    /**
     * Destroy the manager and cleanup
     */
    destroy() {
        this.selectedVideos.clear();
        this.videos = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaylistVideoManager;
} else {
    window.PlaylistVideoManager = PlaylistVideoManager;
}
