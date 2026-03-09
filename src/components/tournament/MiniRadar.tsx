import { motion } from 'framer-motion';
import { Player } from '@/contexts/TournamentContext';

interface MiniRadarProps {
    players: Player[];
}

const MiniRadar = ({ players }: MiniRadarProps) => (
    <div className="mini-radar">
        {/* Rings */}
        {[1, 2, 3].map(ring => (
            <div
                key={ring}
                className="mini-radar-ring"
                style={{
                    width: `${ring * 33}%`, height: `${ring * 33}%`,
                    top: `${50 - (ring * 33) / 2}%`, left: `${50 - (ring * 33) / 2}%`,
                }}
            />
        ))}

        {/* Sweep */}
        <div className="mini-radar-sweep">
            <div className="mini-radar-sweep-line" />
        </div>

        {/* Cross */}
        <div className="mini-radar-cross-v" />
        <div className="mini-radar-cross-h" />
    </div>
);

export default MiniRadar;
