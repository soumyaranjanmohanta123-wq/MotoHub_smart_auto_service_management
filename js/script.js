// MOTOHUB Interactive Scripts

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.style.display = mainNav.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Hero Slider
    const heroSlider = document.querySelector('.hero-slider');
    const heroDotsContainer = document.querySelector('.hero-dots');

    if (heroSlider && window.API) {
        // Fetch banners dynamically
        API.req('/products/banners/')
            .then(res => {
                const banners = res.results || res;
                if (!banners || banners.length === 0) {
                    initSliderLogic();
                    return;
                }

                // Clear existing static slides
                heroSlider.innerHTML = '';
                if (heroDotsContainer) heroDotsContainer.innerHTML = '';

                banners.forEach((banner, index) => {
                    // Slide
                    const slide = document.createElement('div');
                    slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                    slide.innerHTML = `
                        <img src="${banner.display_image || banner.image}" alt="${banner.title.replace(/<[^>]*>?/gm, '')}" class="hero-banner-img">
                        <div class="hero-banner-content">
                            <p class="hero-subtitle">${banner.subtitle || ''}</p>
                            <h1 class="hero-title">${banner.title}</h1>
                            <a href="${banner.button_link || 'coming-soon.html'}" class="hero-btn">${banner.button_text || 'SHOP NOW'}</a>
                        </div>
                    `;
                    heroSlider.appendChild(slide);

                    // Dot
                    if (heroDotsContainer) {
                        const dot = document.createElement('span');
                        dot.className = `dot ${index === 0 ? 'active' : ''}`;
                        heroDotsContainer.appendChild(dot);
                    }
                });

                initSliderLogic();
            })
            .catch(err => {
                console.error("Failed to load banners:", err);
                initSliderLogic(); // fallback to static if API fails
            });
    } else {
        initSliderLogic(); // fallback
    }

    function initSliderLogic() {
        const heroSlides = document.querySelectorAll('.hero-slide');
        const heroDots = document.querySelectorAll('.hero-dots .dot');

        if (heroSlider && heroSlides.length > 0) {
            let currentSlide = 0;
            const slideCount = heroSlides.length;

            function goToSlide(index) {
                heroSlides[currentSlide].classList.remove('active');
                if(heroDots.length > currentSlide) heroDots[currentSlide].classList.remove('active');

                currentSlide = index;

                heroSlides[currentSlide].classList.add('active');
                if(heroDots.length > currentSlide) heroDots[currentSlide].classList.add('active');

                // Move slider right to left
                heroSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
            }

            // Auto slide every 5 seconds
            let slideInterval = setInterval(() => {
                let nextSlide = (currentSlide + 1) % slideCount;
                goToSlide(nextSlide);
            }, 5000);

            // Dot click interactions
            heroDots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    clearInterval(slideInterval);
                    goToSlide(index);
                    // Restart interval
                    slideInterval = setInterval(() => {
                        let nextSlide = (currentSlide + 1) % slideCount;
                        goToSlide(nextSlide);
                    }, 5000);
                });
            });
        }
    }

    // Testimonial Auto-Slider
    const testimonialSlides = document.querySelectorAll('.testimonial-slide');
    if (testimonialSlides.length > 0) {
        let currentTestimonial = 0;
        const testimonialCount = testimonialSlides.length;

        setInterval(() => {
            // Remove active class from current
            testimonialSlides[currentTestimonial].classList.remove('active');

            // Move to next slide
            currentTestimonial = (currentTestimonial + 1) % testimonialCount;

            // Add active class to new
            testimonialSlides[currentTestimonial].classList.add('active');
        }, 5000); // 5 seconds
    }
});
