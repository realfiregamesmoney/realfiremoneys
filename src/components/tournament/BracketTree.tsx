import { motion } from 'framer-motion';
import { Match, Player } from '@/contexts/TournamentContext';

interface BracketTreeProps {
  matches: Match[];
  players: Player[];
  champion: Player | null;
}

const PlayerSlot = ({ player, isWinner, isEliminated, isPlaying }: { player: Player | null; isWinner?: boolean; isEliminated?: boolean; isPlaying?: boolean }) => (
  <div className={`bracket-player-slot ${isWinner ? 'winner' : ''} ${isEliminated ? 'eliminated' : ''} ${isPlaying ? 'playing' : ''} ${!player ? 'empty' : ''}`}>
    <div className="bracket-avatar">
      {player?.avatar || '?'}
    </div>
    <span className="bracket-name">
      {player?.name || '...'}
    </span>
    {isWinner && <span className="bracket-crown">👑</span>}
  </div>
);

const MatchCard = ({ match }: { match: Match }) => {
  const statusLabel = {
    waiting: '⏳',
    playing: '⚔️',
    finished: '✅',
  };

  const isPlaying = match.status === 'playing';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bracket-match ${match.status}`}
    >
      <div className="bracket-match-status">{statusLabel[match.status]}</div>
      <PlayerSlot
        player={match.player1}
        isWinner={match.winner?.id === match.player1?.id}
        isEliminated={!!match.winner && match.winner.id !== match.player1?.id}
        isPlaying={isPlaying && !match.winner}
      />
      <div className="bracket-vs">VS</div>
      <PlayerSlot
        player={match.player2}
        isWinner={match.winner?.id === match.player2?.id}
        isEliminated={!!match.winner && match.winner.id !== match.player2?.id}
        isPlaying={isPlaying && !match.winner}
      />
    </motion.div>
  );
};

const BracketTree = ({ matches, players, champion }: BracketTreeProps) => {
  const quarters = matches.filter(m => m.round === 'quarters');
  const semis = matches.filter(m => m.round === 'semis');
  const final_ = matches.filter(m => m.round === 'final');
  const isWaiting = quarters.length === 0 && semis.length === 0 && final_.length === 0;

  return (
    <div className="bracket-tree">
      {/* Round labels */}
      <div className="bracket-round">
        <div className="bracket-round-label">QUARTAS</div>
        <div className="bracket-matches">
          {isWaiting ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bracket-match waiting">
                <PlayerSlot player={players[i * 2] || null} />
                <div className="bracket-vs">VS</div>
                <PlayerSlot player={players[i * 2 + 1] || null} />
              </div>
            ))
          ) : (
            quarters.map(match => <MatchCard key={match.id} match={match} />)
          )}
        </div>
      </div>

      <div className="bracket-connector">→</div>

      <div className="bracket-round">
        <div className="bracket-round-label">SEMI</div>
        <div className="bracket-matches">
          {semis.length > 0 ? (
            semis.map(match => <MatchCard key={match.id} match={match} />)
          ) : (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bracket-match waiting">
                <PlayerSlot player={null} />
                <div className="bracket-vs">VS</div>
                <PlayerSlot player={null} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bracket-connector">→</div>

      <div className="bracket-round">
        <div className="bracket-round-label">FINAL</div>
        <div className="bracket-matches">
          {final_.length > 0 ? (
            final_.map(match => <MatchCard key={match.id} match={match} />)
          ) : (
            <div className="bracket-match waiting">
              <PlayerSlot player={null} />
              <div className="bracket-vs">VS</div>
              <PlayerSlot player={null} />
            </div>
          )}
        </div>
      </div>

      <div className="bracket-connector">→</div>

      {/* Champion */}
      <div className="bracket-round">
        <div className="bracket-round-label champion-label">🏆</div>
        <div className="bracket-champion-slot">
          {champion ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bracket-champion-card">
              <span className="bracket-champion-emoji">{champion.avatar}</span>
              <span className="bracket-champion-text">{champion.name}</span>
            </motion.div>
          ) : (
            <div className="bracket-champion-card empty">
              <span className="bracket-champion-emoji">🏆</span>
              <span className="bracket-champion-text">???</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BracketTree;
