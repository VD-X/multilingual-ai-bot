import csv
import os
from typing import List, Dict

class TourismDataLoader:
    def __init__(self):
        self.places_db: List[Dict] = []
        self._load_data()

    def _load_data(self):
        # Determine the absolute path to the datasets
        # Assuming we are running from backend/ directory and dataset is in ../dataset
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        dataset_dir = os.path.join(base_dir, "dataset")
        
        file1_path = os.path.join(dataset_dir, "Top Indian Places to Visit.csv")
        file2_path = os.path.join(dataset_dir, "places.csv")

        # Load File 1: Top Indian Places
        try:
            with open(file1_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.places_db.append({
                        "name": row.get('Name', '').strip(),
                        "city": row.get('City', '').strip(),
                        "state": row.get('State', '').strip(),
                        "category": row.get('Significance', '').strip(),
                        "type": row.get('Type', '').strip(),
                        "rating": row.get('Google review rating', '').strip(),
                        "price": row.get('Entrance Fee in INR', '0').strip(),
                        "time_needed": row.get('time needed to visit in hrs', '').strip(),
                        "best_time": row.get('Best Time to visit', '').strip(),
                        "closed_on": row.get('Weekly Off', 'None').strip()
                    })
        except Exception as e:
            print(f"Failed to load {file1_path}: {e}")

        # If we need more data, we could load file2_path, but file1 usually has enough rich data for Hyderabad.
        
    def get_context_for_llm(self, limit: int = 400) -> str:
        """Returns a string representation of the real places database to inject into the LLM prompt"""
        if not self.places_db:
            return "No real dataset context available."
            
        context_str = "Verified Indian Tourism Data:\n"
        for idx, p in enumerate(self.places_db[:limit]):
            price_str = f"Rs. {p['price']}" if p['price'] and p['price'] != '0' else "Free"
            closed_str = f"(Closed on {p['closed_on']})" if p['closed_on'] and p['closed_on'].lower() != 'none' else ""
            
            context_str += f"- {p['name']} ({p['city']}, {p['state']}) | Type: {p['type']}/{p['category']} | Rating: {p['rating']}/5 | Fee: {price_str} | Best Time: {p['best_time']} | Time Needed: {p['time_needed']} hrs {closed_str}\n"
            
        return context_str

# Singleton instance
data_loader = TourismDataLoader()
