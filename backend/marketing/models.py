from django.db import models

class MarketingBanner(models.Model):
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='marketing_banners/', blank=True, null=True)
    content = models.TextField(blank=True, null=True, verbose_name="text/content")
    link = models.URLField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketing_banner'

    def __str__(self):
        return self.title
