import { randomUUID } from "crypto";

export function makePrefixedId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

