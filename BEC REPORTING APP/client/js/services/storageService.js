
import { Store } from '../store.js';
import { SyncService } from './syncService.js';

export const StorageService = {
    /**
     * Compress an image file using HTML5 Canvas.
     * @param {File} file 
     * @param {number} maxWidth 
     * @param {number} maxHeight 
     * @param {number} quality (0.0 to 1.0)
     * @returns {Promise<Blob>}
     */
    async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.7) {
        if (!file.type.startsWith('image/')) return file; // Do not compress non-images (e.g. PDF)
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    resolve(blob);
                }, file.type, quality);
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(img.src);
                reject(err);
            };
        });
    },

    /**
     * Upload a file to Cloudinary.
     * @param {string} docType - The document ID (e.g., 'studentPhoto')
     * @param {File|Blob} file 
     * @param {Function} onProgress 
     * @returns {Promise<Object>} metadata about the uploaded file
     */
    async uploadFile(docType, file, onProgress = null) {
        try {
            const isPhotoOrSign = ['studentPhoto', 'studentSignature', 'parentSignature'].includes(docType);
            const maxMB = isPhotoOrSign ? 1 : 2;
            const maxSizeBytes = maxMB * 1024 * 1024;

            if (file && file.size > maxSizeBytes) {
                const actualMB = (file.size / (1024 * 1024)).toFixed(2);
                throw new Error(`File size (${actualMB} MB) exceeds maximum allowed limit of ${maxMB} MB.`);
            }

            const studentId = Store.getStudentId();
            const compressedFile = await this.compressImage(file);
            
            let fileMeta = null;

            try {
                // 1. Attempt upload to backend Cloudinary if available
                const timestamp = Math.round((new Date).getTime() / 1000);
                const folder = `student_docs/${studentId}`;
                
                const apiBase = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl)
                    ? window.APP_CONFIG.apiBaseUrl
                    : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : window.location.origin);

                const signRes = await fetch(`${apiBase}/api/sign-upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ timestamp, folder })
                });

                if (signRes.ok) {
                    const { signature, api_key, cloud_name } = await signRes.json();
                    
                    const formData = new FormData();
                    formData.append('file', compressedFile);
                    formData.append('api_key', api_key);
                    formData.append('timestamp', timestamp);
                    formData.append('signature', signature);
                    formData.append('folder', folder);
                    
                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        fileMeta = {
                            fileName: file.name || `${docType}.pdf`,
                            url: data.secure_url,
                            public_id: data.public_id,
                            uploadedAt: new Date().toISOString(),
                            size: data.bytes,
                            contentType: `${data.resource_type}/${data.format}`
                        };
                    }
                }
            } catch (backendErr) {
                console.warn("Cloudinary upload unavailable, falling back to local Data URL storage:", backendErr);
            }

            // 2. Resilient fallback to Data URL (base64) if Cloudinary upload skipped or failed
            if (!fileMeta) {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(compressedFile);
                });

                fileMeta = {
                    fileName: file.name || `${docType}.pdf`,
                    url: dataUrl,
                    uploadedAt: new Date().toISOString(),
                    size: file.size,
                    contentType: file.type
                };
            }
            
            // Save metadata to Store & trigger Sync
            Store.update('documents', docType, fileMeta);
            if (SyncService && SyncService.syncNow) {
                SyncService.syncNow();
            }
            
            return fileMeta;
        } catch (error) {
            console.error("Error in StorageService.uploadFile:", error);
            throw error;
        }
    },

    /**
     * Upload a file on behalf of a student (e.g. by an administrator for missed documents)
     * @param {string} studentId - The target student's ID
     * @param {string} docType - The document ID / key (e.g., 'incomeCertificate')
     * @param {File|Blob} file - The file to upload
     * @returns {Promise<Object>} metadata about the uploaded file
     */
    async uploadFileForStudent(studentId, docType, file) {
        try {
            const isPhotoOrSign = ['studentPhoto', 'studentSignature', 'parentSignature', 'arStudentSignature', 'arParentSignature'].includes(docType);
            const maxMB = isPhotoOrSign ? 2 : 5;
            const maxSizeBytes = maxMB * 1024 * 1024;

            if (file && file.size > maxSizeBytes) {
                const actualMB = (file.size / (1024 * 1024)).toFixed(2);
                throw new Error(`File size (${actualMB} MB) exceeds maximum allowed limit of ${maxMB} MB.`);
            }

            const compressedFile = await this.compressImage(file);
            let fileMeta = null;

            try {
                // 1. Attempt upload to backend Cloudinary if available
                const timestamp = Math.round((new Date).getTime() / 1000);
                const folder = `student_docs/${studentId}`;
                
                const apiBase = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl)
                    ? window.APP_CONFIG.apiBaseUrl
                    : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : window.location.origin);

                const signRes = await fetch(`${apiBase}/api/sign-upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ timestamp, folder })
                });

                if (signRes.ok) {
                    const { signature, api_key, cloud_name } = await signRes.json();
                    
                    const formData = new FormData();
                    formData.append('file', compressedFile);
                    formData.append('api_key', api_key);
                    formData.append('timestamp', timestamp);
                    formData.append('signature', signature);
                    formData.append('folder', folder);
                    
                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        fileMeta = {
                            fileName: file.name || `${docType}.pdf`,
                            url: data.secure_url,
                            public_id: data.public_id,
                            uploadedAt: new Date().toISOString(),
                            size: data.bytes || file.size,
                            contentType: data.resource_type ? `${data.resource_type}/${data.format}` : (file.type || 'application/pdf')
                        };
                    }
                }
            } catch (backendErr) {
                console.warn("Cloudinary upload unavailable, falling back to local Data URL storage:", backendErr);
            }

            // 2. Resilient fallback to Data URL (base64) if Cloudinary upload skipped or failed
            if (!fileMeta) {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(compressedFile);
                });

                fileMeta = {
                    fileName: file.name || `${docType}.pdf`,
                    url: dataUrl,
                    uploadedAt: new Date().toISOString(),
                    size: file.size,
                    contentType: file.type || 'application/pdf'
                };
            }

            return fileMeta;
        } catch (error) {
            console.error("Error in StorageService.uploadFileForStudent:", error);
            throw error;
        }
    },

    /**
     * Delete a file from Cloudinary (Note: Direct deletion from frontend via REST requires a signature for destroy endpoint, 
     * but we can just update local metadata for now to hide it, or implement a backend delete route if strictly needed).
     * @param {string} docType 
     */
    async deleteFile(docType) {
        try {
            // We just remove the reference locally. To actually delete from Cloudinary, 
            // you should ideally build a backend /api/delete-file endpoint. 
            // For now, removing it from Firestore reference is functionally deleting it from the app.
            Store.update('documents', docType, false);
            SyncService.syncNow();
            return true;
        } catch (error) {
            console.error("Error deleting file:", error);
            return false;
        }
    }
};
