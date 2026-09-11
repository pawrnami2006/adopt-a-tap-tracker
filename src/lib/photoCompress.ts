/**
 * photoCompress.ts
 *
 * Browser-side image compression via canvas.
 * Resizes the longest edge to ~800px, preserves aspect ratio, outputs JPEG ~0.7 quality.
 * Returns a Blob ready for Supabase Storage upload, and a base64 string for
 * offline queue serialisation (stored in queued action payload; decoded on sync).
 */

const MAX_EDGE = 800
const JPEG_QUALITY = 0.7

export interface CompressedPhoto {
  blob: Blob
  /** base64-encoded JPEG (no data-URI prefix) — used for offline queue payload */
  base64: string
  /** MIME type — always image/jpeg */
  mimeType: 'image/jpeg'
}

/**
 * Compress a File or Blob from a camera/gallery picker.
 * Safe to call in both browser and Capacitor WebView.
 */
export async function compressPhoto(source: File | Blob): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(source)

  const { width, height } = bitmap
  const longestEdge = Math.max(width, height)
  const scale = longestEdge > MAX_EDGE ? MAX_EDGE / longestEdge : 1

  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('photoCompress: could not get 2d canvas context')

  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return new Promise<CompressedPhoto>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('photoCompress: canvas.toBlob returned null'))
          return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          // Strip the "data:image/jpeg;base64," prefix
          const base64 = dataUrl.split(',')[1] ?? ''
          resolve({ blob, base64, mimeType: 'image/jpeg' })
        }
        reader.onerror = () => reject(new Error('photoCompress: FileReader failed'))
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

/**
 * Decode a base64 JPEG string (from offline queue payload) back to a Blob
 * ready for Supabase Storage upload.
 */
export function base64ToBlob(base64: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/jpeg' })
}
