import { ipcRenderer } from 'electron';
import { VideoFormat, VideoFormats } from '../main/services/format-detection';

export class QualitySelectionDialog {
  private modal: HTMLElement | null = null;
  private onSelectionCallback: ((formatId: string, customFormat?: VideoFormat) => void) | null = null;
  private currentFormats: VideoFormats | null = null;
  private loadingIndicator: HTMLElement | null = null;

  constructor() {
    this.createModal();
    this.setupEventListeners();
  }

  private createModal(): void {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'quality-selection-backdrop';
    backdrop.innerHTML = `
      <div class="quality-selection-modal">
        <div class="quality-selection-header">
          <h3>Select Video Quality</h3>
          <button class="close-btn" type="button">&times;</button>
        </div>
        
        <div class="quality-selection-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Analyzing available formats...</p>
        </div>
        
        <div class="quality-selection-content">
          <div class="video-info">
            <div class="video-thumbnail"></div>
            <div class="video-details">
              <h4 class="video-title">Loading...</h4>
              <p class="video-duration">Duration: --:--</p>
              <p class="video-uploader">Uploader: Loading...</p>
            </div>
          </div>
          
          <div class="format-selection-tabs">
            <button class="tab-btn active" data-tab="combined">Combined (Video + Audio)</button>
            <button class="tab-btn" data-tab="video">Video Only</button>
            <button class="tab-btn" data-tab="audio">Audio Only</button>
            <button class="tab-btn" data-tab="custom">Custom</button>
          </div>
          
          <div class="format-selection-content">
            <!-- Combined formats tab -->
            <div class="tab-content active" data-tab="combined">
              <div class="format-grid">
                <div class="format-column">
                  <h5>Recommended</h5>
                  <div class="format-list recommended-formats"></div>
                </div>
                <div class="format-column">
                  <h5>All Available</h5>
                  <div class="format-list all-combined-formats"></div>
                </div>
              </div>
            </div>
            
            <!-- Video only tab -->
            <div class="tab-content" data-tab="video">
              <div class="format-grid">
                <div class="format-column">
                  <h5>High Quality</h5>
                  <div class="format-list high-quality-video"></div>
                </div>
                <div class="format-column">
                  <h5>Standard Quality</h5>
                  <div class="format-list standard-quality-video"></div>
                </div>
              </div>
              <div class="video-only-notice">
                <i>⚠️ Video-only formats require separate audio download and merging</i>
              </div>
            </div>
            
            <!-- Audio only tab -->
            <div class="tab-content" data-tab="audio">
              <div class="format-list audio-formats"></div>
            </div>
            
            <!-- Custom tab -->
            <div class="tab-content" data-tab="custom">
              <div class="custom-format-builder">
                <div class="custom-option">
                  <label>Video Format:</label>
                  <select class="custom-video-select">
                    <option value="">No Video</option>
                  </select>
                </div>
                <div class="custom-option">
                  <label>Audio Format:</label>
                  <select class="custom-audio-select">
                    <option value="">No Audio</option>
                  </select>
                </div>
                <div class="custom-option">
                  <label>Container:</label>
                  <select class="custom-container-select">
                    <option value="mp4">MP4</option>
                    <option value="mkv">MKV</option>
                    <option value="webm">WebM</option>
                  </select>
                </div>
                <div class="custom-preview">
                  <h5>Download Preview:</h5>
                  <div class="custom-preview-content">
                    <p class="custom-preview-text">Select formats to see preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="quality-selection-footer">
          <div class="selected-format-info">
            <span class="selected-format-text">No format selected</span>
          </div>
          <div class="action-buttons">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
            <button class="btn btn-primary download-btn" disabled>Download</button>
          </div>
        </div>
      </div>
    `;

    this.modal = backdrop;
    document.body.appendChild(backdrop);
    this.loadingIndicator = backdrop.querySelector('.quality-selection-loading');
  }

