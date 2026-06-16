import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "motohub.settings")
django.setup()

from products.models import Banner

banners_data = [
    {
        "title": "PISTONS CONNECTING RODS<br>AND CRANKSHAFT",
        "subtitle": "HIGH PERFORMANCE",
        "image": "assets/images/hero-bg.jpg",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "order": 1,
    },
    {
        "title": "CARBON-CERAMIC BRAKE KITS<br>FOR TRACK-READY PERFORMANCE",
        "subtitle": "MAXIMUM STOPPING POWER",
        "image": "assets/images/hero_brakes.png",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "order": 2,
    },
    {
        "title": "ADVANCED COILOVER SUSPENSION<br>ADJUSTABLE FOR ANY TERRAIN",
        "subtitle": "SUPERIOR HANDLING",
        "image": "assets/images/hero_suspension.png",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "order": 3,
    },
    {
        "title": "PERFORMANCE TURBOCHARGERS<br>IMMEDIATE RESPONSE AND POWER",
        "subtitle": "BOOST YOUR OUTPUT",
        "image": "assets/images/hero_turbo.png",
        "button_text": "SHOP NOW",
        "button_link": "coming-soon.html",
        "order": 4,
    }
]

def run():
    Banner.objects.all().delete()
    for b in banners_data:
        Banner.objects.create(**b)
    print("Banners populated successfully!")

if __name__ == '__main__':
    run()
