import os
import sys
import json
import argparse
import glob
import re
import base64
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the parser
parser = argparse.ArgumentParser(
    description="Extract MP data from pre-split PDF declarations"
)
parser.add_argument(
    "--print",
    action="store_true",
    help="Print results to console instead of saving to file",
)
parser.add_argument(
    "--limit", type=int, default=None, help="Limit the number of MPs to process"
)
# Add model selection arguments (mutually exclusive)
model_group = parser.add_mutually_exclusive_group()
model_group.add_argument(
    "--gemini", action="store_true", help="Use Google Gemini API (default)"
)
model_group.add_argument(
    "--openai", action="store_true", help="Use OpenAI API instead of Google Gemini"
)
args = parser.parse_args()

# Determine which API to use (default to Gemini if not specified)
use_openai = args.openai
use_gemini = (
    not use_openai
)  # Use Gemini by default unless OpenAI is specifically requested

# Load API keys based on the chosen API
if use_gemini:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY not found in .env file")
        print("Please add it to your .env file as: GOOGLE_API_KEY=your_api_key_here")
        sys.exit(1)

    # Configure Gemini API
    genai.configure(api_key=api_key)
    # Initialize the Gemini model
    model = genai.GenerativeModel("gemini-2.0-flash")

elif use_openai:
    # Check for OpenAI API key if we're using OpenAI
    try:
        import openai
    except ImportError:
        print("Error: OpenAI Python package not installed")
        print("Please install it with: pip install openai")
        sys.exit(1)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env file")
        print("Please add it to your .env file as: OPENAI_API_KEY=your_api_key_here")
        sys.exit(1)

    # Configure OpenAI client
    openai_client = openai.OpenAI(api_key=api_key)


