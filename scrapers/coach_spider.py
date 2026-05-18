"""
Scraper pour récupérer des coaches sportifs depuis Pages Jaunes
Usage: cd /home/nadir/projects/agentcrm && source venv/bin/activate
       scrapy runspider scrapers/coach_spider.py -o coaches.csv -t csv
"""

import scrapy
import re
import json

class CoachSpider(scrapy.Spider):
    name = 'coaches'
    allowed_domains = ['pagesjaunes.fr']
    
    # Liste des villes à scraper
    cities = [
        'paris', 'marseille', 'lyon', 'toulouse', 'nice', 
        'nantes', 'montpellier', 'strasbourg', 'bordeaux', 'lille'
    ]
    
    def start_requests(self):
        base_url = 'https://www.pagesjaunes.fr/recherche'
        
        for city in self.cities:
            url = f'{base_url}?qu=coach+sportif&ll={city}'
            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta={'city': city, 'page': 1}
            )
    
    def parse_listing(self, response):
        city = response.meta['city']
        page = response.meta['page']
        
        # Sélection des annonces
        listings = response.css('.bi-bloc-listage .bi-bloc')
        
        for listing in listings:
            # Nom
            name = listing.css('.bi-bloc-title::text').get()
            if name:
                name = name.strip()
            
            # Métier/specialité
            job = listing.css('.bi-bloc-sub-title::text').get()
            
            # Adresse
            address = listing.css('.bi-bloc-address::text').get()
            
            # Téléphone
            phone = listing.css('.bi-bloc-phone::text').get()
            if not phone:
                # Essayer autre sélecteur
                phone = listing.css('.tel::text').get()
            
            # Site web
            website = listing.css('a.bi-bloc-website::attr(href)').get()
            
            # Email - rarement visible directement
            email = None
            
            # aller sur la page de détail pour plus d'info
            detail_url = listing.css('a.bi-bloc-title::attr(href)').get()
            
            if detail_url:
                yield response.follow(
                    detail_url,
                    self.parse_detail,
                    meta={
                        'name': name,
                        'job': job,
                        'address': address,
                        'phone': phone,
                        'website': website,
                        'city': city
                    }
                )
            else:
                yield {
                    'nom': name,
                    'metier': job,
                    'adresse': address,
                    'telephone': self.clean_phone(phone),
                    'email': email,
                    'site': website,
                    'ville': city,
                    'source': 'pagesjaunes.fr'
                }
        
        # Pagination - limiter à 5 pages par ville
        if page < 5:
            next_page = response.css('a.next::attr(href)').get()
            if next_page:
                yield response.follow(
                    next_page,
                    self.parse_listing,
                    meta={'city': city, 'page': page + 1}
                )
    
    def parse_detail(self, response):
        name = response.meta['name']
        job = response.meta['job']
        address = response.meta['address']
        phone = response.meta['phone']
        website = response.meta['website']
        city = response.meta['city']
        
        # Essayer de trouver l'email sur la page de détail
        email = None
        page_text = response.text
        
        # Regex pour trouver les emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        matches = re.findall(email_pattern, page_text)
        
        # Filtrer les emails génériques
        for match in matches:
            if not any(x in match.lower() for x in ['pagesjaunes', 'example', 'test']):
                email = match
                break
        
        # Site web - peut être plus complet sur la page de détail
        if not website:
            website = response.css('a.website::attr(href)').get()
        
        yield {
            'nom': name,
            'metier': job,
            'adresse': address,
            'telephone': self.clean_phone(phone),
            'email': email,
            'site': website,
            'ville': city,
            'source': 'pagesjaunes.fr'
        }
    
    def clean_phone(self, phone):
        if not phone:
            return ''
        # Garder que les chiffres
        return re.sub(r'[^\d\+]', '', phone)


class CoachGoogleSpider(scrapy.Spider):
    """
    Spider pour Google Maps (version simplifiée)
    Note: Google bloque souvent le scraping - utiliser avec modération
    """
    name = 'coaches_google'
    
    def __init__(self, city='Paris', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.city = city
        self.start_urls = [
            f'https://www.google.com/search?q=coach+sportif+{city}+France'
        ]
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 3,
    }
    
    def parse(self, response):
        # Chercher les résultats
        results = response.css('.g')
        
        for result in results:
            # Nom
            name = result.css('h3::text').get()
            
            # Description (souvent contient l'adresse/phone)
            desc = result.css('.VwiC3b::text, .st::text').get()
            
            # Extraire téléphone
            phone = None
            if desc:
                phone_match = re.search(r'(\+33|0)[1-9][\d]{8,9}', desc)
                if phone_match:
                    phone = phone_match.group()
            
            # Extraire email
            email = None
            if desc:
                email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', desc)
                if email_match:
                    email = email_match.group()
            
            if name:
                yield {
                    'nom': name.strip(),
                    'metier': 'Coach Sportif',
                    'adresse': desc[:100] if desc else '',
                    'telephone': phone,
                    'email': email,
                    'site': '',
                    'ville': self.city,
                    'source': 'google.com'
                }