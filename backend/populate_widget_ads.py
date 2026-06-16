import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "motohub.settings")
django.setup()

from products.models import Ad

widgets_data = [
    {
        "banner_type": "widget_product",
        "title": "High Performance Brake Pads",
        "subtitle": "Top-rated brake pads for superior stopping power",
        "image": "assets/images/brake-pads.png",
        "button_text": "VIEW PRODUCT",
        "button_link": "coming-soon.html",
        "price": 89.00,
        "old_price": 120.00,
        "rating": 4.5,
        "is_active": True,
    },
    {
        "banner_type": "widget_vertical",
        "title": "RELIABLE ENGINES",
        "subtitle": "SALE UP TO 30% OFF",
        "image": "",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "is_active": True,
    },
]

def run():
    for data in widgets_data:
        Ad.objects.update_or_create(
            banner_type=data["banner_type"],
            defaults={k: v for k, v in data.items() if k != "banner_type"}
        )
    print("Widget ads populated successfully!")
    for ad in Ad.objects.all():
        print(f"  [{ad.id}] {ad.banner_type}: {ad.title}")

if __name__ == '__main__':
    run()
