const tones = ["sage", "blue", "sand", "clay", "lilac"] as const;

export function avatarTone(name: string | null | undefined) {
  if (!name?.trim()) return "neutral";
  let hash = 0;
  for (const character of name
    .trim()
    .replace(/\s+/gu, " ")
    .normalize("NFC")
    .toLocaleLowerCase("en")) {
    hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  }
  return tones[hash % tones.length];
}
