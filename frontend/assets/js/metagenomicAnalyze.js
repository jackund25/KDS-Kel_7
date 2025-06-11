// ==============================================
// Metagenomics Analysis Engine (JavaScript)
// ==============================================

class MetagenomicsAnalyzer {
    constructor() {
        this.kmerSize = 31;
        this.kmerDatabase = new Map();
        this.referenceGenomes = new Map();
        this.analysisResults = null;
        this.isAnalyzing = false;
        
        // Analysis configuration
        this.config = {
            kmerSize: 31,
            minReadLength: 50,
            maxReads: 100000, // Limit for browser performance
            qualityThreshold: 20
        };
    }

    // Parse FASTA file content
    async parseFASTA(fileContent, filename) {
        const sequences = [];
        const lines = fileContent.split('\n');
        let currentSequence = '';
        let currentHeader = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('>')) {
                // Save previous sequence if exists
                if (currentHeader && currentSequence) {
                    sequences.push({
                        header: currentHeader,
                        sequence: currentSequence.toUpperCase(),
                        filename: filename
                    });
                }
                currentHeader = line.substring(1);
                currentSequence = '';
            } else if (line) {
                currentSequence += line;
            }
        }
        
        // Add last sequence
        if (currentHeader && currentSequence) {
            sequences.push({
                header: currentHeader,
                sequence: currentSequence.toUpperCase(),
                filename: filename
            });
        }
        
        return sequences;
    }

    // Generate k-mers from sequence
    generateKmers(sequence, kSize = this.config.kmerSize) {
        const kmers = [];
        if (sequence.length < kSize) return kmers;
        
        for (let i = 0; i <= sequence.length - kSize; i++) {
            const kmer = sequence.substring(i, i + kSize);
            // Only include valid DNA bases
            if (/^[ATCG]+$/.test(kmer)) {
                kmers.push(kmer);
            }
        }
        return kmers;
    }

    // Build k-mer database from reference sequences
    buildKmerDatabase(sequences, progressCallback) {
        this.kmerDatabase.clear();
        let processedSequences = 0;
        
        sequences.forEach((seq, index) => {
            const kmers = this.generateKmers(seq.sequence);
            const speciesName = this.extractSpeciesName(seq.header, seq.filename);
            
            kmers.forEach(kmer => {
                if (!this.kmerDatabase.has(kmer)) {
                    this.kmerDatabase.set(kmer, []);
                }
                this.kmerDatabase.get(kmer).push(speciesName);
            });
            
            processedSequences++;
            if (progressCallback) {
                progressCallback({
                    phase: 'building_database',
                    processed: processedSequences,
                    total: sequences.length,
                    progress: (processedSequences / sequences.length) * 100
                });
            }
        });
        
        return this.kmerDatabase.size;
    }

    // Extract species name from header or filename
    extractSpeciesName(header, filename) {
        // Try to extract from header first
        const headerLower = header.toLowerCase();
        
        // Common patterns in FASTA headers
        const patterns = [
            /organism[=:\s]+([^,\|\[\]]+)/i,
            /\[([^\]]+)\]$/,
            /^(\w+\s+\w+)/
        ];
        
        for (const pattern of patterns) {
            const match = header.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        // Fallback to filename
        const baseName = filename.replace(/\.(fasta|fa|fas|fna)$/i, '');
        return baseName.replace(/[_-]/g, ' ');
    }

    // Simulate metagenomic reads from sequences
    simulateReads(sequences, numReads = 10000, readLength = 150) {
        const reads = [];
        
        if (sequences.length === 0) return reads;
        
        for (let i = 0; i < numReads; i++) {
            // Randomly select a sequence
            const randomSeq = sequences[Math.floor(Math.random() * sequences.length)];
            const sequence = randomSeq.sequence;
            
            if (sequence.length < readLength) continue;
            
            // Random start position
            const startPos = Math.floor(Math.random() * (sequence.length - readLength + 1));
            const read = sequence.substring(startPos, startPos + readLength);
            
            reads.push({
                id: `sim_read_${i + 1}`,
                sequence: read,
                trueSpecies: this.extractSpeciesName(randomSeq.header, randomSeq.filename),
                quality: 'I'.repeat(readLength) // High quality placeholder
            });
        }
        
        return reads;
    }

    // Classify a single read using k-mer matching
    classifyRead(read) {
        const kmers = this.generateKmers(read.sequence);
        const speciesHits = new Map();
        
        kmers.forEach(kmer => {
            if (this.kmerDatabase.has(kmer)) {
                const species = this.kmerDatabase.get(kmer);
                species.forEach(sp => {
                    speciesHits.set(sp, (speciesHits.get(sp) || 0) + 1);
                });
            }
        });
        
        if (speciesHits.size === 0) {
            return {
                classification: 'Unclassified',
                confidence: 0,
                hitCount: 0
            };
        }
        
        // Find best match
        let bestSpecies = '';
        let bestCount = 0;
        
        for (const [species, count] of speciesHits) {
            if (count > bestCount) {
                bestCount = count;
                bestSpecies = species;
            }
        }
        
        const confidence = bestCount / kmers.length;
        
        return {
            classification: bestSpecies,
            confidence: confidence,
            hitCount: bestCount,
            totalKmers: kmers.length
        };
    }

    // Classify multiple reads
    classifyReads(reads, progressCallback) {
        const results = [];
        let processedReads = 0;
        
        reads.forEach((read, index) => {
            const classification = this.classifyRead(read);
            results.push({
                readId: read.id,
                sequence: read.sequence,
                trueSpecies: read.trueSpecies || 'Unknown',
                classification: classification.classification,
                confidence: classification.confidence,
                hitCount: classification.hitCount,
                totalKmers: classification.totalKmers
            });
            
            processedReads++;
            if (progressCallback && processedReads % 1000 === 0) {
                progressCallback({
                    phase: 'classifying_reads',
                    processed: processedReads,
                    total: reads.length,
                    progress: (processedReads / reads.length) * 100
                });
            }
        });
        
        return results;
    }

    // Calculate abundance and statistics
    calculateAbundance(classificationResults) {
        const speciesCounts = new Map();
        const stats = {
            totalReads: classificationResults.length,
            classifiedReads: 0,
            unclassifiedReads: 0,
            averageConfidence: 0,
            uniqueSpecies: 0
        };
        
        let totalConfidence = 0;
        
        classificationResults.forEach(result => {
            if (result.classification !== 'Unclassified') {
                speciesCounts.set(
                    result.classification, 
                    (speciesCounts.get(result.classification) || 0) + 1
                );
                stats.classifiedReads++;
                totalConfidence += result.confidence;
            } else {
                stats.unclassifiedReads++;
            }
        });
        
        stats.uniqueSpecies = speciesCounts.size;
        stats.averageConfidence = stats.classifiedReads > 0 ? 
            totalConfidence / stats.classifiedReads : 0;
        
        // Convert to abundance array sorted by count
        const abundance = Array.from(speciesCounts.entries())
            .map(([species, count]) => ({
                species: species,
                count: count,
                percentage: (count / stats.totalReads) * 100,
                relativeAbundance: stats.classifiedReads > 0 ? 
                    (count / stats.classifiedReads) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
        
        return {
            abundance: abundance,
            statistics: stats,
            classificationResults: classificationResults
        };
    }

    // Main analysis function
    async analyzeFiles(files, progressCallback) {
        if (this.isAnalyzing) {
            throw new Error('Analysis already in progress');
        }
        
        this.isAnalyzing = true;
        
        try {
            progressCallback?.({
                phase: 'reading_files',
                progress: 0,
                message: 'Reading FASTA files...'
            });
            
            // Parse all FASTA files
            const allSequences = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const content = await this.readFileAsText(file);
                const sequences = await this.parseFASTA(content, file.name);
                allSequences.push(...sequences);
                
                progressCallback?.({
                    phase: 'reading_files',
                    progress: ((i + 1) / files.length) * 100,
                    message: `Parsed ${file.name} (${sequences.length} sequences)`
                });
            }
            
            if (allSequences.length === 0) {
                throw new Error('No valid sequences found in uploaded files');
            }
            
            progressCallback?.({
                phase: 'building_database',
                progress: 0,
                message: 'Building k-mer database...'
            });
            
            // Build k-mer database
            const databaseSize = this.buildKmerDatabase(allSequences, progressCallback);
            
            progressCallback?.({
                phase: 'simulating_reads',
                progress: 0,
                message: 'Simulating metagenomic reads...'
            });
            
            // Simulate metagenomic reads
            const numReads = Math.min(this.config.maxReads, allSequences.length * 100);
            const reads = this.simulateReads(allSequences, numReads);
            
            progressCallback?.({
                phase: 'classifying_reads',
                progress: 0,
                message: 'Classifying reads...'
            });
            
            // Classify reads
            const classificationResults = this.classifyReads(reads, progressCallback);
            
            progressCallback?.({
                phase: 'calculating_abundance',
                progress: 0,
                message: 'Calculating abundance...'
            });
            
            // Calculate abundance
            const analysisResults = this.calculateAbundance(classificationResults);
            
            // Add metadata
            analysisResults.metadata = {
                analysisDate: new Date().toISOString(),
                filesAnalyzed: files.map(f => f.name),
                totalSequences: allSequences.length,
                kmerDatabaseSize: databaseSize,
                kmerSize: this.config.kmerSize,
                simulatedReads: reads.length
            };
            
            this.analysisResults = analysisResults;
            
            progressCallback?.({
                phase: 'complete',
                progress: 100,
                message: 'Analysis complete!'
            });
            
            return analysisResults;
            
        } catch (error) {
            throw error;
        } finally {
            this.isAnalyzing = false;
        }
    }

    // Helper function to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Generate summary report
    generateSummaryReport() {
        if (!this.analysisResults) return null;
        
        const { abundance, statistics, metadata } = this.analysisResults;
        
        return {
            summary: {
                totalSequences: metadata.totalSequences,
                totalReads: statistics.totalReads,
                classifiedReads: statistics.classifiedReads,
                classificationRate: (statistics.classifiedReads / statistics.totalReads * 100).toFixed(1),
                uniqueSpecies: statistics.uniqueSpecies,
                averageConfidence: (statistics.averageConfidence * 100).toFixed(1),
                topSpecies: abundance.length > 0 ? abundance[0].species : 'None',
                topAbundance: abundance.length > 0 ? abundance[0].percentage.toFixed(1) : '0'
            },
            topSpecies: abundance.slice(0, 10),
            metadata: metadata
        };
    }

    // Export results in different formats
    exportResults(format = 'json') {
        if (!this.analysisResults) return null;
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportCSV(timestamp);
            case 'json':
                return this.exportJSON(timestamp);
            case 'txt':
                return this.exportTXT(timestamp);
            default:
                return this.exportJSON(timestamp);
        }
    }

    exportCSV(timestamp) {
        const { abundance, statistics } = this.analysisResults;
        let csv = 'Species,Count,Percentage,Relative_Abundance\n';
        
        abundance.forEach(item => {
            csv += `"${item.species}",${item.count},${item.percentage.toFixed(2)},${item.relativeAbundance.toFixed(2)}\n`;
        });
        
        return {
            content: csv,
            filename: `metagenomics_results_${timestamp}.csv`,
            type: 'text/csv'
        };
    }

    exportJSON(timestamp) {
        return {
            content: JSON.stringify(this.analysisResults, null, 2),
            filename: `metagenomics_results_${timestamp}.json`,
            type: 'application/json'
        };
    }

    exportTXT(timestamp) {
        const { abundance, statistics, metadata } = this.analysisResults;
        
        let txt = 'MetaClassify Analysis Results\n';
        txt += '================================\n\n';
        txt += `Analysis Date: ${metadata.analysisDate}\n`;
        txt += `Files Analyzed: ${metadata.filesAnalyzed.join(', ')}\n`;
        txt += `Total Sequences: ${metadata.totalSequences}\n`;
        txt += `K-mer Size: ${metadata.kmerSize}\n`;
        txt += `Simulated Reads: ${metadata.simulatedReads}\n\n`;
        
        txt += 'Statistics:\n';
        txt += '-----------\n';
        txt += `Total Reads: ${statistics.totalReads}\n`;
        txt += `Classified Reads: ${statistics.classifiedReads} (${(statistics.classifiedReads/statistics.totalReads*100).toFixed(1)}%)\n`;
        txt += `Unclassified Reads: ${statistics.unclassifiedReads} (${(statistics.unclassifiedReads/statistics.totalReads*100).toFixed(1)}%)\n`;
        txt += `Unique Species: ${statistics.uniqueSpecies}\n`;
        txt += `Average Confidence: ${(statistics.averageConfidence*100).toFixed(1)}%\n\n`;
        
        txt += 'Species Abundance:\n';
        txt += '------------------\n';
        abundance.forEach((item, index) => {
            txt += `${index + 1}. ${item.species}: ${item.count} reads (${item.percentage.toFixed(2)}%)\n`;
        });
        
        return {
            content: txt,
            filename: `metagenomics_results_${timestamp}.txt`,
            type: 'text/plain'
        };
    }

// Get analysis status
    getStatus() {
        return {
            isAnalyzing: this.isAnalyzing,
            hasResults: !!this.analysisResults,
            databaseSize: this.kmerDatabase.size
        };
    }

    // Reset analyzer
    reset() {
        this.kmerDatabase.clear();
        this.referenceGenomes.clear();
        this.analysisResults = null;
        this.isAnalyzing = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetagenomicsAnalyzer;
} else if (typeof window !== 'undefined') {
    window.MetagenomicsAnalyzer = MetagenomicsAnalyzer;
}