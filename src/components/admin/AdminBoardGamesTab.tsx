import { Crown, Puzzle, Ship, Play, Trophy, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BOARD_GAMES = [
    {
        id: "damas", title: "DAMAS", description: "Clássico estratégico de tabuleiro", icon: Crown,
        theme: {
            bg: "bg-zinc-900/60", border: "border-orange-500/40", hoverBorder: "hover:border-orange-500",
            glow: "bg-orange-500", iconBg: "bg-zinc-800 border-zinc-700 group-hover:bg-orange-500 text-orange-500 group-hover:text-black", titleText: "group-hover:text-orange-400", playBtn: "bg-orange-600 text-white hover:bg-orange-500 border-orange-400"
        }
    },
    {
        id: "xadrez", title: "XADREZ", description: "Lute pelo rei no tabuleiro", icon: Crown,
        theme: {
            bg: "bg-indigo-950/60", border: "border-purple-500/40", hoverBorder: "hover:border-purple-500",
            glow: "bg-purple-500", iconBg: "bg-indigo-900 border-indigo-800 group-hover:bg-purple-500 text-purple-400 group-hover:text-white", titleText: "group-hover:text-purple-400", playBtn: "bg-purple-600 text-white hover:bg-purple-500 border-purple-400"
        }
    },
    {
        id: "domino", title: "DOMINÓ", description: "Descarte primeiro e vença", icon: Puzzle,
        theme: {
            bg: "bg-green-900/40", border: "border-green-500/60", hoverBorder: "hover:border-green-400",
            glow: "bg-green-500", iconBg: "bg-green-500 border-green-300 group-hover:bg-green-400 text-black", titleText: "group-hover:text-green-400", playBtn: "bg-green-600 text-white hover:bg-green-500 border-green-400"
        }
    },
    {
        id: "batalhanaval", title: "BATALHA NAVAL", description: "Destrua a frota inimiga", icon: Ship,
        theme: {
            bg: "bg-cyan-900/40", border: "border-cyan-500/60", hoverBorder: "hover:border-cyan-400",
            glow: "bg-cyan-500", iconBg: "bg-cyan-500 border-cyan-300 group-hover:bg-cyan-400 text-black", titleText: "group-hover:text-cyan-400", playBtn: "bg-cyan-600 text-white hover:bg-cyan-500 border-cyan-400"
        }
    },
    {
        id: "uno", title: "UNO", description: "Cartas, cores e reviravoltas", icon: Puzzle,
        theme: {
            bg: "bg-yellow-900/40", border: "border-yellow-500/60", hoverBorder: "hover:border-yellow-400",
            glow: "bg-yellow-500", iconBg: "bg-yellow-500 border-yellow-300 group-hover:bg-yellow-400 text-black", titleText: "group-hover:text-yellow-400", playBtn: "bg-yellow-600 text-black hover:bg-yellow-500 border-yellow-400"
        }
    },
    {
        id: "cacheta", title: "CACHETA", description: "Cartas e muita inteligência", icon: Puzzle,
        theme: {
            bg: "bg-pink-900/40", border: "border-pink-500/60", hoverBorder: "hover:border-pink-400",
            glow: "bg-pink-500", iconBg: "bg-pink-500 border-pink-300 group-hover:bg-pink-400 text-black", titleText: "group-hover:text-pink-400", playBtn: "bg-pink-600 text-white hover:bg-pink-500 border-pink-400"
        }
    }
];

export default function AdminBoardGamesTab({ games, onEdit }: { games: any[], onEdit: (game: any) => void }) {
    const battleGames = games.filter(g => g.category === 'battle');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BOARD_GAMES.map((template) => {
                    const realGame = battleGames.find(g => g.id === template.id || g.type === template.id.toUpperCase());

                    return (
                        <Card
                            key={template.id}
                            className={`text-left border-2 transition-all duration-300 transform shadow-lg group relative overflow-hidden bg-[#0a0505] rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-1 hover:scale-[1.01] ${template.theme.bg} ${template.theme.border} ${template.theme.hoverBorder}`}
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                            <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[50px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-500 ${template.theme.glow}`}></div>

                            <Button
                                onClick={() => onEdit(realGame || { id: template.id, title: template.title, description: template.description, entry_fee: 10, prize_amount: 18, type: template.id.toUpperCase(), category: 'battle' })}
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10 rounded-full"
                            >
                                <Edit2 className="w-4 h-4 text-white" />
                            </Button>

                            <div className="relative z-10 flex w-full items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl shadow-md transition-all duration-300 transform group-hover:scale-110 ${template.theme.iconBg}`}>
                                        <template.icon className="h-6 w-6 md:h-8 md:w-8 drop-shadow-md" />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg md:text-xl font-black uppercase tracking-tighter text-white drop-shadow-md transition-colors ${template.theme.titleText}`}>
                                            {realGame?.title || template.title}
                                        </h3>
                                        <p className="text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-widest leading-none drop-shadow-md group-hover:text-gray-200 mt-1">
                                            {realGame?.description || template.description}
                                        </p>
                                        <div className="mt-2 flex flex-col gap-1.5">
                                            <span className="text-xs md:text-sm font-black text-white/40 uppercase tracking-widest leading-none">Entrada: <span className="text-white/80 font-black italic">R$ {realGame?.entry_fee || '10,00'}</span></span>
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 border border-orange-300 shadow-[0_0_20px_rgba(234,88,12,0.3)] w-fit">
                                                <Trophy className="h-4 w-4 text-black drop-shadow-sm" />
                                                <span className="text-xs md:text-base font-black uppercase tracking-tighter text-black">Prêmio: R$ {realGame?.prize_amount || '18,00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-sm ${template.theme.playBtn}`}>
                                    <Play className="h-3 w-3 fill-current hidden sm:block" /> BATALHAR
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
