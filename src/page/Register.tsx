import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, getAllUsers } from '../firebaseApp';
import { doc, updateDoc } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    points: number;
    photoURL?: string;
    attendance?: {
        day1?: boolean;
        day2?: boolean;
        day3?: boolean;
    };
}

export default function Register() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isRegister = currentUser?.role === 'register';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
    const hasPermission = isRegister || isAdmin;

    // Check if user has permission (Register, Admin, or SuperAdmin only)
    useEffect(() => {
        if (currentUser && !['register', 'admin', 'superadmin'].includes(currentUser.role || '')) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            navigate('/');
        }
    }, [currentUser, navigate]);

    // Load users when user is authenticated and has permission
    useEffect(() => {
        if (currentUser && hasPermission) {
            loadUsers();
        }
    }, [currentUser, hasPermission]);

    const loadUsers = async () => {
        console.log('🔄 Loading users for Register page...');
        setLoadingUsers(true);
        try {
            const allUsers = await getAllUsers();
            console.log('✅ Loaded users:', allUsers.length);
            
            // Sort by displayName
            allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
            setUsers(allUsers);
        } catch (error) {
            console.error('❌ Failed to load users:', error);
            alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + (error as Error).message);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAttendanceChange = async (userId: string, day: 'day1' | 'day2' | 'day3', checked: boolean) => {
        try {
            const userRef = doc(db, 'users', userId);
            // ใช้ attendance.day1, attendance.day2, attendance.day3 เหมือน Admin
            await updateDoc(userRef, {
                [`attendance.${day}`]: checked
            });
            
            console.log(`✅ Updated attendance.${day} for user ${userId} to ${checked}`);
            
            // Update local state
            setUsers(users.map(u => 
                u.uid === userId 
                    ? { ...u, attendance: { ...u.attendance, [day]: checked } }
                    : u
            ));
        } catch (error) {
            console.error('❌ Failed to update attendance:', error);
            alert('ไม่สามารถอัพเดตการเข้างานได้: ' + (error as Error).message);
        }
    };

    // Filter users based on search query
    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Debug log
    useEffect(() => {
        console.log('📊 Register page state:', {
            currentUser: currentUser?.email,
            role: currentUser?.role,
            hasPermission,
            usersCount: users.length,
            loadingUsers
        });
    }, [currentUser, hasPermission, users.length, loadingUsers]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            📋 ระบบเช็คเข้างาน
                        </h1>
                        <p className="text-blue-100">บันทึกการเข้าร่วมงาน EGOKE</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        ← กลับหน้าหลัก
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">📅 เช็คการเข้างาน</h2>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors"
                        >
                            🔄 รีเฟรช
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="🔍 ค้นหาชื่อหรืออีเมล..."
                                className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800"
                            />
                            <span className="absolute left-4 top-3.5 text-xl">🔍</span>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-2.5 bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1 rounded-lg text-sm font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            แสดง {filteredUsers.length} จาก {users.length} ผู้ใช้
                        </p>
                    </div>

                    {loadingUsers ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                                        <th className="text-left p-3 font-bold text-gray-700">อีเมล</th>
                                        <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                        <th className="text-center p-3 font-bold text-gray-700">Role</th>
                                        <th className="text-center p-3 font-bold text-gray-700">การเข้างาน</th>
                                        <th className="text-right p-3 font-bold text-gray-700">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.uid} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 text-sm text-gray-800">{user.email}</td>
                                            <td className="p-3 text-sm text-gray-800">{user.displayName}</td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                                    user.role === 'superadmin' ? 'bg-red-500 text-white' :
                                                    user.role === 'admin' ? 'bg-purple-500 text-white' :
                                                    user.role === 'staff' ? 'bg-blue-500 text-white' :
                                                    user.role === 'register' ? 'bg-green-500 text-white' :
                                                    'bg-gray-300 text-gray-700'
                                                }`}>
                                                    {user.role === 'superadmin' ? '👑 SuperAdmin' :
                                                     user.role === 'admin' ? '🛡️ Admin' :
                                                     user.role === 'staff' ? '🔧 Staff' :
                                                     user.role === 'register' ? '📋 Register' :
                                                     '👤 User'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-3">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={user.attendance?.day1 || false}
                                                            onChange={(e) => handleAttendanceChange(user.uid, 'day1', e.target.checked)}
                                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-semibold text-blue-600">D1</span>
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={user.attendance?.day2 || false}
                                                            onChange={(e) => handleAttendanceChange(user.uid, 'day2', e.target.checked)}
                                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                                        />
                                                        <span className="text-sm font-semibold text-green-600">D2</span>
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={user.attendance?.day3 || false}
                                                            onChange={(e) => handleAttendanceChange(user.uid, 'day3', e.target.checked)}
                                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm font-semibold text-purple-600">D3</span>
                                                    </label>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-mono text-sm text-gray-700">
                                                {user.points.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredUsers.length === 0 && !loadingUsers && (
                                <div className="text-center py-12 text-gray-500">
                                    {searchQuery ? (
                                        <div>
                                            <p className="text-lg font-semibold mb-2">ไม่พบผู้ใช้ที่ค้นหา</p>
                                            <p className="text-sm">ลองค้นหาด้วยคำอื่น</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-lg font-semibold mb-2">ไม่พบข้อมูลผู้ใช้</p>
                                            <p className="text-sm text-gray-400">Total users loaded: {users.length}</p>
                                            <button
                                                onClick={loadUsers}
                                                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
                                            >
                                                🔄 โหลดข้อมูลอีกครั้ง
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="text-sm text-blue-800">
                            <strong>ℹ️ คำแนะนำ:</strong>
                            <ul className="list-disc ml-4 mt-2 space-y-1">
                                <li><span className="text-blue-600 font-bold">D1</span> = วันที่ 1 ของงาน</li>
                                <li><span className="text-green-600 font-bold">D2</span> = วันที่ 2 ของงาน</li>
                                <li><span className="text-purple-600 font-bold">D3</span> = วันที่ 3 ของงาน</li>
                                <li className="mt-2 pt-2 border-t border-blue-200">
                                    ✅ ติ๊กเครื่องหมายเพื่อบันทึกการเข้างาน
                                </li>
                                <li>📊 ข้อมูลจะถูกบันทึกอัตโนมัติทันที</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
