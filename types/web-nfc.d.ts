// Web NFC API TypeScript declarations
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

interface NDEFReader extends EventTarget {
  scan(options?: NDEFScanOptions): Promise<void>
  write(message: NDEFMessageSource, options?: NDEFWriteOptions): Promise<void>
  makeReadOnly(options?: NDEFMakeReadOnlyOptions): Promise<void>
  addEventListener(
    type: "reading",
    listener: (event: NDEFReadingEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: "readingerror",
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void
}

interface NDEFScanOptions {
  signal?: AbortSignal
}

interface NDEFWriteOptions {
  overwrite?: boolean
  signal?: AbortSignal
}

interface NDEFMakeReadOnlyOptions {
  signal?: AbortSignal
}

type NDEFMessageSource = string | BufferSource | NDEFMessageInit

interface NDEFMessageInit {
  records: NDEFRecordInit[]
}

interface NDEFRecordInit {
  recordType: string
  mediaType?: string
  id?: string
  encoding?: string
  lang?: string
  data?: string | BufferSource
}

declare var NDEFReader: {
  prototype: NDEFReader
  new (): NDEFReader
}