# Define the common prompt to be used by both APIs
def get_extraction_prompt():
    return """
    Parse this Hungarian MP's declaration PDF and extract the following information in a structured JSON format.
    
    Please extract as much data as possible from the document, following this schema:
    
    {
        "nyilatkozattevo_nev": "string",
        "vagyonyi_nyilatkozat": {
            "ingatlanok": [
                {
                    "telepules": "string",
                    "terulet_m2": "number",
                    "muvelesi_ag": "string | null",
                    "szantofold": "boolean",
                    "jogi_jelleg": "családi ház | társasház | szövetkezeti ház | egyéb",
                    "szerzes_jogcime": "vásárlás | öröklés | ajándék | egyéb",
                    "tulajdoni_hanyad": "fraction | null",
                    "szerzes_datuma": "YYYY-MM-DD | YYYY-MM | YYYY | null",
                    "tipus": "lakóház | üdülő | gazdasági épület | egyéb",
                    "alapterulet_m2": "number | null",
                }
            ],
            "nagy_erteku_ingok": {
                "gepjarmuvek": [
                    {
                        "tipus": "személygépkocsi | tehergépjármű | motorkerékpár | csónak | repülő | pótkocsi | egyéb",
                        "marka": "string",
                        "modell": "string",
                        "gyartasi_ev": "YYYY | null",
                        "szerzes_jogcime": "vásárlás | öröklés | ajándék | lízing | egyéb",
                        "szerzes_datuma": "YYYY-MM-DD | YYYY-MM | YYYY | null",
                        "ertek_huf": "number | null"
                    }
                ],
                "vedett_mualkotasok_gyujtemenyek": [
                    {
                        "megnevezes": "string",
                        "tipus": "festmény | szobor | egyéb",
                        "darabszam": "number",
                        "szerzes_jogcime": "vásárlás | öröklés | ajándék | egyéb",
                        "szerzes_datuma": "YYYY-MM-DD | YYYY-MM | YYYY | null",
                        "ertek_huf": "number | null"
                    }
                ],
                "egyeb_ingok": [
                    {
                        "megnevezes": "string",
                        "szerzes_jogcime": "vásárlás | öröklés | ajándék | egyéb",
                        "szerzes_datuma": "YYYY-MM-DD | YYYY-MM | YYYY | null",
                        "ertek_huf": "number | null"
                    }
                ],
                "ertekpapir_vagy_egyeb_befektetes": [
                    {
                        "tipus": "részvény | kötvény | kincstárjegy | életbiztosítás | lakástakarék | egyéb",
                        "kibocsato": "string",
                        "nevertek": "number",
                        "penznem": "string"
                    }
                ],
                "takarekbetetben_elhelyezett_megtakaritas": {
                    "osszeg_huf": "number | null"
                },
                "keszpenz": {
                    "osszeg_huf": "number | null"
                },
                "hitelintezeti_szamlakoveteles": {
                    "hitelintezeti_szamlakoveteles_huf": "number | null",
                    "forintban_huf": "number | null",
                    "devizaban_forinterteken_huf": "number | null"
                },
                "mas_vagyontargyak": ["string"]
            },
            "tartozasok": {
                "koztartozas": "number | null",
                "hitelintezettel_szembeni_tartozasok": [
                    {
                        "hitelező": "string | null",
                        "osszeg_huf": "number",
                        "penznem": "string | null"
                    }
                ],
                "maganszemelyekkel_szembeni_tartozasok": [
                    {
                        "hitelező": "string | null",
                        "osszeg_huf": "number",
                        "penznem": "string | null"
                    }
                ]
            },
            "egyeb_kozlendok": ["string"]
        },
        "jovedelemnyilatkozat": {
            "elozo_3_ev_foglalkozasai": [
                {
                    "foglalkozas_megbizas_tisztseg": "string | null",
                    "szervezet": "string | null",
                    "jovedelem": {
                        "dijazas_nelkuli": "boolean",
                        "jovedelmi_kategoria_1": "boolean",
                        "jovedelmi_kategoria_2": "boolean",
                        "jovedelmi_kategoria_3": "boolean",
                        "jovedelmi_kategoria_4": "boolean",
                        "jovedelmi_kategoria_5": "boolean",
                        "jovedelem_huf": "number | null"
                    }
                }
            ],
            "aktualis_foglalkozasok": [
                {
                    "foglalkozas_megbizas_tisztseg": "string | null",
                    "szervezet": "string | null",
                    "jovedelem": {
                        "dijazas_nelkuli": "boolean",
                        "jovedelmi_kategoria_1": "boolean",
                        "jovedelmi_kategoria_2": "boolean",
                        "jovedelmi_kategoria_3": "boolean",
                        "jovedelmi_kategoria_4": "boolean",
                        "jovedelmi_kategoria_5": "boolean",
                        "jovedelem_huf": "number | null"
                    }
                }
            ],
            "alkalmi_jovedelem_2m_felett": [
                {
                    "tevekenyseg": "string | null",
                    "szervezet": "string | null",
                    "jovedelem": {
                        "dijazas_nelkuli": "boolean",
                        "jovedelmi_kategoria_1": "boolean",
                        "jovedelmi_kategoria_2": "boolean",
                        "jovedelmi_kategoria_3": "boolean",
                        "jovedelmi_kategoria_4": "boolean",
                        "jovedelmi_kategoria_5": "boolean",
                        "jovedelem_huf": "number | null"
                    }
                }
            ]
        },
        "gazdasagi_erdekeltsegi_nyilatkozat": {
            "tagsag_vagy_tisztseg_gazdalkodo_szervezetben": [
                {
                    "tagsag_tisztseg": "string | null",
                    "szervezet": "string | null",
                    "jovedelem": {
                        "dijazas_nelkuli": "boolean",
                        "jovedelmi_kategoria_1": "boolean",
                        "jovedelmi_kategoria_2": "boolean",
                        "jovedelmi_kategoria_3": "boolean",
                        "jovedelmi_kategoria_4": "boolean",
                        "jovedelmi_kategoria_5": "boolean",
                        "jovedelem_huf": "number | null"
                    }
                }
            ],
            "befolyassal_biro_gazdasagi_erdekeltsegek": [
                {
                    "tagsag_tisztseg": "string | null",
                    "gazdasagi_tarsasag_neve": "string | null",
                    "tulajdoni_hanyad": "fraction | null",
                    "jovedelem": {
                        "dijazas_nelkuli": "boolean",
                        "jovedelmi_kategoria_1": "boolean",
                        "jovedelmi_kategoria_2": "boolean",
                        "jovedelmi_kategoria_3": "boolean",
                        "jovedelmi_kategoria_4": "boolean",
                        "jovedelmi_kategoria_5": "boolean",
                        "jovedelem_huf": "number | null"
                    }
                }
            ]
        },
        "data_not_extracted_explanation": "string | null"
    }


    The marke / make of the car should be the full name of the brand, not just an abbreviation, e.g. VW should be Volkswagen.
    Any currency balance should be extracted as a number with no decimals.
    Fraction should be extracted as a decimal number up to 2 decimal places.
    Currencies should be extracted as ISO 4217 currency codes, e.g. EUR for Euro, HUF for Hungarian Forint.
    Any form of Orszaggyulesi Kepviselo (national parliament member) should be extracted as "Országgyűlési képviselő".
    When finances / loans of co-debtors are mentioned, include them as if they were part of the declarant's own finances.
    When no currency is mentioned, assume HUF.
    When possible, turn all caps place and person names to standard capitalization, e.g. "VESZPRÉM" -> "Veszprém".

    In the Jövedelemnyilatkozat and Gazdasági Érdekeltségi Nyilatkozat sections the following rules apply:
    - Even if the foglalkozas, megbizas, tisztseg is on multiple lines, as long as it is in the same row, extract it as a single value. Use common sense.
    - For income / wealth, if an exact income amount (NOT a bracket) is given, it should be extracted to jovedelem_huf, otherwise it should be null.
    - You must extract the correct jovedelmi_kategoria values based on which section is ticket with an X or an x (or something similar).
    
    Include a data_not_extracted_explanation field for any comments or ideas about data that:  
    1. Doesn't fit well in the schema  
    2. Could have been extracted but there was no option for it  
    3. Was ambiguous or unclear in the document
    
    Return ONLY the JSON with no additional text or formatting. Ensure all extracted data is in Hungarian as it appears in the document.
    """


