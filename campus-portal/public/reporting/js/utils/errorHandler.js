/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections to prevent silent failures in production.
 */

window.addEventListener('error', function(event) {
    console.error('[Global Error Boundary]', event.error || event.message);
    
    // Optionally display a toast notification to the user here
    // alert("An unexpected error occurred. Please refresh the page if things seem broken.");
    
    // Prevent default browser error handling if you want to completely suppress it
    // return true; 
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('[Global Promise Rejection]', event.reason);
    
    // Specifically catch common Firebase network errors
    if (event.reason && event.reason.code) {
        if (event.reason.code === 'unavailable' || event.reason.code === 'auth/network-request-failed') {
            console.warn("Network issue detected. Firebase will automatically retry when online.");
        }
    }
});
