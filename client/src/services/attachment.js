import api from './api';

export function resolveAttachmentUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url;
  try {
    const baseOrigin = new URL(api.defaults.baseURL, window.location.origin).origin;
    return new URL(url, baseOrigin).href;
  } catch {
    return url;
  }
}

export function isImageAttachment(attachment) {
  if (!attachment) return false;
  if (attachment.mimeType && attachment.mimeType.startsWith('image/')) return true;
  const name = attachment.originalName || attachment.url || '';
  return /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(name);
}

export async function downloadAttachment(attachment) {
  if (!attachment?.url) return;
  const originalName = attachment.originalName || 'Attachment';
  const filename = attachment.url.split('/').pop()?.split('?')[0];

  try {
    // Try the dedicated backend download endpoint with authentication & Content-Disposition
    const endpoint = `/messages/download/${encodeURIComponent(filename)}?name=${encodeURIComponent(originalName)}`;
    const response = await api.get(endpoint, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch {
    // Fallback: direct blob download via resolved URL
    try {
      const fullUrl = resolveAttachmentUrl(attachment.url);
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch {
      // Last-resort fallback: open resolved URL in a new window
      window.open(resolveAttachmentUrl(attachment.url), '_blank', 'noopener,noreferrer');
    }
  }
}
