import { StorageService } from './storageService.js';
import { Store } from '../store.js';

/**
 * FileStorage proxy mapping local legacy calls to Firebase Storage.
 */
export const FileStorage = {
    /**
     * Upload a file to Firebase Storage.
     */
    async upload(docType, file) {
        return await StorageService.uploadFile(docType, file);
    },

    /**
     * Retrieve file metadata/URL. Note: Firebase Storage does not return Blobs synchronously.
     * We return a mock Blob object with the URL for backwards compatibility.
     */
    async get(docType) {
        if (!Store || !Store.data) return null;
        if (!Store.data.documents) Store.data.documents = {};
        const fileMeta = Store.data.documents[docType];
        if (!fileMeta) return null;
        
        // If it's a legacy boolean flag from IndexedDB days, return null (needs re-upload or migration)
        if (typeof fileMeta === 'boolean') return null;

        return {
            name: fileMeta.fileName,
            type: fileMeta.contentType,
            size: fileMeta.size,
            uploadedAt: fileMeta.uploadedAt,
            url: fileMeta.url,
            // Returning null for blob. Code should use `url` via conditional checks.
            get blob() {
                return null; 
            }
        };
    },

    /**
     * Delete a file
     */
    async delete(docType) {
        return await StorageService.deleteFile(docType);
    }
};