  private setupEventListeners(): void {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Cancel button
    const cancelBtn = this.modal.querySelector('.cancel-btn');
    cancelBtn?.addEventListener('click', () => this.hide());

    // Download button
    const downloadBtn = this.modal.querySelector('.download-btn');
    downloadBtn?.addEventListener('click', () => this.handleDownload());

    // Tab switching
    const tabBtns = this.modal.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // Custom format selectors
    const customSelects = this.modal.querySelectorAll('.custom-format-builder select');
    customSelects.forEach(select => {
      select.addEventListener('change', () => this.updateCustomPreview());
    });

    // Format selection
    this.modal.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('format-option')) {
        await this.selectFormat(target);
      }
    });

    // Backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
  }

  async show(url: string, callback: (formatId: string, customFormat?: VideoFormat) => void): Promise<void> {
    if (!this.modal) return;

    this.onSelectionCallback = callback;
    this.modal.style.display = 'flex';
    
    // Show loading
    this.showLoading();
    
    try {
      // Get video info and formats
      const [videoInfo, formats] = await Promise.all([
        ipcRenderer.invoke('get-video-info', url),
        ipcRenderer.invoke('get-video-formats', url)
      ]);

      this.currentFormats = formats;
      
      // Update video info
      this.updateVideoInfo(videoInfo);
      
      // Populate format options
      await this.populateFormats(formats);
      
      // Hide loading
      this.hideLoading();
      
    } catch (error) {
      console.error('Error loading video formats:', error);
      this.showError('Failed to load video information. Please check the URL and try again.');
    }
  }

  private showLoading(): void {
    if (!this.modal || !this.loadingIndicator) return;
    
    this.loadingIndicator.style.display = 'block';
    const content = this.modal.querySelector('.quality-selection-content') as HTMLElement;
    if (content) content.style.display = 'none';
  }

  private hideLoading(): void {
    if (!this.modal || !this.loadingIndicator) return;
    
    this.loadingIndicator.style.display = 'none';
    const content = this.modal.querySelector('.quality-selection-content') as HTMLElement;
    if (content) content.style.display = 'block';
  }

  private showError(message: string): void {
    if (!this.modal || !this.loadingIndicator) return;
    
    this.loadingIndicator.innerHTML = `
      <div class="error-icon">⚠️</div>
      <p>${message}</p>
      <button class="btn btn-secondary retry-btn">Retry</button>
    `;
    
    const retryBtn = this.loadingIndicator.querySelector('.retry-btn');
    retryBtn?.addEventListener('click', () => {
      this.hide();
    });
  }

  private updateVideoInfo(videoInfo: any): void {
    if (!this.modal) return;

    const thumbnail = this.modal.querySelector('.video-thumbnail') as HTMLElement;
    const title = this.modal.querySelector('.video-title') as HTMLElement;
    const duration = this.modal.querySelector('.video-duration') as HTMLElement;
    const uploader = this.modal.querySelector('.video-uploader') as HTMLElement;

    if (videoInfo.thumbnail) {
      thumbnail.style.backgroundImage = `url(${videoInfo.thumbnail})`;
    }

    if (title) title.textContent = videoInfo.title || 'Unknown Title';
    if (duration) duration.textContent = `Duration: ${this.formatDuration(videoInfo.duration)}`;
    if (uploader) uploader.textContent = `Uploader: ${videoInfo.uploader || 'Unknown'}`;
  }

  private async populateFormats(formats: VideoFormats): Promise<void> {
    if (!this.modal || !formats) return;

    // Populate combined formats
    await this.populateCombinedFormats(formats);
    
    // Populate video-only formats
    await this.populateVideoFormats(formats);
    
    // Populate audio-only formats
    await this.populateAudioFormats(formats);
    
    // Populate custom selectors
    await this.populateCustomSelectors(formats);
  }

  private async populateCombinedFormats(formats: VideoFormats): Promise<void> {
    const recommended = this.modal?.querySelector('.recommended-formats');
    const allCombined = this.modal?.querySelector('.all-combined-formats');

    if (!recommended || !allCombined) return;

    // Get combined formats (video + audio)
    const combinedFormats = formats.formats.filter(f => 
      f.vcodec && f.vcodec !== 'none' && 
      f.acodec && f.acodec !== 'none'
    );

    // Recommended formats (best quality options)
    const recommendedFormats = [
      formats.best_combined,
      ...combinedFormats.filter(f => f.height && f.height >= 1080).slice(0, 3)
    ].filter(Boolean) as VideoFormat[];

    recommended.innerHTML = await this.generateFormatOptions(recommendedFormats);
    allCombined.innerHTML = await this.generateFormatOptions(combinedFormats);
  }

  private async populateVideoFormats(formats: VideoFormats): Promise<void> {
    const highQuality = this.modal?.querySelector('.high-quality-video');
    const standardQuality = this.modal?.querySelector('.standard-quality-video');

    if (!highQuality || !standardQuality) return;

    const videoFormats = formats.formats.filter(f => 
      f.vcodec && f.vcodec !== 'none' && 
      (!f.acodec || f.acodec === 'none')
    );

    const highQualityFormats = videoFormats.filter(f => f.height && f.height >= 720);
    const standardQualityFormats = videoFormats.filter(f => f.height && f.height < 720);

    highQuality.innerHTML = await this.generateFormatOptions(highQualityFormats);
    standardQuality.innerHTML = await this.generateFormatOptions(standardQualityFormats);
  }

  private async populateAudioFormats(formats: VideoFormats): Promise<void> {
    const audioContainer = this.modal?.querySelector('.audio-formats');
    if (!audioContainer) return;

    const audioFormats = formats.formats.filter(f => 
      f.acodec && f.acodec !== 'none' && 
      (!f.vcodec || f.vcodec === 'none')
    );

    audioContainer.innerHTML = await this.generateFormatOptions(audioFormats);
  }

  private async populateCustomSelectors(formats: VideoFormats): Promise<void> {
    if (!this.modal) return;

    const videoSelect = this.modal.querySelector('.custom-video-select') as HTMLSelectElement;
    const audioSelect = this.modal.querySelector('.custom-audio-select') as HTMLSelectElement;

    if (!videoSelect || !audioSelect) return;

    // Video options
    const videoFormats = formats.formats.filter(f => 
      f.vcodec && f.vcodec !== 'none'
    );
    
    const videoOptions = await Promise.all(videoFormats.map(async (f) => {
      const displayName = await this.getFormatDisplayName(f);
      return `<option value="${f.format_id}">${displayName}</option>`;
    }));
    
    videoSelect.innerHTML = '<option value="">No Video</option>' + videoOptions.join('');

    // Audio options
    const audioFormats = formats.formats.filter(f => 
      f.acodec && f.acodec !== 'none'
    );
    
    const audioOptions = await Promise.all(audioFormats.map(async (f) => {
      const displayName = await this.getFormatDisplayName(f);
      return `<option value="${f.format_id}">${displayName}</option>`;
    }));
    
    audioSelect.innerHTML = '<option value="">No Audio</option>' + audioOptions.join('');
  }

  private async generateFormatOptions(formats: VideoFormat[]): Promise<string> {
    const formatOptions = await Promise.all(formats.map(async (format) => {
      const displayName = await this.getFormatDisplayName(format);
      const fileSize = format.filesize ? this.formatFileSize(format.filesize) : 'Unknown size';
      const bitrate = format.tbr || format.vbr || format.abr;
      const bitrateText = bitrate ? `${Math.round(bitrate)} kbps` : '';
      
      return `
        <div class="format-option" data-format-id="${format.format_id}">
          <div class="format-main">
            <span class="format-quality">${displayName}</span>
            <span class="format-size">${fileSize}</span>
          </div>
          <div class="format-details">
            <span class="format-codec">${format.ext?.toUpperCase()}</span>
            ${bitrateText ? `<span class="format-bitrate">${bitrateText}</span>` : ''}
          </div>
        </div>
      `;
    }));

    return formatOptions.join('');
  }

  private async getFormatDisplayName(format: VideoFormat): Promise<string> {
    // Use the service method through IPC
    return await ipcRenderer.invoke('get-format-display-name', format);
  }

  private async selectFormat(element: HTMLElement): Promise<void> {
    if (!this.modal) return;

    // Remove previous selections
    const previousSelected = this.modal.querySelectorAll('.format-option.selected');
    previousSelected.forEach(el => el.classList.remove('selected'));

    // Select this format
    element.classList.add('selected');

    // Update selected format info
    const formatId = element.dataset.formatId;
    if (formatId && this.currentFormats) {
      const format = this.currentFormats.formats.find(f => f.format_id === formatId);
      if (format) {
        await this.updateSelectedFormatInfo(format);
      }
    }

    // Enable download button
    const downloadBtn = this.modal.querySelector('.download-btn') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }
  }

  private async updateSelectedFormatInfo(format: VideoFormat): Promise<void> {
    if (!this.modal) return;

    const infoElement = this.modal.querySelector('.selected-format-text');
    if (!infoElement) return;

    const displayName = await this.getFormatDisplayName(format);
    const fileSize = format.filesize ? this.formatFileSize(format.filesize) : 'Unknown size';
    
    infoElement.textContent = `${displayName} • ${fileSize}`;
  }

  private switchTab(tabName: string): void {
    if (!this.modal) return;

    // Update tab buttons
    const tabBtns = this.modal.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      const htmlBtn = btn as HTMLElement;
      htmlBtn.classList.toggle('active', htmlBtn.dataset.tab === tabName);
    });

    // Update tab content
    const tabContents = this.modal.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      const htmlContent = content as HTMLElement;
      htmlContent.classList.toggle('active', htmlContent.dataset.tab === tabName);
    });

    // Clear selection when switching tabs
    this.clearSelection();
  }

  private clearSelection(): void {
    if (!this.modal) return;

    const selected = this.modal.querySelectorAll('.format-option.selected');
    selected.forEach(el => el.classList.remove('selected'));

    const downloadBtn = this.modal.querySelector('.download-btn') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = true;
    }

    const infoElement = this.modal.querySelector('.selected-format-text');
    if (infoElement) {
      infoElement.textContent = 'No format selected';
    }
  }

  private updateCustomPreview(): void {
    if (!this.modal) return;

    const videoSelect = this.modal.querySelector('.custom-video-select') as HTMLSelectElement;
    const audioSelect = this.modal.querySelector('.custom-audio-select') as HTMLSelectElement;
    const containerSelect = this.modal.querySelector('.custom-container-select') as HTMLSelectElement;
    const previewContent = this.modal.querySelector('.custom-preview-content');

    if (!videoSelect || !audioSelect || !containerSelect || !previewContent) return;

    const videoId = videoSelect.value;
    const audioId = audioSelect.value;
    const container = containerSelect.value;

    if (!videoId && !audioId) {
      previewContent.innerHTML = '<p class="custom-preview-text">Select formats to see preview</p>';
      return;
    }

    let previewText = 'Custom download: ';
    const details: string[] = [];

    if (videoId && this.currentFormats) {
      const videoFormat = this.currentFormats.formats.find(f => f.format_id === videoId);
      if (videoFormat) {
        details.push(`Video: ${this.getFormatDisplayName(videoFormat)}`);
      }
    }

    if (audioId && this.currentFormats) {
      const audioFormat = this.currentFormats.formats.find(f => f.format_id === audioId);
      if (audioFormat) {
        details.push(`Audio: ${this.getFormatDisplayName(audioFormat)}`);
      }
    }

    details.push(`Container: ${container.toUpperCase()}`);

    previewContent.innerHTML = `
      <p class="custom-preview-text">${previewText}</p>
      <ul class="custom-preview-details">
        ${details.map(detail => `<li>${detail}</li>`).join('')}
      </ul>
    `;

    // Enable download button for custom
    const downloadBtn = this.modal.querySelector('.download-btn') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }
  }

  private handleDownload(): void {
    if (!this.modal || !this.onSelectionCallback) return;

    const activeTabElement = this.modal.querySelector('.tab-btn.active') as HTMLElement;
    const activeTab = activeTabElement?.dataset.tab;

    if (activeTab === 'custom') {
      this.handleCustomDownload();
    } else {
      this.handleStandardDownload();
    }
  }

  private handleStandardDownload(): void {
    if (!this.modal) return;

    const selected = this.modal.querySelector('.format-option.selected') as HTMLElement;
    if (!selected) return;

    const formatId = selected.dataset.formatId;
    if (formatId && this.onSelectionCallback) {
      this.onSelectionCallback(formatId);
      this.hide();
    }
  }

  private handleCustomDownload(): void {
    if (!this.modal || !this.currentFormats) return;

    const videoSelect = this.modal.querySelector('.custom-video-select') as HTMLSelectElement;
    const audioSelect = this.modal.querySelector('.custom-audio-select') as HTMLSelectElement;
    const containerSelect = this.modal.querySelector('.custom-container-select') as HTMLSelectElement;

    const videoId = videoSelect.value;
    const audioId = audioSelect.value;
    const container = containerSelect.value;

    if (!videoId && !audioId) return;

    // Create custom format object
    const customFormat: VideoFormat = {
      format_id: `custom_${videoId || 'novideo'}_${audioId || 'noaudio'}`,
      ext: container,
      format: `Custom: ${videoId || 'no video'} + ${audioId || 'no audio'}`,
      vcodec: videoId ? 'custom' : 'none',
      acodec: audioId ? 'custom' : 'none'
    };

    // Add additional format IDs for yt-dlp
    if (videoId && audioId) {
      customFormat.format = `${videoId}+${audioId}`;
    } else {
      customFormat.format = videoId || audioId || 'best';
    }

    if (this.onSelectionCallback) {
      this.onSelectionCallback(customFormat.format_id, customFormat);
      this.hide();
    }
  }

  private hide(): void {
    if (!this.modal) return;

    this.modal.style.display = 'none';
    this.onSelectionCallback = null;
    this.currentFormats = null;
    this.clearSelection();
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
