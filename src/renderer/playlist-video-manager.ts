export interface VideoItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration: number;
  views?: number;
  uploader?: string;
  url: string;
  order_index?: number;
  playlist_id?: number;
}

export interface DragDropState {
  isDragging: boolean;
  draggedElement: HTMLElement | null;
  draggedVideoId: string | null;
  dragStartY: number;
  dropZone: HTMLElement | null;
  placeholder: HTMLElement | null;
}

export class PlaylistVideoManager {
  private currentPlaylistId: number | null = null;
  private videos: VideoItem[] = [];
  private dragState: DragDropState = {
    isDragging: false,
    draggedElement: null,
    draggedVideoId: null,
    dragStartY: 0,
    dropZone: null,
    placeholder: null
  };
  private isSelectionMode: boolean = false;
  private selectedVideos: Set<string> = new Set();

  constructor() {
    this.setupGlobalEventListeners();
  }

  public initializePlaylist(playlistId: number, videos: VideoItem[]): void {
    this.currentPlaylistId = playlistId;
    this.videos = videos.map((video, index) => ({
      ...video,
      order_index: video.order_index ?? index
    }));
    this.isSelectionMode = false;
    this.selectedVideos.clear();
    
    this.renderVideosList();
    this.setupPlaylistControls();
  }

