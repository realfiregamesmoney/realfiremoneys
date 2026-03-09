import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  'hsl(var(--primary))',
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  shape: 'square' | 'circle' | 'strip';
}

const Confetti = ({ active }: { active: boolean }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }

    const p: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 720 - 360,
      shape: (['square', 'circle', 'strip'] as const)[Math.floor(Math.random() * 3)],
    }));
    setParticles(p);

    const timer = setTimeout(() => setParticles([]), 5000);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                y: '110vh',
                rotate: p.rotation,
                opacity: [1, 1, 0.8, 0],
                scale: [1, 1.2, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: p.shape === 'strip' ? p.size * 0.4 : p.size,
                height: p.shape === 'strip' ? p.size * 2 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'strip' ? '2px' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default Confetti;
