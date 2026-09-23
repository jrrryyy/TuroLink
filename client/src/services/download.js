import api from './api';
export async function downloadFile(endpoint, name) {
  try {
    const response = await api.get(endpoint, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name || 'Attachment';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    let message = 'Unable to download this attachment. Please try again.';
    if (error.response?.data instanceof Blob) {
      try { message = JSON.parse(await error.response.data.text()).message || message; } catch { /* Keep the download message. */ }
    }
    throw new Error(message, { cause: error });
  }
}
