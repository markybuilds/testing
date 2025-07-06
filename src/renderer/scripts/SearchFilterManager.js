/**
 * Advanced Search and Filter Manager for YouTube Playlist Manager
 * Provides comprehensive search across playlists, videos, and metadata
 */
class SearchFilterManager {
    constructor(options = {}) {
        this.options = {
            enableFuzzySearch: true,
            enableRealTimeSearch: true,
            debounceMs: 300,
            maxResults: 50,
            highlightMatches: true,
            enableFilters: true,
            enableSavedSearches: true,
            ...options
        };

        // Search state
        this.currentQuery = '';
        this.activeFilters = new Map();
        this.searchHistory = [];
        this.savedSearches = [];
        this.searchResults = {
            playlists: [],
            videos: [],
            total: 0
        };

        // Filter definitions
        this.filterDefinitions = {
            duration: {
                type: 'range',
                label: 'Duration',
                options: [
                    { value: 'short', label: 'Short (< 4 min)', filter: video => this.parseDuration(video.duration) < 240 },
                    { value: 'medium', label: 'Medium (4-20 min)', filter: video => {
                        const duration = this.parseDuration(video.duration);
                        return duration >= 240 && duration <= 1200;
                    }},
                    { value: 'long', label: 'Long (> 20 min)', filter: video => this.parseDuration(video.duration) > 1200 }
                ]
            },
            dateAdded: {
                type: 'date',
                label: 'Date Added',
                options: [
                    { value: 'today', label: 'Today', filter: video => this.isToday(video.addedDate || video.added_at) },
                    { value: 'week', label: 'This Week', filter: video => this.isThisWeek(video.addedDate || video.added_at) },
                    { value: 'month', label: 'This Month', filter: video => this.isThisMonth(video.addedDate || video.added_at) },
                    { value: 'older', label: 'Older', filter: video => this.isOlder(video.addedDate || video.added_at) }
                ]
            },
            quality: {
                type: 'select',
                label: 'Quality',
                options: [
                    { value: 'hd', label: 'HD (720p+)', filter: video => this.isHDQuality(video) },
                    { value: 'sd', label: 'SD (< 720p)', filter: video => !this.isHDQuality(video) }
                ]
            },
            channel: {
                type: 'autocomplete',
                label: 'Channel',
                getOptions: () => this.getUniqueChannels(),
                filter: (video, value) => (video.uploader || video.channel || '').toLowerCase().includes(value.toLowerCase())
            },
            playlist: {
                type: 'select',
                label: 'Playlist',
                getOptions: () => this.getPlaylistOptions(),
                filter: (video, value) => video.playlistId == value
            }
        };

        // Search algorithms
        this.searchAlgorithms = {
            simple: this.simpleSearch.bind(this),
            fuzzy: this.fuzzySearch.bind(this),
            advanced: this.advancedSearch.bind(this)
        };

        this.init();
    }

    /**
     * Initialize the search and filter manager
     */
    init() {
        this.loadSavedSearches();
        this.setupEventListeners();
        this.createSearchInterface();
    }

