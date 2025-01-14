import { parse as csvParse } from "csv-parse/sync";

export function parseCsv<T>(text: string): T[] {
  return csvParse(text, {delimiter: ","}) as T[];
}
