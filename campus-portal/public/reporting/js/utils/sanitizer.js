/**
 * Sanitizer Utility
 * Wraps DOMPurify to prevent XSS attacks when saving or rendering data.
 */

export const Sanitizer = {
    /**
     * Sanitize a single string
     * @param {string} input 
     * @returns {string}
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return input;
        
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(input, {
                ALLOWED_TAGS: [], // Strip all HTML tags
                ALLOWED_ATTR: []
            });
        }
        
        // Fallback basic regex sanitization if DOMPurify failed to load
        return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    /**
     * Deep sanitize an object before saving it
     * @param {Object} obj 
     * @returns {Object}
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return this.sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitizedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitizedObj[key] = this.sanitizeObject(obj[key]);
            }
        }
        
        return sanitizedObj;
    }
};
