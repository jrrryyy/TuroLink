import api from './api';

export async function downloadFile(endpoint, name) {
  try {
    let blob;
    if (/^https?:\/\//i.test(endpoint)) {
      // Direct remote CDN URL download without auth headers to prevent CORS issues
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }
      blob = await res.blob();
    } else {
      // Backend API endpoint proxy download
      const response = await api.get(endpoint, { responseType: 'blob' });
      blob = response.data;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name || 'Attachment';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    let message = 'Unable to download this attachment. Please try again.';
    if (error.response?.data instanceof Blob) {
      try {
        message = JSON.parse(await error.response.data.text()).message || message;
      } catch {
        /* Keep default message */
      }
    } else if (error.message && !error.message.startsWith('Download failed')) {
      message = error.message;
    }
    throw new Error(message, { cause: error });
  }
}
