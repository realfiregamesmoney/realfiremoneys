import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PartnershipCapture from "@/components/partnership/PartnershipCapture";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Partnership() {
    const navigate = useNavigate();
    const [referralLink, setReferralLink] = useState("");
    const [referralCount, setReferralCount] = useState(0);
    const [confirmedCount, setConfirmedCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/auth");
                return;
            }
            const link = `${window.location.origin}/auth?ref=${user.id}`;
            setReferralLink(link);

            // Total de indicados (qualquer status)
            const { count: total } = await supabase
                .from("referrals")
                .select("*", { count: "exact", head: true })
                .eq("referrer_id", user.id);
            setReferralCount(total || 0);

            // Total de indicados que CONFIRMARAM (fizeram depósito)
            const { count: confirmed } = await supabase
                .from("referrals")
                .select("*", { count: "exact", head: true })
                .eq("referrer_id", user.id)
                .eq("status", "confirmed");
            setConfirmedCount(confirmed || 0);
        };
        fetchData();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-orange-500/30">
            <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 shadow-lg mb-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 text-white">
                        <Briefcase className="h-5 w-5 text-orange-500" /> Trabalhe Conosco
                    </h1>
                </div>
            </div>

            <div className="p-4">
                <PartnershipCapture referralLink={referralLink} referralCount={referralCount} confirmedCount={confirmedCount} isStandalone={true} />
            </div>
        </div>
    );
}
