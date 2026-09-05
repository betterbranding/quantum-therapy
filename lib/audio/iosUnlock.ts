/**
 * iOS / Safari audio unlock.
 *
 * iOS assigns an audio "session category" based on what the page has played.
 * A page that has only ever produced sound through the Web Audio API lands in
 * the "ambient" category, which is silenced by the hardware mute switch and
 * ducked when the screen locks. Playing a real (silent) <audio> element first
 * promotes the page to the "playback" category, which survives both.
 *
 * Call this from inside the same user gesture that starts a session.
 */

let unlocked = false;
let el: HTMLAudioElement | null = null;

/** 0.05s of silence as a base64 WAV. Small enough to inline, real enough for iOS. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function unlockIOSAudio(): void {
  if (unlocked || typeof window === "undefined") return;

  try {
    if (!el) {
      el = document.createElement("audio");
      el.src = SILENT_WAV;
      el.loop = true;
      el.volume = 0.0001;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      el.preload = "auto";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        unlocked = true;
      }).catch(() => {
        // Will retry on the next gesture.
      });
    } else {
      unlocked = true;
    }
  } catch {
    /* non-fatal */
  }
}

export function releaseIOSAudio(): void {
  if (el) {
    try {
      el.pause();
    } catch {
      /* noop */
    }
  }
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Media Session metadata so the lock screen shows the protocol rather than
 * a blank "web page" tile.
 */
export function setMediaSession(title: string, artist = "Quantum Therapy") {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Rife Frequency Protocols",
    });
  } catch {
    /* noop */
  }
}