# Extract data using Google's Gemini API
def extract_mp_data_with_gemini(pdf_path):
    # Upload the PDF file directly to Gemini
    file = genai.upload_file(pdf_path)
    prompt = get_extraction_prompt()

    # Get response from Gemini by sending both the file and prompt
    try:
        generation_config = {
            "max_output_tokens": 20000,  # Set maximum output tokens to 10,000
        }
        response = model.generate_content(
            [file, prompt], generation_config=generation_config
        )
        return parse_llm_response(response.text)
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {
            "declarant": {"name": "API Error"},
            "data_not_extracted_explanation": f"Error during API call: {str(e)}",
        }


# Extract data using OpenAI's API
def extract_mp_data_with_openai(pdf_path):
    # Read the PDF file as bytes for OpenAI
    with open(pdf_path, "rb") as file:
        pdf_bytes = file.read()
        # Encode the PDF as base64 for OpenAI
        base64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")

    prompt = get_extraction_prompt()

    try:
        # Create a message with the PDF attachment
        response = openai_client.chat.completions.create(
            model="o1-mini",  # Using Vision model to process PDF
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:application/pdf;base64,{base64_pdf}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=4000,
        )

        # Extract the response text
        result_text = response.choices[0].message.content
        return parse_llm_response(result_text)
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return {
            "declarant": {"name": "API Error"},
            "data_not_extracted_explanation": f"Error during API call: {str(e)}",
        }


# Helper function to parse and clean up LLM responses
def parse_llm_response(response_text):
    try:
        # First try to parse the whole response as JSON
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError as e:
        # If there's a JSON parsing error, try to clean up the response text

        # Try multiple common patterns for JSON extraction
        # 1. Try to find JSON content between triple backticks (```json ... ```)
        json_match = re.search(r"```(?:json)?\n(.+?)\n```", response_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1).strip())
                return data
            except json.JSONDecodeError:
                pass

        # 2. Try to find JSON content with curly braces
        json_match = re.search(r"(\{.*\})", response_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1).strip())
                return data
            except json.JSONDecodeError:
                pass

        # 3. Try to extract the name at minimum
        name_match = re.search(r"\"name\":\s*\"([^\"]+)\"", response_text)
        if name_match:
            name = name_match.group(1)
            return {
                "declarant": {"name": name},
                "data_not_extracted_explanation": "Extracted name only; JSON parsing failed.",
            }

        print(f"Failed to parse response as JSON: {response_text}")

        # If all fails, return a default error response
        return {
            "declarant": {"name": "Error parsing response"},
            "data_not_extracted_explanation": f"Failed to parse response as JSON. Response starts with: {response_text[:200]}...",
        }


