// ==============================================
// Upload Page JavaScript
// ==============================================

class UploadManager {
    constructor() {
        this.selectedFiles = [];
        this.isAnalyzing = false;
        this.progressInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.setupDragAndDrop();
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
        this.progressTime = document.getElementById('progressTime');
        this.progressStatus = document.getElementById('progressStatus');
        
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
        
        // Progress steps
        this.progressSteps = {
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            step3: document.getElementById('step3'),
            step4: document.getElementById('step4')
        };
        
        // Toast elements
        this.errorToast = document.getElementById('errorToast');
        this.successToast = document.getElementById('successToast');
    }

    bindEvents() {
        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Upload area click
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        
        // Browse text click
        const browseText = document.querySelector('.browse-text');
        if (browseText) {
            browseText.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileInput.click();
            });
        }
        
        // Action buttons
        this.clearBtn?.addEventListener('click', () => this.clearFiles());
        this.analyzeBtn?.addEventListener('click', () => this.startAnalysis());
        this.previewBtn?.addEventListener('click', () => this.previewResults());
        this.downloadBtn?.addEventListener('click', () => this.downloadResults());
        this.saveBtn?.addEventListener('click', () => this.saveResults());
        this.continueWithoutLoginBtn?.addEventListener('click', () => this.continueWithoutLogin());
        
        // Toast close buttons
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.toast').classList.remove('show');
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
        this.uploadArea.classList.add('dragover');
    }

    unhighlight() {
        this.uploadArea.classList.remove('dragover');
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
        const allowedExtensions = ['.fasta', '.fa', '.fas', '.fna'];
        const maxFileSize = 100 * 1024 * 1024; // 100MB
        
        Array.from(files).forEach(file => {
            // Check file extension
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                this.showError(`File "${file.name}" has an unsupported format. Please use FASTA files (.fasta, .fa, .fas, .fna).`);
                return;
            }
            
            // Check file size
            if (file.size > maxFileSize) {
                this.showError(`File "${file.name}" is too large. Maximum file size is 100MB.`);
                return;
            }
            
            // Check if file already exists
            if (this.selectedFiles.some(f => f.name === file.name)) {
                this.showError(`File "${file.name}" is already selected.`);
                return;
            }
            
            this.selectedFiles.push(file);
        });
        
        if (this.selectedFiles.length > 0) {
            this.updateFileList();
            this.showFileOptions();
        }
    }

    updateFileList() {
        this.filesContainer.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-dna"></i>
                    </div>
                    <div class="file-details">
                        <h5>${file.name}</h5>
                        <p>${this.formatFileSize(file.size)} • ${this.getFileType(file.name)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-remove" onclick="uploadManager.removeFile(${index})" title="Remove file">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            this.filesContainer.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            this.hideFileOptions();
        } else {
            this.updateFileList();
        }
    }

    showFileOptions() {
        this.fileList.style.display = 'block';
        this.analysisOptions.style.display = 'block';
        this.uploadActions.style.display = 'flex';
    }

    hideFileOptions() {
        this.fileList.style.display = 'none';
        this.analysisOptions.style.display = 'none';
        this.uploadActions.style.display = 'none';
    }

    clearFiles() {
        this.selectedFiles = [];
        this.fileInput.value = '';
        this.hideFileOptions();
        this.hideProgress();
        this.hideResults();
        this.showSuccess('Files cleared successfully.');
    }

    startAnalysis() {
        if (this.selectedFiles.length === 0) {
            this.showError('Please select at least one FASTA file to analyze.');
            return;
        }

        if (this.isAnalyzing) {
            this.showError('Analysis is already in progress.');
            return;
        }

        this.isAnalyzing = true;
        this.showProgress();
        this.simulateAnalysis();
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.progressSection.scrollIntoView({ behavior: 'smooth' });
        
        // Reset progress
        this.progressFill.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressStatus.textContent = 'Preparing analysis...';
        
        // Reset steps
        Object.values(this.progressSteps).forEach(step => {
            step.classList.remove('active', 'completed');
        });
        this.progressSteps.step1.classList.add('active');
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    simulateAnalysis() {
        let progress = 0;
        const stages = [
            { progress: 25, status: 'Validating FASTA files...', step: 'step1' },
            { progress: 50, status: 'Extracting K-mers...', step: 'step2' },
            { progress: 75, status: 'Classifying sequences...', step: 'step2' },
            { progress: 90, status: 'Generating visualization...', step: 'step3' },
            { progress: 100, status: 'Analysis complete!', step: 'step4' }
        ];

        let currentStage = 0;
        const totalTime = 8000; // 8 seconds
        const intervalTime = 200; // Update every 200ms
        const progressIncrement = 100 / (totalTime / intervalTime);

        this.progressInterval = setInterval(() => {
            progress += progressIncrement;
            
            // Check if we've reached the next stage
            if (currentStage < stages.length && progress >= stages[currentStage].progress) {
                const stage = stages[currentStage];
                this.progressStatus.textContent = stage.status;
                this.updateProgressStep(stage.step);
                currentStage++;
            }
            
            // Update progress bar
            const displayProgress = Math.min(progress, 100);
            this.progressFill.style.width = `${displayProgress}%`;
            this.progressPercent.textContent = `${Math.round(displayProgress)}%`;
            
            // Update estimated time
            const remainingTime = Math.max(0, totalTime - (progress * totalTime / 100));
            this.progressTime.textContent = `Estimated time: ${Math.ceil(remainingTime / 1000)}s`;
            
            // Complete analysis
            if (progress >= 100) {
                clearInterval(this.progressInterval);
                this.completeAnalysis();
            }
        }, intervalTime);
    }

    updateProgressStep(stepId) {
        // Mark previous steps as completed
        Object.entries(this.progressSteps).forEach(([key, step]) => {
            if (key < stepId) {
                step.classList.remove('active');
                step.classList.add('completed');
            } else if (key === stepId) {
                step.classList.add('active');
            }
        });
    }

    completeAnalysis() {
        this.isAnalyzing = false;
        this.progressSteps.step4.classList.add('completed');
        this.progressSteps.step4.classList.remove('active');
        
        setTimeout(() => {
            this.hideProgress();
            this.showResults();
        }, 1000);
    }

    showResults() {
        // Generate mock results
        const totalSequences = this.selectedFiles.reduce((total, file) => {
            return total + Math.floor(Math.random() * 1000) + 100;
        }, 0);
        
        const classifiedSequences = Math.floor(totalSequences * 0.85);
        const uniqueSpecies = Math.floor(Math.random() * 50) + 20;
        const topGenus = ['Escherichia', 'Bacillus', 'Pseudomonas', 'Staphylococcus'][Math.floor(Math.random() * 4)];
        
        this.resultsSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-number">${totalSequences.toLocaleString()}</span>
                <span class="summary-label">Total Sequences</span>
            </div>
            <div class="summary-item">
                <span class="summary-number">${classifiedSequences.toLocaleString()}</span>
                <span class="summary-label">Classified</span>
            </div>
            <div class="summary-item">
                <span class="summary-number">${uniqueSpecies}</span>
                <span class="summary-label">Unique Species</span>
            </div>
            <div class="summary-item">
                <span class="summary-number">${topGenus}</span>
                <span class="summary-label">Top Genus</span>
            </div>
        `;
        
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        this.showSuccess('Analysis completed successfully!');
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.loginPrompt.style.display = 'none';
    }

    previewResults() {
        // Simulate opening results preview
        const mockData = {
            classification: 'Detailed classification results would be shown here...',
            confidence: 'Confidence scores and quality metrics...',
            visualization: 'Interactive charts and graphs...'
        };
        
        alert('Results Preview:\n\n' + 
              'This would open a detailed view of your analysis results including:\n' +
              '• Taxonomic classification table\n' +
              '• Confidence scores\n' +
              '• Interactive visualizations\n' +
              '• Quality metrics\n\n' +
              'In a real implementation, this would open in a new window or modal.');
    }

    downloadResults() {
        const outputFormat = document.getElementById('outputFormat').value;
        const includeVisualization = document.getElementById('includeVisualization').checked;
        
        // Simulate file download
        const filename = `metaClassify_results_${new Date().toISOString().split('T')[0]}.${outputFormat}`;
        
        // Create mock download content
        let content = '';
        if (outputFormat === 'csv') {
            content = 'Sequence_ID,Classification,Confidence,Genus,Species\n';
            content += 'seq_001,Bacteria;Proteobacteria;Gammaproteobacteria;Enterobacteriales;Enterobacteriaceae;Escherichia;coli,0.95,Escherichia,coli\n';
            content += 'seq_002,Bacteria;Firmicutes;Bacilli;Bacillales;Bacillaceae;Bacillus;subtilis,0.88,Bacillus,subtilis\n';
        } else if (outputFormat === 'json') {
            content = JSON.stringify({
                analysis_date: new Date().toISOString(),
                total_sequences: 1247,
                classified_sequences: 1060,
                results: [
                    {
                        sequence_id: 'seq_001',
                        classification: 'Bacteria;Proteobacteria;Gammaproteobacteria;Enterobacteriales;Enterobacteriaceae;Escherichia;coli',
                        confidence: 0.95,
                        genus: 'Escherichia',
                        species: 'coli'
                    }
                ]
            }, null, 2);
        } else {
            content = 'MetaClassify Analysis Results\n';
            content += '==============================\n\n';
            content += 'Analysis Date: ' + new Date().toISOString() + '\n';
            content += 'Total Sequences: 1247\n';
            content += 'Classified Sequences: 1060\n\n';
            content += 'Top Classifications:\n';
            content += '- Escherichia coli (45.2%)\n';
            content += '- Bacillus subtilis (23.1%)\n';
        }
        
        // Create and trigger download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess(`Results downloaded as ${filename}`);
    }

    saveResults() {
        // Check if user is logged in (simulate)
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn) {
            this.loginPrompt.style.display = 'block';
            this.loginPrompt.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Simulate saving to user account
            const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
            const newAnalysis = {
                id: Date.now(),
                date: new Date().toISOString(),
                files: this.selectedFiles.map(f => f.name),
                status: 'completed',
                results: {
                    totalSequences: 1247,
                    classified: 1060,
                    uniqueSpecies: 42
                }
            };
            
            savedAnalyses.push(newAnalysis);
            localStorage.setItem('savedAnalyses', JSON.stringify(savedAnalyses));
            
            this.showSuccess('Results saved to your account successfully!');
        }
    }

    continueWithoutLogin() {
        this.loginPrompt.style.display = 'none';
        this.showSuccess('You can download your results using the Download button.');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const types = {
            'fasta': 'FASTA',
            'fa': 'FASTA',
            'fas': 'FASTA',
            'fna': 'FASTA'
        };
        return types[extension] || 'Unknown';
    }

    showError(message) {
        this.errorToast.querySelector('.toast-message').textContent = message;
        this.errorToast.classList.add('show');
        
        setTimeout(() => {
            this.errorToast.classList.remove('show');
        }, 5000);
    }

    showSuccess(message) {
        this.successToast.querySelector('.toast-message').textContent = message;
        this.successToast.classList.add('show');
        
        setTimeout(() => {
            this.successToast.classList.remove('show');
        }, 3000);
    }
}

// Initialize upload manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uploadManager = new UploadManager();
});

// Helper function for file removal (called from HTML)
function removeFile(index) {
    if (window.uploadManager) {
        window.uploadManager.removeFile(index);
    }
}