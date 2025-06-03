import random
from Bio import SeqIO
from collections import Counter
import os # Untuk cek keberadaan file dan membuat direktori
import matplotlib.pyplot as plt

# --- Konfigurasi Proyek ---
# Direktori untuk menyimpan file-file data
DATA_DIR = "data"
GENOME_REF_DIR = os.path.join(DATA_DIR, "genom_referensi")

# Path ke file FASTA genom referensi yang sudah kamu unduh
REFERENCE_GENOMES_INFO = [
    (os.path.join(GENOME_REF_DIR, "GCF_001308065.1_ASM130806v1_genomic.fna"), "Escherichia coli"), 
    (os.path.join(GENOME_REF_DIR, "GCF_001302645.1_ASM130264v1_genomic.fna"), "Lactobacillus plantarum") 
]

# Path untuk menyimpan file FASTQ reads simulasi
SIMULATED_FASTQ_FILE = os.path.join(DATA_DIR, "simulated_metagenomic_reads.fastq")

# Parameter Algoritma
K_SIZE = 31 # Ukuran k-mer
NUM_SIMULATED_READS = 500000 # Jumlah reads yang akan disimulasikan (bisa diubah)
READ_LENGTH_MIN = 100
READ_LENGTH_MAX = 150

# --- Fungsi-fungsi Utama ---

def create_data_directories():
    """Membuat direktori yang diperlukan jika belum ada."""
    os.makedirs(GENOME_REF_DIR, exist_ok=True)
    print(f"Direktori '{DATA_DIR}' dan '{GENOME_REF_DIR}' dipastikan ada.")

def simulate_reads(genome_fasta_files, num_reads, read_length_min, read_length_max, output_fastq):
    """
    Mensimulasikan reads metagenomik dari genom referensi yang diberikan.
    Reads akan disimpan dalam format FASTQ.
    """
    genomes = {}
    print("\n--- Memulai Simulasi Reads ---")
    for fasta_path, species_name in genome_fasta_files:
        if not os.path.exists(fasta_path):
            print(f"ERROR: File genom referensi tidak ditemukan: {fasta_path}")
            print("Pastikan Anda sudah mengunduh genom FASTA dan menyesuaikan PATH di konfigurasi.")
            return False # Menghentikan proses simulasi
        
        print(f"Memuat genom {species_name} dari {fasta_path} untuk simulasi...")
        # Baca hanya sequence pertama dari file FASTA jika ada multiple entries (misal plasmid)
        try:
            for record in SeqIO.parse(fasta_path, "fasta"):
                genomes[species_name] = str(record.seq).upper()
                break 
        except Exception as e:
            print(f"ERROR: Gagal membaca file FASTA {fasta_path}: {e}")
            return False

    if not genomes:
        print("Tidak ada genom yang berhasil dimuat untuk simulasi. Pastikan file FASTA valid.")
        return False

    with open(output_fastq, "w") as fq_out:
        print(f"Mensimulasikan {num_reads} reads ke {output_fastq}...")
        for i in range(num_reads):
            # Pilih spesies secara acak (bisa disesuaikan proporsinya jika perlu)
            chosen_species_name = random.choice(list(genomes.keys()))
            genome_sequence = genomes[chosen_species_name]
            
            read_length = random.randint(read_length_min, read_length_max)
            
            # Pastikan posisi awal tidak melebihi panjang genom
            # Handle kasus jika genom terlalu pendek dari read_length
            if len(genome_sequence) < read_length:
                print(f"Peringatan: Genom {chosen_species_name} terlalu pendek untuk read_length {read_length}.")
                continue # Lewati read ini
            start_pos = random.randint(0, len(genome_sequence) - read_length)
            read_sequence = genome_sequence[start_pos : start_pos + read_length]
            
            # Tulis ke format FASTQ (kualitas placeholder)
            # ID read disertakan spesies asli untuk verifikasi (tidak akan digunakan di klasifikasi)
            fq_out.write(f"@{chosen_species_name}_{i+1}\n") 
            fq_out.write(f"{read_sequence}\n")
            fq_out.write("+\n")
            fq_out.write("I" * read_length + "\n") # Kualitas 'I' adalah nilai ASCII 73, cukup umum dan tinggi
            
            if (i + 1) % 50000 == 0: # Update progress setiap 50.000 reads
                print(f"  Sudah mensimulasikan {i+1}/{num_reads} reads...")
    print(f"Simulasi reads selesai. Tersimpan di: {output_fastq}")
    return True # Simulasi berhasil

