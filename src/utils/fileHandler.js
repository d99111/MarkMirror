// File handling utilities for MarkMirror Mobile
// Handles import/export operations

export class FileHandler {
    constructor() {
        this.supportedTypes = ['.md', '.txt'];
    }

    // Import file from user's device
    async importFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = this.supportedTypes.join(',');
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                try {
                    const content = await this.readFileAsText(file);
                    resolve({
                        content,
                        filename: file.name,
                        size: file.size,
                        type: file.type
                    });
                } catch (error) {
                    reject(error);
                }
            };

            input.click();
        });
    }

    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Export content as Markdown file
    exportMarkdown(content, filename = 'document.md') {
        this.downloadFile(content, filename, 'text/markdown');
    }

    // Export content as HTML file
    exportHTML(htmlContent, filename = 'document.html', embedStyles = true) {
        let fullHTML = htmlContent;
        
        if (embedStyles) {
            fullHTML = this.createFullHTMLDocument(htmlContent);
        }
        
        this.downloadFile(fullHTML, filename, 'text/html');
    }

    // Create full HTML document with embedded styles
    createFullHTMLDocument(content) {
        const styles = this.getEmbeddedStyles();
        
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MarkMirror Export</title>
    <style>
${styles}
    </style>
</head>
<body>
    <div class="markdown-body">
${content}
    </div>
</body>
</html>`;
    }

    // Get embedded CSS styles for export
    getEmbeddedStyles() {
        return `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #fff;
        }
        
        .markdown-body h1, .markdown-body h2, .markdown-body h3, 
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-weight: 600;
            line-height: 1.25;
        }
        
        .markdown-body h1 { font-size: 2rem; }
        .markdown-body h2 { font-size: 1.5rem; }
        .markdown-body h3 { font-size: 1.25rem; }
        .markdown-body h4 { font-size: 1.125rem; }
        .markdown-body h5 { font-size: 1rem; }
        .markdown-body h6 { font-size: 0.875rem; }
        
        .markdown-body p {
            margin-bottom: 1rem;
        }
        
        .markdown-body ul, .markdown-body ol {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
        }
        
        .markdown-body li {
            margin-bottom: 0.25rem;
        }
        
        .markdown-body blockquote {
            margin: 1rem 0;
            padding: 0 1rem;
            border-left: 4px solid #ddd;
            color: #666;
        }
        
        .markdown-body code {
            padding: 0.2em 0.4em;
            background-color: #f6f8fa;
            border-radius: 0.25rem;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
        }
        
        .markdown-body pre {
            margin-bottom: 1rem;
            padding: 1rem;
            background-color: #f6f8fa;
            border-radius: 0.375rem;
            overflow-x: auto;
        }
        
        .markdown-body pre code {
            padding: 0;
            background: none;
            border-radius: 0;
        }
        
        .markdown-body table {
            width: 100%;
            margin-bottom: 1rem;
            border-collapse: collapse;
        }
        
        .markdown-body th, .markdown-body td {
            padding: 0.5rem;
            border: 1px solid #ddd;
            text-align: left;
        }
        
        .markdown-body th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        
        .markdown-body a {
            color: #007bff;
            text-decoration: none;
        }
        
        .markdown-body a:hover {
            text-decoration: underline;
        }
        
        .markdown-body .task-list-item {
            list-style: none;
            margin-left: -1.5rem;
        }
        
        .markdown-body .task-list-item input[type="checkbox"] {
            margin-right: 0.5rem;
        }
        `;
    }

    // Download file to user's device
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // Validate file type
    isValidFileType(filename) {
        const extension = '.' + filename.split('.').pop().toLowerCase();
        return this.supportedTypes.includes(extension);
    }

    // Get file size in human readable format
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
