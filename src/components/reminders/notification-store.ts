"use client"

const SOUND_KEY = "source:reminder-sound"

let ctx: AudioContext | null = null

export function soundEnabled() {
  if (typeof window === "undefined") return true
  try {
    return localStorage.getItem(SOUND_KEY) !== "off"
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off")
  } catch {}
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function requestNotificationPermission() {
  unlockAudio()
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const
  if (Notification.permission !== "default") return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function unlockAudio() {
  if (typeof window === "undefined") return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === "suspended") void ctx.resume()
  } catch {
    ctx = null
  }
}

export function playChime(force = false) {
  if (!force && !soundEnabled()) return
  unlockAudio()
  if (!ctx || ctx.state !== "running") return

  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.001
  master.connect(ctx.destination)

  for (const [i, freq] of [880, 1318.5].entries()) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = now + i * 0.18

    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, start)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42)

    osc.connect(gain)
    gain.connect(master)
    osc.start(start)
    osc.stop(start + 0.45)
  }

  master.gain.setValueAtTime(1, now)
}

export function showNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return null
  if (Notification.permission !== "granted") return null
  try {
    const n = new Notification(title, { body, tag, icon: "/favicon.ico", requireInteraction: false })
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return n
  } catch {
    return null
  }
}