def build_kmer_database(fasta_files_info, k_size):
    """
    Membangun database k-mer dari genom referensi.
    Outputnya adalah dictionary: {kmer: species_name}.
    """
    kmer_db = {}
    print(f"\n--- Membangun Database K-mer (k={k_size}) ---")
    for fasta_path, species_name in fasta_files_info:
        print(f"Memproses genom '{species_name}' dari '{fasta_path}'...")
        try:
            for record in SeqIO.parse(fasta_path, "fasta"):
                sequence = str(record.seq).upper()
                # Pastikan k_size tidak lebih besar dari panjang sequence
                if len(sequence) < k_size:
                    print(f"Peringatan: Genom {species_name} terlalu pendek untuk k-mer {k_size}.")
                    continue
                
                for i in range(len(sequence) - k_size + 1):
                    kmer = sequence[i : i + k_size]
                    # Simpan k-mer dan spesiesnya. Jika k-mer muncul di lebih dari satu spesies,
                    # pendekatan sederhana ini akan menimpa dan menyimpan yang terakhir ditemukan.
                    # Untuk kasus yang lebih kompleks, bisa disimpan set/list spesies.
                    kmer_db[kmer] = species_name
            print(f"  {len(kmer_db)} k-mer unik terkumpul sejauh ini.")
        except Exception as e:
            print(f"ERROR: Gagal membaca/memproses file FASTA {fasta_path}: {e}")
            print("Pastikan file genom referensi tidak korup.")
            return {} # Mengembalikan DB kosong jika ada error
            
    print(f"Database k-mer selesai. Total k-mer unik: {len(kmer_db)}")
    return kmer_db

def classify_reads(fastq_file, kmer_db, k_size):
    """
    Mengklasifikasikan reads dari file FASTQ menggunakan database k-mer.
    Mengembalikan daftar spesies hasil klasifikasi untuk setiap read.
    """
    read_classifications = [] 
    total_reads_processed = 0

    print(f"\n--- Mengklasifikasi Reads dari '{fastq_file}' ---")
    if not os.path.exists(fastq_file):
        print(f"ERROR: File FASTQ reads tidak ditemukan: {fastq_file}")
        return [] # Mengembalikan daftar kosong
        
    try:
        for record in SeqIO.parse(fastq_file, "fastq"):
            total_reads_processed += 1
            read_sequence = str(record.seq).upper()
            
            # Memecah read menjadi k-mer dan mencari di database
            kmer_matches_for_read = []
            # Pastikan read_sequence cukup panjang untuk k-mer
            if len(read_sequence) < k_size:
                read_classifications.append("Too_Short_Read")
                continue

            for i in range(len(read_sequence) - k_size + 1):
                kmer = read_sequence[i : i + k_size]
                if kmer in kmer_db:
                    kmer_matches_for_read.append(kmer_db[kmer])
            
            # Menentukan spesies untuk read berdasarkan mayoritas k-mer
            if kmer_matches_for_read:
                species_counts = Counter(kmer_matches_for_read)
                most_common_species = species_counts.most_common(1)[0][0]
                read_classifications.append(most_common_species)
            else:
                read_classifications.append("Unclassified") # Tidak ada k-mer yang cocok
                
            if total_reads_processed % 100000 == 0: # Update progress setiap 100.000 reads
                print(f"  Sudah memproses {total_reads_processed} reads...")

        print(f"Selesai memproses {total_reads_processed} reads.")
    except Exception as e:
        print(f"ERROR: Gagal membaca/memproses file FASTQ {fastq_file}: {e}")
        return []

    return read_classifications

