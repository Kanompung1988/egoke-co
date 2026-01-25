import { useState } from 'react';
import { db } from '../firebaseApp';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Query for user by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setMessage(`❌ ไม่พบผู้ใช้: ${email}\nกรุณาให้ผู้ใช้ login ก่อน`);
                setLoading(false);
                return;
            }

            // Update user document
            const userDoc = querySnapshot.docs[0];
            const userId = userDoc.id;

            await updateDoc(doc(db, 'users', userId), {
                role: 'staff',
                isStaff: true,
                points: 999999999,
                tickets: 999999,
                updatedAt: new Date()
            });

            setMessage(`✅ อัพเดทสิทธิ์สำเร็จ!\n📧 Email: ${email}\n🛡️ Role: staff (admin)\n💎 Points: 999,999,999\n🎫 Tickets: 999,999`);
            setEmail('');
        } catch (error: any) {
            setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">👑</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Super Admin</h1>
                    <p className="text-gray-600">อัพเดทสิทธิ์ผู้ใช้</p>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            📧 Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            required
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? '⏳ กำลังอัพเดท...' : '✅ ตั้งเป็น Admin/Staff'}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-4 rounded-xl whitespace-pre-line ${
                        message.startsWith('✅') 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-purple-600 hover:text-purple-700 font-bold"
                    >
                        ← กลับหน้าหลัก
                    </button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="text-xs text-yellow-800">
                        <strong>⚠️ หมายเหตุ:</strong>
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                            <li>ผู้ใช้ต้อง login ด้วย Google ก่อน</li>
                            <li>หลังอัพเดทให้ refresh หน้าเว็บ</li>
                            <li>สิทธิ์: staff, points: 999M, tickets: 999K</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
