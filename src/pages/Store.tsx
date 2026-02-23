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

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-neon-orange"><Loader2 className="animate-spin h-10 w-10" /></div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24 font-sans selection:bg-orange-500/30">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-orange-500">LOJA</h1>
            <p className="text-[10px] text-gray-400 font-medium">Equipamentos Pro</p>
          </div>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 relative transition-colors">
          <Bell className="h-5 w-5 text-gray-300" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      </header>

      <div className="p-4 space-y-6">

        {/* BANNER OFERTA DO DIA (EM MOVIMENTO) */}
        <div className="relative w-full h-48 rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/10 group cursor-pointer border border-white/10">
          <img
            src={bannerProduct ? bannerProduct.image : "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format"}
            alt="Destaque"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>

          <div className="absolute inset-0 p-6 flex flex-col justify-center items-start">
            {bannerProduct && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Destaque</span>
                </div>
                <h2 className="text-2xl font-black text-white leading-none mb-4 w-2/3 line-clamp-2 drop-shadow-lg">
                  {bannerProduct.name}
                </h2>
                <button
                  onClick={() => window.open(bannerProduct.link, '_blank')}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-full px-6 py-2 shadow-[0_0_20px_rgba(249,115,22,0.4)] border-0 flex items-center text-xs tracking-wider transition-all active:scale-95"
                >
                  VER DETALHES <ExternalLink className="ml-2 h-3 w-3" />
                </button>
              </>
            )}
          </div>

          {/* Indicadores do Carrossel */}
          {products.length > 0 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
              {products.slice(0, 5).map((_, idx) => (
                <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentBannerIndex % Math.min(5, products.length) ? "w-6 bg-orange-500" : "w-1 bg-white/30"}`} />
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
              className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all uppercase whitespace-nowrap ${filter === cat ? "bg-orange-500 text-black shadow-lg shadow-orange-500/25 scale-105" : "bg-[#18181b] text-gray-400 border border-white/5 hover:bg-[#27272a]"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRADE DE PRODUTOS */}
        <div className="grid grid-cols-2 gap-3 pb-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-[#121214] rounded-2xl overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all group flex flex-col h-full shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden bg-[#000]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                />
              </div>

              <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                <h3 className="text-[11px] font-bold text-gray-200 line-clamp-2 leading-tight uppercase tracking-tight h-8">
                  {product.name}
                </h3>

                {/* PREÇO EM VERDE NEON */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#4ade80] font-black text-sm tracking-wide drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                    {product.price}
                  </span>
                </div>

                <button
                  onClick={() => window.open(product.link, '_blank')}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase text-[10px] tracking-wider h-8 rounded-lg shadow-md border-0 flex items-center justify-center transition-all active:scale-95"
                >
                  COMPRAR <ExternalLink className="ml-1 h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
