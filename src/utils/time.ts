export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function parseTimeInput(rawValue: string): number | null {
  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(":").map((part) => part.trim());
  if (parts.some((part) => part.length === 0 || Number.isNaN(Number(part)))) {
    return null;
  }

  if (parts.length === 2) {
    const [mins, secs] = parts.map(Number);
    return mins * 60 + secs;
  }

  if (parts.length === 3) {
    const [hours, mins, secs] = parts.map(Number);
    return hours * 3600 + mins * 60 + secs;
  }

  return null;
}
