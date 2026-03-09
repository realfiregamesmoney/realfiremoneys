import { motion } from 'framer-motion';
import { Player } from '@/contexts/TournamentContext';

interface RadarDisplayProps {
    players: Player[];
}

const RadarDisplay = ({ players }: RadarDisplayProps) => {
    const positions = [
        { x: 50, y: 10 }, { x: 85, y: 30 }, { x: 90, y: 65 }, { x: 70, y: 90 },
        { x: 30, y: 90 }, { x: 10, y: 65 }, { x: 15, y: 30 }, { x: 50, y: 50 },
    ];

    return (
        <div className="relative w-80 h-80 md:w-96 md:h-96">
            {/* Radar circles */}
            {[1, 2, 3].map(ring => (
                <div
                    key={ring}
                    className="absolute rounded-full border border-primary/20"
                    style={{
                        width: `${ring * 33}%`,
                        height: `${ring * 33}%`,
                        top: `${50 - (ring * 33) / 2}%`,
                        left: `${50 - (ring * 33) / 2}%`,
                    }}
                />
            ))}

            {/* Sweep line */}
            <div className="absolute inset-0 radar-pulse">
                <div
                    className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
                    style={{
                        background: 'linear-gradient(90deg, hsl(160 100% 45% / 0.6), transparent)',
                    }}
                />
            </div>

            {/* Cross lines */}
            <div className="absolute top-0 left-1/2 w-px h-full bg-primary/10" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-primary/10" />

            {/* Players */}
            {players.map((player, i) => {
                const pos = positions[i] || { x: 50, y: 50 };
                return (
                    <motion.div
                        key={player.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="absolute flex flex-col items-center gap-1"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/30 pulse-ring" />
                            <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary flex items-center justify-center text-lg">
                                {player.avatar}
                            </div>
                        </div>
                        <span className="text-xs font-heading font-semibold text-foreground whitespace-nowrap">
                            {player.name}
                        </span>
                    </motion.div>
                );
            })}

            {/* Waiting slots */}
            {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => {
                const pos = positions[players.length + i];
                if (!pos) return null;
                return (
                    <div
                        key={`empty-${i}`}
                        className="absolute w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <span className="text-muted-foreground/40 text-xs">?</span>
                    </div>
                );
            })}
        </div>
    );
};

export default RadarDisplay;
