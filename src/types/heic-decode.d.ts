// heic-decode ships no TypeScript types. This declares only what the core uses.
declare module 'heic-decode' {
  interface DecodedHeic {
    width: number
    height: number
    /** RGBA pixels, 4 bytes per pixel */
    data: Uint8ClampedArray
  }

  function decode(options: { buffer: Buffer | Uint8Array | ArrayBuffer }): Promise<DecodedHeic>

  export default decode
}
