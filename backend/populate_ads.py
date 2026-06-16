import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "motohub.settings")
django.setup()

from products.models import Ad

ads_data = [
    {
        "banner_type": "service",
        "title": "AUTO BODY PAINT\nREPAIR SERVICES",
        "subtitle": "HIGH QUALITY SERVICE",
        "image": "assets/images/auto-body-paint.png",
        "button_text": "LEARN MORE",
        "button_link": "coming-soon.html",
        "is_active": True,
    },
    {
        "banner_type": "promo_1",
        "title": "MICHELIN TIRE",
        "subtitle": "PURCHASE 4 TIRES",
        "image": "assets/images/tire.jpg",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "is_active": True,
    },
    {
        "banner_type": "promo_2",
        "title": "BETTER BRAKES",
        "subtitle": "NEW ARRIVALS 2023",
        "image": "assets/images/brakes-full.jpg",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "is_active": True,
    },
]

def run():
    for data in ads_data:
        Ad.objects.update_or_create(
            banner_type=data["banner_type"],
            defaults={k: v for k, v in data.items() if k != "banner_type"}
        )
    print("Ads populated successfully!")
    for ad in Ad.objects.all():
        print(f"  [{ad.id}] {ad.banner_type}: {ad.title}")

if __name__ == '__main__':
    run()
