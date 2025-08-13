/**
 * EditorActions - Modular editor enhancement with floating action bar and settings persistence
 * Integrates with existing search systems via hooks/global objects
 * No dependencies, vanilla JS
 */

(function(window) {
    'use strict';

    // Main EditorActions object
    const EditorActions = {
        // Configuration
        config: {
            editorSelector: '#editor',
            settingsSelector: '#settings-content',
            storageKey: 'editor.settings',
            legacyThemeKey: 'editor.theme',
            debounceDelay: 300,
            searchApi: null
        },

        // Internal state
        state: {
            editor: null,
            settingsContainer: null,
            actionBar: null,
            settings: {},
            debounceTimer: null,
            initialized: false
        },

        /**
         * Initialize the EditorActions module
         * @param {Object} options - Configuration options
         */
        init(options = {}) {
            if (this.state.initialized) {
                console.warn('EditorActions already initialized');
                return;
            }

            // Merge configuration
            Object.assign(this.config, options);

            // Initialize components
            this.initEditor();
            this.initSettings();
            this.initActionBar();
            this.initKeyboardShortcuts();
            this.initSearchIntegration();

            this.state.initialized = true;
            console.log('EditorActions initialized successfully');
        },

        /**
         * Initialize editor reference
         */
        initEditor() {
            this.state.editor = document.querySelector(this.config.editorSelector);
            if (!this.state.editor) {
                throw new Error(`Editor not found: ${this.config.editorSelector}`);
            }
        },

        /**
         * Initialize settings persistence system
         */
        initSettings() {
            this.state.settingsContainer = document.querySelector(this.config.settingsSelector);
            
            // Load settings from localStorage
            this.loadSettings();
            
            // If no settings container exists, create a minimal one
            if (!this.state.settingsContainer) {
                this.createMinimalSettings();
            }
            
            // Apply loaded settings to DOM
            this.applySettingsToDOM();
            
            // Setup change listeners for all form controls
            this.setupSettingsListeners();
        },

        /**
         * Load settings from localStorage with migration support
         */
        loadSettings() {
            try {
                // Load main settings
                const stored = localStorage.getItem(this.config.storageKey);
                this.state.settings = stored ? JSON.parse(stored) : {};

                // Migration: check for legacy theme setting
                if (!this.state.settings.theme) {
                    const legacyTheme = localStorage.getItem(this.config.legacyThemeKey);
                    if (legacyTheme) {
                        this.state.settings.theme = legacyTheme;
                        // Remove legacy key after migration
                        localStorage.removeItem(this.config.legacyThemeKey);
                        this.saveSettings();
                    }
                }

                // Set defaults
                this.state.settings = {
                    theme: 'light',
                    actionBarVisible: true,
                    highlightColor: '#ffeb3b',
                    ...this.state.settings
                };

            } catch (error) {
                console.error('Error loading settings:', error);
                this.state.settings = {
                    theme: 'light',
                    actionBarVisible: true,
                    highlightColor: '#ffeb3b'
                };
            }
        },

        /**
         * Save settings to localStorage with debouncing
         */
        saveSettings() {
            clearTimeout(this.state.debounceTimer);
            this.state.debounceTimer = setTimeout(() => {
                try {
                    localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.settings));
                } catch (error) {
                    console.error('Error saving settings:', error);
                }
            }, this.config.debounceDelay);
        },

        /**
         * Apply settings to DOM controls
         */
        applySettingsToDOM() {
            if (!this.state.settingsContainer) return;

            // Apply to all form controls with name attribute
            const controls = this.state.settingsContainer.querySelectorAll('input[name], textarea[name], select[name]');
            controls.forEach(control => {
                const key = control.name;
                if (key in this.state.settings) {
                    const value = this.state.settings[key];
                    
                    if (control.type === 'checkbox') {
                        control.checked = Boolean(value);
                    } else if (control.type === 'radio') {
                        control.checked = control.value === value;
                    } else {
                        control.value = value;
                    }
                    
                    // Dispatch events so the app detects changes
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Apply to custom controls with data-setting-key
            const customControls = this.state.settingsContainer.querySelectorAll('[data-setting-key]');
            customControls.forEach(control => {
                const key = control.dataset.settingKey;
                if (key in this.state.settings) {
                    const value = this.state.settings[key];
                    
                    if (control.type === 'checkbox') {
                        control.checked = Boolean(value);
                    } else {
                        control.value = value;
                    }
                    
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        },

        /**
         * Setup event listeners for settings changes
         */
        setupSettingsListeners() {
            if (!this.state.settingsContainer) return;

            // Listen for changes on all form controls
            this.state.settingsContainer.addEventListener('input', (e) => {
                this.handleSettingChange(e.target);
            });

            this.state.settingsContainer.addEventListener('change', (e) => {
                this.handleSettingChange(e.target);
            });
        },

        /**
         * Handle individual setting changes
         */
        handleSettingChange(control) {
            const key = control.name || control.dataset.settingKey;
            if (!key) return;

            let value;
            if (control.type === 'checkbox') {
                value = control.checked;
            } else if (control.type === 'radio') {
                value = control.checked ? control.value : this.state.settings[key];
            } else {
                value = control.value;
            }

            // Update settings
            this.state.settings[key] = value;
            this.saveSettings();

            // Handle special settings
            if (key === 'actionBarVisible') {
                this.toggleActionBar(value);
            }
        },

        /**
         * Create minimal settings if container doesn't exist
         */
        createMinimalSettings() {
            const badge = document.createElement('div');
            badge.className = 'editor-actions-settings-badge';
            badge.innerHTML = `
                <button type="button" class="settings-toggle" aria-label="Toggle Settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                    </svg>
                </button>
                <div class="settings-panel hidden">
                    <label>
                        <input type="checkbox" name="actionBarVisible" checked>
                        Show Action Bar
                    </label>
                </div>
            `;

            document.body.appendChild(badge);
            this.state.settingsContainer = badge.querySelector('.settings-panel');

            // Toggle panel
            badge.querySelector('.settings-toggle').addEventListener('click', () => {
                badge.querySelector('.settings-panel').classList.toggle('hidden');
            });

            this.setupSettingsListeners();
        },

        /**
         * Initialize floating action bar
         */
        initActionBar() {
            this.createActionBar();
            this.toggleActionBar(this.state.settings.actionBarVisible);
        },

        /**
         * Create the floating action bar
         */
        createActionBar() {
            // Find the editor container
            const editorContainer = document.querySelector('#editor-container') ||
                                  document.querySelector('.editor-container') ||
                                  this.state.editor?.closest('.editor-panel') ||
                                  this.state.editor?.parentElement;

            if (!editorContainer) {
                console.warn('Editor container not found, appending to body');
                this.createActionBarInBody();
                return;
            }

            const actionBar = document.createElement('div');
            actionBar.className = 'editor-actions-bar';
            actionBar.innerHTML = `
                <button type="button" class="action-btn paste-btn" aria-label="Paste from clipboard" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z"/>
                    </svg>
                    <span>Paste</span>
                </button>
                <button type="button" class="action-btn copy-btn" aria-label="Copy selected text" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                    <span>Copy</span>
                </button>
                <button type="button" class="action-btn clear-btn" aria-label="Clear content" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    <span>Clear</span>
                </button>
            `;

            // Append to editor container instead of body
            editorContainer.appendChild(actionBar);
            this.state.actionBar = actionBar;

            console.log('Action bar created in editor container:', editorContainer);

            // Setup button event listeners
            this.setupActionBarListeners();
        },

        /**
         * Fallback: Create action bar in body with fixed positioning
         */
        createActionBarInBody() {
            const actionBar = document.createElement('div');
            actionBar.className = 'editor-actions-bar';
            actionBar.style.position = 'fixed';
            actionBar.style.bottom = '20px';
            actionBar.style.left = '50%';
            actionBar.style.transform = 'translateX(-50%)';
            actionBar.innerHTML = `
                <button type="button" class="action-btn paste-btn" aria-label="Paste from clipboard" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z"/>
                    </svg>
                    <span>Paste</span>
                </button>
                <button type="button" class="action-btn copy-btn" aria-label="Copy selected text" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                    <span>Copy</span>
                </button>
                <button type="button" class="action-btn clear-btn" aria-label="Clear content" tabindex="0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    <span>Clear</span>
                </button>
            `;

            document.body.appendChild(actionBar);
            this.state.actionBar = actionBar;

            console.log('Action bar created in body as fallback');

            // Setup button event listeners
            this.setupActionBarListeners();
        },

        /**
         * Setup action bar button listeners
         */
        setupActionBarListeners() {
            const pasteBtn = this.state.actionBar.querySelector('.paste-btn');
            const copyBtn = this.state.actionBar.querySelector('.copy-btn');
            const clearBtn = this.state.actionBar.querySelector('.clear-btn');

            pasteBtn.addEventListener('click', () => this.handlePaste());
            copyBtn.addEventListener('click', () => this.handleCopy());
            clearBtn.addEventListener('click', () => this.handleClear());
        },

        /**
         * Handle paste action
         */
        async handlePaste() {
            try {
                if (!navigator.clipboard) {
                    throw new Error('Clipboard API not available. Please use HTTPS.');
                }

                const text = await navigator.clipboard.readText();
                this.insertTextAtCursor(text);
                
                this.showToast('Text pasted successfully', 'success');
                this.dispatchCustomEvent('editoractions:pasted', { text });

            } catch (error) {
                console.error('Paste error:', error);
                this.showToast('Failed to paste: ' + error.message, 'error');
            }
        },

        /**
         * Handle copy action
         */
        async handleCopy() {
            try {
                if (!navigator.clipboard) {
                    throw new Error('Clipboard API not available. Please use HTTPS.');
                }

                const selectedText = this.getSelectedText();
                const textToCopy = selectedText || this.state.editor.value || this.state.editor.textContent || '';

                await navigator.clipboard.writeText(textToCopy);
                
                const message = selectedText ? 'Selected text copied' : 'All content copied';
                this.showToast(message, 'success');
                this.dispatchCustomEvent('editoractions:copied', { text: textToCopy, wasSelection: !!selectedText });

            } catch (error) {
                console.error('Copy error:', error);
                this.showToast('Failed to copy: ' + error.message, 'error');
            }
        },

        /**
         * Handle clear action
         */
        handleClear() {
            const selectedText = this.getSelectedText();
            
            if (selectedText) {
                // Clear selection
                this.insertTextAtCursor('');
                this.showToast('Selection cleared', 'success');
                this.dispatchCustomEvent('editoractions:cleared', { type: 'selection' });
            } else {
                // Clear all content with confirmation
                if (confirm('Are you sure you want to clear all content?')) {
                    if (this.state.editor.tagName === 'TEXTAREA' || this.state.editor.tagName === 'INPUT') {
                        this.state.editor.value = '';
                    } else {
                        this.state.editor.textContent = '';
                    }
                    
                    this.state.editor.dispatchEvent(new Event('input', { bubbles: true }));
                    this.showToast('All content cleared', 'success');
                    this.dispatchCustomEvent('editoractions:cleared', { type: 'all' });
                }
            }
        },

        /**
         * Get selected text from editor
         */
        getSelectedText() {
            if (this.state.editor.tagName === 'TEXTAREA' || this.state.editor.tagName === 'INPUT') {
                const start = this.state.editor.selectionStart;
                const end = this.state.editor.selectionEnd;
                return this.state.editor.value.substring(start, end);
            } else {
                return window.getSelection().toString();
            }
        },

        /**
         * Insert text at cursor position
         */
        insertTextAtCursor(text) {
            if (this.state.editor.tagName === 'TEXTAREA' || this.state.editor.tagName === 'INPUT') {
                const start = this.state.editor.selectionStart;
                const end = this.state.editor.selectionEnd;
                const value = this.state.editor.value;
                
                this.state.editor.value = value.substring(0, start) + text + value.substring(end);
                this.state.editor.selectionStart = this.state.editor.selectionEnd = start + text.length;
                
            } else {
                // ContentEditable
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    range.collapse(false);
                }
            }
            
            this.state.editor.focus();
            this.state.editor.dispatchEvent(new Event('input', { bubbles: true }));
        },

        /**
         * Toggle action bar visibility
         */
        toggleActionBar(visible) {
            if (!this.state.actionBar) return;
            
            if (visible) {
                this.state.actionBar.classList.remove('hidden');
            } else {
                this.state.actionBar.classList.add('hidden');
            }
        },

        /**
         * Initialize keyboard shortcuts
         */
        initKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Only handle shortcuts when editor is focused or search is active
                if (!this.state.editor.contains(document.activeElement) && 
                    !document.querySelector('.search-panel:not(.hidden)')) {
                    return;
                }

                // Delegate to search API if available
                if (this.config.searchApi) {
                    if (e.ctrlKey && e.key === 'f') {
                        e.preventDefault();
                        this.config.searchApi.openFind?.();
                        return;
                    }
                    
                    if (e.ctrlKey && e.key === 'h') {
                        e.preventDefault();
                        this.config.searchApi.openReplace?.();
                        return;
                    }
                    
                    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
                        if (document.querySelector('.search-panel:not(.hidden)')) {
                            e.preventDefault();
                            if (e.shiftKey) {
                                this.config.searchApi.findPrev?.();
                            } else {
                                this.config.searchApi.findNext?.();
                            }
                            return;
                        }
                    }
                }
            });
        },

        /**
         * Initialize search integration
         */
        initSearchIntegration() {
            // Try to detect global search object
            if (!this.config.searchApi && window.EditorSearch) {
                this.config.searchApi = window.EditorSearch;
            }

            // Also try common search object names
            if (!this.config.searchApi) {
                const searchObjects = ['searchReplace', 'SearchReplace', 'search'];
                for (const name of searchObjects) {
                    if (window[name] && typeof window[name] === 'object') {
                        this.config.searchApi = window[name];
                        break;
                    }
                }
            }

            if (this.config.searchApi) {
                console.log('EditorActions: Search integration enabled');
            }
        },

        /**
         * Show toast notification
         */
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `editor-actions-toast toast-${type}`;
            toast.textContent = message;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'polite');

            document.body.appendChild(toast);

            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 10);

            // Remove after delay
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * Dispatch custom event
         */
        dispatchCustomEvent(eventName, detail = {}) {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            this.state.editor.dispatchEvent(event);
        },

        /**
         * Public API for settings
         */
        get(key) {
            return key ? this.state.settings[key] : { ...this.state.settings };
        },

        set(obj) {
            Object.assign(this.state.settings, obj);
            this.saveSettings();
            this.applySettingsToDOM();
        },

        /**
         * Get highlight color for search integration
         */
        getHighlightColor() {
            return this.state.settings.highlightColor || '#ffeb3b';
        }
    };

    // Create EditorSettings alias for backward compatibility
    const EditorSettings = {
        init: (opts) => EditorActions.init(opts),
        get: (key) => EditorActions.get(key),
        set: (obj) => EditorActions.set(obj)
    };

    // Export to global scope
    window.EditorActions = EditorActions;
    window.EditorSettings = EditorSettings;

})(window);