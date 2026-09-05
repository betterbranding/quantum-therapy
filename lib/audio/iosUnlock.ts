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
 *
 * Lessons baked in here, do not undo them:
 *  - The clip must contain real samples. A WAV with an empty data chunk is
 *    rejected by iOS and the unlock never happens. We generate one second of
 *    genuine digital silence at runtime and serve it from a Blob URL.
 *  - iOS ignores HTMLMediaElement.volume, so silence has to be in the data.
 *  - The element must keep looping for the whole session or iOS drops the
 *    page back to "ambient" when it ends.
 *  - When the tab returns to the foreground, replay it. iOS pauses media
 *    elements on background and does not resume them for us.
 */

let unlocked = false;
let el: HTMLAudioElement | null = null;
let blobUrl: string | null = null;
let listening = false;

/** Build a 1 s, 8 kHz, 16-bit mono WAV of true silence. ~16 KB, built once. */
function makeSilentWavUrl(): string {
  if (blobUrl) return blobUrl;
  const rate = 8000;
  const seconds = 1;
  const frames = rate * seconds;
  const bytes = frames * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  v.setUint32(4, 36 + bytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, bytes, true);
  // Samples are already zero-initialised: real silence, real length.
  blobUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  return blobUrl;
}

function ensureElement(): HTMLAudioElement {
  if (el) return el;
  el = document.createElement("audio");
  el.src = makeSilentWavUrl();
  el.loop = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.preload = "auto";
  el.style.display = "none";
  document.body.appendChild(el);

  if (!listening) {
    listening = true;
    // iOS pauses media on background. Re-arm on return so the category sticks.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && unlocked && el && el.paused) {
        el.play().catch(() => {
          /* will re-arm on next gesture */
        });
      }
    });
  }
  return el;
}

export function unlockIOSAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const a = ensureElement();
    if (unlocked && !a.paused) return;
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        unlocked = true;
      }).catch(() => {
        // Not inside a gesture, or autoplay blocked. Retry on the next tap.
      });
    } else {
      unlocked = true;
    }
  } catch {
    /* non-fatal */
  }
}

export function isIOSUnlocked(): boolean {
  return unlocked && !!el && !el.paused;
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
