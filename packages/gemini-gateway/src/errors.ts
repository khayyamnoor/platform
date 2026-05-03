export class UnknownModel extends Error {
  readonly model: string;
  constructor(model: string) {
    super(`Unknown Gemini model: ${model}`);
    this.name = "UnknownModel";
    this.model = model;
  }
}
