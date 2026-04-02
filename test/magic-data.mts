import { readFile } from "node:fs/promises";

export type Tier = {
  description: string;
  effects: Array<{
    target: string;
    action: string;
    value: string | number;
    description: string;
  }>;
};

export type MagicEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  source: string;
  tiers: {
    novice: Tier;
    adept: Tier;
    master: Tier;
  };
};

export async function readMagicFile(path: string): Promise<MagicEntry[]> {
  const fileUrl = new URL(path, import.meta.url);

  try {
    const text = await readFile(fileUrl, "utf8");

    try {
      return JSON.parse(text) as MagicEntry[];
    } catch (error) {
      throw new Error(
        `Failed to parse ${fileUrl.pathname}: ${(error as Error).message}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to read ${fileUrl.pathname}: ${(error as Error).message}`,
    );
  }
}
