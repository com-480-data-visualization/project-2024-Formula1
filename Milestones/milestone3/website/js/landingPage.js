window.addEventListener('load', function() {
    // Image shrink animation
    const img = document.getElementById('img-cover');
    const headerContent = document.getElementById('header-content');

    img.animate([
        { transform: 'scale(1.8)'},
        { transform: 'scale(1)'}
    ], {
        duration: 3000,
        easing: 'ease-in-out',
        fill: 'forwards'
    });

    // Text fade-in animation with delay
    setTimeout(() => {
        headerContent.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], {
            duration: 2000,
            easing: 'ease-out',
            fill: 'forwards'
        });
    }, 3000);
});