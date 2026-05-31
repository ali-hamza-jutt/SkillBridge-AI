declare module "pica" {
  type PicaResizeOptions = {
    quality?: number;
  };

  type PicaInstance = {
    resize(
      source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
      target: HTMLCanvasElement,
      options?: PicaResizeOptions,
    ): Promise<void>;
    toBlob(
      canvas: HTMLCanvasElement,
      mimeType?: string,
      quality?: number,
    ): Promise<Blob>;
  };

  function pica(): PicaInstance;

  export default pica;
}
