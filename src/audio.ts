/** All sounds are synthesised. One AudioContext, one master chain, created on the first user gesture. */
export type Sound = 'tick' | 'go' | 'signal' | 'hit' | 'miss' | 'early' | 'shoot' | 'last' | 'missed' | 'card' | 'refused' | 'drill'

export interface Audio {
  unlock(): void
  play(s: Sound): void
  setEnabled(on: boolean): void
}

export function createAudio(): Audio {
  let ac: AudioContext | null = null
  let master: GainNode | null = null
  let noise: AudioBuffer | null = null
  let enabled = true

  function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number) {
    const o = ac!.createOscillator()
    const g = ac!.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, at)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g).connect(master!)
    o.start(at)
    o.stop(at + dur + 0.02)
  }
  function hiss(at: number, dur: number, vol = 0.3, hp = 2000) {
    const s = ac!.createBufferSource()
    s.buffer = noise
    const f = ac!.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = hp
    const g = ac!.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    s.connect(f).connect(g).connect(master!)
    s.start(at)
    s.stop(at + dur + 0.02)
  }

  return {
    unlock() {
      if (ac) {
        if (ac.state === 'suspended') void ac.resume()
        return
      }
      try {
        ac = new AudioContext()
        const comp = ac.createDynamicsCompressor()
        master = ac.createGain()
        master.gain.value = 0.45
        master.connect(comp).connect(ac.destination)
        noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate)
        const d = noise.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      } catch {
        ac = null
      }
    },
    setEnabled(on) {
      enabled = on
    },
    play(s) {
      if (!ac || !enabled || ac.state !== 'running') return
      const t = ac.currentTime
      switch (s) {
        case 'tick': tone(1100, t, 0.05, 'triangle', 0.25); break
        case 'go': tone(440, t, 0.12, 'triangle', 0.35); tone(660, t + 0.08, 0.12, 'triangle', 0.35); tone(990, t + 0.16, 0.2, 'triangle', 0.35); break
        case 'drill': tone(520, t, 0.09, 'square', 0.12); tone(780, t + 0.1, 0.14, 'square', 0.12); break
        case 'signal': tone(1320, t, 0.12, 'square', 0.18); break
        case 'hit': tone(880, t, 0.08, 'triangle', 0.4); tone(1320, t + 0.04, 0.12, 'triangle', 0.3); hiss(t, 0.05, 0.12, 5000); break
        case 'miss': tone(160, t, 0.12, 'sine', 0.5, 90); break
        case 'early': tone(220, t, 0.18, 'sawtooth', 0.18, 160); break
        case 'shoot': hiss(t, 0.16, 0.22, 1500); tone(600, t, 0.12, 'triangle', 0.15, 1200); break
        case 'last': tone(988, t, 0.08, 'square', 0.18); tone(1319, t + 0.07, 0.22, 'square', 0.18); break
        case 'missed': tone(330, t, 0.14, 'triangle', 0.3, 200); tone(247, t + 0.12, 0.2, 'triangle', 0.3, 150); break
        case 'refused': tone(180, t, 0.1, 'square', 0.15); tone(180, t + 0.14, 0.1, 'square', 0.15); break
        case 'card': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.3)); break
      }
    },
  }
}
