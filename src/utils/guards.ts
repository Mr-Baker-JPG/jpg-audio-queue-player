export function isPersistableAudioFile(file: File): boolean {
  return file instanceof File && file.size > 0 && file.type.startsWith("audio/");
}
