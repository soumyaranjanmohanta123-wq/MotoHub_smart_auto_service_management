from django.shortcuts import get_object_or_404, redirect
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import MarketingBanner

@csrf_exempt
def update_banner(request, pk):
    if request.method == 'POST':
        banner = get_object_or_404(MarketingBanner, pk=pk)
        
        # Update fields from request.POST
        if 'title' in request.POST:
            banner.title = request.POST.get('title')
        if 'content' in request.POST:
            banner.content = request.POST.get('content')
        if 'link' in request.POST:
            banner.link = request.POST.get('link')
        if 'is_active' in request.POST:
            banner.is_active = request.POST.get('is_active') in ['true', 'True', '1', 'on']
            
        # File upload handling
        if 'image' in request.FILES:
            banner.image = request.FILES['image']
            
        banner.save()
        
        # Redirect back to the HTTP referer (Admin Dashboard)
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        return JsonResponse({"status": "success", "message": "Banner updated."})
    return JsonResponse({"error": "Method not allowed"}, status=405)
