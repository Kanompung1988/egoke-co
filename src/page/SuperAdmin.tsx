import { useState, useEffect, useContext } from 'react';
import { getAllUsers, setUserRole, isSuperAdmin } from '../firebaseApp';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../components/contexts/AuthContext';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    points: number;
}

export default function SuperAdmin() {
    const navigate = useNavigate();
    const { currentUser, loading: authLoading } = useContext(AuthContext);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedEmail, setSelectedEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<'user' | 'staff' | 'admin'>('user');
    const [searchQuery, setSearchQuery] = useState('');
    // const [editingUser, setEditingUser] = useState<UserData | null>(null); // Reserved for future use

    // Debug log
    useEffect(() => {
        console.log('🔍 SuperAdmin Debug:', {
            authLoading,
            currentUserEmail: currentUser?.email,
            currentUserRole: currentUser?.role,
            loading
        });
    }, [authLoading, currentUser, loading]);

    // เช็คสิทธิ์ SuperAdmin
    useEffect(() => {
        if (!authLoading) {
            const userEmail = currentUser?.email || null;
            if (!currentUser || !isSuperAdmin(userEmail)) {
                alert('⛔ คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                navigate('/');
            }
        }
    }, [currentUser, authLoading, navigate]);

    // โหลดรายชื่อ users ทั้งหมด
    useEffect(() => {
        async function loadUsers() {
            try {
                setLoading(true);
                const allUsers = await getAllUsers();
                setUsers(allUsers);
            } catch (error) {
                console.error('Error loading users:', error);
                setMessage('❌ ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
            } finally {
                setLoading(false);
            }
        }
        
        if (currentUser && !authLoading) {
            const userEmail = currentUser.email || null;
            if (isSuperAdmin(userEmail)) {
                loadUsers();
            }
        }
    }, [currentUser, authLoading]);

    const handleUpdateRole = async (email?: string, role?: 'user' | 'staff' | 'admin') => {
        const targetEmail = email || selectedEmail;
        const targetRole = role || selectedRole;

        if (!targetEmail) {
            setMessage('❌ กรุณาเลือกผู้ใช้');
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            const result = await setUserRole(targetEmail, targetRole);
            
            if (result.success) {
                setMessage(`✅ อัพเดท ${targetEmail} เป็น ${targetRole} สำเร็จ!`);
                // รีโหลดรายชื่อ users
                const allUsers = await getAllUsers();
                setUsers(allUsers);
                setSelectedEmail('');
                // setEditingUser(null); // Reserved for future use
                
                // ลบข้อความหลัง 3 วินาที
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(`❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating role:', error);
            setMessage('❌ เกิดข้อผิดพลาดในการอัพเดทสิทธิ์');
        } finally {
            setLoading(false);
        }
    };

    // กรองผู้ใช้ตามคำค้นหา
    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // จำนวนผู้ใช้แยกตาม role
    const userStats = {
        total: users.length,
        superadmin: users.filter(u => u.role === 'superadmin').length,
        admin: users.filter(u => u.role === 'admin').length,
        staff: users.filter(u => u.role === 'staff').length,
        user: users.filter(u => u.role === 'user').length,
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white text-lg">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    const userEmail = currentUser?.email || null;
    if (!currentUser || !isSuperAdmin(userEmail)) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">👑</div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Super Admin Panel</h1>
                                <p className="text-gray-600">{currentUser.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/Home')}
                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl transition-colors"
                        >
                            ← กลับ
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-2xl font-bold text-gray-800">{userStats.total}</div>
                        <div className="text-sm text-gray-600">ทั้งหมด</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 shadow-lg text-center border-2 border-purple-200">
                        <div className="text-3xl mb-2">👑</div>
                        <div className="text-2xl font-bold text-purple-700">{userStats.superadmin}</div>
                        <div className="text-sm text-purple-600">SuperAdmin</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 shadow-lg text-center border-2 border-blue-200">
                        <div className="text-3xl mb-2">🔧</div>
                        <div className="text-2xl font-bold text-blue-700">{userStats.admin}</div>
                        <div className="text-sm text-blue-600">Admin</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 shadow-lg text-center border-2 border-green-200">
                        <div className="text-3xl mb-2">👷</div>
                        <div className="text-2xl font-bold text-green-700">{userStats.staff}</div>
                        <div className="text-sm text-green-600">Staff</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 shadow-lg text-center border-2 border-gray-200">
                        <div className="text-3xl mb-2">👤</div>
                        <div className="text-2xl font-bold text-gray-700">{userStats.user}</div>
                        <div className="text-sm text-gray-600">User</div>
                    </div>
                </div>

                {/* Set Role Form */}
                <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🛡️ จัดการสิทธิ์ผู้ใช้</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <select
                            value={selectedEmail}
                            onChange={(e) => setSelectedEmail(e.target.value)}
                            className="p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                        >
                            <option value="">-- เลือกผู้ใช้ --</option>
                            {users.filter(u => u.role !== 'superadmin').map(user => (
                                <option key={user.uid} value={user.email}>
                                    {user.email} ({user.role})
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as 'user' | 'staff' | 'admin')}
                            className="p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                        >
                            <option value="user">👤 User (ผู้ใช้ทั่วไป)</option>
                            <option value="staff">👷 Staff (เจ้าหน้าที่)</option>
                            <option value="admin">🔧 Admin (ผู้ดูแล)</option>
                        </select>

                        <button
                            onClick={() => handleUpdateRole()}
                            disabled={loading || !selectedEmail}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ กำลังอัพเดท...' : '✅ อัพเดทสิทธิ์'}
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl animate-fade-in ${
                            message.startsWith('✅') 
                                ? 'bg-green-50 text-green-800 border border-green-200' 
                                : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            📋 รายชื่อผู้ใช้ทั้งหมด ({filteredUsers.length} คน)
                        </h2>
                        
                        {/* Search Box */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหา email, ชื่อ, role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none w-64"
                            />
                            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-200">
                                    <th className="p-3 text-left font-bold">Email</th>
                                    <th className="p-3 text-left font-bold">ชื่อ</th>
                                    <th className="p-3 text-center font-bold">Role</th>
                                    <th className="p-3 text-right font-bold">Points</th>
                                    <th className="p-3 text-center font-bold">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            ไม่พบผู้ใช้ที่ค้นหา
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.uid} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-sm">{user.email}</td>
                                            <td className="p-3">{user.displayName}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                    user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                    user.role === 'staff' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {user.role === 'superadmin' ? '👑 SuperAdmin' :
                                                     user.role === 'admin' ? '🔧 Admin' :
                                                     user.role === 'staff' ? '👷 Staff' :
                                                     '👤 User'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-sm">{user.points.toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                                {user.role !== 'superadmin' ? (
                                                    <div className="flex gap-2 justify-center">
                                                        {user.role !== 'staff' && (
                                                            <button
                                                                onClick={() => handleUpdateRole(user.email, 'staff')}
                                                                disabled={loading}
                                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                                                title="ตั้งเป็น Staff"
                                                            >
                                                                👷
                                                            </button>
                                                        )}
                                                        {user.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleUpdateRole(user.email, 'admin')}
                                                                disabled={loading}
                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                                                title="ตั้งเป็น Admin"
                                                            >
                                                                🔧
                                                            </button>
                                                        )}
                                                        {user.role !== 'user' && (
                                                            <button
                                                                onClick={() => handleUpdateRole(user.email, 'user')}
                                                                disabled={loading}
                                                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                                                title="ตั้งเป็น User"
                                                            >
                                                                👤
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-purple-600 font-bold">🔒 ปกป้อง</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
