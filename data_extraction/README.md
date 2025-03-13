# Neked Dolgoznak - MP Declaration Extractor

This repository contains tools for extracting structured data from Hungarian MP (Member of Parliament) declarations in PDF format. It uses AI-based extraction (Google Gemini or OpenAI) to parse the content into structured JSON format.

## Setup

### Prerequisites

- Python 3.8+
- `uv` for package management

### Installation

1. Clone this repository
2. Install dependencies using `uv`:

```bash
uv pip install -r requirements.txt
```

### API Keys Configuration

Create a `.env` file in the root directory with your API keys:

```
GOOGLE_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

You only need to provide the API key for the service you plan to use (Gemini is the default).

## Usage

### Splitting PDF Declarations

Before extraction, you need to split the main PDF file containing all MP declarations into individual PDF files:

```bash
python split.py [options]
```

#### Options:

- `--limit N`: Limit the number of MPs to process

This script will read the main PDF file from `./pdfs/Kepviselok_20250228.pdf` and split it into individual MP PDFs in the `./temp` directory.

### Extracting Data from PDFs

After splitting, the `extract.py` script processes the individual PDF files and extracts structured data into JSON format:

```bash
python extract.py [options]
```

#### Options:

- `--print`: Print results to console instead of saving to file
- `--limit N`: Limit the number of MPs to process
- `--gemini`: Use Google Gemini API (default)
- `--openai`: Use OpenAI API instead of Google Gemini

**⚠️ Warning:** Currently, only the Google Gemini integration is fully functional. The OpenAI integration is not working at this time.

### Combining JSON Files

After extracting data into individual JSON files, you can combine them into a single file using `combine.py`:

```bash
python combine.py
```

This will combine all JSON files in the `./jsons` directory into `./jsons/combined.json`.

## Data Structure

The extracted data follows a structured schema that includes:

- Personal information
- Property declarations
- Valuable assets
- Financial interests
- Income declarations
- Economic interests

Each MP's data is stored in an individual JSON file (`mp_XXX.json`) in the `jsons` directory, and can be combined into a single file using the `combine.py` script.

## Directory Structure

```
.
├── split.py              # Script to split PDFs into individual MP files
├── extract.py            # Script to extract data from PDFs into JSON
├── combine.py            # Script to combine JSON files
├── requirements.txt      # Package dependencies
├── .env                  # API keys (not included in repo)
├── pdfs/                 # Directory for source PDF files
│   └── Kepviselok_20250228.pdf  # Source MP declarations PDF
├── temp/                 # Directory for individual MP PDFs
│   ├── mp_001.pdf         # Individual MP declaration PDFs
│   ├── mp_002.pdf
│   └── ...
└── jsons/                # Directory for JSON output files
    ├── mp_001.json       # Individual MP data JSON files
    ├── mp_002.json
    ├── ...
    └── combined.json     # Combined JSON with all MP data
```

## Workflow

1. Set up your environment with API keys
2. Run the `split.py` script to split the main PDF file into individual MP declarations
3. Run the `extract.py` script to parse the individual PDFs into structured JSON files
4. Run the `combine.py` script to merge all JSON files into a single file for easier analysis
5. **Important**: The extracted data was manually cleaned up and verified before being added to the frontend application to ensure data quality and consistency
