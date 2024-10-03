// Check user preference for dark or light theme
document.addEventListener("DOMContentLoaded", function() {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDarkScheme) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.add('light');
    }
});