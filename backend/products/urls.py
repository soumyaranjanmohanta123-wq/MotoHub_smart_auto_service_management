from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    AdminProductListView,
    ProductCreateView,
    ProductUploadView,
    WishlistView,
    WishlistDeleteView,
    BannerListView,
    BannerDetailView,
    AdListView,
    AdDetailView,
)

urlpatterns = [
    path('',                    ProductListView.as_view(),        name='product-list'),
    path('<int:pk>/',           ProductDetailView.as_view(),      name='product-detail'),
    path('categories/',         CategoryListView.as_view(),       name='category-list'),
    path('banners/',            BannerListView.as_view(),         name='banner-list'),
    path('banners/<int:pk>/',   BannerDetailView.as_view(),       name='banner-detail'),
    path('ads/',                AdListView.as_view(),             name='ad-list'),
    path('ads/<int:pk>/',       AdDetailView.as_view(),           name='ad-detail'),
    path('admin/',              AdminProductListView.as_view(),   name='admin-product-list'),

    # Multipart / form-data endpoints (used by Add Product modal)
    path('create/',             ProductCreateView.as_view(),      name='product-create'),
    path('<int:pk>/upload/',    ProductUploadView.as_view(),      name='product-upload'),

    # Wishlist
    path('wishlist/',           WishlistView.as_view(),           name='wishlist-list'),
    path('wishlist/<int:pk>/',  WishlistDeleteView.as_view(),     name='wishlist-delete'),
]
