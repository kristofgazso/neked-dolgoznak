import os
import sys
import argparse
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

def extract_mp_page_numbers(pdf_path):
    # Load the PDF file
    pdf_reader = PdfReader(pdf_path)
    
    # Define the phrase indicating the start of a new MP's declaration
    search_text = "Az Országgyűlésről szóló 2012. évi XXXVI. törvény 1. melléklete alapján"
    
    # Find the page numbers where a new MP's declaration starts
    new_mp_pages = []
    for i, page in enumerate(pdf_reader.pages):
        if search_text in page.extract_text():
            new_mp_pages.append(i)  # 0-based page numbers for processing
    
    print(f"Found {len(new_mp_pages)} MP declarations starting on pages: {[p+1 for p in new_mp_pages]}")
    return new_mp_pages

def create_sub_pdf(pdf_path, start_page, end_page, output_path):
    pdf_writer = PdfWriter()
    pdf_reader = PdfReader(pdf_path)
    
    # Add all pages in the range
    for page_num in range(start_page, end_page):
        if page_num < len(pdf_reader.pages):
            pdf_writer.add_page(pdf_reader.pages[page_num])
    
    # Save the output PDF
    with open(output_path, "wb") as out_file:
        pdf_writer.write(out_file)

def split_pdf(pdf_path, limit=None):
    # Create temp directory if it doesn't exist
    os.makedirs("./temp", exist_ok=True)
    
    # Get the page numbers for each MP
    mp_pages = extract_mp_page_numbers(pdf_path)
    
    # Limit the number of MPs to process if specified
    if limit:
        mp_pages = mp_pages[:limit]
    
    # Create a list to store the output paths
    output_paths = []
    
    # Process MPs
    for i, start_page in enumerate(mp_pages):
        # Determine end page (either next MP or end of PDF)
        end_page = mp_pages[i+1] if i+1 < len(mp_pages) else None
        
        # Create output path for sub-PDF with 3-digit padding
        sub_pdf_path = f"./temp/mp_{i+1:03d}.pdf"
        output_paths.append(sub_pdf_path)
        
        print(f"Processing MP {i+1} (pages {start_page+1} to {end_page if end_page is None else end_page})")
        
        # Create sub-PDF for this MP
        create_sub_pdf(
            pdf_path, 
            start_page, 
            end_page if end_page is not None else len(PdfReader(pdf_path).pages), 
            sub_pdf_path
        )
    
    return output_paths

def main():
    # Configure the parser
    parser = argparse.ArgumentParser(description='Split MP declarations into separate PDFs')
    parser.add_argument('--limit', type=int, help='Limit the number of MPs to process')
    args = parser.parse_args()
    
    # Split the PDF
    pdf_path = "./pdfs/Kepviselok_20250228.pdf"
    output_paths = split_pdf(pdf_path, args.limit)
    print(f"Created {len(output_paths)} individual PDF files in ./temp/")

if __name__ == "__main__":
    main()
