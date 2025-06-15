class MetagenomicsAnalyzer {
    constructor() {
        this.kmerDb = null;
    }

    async _loadKmerDatabase(progressCallback) {
        if (this.kmerDb) return;
        try {
            progressCallback({ phase: 'loading_database', progress: 25, message: 'Downloading reference database...' });
            const response = await fetch('assets/data/kmer_database.json');
            if (!response.ok) throw new Error(`Failed to load database: ${response.statusText}`);
            this.kmerDb = await response.json();
            progressCallback({ phase: 'loading_database', progress: 100, message: 'Reference database loaded.' });
        } catch (error) {
            console.error("Error loading K-mer DB:", error);
            throw error;
        }
    }

    // --- FUNGSI PARSER YANG DIPERBARUI ---
    _parseSequenceFile(fileContent) {
        const sequences = [];
        const lines = fileContent.split('\n');
        
        if (!lines[0]) return sequences; // File kosong

        // Deteksi format berdasarkan karakter pertama
        if (lines[0].startsWith('>')) {
            // Logika Parser FASTA (tidak berubah)
            let currentSequence = { id: '', seq: '' };
            for (const line of lines) {
                if (line.startsWith('>')) {
                    if (currentSequence.id) sequences.push(currentSequence);
                    currentSequence = { id: line.substring(1).trim(), seq: '' };
                } else if (currentSequence.id) {
                    currentSequence.seq += line.trim().toUpperCase();
                }
            }
            if (currentSequence.id) sequences.push(currentSequence);
        } else if (lines[0].startsWith('@')) {
            // Logika Parser FASTQ BARU
            for (let i = 0; i < lines.length; i += 4) {
                if (lines[i] && lines[i].startsWith('@')) {
                    const id = lines[i].substring(1).trim();
                    const seq = lines[i + 1] ? lines[i + 1].trim().toUpperCase() : '';
                    if (id && seq) {
                        sequences.push({ id, seq });
                    }
                }
            }
        }
        return sequences;
    }

    _classifySequences(sampleContent, params) {
        const classifications = [];
        // Gunakan parser baru
        const sampleSequences = this._parseSequenceFile(sampleContent);

        for (const record of sampleSequences) {
            const readSequence = record.seq;
            if (readSequence.length < params.kmerSize) {
                classifications.push({ sequenceId: record.id, classification: 'Too_Short', confidence: 0 });
                continue;
            }

            const matches = {};
            const kmerCountInRead = readSequence.length - params.kmerSize + 1;
            for (let i = 0; i < kmerCountInRead; i++) {
                const kmer = readSequence.substring(i, i + params.kmerSize);
                if (this.kmerDb[kmer]) {
                    const species = this.kmerDb[kmer];
                    matches[species] = (matches[species] || 0) + 1;
                }
            }
            
            if (Object.keys(matches).length > 0) {
                const topSpecies = Object.keys(matches).reduce((a, b) => matches[a] > matches[b] ? a : b);
                const confidence = matches[topSpecies] / kmerCountInRead;
                
                if (confidence >= params.confidenceThreshold) {
                     classifications.push({ sequenceId: record.id, classification: topSpecies, confidence });
                } else {
                     classifications.push({ sequenceId: record.id, classification: 'Low_Confidence', confidence });
                }
            } else {
                classifications.push({ sequenceId: record.id, classification: 'Unclassified', confidence: 0 });
            }
        }
        return classifications;
    }

    async analyze(sampleFile, params, progressCallback) {
        await this._loadKmerDatabase(progressCallback);

        progressCallback({ phase: 'reading_sample', progress: 0, message: `Reading ${sampleFile.name}...` });
        const sampleContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(sampleFile);
        });
        progressCallback({ phase: 'reading_sample', progress: 100, message: 'Sample file read.' });
        
        progressCallback({ phase: 'classifying', progress: 0, message: 'Classifying sequences...' });
        const classifications = this._classifySequences(sampleContent, params);
        progressCallback({ phase: 'classifying', progress: 100, message: 'Classification complete.' });
        
        const abundanceCounts = {};
        let classifiedCount = 0;
        classifications.forEach(c => {
            if (!['Unclassified', 'Too_Short', 'Low_Confidence'].includes(c.classification)) {
                abundanceCounts[c.classification] = (abundanceCounts[c.classification] || 0) + 1;
                classifiedCount++;
            }
        });

        const sortedAbundance = Object.entries(abundanceCounts)
            .map(([species, count]) => ({ species, count }))
            .sort((a, b) => b[1] - a[1]);
        
        const totalSequences = classifications.length;
        const statistics = {
            totalSequences,
            classifiedSequences: classifiedCount,
            unclassifiedSequences: totalSequences - classifiedCount,
            classificationRate: totalSequences > 0 ? (classifiedCount / totalSequences) : 0,
            uniqueTaxa: Object.keys(abundanceCounts).length
        };

        return { statistics, abundance: sortedAbundance, classifications };
    }
}
window.MetagenomicsAnalyzer = MetagenomicsAnalyzer;