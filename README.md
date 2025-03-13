# Neked Dolgoznak - Hungarian MP Financial Declaration Analyzer

A comprehensive system for extracting, processing, and visualizing financial declarations of Hungarian Members of Parliament (MPs).

## Project Overview

This project aims to increase transparency in Hungarian politics by providing an accessible platform to analyze the financial declarations of MPs. The system extracts structured data from official PDF declarations and presents it in an interactive web interface for easy comparison and analysis.

## Components

The project consists of two main components:

### 1. Data Extraction (`/data_extraction`)

A Python-based extraction system that processes MP declaration PDFs and converts them into structured JSON data. The extracted data was then manually cleaned and verified before being incorporated into the frontend application.

**Key features:**
- Supports extraction using either Google's Gemini API or OpenAI API
- Extracts detailed information about properties, vehicles, investments, debts, and income
- Handles Hungarian language documents
- Outputs standardized JSON format following a comprehensive schema

**Requirements:**
- Python 3.x
- Environment variables for API keys (GOOGLE_API_KEY or OPENAI_API_KEY)

**Usage:**
```
python extract.py [--print] [--limit N] [--gemini | --openai]
```

### 2. Frontend Web Application (`/frontend`)

A React-based web application that displays the extracted MP declaration data in an interactive and user-friendly interface.

**Key features:**
- Tabular view of MP financial declarations
- Sortable columns for easy comparison
- Detailed breakdown of assets and wealth
- Data validation using Zod schema

**Technology stack:**
- Next.js / React
- TypeScript
- Tailwind CSS / UI components library
- Zod for schema validation

## Data Schema

The extracted data follows a comprehensive schema that includes:

- Personal information
- Real estate properties
- Vehicles and other valuable possessions
- Art collections and other valuable items
- Securities and investments
- Cash and bank deposits
- Debts and liabilities
- Income declarations
- Economic interests and business connections

## Getting Started

### Data Extraction Setup

1. Navigate to the `data_extraction` directory
2. Create a `.env` file with your API keys:
   ```
   GOOGLE_API_KEY=your_api_key_here
   OPENAI_API_KEY=your_api_key_here
   ```
3. Install required packages
4. Run the extraction script with desired parameters

### Frontend Setup

1. Navigate to the `frontend` directory
2. Install dependencies with `npm install`
3. Place the extracted JSON data file in the appropriate directory
4. Run the development server with `npm run dev`

## License

[License information]
