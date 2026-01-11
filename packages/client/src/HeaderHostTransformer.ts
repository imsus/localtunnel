export interface HeaderHostTransformerConfig {
  host: string;
}

export class HeaderHostTransformer {
  readonly _tag = "HeaderHostTransformer";
  private host: string;
  private replaced: boolean;

  constructor(config: HeaderHostTransformerConfig) {
    this.host = config.host;
    this.replaced = false;
  }

  private createTransform(): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
      transform: (chunk, controller) => {
        if (this.replaced) {
          controller.enqueue(chunk);
          return;
        }

        const text = new TextDecoder().decode(chunk);
        const replacedText = text.replace(/(\r\n[Hh]ost: )\S+/, (_match, prefix) => {
          this.replaced = true;
          return prefix + this.host;
        });
        controller.enqueue(new TextEncoder().encode(replacedText));
      },
    });
  }

  static create(host: string): HeaderHostTransformer {
    return new HeaderHostTransformer({ host });
  }
}
