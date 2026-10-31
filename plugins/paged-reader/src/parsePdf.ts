import * as pdfjs from 'pdfjs-dist'
import workerSource from './pdf.worker.min.txt'

export type PdfDocument = pdfjs.PDFDocumentProxy

let workerReady = false

function ensureWorker(): void {
  if (workerReady) return
  const blob = new Blob([workerSource], { type: 'text/javascript' })
  pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
  workerReady = true
}

export async function loadPdf(bytes: ArrayBuffer): Promise<PdfDocument> {
  ensureWorker()
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableRange: true,
    disableStream: true,
    isEvalSupported: false,
  })
  return task.promise
}

export async function renderPdfPage(
  pdf: PdfDocument,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  containerWidth: number,
  fit: 'width' | 'page',
  containerHeight: number,
): Promise<void> {
  const page = await pdf.getPage(pageIndex + 1)
  const base = page.getViewport({ scale: 1 })
  const widthScale = containerWidth > 0 ? containerWidth / base.width : 1
  const heightScale = containerHeight > 0 ? containerHeight / base.height : widthScale
  const scale = fit === 'page' ? Math.min(widthScale, heightScale) : widthScale
  const viewport = page.getViewport({ scale: Math.max(0.25, Math.min(scale, 3)) })
  const context = canvas.getContext('2d')
  if (!context) return
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvasContext: context, viewport }).promise
}
