// Search and Replace functionality for MarkMirror Mobile
// Supports both CodeMirror and SimpleEditor

// Note: CodeMirror decorations will be imported dynamically when needed
// to avoid errors when CodeMirror is not available

export class SearchReplace {
    constructor(editor, options = {}) {
        this.editor = editor;
        this.options = {
            caseSensitive: false,
            wholeWord: false,
            useRegex: false,
            confirmReplace: false,
            ...options
        };
        
        // Search state
        this.searchTerm = '';
        this.replaceTerm = '';
        this.matches = [];
        this.currentMatchIndex = -1;
        this.isSearchActive = false;
        this.lastReplaceAction = null;
        this.confirmModeState = null;
        this.editorType = 'unknown';
        
        // UI elements
        this.panel = null;
        this.searchInput = null;
        this.replaceInput = null;
        this.statusElement = null;
        this.resultsElement = null;
        
        // Highlighting
        this.highlightMarks = [];
        this.currentHighlight = null;
        
        this.init();
    }

    // Initialize the search and replace functionality
    init() {
        this.detectEditorType();
        this.setupUI();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    // Detect editor type for better compatibility
    detectEditorType() {
        if (this.editor.view) {
            this.editorType = 'codemirror';
            console.log('SearchReplace: Detected CodeMirror editor');
        } else if (this.editor.textarea) {
            this.editorType = 'simple';
            console.log('SearchReplace: Detected SimpleEditor');
        } else {
            this.editorType = 'unknown';
            console.warn('SearchReplace: Unknown editor type');
        }
    }

    // Setup UI elements
    setupUI() {
        this.panel = document.getElementById('search-panel');
        this.searchInput = document.getElementById('search-input');
        this.replaceInput = document.getElementById('replace-input');
        this.statusElement = document.getElementById('search-status');
        this.resultsElement = document.getElementById('search-results');
        
        // Option buttons
        this.regexToggle = document.getElementById('search-regex-toggle');
        this.caseToggle = document.getElementById('search-case-toggle');
        this.wholeWordToggle = document.getElementById('search-whole-word-toggle');
    }

    // Setup event listeners
    setupEventListeners() {
        if (!this.panel) return;

        // Toggle panel
        const searchToggle = document.getElementById('search-toggle');
        const searchClose = document.getElementById('search-close');
        
        if (searchToggle) {
            searchToggle.addEventListener('click', () => this.togglePanel());
        }
        
        if (searchClose) {
            searchClose.addEventListener('click', () => this.hidePanel());
        }

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }

        // Replace input
        if (this.replaceInput) {
            this.replaceInput.addEventListener('keydown', (e) => this.handleReplaceKeydown(e));
        }

        // Navigation buttons
        const prevBtn = document.getElementById('search-prev');
        const nextBtn = document.getElementById('search-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.findPrevious());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.findNext());
        }

        // Replace buttons
        const replaceCurrent = document.getElementById('replace-current');
        const replaceAll = document.getElementById('replace-all');
        const confirmMode = document.getElementById('replace-confirm-mode');
        
        if (replaceCurrent) {
            replaceCurrent.addEventListener('click', () => this.replaceCurrent());
        }
        
        if (replaceAll) {
            replaceAll.addEventListener('click', () => this.replaceAll());
        }
        
        if (confirmMode) {
            confirmMode.addEventListener('click', () => this.toggleConfirmMode());
        }

        // Confirm mode controls
        const confirmYes = document.getElementById('confirm-replace-yes');
        const confirmNo = document.getElementById('confirm-replace-no');
        const confirmAllRemaining = document.getElementById('confirm-replace-all-remaining');
        const confirmStop = document.getElementById('confirm-replace-stop');

        if (confirmYes) {
            confirmYes.addEventListener('click', () => this.confirmReplaceYes());
        }

        if (confirmNo) {
            confirmNo.addEventListener('click', () => this.confirmReplaceNo());
        }

        if (confirmAllRemaining) {
            confirmAllRemaining.addEventListener('click', () => this.confirmReplaceAllRemaining());
        }

        if (confirmStop) {
            confirmStop.addEventListener('click', () => this.confirmReplaceStop());
        }

        // Option toggles
        if (this.regexToggle) {
            this.regexToggle.addEventListener('click', () => this.toggleOption('useRegex'));
        }
        
        if (this.caseToggle) {
            this.caseToggle.addEventListener('click', () => this.toggleOption('caseSensitive'));
        }
        
        if (this.wholeWordToggle) {
            this.wholeWordToggle.addEventListener('click', () => this.toggleOption('wholeWord'));
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (this.panel && !this.panel.contains(e.target) && 
                !document.getElementById('search-toggle').contains(e.target)) {
                if (!this.panel.classList.contains('hidden')) {
                    this.hidePanel();
                }
            }
        });
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F - Open search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.showPanel();
                return;
            }

            // Ctrl+H - Open search and replace
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.showPanel(true);
                return;
            }

            // Ctrl+G - Find next (alternative to F3)
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                if (this.isSearchActive) {
                    if (e.shiftKey) {
                        this.findPrevious();
                    } else {
                        this.findNext();
                    }
                }
                return;
            }

            // Escape - Close panel
            if (e.key === 'Escape' && this.isSearchActive) {
                e.preventDefault();
                this.hidePanel();
                return;
            }

            // F3 - Find next
            if (e.key === 'F3' && this.isSearchActive) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevious();
                } else {
                    this.findNext();
                }
                return;
            }

            // Ctrl+Enter - Replace current and find next
            if (e.ctrlKey && e.key === 'Enter' && this.isSearchActive) {
                e.preventDefault();
                if (this.matches.length > 0 && this.currentMatchIndex >= 0) {
                    this.replaceCurrent();
                }
                return;
            }

            // Ctrl+Shift+Enter - Replace all
            if (e.ctrlKey && e.shiftKey && e.key === 'Enter' && this.isSearchActive) {
                e.preventDefault();
                this.replaceAll();
                return;
            }

            // Alt+R - Toggle regex mode
            if (e.altKey && e.key === 'r' && this.isSearchActive) {
                e.preventDefault();
                this.toggleOption('useRegex');
                return;
            }

            // Alt+C - Toggle case sensitivity
            if (e.altKey && e.key === 'c' && this.isSearchActive) {
                e.preventDefault();
                this.toggleOption('caseSensitive');
                return;
            }

            // Alt+W - Toggle whole word
            if (e.altKey && e.key === 'w' && this.isSearchActive) {
                e.preventDefault();
                this.toggleOption('wholeWord');
                return;
            }

            // Enter in search field - Find next
            if (e.key === 'Enter' && e.target === this.searchInput) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevious();
                } else {
                    this.findNext();
                }
                return;
            }
        });
    }

    // Toggle search panel visibility
    togglePanel() {
        if (this.panel.classList.contains('hidden')) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }

    // Show search panel
    showPanel(focusReplace = false) {
        if (!this.panel) return;
        
        this.panel.classList.remove('hidden');
        this.isSearchActive = true;
        
        // Focus appropriate input
        setTimeout(() => {
            if (focusReplace && this.replaceInput) {
                this.replaceInput.focus();
            } else if (this.searchInput) {
                this.searchInput.focus();
                this.searchInput.select();
            }
        }, 100);
        
        // If there's selected text in editor, use it as search term
        const selectedText = this.getSelectedText();
        if (selectedText && this.searchInput) {
            this.searchInput.value = selectedText;
            this.handleSearchInput({ target: this.searchInput });
        }
    }

    // Hide search panel
    hidePanel() {
        if (!this.panel) return;
        
        this.panel.classList.add('hidden');
        this.isSearchActive = false;
        this.clearHighlights();
        
        // Return focus to editor
        if (this.editor && this.editor.focus) {
            this.editor.focus();
        }
    }

    // Handle search input changes
    handleSearchInput(e) {
        this.searchTerm = e.target.value;

        if (this.searchTerm.length === 0) {
            this.clearSearch();
            return;
        }

        // Validate regex if regex mode is enabled
        if (this.options.useRegex) {
            if (!this.validateRegex(this.searchTerm)) {
                return; // Don't perform search if regex is invalid
            }
        }

        this.performSearch();
    }

    // Validate regular expression
    validateRegex(pattern) {
        try {
            new RegExp(pattern);
            this.clearRegexError();
            return true;
        } catch (error) {
            this.showRegexError(error.message);
            return false;
        }
    }

    // Show regex validation error
    showRegexError(message) {
        this.showStatus(`Ошибка в регулярном выражении: ${message}`, 'error');

        // Add error styling to search input
        if (this.searchInput) {
            this.searchInput.classList.add('regex-error');
        }
    }

    // Clear regex validation error
    clearRegexError() {
        // Remove error styling from search input
        if (this.searchInput) {
            this.searchInput.classList.remove('regex-error');
        }
    }

    // Handle search input keydown
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                this.findPrevious();
            } else {
                this.findNext();
            }
        }
    }

    // Handle replace input keydown
    handleReplaceKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.replaceCurrent();
        }
    }

    // Toggle search options
    toggleOption(option) {
        this.options[option] = !this.options[option];

        // Update button state
        const button = this.getOptionButton(option);
        if (button) {
            button.setAttribute('data-active', this.options[option].toString());
        }

        // Handle regex mode toggle
        if (option === 'useRegex') {
            this.handleRegexModeToggle();
        }

        // Re-perform search if active
        if (this.searchTerm) {
            this.performSearch();
        }
    }

    // Handle regex mode toggle
    handleRegexModeToggle() {
        if (this.options.useRegex) {
            // Entering regex mode
            this.showRegexHelp();
            if (this.searchInput) {
                this.searchInput.placeholder = 'Введите регулярное выражение... (например: \\d+ для чисел)';
            }
        } else {
            // Exiting regex mode
            this.clearRegexError();
            if (this.searchInput) {
                this.searchInput.placeholder = 'Введите текст для поиска...';
            }
        }

        // Update replace input placeholder
        this.updateReplaceInputPlaceholder();
    }

    // Show regex help
    showRegexHelp() {
        this.showStatus('Режим регулярных выражений активен. Примеры: \\d+ (числа), [a-z]+ (буквы), .* (любой текст)', 'info');
    }

    // Get option button element
    getOptionButton(option) {
        switch (option) {
            case 'useRegex': return this.regexToggle;
            case 'caseSensitive': return this.caseToggle;
            case 'wholeWord': return this.wholeWordToggle;
            default: return null;
        }
    }

    // Get selected text from editor
    getSelectedText() {
        switch (this.editorType) {
            case 'codemirror':
                if (this.editor.getSelection) {
                    return this.editor.getSelection();
                } else if (this.editor.view) {
                    const selection = this.editor.view.state.selection.main;
                    return this.editor.view.state.doc.sliceString(selection.from, selection.to);
                }
                break;
            case 'simple':
                if (this.editor.textarea) {
                    const textarea = this.editor.textarea;
                    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                }
                break;
            default:
                // Fallback detection
                if (this.editor.getSelection) {
                    return this.editor.getSelection();
                } else if (this.editor.textarea) {
                    const textarea = this.editor.textarea;
                    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                }
                break;
        }
        return '';
    }

    // Get editor content
    getEditorContent() {
        switch (this.editorType) {
            case 'codemirror':
                return this.editor.view.state.doc.toString();
            case 'simple':
                return this.editor.getContent();
            default:
                // Fallback detection
                if (this.editor.getContent) {
                    return this.editor.getContent();
                } else if (this.editor.view && this.editor.view.state) {
                    return this.editor.view.state.doc.toString();
                }
                return '';
        }
    }

    // Set editor content
    setEditorContent(content) {
        switch (this.editorType) {
            case 'codemirror':
                this.editor.view.dispatch({
                    changes: {
                        from: 0,
                        to: this.editor.view.state.doc.length,
                        insert: content
                    }
                });
                break;
            case 'simple':
                this.editor.setContent(content);
                break;
            default:
                // Fallback detection
                if (this.editor.setContent) {
                    this.editor.setContent(content);
                } else if (this.editor.view) {
                    this.editor.view.dispatch({
                        changes: {
                            from: 0,
                            to: this.editor.view.state.doc.length,
                            insert: content
                        }
                    });
                }
                break;
        }
    }

    // Perform search
    performSearch() {
        this.clearHighlights();
        this.matches = [];
        this.currentMatchIndex = -1;

        if (!this.searchTerm) {
            this.updateResults();
            return;
        }

        try {
            const content = this.getEditorContent();
            const matches = this.findMatches(content, this.searchTerm);

            this.matches = matches;
            this.updateResults();
            this.highlightMatches();

            if (matches.length > 0) {
                this.currentMatchIndex = 0;
                this.highlightCurrentMatch();
                this.scrollToMatch(0);
            }

            if (matches.length === 0) {
                this.showStatus('Совпадений не найдено', 'info');
            } else if (matches.length === 1) {
                this.showStatus('Найдено 1 совпадение', 'info');
            } else {
                this.showStatus(`Найдено ${matches.length} совпадений`, 'info');
            }

        } catch (error) {
            this.showStatus(`Ошибка поиска: ${error.message}`, 'error');
        }
    }

    // Find matches in content
    findMatches(content, searchTerm) {
        const matches = [];

        try {
            let regex;

            if (this.options.useRegex) {
                // Use regex search
                const flags = this.options.caseSensitive ? 'g' : 'gi';
                regex = new RegExp(searchTerm, flags);
            } else {
                // Escape special regex characters for literal search
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                let pattern = escapedTerm;

                // Add word boundaries if whole word option is enabled
                if (this.options.wholeWord) {
                    pattern = `\\b${pattern}\\b`;
                }

                const flags = this.options.caseSensitive ? 'g' : 'gi';
                regex = new RegExp(pattern, flags);
            }

            let match;
            while ((match = regex.exec(content)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    groups: match.slice(1) // Capture groups for regex
                });

                // Prevent infinite loop with zero-length matches
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }

        } catch (error) {
            throw new Error(`Неверное регулярное выражение: ${error.message}`);
        }

        return matches;
    }

    // Update search results display
    updateResults() {
        if (!this.resultsElement) return;

        const total = this.matches.length;
        const current = this.currentMatchIndex >= 0 ? this.currentMatchIndex + 1 : 0;

        this.resultsElement.textContent = `${current} из ${total}`;
    }

    // Show status message
    showStatus(message, type = 'info') {
        if (!this.statusElement) return;

        this.statusElement.textContent = message;
        this.statusElement.className = `search-status ${type}`;
        this.statusElement.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.statusElement.classList.add('hidden');
        }, 3000);
    }

    // Clear search
    clearSearch() {
        this.matches = [];
        this.currentMatchIndex = -1;
        this.clearHighlights();
        this.updateResults();

        if (this.statusElement) {
            this.statusElement.classList.add('hidden');
        }
    }

    // Find next match
    findNext() {
        if (this.matches.length === 0) {
            this.showStatus('Совпадений не найдено', 'info');
            return;
        }

        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
        this.highlightCurrentMatch();
        this.scrollToMatch(this.currentMatchIndex);
        this.updateResults();

        // Show replacement preview if replace text is entered
        if (this.replaceInput && this.replaceInput.value) {
            this.showReplacementPreview();
        }
    }

    // Find previous match
    findPrevious() {
        if (this.matches.length === 0) {
            this.showStatus('Совпадений не найдено', 'info');
            return;
        }

        this.currentMatchIndex = this.currentMatchIndex <= 0
            ? this.matches.length - 1
            : this.currentMatchIndex - 1;

        this.highlightCurrentMatch();
        this.scrollToMatch(this.currentMatchIndex);
        this.updateResults();

        // Show replacement preview if replace text is entered
        if (this.replaceInput && this.replaceInput.value) {
            this.showReplacementPreview();
        }
    }

    // Highlight all matches
    highlightMatches() {
        // Implementation depends on editor type
        if (this.editor.view) {
            this.highlightMatchesCodeMirror();
        } else if (this.editor.textarea) {
            this.highlightMatchesSimpleEditor();
        }
    }

    // Highlight current match
    highlightCurrentMatch() {
        // Implementation depends on editor type
        if (this.editor.view) {
            this.highlightCurrentMatchCodeMirror();
        } else if (this.editor.textarea) {
            this.highlightCurrentMatchSimpleEditor();
        }
    }

    // Clear all highlights
    clearHighlights() {
        // Implementation depends on editor type
        if (this.editor.view) {
            this.clearHighlightsCodeMirror();
        } else if (this.editor.textarea) {
            this.clearHighlightsSimpleEditor();
        }
    }

    // Scroll to match
    scrollToMatch(index) {
        if (index < 0 || index >= this.matches.length) return;

        const match = this.matches[index];

        // Implementation depends on editor type
        if (this.editor.view) {
            this.scrollToMatchCodeMirror(match);
        } else if (this.editor.textarea) {
            this.scrollToMatchSimpleEditor(match);
        }
    }

    // CodeMirror specific methods
    highlightMatchesCodeMirror() {
        // For now, we'll use selection-based highlighting
        // In a full implementation, you'd use CodeMirror decorations
        if (!this.editor.view || this.matches.length === 0) return;

        // Add CSS class to indicate search is active
        this.editor.view.dom.classList.add('search-active');

        // Apply custom highlight color if EditorActions is available
        this.applyHighlightColor();
    }

    highlightCurrentMatchCodeMirror() {
        if (!this.editor.view || this.currentMatchIndex < 0) return;

        const match = this.matches[this.currentMatchIndex];

        // Set selection to current match
        this.editor.setSelection(match.start, match.end);
    }

    clearHighlightsCodeMirror() {
        // Remove search active class
        if (this.editor.view) {
            this.editor.view.dom.classList.remove('search-active');
        }
    }

    scrollToMatchCodeMirror(match) {
        if (!this.editor.view) return;

        // Set selection and scroll to position
        this.editor.setSelection(match.start, match.end);
    }

    // SimpleEditor specific methods
    highlightMatchesSimpleEditor() {
        // For SimpleEditor, we'll use CSS to highlight matches
        // This is a simplified approach since textarea doesn't support rich highlighting
        this.updateSimpleEditorBackground();
    }

    highlightCurrentMatchSimpleEditor() {
        if (!this.editor.textarea || this.currentMatchIndex < 0) return;

        const match = this.matches[this.currentMatchIndex];
        const textarea = this.editor.textarea;

        // Select the current match
        textarea.setSelectionRange(match.start, match.end);
    }

    clearHighlightsSimpleEditor() {
        // Clear any custom highlighting
        this.removeSimpleEditorBackground();
    }

    scrollToMatchSimpleEditor(match) {
        if (!this.editor.textarea) return;

        const textarea = this.editor.textarea;

        // Set cursor position and scroll to it
        textarea.setSelectionRange(match.start, match.end);
        textarea.focus();

        // Calculate line number for scrolling
        const content = textarea.value;
        const beforeMatch = content.substring(0, match.start);
        const lineNumber = beforeMatch.split('\n').length;

        // Scroll to approximate line
        const lineHeight = 20; // Approximate line height
        const scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);
        textarea.scrollTop = scrollTop;
    }

    // Helper methods for SimpleEditor highlighting
    updateSimpleEditorBackground() {
        // Add a class to indicate search is active
        if (this.editor.textarea) {
            this.editor.textarea.classList.add('search-active');
        }
    }

    removeSimpleEditorBackground() {
        // Remove search active class
        if (this.editor.textarea) {
            this.editor.textarea.classList.remove('search-active');
        }
    }

    // Replace methods
    replaceCurrent() {
        if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.matches.length) {
            this.showStatus('Нет выбранного совпадения для замены', 'error');
            return;
        }

        const match = this.matches[this.currentMatchIndex];
        const replaceText = this.getReplaceText(match);

        // Store original content for potential undo
        const originalContent = this.getEditorContent();

        this.performReplace(match, replaceText);
        this.showStatus(`Заменено "${match.text}" на "${replaceText}"`, 'success');

        // Store undo information
        this.lastReplaceAction = {
            type: 'single',
            originalContent: originalContent,
            match: match,
            replaceText: replaceText
        };

        // Re-perform search to update matches
        setTimeout(() => {
            this.performSearch();
            // Try to maintain position near the replacement
            if (this.matches.length > 0) {
                // Find the closest match to where we were
                let newIndex = Math.min(this.currentMatchIndex, this.matches.length - 1);
                this.currentMatchIndex = newIndex;
                this.highlightCurrentMatch();
                this.updateResults();
            }
        }, 100);
    }

    // Replace all matches
    replaceAll() {
        if (this.matches.length === 0) {
            this.showStatus('Нет совпадений для замены', 'error');
            return;
        }

        const matchCount = this.matches.length;
        const confirmMessage = `Заменить все ${matchCount} совпадений?\n\nЭто действие нельзя отменить.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        // Store original content for potential undo
        const originalContent = this.getEditorContent();

        let newContent = originalContent;
        let totalReplacements = 0;

        // Replace matches from end to start to maintain positions
        for (let i = this.matches.length - 1; i >= 0; i--) {
            const match = this.matches[i];
            const replaceText = this.getReplaceText(match);

            newContent = newContent.substring(0, match.start) +
                        replaceText +
                        newContent.substring(match.end);
            totalReplacements++;
        }

        this.setEditorContent(newContent);

        // Store undo information
        this.lastReplaceAction = {
            type: 'all',
            originalContent: originalContent,
            replacementCount: totalReplacements
        };

        this.showStatus(`Заменено ${totalReplacements} совпадений`, 'success');

        // Clear search after replace all
        setTimeout(() => {
            this.clearSearch();
        }, 100);
    }

    // Get replacement text (handles regex groups)
    getReplaceText(match) {
        if (!this.replaceInput) return '';

        let replaceText = this.replaceInput.value;

        // Handle regex capture groups
        if (this.options.useRegex && match.groups) {
            // Replace $1, $2, etc. with capture groups
            for (let i = 0; i < match.groups.length; i++) {
                const group = match.groups[i] || '';
                replaceText = replaceText.replace(new RegExp(`\\$${i + 1}`, 'g'), group);
            }

            // Replace $& with the entire match
            replaceText = replaceText.replace(/\$&/g, match.text);

            // Replace $` with text before match (if needed in future)
            // Replace $' with text after match (if needed in future)
        }

        return replaceText;
    }

    // Update replace input placeholder based on regex mode
    updateReplaceInputPlaceholder() {
        if (!this.replaceInput) return;

        if (this.options.useRegex) {
            this.replaceInput.placeholder = 'Замена... (используйте $1, $2 для групп, $& для всего совпадения)';
        } else {
            this.replaceInput.placeholder = 'Введите текст для замены...';
        }
    }

    // Preview replacement for current match
    previewReplacement() {
        if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.matches.length) {
            return null;
        }

        const match = this.matches[this.currentMatchIndex];
        const replaceText = this.getReplaceText(match);

        return {
            original: match.text,
            replacement: replaceText,
            position: `позиция ${match.start}-${match.end}`
        };
    }

    // Show replacement preview in status
    showReplacementPreview() {
        const preview = this.previewReplacement();
        if (preview) {
            this.showStatus(
                `Заменить "${preview.original}" на "${preview.replacement}" (${preview.position})`,
                'info'
            );
        }
    }

    // Perform single replacement
    performReplace(match, replaceText) {
        const content = this.getEditorContent();
        const newContent = content.substring(0, match.start) +
                          replaceText +
                          content.substring(match.end);

        this.setEditorContent(newContent);
    }

    // Toggle confirm mode
    toggleConfirmMode() {
        this.options.confirmReplace = !this.options.confirmReplace;

        const button = document.getElementById('replace-confirm-mode');
        if (button) {
            button.setAttribute('data-active', this.options.confirmReplace.toString());
            button.textContent = this.options.confirmReplace ? 'Выйти' : 'Подтвердить';
        }

        if (this.options.confirmReplace) {
            this.startConfirmMode();
        } else {
            this.stopConfirmMode();
        }
    }

    // Start confirm mode
    startConfirmMode() {
        this.showStatus('Режим подтверждения активен. Просматривайте каждое совпадение.', 'info');

        // Show confirm mode controls
        const confirmControls = document.getElementById('confirm-mode-controls');
        if (confirmControls) {
            confirmControls.classList.remove('hidden');
        }

        // Hide regular replace buttons
        const replaceActions = document.querySelector('.search-actions');
        if (replaceActions) {
            replaceActions.style.display = 'none';
        }

        // Initialize confirm mode state
        this.confirmModeState = {
            currentIndex: 0,
            totalMatches: this.matches.length,
            replacedCount: 0,
            skippedCount: 0
        };

        // Start with first match
        if (this.matches.length > 0) {
            this.currentMatchIndex = 0;
            this.highlightCurrentMatch();
            this.scrollToMatch(this.currentMatchIndex);
            this.updateConfirmModeInfo();
        }
    }

    // Stop confirm mode
    stopConfirmMode() {
        // Hide confirm mode controls
        const confirmControls = document.getElementById('confirm-mode-controls');
        if (confirmControls) {
            confirmControls.classList.add('hidden');
        }

        // Show regular replace buttons
        const replaceActions = document.querySelector('.search-actions');
        if (replaceActions) {
            replaceActions.style.display = 'flex';
        }

        // Show summary if any replacements were made
        const currentState = this.confirmModeState;
        if (currentState && currentState.replacedCount > 0) {
            this.showStatus(
                `Режим подтверждения завершен. Заменено: ${currentState.replacedCount}, пропущено: ${currentState.skippedCount}`,
                'success'
            );
        }

        // Clear confirm mode state
        this.confirmModeState = null;
    }

    // Update confirm mode information display
    updateConfirmModeInfo() {
        const infoElement = document.getElementById('confirm-current-match');
        if (!infoElement || !this.confirmModeState) return;

        const current = this.confirmModeState.currentIndex + 1;
        const total = this.confirmModeState.totalMatches;
        const preview = this.previewReplacement();

        if (preview) {
            infoElement.innerHTML = `
                Совпадение ${current} из ${total}:
                "${preview.original}" → "${preview.replacement}"
                <br>Заменено: ${this.confirmModeState.replacedCount}, пропущено: ${this.confirmModeState.skippedCount}
            `;
        }
    }

    // Confirm mode actions
    confirmReplaceYes() {
        if (!this.confirmModeState || this.currentMatchIndex < 0) return;

        // Replace current match
        const match = this.matches[this.currentMatchIndex];
        const replaceText = this.getReplaceText(match);
        this.performReplace(match, replaceText);

        this.confirmModeState.replacedCount++;

        // Move to next match
        this.moveToNextConfirmMatch();
    }

    confirmReplaceNo() {
        if (!this.confirmModeState) return;

        this.confirmModeState.skippedCount++;

        // Move to next match
        this.moveToNextConfirmMatch();
    }

    confirmReplaceAllRemaining() {
        if (!this.confirmModeState) return;

        // Replace all remaining matches
        const remainingMatches = this.matches.slice(this.currentMatchIndex);
        let replacedCount = 0;

        for (const match of remainingMatches) {
            const replaceText = this.getReplaceText(match);
            this.performReplace(match, replaceText);
            replacedCount++;
        }

        this.confirmModeState.replacedCount += replacedCount;

        // End confirm mode
        this.toggleConfirmMode();
        this.showStatus(`Заменено ${replacedCount} оставшихся совпадений`, 'success');
    }

    confirmReplaceStop() {
        // End confirm mode without further replacements
        this.toggleConfirmMode();
    }

    // Move to next match in confirm mode
    moveToNextConfirmMatch() {
        if (!this.confirmModeState) return;

        // Re-perform search to get updated matches after replacement
        setTimeout(() => {
            this.performSearch();

            if (this.matches.length === 0) {
                // No more matches
                this.toggleConfirmMode();
                this.showStatus('Все совпадения обработаны', 'success');
                return;
            }

            // Update state and move to next match
            this.confirmModeState.currentIndex++;
            this.confirmModeState.totalMatches = this.matches.length;

            if (this.currentMatchIndex >= this.matches.length) {
                this.currentMatchIndex = 0;
            }

            this.highlightCurrentMatch();
            this.scrollToMatch(this.currentMatchIndex);
            this.updateConfirmModeInfo();
        }, 100);
    }

    // Debug function for testing
    debug() {
        console.log('SearchReplace Debug Info:', {
            editorType: this.editorType,
            isSearchActive: this.isSearchActive,
            searchTerm: this.searchTerm,
            matches: this.matches.length,
            currentMatchIndex: this.currentMatchIndex,
            options: this.options,
            confirmModeState: this.confirmModeState
        });
    }

    // Test function for automated testing
    test() {
        console.log('Running SearchReplace tests...');

        // Test basic search
        this.searchInput.value = 'тест';
        this.handleSearchInput({ target: this.searchInput });

        setTimeout(() => {
            console.log(`Basic search test: Found ${this.matches.length} matches for "тест"`);

            // Test regex search
            this.toggleOption('useRegex');
            this.searchInput.value = '\\d+';
            this.handleSearchInput({ target: this.searchInput });

            setTimeout(() => {
                console.log(`Regex search test: Found ${this.matches.length} matches for "\\d+"`);
                this.toggleOption('useRegex'); // Turn off regex
            }, 100);
        }, 100);
    }

    // Apply highlight color from EditorActions settings
    applyHighlightColor() {
        if (typeof window.EditorActions !== 'undefined') {
            const highlightColor = window.EditorActions.getHighlightColor();
            if (highlightColor) {
                // Create or update CSS custom property for highlight color
                const style = document.getElementById('search-highlight-style') || document.createElement('style');
                style.id = 'search-highlight-style';
                style.textContent = `
                    .cm-editor.search-active .cm-selectionBackground {
                        background-color: ${highlightColor}80 !important; /* 50% opacity */
                    }
                    .cm-editor.search-active .cm-focused .cm-selectionBackground {
                        background-color: ${highlightColor}CC !important; /* 80% opacity */
                    }
                    .simple-editor.search-active::selection {
                        background-color: ${highlightColor}80 !important;
                    }
                `;
                if (!style.parentNode) {
                    document.head.appendChild(style);
                }
            }
        }
    }

    // Expose methods for EditorActions integration
    openFind() {
        this.showPanel();
    }

    openReplace() {
        this.showPanel(true);
    }

    findNext() {
        if (this.matches.length > 0) {
            this.findNext();
        }
    }

    findPrev() {
        if (this.matches.length > 0) {
            this.findPrevious();
        }
    }

    // Destroy the search and replace instance
    destroy() {
        this.clearHighlights();
        this.hidePanel();

        // Remove custom highlight styles
        const style = document.getElementById('search-highlight-style');
        if (style) {
            style.remove();
        }

        // Remove event listeners
        // Note: In a real implementation, you'd want to store references to bound functions
        // and remove them properly to prevent memory leaks
    }
}
