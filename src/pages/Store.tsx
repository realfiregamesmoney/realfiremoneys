import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, ExternalLink, Flame, Bell, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { INITIAL_PRODUCTS } from "./seed_products";

export default function Store() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("TODOS");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      const { data } = await supabase.from('notification_settings').select('label').eq('key_name', 'STORE_PRODUCTS_V1').maybeSingle();
      if (data && data.label) {
        try {
          const parsed = JSON.parse(data.label);
          setProducts(parsed.filter((p: any) => p.is_active !== false && !p.is_deleted));
        } catch (e) {
          setProducts(INITIAL_PRODUCTS);
        }
      } else {
        setProducts(INITIAL_PRODUCTS);
      }
      setLoading(false);
    };
    fetchStore();
  }, []);

  // --- LÓGICA DO CARROSSEL ---
  useEffect(() => {
    if (products.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, 3000); // 3000ms = 3 segundos

    return () => clearInterval(timer);
  }, [products]);

  const bannerProduct = products.length > 0 ? products[currentBannerIndex] : null;

  // Filtros
  const filteredProducts = filter === "TODOS"
    ? products
    : filter === "DESTAQUES"
      ? products.filter(p => p.featured)
      : products.filter(p => p.category === filter);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-neon-orange"><Loader2 className="animate-spin h-10 w-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-orange-500/30 overflow-hidden relative">
      {/* Luzes de Fundo Ambientais */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-orange-600/10 via-orange-900/5 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-40 right-10 w-64 h-64 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] border border-orange-400/30">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">LOJA REAL</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Equipamentos Pro</p>
          </div>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 relative transition-all shadow-[0_0_10px_rgba(255,255,255,0.02)]">
          <Bell className="h-5 w-5 text-gray-300" />
          <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-neon-orange rounded-full animate-pulse border border-[#050505]"></span>
        </button>
      </header>

      <div className="p-4 space-y-8 relative z-10">

        {/* BANNER OFERTA DO DIA (EM MOVIMENTO) */}
        <div className="relative w-full h-52 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.15)] group cursor-pointer border border-white/10 group">
          {bannerProduct ? (
            <img
              src={bannerProduct?.image}
              alt="Destaque"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-105 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/95 via-[#050505]/70 to-transparent"></div>

          <div className="absolute inset-0 p-6 flex flex-col justify-center items-start">
            {bannerProduct && (
              <>
                <div className="flex items-center gap-2 mb-3 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-orange-500/30">
                  <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Seleção Elite</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-tight mb-4 w-3/4 drop-shadow-2xl">
                  {bannerProduct.name}
                </h2>
                <button
                  onClick={() => window.open(bannerProduct.link, '_blank')}
                  className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-500 hover:to-yellow-400 text-white font-black rounded-xl px-6 py-2.5 shadow-[0_0_20px_rgba(249,115,22,0.5)] border-0 flex items-center text-xs tracking-widest transition-all active:scale-95 uppercase"
                >
                  Ver Oferta <ExternalLink className="ml-2 h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Indicadores do Carrossel */}
          {products.length > 0 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
              {products.slice(0, 5).map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentBannerIndex % Math.min(5, products.length) ? "w-8 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" : "w-2 bg-white/20"}`} />
              ))}
            </div>
          )}
        </div>

        {/* ABAS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["TODOS", "SETUP", "MOBILE", "ACESSÓRIOS", "DESTAQUES"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest whitespace-nowrap border ${filter === cat
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                : "bg-white/[0.02] text-gray-500 border-white/5 hover:bg-white/[0.05] hover:text-gray-300"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRADE DE PRODUTOS */}
        <div className="grid grid-cols-2 gap-4 pb-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent hover:border-orange-500/40 transition-all duration-300 group flex flex-col h-full shadow-lg hover:shadow-[0_0_25px_rgba(249,115,22,0.15)]"
            >
              <div className="relative aspect-square overflow-hidden bg-black/50 p-4 flex items-center justify-center">
                {product.featured && (
                  <div className="absolute inset-x-0 top-0 flex items-start justify-center pt-3 z-20 pointer-events-none">
                    <div className="bg-orange-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(249,115,22,0.6)] border border-black/10 transform -rotate-12 animate-pulse">
                      #Hot
                    </div>
                  </div>
                )}
                {/* Glow atrás da imagem */}
                <div className="absolute inset-0 bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-colors"></div>

                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl relative z-10"
                />
              </div>

              <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-black/40 backdrop-blur-md border-t border-white/5">
                <h3 className="text-[11px] font-bold text-gray-300 line-clamp-2 leading-snug uppercase tracking-tight h-8 group-hover:text-white transition-colors">
                  {product.name}
                </h3>

                {/* PREÇO EM VERDE NEON */}
                <div className="flex items-center justify-between w-full bg-white/[0.03] p-2 rounded-xl border border-white/5">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Valor</span>
                  <span className="text-[#4ade80] font-black text-sm tracking-widest drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">
                    {product.price}
                  </span>
                </div>

                <button
                  onClick={() => window.open(product.link, '_blank')}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase text-[10px] tracking-[0.2em] py-3 rounded-xl shadow-[0_4px_15px_rgba(249,115,22,0.4)] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] active:scale-95"
                >
                  COMPRAR
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
