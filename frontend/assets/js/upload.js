// upload.js - FASTA File Upload and Analysis Handler
class UploadManager {
    constructor() {
        this.uploadedFiles = [];
        this.analysisResults = null;
        this.isAnalyzing = false;
        
        // Initialize elements
        this.initializeElements();
        this.bindEvents();
        this.setupDragAndDrop();
        
        console.log('UploadManager initialized');
    }

    initializeElements() {
        // Main elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.filesContainer = document.getElementById('filesContainer');
        this.analysisOptions = document.getElementById('analysisOptions');
        this.uploadActions = document.getElementById('uploadActions');
        
        // Progress elements
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressStatus = document.getElementById('progressStatus');
        this.progressTime = document.getElementById('progressTime');
        
        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsSummary = document.getElementById('resultsSummary');
        this.loginPrompt = document.getElementById('loginPrompt');
        
        // Buttons
        this.clearBtn = document.getElementById('clearBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.continueWithoutLoginBtn = document.getElementById('continueWithoutLoginBtn');
        
        // Toast elements
        this.errorToast = document.getElementById('errorToast');
        this.successToast = document.getElementById('successToast');
        
        // Progress steps
        this.progressSteps = {
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            step3: document.getElementById('step3'),
            step4: document.getElementById('step4')
        };
    }

    bindEvents() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Upload area click
        this.uploadArea.addEventListener('click', () => {
            if (!this.isAnalyzing) {
                this.fileInput.click();
            }
        });
        
        // Browse text click
        const browseText = this.uploadArea.querySelector('.browse-text');
        if (browseText) {
            browseText.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileInput.click();
            });
        }
        
        // Button events
        this.clearBtn?.addEventListener('click', () => this.clearFiles());
        this.analyzeBtn?.addEventListener('click', () => this.startAnalysis());
        this.previewBtn?.addEventListener('click', () => this.previewResults());
        this.downloadBtn?.addEventListener('click', () => this.downloadResults());
        this.saveBtn?.addEventListener('click', () => this.showLoginPrompt());
        this.continueWithoutLoginBtn?.addEventListener('click', () => this.hideLoginPrompt());
        
        // Toast close events
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.closest('.toast').classList.remove('show');
            });
        });
    }

    setupDragAndDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.highlight(), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.unhighlight(), false);
        });

        // Handle dropped files
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight() {
        this.uploadArea.classList.add('drag-over');
    }

    unhighlight() {
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFileSelect(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        const fileArray = Array.from(files);
        const validFiles = [];
        
        fileArray.forEach(file => {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        });
        
        if (validFiles.length > 0) {
            this.addFiles(validFiles);
            this.showFileList();
            this.showAnalysisOptions();
            this.showUploadActions();
        }
    }

    validateFile(file) {
        // Check file extension
        const validExtensions = ['.fasta', '.fa', '.fas', '.fna'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
            this.showError(`Invalid file format: ${file.name}. Please upload FASTA files (.fasta, .fa, .fas, .fna)`);
            return false;
        }
        
        // Check file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB in bytes
        if (file.size > maxSize) {
            this.showError(`File too large: ${file.name}. Maximum size is 100MB.`);
            return false;
        }
        
        // Check if file already exists
        const fileExists = this.uploadedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (fileExists) {
            this.showError(`File already added: ${file.name}`);
            return false;
        }
        
        return true;
    }

    addFiles(files) {
        files.forEach(file => {
            const fileObj = {
                file: file,
                name: file.name,
                size: file.size,
                id: this.generateFileId()
            };
            
            this.uploadedFiles.push(fileObj);
            this.renderFileItem(fileObj);
        });
        
        this.showSuccess(`${files.length} file(s) added successfully`);
    }

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    renderFileItem(fileObj) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileObj.id;
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-dna"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${fileObj.name}</div>
                    <div class="file-size">${this.formatFileSize(fileObj.size)}</div>
                </div>
            </div>
            <button class="file-remove" data-file-id="${fileObj.id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add remove event listener
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', () => this.removeFile(fileObj.id));
        
        this.filesContainer.appendChild(fileItem);
    }

    removeFile(fileId) {
        // Remove from array
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        
        // Remove from DOM
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        // Hide sections if no files
        if (this.uploadedFiles.length === 0) {
            this.hideFileList();
            this.hideAnalysisOptions();
            this.hideUploadActions();
        }
        
        this.showSuccess('File removed successfully');
    }

    clearFiles() {
        this.uploadedFiles = [];
        this.filesContainer.innerHTML = '';
        this.hideFileList();
        this.hideAnalysisOptions();
        this.hideUploadActions();
        this.hideResults();
        this.hideProgress();
        this.fileInput.value = '';
        this.showSuccess('All files cleared');
    }

    async startAnalysis() {
        if (this.uploadedFiles.length === 0) {
            this.showError('Please select at least one FASTA file');
            return;
        }
        
        if (this.isAnalyzing) {
            this.showError('Analysis is already in progress');
            return;
        }
        
        try {
            this.isAnalyzing = true;
            this.analyzeBtn.disabled = true;
            this.analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
            
            // Get analysis parameters
            const params = this.getAnalysisParameters();
            
            // Show progress
            this.showProgress();
            
            // Start analysis
            await this.performAnalysis(params);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError('Analysis failed: ' + error.message);
            this.hideProgress();
        } finally {
            this.isAnalyzing = false;
            this.analyzeBtn.disabled = false;
            this.analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Start Analysis';
        }
    }

    getAnalysisParameters() {
        return {
            kmerSize: parseInt(document.getElementById('kmerSize').value),
            confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value),
            outputFormat: document.getElementById('outputFormat').value,
            includeVisualization: document.getElementById('includeVisualization').checked
        };
    }

    async performAnalysis(params) {
        // Check if MetagenomicsAnalyzer is available
        if (typeof window.MetagenomicsAnalyzer === 'undefined') {
            throw new Error('Metagenomic analysis module not found. Please ensure metagenomicAnalyze.js is loaded.');
        }
        
        // Create analyzer instance
        const analyzer = new window.MetagenomicsAnalyzer();
        
        // Update progress: Step 1 complete
        this.updateProgressStep(1, true);
        this.updateProgressStep(2, true);
        this.updateProgress(25, 'Reading FASTA files...');
        
        // Prepare files array from uploaded files
        const files = this.uploadedFiles.map(fileObj => fileObj.file);
        
        // Create progress callback to integrate with UI
        const progressCallback = (progress) => {
            let message = progress.message || 'Processing...';
            let percentage = progress.progress || 0;
            
            // Map different phases to UI progress
            switch (progress.phase) {
                case 'reading_files':
                    percentage = 25 + (percentage * 0.15); // 25-40%
                    break;
                case 'building_database':
                    percentage = 40 + (percentage * 0.15); // 40-55%
                    break;
                case 'simulating_reads':
                    percentage = 55 + (percentage * 0.1); // 55-65%
                    break;
                case 'classifying_reads':
                    percentage = 65 + (percentage * 0.25); // 65-90%
                    break;
                case 'calculating_abundance':
                    percentage = 90 + (percentage * 0.1); // 90-100%
                    break;
            }
            
            this.updateProgress(Math.round(percentage), message);
        };
        
        try {
            // Perform analysis using analyzeFiles method (not analyzeSequences)
            const analysisResults = await analyzer.analyzeFiles(files, progressCallback);
            
            this.updateProgress(100, 'Analysis complete!');
            this.updateProgressStep(3, true);
            this.updateProgressStep(4, true);
            
            // Process results
            this.analysisResults = this.processResults(analysisResults, params);
            
            // Show results after a brief delay
            setTimeout(() => {
                this.hideProgress();
                this.showResults();
            }, 1000);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.updateProgress(0, `Analysis failed: ${error.message}`);
            throw error;
        }
    }

    // Update processResults to handle the new structure
    processResults(analysisResults, params) {
        const timestamp = new Date().toISOString();
        
        return {
            timestamp: timestamp,
            parameters: params,
            files: this.uploadedFiles.map(f => ({ name: f.name, size: f.size })),
            results: analysisResults,
            summary: this.generateResultsSummary(analysisResults)
        };
    }

    // Update generateResultsSummary to match the actual structure
    generateResultsSummary(results) {
        const { statistics, abundance, metadata } = results;
        
        return {
            totalSequences: metadata?.totalSequences || 0,
            totalReads: statistics?.totalReads || 0,
            classifiedReads: statistics?.classifiedReads || 0,
            classificationRate: statistics?.totalReads > 0 ? 
                ((statistics.classifiedReads / statistics.totalReads) * 100).toFixed(1) : 0,
            uniqueSpecies: statistics?.uniqueSpecies || 0,
            averageConfidence: statistics?.averageConfidence ? 
                (statistics.averageConfidence * 100).toFixed(1) : 0,
            topSpecies: abundance?.length > 0 ? abundance.slice(0, 10) : [],
            kmerDatabaseSize: metadata?.kmerDatabaseSize || 0
        };
    }
    
    showResults() {
        if (!this.analysisResults) return;
        
        const summary = this.analysisResults.summary;
        
        this.resultsSummary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-dna"></i>
                    </div>
                    <div class="summary-details">
                        <div class="summary-value">${summary.totalSequences.toLocaleString()}</div>
                        <div class="summary-label">Total Sequences</div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="summary-details">
                        <div class="summary-value">${summary.classifiedSequences.toLocaleString()}</div>
                        <div class="summary-label">Classified</div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <div class="summary-details">
                        <div class="summary-value">${summary.uniqueTaxa.toLocaleString()}</div>
                        <div class="summary-label">Unique Taxa</div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="summary-details">
                        <div class="summary-value">${(summary.classificationRate * 100).toFixed(1)}%</div>
                        <div class="summary-label">Success Rate</div>
                    </div>
                </div>
            </div>
        `;
        
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    previewResults() {
        if (!this.analysisResults) {
            this.showError('No results available to preview');
            return;
        }
        
        // Create preview modal or new window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        const previewContent = this.generatePreviewHTML();
        
        previewWindow.document.write(previewContent);
        previewWindow.document.close();
    }

    generatePreviewHTML() {
        if (!this.analysisResults) return '';
        
        const results = this.analysisResults;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>MetaClassify Results Preview</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .result-table { width: 100%; border-collapse: collapse; }
                    .result-table th, .result-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .result-table th { background-color: #007bff; color: white; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>MetaClassify Analysis Results</h1>
                    <p>Generated on: ${new Date(results.timestamp).toLocaleString()}</p>
                </div>
                
                <div class="summary">
                    <h2>Summary</h2>
                    <p><strong>Files Analyzed:</strong> ${results.files.length}</p>
                    <p><strong>Total Sequences:</strong> ${results.summary.totalSequences.toLocaleString()}</p>
                    <p><strong>Classified Sequences:</strong> ${results.summary.classifiedSequences.toLocaleString()}</p>
                    <p><strong>Classification Rate:</strong> ${(results.summary.classificationRate * 100).toFixed(2)}%</p>
                    <p><strong>Unique Taxa:</strong> ${results.summary.uniqueTaxa}</p>
                </div>
                
                <div class="parameters">
                    <h2>Analysis Parameters</h2>
                    <p><strong>K-mer Size:</strong> ${results.parameters.kmerSize}</p>
                    <p><strong>Confidence Threshold:</strong> ${(results.parameters.confidenceThreshold * 100)}%</p>
                    <p><strong>Output Format:</strong> ${results.parameters.outputFormat.toUpperCase()}</p>
                </div>
                
                ${this.generateResultsTable(results.results)}
            </body>
            </html>
        `;
    }

    generateResultsTable(results) {
        // This should be customized based on your actual results structure
        if (!results || !results.classifications) {
            return '<p>No detailed results available.</p>';
        }
        
        let tableHTML = `
            <h2>Classification Results</h2>
            <table class="result-table">
                <thead>
                    <tr>
                        <th>Sequence ID</th>
                        <th>Classification</th>
                        <th>Confidence</th>
                        <th>Taxonomy</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        results.classifications.slice(0, 100).forEach(classification => {
            tableHTML += `
                <tr>
                    <td>${classification.sequenceId || 'N/A'}</td>
                    <td>${classification.classification || 'Unclassified'}</td>
                    <td>${classification.confidence ? (classification.confidence * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td>${classification.taxonomy || 'N/A'}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
            ${results.classifications.length > 100 ? '<p><em>Showing first 100 results. Download full results for complete data.</em></p>' : ''}
        `;
        
        return tableHTML;
    }

    downloadResults() {
        if (!this.analysisResults) {
            this.showError('No results available to download');
            return;
        }
        
        const format = this.analysisResults.parameters.outputFormat;
        const filename = `metaClassify_results_${Date.now()}.${format}`;
        
        let content;
        let mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(this.analysisResults, null, 2);
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.generateCSV(this.analysisResults);
                mimeType = 'text/csv';
                break;
            case 'txt':
                content = this.generateTXT(this.analysisResults);
                mimeType = 'text/plain';
                break;
            default:
                content = JSON.stringify(this.analysisResults, null, 2);
                mimeType = 'application/json';
        }
        
        this.downloadFile(content, filename, mimeType);
    }

    generateCSV(results) {
        if (!results.results || !results.results.classifications) {
            return 'No classification data available';
        }
        
        let csv = 'Sequence ID,Classification,Confidence,Taxonomy,File\n';
        
        results.results.classifications.forEach(classification => {
            const sequenceId = (classification.sequenceId || '').replace(/,/g, ';');
            const classificationResult = (classification.classification || 'Unclassified').replace(/,/g, ';');
            const confidence = classification.confidence ? (classification.confidence * 100).toFixed(2) : 'N/A';
            const taxonomy = (classification.taxonomy || 'N/A').replace(/,/g, ';');
            const filename = (classification.filename || '').replace(/,/g, ';');
            
            csv += `"${sequenceId}","${classificationResult}","${confidence}","${taxonomy}","${filename}"\n`;
        });
        
        return csv;
    }

    generateTXT(results) {
        let txt = 'MetaClassify Analysis Results\n';
        txt += '================================\n\n';
        txt += `Analysis Date: ${new Date(results.timestamp).toLocaleString()}\n`;
        txt += `Files Analyzed: ${results.files.length}\n`;
        txt += `Total Sequences: ${results.summary.totalSequences}\n`;
        txt += `Classified Sequences: ${results.summary.classifiedSequences}\n`;
        txt += `Classification Rate: ${(results.summary.classificationRate * 100).toFixed(2)}%\n`;
        txt += `Unique Taxa: ${results.summary.uniqueTaxa}\n\n`;
        
        txt += 'Analysis Parameters:\n';
        txt += `- K-mer Size: ${results.parameters.kmerSize}\n`;
        txt += `- Confidence Threshold: ${(results.parameters.confidenceThreshold * 100)}%\n`;
        txt += `- Output Format: ${results.parameters.outputFormat}\n\n`;
        
        if (results.results && results.results.classifications) {
            txt += 'Classification Results:\n';
            txt += '----------------------\n';
            
            results.results.classifications.forEach((classification, index) => {
                txt += `${index + 1}. ${classification.sequenceId || 'Unknown'}\n`;
                txt += `   Classification: ${classification.classification || 'Unclassified'}\n`;
                txt += `   Confidence: ${classification.confidence ? (classification.confidence * 100).toFixed(2) + '%' : 'N/A'}\n`;
                txt += `   Taxonomy: ${classification.taxonomy || 'N/A'}\n\n`;
            });
        }
        
        return txt;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showSuccess(`Results downloaded as ${filename}`);
    }

    showLoginPrompt() {
        this.loginPrompt.style.display = 'block';
    }

    hideLoginPrompt() {
        this.loginPrompt.style.display = 'none';
    }

    // Progress management
    updateProgress(percent, status) {
        this.progressFill.style.width = percent + '%';
        this.progressPercent.textContent = percent + '%';
        this.progressStatus.textContent = status;
        
        // Estimate time remaining (simple calculation)
        const timeRemaining = Math.max(0, Math.ceil((100 - percent) / 10));
        this.progressTime.textContent = `Estimated time: ${timeRemaining === 0 ? 'Almost done!' : timeRemaining + ' seconds'}`;
    }

    updateProgressStep(stepNumber, active) {
        const step = this.progressSteps[`step${stepNumber}`];
        if (step) {
            if (active) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        }
    }

    // UI utility methods
    showFileList() {
        this.fileList.style.display = 'block';
    }

    hideFileList() {
        this.fileList.style.display = 'none';
    }

    showAnalysisOptions() {
        this.analysisOptions.style.display = 'block';
    }

    hideAnalysisOptions() {
        this.analysisOptions.style.display = 'none';
    }

    showUploadActions() {
        this.uploadActions.style.display = 'block';
    }

    hideUploadActions() {
        this.uploadActions.style.display = 'none';
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.progressSection.scrollIntoView({ behavior: 'smooth' });
        
        // Reset progress
        this.updateProgress(0, 'Initializing...');
        Object.values(this.progressSteps).forEach(step => {
            step.classList.remove('active');
        });
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    showResults() {
        this.resultsSection.style.display = 'block';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    // Toast notifications
    showSuccess(message) {
        this.showToast(this.successToast, message);
    }

    showError(message) {
        this.showToast(this.errorToast, message);
    }

    showToast(toastElement, message) {
        const messageElement = toastElement.querySelector('.toast-message');
        messageElement.textContent = message;
        
        toastElement.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toastElement.classList.remove('show');
        }, 5000);
    }

    // Utility methods
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.uploadManager = new UploadManager();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UploadManager;
}