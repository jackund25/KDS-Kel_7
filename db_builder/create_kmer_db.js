const fs = require('fs');
const path = require('path');

// --- Konfigurasi ---
const K_SIZE = 31; // Ukuran k-mer bisa disesuaikan
const REFERENCE_DIR = './referensi';
const OUTPUT_FILE = './kmer_database.json'; // Hasilnya akan disimpan di sini

console.log('🚀 Memulai proses pembuatan database k-mer...');

const kmerDb = {};

// Fungsi sederhana untuk mem-parsing file FASTA
function parseFasta(content) {
    return content.split('\n').filter(line => !line.startsWith('>')).join('').trim().toUpperCase();
}

try {
    const files = fs.readdirSync(REFERENCE_DIR).filter(f => f.endsWith('.fna') || f.endsWith('.fasta'));
    if (files.length === 0) throw new Error(`Tidak ada file referensi (.fna atau .fasta) ditemukan di folder '${REFERENCE_DIR}'.`);

    console.log(`🧬 Menemukan ${files.length} file referensi.`);

    files.forEach(file => {
        // Mengambil nama spesies dari nama file, contoh: "GCF_001308065.1...fna" menjadi "GCF 001308065.1"
        const speciesName = path.basename(file, path.extname(file)).split('_').slice(0, 2).join(' ');
        console.log(`   -> Memproses: ${file} sebagai "${speciesName}"`);

        const filePath = path.join(REFERENCE_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const sequence = parseFasta(content);

        if (sequence.length < K_SIZE) {
            console.warn(`      ⚠️ Peringatan: Sekuens untuk ${speciesName} terlalu pendek.`);
            return;
        }

        for (let i = 0; i <= sequence.length - K_SIZE; i++) {
            const kmer = sequence.substring(i, i + K_SIZE);
            kmerDb[kmer] = speciesName;
        }
    });

    console.log(`\n✅ Total k-mer unik terkumpul: ${Object.keys(kmerDb).length}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kmerDb));
    console.log(`\n💾 Database berhasil disimpan ke: ${path.resolve(OUTPUT_FILE)}`);
    console.log("\nJangan lupa untuk memindahkan file ini ke folder 'frontend/assets/data/' Anda.");

} catch (error) {
    console.error('\n❌ ERROR:', error.message);
}