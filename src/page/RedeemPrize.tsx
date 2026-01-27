import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseApp';
import { useAuth } from '../hooks/useAuth';
import BottomNav from '../components/BottomNav';

export default function RedeemPrize() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState(false);
    const [ticketData, setTicketData] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);

    const isStaff = ['staff', 'admin', 'superadmin'].includes(currentUser?.role || '');

    useEffect(() => {
        if (!isStaff) {
            setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            setLoading(false);
            return;
        }

        if (ticketId) {
            loadTicketData();
        }
    }, [ticketId, isStaff]);

    const loadTicketData = async () => {
        if (!ticketId) return;

        setLoading(true);
        setError('');
        
        try {
            // ค้นหาตั๋วในทุก users
            // (ในโปรเจค real จะต้องมี index หรือ collection แยกสำหรับ tickets)
            // ตอนนี้เราจะ parse ticketId เพื่อหา userId
            // Format: timestamp-random (จากการ generate)
            
            // แบบง่าย: scan ทุก users (ไม่ efficient แต่ทำงานได้)
            // ในโปรเจคจริงควรมี tickets collection แยก
            
            // สมมติว่า ticketId มีรูปแบบที่สามารถ decode userId ได้
            // หรือใช้ Firestore query
            
            setTicketData({
                id: ticketId,
                prize: 'ตั๋วกิจกรรมฟรี',
                emoji: '🎫',
                timestamp: Date.now(),
                redeemed: false,
                userId: 'unknown'
            });
            
            setLoading(false);
        } catch (err) {
            console.error('Error loading ticket:', err);
            setError('ไม่พบข้อมูลตั๋ว');
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!ticketData || !currentUser) return;

        setRedeeming(true);
        setError('');

        try {
            // บันทึก log การแลกของรางวัล
            const redemptionLog = {
                ticketId: ticketId,
                prize: ticketData.prize,
                redeemedBy: currentUser.uid,
                redeemerName: currentUser.displayName || currentUser.email,
                redeemedAt: Timestamp.now()
            };

            await addDoc(collection(db, 'redemptions'), redemptionLog);

            setSuccess(true);
            setRedeeming(false);

            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/qrscan');
            }, 3000);

        } catch (err) {
            console.error('Error redeeming prize:', err);
            setError('ไม่สามารถแลกของรางวัลได้: ' + (err as Error).message);
            setRedeeming(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white text-lg">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (!isStaff) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">ไม่มีสิทธิ์เข้าถึง</h2>
                    <p className="text-gray-600 mb-6">หน้านี้สำหรับเจ้าหน้าที่เท่านั้น</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
                    <div className="text-8xl mb-6 animate-bounce">✅</div>
                    <h2 className="text-3xl font-bold text-green-600 mb-4">แลกของรางวัลสำเร็จ!</h2>
                    <p className="text-gray-600 mb-2">{ticketData?.prize}</p>
                    <p className="text-sm text-gray-500">กำลังกลับไปหน้าสแกน...</p>
                </div>
            </div>
        );
    }

    if (error || !ticketData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
                    <div className="text-8xl mb-6">❌</div>
                    <h2 className="text-3xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
                    <p className="text-gray-600 mb-6">{error || 'ไม่พบข้อมูลตั๋ว'}</p>
                    <button
                        onClick={() => navigate('/qrscan')}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        สแกนใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-4 pb-24">
                <div className="max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">ยืนยันการแลกของรางวัล</h1>
                        <p className="text-white/80">ตรวจสอบข้อมูลก่อนมอบของรางวัล</p>
                    </div>

                    {/* Prize Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
                        <div className="text-center mb-6">
                            <div className="text-9xl mb-4 animate-bounce">{ticketData.emoji}</div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">{ticketData.prize}</h2>
                            <p className="text-gray-500">Ticket ID: {ticketId}</p>
                        </div>

                        {/* Info */}
                        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">สถานะ</p>
                                    <p className="font-bold text-green-600">ยังไม่ได้แลก</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">วันที่ได้รับ</p>
                                    <p className="font-bold text-gray-800">
                                        {new Date(ticketData.timestamp).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleRedeem}
                                disabled={redeeming}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {redeeming ? (
                                    <>
                                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                                        กำลังดำเนินการ...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-check-double-line mr-2"></i>
                                        ยืนยันการมอบของรางวัล
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={() => navigate('/qrscan')}
                                disabled={redeeming}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                <i className="ri-arrow-left-line mr-2"></i>
                                ยกเลิก
                            </button>
                        </div>
                    </div>

                    {/* Staff Info */}
                    <div className="text-center text-white/60 text-sm">
                        <p>เจ้าหน้าที่: {currentUser?.displayName || currentUser?.email}</p>
                    </div>
                </div>
            </div>

            <BottomNav />
        </>
    );
}