  private setupGlobalEventListeners(): void {
    // Global mouse events for drag operations
    document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));
    
    // Prevent default drag behavior on images
    document.addEventListener('dragstart', (e) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
      }
    });
  }

  private setupPlaylistControls(): void {
    // Add selection mode toggle
    this.addPlaylistToolbar();
    
    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  private addPlaylistToolbar(): void {
    const videosSection = document.querySelector('.playlist-videos');
    if (!videosSection) return;

    // Remove existing toolbar
    const existingToolbar = videosSection.querySelector('.playlist-toolbar');
    if (existingToolbar) {
      existingToolbar.remove();
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'playlist-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-left">
        <h4>Videos in Playlist (${this.videos.length})</h4>
        <div class="video-count-badge">${this.videos.length} videos</div>
      </div>
      <div class="toolbar-right">
        <button id="select-mode-btn" class="btn btn-outline btn-sm">
          ${this.isSelectionMode ? 'Exit Selection' : 'Select Videos'}
        </button>
        <button id="sort-menu-btn" class="btn btn-outline btn-sm">
          Sort ▼
        </button>
        <div class="sort-dropdown" id="sort-dropdown" style="display: none;">
          <button data-sort="order">Original Order</button>
          <button data-sort="title">Title A-Z</button>
          <button data-sort="title-desc">Title Z-A</button>
          <button data-sort="duration">Duration (Short First)</button>
          <button data-sort="duration-desc">Duration (Long First)</button>
          <button data-sort="views">Views (Low First)</button>
          <button data-sort="views-desc">Views (High First)</button>
        </div>
      </div>
    `;

    const h4 = videosSection.querySelector('h4');
    if (h4) {
      videosSection.insertBefore(toolbar, h4);
      h4.remove();
    }

    this.setupToolbarEvents();
  }

  private setupToolbarEvents(): void {
    // Selection mode toggle
    const selectModeBtn = document.getElementById('select-mode-btn');
    selectModeBtn?.addEventListener('click', () => this.toggleSelectionMode());

    // Sort menu toggle
    const sortMenuBtn = document.getElementById('sort-menu-btn');
    const sortDropdown = document.getElementById('sort-dropdown');
    
    sortMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sortDropdown) {
        sortDropdown.style.display = sortDropdown.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Sort options
    sortDropdown?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.sort) {
        this.sortVideos(target.dataset.sort);
        sortDropdown.style.display = 'none';
      }
    });

    // Close sort dropdown when clicking elsewhere
    document.addEventListener('click', () => {
      if (sortDropdown) {
        sortDropdown.style.display = 'none';
      }
    });
  }

  private renderVideosList(): void {
    const videosList = document.getElementById('playlist-videos-list');
    if (!videosList) return;

    if (this.videos.length === 0) {
      videosList.innerHTML = `
        <div class="videos-list-empty">
          <div class="empty-icon">📹</div>
          <h4>No videos in this playlist</h4>
          <p>Add some videos to get started!</p>
          <button class="btn btn-primary" onclick="window.app?.showAddVideoModal()">Add Video</button>
        </div>
      `;
      return;
    }

    // Sort videos by order_index
    const sortedVideos = [...this.videos].sort((a, b) => 
      (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    videosList.innerHTML = sortedVideos.map((video, index) => 
      this.createVideoItemHTML(video, index)
    ).join('');

    this.setupVideoItemEvents();
    this.updateSelectionUI();
  }

  private createVideoItemHTML(video: VideoItem, index: number): string {
    const isSelected = this.selectedVideos.has(video.id);
    const selectionClass = this.isSelectionMode ? 'selection-mode' : '';
    const selectedClass = isSelected ? 'selected' : '';
    
    return `
      <div class="video-item ${selectionClass} ${selectedClass}" 
           data-video-id="${video.id}" 
           data-index="${index}"
           draggable="true">
        ${this.isSelectionMode ? `
          <div class="video-selection-checkbox">
            <input type="checkbox" ${isSelected ? 'checked' : ''} 
                   onchange="window.playlistVideoManager?.toggleVideoSelection('${video.id}')">
          </div>
        ` : ''}
        
        <div class="video-drag-handle" title="Drag to reorder">
          <div class="drag-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
        
        <div class="video-thumbnail">
          <img src="${video.thumbnail || '/assets/default-thumbnail.png'}" 
               alt="${this.escapeHtml(video.title)}" 
               loading="lazy" />
          <div class="video-duration">${this.formatDuration(video.duration)}</div>
          <div class="video-order-badge">${index + 1}</div>
        </div>
        
        <div class="video-item-info">
          <h5 class="video-title">${this.escapeHtml(video.title)}</h5>
          <p class="video-description">${this.escapeHtml(this.truncateText(video.description || 'No description', 120))}</p>
          <div class="video-item-meta">
            <span class="meta-item">
              <i class="icon-eye"></i>
              ${this.formatNumber(video.views)}
            </span>
            <span class="meta-item">
              <i class="icon-user"></i>
              ${this.escapeHtml(video.uploader || 'Unknown')}
            </span>
            <span class="meta-item">
              <i class="icon-link"></i>
              <a href="${video.url}" target="_blank" rel="noopener">View on YouTube</a>
            </span>
          </div>
        </div>
        
        <div class="video-item-actions">
          <button class="btn btn-primary btn-sm" 
                  onclick="window.app?.downloadSingleVideo('${video.id}')"
                  title="Download this video">
            <i class="icon-download"></i>
            Download
          </button>
          <button class="btn btn-secondary btn-sm" 
                  onclick="window.app?.viewVideo('${video.id}')"
                  title="View video details">
            <i class="icon-info"></i>
            Details
          </button>
          <button class="btn btn-outline btn-sm video-remove-btn" 
                  onclick="window.playlistVideoManager?.confirmRemoveVideo('${video.id}')"
                  title="Remove from playlist">
            <i class="icon-trash"></i>
            Remove
          </button>
        </div>
      </div>
    `;
  }

  private setupVideoItemEvents(): void {
    const videoItems = document.querySelectorAll('.video-item');
    
    videoItems.forEach(item => {
      const element = item as HTMLElement;
      const dragHandle = element.querySelector('.video-drag-handle') as HTMLElement;
      
      // Drag events
      if (dragHandle) {
        dragHandle.addEventListener('mousedown', (e) => this.handleDragStart(e, element));
      }
      
      // Double-click to play/view
      element.addEventListener('dblclick', (e) => {
        if (!this.isSelectionMode) {
          const videoId = element.dataset.videoId;
          if (videoId) {
            this.viewVideoDetails(videoId);
          }
        }
      });

      // Click for selection mode
      element.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (this.isSelectionMode && target && !target.closest('.video-item-actions')) {
          const videoId = element.dataset.videoId;
          if (videoId) {
            this.toggleVideoSelection(videoId);
          }
        }
      });
    });
  }

  private handleDragStart(e: MouseEvent, element: HTMLElement): void {
    if (this.isSelectionMode) return;

    e.preventDefault();
    
    const videoId = element.dataset.videoId;
    if (!videoId) return;

    this.dragState = {
      isDragging: true,
      draggedElement: element,
      draggedVideoId: videoId,
      dragStartY: e.clientY,
      dropZone: element.parentElement,
      placeholder: null
    };

    // Create drag placeholder
    this.createDragPlaceholder(element);
    
    // Add drag styling
    element.classList.add('dragging');
    document.body.classList.add('dragging-video');
    
    // Store initial mouse offset
    const rect = element.getBoundingClientRect();
    element.style.transform = `translateY(${e.clientY - rect.top - rect.height / 2}px)`;
  }

  private createDragPlaceholder(element: HTMLElement): void {
    const placeholder = document.createElement('div');
    placeholder.className = 'video-drop-placeholder';
    placeholder.style.height = `${element.offsetHeight}px`;
    placeholder.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">📦</div>
        <span>Drop video here</span>
      </div>
    `;
    
    this.dragState.placeholder = placeholder;
  }

  private handleGlobalMouseMove(e: MouseEvent): void {
    if (!this.dragState.isDragging || !this.dragState.draggedElement || !this.dragState.dropZone) return;

    const draggedElement = this.dragState.draggedElement;
    const dropZone = this.dragState.dropZone;
    
    // Update dragged element position
    const deltaY = e.clientY - this.dragState.dragStartY;
    draggedElement.style.transform = `translateY(${deltaY}px)`;
    draggedElement.style.zIndex = '1000';

    // Find insertion point
    const videoItems = Array.from(dropZone.querySelectorAll('.video-item:not(.dragging)'));
    let insertBefore: Element | null = null;

    for (const item of videoItems) {
      const rect = item.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      
      if (e.clientY < centerY) {
        insertBefore = item;
        break;
      }
    }

    // Update placeholder position
    if (this.dragState.placeholder) {
      if (insertBefore) {
        dropZone.insertBefore(this.dragState.placeholder, insertBefore);
      } else {
        dropZone.appendChild(this.dragState.placeholder);
      }
    }

    // Visual feedback
    this.updateDropZoneVisuals(e.clientY);
  }

  private updateDropZoneVisuals(mouseY: number): void {
    const videoItems = document.querySelectorAll('.video-item:not(.dragging)');
    
    videoItems.forEach(item => {
      const element = item as HTMLElement;
      const rect = element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distance = Math.abs(mouseY - centerY);
      
      if (distance < 50) {
        element.classList.add('drop-target');
      } else {
        element.classList.remove('drop-target');
      }
    });
  }

  private handleGlobalMouseUp(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;

    this.finalizeDrop();
  }

  private async finalizeDrop(): Promise<void> {
    if (!this.dragState.isDragging || !this.dragState.draggedElement || !this.dragState.placeholder) return;

    const draggedElement = this.dragState.draggedElement;
    const placeholder = this.dragState.placeholder;
    const draggedVideoId = this.dragState.draggedVideoId;

    // Calculate new position
    const siblings = Array.from(placeholder.parentElement?.children || []);
    const placeholderIndex = siblings.indexOf(placeholder);
    const newOrderIndex = placeholderIndex;

    // Remove drag styling
    draggedElement.classList.remove('dragging');
    draggedElement.style.transform = '';
    draggedElement.style.zIndex = '';
    document.body.classList.remove('dragging-video');

    // Clear drop target styling
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));

    // Replace placeholder with dragged element
    if (placeholder.parentElement) {
      placeholder.parentElement.insertBefore(draggedElement, placeholder);
      placeholder.remove();
    }

    // Update video order
    if (draggedVideoId) {
      await this.updateVideoOrder(draggedVideoId, newOrderIndex);
    }

    // Reset drag state
    this.dragState = {
      isDragging: false,
      draggedElement: null,
      draggedVideoId: null,
      dragStartY: 0,
      dropZone: null,
      placeholder: null
    };

    // Re-render to reflect new order
    this.renderVideosList();
    
    // Show success feedback
    this.showSuccessMessage('Video order updated');
  }

  private async updateVideoOrder(videoId: string, newIndex: number): Promise<void> {
    if (!this.currentPlaylistId) return;

    try {
      // Reorder videos array
      const draggedVideo = this.videos.find(v => v.id === videoId);
      if (!draggedVideo) return;

      // Remove from current position
      this.videos = this.videos.filter(v => v.id !== videoId);
      
      // Insert at new position
      this.videos.splice(newIndex, 0, draggedVideo);
      
      // Update order_index for all videos
      this.videos.forEach((video, index) => {
        video.order_index = index;
      });

      // Save to database
      const ipcRenderer = (window as any).electronAPI;
      if (ipcRenderer?.database?.updateVideoOrder) {
        await ipcRenderer.database.updateVideoOrder(this.currentPlaylistId, videoId, newIndex);
      }
      
    } catch (error) {
      console.error('Failed to update video order:', error);
      this.showErrorMessage('Failed to update video order');
    }
  }

  public toggleSelectionMode(): void {
    this.isSelectionMode = !this.isSelectionMode;
    
    if (!this.isSelectionMode) {
      this.selectedVideos.clear();
    }
    
    this.renderVideosList();
    this.updateSelectionControls();
  }

  public toggleVideoSelection(videoId: string): void {
    if (this.selectedVideos.has(videoId)) {
      this.selectedVideos.delete(videoId);
    } else {
      this.selectedVideos.add(videoId);
    }
    
    this.updateSelectionUI();
  }

  private updateSelectionUI(): void {
    const videoItems = document.querySelectorAll('.video-item');
    
    videoItems.forEach(item => {
      const element = item as HTMLElement;
      const videoId = element.dataset.videoId;
      const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
      
      if (videoId && checkbox) {
        const isSelected = this.selectedVideos.has(videoId);
        checkbox.checked = isSelected;
        element.classList.toggle('selected', isSelected);
      }
    });

    this.updateSelectionControls();
  }

  private updateSelectionControls(): void {
    const selectModeBtn = document.getElementById('select-mode-btn');
    if (selectModeBtn) {
      selectModeBtn.textContent = this.isSelectionMode ? 'Exit Selection' : 'Select Videos';
    }

    // Add/remove bulk action bar
    if (this.isSelectionMode && this.selectedVideos.size > 0) {
      this.showBulkActionBar();
    } else {
      this.hideBulkActionBar();
    }
  }

  private showBulkActionBar(): void {
    let bulkBar = document.querySelector('.bulk-action-bar') as HTMLElement;
    
    if (!bulkBar) {
      bulkBar = document.createElement('div');
      bulkBar.className = 'bulk-action-bar';
      
      const videosSection = document.querySelector('.playlist-videos');
      if (videosSection) {
        videosSection.appendChild(bulkBar);
      }
    }

    const selectedCount = this.selectedVideos.size;
    bulkBar.innerHTML = `
      <div class="bulk-info">
        <strong>${selectedCount}</strong> video${selectedCount !== 1 ? 's' : ''} selected
      </div>
      <div class="bulk-actions">
        <button class="btn btn-primary btn-sm" onclick="window.playlistVideoManager?.downloadSelectedVideos()">
          <i class="icon-download"></i>
          Download Selected
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window.playlistVideoManager?.moveSelectedVideos()">
          <i class="icon-move"></i>
          Move to...
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.playlistVideoManager?.removeSelectedVideos()">
          <i class="icon-trash"></i>
          Remove Selected
        </button>
        <button class="btn btn-link btn-sm" onclick="window.playlistVideoManager?.clearSelection()">
          Clear Selection
        </button>
      </div>
    `;

    bulkBar.style.display = 'flex';
  }

  private hideBulkActionBar(): void {
    const bulkBar = document.querySelector('.bulk-action-bar') as HTMLElement;
    if (bulkBar) {
      bulkBar.style.display = 'none';
    }
  }

  public clearSelection(): void {
    this.selectedVideos.clear();
    this.updateSelectionUI();
  }

  public async removeSelectedVideos(): Promise<void> {
    if (this.selectedVideos.size === 0) return;

    const count = this.selectedVideos.size;
    const confirmed = await this.showConfirmDialog(
      'Remove Videos',
      `Are you sure you want to remove ${count} video${count !== 1 ? 's' : ''} from this playlist?`,
      'Remove',
      'warning'
    );

    if (confirmed) {
      for (const videoId of this.selectedVideos) {
        await this.removeVideoFromPlaylist(videoId);
      }
      
      this.selectedVideos.clear();
      this.showSuccessMessage(`${count} video${count !== 1 ? 's' : ''} removed from playlist`);
    }
  }

  public async confirmRemoveVideo(videoId: string): Promise<void> {
    const video = this.videos.find(v => v.id === videoId);
    const videoTitle = video ? video.title : 'this video';

    const confirmed = await this.showConfirmDialog(
      'Remove Video',
      `Are you sure you want to remove "${videoTitle}" from this playlist?`,
      'Remove',
      'warning'
    );

    if (confirmed) {
      await this.removeVideoFromPlaylist(videoId);
      this.showSuccessMessage('Video removed from playlist');
    }
  }

  private async removeVideoFromPlaylist(videoId: string): Promise<void> {
    try {
      if (!this.currentPlaylistId) return;

      // Remove from local array
      this.videos = this.videos.filter(v => v.id !== videoId);
      
      // Update database
      const ipcRenderer = (window as any).electronAPI;
      if (ipcRenderer?.database?.removeVideoFromPlaylist) {
        await ipcRenderer.database.removeVideoFromPlaylist(this.currentPlaylistId, videoId);
      }

      // Re-render
      this.renderVideosList();
      this.addPlaylistToolbar();
      
    } catch (error) {
      console.error('Failed to remove video:', error);
      this.showErrorMessage('Failed to remove video from playlist');
    }
  }

  private sortVideos(sortType: string): void {
    const sortedVideos = [...this.videos];

    switch (sortType) {
      case 'title':
        sortedVideos.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sortedVideos.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'duration':
        sortedVideos.sort((a, b) => a.duration - b.duration);
        break;
      case 'duration-desc':
        sortedVideos.sort((a, b) => b.duration - a.duration);
        break;
      case 'views':
        sortedVideos.sort((a, b) => (a.views || 0) - (b.views || 0));
        break;
      case 'views-desc':
        sortedVideos.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'order':
      default:
        sortedVideos.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        break;
    }

    this.videos = sortedVideos;
    this.renderVideosList();
    this.showSuccessMessage(`Videos sorted by ${sortType.replace('-', ' ')}`);
  }

  private handleKeyboardShortcuts(e: KeyboardEvent): void {
    if (!this.isSelectionMode) return;

    switch (e.key) {
      case 'Escape':
        this.toggleSelectionMode();
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.selectAllVideos();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedVideos.size > 0) {
          e.preventDefault();
          this.removeSelectedVideos();
        }
        break;
    }
  }

  private selectAllVideos(): void {
    this.videos.forEach(video => this.selectedVideos.add(video.id));
    this.updateSelectionUI();
  }

  public async downloadSelectedVideos(): Promise<void> {
    if (this.selectedVideos.size === 0) return;

    // Use existing download functionality
    for (const videoId of this.selectedVideos) {
      const app = (window as any).app;
      if (app?.downloadSingleVideo) {
        await app.downloadSingleVideo(videoId);
      }
    }

    this.showSuccessMessage(`${this.selectedVideos.size} videos added to download queue`);
  }

  private viewVideoDetails(videoId: string): void {
    const app = (window as any).app;
    if (app?.viewVideo) {
      app.viewVideo(videoId);
    }
  }

  // Utility methods
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatNumber(num: number | undefined): string {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  private showSuccessMessage(message: string): void {
    const app = (window as any).app;
    if (app?.showStatus) {
      app.showStatus(message, 'success');
    } else {
      console.log(`SUCCESS: ${message}`);
    }
  }

  private showErrorMessage(message: string): void {
    const app = (window as any).app;
    if (app?.showStatus) {
      app.showStatus(message, 'error');
    } else {
      console.error(`ERROR: ${message}`);
    }
  }

  private async showConfirmDialog(
    title: string, 
    message: string, 
    confirmText: string = 'Confirm',
    type: 'warning' | 'danger' = 'warning'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>${title}</h3>
          </div>
          <div class="modal-body">
            <div class="confirm-icon ${type}">
              ${type === 'warning' ? '⚠️' : '🗑️'}
            </div>
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
            <button class="btn ${type === 'warning' ? 'btn-warning' : 'btn-danger'} confirm-btn">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.style.display = 'flex';

      const cancelBtn = modal.querySelector('.cancel-btn');
      const confirmBtn = modal.querySelector('.confirm-btn');

      const cleanup = () => {
        modal.remove();
      };

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // ESC key to cancel
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', handleKeydown);
        }
      };
      document.addEventListener('keydown', handleKeydown);
    });
  }
}

// Global instance
const playlistVideoManager = new PlaylistVideoManager();
(window as any).playlistVideoManager = playlistVideoManager;

export { playlistVideoManager };
