"""
Scraper pour récupérer des coaches sportifs
Usage: scrapy runspider coach_scraper.py -o coaches.csv

À utiliser avec tes autorisations légales - je décline toute responsabilité
"""

import scrapy
import json
import re

class CoachSpider(scrapy.Spider):
    name = 'coaches'
    
    # Sources possibles - à adapter selon tes cibles
    start_urls = [
        # Exemples - remplacer par tes sources autorisées
        'https://www.google.com/search?q=coach+sportif+Paris+email',
        # 'https://www.pagesjaunes.fr/recherche?qu=coach+sportif&ll=France',
    ]
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ROBOTSTXT_OBEY': False,  # À ajuster selon tes autorisations
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 2,
    }
    
    def parse(self, response):
        # Exemple de parsing - adapter selon la structure du site
        for coach in response.css('.result, .listing, .card'):
            yield {
                'nom': coach.css('h2::text, .name::text').get(),
                'telephone': coach.css('.phone::text, .tel::text').get(),
                'email': self.extract_email(coach),
                'adresse': coach.css('.address::text').get(),
                'site': coach.css('.website a::attr(href)').get(),
                'source': response.url,
            }
        
        # Pagination
        next_page = response.css('a.next::attr(href), a.pagination-next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)
    
    def extract_email(self, element):
        """Extrait l'email depuis le texte ou attributs"""
        text = element.get()
        if not text:
            return None
        
        # Regex pour trouver les emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, str(text))
        return match.group(0) if match else None


class GoogleMapsCoachSpider(scrapy.Spider):
    """
    Spider pour Google Maps (nécessite API ou scraping autorisé)
    """
    name = 'coaches_maps'
    
    def __init__(self, city='Paris', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.city = city
        self.start_urls = [
            f'https://www.google.com/maps/search/coach+sportif+{city}',
        ]
    
    def parse(self, response):
        # Google Maps utilise du JavaScript - nécessite Selenium ou Splash
        # Ceci est un template
        pass