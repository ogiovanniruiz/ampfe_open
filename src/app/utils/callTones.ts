// Tones played in the browser during calls, made with Web Audio (no sound files).
// Ringback fills in when the carrier sends no ringing of its own.

const RING_ON_MS = 2000
const RING_CYCLE_MS = 6000 // US ringback: 2s of 440+480 Hz, 4s of silence

// Sound from the carrier while ringing (its own ringback or a recorded message) pauses the browser ringback.
// Quiet for longer than a ringback gap brings it back, so a blip or a single carrier ring never leaves silence.
const CARRIER_AUDIO_VOLUME = 0.05
const CARRIER_AUDIO_MS = 300
const CARRIER_QUIET_MS = 5000

// Decides, from the call's output volume, when the browser ringback should give way to the carrier's sound
export class RingbackGate {
  paused = false
  peakVolume = 0
  pauses = 0
  resumes = 0
  private audibleSince: number | null = null
  private quietSince: number | null = null

  update(volume: number, now: number): 'pause' | 'resume' | null {
    this.peakVolume = Math.max(this.peakVolume, volume)
    if(volume >= CARRIER_AUDIO_VOLUME){
      this.quietSince = null
      this.audibleSince = this.audibleSince ?? now
      if(this.paused || now - this.audibleSince < CARRIER_AUDIO_MS) return null
      this.paused = true
      this.pauses++
      return 'pause'
    }
    this.audibleSince = null
    this.quietSince = this.quietSince ?? now
    if(!this.paused || now - this.quietSince < CARRIER_QUIET_MS) return null
    this.paused = false
    this.resumes++
    return 'resume'
  }
}

export class CallTones {
  private context: AudioContext | null = null
  private ringTimer: any = null
  private ringNodes: {stop: () => void} | null = null

  // The context is created on first use, which is a click (placing a call), so browsers allow the audio
  private audio(): AudioContext | null {
    if(this.context) return this.context
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if(!AudioCtx) return null
    this.context = new AudioCtx()
    return this.context
  }

  private tone(frequencies: number[], durationMs: number, volume: number): {stop: () => void} | null {
    const context = this.audio()
    if(!context) return null
    if(context.state === 'suspended') context.resume().catch(() => {})

    const gain = context.createGain()
    gain.gain.value = volume
    gain.connect(context.destination)
    const oscillators = frequencies.map(frequency => {
      const oscillator = context.createOscillator()
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      oscillator.start()
      oscillator.stop(context.currentTime + durationMs / 1000)
      return oscillator
    })
    return {stop: () => oscillators.forEach(o => { try { o.stop() } catch(e) {} })}
  }

  startRingback(){
    if(this.ringTimer) return
    const ring = () => { this.ringNodes = this.tone([440, 480], RING_ON_MS, 0.08) }
    ring()
    this.ringTimer = setInterval(ring, RING_CYCLE_MS)
  }

  stopRingback(){
    if(this.ringTimer) clearInterval(this.ringTimer)
    this.ringTimer = null
    this.ringNodes?.stop()
    this.ringNodes = null
  }

  close(){
    this.stopRingback()
    this.context?.close().catch(() => {})
    this.context = null
  }
}