    /**
     * Create the search interface UI
     */
    createSearchInterface() {
        // Check if search interface already exists
        if (document.getElementById('search-filter-container')) {
            return;
        }

        const searchHTML = `
            <div id="search-filter-container" class="search-filter-container">
                <div class="search-header">
                    <div class="search-input-container">
                        <div class="search-input-wrapper">
                            <input type="text" 
                                   id="global-search-input" 
                                   class="search-input"
                                   placeholder="Search playlists, videos, channels..."
                                   autocomplete="off">
                            <button id="search-clear-btn" class="search-clear-btn" style="display: none;">
                                <span class="icon-close">×</span>
                            </button>
                        </div>
                        <button id="search-submit-btn" class="btn btn-primary search-submit-btn">
                            <span class="icon-search">🔍</span>
                        </button>
                        <button id="filter-toggle-btn" class="btn btn-outline filter-toggle-btn">
                            <span class="icon-filter">🔧</span>
                            Filters
                        </button>
                    </div>
                    
                    <div class="search-actions">
                        <button id="search-history-btn" class="btn btn-sm btn-outline">
                            <span class="icon-history">🕐</span>
                            History
                        </button>
                        <button id="saved-searches-btn" class="btn btn-sm btn-outline">
                            <span class="icon-bookmark">📌</span>
                            Saved
                        </button>
                        <button id="advanced-search-btn" class="btn btn-sm btn-outline">
                            <span class="icon-settings">⚙️</span>
                            Advanced
                        </button>
                    </div>
                </div>

                <div id="filter-panel" class="filter-panel" style="display: none;">
                    <div class="filter-panel-header">
                        <h4>Filters</h4>
                        <button id="filter-clear-all" class="btn btn-sm btn-outline">Clear All</button>
                    </div>
                    <div id="filter-controls" class="filter-controls">
                        <!-- Filter controls will be dynamically generated -->
                    </div>
                    <div class="filter-panel-footer">
                        <span id="filter-count" class="filter-count">0 filters active</span>
                    </div>
                </div>

                <div id="search-results-container" class="search-results-container" style="display: none;">
                    <div class="search-results-header">
                        <div class="search-results-info">
                            <h3>Search Results</h3>
                            <span id="search-results-count" class="search-results-count">0 results</span>
                        </div>
                        <div class="search-results-actions">
                            <button id="save-search-btn" class="btn btn-sm btn-outline">
                                <span class="icon-save">💾</span>
                                Save Search
                            </button>
                            <button id="export-results-btn" class="btn btn-sm btn-outline">
                                <span class="icon-export">📤</span>
                                Export
                            </button>
                        </div>
                    </div>
                    
                    <div class="search-results-tabs">
                        <button class="search-tab active" data-tab="all">
                            All (<span id="all-count">0</span>)
                        </button>
                        <button class="search-tab" data-tab="playlists">
                            Playlists (<span id="playlists-count">0</span>)
                        </button>
                        <button class="search-tab" data-tab="videos">
                            Videos (<span id="videos-count">0</span>)
                        </button>
                    </div>

                    <div id="search-results-content" class="search-results-content">
                        <!-- Search results will be populated here -->
                    </div>
                    
                    <div id="search-pagination" class="search-pagination">
                        <!-- Pagination controls -->
                    </div>
                </div>

                <!-- Search History Modal -->
                <div id="search-history-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Search History</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="search-history-list" class="search-history-list">
                                <!-- History items will be populated here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="clear-history-btn" class="btn btn-outline">Clear History</button>
                            <button class="btn btn-secondary modal-close">Close</button>
                        </div>
                    </div>
                </div>

                <!-- Saved Searches Modal -->
                <div id="saved-searches-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Saved Searches</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="saved-searches-list" class="saved-searches-list">
                                <!-- Saved searches will be populated here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-close">Close</button>
                        </div>
                    </div>
                </div>

                <!-- Advanced Search Modal -->
                <div id="advanced-search-modal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h3>Advanced Search</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="advanced-search-form">
                                <div class="form-group">
                                    <label>Search Type</label>
                                    <select id="search-type-select" class="form-control">
                                        <option value="simple">Simple Search</option>
                                        <option value="fuzzy">Fuzzy Search</option>
                                        <option value="advanced">Advanced Search</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Search Fields</label>
                                    <div class="checkbox-group">
                                        <label><input type="checkbox" checked value="title"> Title</label>
                                        <label><input type="checkbox" checked value="description"> Description</label>
                                        <label><input type="checkbox" value="channel"> Channel</label>
                                        <label><input type="checkbox" value="tags"> Tags</label>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Result Limit</label>
                                    <select id="result-limit-select" class="form-control">
                                        <option value="25">25 results</option>
                                        <option value="50" selected>50 results</option>
                                        <option value="100">100 results</option>
                                        <option value="all">All results</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Sort By</label>
                                    <select id="sort-by-select" class="form-control">
                                        <option value="relevance">Relevance</option>
                                        <option value="title">Title</option>
                                        <option value="date">Date Added</option>
                                        <option value="duration">Duration</option>
                                        <option value="channel">Channel</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="advanced-search-submit" class="btn btn-primary">Search</button>
                            <button class="btn btn-secondary modal-close">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert search interface at the top of the main content area
        const mainContent = document.querySelector('.page[data-page="playlists"]') || 
                           document.querySelector('.page');
        if (mainContent) {
            mainContent.insertAdjacentHTML('afterbegin', searchHTML);
            this.generateFilterControls();
        }
    }

    /**
     * Setup event listeners for search functionality
     */
    setupEventListeners() {
        // Debounced search input
        let searchTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.id === 'global-search-input') {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                // Show/hide clear button
                const clearBtn = document.getElementById('search-clear-btn');
                if (clearBtn) {
                    clearBtn.style.display = query ? 'block' : 'none';
                }

                if (this.options.enableRealTimeSearch) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, this.options.debounceMs);
                }
            }
        });

        // Search submit
        document.addEventListener('click', (e) => {
            if (e.target.id === 'search-submit-btn' || e.target.closest('#search-submit-btn')) {
                const input = document.getElementById('global-search-input');
                if (input) {
                    this.performSearch(input.value.trim());
                }
            }
        });

        // Clear search
        document.addEventListener('click', (e) => {
            if (e.target.id === 'search-clear-btn' || e.target.closest('#search-clear-btn')) {
                this.clearSearch();
            }
        });

        // Filter toggle
        document.addEventListener('click', (e) => {
            if (e.target.id === 'filter-toggle-btn' || e.target.closest('#filter-toggle-btn')) {
                this.toggleFilterPanel();
            }
        });

        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-tab')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Modal triggers
        document.addEventListener('click', (e) => {
            if (e.target.id === 'search-history-btn') {
                this.showSearchHistory();
            } else if (e.target.id === 'saved-searches-btn') {
                this.showSavedSearches();
            } else if (e.target.id === 'advanced-search-btn') {
                this.showAdvancedSearch();
            }
        });

        // Enter key search
        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'global-search-input' && e.key === 'Enter') {
                this.performSearch(e.target.value.trim());
            }
        });
    }

    /**
     * Generate filter controls dynamically
     */
    generateFilterControls() {
        const filterContainer = document.getElementById('filter-controls');
        if (!filterContainer) return;

        let controlsHTML = '';

        Object.entries(this.filterDefinitions).forEach(([key, filter]) => {
            controlsHTML += `
                <div class="filter-control" data-filter="${key}">
                    <label class="filter-label">${filter.label}</label>
                    ${this.generateFilterInput(key, filter)}
                </div>
            `;
        });

        filterContainer.innerHTML = controlsHTML;
        this.setupFilterEventListeners();
    }

    /**
     * Generate specific filter input based on type
     */
    generateFilterInput(key, filter) {
        switch (filter.type) {
            case 'range':
            case 'select':
                return `
                    <select class="filter-select" data-filter-key="${key}">
                        <option value="">All</option>
                        ${filter.options.map(option => 
                            `<option value="${option.value}">${option.label}</option>`
                        ).join('')}
                    </select>
                `;
            
            case 'date':
                return `
                    <select class="filter-select" data-filter-key="${key}">
                        <option value="">Any time</option>
                        ${filter.options.map(option => 
                            `<option value="${option.value}">${option.label}</option>`
                        ).join('')}
                    </select>
                `;
            
            case 'autocomplete':
                return `
                    <input type="text" 
                           class="filter-input" 
                           data-filter-key="${key}"
                           placeholder="Type to filter..."
                           autocomplete="off">
                    <div class="autocomplete-suggestions" data-filter="${key}" style="display: none;"></div>
                `;
            
            default:
                return `
                    <input type="text" 
                           class="filter-input" 
                           data-filter-key="${key}"
                           placeholder="Enter ${filter.label.toLowerCase()}...">
                `;
        }
    }

    /**
     * Setup event listeners for filter controls
     */
    setupFilterEventListeners() {
        // Filter change events
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('filter-select')) {
                const key = e.target.dataset.filterKey;
                const value = e.target.value;
                this.updateFilter(key, value);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('filter-input')) {
                const key = e.target.dataset.filterKey;
                const value = e.target.value;
                
                // Handle autocomplete
                if (this.filterDefinitions[key].type === 'autocomplete') {
                    this.showAutocompleteSuggestions(key, value);
                }
                
                // Debounced filter update
                clearTimeout(this.filterTimeout);
                this.filterTimeout = setTimeout(() => {
                    this.updateFilter(key, value);
                }, 300);
            }
        });

        // Clear all filters
        document.addEventListener('click', (e) => {
            if (e.target.id === 'filter-clear-all') {
                this.clearAllFilters();
            }
        });
    }

    /**
     * Perform search with current query and filters
     */
    async performSearch(query) {
        if (!query && this.activeFilters.size === 0) {
            this.hideSearchResults();
            return;
        }

        this.currentQuery = query;
        
        // Add to search history
        if (query && !this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 50); // Keep last 50 searches
            this.saveSearchHistory();
        }

        try {
            // Show loading state
            this.showSearchLoading();

            // Get all data to search
            const allPlaylists = await this.getAllPlaylists();
            const allVideos = await this.getAllVideos();

            // Perform search
            const searchAlgorithm = this.searchAlgorithms[this.getCurrentSearchType()];
            const results = searchAlgorithm(query, allPlaylists, allVideos);

            // Apply filters
            const filteredResults = this.applyFilters(results);

            // Update results
            this.searchResults = filteredResults;
            this.displaySearchResults(filteredResults);

        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError(error.message);
        }
    }

    /**
     * Simple search algorithm
     */
    simpleSearch(query, playlists, videos) {
        if (!query) {
            return { playlists, videos, total: playlists.length + videos.length };
        }

        const queryLower = query.toLowerCase();
        
        const matchingPlaylists = playlists.filter(playlist => 
            this.matchesQuery(playlist, queryLower, ['title', 'description'])
        );

        const matchingVideos = videos.filter(video => 
            this.matchesQuery(video, queryLower, ['title', 'description', 'uploader', 'channel'])
        );

        return {
            playlists: matchingPlaylists,
            videos: matchingVideos,
            total: matchingPlaylists.length + matchingVideos.length
        };
    }

    /**
     * Fuzzy search algorithm with scoring
     */
    fuzzySearch(query, playlists, videos) {
        if (!query) {
            return { playlists, videos, total: playlists.length + videos.length };
        }

        const queryLower = query.toLowerCase();
        
        // Score and filter playlists
        const scoredPlaylists = playlists.map(playlist => ({
            ...playlist,
            score: this.calculateFuzzyScore(playlist, queryLower)
        })).filter(item => item.score > 0.3)
          .sort((a, b) => b.score - a.score);

        // Score and filter videos
        const scoredVideos = videos.map(video => ({
            ...video,
            score: this.calculateFuzzyScore(video, queryLower)
        })).filter(item => item.score > 0.3)
          .sort((a, b) => b.score - a.score);

        return {
            playlists: scoredPlaylists,
            videos: scoredVideos,
            total: scoredPlaylists.length + scoredVideos.length
        };
    }

    /**
     * Advanced search with field-specific queries
     */
    advancedSearch(query, playlists, videos) {
        // Parse advanced query syntax (e.g., "title:cats channel:funny")
        const parsedQuery = this.parseAdvancedQuery(query);
        
        const matchingPlaylists = playlists.filter(playlist => 
            this.matchesAdvancedQuery(playlist, parsedQuery)
        );

        const matchingVideos = videos.filter(video => 
            this.matchesAdvancedQuery(video, parsedQuery)
        );

        return {
            playlists: matchingPlaylists,
            videos: matchingVideos,
            total: matchingPlaylists.length + matchingVideos.length
        };
    }

    /**
     * Check if item matches query in specified fields
     */
    matchesQuery(item, query, fields) {
        return fields.some(field => {
            const value = item[field];
            return value && value.toString().toLowerCase().includes(query);
        });
    }

    /**
     * Calculate fuzzy search score
     */
    calculateFuzzyScore(item, query) {
        let maxScore = 0;
        const fields = ['title', 'description', 'uploader', 'channel'];
        
        fields.forEach(field => {
            const value = item[field];
            if (value) {
                const score = this.fuzzyMatch(value.toLowerCase(), query);
                maxScore = Math.max(maxScore, score);
            }
        });

        return maxScore;
    }

    /**
     * Fuzzy string matching
     */
    fuzzyMatch(text, pattern) {
        if (text.includes(pattern)) return 1.0;
        
        let score = 0;
        let patternIndex = 0;
        
        for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
            if (text[i] === pattern[patternIndex]) {
                score += 1.0 / (1 + i - patternIndex);
                patternIndex++;
            }
        }
        
        return patternIndex === pattern.length ? score / pattern.length : 0;
    }

    /**
     * Parse advanced query syntax
     */
    parseAdvancedQuery(query) {
        const parsed = {
            general: [],
            fields: {}
        };

        const fieldPattern = /(\w+):([^\s]+)/g;
        let match;
        let processedQuery = query;

        while ((match = fieldPattern.exec(query)) !== null) {
            const [fullMatch, field, value] = match;
            parsed.fields[field] = value;
            processedQuery = processedQuery.replace(fullMatch, '').trim();
        }

        if (processedQuery) {
            parsed.general = processedQuery.split(/\s+/);
        }

        return parsed;
    }

    /**
     * Check if item matches advanced query
     */
    matchesAdvancedQuery(item, parsedQuery) {
        // Check field-specific queries
        for (const [field, value] of Object.entries(parsedQuery.fields)) {
            const itemValue = item[field];
            if (!itemValue || !itemValue.toString().toLowerCase().includes(value.toLowerCase())) {
                return false;
            }
        }

        // Check general terms
        if (parsedQuery.general.length > 0) {
            const searchFields = ['title', 'description', 'uploader', 'channel'];
            return parsedQuery.general.every(term => 
                searchFields.some(field => {
                    const value = item[field];
                    return value && value.toString().toLowerCase().includes(term.toLowerCase());
                })
            );
        }

        return true;
    }

    /**
     * Apply active filters to search results
     */
    applyFilters(results) {
        if (this.activeFilters.size === 0) {
            return results;
        }

        const filteredPlaylists = results.playlists.filter(playlist => 
            this.passesAllFilters(playlist, 'playlist')
        );

        const filteredVideos = results.videos.filter(video => 
            this.passesAllFilters(video, 'video')
        );

        return {
            playlists: filteredPlaylists,
            videos: filteredVideos,
            total: filteredPlaylists.length + filteredVideos.length
        };
    }

    /**
     * Check if item passes all active filters
     */
    passesAllFilters(item, type) {
        for (const [filterKey, filterValue] of this.activeFilters) {
            if (!filterValue) continue;

            const filterDef = this.filterDefinitions[filterKey];
            if (!filterDef) continue;

            // Skip filters that don't apply to this type
            if (filterKey === 'playlist' && type === 'playlist') continue;

            let passes = false;

            if (filterDef.type === 'range' || filterDef.type === 'select' || filterDef.type === 'date') {
                const option = filterDef.options.find(opt => opt.value === filterValue);
                if (option && option.filter) {
                    passes = option.filter(item);
                }
            } else if (filterDef.filter) {
                passes = filterDef.filter(item, filterValue);
            }

            if (!passes) return false;
        }

        return true;
    }

    /**
     * Update a specific filter
     */
    updateFilter(key, value) {
        if (!value) {
            this.activeFilters.delete(key);
        } else {
            this.activeFilters.set(key, value);
        }

        this.updateFilterCount();
        
        // Re-apply search if we have results
        if (this.searchResults.total > 0) {
            this.performSearch(this.currentQuery);
        }
    }

    /**
     * Clear all active filters
     */
    clearAllFilters() {
        this.activeFilters.clear();
        
        // Reset all filter controls
        document.querySelectorAll('.filter-select').forEach(select => {
            select.value = '';
        });
        
        document.querySelectorAll('.filter-input').forEach(input => {
            input.value = '';
        });

        this.updateFilterCount();
        
        // Re-apply search if we have results
        if (this.searchResults.total > 0) {
            this.performSearch(this.currentQuery);
        }
    }

    /**
     * Update filter count display
     */
    updateFilterCount() {
        const filterCount = document.getElementById('filter-count');
        const count = this.activeFilters.size;
        if (filterCount) {
            filterCount.textContent = `${count} filter${count !== 1 ? 's' : ''} active`;
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        const container = document.getElementById('search-results-container');
        const content = document.getElementById('search-results-content');
        const countElement = document.getElementById('search-results-count');
        
        if (!container || !content || !countElement) return;

        // Update counts
        countElement.textContent = `${results.total} results`;
        document.getElementById('all-count').textContent = results.total;
        document.getElementById('playlists-count').textContent = results.playlists.length;
        document.getElementById('videos-count').textContent = results.videos.length;

        // Show results container
        container.style.display = 'block';

        // Display current tab content
        this.displayTabContent('all', results);
    }

    /**
     * Display content for specific tab
     */
    displayTabContent(tab, results) {
        const content = document.getElementById('search-results-content');
        if (!content) return;

        let html = '';

        switch (tab) {
            case 'playlists':
                html = this.renderPlaylistResults(results.playlists);
                break;
            case 'videos':
                html = this.renderVideoResults(results.videos);
                break;
            case 'all':
            default:
                html = this.renderMixedResults(results);
                break;
        }

        content.innerHTML = html;
    }

    /**
     * Render playlist search results
     */
    renderPlaylistResults(playlists) {
        if (playlists.length === 0) {
            return '<div class="no-results">No playlists found</div>';
        }

        return playlists.map(playlist => `
            <div class="search-result-item playlist-result" data-playlist-id="${playlist.id}">
                <div class="result-thumbnail">
                    <img src="${playlist.thumbnail || 'https://via.placeholder.com/120x90'}" 
                         alt="${this.escapeHtml(playlist.title)}" 
                         loading="lazy">
                    <div class="result-type-badge">Playlist</div>
                </div>
                <div class="result-content">
                    <h4 class="result-title">${this.highlightMatches(playlist.title)}</h4>
                    <p class="result-description">${this.highlightMatches(playlist.description || 'No description')}</p>
                    <div class="result-meta">
                        <span class="meta-item">${playlist.video_count || 0} videos</span>
                        <span class="meta-item">Created ${this.formatDate(playlist.created_at)}</span>
                        <span class="meta-item">Category: ${playlist.category || 'Uncategorized'}</span>
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.app.viewPlaylistDetails(${playlist.id})">
                        <span class="icon-eye">👁</span> View
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.app.downloadPlaylist(${playlist.id})">
                        <span class="icon-download">⬇️</span> Download
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render video search results
     */
    renderVideoResults(videos) {
        if (videos.length === 0) {
            return '<div class="no-results">No videos found</div>';
        }

        return videos.map(video => `
            <div class="search-result-item video-result" data-video-id="${video.id}">
                <div class="result-thumbnail">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/120x90'}" 
                         alt="${this.escapeHtml(video.title)}" 
                         loading="lazy">
                    <div class="result-type-badge">Video</div>
                    ${video.duration ? `<div class="video-duration">${video.duration}</div>` : ''}
                </div>
                <div class="result-content">
                    <h4 class="result-title">${this.highlightMatches(video.title)}</h4>
                    <p class="result-description">${this.highlightMatches(video.description || 'No description')}</p>
                    <div class="result-meta">
                        ${video.uploader ? `<span class="meta-item">Channel: ${this.highlightMatches(video.uploader)}</span>` : ''}
                        ${video.views ? `<span class="meta-item">${this.formatNumber(video.views)} views</span>` : ''}
                        ${video.upload_date ? `<span class="meta-item">Uploaded ${this.formatDate(video.upload_date)}</span>` : ''}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.viewVideo('${video.url || video.webpage_url}')">
                        <span class="icon-play">▶️</span> Watch
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.downloadSingleVideo('${video.id}')">
                        <span class="icon-download">⬇️</span> Download
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render mixed search results (playlists and videos)
     */
    renderMixedResults(results) {
        const combined = [
            ...results.playlists.map(p => ({ ...p, type: 'playlist' })),
            ...results.videos.map(v => ({ ...v, type: 'video' }))
        ];

        if (combined.length === 0) {
            return '<div class="no-results">No results found</div>';
        }

        // Sort by relevance score if available
        combined.sort((a, b) => (b.score || 0) - (a.score || 0));

        return combined.map(item => {
            if (item.type === 'playlist') {
                return this.renderPlaylistResults([item]);
            } else {
                return this.renderVideoResults([item]);
            }
        }).join('');
    }

    /**
     * Switch between result tabs
     */
    switchTab(tab) {
        // Update tab appearance
        document.querySelectorAll('.search-tab').forEach(tabEl => {
            tabEl.classList.toggle('active', tabEl.dataset.tab === tab);
        });

        // Display content for selected tab
        this.displayTabContent(tab, this.searchResults);
    }

    /**
     * Clear search and hide results
     */
    clearSearch() {
        const input = document.getElementById('global-search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        
        if (input) {
            input.value = '';
        }
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        this.currentQuery = '';
        this.hideSearchResults();
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        const container = document.getElementById('search-results-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Toggle filter panel
     */
    toggleFilterPanel() {
        const panel = document.getElementById('filter-panel');
        const btn = document.getElementById('filter-toggle-btn');
        
        if (panel && btn) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            btn.classList.toggle('active', !isVisible);
        }
    }

    /**
     * Show search loading state
     */
    showSearchLoading() {
        const content = document.getElementById('search-results-content');
        if (content) {
            content.innerHTML = '<div class="search-loading">Searching...</div>';
        }
        
        const container = document.getElementById('search-results-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Show search error
     */
    showSearchError(message) {
        const content = document.getElementById('search-results-content');
        if (content) {
            content.innerHTML = `<div class="search-error">Search failed: ${this.escapeHtml(message)}</div>`;
        }
    }

    /**
     * Highlight search matches in text
     */
    highlightMatches(text) {
        if (!this.options.highlightMatches || !this.currentQuery || !text) {
            return this.escapeHtml(text);
        }

        const query = this.currentQuery.toLowerCase();
        const escapedText = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Get all playlists for search
     */
    async getAllPlaylists() {
        try {
            if (window.electronAPI && window.electronAPI.database) {
                return await window.electronAPI.database.getPlaylists();
            }
            return [];
        } catch (error) {
            console.error('Failed to get playlists for search:', error);
            return [];
        }
    }

    /**
     * Get all videos for search
     */
    async getAllVideos() {
        try {
            if (window.electronAPI && window.electronAPI.database) {
                // We need to get videos from all playlists
                const playlists = await window.electronAPI.database.getPlaylists();
                const allVideos = [];
                
                for (const playlist of playlists) {
                    const videos = await window.electronAPI.database.getPlaylistVideos(playlist.id);
                    allVideos.push(...videos.map(video => ({ ...video, playlistId: playlist.id })));
                }
                
                return allVideos;
            }
            return [];
        } catch (error) {
            console.error('Failed to get videos for search:', error);
            return [];
        }
    }

    /**
     * Utility functions
     */
    
    getCurrentSearchType() {
        const select = document.getElementById('search-type-select');
        return select ? select.value : 'simple';
    }

    parseDuration(duration) {
        if (!duration) return 0;
        const parts = duration.split(':').map(p => parseInt(p, 10));
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return parseInt(duration, 10) || 0;
    }

    isToday(date) {
        if (!date) return false;
        const today = new Date();
        const checkDate = new Date(date);
        return checkDate.toDateString() === today.toDateString();
    }

    isThisWeek(date) {
        if (!date) return false;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const checkDate = new Date(date);
        return checkDate >= weekAgo;
    }

    isThisMonth(date) {
        if (!date) return false;
        const now = new Date();
        const checkDate = new Date(date);
        return checkDate.getMonth() === now.getMonth() && 
               checkDate.getFullYear() === now.getFullYear();
    }

    isOlder(date) {
        return !this.isThisMonth(date);
    }

    isHDQuality(video) {
        // This would need to be implemented based on video quality data
        return true; // Placeholder
    }

    getUniqueChannels() {
        // This would return a list of unique channels from the database
        return [];
    }

    getPlaylistOptions() {
        // This would return playlist options for filtering
        return [];
    }

    formatDate(date) {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleDateString();
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toLocaleString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showSearchHistory() {
        // TODO: Implement search history modal
        console.log('Show search history');
    }

    showSavedSearches() {
        // TODO: Implement saved searches modal
        console.log('Show saved searches');
    }

    showAdvancedSearch() {
        // TODO: Implement advanced search modal
        console.log('Show advanced search');
    }

    loadSavedSearches() {
        // TODO: Load saved searches from storage
    }

    saveSearchHistory() {
        // TODO: Save search history to storage
    }

    /**
     * Public API methods
     */
    
    search(query) {
        return this.performSearch(query);
    }

    addFilter(key, value) {
        this.updateFilter(key, value);
    }

    removeFilter(key) {
        this.updateFilter(key, '');
    }

    getResults() {
        return this.searchResults;
    }

    destroy() {
        // Cleanup event listeners and state
        this.activeFilters.clear();
        this.searchHistory = [];
        this.savedSearches = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchFilterManager;
} else {
    window.SearchFilterManager = SearchFilterManager;
}
