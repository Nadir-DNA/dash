"""
Scraper Pages Jaunes pour coaches sportifs
Usage: cd /home/nadir/projects/agentcrm && source venv/bin/activate
       scrapy runspider scrapers/coach_pagesjaunes.py -o coaches.csv
"""

import scrapy
import re

class PagesJaunesSpider(scrapy.Spider):
    name = 'coaches_pj'
    allowed_domains = ['pagesjaunes.fr']
    
    # Villes à scraper
    cities = [
        'paris', 'marseille', 'lyon', 'toulouse', 'nice',
        'nantes', 'montpellier', 'strasbourg', 'bordeaux', 'lille',
        'rennes', 'grenoble', ' Toulon', 'angers', 'brest'
    ]
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 2,
        'DOWNLOAD_DELAY': 2,
    }
    
    def start_requests(self):
        base_url = 'https://www.pagesjaunes.fr/recherche'
        
        for city in self.cities:
            url = f'{base_url}?qu=coach+sportif&ll={city}'
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                meta={'city': city, 'page': 1}
            )
    
    def parse(self, response):
        city = response.meta['city']
        
        # Debug: voir la structure de la page
        self.logger.info(f'Traitement de {city} - Status: {response.status}')
        
        # Les résultats sont dans des blocs
        listings = response.css('.bi-bloc-listage .bi-bloc, .bloc-liste .bloc, .list-ads .ad-container')
        
        self.logger.info(f'Trouvé {len(listings)} annonces pour {city}')
        
        for listing in listings:
            # Nom de l'entreprise/coach
            name = listing.css('.bi-bloc-title::text, h3.title::text, .ad-title::text').get()
            if not name:
                name = listing.css('a::text').get()
            
            # Métier
            job = listing.css('.bi-bloc-sub-title::text, .ad-subtitle::text').get()
            
            # Adresse
            address = listing.css('.bi-bloc-address::text, .ad-address::text').get()
            
            # Téléphone
            phone = listing.css('.bi-bloc-phone::text, .ad-phone::text, .phone-number::text').get()
            
            if name:
                yield {
                    'nom': name.strip() if name else '',
                    'metier': job.strip() if job else 'Coach Sportif',
                    'adresse': address.strip() if address else '',
                    'telephone': self.clean_phone(phone) if phone else '',
                    'email': '',
                    'site': '',
                    'ville': city,
                    'source': 'pagesjaunes.fr'
                }
        
        # Pagination (max 3 pages par ville)
        if response.meta['page'] < 3:
            next_page = response.css('a.next::attr(href), a.pagination-next::attr(href)').get()
            if next_page:
                yield response.follow(
                    next_page,
                    self.parse,
                    meta={'city': city, 'page': response.meta['page'] + 1}
                )
    
    def clean_phone(self, phone):
        if not phone:
            return ''
        return re.sub(r'[^\d\+]', '', phone.strip())


class CoachCompletSpider(scrapy.Spider):
    """
    Spider plus complet - utilise plusieurs sources
    """
    name = 'coaches_complet'
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ROBOTSTXT_OBEY': False,
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 3,
    }
    
    def start_requests(self):
        # Pages Jaunes
        yield scrapy.Request(
            'https://www.pagesjaunes.fr/recherche?qu=coach+sportif&ll=France',
            callback=self.parse_pagesjaunes
        )
    
    def parse_pagesjaunes(self, response):
        listings = response.css('.bi-bloc-listage .bi-bloc')
        
        for listing in listings:
            name = listing.css('.bi-bloc-title::text').get()
            job = listing.css('.bi-bloc-sub-title::text').get()
            address = listing.css('.bi-bloc-address::text').get()
            phone = listing.css('.bi-bloc-phone::text').get()
            
            if name:
                yield {
                    'nom': name.strip(),
                    'metier': job.strip() if job else 'Coach Sportif',
                    'adresse': address.strip() if address else '',
                    'telephone': self.clean_phone(phone) if phone else '',
                    'email': '',
                    'site': '',
                    'ville': '',
                    'source': 'pagesjaunes.fr'
                }
    
    def clean_phone(self, phone):
        if not phone:
            return ''
        return re.sub(r'[^\d\+]', '', phone.strip())