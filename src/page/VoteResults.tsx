import { useState, useEffect } from 'react';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { useAuth } from '../hooks/useAuth';
import BottomNav from "../components/BottomNav";
import AnimatedNumber from '../components/AnimatedNumber';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseApp';

const CATEGORIES = [
    { id: 'band', name: 'Band', emoji: '🎸', description: 'วงดนตรี' },
    { id: 'solo', name: 'Solo', emoji: '🎤', description: 'นักร้องเดี่ยว' },
    { id: 'cover', name: 'Cover', emoji: '💃', description: 'Cover Dance' },
];

export default function VoteResults() {
    const { currentUser } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<string>('band');
    const { categories: voteSettings, loading: settingsLoading } = useVoteSettings();
    const { candidates: allCandidates, loading: candidatesLoading } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    // ✅ โหลด Podium Display Mode จาก settings/podium
    const [scoreDisplayMode, setScoreDisplayMode] = useState<'app30' | 'purchase70' | 'total100'>('total100');
    const [announcementVisible, setAnnouncementVisible] = useState(true);

    useEffect(() => {
        // โหลด Podium Settings
        const loadPodiumSettings = async () => {
            const podiumRef = doc(db, 'settings', 'podium');
            const podiumSnap = await getDoc(podiumRef);
            if (podiumSnap.exists()) {
                const data = podiumSnap.data();
                setScoreDisplayMode(data.displayMode || 'total100');
            }
        };

        // โหลด Announcement Settings
        const loadAnnouncementSettings = async () => {
            const announcementRef = doc(db, 'settings', 'announcement');
            const announcementSnap = await getDoc(announcementRef);
            if (announcementSnap.exists()) {
                const data = announcementSnap.data();
                setAnnouncementVisible(data.visible !== false);
            }
        };

        loadPodiumSettings();
        loadAnnouncementSettings();
    }, []);

    // ✅ คำนวณคะแนนตามโหมด
    const calculateScores = (candidate: any) => {
        const score30 = (candidate.voteCount || 0) * 400 * 0.3; // App 30%
        const score70 = (candidate.purchasePoints || 0) * 0.7;   // Purchase 70%
        const totalScore = score30 + score70;                    // Total 100%
        return { score30, score70, totalScore };
    };

    // ✅ Filter เฉพาะผู้สมัครที่ isActive = true (นับคะแนนใน Podium)
    const activeCandidates = allCandidates.filter(c => c.isActive === true);

    const categorySettings = voteSettings[selectedCategory];
    const isOpen = categorySettings?.isOpen || false;
    const isStaff = ['staff', 'admin', 'superadmin'].includes(currentUser?.role || '');

    // ✅ User ธรรมดาเห็นผลได้เฉพาะตอนปิดโหวตแล้ว
    // ✅ Staff/Admin เห็น real-time ได้ตลอด
    const canViewResults = isStaff || !isOpen;

    // Auto-select first closed category with results
    useEffect(() => {
        if (!settingsLoading && Object.keys(voteSettings).length > 0) {
            const closedWithVotes = Object.entries(voteSettings).find(([_, settings]) => {
                return !settings.isOpen; // ปิดแล้ว
            });
            if (closedWithVotes) {
                setSelectedCategory(closedWithVotes[0]);
            }
        }
    }, [voteSettings, settingsLoading]);

    // ✅ Sort candidates ตามโหมดที่เลือก
    const sortedCandidates = [...activeCandidates].sort((a, b) => {
        const scoresA = calculateScores(a);
        const scoresB = calculateScores(b);
        
        if (scoreDisplayMode === 'app30') {
            return scoresB.score30 - scoresA.score30;
        } else if (scoreDisplayMode === 'purchase70') {
            return scoresB.score70 - scoresA.score70;
        } else {
            return scoresB.totalScore - scoresA.totalScore;
        }
    });

    const maxVotes = sortedCandidates.length > 0 
        ? (() => {
            const scores = calculateScores(sortedCandidates[0]);
            if (scoreDisplayMode === 'app30') return scores.score30;
            if (scoreDisplayMode === 'purchase70') return scores.score70;
            return scores.totalScore;
        })()
        : 1;

    if (settingsLoading || candidatesLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white text-lg">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // ✅ User ธรรมดาไม่สามารถดูผลโหวตขณะเปิดอยู่
    if (!canViewResults) {
        return (
            <div className="min-h-screen relative overflow-hidden pb-24">
                {/* Background */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/temple-bg.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-red-900/40" />

                <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-6">
                    {/* Header */}
                    <div className="text-center mb-6 animate-fade-in">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-xl border-2 border-white/30"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                        />
                        <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">ผลการโหวต</h1>
                    </div>

                    {/* Voting Still Open Notice */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto text-center animate-fade-in">
                        <div className="text-8xl mb-6">⏳</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">การโหวตยังเปิดอยู่</h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            ผลการโหวตจะประกาศหลังจากปิดการโหวตแล้วเท่านั้น
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800 text-left">
                                <span className="font-bold">📌 หมายเหตุ:</span> เพื่อความเป็นธรรม 
                                ผลการโหวตจะแสดงเมื่อปิดการโหวตแล้วเท่านั้น กรุณารอติดตาม!
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold">กำลังเปิดรับโหวต...</span>
                        </div>
                    </div>
                </div>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background with overlay */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 via-amber-900/40 to-red-800/50 backdrop-blur-[1px]" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-amber-400/30 rounded-full animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-40 right-20 w-3 h-3 bg-red-400/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-yellow-400/30 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-60 right-1/3 w-2 h-2 bg-amber-300/20 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-6 pb-6">
                {/* Header with elegant design */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center gap-4 mb-4">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-20 h-20 rounded-2xl shadow-2xl border-4 border-amber-400/80 ring-4 ring-white/20"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                        />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-2xl mb-3">
                        ผลการโหวต
                    </h1>
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 shadow-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                        <p className="text-white font-medium">ดูผลคะแนนแบบ Real-time</p>
                    </div>
                </div>

                {/* Vote Weight Notice - ตามภาพ */}
                {announcementVisible && (
                    <div className="mb-8 animate-fade-in">
                        <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-3xl">📋</span>
                                <h3 className="font-bold text-2xl bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
                                    ประกาศสำคัญ
                                </h3>
                            </div>
                            
                            {/* กล่องสีเหลือง - ข้อความหลัก */}
                            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-l-4 border-yellow-500 rounded-2xl p-6 mb-4 shadow-md">
                                <p className="text-gray-800 text-base leading-relaxed font-medium text-center">
                                    ผลการโหวตที่แสดงนี้ยังไม่ใช่ผลสุดท้าย
                                </p>
                            </div>

                            {/* รายการคะแนน */}
                            <div className="space-y-4 pl-4">
                                {/* 30% */}
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-gray-800 leading-relaxed">
                                        คะแนนจากเว็บใช้ตีกลิดเป็นเพียง <span className="font-bold text-blue-700 text-lg">30%</span> ของคะแนนรวมทั้งหมด
                                    </p>
                                </div>
                                
                                {/* 70% */}
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-gray-800 leading-relaxed">
                                        คะแนนส่วนที่เหลือ <span className="font-bold text-purple-700 text-lg">70%</span> จะคิดจากรางวัลและการตัดสินภายในงาน EGOKE สำหรับประกาศผู้ชนะในหมวด Band, Solo และ Cover Dance
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Tabs - Modern Design */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl mb-8 animate-fade-in border border-white/50">
                    <div className="grid grid-cols-3 gap-4">
                        {CATEGORIES.map((cat) => {
                            const settings = voteSettings[cat.id];
                            const isSelected = selectedCategory === cat.id;
                            const isCategoryOpen = settings?.isOpen || false;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`relative p-5 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-red-500 via-red-600 to-amber-600 text-white shadow-2xl scale-105 ring-4 ring-white/50'
                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg'
                                    }`}
                                >
                                    <div className="text-4xl mb-2 drop-shadow-lg">{cat.emoji}</div>
                                    <div className={`text-base font-bold ${isSelected ? 'text-white drop-shadow-md' : ''}`}>
                                        {cat.name}
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {isStaff && (
                                        <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-2xl border-2 ${
                                            isCategoryOpen
                                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-300 animate-pulse'
                                                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300'
                                        }`}>
                                            {isCategoryOpen ? '● LIVE' : '● ปิด'}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Notice - แสดงเฉพาะ Staff/Admin */}
                {isOpen && isStaff && (
                    <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white rounded-3xl p-5 mb-8 shadow-2xl animate-fade-in text-center border border-green-400">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                            <div className="font-bold text-xl drop-shadow-md">กำลังเปิดรับโหวต (LIVE)</div>
                        </div>
                        <div className="text-sm text-green-50 font-medium">
                            🔓 คุณสามารถดูผลโหวต Real-time ได้ในฐานะ {currentUser?.role?.toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Podium Display - Top 3 Premium Design */}
                {sortedCandidates.length >= 3 && (
                    <div className="mb-8 animate-fade-in">
                        {/* Podium Container with Royal Theme */}
                        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                            {/* Luxurious Red Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-800 to-red-950" />
                            {/* Golden Pattern Overlay */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            }} />
                            {/* Spotlight Effect */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-amber-400/20 via-transparent to-transparent rounded-full blur-3xl" />
                            
                            {/* Golden Border Frame - ลด padding บนมือถือ */}
                            <div className="relative p-1.5 md:p-3">
                                <div className="border-4 border-amber-400/60 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent p-4 md:p-8">
                                    {/* Header with Golden Accents - ลดขนาดบนมือถือ */}
                                    <div className="text-center mb-6 md:mb-10">
                                        <div className="inline-flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                            <div className="h-px w-8 md:w-20 bg-gradient-to-r from-transparent to-amber-400" />
                                            <span className="text-3xl md:text-5xl drop-shadow-lg animate-pulse">🏆</span>
                                            <div className="h-px w-8 md:w-20 bg-gradient-to-l from-transparent to-amber-400" />
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-2xl mb-2 md:mb-3 tracking-wide">
                                            TOP 3
                                        </h2>
                                        <p className="text-amber-200/90 font-medium text-sm md:text-lg">ผู้สมัครที่ได้รับความนิยมสูงสุด</p>
                                        <div className="flex items-center justify-center gap-2 mt-2 md:mt-3">
                                            <div className="w-12 md:w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                            <span className="text-amber-400 text-sm md:text-base">✦</span>
                                            <div className="w-12 md:w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                        </div>
                                    </div>
                                    
                                    {/* Podium Stage - ลด gap และขนาดบนมือถือ */}
                                    <div className="flex items-end justify-center gap-2 md:gap-6 max-w-4xl mx-auto px-1 md:px-2">
                                        {/* 2nd Place - Silver - ลดขนาดบนมือถือ */}
                                        <div className="flex-1 max-w-[110px] md:max-w-[170px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                            <div className="relative group">
                                                {/* Glow Effect */}
                                                <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                                                
                                                {/* Medal */}
                                                <div className="absolute -top-3 md:-top-5 left-1/2 -translate-x-1/2 z-20">
                                                    <div className="relative">
                                                        <span className="text-3xl md:text-5xl drop-shadow-xl">🥈</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Card Top */}
                                                <div className="relative bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 rounded-t-2xl pt-6 md:pt-8 pb-3 md:pb-4 px-2 md:px-4 text-center border-2 border-amber-500/70 border-b-0 shadow-inner">
                                                    {/* Golden Corner Decorations */}
                                                    <div className="absolute top-0 left-0 w-4 md:w-6 h-4 md:h-6 border-t-2 border-l-2 border-amber-400 rounded-tl-xl" />
                                                    <div className="absolute top-0 right-0 w-4 md:w-6 h-4 md:h-6 border-t-2 border-r-2 border-amber-400 rounded-tr-xl" />
                                                    
                                                    {/* Avatar */}
                                                    <div className="relative w-14 h-14 md:w-20 md:h-20 mx-auto mb-2 md:mb-3">
                                                        <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 to-gray-300 rounded-xl blur-sm" />
                                                        <div className="relative w-full h-full rounded-xl overflow-hidden bg-white ring-2 ring-amber-400/50 shadow-xl">
                                                            {sortedCandidates[1].imageUrl ? (
                                                                <img src={sortedCandidates[1].imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-2xl md:text-4xl bg-gradient-to-br from-gray-100 to-gray-200">2</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Name */}
                                                    <div className="font-bold text-gray-800 text-xs md:text-base mb-1.5 md:mb-2 line-clamp-2 drop-shadow-sm leading-tight">{sortedCandidates[1].name}</div>
                                                    
                                                    {/* Vote Count */}
                                                    <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-full inline-block shadow-lg">
                                                        <span className="text-sm md:text-xl font-bold">
                                                            <AnimatedNumber value={(() => {
                                                                const scores = calculateScores(sortedCandidates[1]);
                                                                if (scoreDisplayMode === 'app30') return Math.round(scores.score30);
                                                                if (scoreDisplayMode === 'purchase70') return Math.round(scores.score70);
                                                                return Math.round(scores.totalScore);
                                                            })()} />
                                                        </span>
                                                        <span className="text-[10px] md:text-xs ml-0.5 md:ml-1 opacity-80">คะแนน</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Podium Base */}
                                                <div className="relative bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 h-20 md:h-28 rounded-b-xl flex items-center justify-center border-2 border-amber-500/70 border-t-0 shadow-2xl overflow-hidden">
                                                    {/* Shine Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine" />
                                                    <div className="text-4xl md:text-6xl font-black text-white/90 drop-shadow-2xl" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>2</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 1st Place - Gold Champion - ลดขนาดบนมือถือ */}
                                        <div className="flex-1 max-w-[130px] md:max-w-[200px] animate-fade-in -mt-4 md:-mt-6" style={{ animationDelay: '0.1s' }}>
                                            <div className="relative group">
                                                {/* Glow Effect */}
                                                <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-3xl blur-lg opacity-50 group-hover:opacity-70 transition duration-500 animate-pulse" />
                                                
                                                {/* Crown */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                                    <div className="relative">
                                                        <span className="text-5xl md:text-6xl drop-shadow-2xl animate-bounce-soft">👑</span>
                                                        {/* Sparkles */}
                                                        <span className="absolute -top-2 -left-4 text-xl animate-pulse" style={{ animationDelay: '0.2s' }}>✨</span>
                                                        <span className="absolute -top-2 -right-4 text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Card Top - ลดขนาดบนมือถือ */}
                                                <div className="relative bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-300 rounded-t-2xl pt-7 md:pt-10 pb-3 md:pb-5 px-2 md:px-4 text-center border-3 border-amber-500 border-b-0 shadow-inner">
                                                    {/* Golden Corner Decorations */}
                                                    <div className="absolute top-0 left-0 w-5 md:w-8 h-5 md:h-8 border-t-3 border-l-3 border-amber-500 rounded-tl-xl" />
                                                    <div className="absolute top-0 right-0 w-5 md:w-8 h-5 md:h-8 border-t-3 border-r-3 border-amber-500 rounded-tr-xl" />
                                                    
                                                    {/* Avatar */}
                                                    <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto mb-2 md:mb-4">
                                                        <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-xl blur-sm animate-pulse" />
                                                        <div className="relative w-full h-full rounded-xl overflow-hidden bg-white ring-3 ring-amber-500 shadow-2xl">
                                                            {sortedCandidates[0].imageUrl ? (
                                                                <img src={sortedCandidates[0].imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-3xl md:text-5xl bg-gradient-to-br from-amber-100 to-yellow-200">1</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Name */}
                                                    <div className="font-bold text-amber-900 text-sm md:text-lg mb-1.5 md:mb-3 line-clamp-2 drop-shadow-sm leading-tight">{sortedCandidates[0].name}</div>
                                                    
                                                    {/* Vote Count */}
                                                    <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white px-2.5 md:px-4 py-1 md:py-2 rounded-full inline-block shadow-lg">
                                                        <span className="text-base md:text-2xl font-bold">
                                                            <AnimatedNumber value={(() => {
                                                                const scores = calculateScores(sortedCandidates[0]);
                                                                if (scoreDisplayMode === 'app30') return Math.round(scores.score30);
                                                                if (scoreDisplayMode === 'purchase70') return Math.round(scores.score70);
                                                                return Math.round(scores.totalScore);
                                                            })()} />
                                                        </span>
                                                        <span className="text-[10px] md:text-sm ml-0.5 md:ml-1.5 opacity-90">คะแนน</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Podium Base - Tallest */}
                                                <div className="relative bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 h-24 md:h-36 rounded-b-xl flex items-center justify-center border-3 border-amber-500 border-t-0 shadow-2xl overflow-hidden">
                                                    {/* Shine Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine" />
                                                    <div className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.4)' }}>1</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3rd Place - Bronze - ลดขนาดบนมือถือ */}
                                        <div className="flex-1 max-w-[110px] md:max-w-[170px] animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                            <div className="relative group">
                                                {/* Glow Effect */}
                                                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-600 to-orange-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                                                
                                                {/* Medal */}
                                                <div className="absolute -top-3 md:-top-5 left-1/2 -translate-x-1/2 z-20">
                                                    <div className="relative">
                                                        <span className="text-3xl md:text-5xl drop-shadow-xl">🥉</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Card Top */}
                                                <div className="relative bg-gradient-to-br from-orange-200 via-amber-100 to-orange-300 rounded-t-2xl pt-6 md:pt-8 pb-3 md:pb-4 px-2 md:px-4 text-center border-2 border-amber-500/70 border-b-0 shadow-inner">
                                                    {/* Golden Corner Decorations */}
                                                    <div className="absolute top-0 left-0 w-4 md:w-6 h-4 md:h-6 border-t-2 border-l-2 border-amber-400 rounded-tl-xl" />
                                                    <div className="absolute top-0 right-0 w-4 md:w-6 h-4 md:h-6 border-t-2 border-r-2 border-amber-400 rounded-tr-xl" />
                                                    
                                                    {/* Avatar */}
                                                    <div className="relative w-14 h-14 md:w-20 md:h-20 mx-auto mb-2 md:mb-3">
                                                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur-sm" />
                                                        <div className="relative w-full h-full rounded-xl overflow-hidden bg-white ring-2 ring-amber-400/50 shadow-xl">
                                                            {sortedCandidates[2].imageUrl ? (
                                                                <img src={sortedCandidates[2].imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-2xl md:text-4xl bg-gradient-to-br from-orange-100 to-amber-200">3</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Name */}
                                                    <div className="font-bold text-orange-900 text-xs md:text-base mb-1.5 md:mb-2 line-clamp-2 drop-shadow-sm leading-tight">{sortedCandidates[2].name}</div>
                                                    
                                                    {/* Vote Count */}
                                                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-full inline-block shadow-lg">
                                                        <span className="text-sm md:text-xl font-bold">
                                                            <AnimatedNumber value={(() => {
                                                                const scores = calculateScores(sortedCandidates[2]);
                                                                if (scoreDisplayMode === 'app30') return Math.round(scores.score30);
                                                                if (scoreDisplayMode === 'purchase70') return Math.round(scores.score70);
                                                                return Math.round(scores.totalScore);
                                                            })()} />
                                                        </span>
                                                        <span className="text-[10px] md:text-xs ml-0.5 md:ml-1 opacity-80">คะแนน</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Podium Base - Shortest */}
                                                <div className="relative bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 h-16 md:h-24 rounded-b-xl flex items-center justify-center border-2 border-amber-500/70 border-t-0 shadow-2xl overflow-hidden">
                                                    {/* Shine Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine" />
                                                    <div className="text-4xl md:text-6xl font-black text-white/90 drop-shadow-2xl" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}>3</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Stats Summary - Inside Podium - ปรับขนาดให้เหมาะกับมือถือ */}
                                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-amber-400/30">
                                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                                            {/* ผู้สมัคร */}
                                            <div className="bg-gradient-to-br from-white/95 to-amber-50/90 rounded-lg md:rounded-xl p-2 md:p-4 border-2 border-amber-400/50 shadow-lg backdrop-blur-sm">
                                                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent mb-0.5 md:mb-1">
                                                    <AnimatedNumber value={sortedCandidates.length} />
                                                </div>
                                                <div className="text-[10px] md:text-sm font-semibold text-amber-900/80 leading-tight">ผู้สมัคร</div>
                                            </div>
                                            
                                            {/* โหวตทั้งหมด */}
                                            <div className="bg-gradient-to-br from-white/95 to-amber-50/90 rounded-lg md:rounded-xl p-2 md:p-4 border-2 border-amber-400/50 shadow-lg backdrop-blur-sm">
                                                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-0.5 md:mb-1">
                                                    {isStaff || !isOpen ? (
                                                        <AnimatedNumber value={totalVotes} />
                                                    ) : (
                                                        <span className="text-xl md:text-4xl">---</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] md:text-sm font-semibold text-amber-900/80 leading-tight">
                                                    {isStaff || !isOpen ? 'โหวตทั้งหมด' : 'ยังนับไม่ได้'}
                                                </div>
                                            </div>
                                            
                                            {/* สถานะ */}
                                            <div className="bg-gradient-to-br from-white/95 to-amber-50/90 rounded-lg md:rounded-xl p-2 md:p-4 border-2 border-amber-400/50 shadow-lg backdrop-blur-sm">
                                                <div className={`text-2xl md:text-4xl mb-0.5 md:mb-1 ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isOpen ? '●' : '●'}
                                                </div>
                                                <div className="text-[10px] md:text-sm font-semibold text-amber-900/80 leading-tight">{isOpen ? 'เปิดอยู่' : 'ปิดแล้ว'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}                {/* Results List */}
                <div className="space-y-4 animate-fade-in">
                    {sortedCandidates.map((candidate, index) => {
                        const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes * 100) : 0;
                        const barWidth = candidate.voteCount > 0 ? (candidate.voteCount / maxVotes * 100) : 0;
                        const isWinner = index === 0 && !isOpen;

                        return (
                            <div 
                                key={candidate.id}
                                className={`bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-102 ${
                                    isWinner ? 'ring-4 ring-amber-400' : ''
                                }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        {/* Rank Badge */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${
                                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg' :
                                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' :
                                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0 shadow-lg">
                                            {candidate.imageUrl ? (
                                                <img 
                                                    src={candidate.imageUrl} 
                                                    alt={candidate.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                                    {candidate.category === 'band' && '�'}
                                                    {candidate.category === 'solo' && '�'}
                                                    {candidate.category === 'cover' && '�'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-gray-800 truncate">{candidate.name}</h3>
                                            <p className="text-sm text-gray-600 truncate">{candidate.description}</p>
                                        </div>

                                        {/* Votes */}
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-red-600">
                                                <AnimatedNumber value={(() => {
                                                    const scores = calculateScores(candidate);
                                                    if (scoreDisplayMode === 'app30') return Math.round(scores.score30);
                                                    if (scoreDisplayMode === 'purchase70') return Math.round(scores.score70);
                                                    return Math.round(scores.totalScore);
                                                })()} />
                                            </div>
                                            <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${
                                                index === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                                                index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                                index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                                                'bg-gradient-to-r from-red-500 to-red-600'
                                            }`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {sortedCandidates.length === 0 && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center shadow-xl">
                            <div className="text-6xl mb-4">📋</div>
                            <div className="text-gray-500 text-lg">ยังไม่มีผู้สมัครในหมวดนี้</div>
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
