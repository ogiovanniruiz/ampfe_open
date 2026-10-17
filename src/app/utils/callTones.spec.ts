import { RingbackGate } from './callTones';

// Feeds the gate one volume sample every 50 ms (about how often the SDK reports volume) and collects its decisions
function play(gate: RingbackGate, segments: Array<[volume: number, ms: number]>, start = 0) {
  const actions: Array<['pause' | 'resume', number]> = [];
  let now = start;
  for (const [volume, ms] of segments) {
    for (let t = 0; t < ms; t += 50) {
      const action = gate.update(volume, now);
      if (action) actions.push([action, now]);
      now += 50;
    }
  }
  return actions;
}

describe('RingbackGate', () => {
  it('ignores a short blip from the carrier', () => {
    const gate = new RingbackGate();
    expect(play(gate, [[0, 2000], [0.3, 200], [0, 6000]])).toEqual([]);
    expect(gate.paused).toBeFalse();
  });

  it('never pauses for low line noise', () => {
    const gate = new RingbackGate();
    expect(play(gate, [[0.03, 20000]])).toEqual([]);
  });

  it('pauses once the carrier is audible for 300 ms', () => {
    const gate = new RingbackGate();
    const actions = play(gate, [[0.2, 1000]]);
    expect(actions).toEqual([['pause', 300]]);
    expect(gate.paused).toBeTrue();
  });

  it("stays paused through the carrier's own ringback cadence", () => {
    const gate = new RingbackGate();
    const cadence: Array<[number, number]> = [];
    for (let i = 0; i < 5; i++) cadence.push([0.2, 2000], [0, 4000]);
    expect(play(gate, cadence).map(a => a[0])).toEqual(['pause']);
    expect(gate.paused).toBeTrue();
  });

  it('brings the ringback back after one carrier ring and then silence', () => {
    const gate = new RingbackGate();
    const actions = play(gate, [[0.2, 2000], [0, 10000]]);
    expect(actions.map(a => a[0])).toEqual(['pause', 'resume']);
    expect(actions[1][1]).toBe(2000 + 5000);
    expect(gate.paused).toBeFalse();
    expect(gate.peakVolume).toBe(0.2);
  });

  it('pauses again if the carrier starts sending sound after resuming', () => {
    const gate = new RingbackGate();
    const actions = play(gate, [[0.2, 1000], [0, 6000], [0.4, 1000]]);
    expect(actions.map(a => a[0])).toEqual(['pause', 'resume', 'pause']);
    expect(gate.pauses).toBe(2);
    expect(gate.resumes).toBe(1);
  });
});
