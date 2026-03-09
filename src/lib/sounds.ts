// Web Audio API sound effects - no external dependencies
const ctx = () => {
    if (!(window as any).__audioCtx) {
        (window as any).__audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return (window as any).__audioCtx as AudioContext;
};

const play = (fn: (c: AudioContext) => void) => {
    try { fn(ctx()); } catch { }
};

export const SFX = {
    move: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
        g.gain.setValueAtTime(0.15, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.1);
    }),

    capture: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.15);
        g.gain.setValueAtTime(0.2, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.15);
    }),

    cardPlay: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.06);
        g.gain.setValueAtTime(0.12, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.08);
    }),

    cardDraw: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(400, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.06);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.08);
    }),

    hit: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(200, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.2);
        g.gain.setValueAtTime(0.25, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.25);
    }),

    miss: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15);
        g.gain.setValueAtTime(0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.15);
    }),

    victory: () => play(c => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, c.currentTime + i * 0.15);
            g.gain.setValueAtTime(0, c.currentTime);
            g.gain.linearRampToValueAtTime(0.2, c.currentTime + i * 0.15);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.3);
            o.connect(g).connect(c.destination);
            o.start(c.currentTime + i * 0.15);
            o.stop(c.currentTime + i * 0.15 + 0.3);
        });
    }),

    defeat: () => play(c => {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(freq, c.currentTime + i * 0.2);
            g.gain.setValueAtTime(0, c.currentTime);
            g.gain.linearRampToValueAtTime(0.15, c.currentTime + i * 0.2);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.25);
            o.connect(g).connect(c.destination);
            o.start(c.currentTime + i * 0.2);
            o.stop(c.currentTime + i * 0.2 + 0.25);
        });
    }),

    phaseTransition: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.3);
        g.gain.setValueAtTime(0.15, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.4);
    }),

    playerJoin: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(500, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.12);
    }),

    tick: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1000, c.currentTime);
        g.gain.setValueAtTime(0.05, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.03);
    }),

    countdown: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(880, c.currentTime);
        g.gain.setValueAtTime(0.12, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.15);
    }),

    champion: () => play(c => {
        const notes = [523, 659, 784, 659, 784, 1047, 1319];
        notes.forEach((freq, i) => {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, c.currentTime + i * 0.12);
            g.gain.setValueAtTime(0, c.currentTime);
            g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.12 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.25);
            o.connect(g).connect(c.destination);
            o.start(c.currentTime + i * 0.12);
            o.stop(c.currentTime + i * 0.12 + 0.25);
        });
    }),

    invalidMove: () => play(c => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.12);
        g.gain.setValueAtTime(0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        o.connect(g).connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.12);
    }),

    chatNotification: () => play(c => {
        const o1 = c.createOscillator();
        const o2 = c.createOscillator();
        const g = c.createGain();
        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(880, c.currentTime);
        o2.frequency.setValueAtTime(1100, c.currentTime);
        g.gain.setValueAtTime(0.1, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o1.connect(g);
        o2.connect(g);
        g.connect(c.destination);
        o1.start(); o1.stop(c.currentTime + 0.08);
        o2.start(c.currentTime + 0.08); o2.stop(c.currentTime + 0.15);
    }),
};
