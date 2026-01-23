import { PORTAL_URL } from '../config/env';

export async function getPdf(filename) {
    const fixedUrl = `${PORTAL_URL}/${filename}`;

    try {
        const response = await fetch(fixedUrl);
        if (response.ok) {
            const blob = await response.blob();
            const fileUrl = URL.createObjectURL(blob);
            window.open(fileUrl, '_blank');
        } else {
            alert("Failed to fetch the PDF file.");
        }
    } catch (error) {
        console.error('Error fetching the PDF:', error);
    }
}

import { API_ENDPOINTS } from '../config/env';

export async function uploadFileToGitHub(file, path) {
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').slice(0, 50);

    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
    const extension = dotIndex !== -1 ? originalName.slice(dotIndex) : '';

    const newFileName = `${baseName}_${timestamp}${extension}`;
    const renamedFile = new File([file], newFileName, { type: file.type });

    const formData = new FormData();
    formData.append('file', renamedFile);

    try {
        const response = await fetch(`${API_ENDPOINTS.github.uploadFile}?path=${encodeURIComponent(path)}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            console.log(`File uploaded successfully: ${result.message}`);
            return `${path}/${newFileName}`;
        } else {
            console.error('Error from server:', result.error);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }

    return `${path}/${file.name}`;
}

export async function uploadFileToSupabase(file, path = 'files/data') {
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').slice(0, 50);

    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
    const extension = dotIndex !== -1 ? originalName.slice(dotIndex) : '';

    const newFileName = `${baseName}_${timestamp}${extension}`;
    const renamedFile = new File([file], newFileName, { type: file.type });

    const formData = new FormData();
    formData.append('file', renamedFile);

    const FILE_SIZE_MB = (file.size / (1024 * 1024)).toFixed(2);

    const uploadPath = FILE_SIZE_MB < 5 ? API_ENDPOINTS.supabase.uploadFile : API_ENDPOINTS.cloudflare.upload;

    try {
        const response = await fetch(uploadPath, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            console.log(`File uploaded successfully: ${result.message}`);
            return {
                path: result.unique_path,
                url: result.public_url
            };
        } else {
            console.error('Error from server:', result.error);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }

    return {
        path: newFileName,
        url: null
    };
}

export async function getFilesInFolder(path) {
    try {
        const url = new URL(API_ENDPOINTS.github.getFiles);
        url.searchParams.append('path', path);

        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Error fetching files: ${response.statusText}`);
        }

        const files = await response.json();
        return files;
    } catch (error) {
        console.error('Failed to list files:', error);
    }
}