def main():
    # Find all MP PDFs in the temp directory, sorted by number
    # The sort key extracts the MP number from filenames with 3-digit padding (e.g., mp_001.pdf)
    mp_pdfs = sorted(
        glob.glob("./temp/mp_*.pdf"), key=lambda x: int(x.split("_")[1].split(".")[0])
    )

    if not mp_pdfs:
        print("Error: No MP PDFs found in ./temp/ directory")
        print("Please run split.py first to split the PDF into individual MP files")
        sys.exit(1)

    # Create jsons directory if it doesn't exist
    os.makedirs("./jsons", exist_ok=True)

    # Check which MPs have already been processed by examining the jsons folder
    existing_jsons = glob.glob("./jsons/mp_*.json")
    processed_mp_numbers = set()

    if existing_jsons:
        for json_path in existing_jsons:
            mp_num = int(json_path.split("_")[1].split(".")[0])
            processed_mp_numbers.add(mp_num)

        latest_processed = max(processed_mp_numbers)
        print(
            f"Found {len(processed_mp_numbers)} already processed MPs. Latest is mp_{latest_processed:03d}.json"
        )

    # Filter PDFs to only include those that haven't been processed yet
    unprocessed_mp_pdfs = []
    for pdf_path in mp_pdfs:
        mp_num = int(pdf_path.split("_")[1].split(".")[0])
        if mp_num not in processed_mp_numbers:
            unprocessed_mp_pdfs.append(pdf_path)

    if not unprocessed_mp_pdfs:
        print("All MPs have already been processed! Nothing to do.")
        print("If you want to reprocess, delete files from the ./jsons/ directory.")
        sys.exit(0)

    print(
        f"Found {len(unprocessed_mp_pdfs)} unprocessed MPs out of {len(mp_pdfs)} total"
    )

    # Apply limit if specified (otherwise process all unprocessed MPs)
    if args.limit is not None:
        unprocessed_mp_pdfs = unprocessed_mp_pdfs[: args.limit]
        print(f"Limiting to {args.limit} MPs as requested")

    # Choose the appropriate extraction function based on API selection
    if use_openai:
        print(
            f"Processing {len(unprocessed_mp_pdfs)} MP PDFs with detailed extraction using OpenAI"
        )
        extract_function = extract_mp_data_with_openai
    else:
        print(
            f"Processing {len(unprocessed_mp_pdfs)} MP PDFs with detailed extraction using Gemini"
        )
        extract_function = extract_mp_data_with_gemini

    # Process the PDFs and extract structured data
    all_mp_data = []
    for i, pdf_path in enumerate(unprocessed_mp_pdfs):
        # Get the MP number from the PDF filename
        mp_num = int(pdf_path.split("_")[1].split(".")[0])
        json_path = f"./jsons/mp_{mp_num:03d}.json"

        # Extract structured MP data
        print(f"⌛ Extracting data from MP {mp_num} PDF ({pdf_path})...")
        data = extract_function(pdf_path)

        # Extract and print name if available
        name = None
        # Check original schema
        if data and isinstance(data, dict):
            if "declarant" in data and "name" in data["declarant"]:
                name = data["declarant"]["name"]
            # Check new schema
            elif "nyilatkozattevo_nev" in data:
                name = data["nyilatkozattevo_nev"]

        if name:
            print(f"✅ Extraction successful: {name}")
        else:
            print("❌ Could not extract name from the data")

        # Save individual MP data to a JSON file
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved MP data to {json_path}")

        # Add to our aggregated results list
        all_mp_data.append(data)

    # Save the aggregated results to mp_data.json as well
    with open("mp_data.json", "w", encoding="utf-8") as f:
        json.dump(all_mp_data, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(all_mp_data)} MP declarations to mp_data.json")

    # Print results if requested
    if args.print:
        print(json.dumps(all_mp_data, indent=2, ensure_ascii=False))

    print(
        f"✨ Successfully processed {len(unprocessed_mp_pdfs)} MPs. Run again to continue with more MPs if available."
    )


if __name__ == "__main__":
    main()
