// Web NFC API Type Declarations
// https://w3c.github.io/web-nfc/

interface NDEFReadingEvent extends Event {
  serialNumber: string
  message: NDEFMessage
}

interface NDEFMessage {
  records: NDEFRecord[]
}

interface NDEFRecord {
  recordType: string
  mediaType?: string
  id?: string
  data?: DataView
  encoding?: string
  lang?: string
}

interface NDEFScanOptions {
  signal?: AbortSignal
}

interface NDEFReader extends EventTarget {
  scan(options?: NDEFScanOptions): Promise<void>
  write(message: string | NDEFMessage, options?: { signal?: AbortSignal }): Promise<void>
  addEventListener(
    type: 'reading',
    listener: (event: NDEFReadingEvent) => void,
    options?: AddEventListenerOptions
  ): void
  addEventListener(
    type: 'readingerror',
    listener: (event: Event) => void,
    options?: AddEventListenerOptions
  ): void
}

declare global {
  interface Window {
    NDEFReader: new () => NDEFReader
  }
}

export {}
