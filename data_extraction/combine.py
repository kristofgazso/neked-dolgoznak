import os
import json
import glob
from pathlib import Path

def combine_json_files():
    # Get all JSON files in the jsons directory
    json_pattern = os.path.join('jsons', '*.json')
    json_files = glob.glob(json_pattern)
    
    # Filter out the combined.json if it already exists
    json_files = [f for f in json_files if not f.endswith('combined.json')]
    
    if not json_files:
        print("No JSON files found to combine.")
        return
    
    combined_data = []
    
    # Read each JSON file and add its content to our combined data
    for file_path in sorted(json_files):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                # Add file name without extension as the source
                mp_id = Path(file_path).stem
                data['source_file'] = mp_id
                combined_data.append(data)
                print(f"Processed {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    # Create the output directory if it doesn't exist
    output_dir = 'jsons'
    os.makedirs(output_dir, exist_ok=True)
    
    # Write the combined data to a single JSON file
    output_path = os.path.join(output_dir, 'combined.json')
    with open(output_path, 'w', encoding='utf-8') as outfile:
        json.dump(combined_data, outfile, ensure_ascii=False, indent=2)
    
    print(f"\nSuccessfully combined {len(combined_data)} JSON files into {output_path}")

if __name__ == "__main__":
    combine_json_files()
