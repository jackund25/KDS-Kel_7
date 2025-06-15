# Microbial Classification using K-mer Based Analysis

A web-based tool for metagenomic analysis and microbial classification using k-mer based approaches.

## Features

- Upload FASTA/FASTQ files for analysis
- K-mer based sequence comparison
- Microbial species classification
- Interactive visualization of results
- Downloadable analysis reports

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python (Flask)
- **Key Libraries**: 
  - BioPython (sequence analysis)
  - Matplotlib (visualization)
  - Flask (web server)

## Project Structure

```
KDS-Kel_7/
│
├── data/
│   └── simulated_metagenomics_data/
|        ├── GCF_001302645.1.fna
|        └── GCF_001308065.1.fna   
│
├── db_builder/
│   ├── referensi/
│   │   ├── GCF_001302645.1.fna
│   │   ├── GCF_001308065.1.fna
│   └── create_kmer_db.js
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── auth.css
│   │   │   ├── dashboard.css
│   │   │   ├── main.css
│   │   │   └── upload.css
│   │   ├── data/
│   │   └── js/
│   │       ├── auth.js
│   │       ├── dashboard.js
│   │       ├── main.js
│   │       ├── metagenomics_analyzer.js
│   │       ├── upload.js
│   │       └── utils.js
│   ├── fonts/
│   └── images/
│   
│
├── dashboard.html
├── index.html
├── login.html
├── register.html
├── result.html
├── upload.html
├── .gitattributes
├── .gitignore
├── LICENSE
├── metagenomics_analyzer.py
├── README.md
└── requirements.txt
```


## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/KDS-Kel_7.git
cd KDS-Kel_7
```

2. Create and activate virtual environment (Windows):
```bash
python -m venv venv
.\venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Download reference genomes:
Place the following files in `data/genom_referensi/`:
- `GCF_001308065.1_ASM130806v1_genomic.fna` (E. coli)
- `GCF_001302645.1_ASM130264v1_genomic.fna` (L. plantarum)

5. Run the application:
```bash
python app.py
```

6. Open `http://localhost:5000` in your browser

## Usage

1. Navigate to the upload page
2. Upload your FASTA/FASTQ file
3. Select analysis parameters (K-mer size: 15, 21, or 31)
4. Click "Start Analysis"
5. View and download results

## API Endpoints

### POST /analyze
Uploads and analyzes sequence file

**Input:**
- FASTA/FASTQ file
- K-mer size parameter

**Output:**
- JSON with analysis results and species abundance

## Deployment

This project is deployed using Vercel. You can access the live version at:
[https://metaclassify.vercel.app/](https://metaclassify.vercel.app/)

To deploy your own instance:

1. Fork this repository
2. Create a Vercel account
3. Import your forked repository
4. Configure build settings:
   - Framework Preset: Other
   - Build Command: `python app.py`
   - Output Directory: `frontend`

## Contributors

- Daffari Adiyatma / 18222003
- Benedicta Eryka Santosa / 18222031
- Dahayu Ramaniya Aurasindu / 18222099

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2025 KDS-Kel_7

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Contact

For any inquiries, please reach out to [daffariadytm@gmail.com]