// Simple textarea-based editor as fallback for MarkMirror Mobile
// Used when CodeMirror 6 is not available or fails to load

export class SimpleEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            theme: 'light',
            autoComplete: true,
            onChange: null,
            onScroll: null,
            initialContent: '',
            ...options
        };
        
        this.textarea = null;
        this.completions = this.createMarkdownCompletions();
        this.init();
    }

    // Initialize the simple editor
    init() {
        // Create textarea element
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'simple-editor';
        this.textarea.placeholder = 'Начните вводить Markdown...';
        this.textarea.value = this.options.initialContent || '';
        
        // Apply styles
        this.applyStyles();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Add to container
        this.container.appendChild(this.textarea);
        
        // Focus the editor
        this.textarea.focus();
    }

    // Apply styles to textarea
    applyStyles() {
        this.textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
            resize: none;
            padding: 1rem;
            font-family: var(--font-family-mono);
            font-size: 14px;
            line-height: 1.6;
            background-color: var(--editor-bg);
            color: var(--editor-text);
            tab-size: 4;
        `;
    }

    // Setup event listeners
    setupEventListeners() {
        // Content change handler
        this.textarea.addEventListener('input', () => {
            if (this.options.onChange) {
                this.options.onChange(this.getContent());
            }
        });

        // Scroll handler
        this.textarea.addEventListener('scroll', () => {
            if (this.options.onScroll) {
                const scrollInfo = this.getScrollInfo();
                this.options.onScroll(scrollInfo);
            }
        });

        // Tab key handler for indentation
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });

        // Auto-completion handler
        if (this.options.autoComplete) {
            this.setupAutoComplete();
        }
    }

    // Setup basic auto-completion
    setupAutoComplete() {
        this.textarea.addEventListener('keydown', (e) => {
            // Trigger completion on Ctrl+Space
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.showCompletions();
            }
        });
    }

    // Insert tab character
    insertTab() {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        this.textarea.value = value.substring(0, start) + '    ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        
        // Trigger change event
        if (this.options.onChange) {
            this.options.onChange(this.getContent());
        }
    }

    // Show basic completions (simplified)
    showCompletions() {
        const cursorPos = this.textarea.selectionStart;
        const textBeforeCursor = this.textarea.value.substring(0, cursorPos);
        const lastWord = textBeforeCursor.split(/\s/).pop();
        
        // Simple completion for common Markdown patterns
        const completions = {
            '#': '# ',
            '##': '## ',
            '###': '### ',
            'code': '```\n\n```',
            'link': '[text](url)',
            'img': '![alt](url)',
            'table': '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
            'task': '- [ ] ',
            'quote': '> '
        };
        
        if (completions[lastWord]) {
            const replacement = completions[lastWord];
            const start = cursorPos - lastWord.length;
            const value = this.textarea.value;
            
            this.textarea.value = value.substring(0, start) + replacement + value.substring(cursorPos);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + replacement.length;
            
            if (this.options.onChange) {
                this.options.onChange(this.getContent());
            }
        }
    }

    // Create Markdown completions list
    createMarkdownCompletions() {
        return [
            { label: '# ', detail: 'Header 1' },
            { label: '## ', detail: 'Header 2' },
            { label: '### ', detail: 'Header 3' },
            { label: '**bold**', detail: 'Bold text' },
            { label: '*italic*', detail: 'Italic text' },
            { label: '`code`', detail: 'Inline code' },
            { label: '[text](url)', detail: 'Link' },
            { label: '![alt](url)', detail: 'Image' },
            { label: '- [ ] ', detail: 'Task list item' },
            { label: '> ', detail: 'Blockquote' }
        ];
    }

    // Get editor content
    getContent() {
        return this.textarea ? this.textarea.value : '';
    }

    // Set editor content
    setContent(content) {
        if (this.textarea) {
            this.textarea.value = content;
            if (this.options.onChange) {
                this.options.onChange(content);
            }
        }
    }

    // Get scroll information
    getScrollInfo() {
        if (!this.textarea) return { top: 0, height: 0, clientHeight: 0, percentage: 0 };
        
        const scrollTop = this.textarea.scrollTop;
        const scrollHeight = this.textarea.scrollHeight;
        const clientHeight = this.textarea.clientHeight;
        
        return {
            top: scrollTop,
            height: scrollHeight,
            clientHeight: clientHeight,
            percentage: scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0
        };
    }

    // Scroll to position
    scrollTo(position) {
        if (this.textarea) {
            if (typeof position === 'number') {
                // Scroll by percentage
                const maxScroll = this.textarea.scrollHeight - this.textarea.clientHeight;
                this.textarea.scrollTop = maxScroll * position;
            } else if (position.top !== undefined) {
                this.textarea.scrollTop = position.top;
            }
        }
    }

    // Update theme
    updateTheme(theme) {
        this.options.theme = theme;
        this.applyStyles();
    }

    // Toggle autocompletion
    toggleAutoComplete(enabled) {
        this.options.autoComplete = enabled;
        // Re-setup event listeners if needed
    }

    // Focus the editor
    focus() {
        if (this.textarea) {
            this.textarea.focus();
        }
    }

    // Get character count
    getCharacterCount() {
        return this.getContent().length;
    }

    // Get line count
    getLineCount() {
        return this.getContent().split('\n').length;
    }

    // Insert text at cursor position
    insertText(text) {
        if (!this.textarea) return;
        
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        this.textarea.value = value.substring(0, start) + text + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        
        if (this.options.onChange) {
            this.options.onChange(this.getContent());
        }
    }

    // Get selected text
    getSelectedText() {
        if (!this.textarea) return '';
        
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        
        return this.textarea.value.substring(start, end);
    }

    // Replace selected text
    replaceSelectedText(text) {
        if (!this.textarea) return;
        
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        this.textarea.value = value.substring(0, start) + text + value.substring(end);
        this.textarea.selectionStart = start;
        this.textarea.selectionEnd = start + text.length;
        
        if (this.options.onChange) {
            this.options.onChange(this.getContent());
        }
    }

    // Destroy the editor
    destroy() {
        if (this.textarea) {
            this.textarea.remove();
            this.textarea = null;
        }
    }
}
