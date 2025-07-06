import { QualitySelectionDialog } from './quality-selection-dialog';

// Quality Selection Integration for existing JavaScript application
class QualitySelectionBridge {
  private dialog: QualitySelectionDialog;
  private selectedFormat: { formatId: string; displayName: string } | null = null;

  constructor() {
    this.dialog = new QualitySelectionDialog();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Select Quality button
    const selectQualityBtn = document.getElementById('select-quality-btn');
    selectQualityBtn?.addEventListener('click', () => {
      this.openQualitySelection();
    });

    // Change Quality button
    const changeQualityBtn = document.getElementById('change-quality-btn');
    changeQualityBtn?.addEventListener('click', () => {
      this.openQualitySelection();
    });

    // Auto-download checkbox handler
    const autoDownloadCheckbox = document.getElementById('auto-download-video') as HTMLInputElement;
    autoDownloadCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const settingsDiv = document.getElementById('video-download-settings');
      if (settingsDiv) {
        settingsDiv.style.display = target.checked ? 'block' : 'none';
      }
    });
  }

  private async openQualitySelection(): Promise<void> {
    const urlInput = document.getElementById('add-video-url') as HTMLInputElement;
    const url = urlInput?.value?.trim();

    if (!url) {
      this.showStatus('Please enter a video URL first', 'error');
      return;
    }

    try {
      await this.dialog.show(url, (formatId: string, customFormat?: any) => {
        this.onFormatSelected(formatId, customFormat);
      });
    } catch (error) {
      console.error('Failed to open quality selection dialog:', error);
      this.showStatus('Failed to load video formats', 'error');
    }
  }

  private onFormatSelected(formatId: string, customFormat?: any): void {
    // Store the selected format
    this.selectedFormat = {
      formatId: formatId,
      displayName: customFormat ? customFormat.format : formatId
    };

    // Update UI to show selected format
    const selectQualityBtn = document.getElementById('select-quality-btn');
    const selectedQualityInfo = document.getElementById('selected-quality-info');
    const selectedQualityText = document.getElementById('selected-quality-text');

    if (selectQualityBtn && selectedQualityInfo && selectedQualityText) {
      selectQualityBtn.style.display = 'none';
      selectedQualityInfo.style.display = 'flex';
      
      // Set display text based on format
      let displayText = formatId;
      if (formatId === 'best') {
        displayText = 'Best Available Quality';
      } else if (formatId === 'worst') {
        displayText = 'Lowest Available Quality';
      } else if (customFormat) {
        displayText = `Custom: ${customFormat.format}`;
      } else {
        // For specific format IDs, we'll show a simplified version
        displayText = `Format: ${formatId}`;
      }
      
      selectedQualityText.textContent = displayText;
    }

    this.showStatus('Quality selected successfully', 'success');
  }

  public getSelectedFormat(): { formatId: string; displayName: string } | null {
    return this.selectedFormat;
  }

  public resetSelection(): void {
    this.selectedFormat = null;
    
    const selectQualityBtn = document.getElementById('select-quality-btn');
    const selectedQualityInfo = document.getElementById('selected-quality-info');
    
    if (selectQualityBtn && selectedQualityInfo) {
      selectQualityBtn.style.display = 'block';
      selectedQualityInfo.style.display = 'none';
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    // Use the existing status system from main.js
    const playlist = (window as any).playlist;
    if (playlist && playlist.showStatus) {
      playlist.showStatus(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Initialize the quality selection bridge when DOM is loaded
let qualitySelectionBridge: QualitySelectionBridge | undefined;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    qualitySelectionBridge = new QualitySelectionBridge();
    (window as any).qualitySelectionBridge = qualitySelectionBridge;
  });
} else {
  qualitySelectionBridge = new QualitySelectionBridge();
  (window as any).qualitySelectionBridge = qualitySelectionBridge;
}

export { QualitySelectionBridge };
