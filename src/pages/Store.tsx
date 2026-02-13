import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, ExternalLink, Flame, Bell } from "lucide-react";

// --- LISTA DE 27 PRODUTOS (DADOS CORRIGIDOS E REVISADOS) ---
const PRODUCTS = [
  { 
    id: 1, 
    name: "PC Gamer White Aquário", 
    image: "https://i.ibb.co/prhhD853/Whats-App-Image-2026-02-10-at-18-50-04-1.jpg", 
    link: "https://mercadolivre.com/sec/2vRefqx", 
    price: "R$ 2.929",
    featured: true,
    category: "SETUP"
  },
  { 
    id: 2, 
    name: "PC Gamer Arena Preto + Monitor 75Hz", 
    image: "https://i.ibb.co/FbJnY428/Whats-App-Image-2026-02-10-at-18-51-59.jpg", 
    link: "https://mercadolivre.com/sec/2Aq2MvL", 
    price: "R$ 1.900",
    featured: true,
    category: "SETUP"
  },
  { 
    id: 3, 
    name: "Kit Mobilador Pro 4 em 1", 
    image: "https://i.ibb.co/bg9LWLk6/Whats-App-Image-2026-02-10-at-18-54-49.jpg", 
    link: "https://mercadolivre.com/sec/17EqsTR", 
    price: "R$ 113,87",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 4, 
    name: "Kit Mochila Angelical + Estojo", 
    image: "https://i.ibb.co/S7WnyPH0/Whats-App-Image-2026-02-10-at-18-55-50.jpg", 
    link: "https://mercadolivre.com/sec/1z4ziNq", 
    price: "R$ 139,90",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 5, 
    name: "Luva de Dedo Gamer High Precision", 
    image: "https://i.ibb.co/RRcs7mj/Whats-App-Image-2026-02-10-at-18-57-10.jpg", 
    link: "https://mercadolivre.com/sec/2GyK9Sd", 
    price: "R$ 20,50",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 6, 
    name: "Cooler Magnético (Efeito Gelo)", 
    image: "https://i.ibb.co/qMxxWQfT/Whats-App-Image-2026-02-10-at-18-58-42.jpg", 
    link: "https://mercadolivre.com/sec/1xfvSLn", 
    price: "R$ 52,54", 
    featured: true,
    category: "MOBILE"
  },
  { 
    id: 7, 
    name: "Cooler Gamer Clip (Turbo Fan)", 
    image: "https://i.ibb.co/VW0r5PPZ/Whats-App-Image-2026-02-10-at-18-59-53.jpg", 
    link: "https://mercadolivre.com/sec/2XsXAGR", 
    price: "R$ 66,04",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 8, 
    name: "Garrafa Mestre (Edição Limitada)", 
    image: "https://i.ibb.co/WpVLFYvv/Whats-App-Image-2026-02-10-at-19-01-55.jpg", 
    link: "https://mercadolivre.com/sec/2mfrBDg", 
    price: "R$ 29,90",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 9, 
    name: "Gamepad Controller Ergonômico", 
    image: "https://i.ibb.co/Swj6VYyn/Whats-App-Image-2026-02-10-at-19-02-48.jpg", 
    link: "https://mercadolivre.com/sec/22cchND", 
    price: "R$ 55,00",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 10, 
    name: "Kit Angelical Azul (Moletom/Calça)", 
    image: "https://i.ibb.co/gbrKqD7c/Whats-App-Image-2026-02-10-at-19-03-57.jpg", 
    link: "https://mercadolivre.com/sec/18Td1s8", 
    price: "R$ 151,97",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 11, 
    name: "Kit Mestre Vermelho (Exclusivo)", 
    image: "https://i.ibb.co/M5WjtY4G/Whats-App-Image-2026-02-10-at-19-04-42.jpg", 
    link: "https://mercadolivre.com/sec/18Td1s8", 
    price: "R$ 151,97",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 12, 
    name: "Kit Angelical White (Moletom/Calça)", 
    image: "https://i.ibb.co/XcJb3ZZ/Whats-App-Image-2026-02-10-at-19-05-33.jpg", 
    link: "https://mercadolivre.com/sec/18Td1s8", 
    price: "R$ 151,97",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 13, 
    name: "Luva Raposa", 
    image: "https://i.ibb.co/fVPSbH3x/Whats-App-Image-2026-02-10-at-19-06-21.jpg", 
    link: "https://mercadolivre.com/sec/2VFEAEY", 
    price: "R$ 57,24",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 14, 
    name: "Kit Teclado Completo", 
    image: "https://i.ibb.co/7tRv75KP/Whats-App-Image-2026-02-10-at-19-07-21.jpg", 
    link: "https://mercadolivre.com/sec/2bdHvi5", 
    price: "R$ 130,00",
    featured: false,
    category: "SETUP"
  },
  { 
    id: 15, 
    name: "Cooler com Display de Temperatura", 
    image: "https://i.ibb.co/1fTfX5pJ/Whats-App-Image-2026-02-10-at-19-08-04.jpg", 
    link: "https://mercadolivre.com/sec/2JNhXGZ", 
    price: "R$ 50,72",
    featured: true,
    category: "MOBILE"
  },
  { 
    id: 16, 
    name: "Caneca Rumo ao Mestre", 
    image: "https://i.ibb.co/s9djfcRv/Whats-App-Image-2026-02-10-at-19-09-06.jpg", 
    link: "https://mercadolivre.com/sec/1S2Y8Z3", 
    price: "R$ 35,00",
    featured: false,
    category: "ACESSÓRIOS"
  },
  { 
    id: 17, 
    name: "Kit Adaptador Mobile Elite RGB", 
    image: "https://i.ibb.co/CqcnCw1/Whats-App-Image-2026-02-10-at-19-09-44.jpg", 
    link: "https://mercadolivre.com/sec/2a2cKqD", 
    price: "R$ 175,99",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 18, 
    name: "Luva de Dedo Gamer Precisão", 
    image: "https://i.ibb.co/5x66TmbJ/Whats-App-Image-2026-02-10-at-19-11-09.jpg", 
    link: "https://mercadolivre.com/sec/2dFukaz", 
    price: "R$ 73,88",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 19, 
    name: "Teclado Mecânico Compacto Custom", 
    image: "https://i.ibb.co/m5sq3T9q/Whats-App-Image-2026-02-10-at-19-12-08.jpg", 
    link: "https://mercadolivre.com/sec/1ckrasj", 
    price: "R$ 313,17",
    featured: true,
    category: "SETUP"
  },
  { 
    id: 20, 
    name: "Teclado Gamer Razer Cynosa", 
    image: "https://i.ibb.co/0R3cVX3b/Whats-App-Image-2026-02-10-at-19-13-48.jpg", 
    link: "https://mercadolivre.com/sec/2t5MgNf", 
    price: "R$ 357,59",
    featured: false,
    category: "SETUP"
  },
  { 
    id: 21, 
    name: "Kit Gamer 3 em 1 Dragon War", 
    image: "https://i.ibb.co/jZybn0Pz/Whats-App-Image-2026-02-10-at-19-14-46.jpg", 
    link: "https://mercadolivre.com/sec/153mABF", 
    price: "R$ 153,59",
    featured: false,
    category: "SETUP"
  },
  { 
    id: 22, 
    name: "Controle Bluetooth Mobile Pro", 
    image: "https://i.ibb.co/vCZbtYk2/Whats-App-Image-2026-02-10-at-19-16-00.jpg", 
    link: "https://mercadolivre.com/sec/2tjYbXE", 
    price: "R$ 78,00",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 23, 
    name: "Adaptador Hub USB 3.0 (4 Portas)", 
    image: "https://i.ibb.co/hJRbmfn7/Whats-App-Image-2026-02-10-at-19-16-54.jpg", 
    link: "https://mercadolivre.com/sec/2JSknLx", 
    price: "R$ 74,10",
    featured: false,
    category: "MOBILE"
  },
  { 
    id: 24, 
    name: "Controle Gamer Transparente RGB", 
    image: "https://i.ibb.co/KzmBJnDw/Whats-App-Image-2026-02-10-at-19-41-15.jpg", 
    link: "https://mercadolivre.com/sec/1oyKKwJ", 
    price: "R$ 269,99",
    featured: true,
    category: "MOBILE"
  },
  { 
    id: 25, 
    name: "PC Gamer Arena (Processador I5)", 
    image: "https://i.ibb.co/ZpP7X8Tc/Whats-App-Image-2026-02-10-at-19-42-41.jpg", 
    link: "https://mercadolivre.com/sec/23GywDk", 
    price: "R$ 1.576",
    featured: true,
    category: "SETUP"
  },
  { 
    id: 26, 
    name: "PC Gamer BRX (I5, 16GB, SSD 480GB)", 
    image: "https://i.ibb.co/20wzPmDR/Whats-App-Image-2026-02-10-at-19-43-51.jpg", 
    link: "https://mercadolivre.com/sec/2nsHbDo", 
    price: "R$ 2.102",
    featured: true,
    category: "SETUP"
  },
  { 
    id: 27, 
    name: "Kit Periféricos Gamer Profissional", 
    image: "https://i.ibb.co/Ngcw3VV4/Whats-App-Image-2026-02-10-at-19-45-54.jpg", 
    link: "https://mercadolivre.com/sec/1EjpAFh", 
    price: "R$ 3.812",
    featured: false,
    category: "SETUP"
  },
];

export default function Store() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("TODOS");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // --- LÓGICA DO CARROSSEL ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % PRODUCTS.length);
    }, 3000); // 3000ms = 3 segundos

    return () => clearInterval(timer);
  }, []);

  const bannerProduct = PRODUCTS[currentBannerIndex];

  // Filtros
  const filteredProducts = filter === "TODOS" 
    ? PRODUCTS 
    : filter === "DESTAQUES"
      ? PRODUCTS.filter(p => p.featured)
      : PRODUCTS.filter(p => p.category === filter);

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
            src={bannerProduct.image} 
            alt="Destaque" 
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
          
          <div className="absolute inset-0 p-6 flex flex-col justify-center items-start">
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
          </div>
          
          {/* Indicadores do Carrossel */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
             {PRODUCTS.slice(0, 5).map((_, idx) => (
               <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentBannerIndex % 5 ? "w-6 bg-orange-500" : "w-1 bg-white/30"}`} />
             ))}
          </div>
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