def calculate_abundance(read_classifications):
    """
    Menghitung dan menampilkan proporsi komunitas mikroba,
    serta menghasilkan grafik visualisasinya.
    """
    total_classified_reads = 0
    final_species_counts = Counter()

    for species in read_classifications:
        if species not in ["Unclassified", "Too_Short_Read"]:
            final_species_counts[species] += 1
            total_classified_reads += 1

    print("\n--- Komposisi Komunitas Mikroba ---")
    if total_classified_reads == 0:
        print("Tidak ada reads yang berhasil diklasifikasikan ke spesies yang dikenal.")
        # Jika tidak ada reads terklasifikasi, tidak perlu lanjutkan ke visualisasi
        return

    # Tampilkan hasil dalam urutan kelimpahan tertinggi
    for species, count in final_species_counts.most_common():
        percentage = (count / total_classified_reads) * 100
        print(f"- {species}: {count} reads ({percentage:.2f}%)")

    unclassified_count = read_classifications.count("Unclassified")
    too_short_count = read_classifications.count("Too_Short_Read")

    total_reads_in_sample = len(read_classifications)
    if total_reads_in_sample > 0: # Pastikan ada reads yang diproses sama sekali
        unclassified_percentage = (unclassified_count / total_reads_in_sample) * 100
        too_short_percentage = (too_short_count / total_reads_in_sample) * 100
        classified_percentage = (total_classified_reads / total_reads_in_sample) * 100

        print(f"\nTotal reads diproses: {total_reads_in_sample}")
        print(f"Reads berhasil terklasifikasi: {total_classified_reads} ({classified_percentage:.2f}%)")
        print(f"Reads tidak terklasifikasi: {unclassified_count} ({unclassified_percentage:.2f}%)")
        print(f"Reads terlalu pendek: {too_short_count} ({too_short_percentage:.2f}%)")

    # --- BAGIAN UNTUK VISUALISASI ---
    # Bagian ini menggunakan hasil perhitungan di atas, TIDAK MENGULANGI PERHITUNGAN
    if total_classified_reads > 0:
        species_names = []
        percentages = []

        for species, count in final_species_counts.most_common():
            species_names.append(species)
            percentages.append((count / total_classified_reads) * 100)

        # Grafik Bar Chart untuk Spesies Terklasifikasi
        plt.figure(figsize=(12, 7))
        plt.bar(species_names, percentages, color='skyblue')
        plt.xlabel("Spesies Mikroba")
        plt.ylabel("Kelimpahan Relatif (%)")
        plt.title("Komposisi Komunitas Mikroba (Hanya Terklasifikasi)")
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()
        plt.savefig(os.path.join(DATA_DIR, "microbe_abundance_barchart_classified.png"))
        # plt.show()

        # Grafik Pie Chart untuk Distribusi Keseluruhan (Termasuk Unclassified/Too Short)
        pie_labels = species_names[:]
        pie_sizes = percentages[:]

        if unclassified_count > 0:
            pie_labels.append("Unclassified")
            pie_sizes.append((unclassified_count / total_reads_in_sample) * 100)

        if too_short_count > 0:
            pie_labels.append("Too Short Reads")
            pie_sizes.append((too_short_count / total_reads_in_sample) * 100)

        # Hanya buat pie chart jika ada data untuk ditampilkan (terklasifikasi, unclassified, atau too short)
        if sum(pie_sizes) > 0:
            plt.figure(figsize=(9, 9))
            plt.pie(pie_sizes, labels=pie_labels, autopct='%1.1f%%', startangle=90, pctdistance=0.85)
            plt.title("Distribusi Keseluruhan Reads Metagenomik")
            plt.axis('equal')
            plt.tight_layout()
            plt.savefig(os.path.join(DATA_DIR, "microbe_abundance_piechart_overall.png"))
            # plt.show()
    # --- AKHIR BAGIAN VISUALISASI ---

# --- Main Program ---
if __name__ == "__main__":
    create_data_directories()

    # Langkah A: Simulasi Reads (jalankan ini jika kamu belum punya file FASTQ)
    # Ini akan membuat file 'data/simulated_metagenomic_reads.fastq'
    print("Memeriksa status file FASTQ simulasi...")
    if not os.path.exists(SIMULATED_FASTQ_FILE) or os.path.getsize(SIMULATED_FASTQ_FILE) == 0:
        print("File FASTQ simulasi belum ada atau kosong. Akan memulai simulasi...")
        simulation_successful = simulate_reads(
            genome_fasta_files=[(ref[0], ref[1]) for ref in REFERENCE_GENOMES_INFO], # Kirim list tuple (path, species_name)
            num_reads=NUM_SIMULATED_READS,
            read_length_min=READ_LENGTH_MIN,
            read_length_max=READ_LENGTH_MAX,
            output_fastq=SIMULATED_FASTQ_FILE
        )
        if not simulation_successful:
            print("Simulasi reads gagal. Mohon perbaiki error di atas.")
            exit()
    else:
        print(f"File FASTQ simulasi '{SIMULATED_FASTQ_FILE}' sudah ada. Melewati simulasi.")

    print("\n--- Memulai Analisis Metagenomik ---")
    
    # Langkah B: Membangun database k-mer dari genom referensi
    kmer_database = build_kmer_database(REFERENCE_GENOMES_INFO, K_SIZE)
    
    # Periksa apakah database k-mer berhasil dibangun
    if not kmer_database:
        print("Database k-mer gagal dibangun atau kosong. Tidak dapat melanjutkan analisis.")
        exit()

    # Langkah C: Mengklasifikasikan reads dari file FASTQ simulasi
    classified_reads_results = classify_reads(SIMULATED_FASTQ_FILE, kmer_database, K_SIZE)

    # Langkah D: Menghitung dan menampilkan proporsi komunitas mikroba
    if classified_reads_results: # Pastikan ada hasil klasifikasi
        calculate_abundance(classified_reads_results)
    else:
        print("Tidak ada reads yang berhasil diklasifikasikan. Periksa input dan proses sebelumnya.")

    print("\n--- Analisis Metagenomik Selesai ---")