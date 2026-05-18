"""
Script pour récupérer des coaches sportifs via Google Maps Places API
Méthode légale et conforme RGPD

Prérequis:
1. Créer un projet Google Cloud
2. Activer Google Places API
3. Générer une clé API

Usage: python google_maps_coaches.py --city "Marseille" --radius 50000 --output coaches.csv
"""

import requests
import csv
import time
import argparse

# Configuration - À REMPLACER par ta clé API
API_KEY = 'TON_API_KEY_GOOGLE'

def search_places(query, location=None, radius=50000):
    """Recherche des lieux via Google Places API"""
    url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
    
    params = {
        'query': query,
        'key': API_KEY,
    }
    
    if location:
        params['location'] = location
        params['radius'] = radius
    
    results = []
    
    while True:
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get('status') == 'OK':
            results.extend(data.get('results', []))
            
            # Pagination
            next_page = data.get('next_page_token')
            if next_page and len(results) < 300:
                time.sleep(2)  # Attendre un peu pour le token
                params['pagetoken'] = next_page
            else:
                break
        else:
            print(f"Erreur: {data.get('status')}")
            break
    
    return results

def get_place_details(place_id):
    """Récupère les détails d'un lieu (dont email si disponible)"""
    url = f'https://maps.googleapis.com/maps/api/place/details/json'
    
    params = {
        'place_id': place_id,
        'fields': 'name,formatted_address,formatted_phone_number,website,user_ratings_total',
        'key': API_KEY
    }
    
    response = requests.get(url, params=params)
    return response.json().get('result', {})

def main():
    parser = argparse.ArgumentParser(description='Recherche coaches sportifs')
    parser.add_argument('--city', default='Marseille', help='Ville de recherche')
    parser.add_argument('--radius', type=int, default=50000, help='Rayon en mètres')
    parser.add_argument('--output', default='coaches.csv', help='Fichier de sortie')
    parser.add_argument('--limit', type=int, default=300, help='Nombre max de résultats')
    
    args = parser.parse_args()
    
    print(f"🔍 Recherche coaches sportifs à {args.city}...")
    
    # Recherche
    query = f"coach sportif {args.city}"
    places = search_places(query, radius=args.radius)
    
    print(f"✅ {len(places)} lieux trouvés")
    
    # Limiter
    places = places[:args.limit]
    
    # Exporter
    with open(args.output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['nom', 'adresse', 'telephone', 'site_web', 'note', 'nb_avis'])
        
        for place in places:
            # Récupérer les détails
            details = get_place_details(place['place_id'])
            
            writer.writerow([
                place.get('name', ''),
                place.get('formatted_address', ''),
                details.get('formatted_phone_number', ''),
                details.get('website', ''),
                place.get('rating', ''),
                details.get('user_ratings_total', ''),
            ])
            
            time.sleep(0.1)  # Rate limiting
    
    print(f"💾 Exporté vers {args.output}")

if __name__ == '__main__':
    main()