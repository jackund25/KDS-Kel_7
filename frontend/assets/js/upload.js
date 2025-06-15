class UploadManager {
    constructor() {
        this.uploadedFiles = [];
        this.analysisResults = null;
        this.isAnalyzing = false;
        this.charts = { pie: null, bar: null };
        this.initializeElements();
        this.bindEvents();
        this.setupDragAndDrop();
        console.log('UploadManager initialized for single-file analysis.');
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
        this.resultsChartsContainer = document.getElementById('resultsChartsContainer');
        this.pieChartCanvas = document.getElementById('abundancePieChart');
        this.barChartCanvas = document.getElementById('compositionBarChart');
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
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('click', () => { if (!this.isAnalyzing) this.fileInput.click(); });
        const browseText = this.uploadArea.querySelector('.browse-text');
        if (browseText) { browseText.addEventListener('click', (e) => { e.stopPropagation(); this.fileInput.click(); }); }
        this.clearBtn?.addEventListener('click', () => this.clearFiles());
        this.analyzeBtn?.addEventListener('click', () => this.startAnalysis());
        this.previewBtn?.addEventListener('click', () => this.previewResults());
        this.downloadBtn?.addEventListener('click', () => this.downloadResults());
        this.saveBtn?.addEventListener('click', () => this.showLoginPrompt());
        this.continueWithoutLoginBtn?.addEventListener('click', () => this.hideLoginPrompt());
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => e.currentTarget.closest('.toast').classList.remove('show'));
        });
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => this.uploadArea.addEventListener(eventName, () => this.highlight(), false));
        ['dragleave', 'drop'].forEach(eventName => this.uploadArea.addEventListener(eventName, () => this.unhighlight(), false));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    highlight() { this.uploadArea.classList.add('drag-over'); }
    unhighlight() { this.uploadArea.classList.remove('drag-over'); }
    handleDrop(e) { this.handleFiles(e.dataTransfer.files); }
    handleFileSelect(e) { this.handleFiles(e.target.files); }

    // --- LOGIKA UTAMA YANG DIMODIFIKASI ---

    handleFiles(files) {
        // Hanya izinkan satu file untuk diunggah
        if (files.length > 1) {
            this.showError("Please upload only one file at a time for analysis.");
            return;
        }
        const file = files[0];
        if (this.validateFile(file)) {
            this.clearFiles(); // Hapus file lama (jika ada) untuk memastikan hanya ada satu
            this.addFiles([file]); // Gunakan fungsi addFiles yang sudah ada
            this.fileList.style.display = 'block';
            this.analysisOptions.style.display = 'block';
            this.uploadActions.style.display = 'block';
        }
    }

    async startAnalysis() {
        // Cek jika ada tepat satu file yang diunggah
        if (this.uploadedFiles.length !== 1) {
            this.showError('Please select a single file to analyze.');
            return;
        }
        if (this.isAnalyzing) { this.showError('Analysis is already in progress.'); return; }

        this.isAnalyzing = true;
        this.analyzeBtn.disabled = true;
        this.analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        this.hideResults();
        this.showProgress();
        const params = this.getAnalysisParameters();
        try {
            // Kirim hanya satu file ke fungsi performAnalysis
            await this.performAnalysis(this.uploadedFiles[0].file, params);
        } catch (error) {
            this.showError(`Analysis failed: ${error.message}`);
            this.hideProgress();
        } finally {
            this.isAnalyzing = false;
            this.analyzeBtn.disabled = false;
            this.analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Start Analysis';
        }
    }

    async performAnalysis(sampleFile, params) {
        if (typeof window.MetagenomicsAnalyzer === 'undefined') {
            throw new Error('Metagenomic analysis module not found.');
        }

        const analyzer = new window.MetagenomicsAnalyzer();
        this.updateProgressStep(1, true);

        const progressCallback = (progress) => {
            let percentage = 0;
            switch (progress.phase) {
                case 'loading_database': percentage = 5 + (progress.progress * 0.25); break; // 5-30%
                case 'reading_sample':   percentage = 30 + (progress.progress * 0.10); this.updateProgressStep(2, true); break; // 30-40%
                case 'classifying':      percentage = 40 + (progress.progress * 0.55); this.updateProgressStep(3, true); break; // 40-95%
                default:                 percentage = 98;
            }
            this.updateProgress(Math.round(percentage), progress.message);
        };
        
        const results = await analyzer.analyze(sampleFile, params, progressCallback);
        this.analysisResults = {
            timestamp: new Date().toISOString(),
            parameters: params,
            results
        };
        
        this.updateProgress(100, 'Analysis complete!');
        this.updateProgressStep(4, true);
        setTimeout(() => {
            this.hideProgress();
            this.showResults();
        }, 1000);
    }
    
    // --- FUNGSI LAINNYA (TIDAK ADA PERUBAHAN) ---

    validateFile(file) {
        const validExtensions = ['.fasta', '.fa', '.fas', '.fna'];
        const fileName = file.name.toLowerCase();
        if (!validExtensions.some(ext => fileName.endsWith(ext))) {
            this.showError(`Invalid file format: ${file.name}.`); return false;
        }
        if (file.size > 100 * 1024 * 1024) { // 100MB
            this.showError(`File too large: ${file.name}. Max 100MB.`); return false;
        }
        if (this.uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
            this.showError(`File already added: ${file.name}`); return false;
        }
        return true;
    }

    addFiles(files) {
        files.forEach(file => {
            const fileObj = { file, name: file.name, size: file.size, id: 'file_' + Date.now() + Math.random() };
            this.uploadedFiles.push(fileObj);
            this.renderFileItem(fileObj);
        });
        this.showSuccess(`${files.length} file(s) added.`);
    }

    renderFileItem(fileObj) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileObj.id;
        fileItem.innerHTML = `<div class="file-info"><div class="file-icon"><i class="fas fa-dna"></i></div><div class="file-details"><div class="file-name">${fileObj.name}</div><div class="file-size">${this.formatFileSize(fileObj.size)}</div></div></div><button class="file-remove" data-file-id="${fileObj.id}"><i class="fas fa-times"></i></button>`;
        fileItem.querySelector('.file-remove').addEventListener('click', () => this.removeFile(fileObj.id));
        this.filesContainer.appendChild(fileItem);
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        document.querySelector(`[data-file-id="${fileId}"]`)?.remove();
        if (this.uploadedFiles.length === 0) {
            this.fileList.style.display = 'none';
            this.analysisOptions.style.display = 'none';
            this.uploadActions.style.display = 'none';
        }
    }

    clearFiles() {
        this.uploadedFiles = [];
        this.filesContainer.innerHTML = '';
        this.fileList.style.display = 'none';
        this.analysisOptions.style.display = 'none';
        this.uploadActions.style.display = 'none';
        this.hideResults();
        this.hideProgress();
        this.fileInput.value = '';
    }
    
    getAnalysisParameters() {
        return {
            kmerSize: parseInt(document.getElementById('kmerSize').value),
            confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value),
            outputFormat: document.getElementById('outputFormat').value,
            includeVisualization: document.getElementById('includeVisualization').checked
        };
    }

    showResults() {
        if (!this.analysisResults) return;
        const summary = this.analysisResults.results.statistics;
        this.resultsSummary.innerHTML = `<div class="summary-grid"><div class="summary-item"><div class="summary-details"><div class="summary-value">${summary.totalSequences.toLocaleString()}</div><div class="summary-label">Total Sequences</div></div></div><div class="summary-item"><div class="summary-details"><div class="summary-value">${summary.classifiedSequences.toLocaleString()}</div><div class="summary-label">Classified</div></div></div><div class="summary-item"><div class="summary-details"><div class="summary-value">${summary.uniqueTaxa.toLocaleString()}</div><div class="summary-label">Unique Taxa</div></div></div><div class="summary-item"><div class="summary-details"><div class="summary-value">${(summary.classificationRate * 100).toFixed(1)}%</div><div class="summary-label">Success Rate</div></div></div></div>`;
        if (this.analysisResults.parameters.includeVisualization) {
            this.resultsChartsContainer.style.display = 'flex';
            this.renderCharts();
        } else {
            this.resultsChartsContainer.style.display = 'none';
        }
        this.resultsSection.style.display = 'block';
    }
    
    renderCharts() {
        const { abundance } = this.analysisResults.results;
        if (this.charts.pie) this.charts.pie.destroy();
        if (this.charts.bar) this.charts.bar.destroy();
        const pieCtx = this.pieChartCanvas.getContext('2d');
        this.charts.pie = new Chart(pieCtx, { type: 'pie', data: { labels: abundance.map(a => a.species), datasets: [{ data: abundance.map(a => a.count) }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Microbial Abundance' } } } });
        const barCtx = this.barChartCanvas.getContext('2d');
        this.charts.bar = new Chart(barCtx, { type: 'bar', data: { labels: abundance.map(a => a.species), datasets: [{ label: 'Sequence Count', data: abundance.map(a => a.count), backgroundColor: 'rgba(63, 95, 102, 0.6)' }] }, options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Community Composition' } }, scales: { y: { beginAtZero: true } } } });
    }

    previewResults() { this.showSuccess('Preview function is a placeholder.'); }
    downloadResults() { this.showSuccess('Download function is a placeholder.'); }
    showLoginPrompt() { this.loginPrompt.style.display = 'block'; }
    hideLoginPrompt() { this.loginPrompt.style.display = 'none'; }
    updateProgress(percent, status) {
        this.progressFill.style.width = percent + '%'; this.progressPercent.textContent = percent + '%'; this.progressStatus.textContent = status;
        this.progressTime.textContent = '';
    }
    updateProgressStep(stepNumber, active) { const step = this.progressSteps[`step${stepNumber}`]; if (step) { active ? step.classList.add('active') : step.classList.remove('active'); } }
    showProgress() { this.progressSection.style.display = 'block'; this.updateProgress(0, 'Initializing...'); Object.values(this.progressSteps).forEach(step => step.classList.remove('active')); }
    hideProgress() { this.progressSection.style.display = 'none'; }
    hideResults() { this.resultsSection.style.display = 'none'; if (this.charts.pie) this.charts.pie.destroy(); if (this.charts.bar) this.charts.bar.destroy(); }
    showSuccess(message) { this.showToast(this.successToast, message); }
    showError(message) { this.showToast(this.errorToast, message); }
    showToast(toastElement, message) { toastElement.querySelector('.toast-message').textContent = message; toastElement.classList.add('show'); setTimeout(() => { toastElement.classList.remove('show'); }, 5000); }
    formatFileSize(bytes) { if (bytes === 0) return '0 Bytes'; const k = 1024; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i]; }
}

document.addEventListener('DOMContentLoaded', function() {
    window.uploadManager = new UploadManager();
});