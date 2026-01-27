import { useState, useEffect, useContext } from 'react';
import { getAllUsers, setUserRole, isSuperAdmin, db } from '../firebaseApp';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../components/contexts/AuthContext';
import { useToast } from '../components/contexts/ToastContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useVoteSettings } from '../hooks/useVote';
import type { VoteCategory } from '../hooks/useVote';
import ActivityLogsViewer from '../components/ActivityLogsViewer';

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
    const { showSuccess, showError } = useToast();
    const { categories, loading: categoriesLoading } = useVoteSettings();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedEmail, setSelectedEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<'user' | 'staff' | 'admin'>('user');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Category Management State
    const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'logs'>('users');
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategory, setNewCategory] = useState({
        id: '',
        title: '',
        description: '',
    });
    
    // Auto-clear message after 3 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

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
                showError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                navigate('/');
            }
        }
    }, [currentUser, authLoading, navigate, showError]);

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
            showError('กรุณาเลือกผู้ใช้');
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            const result = await setUserRole(targetEmail, targetRole);
            
            if (result.success) {
                showSuccess(`อัพเดท ${targetEmail} เป็น ${targetRole} สำเร็จ!`);
                // รีโหลดรายชื่อ users
                const allUsers = await getAllUsers();
                setUsers(allUsers);
                setSelectedEmail('');
            } else {
                showError(result.error || 'ไม่สามารถอัพเดทสิทธิ์ได้');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            showError('เกิดข้อผิดพลาดในการอัพเดทสิทธิ์');
        } finally {
            setLoading(false);
        }
    };

    // Category Management Functions
    const handleAddCategory = async () => {
        if (!newCategory.id || !newCategory.title) {
            showError('กรุณากรอก ID และชื่อหมวดหมู่');
            return;
        }

        setLoading(true);
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const newCategoryData: VoteCategory = {
                id: newCategory.id,
                title: newCategory.title,
                description: newCategory.description || '',
                isOpen: false,
                openTime: null,
                closeTime: null,
                autoClose: false,
                sessionId: `session_${Date.now()}`,
            };

            await setDoc(settingsRef, {
                categories: {
                    ...categories,
                    [newCategory.id]: newCategoryData
                }
            }, { merge: true });

            showSuccess(`เพิ่มหมวดหมู่ "${newCategory.title}" สำเร็จ!`);
            setShowAddCategoryModal(false);
            setNewCategory({ id: '', title: '', description: '' });
        } catch (error) {
            console.error('Error adding category:', error);
            showError('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (categoryId: string, updates: Partial<VoteCategory>) => {
        setLoading(true);
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const updatedCategory = {
                ...categories[categoryId],
                ...updates,
            };

            await setDoc(settingsRef, {
                categories: {
                    ...categories,
                    [categoryId]: updatedCategory
                }
            }, { merge: true });

            showSuccess('อัพเดทหมวดหมู่สำเร็จ!');
            setEditingCategory(null);
        } catch (error) {
            console.error('Error updating category:', error);
            showError('เกิดข้อผิดพลาดในการอัพเดทหมวดหมู่');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm(`ต้องการลบหมวดหมู่ "${categories[categoryId]?.title}" หรือไม่?`)) {
            return;
        }

        setLoading(true);
        try {
            const settingsRef = doc(db, 'voteSettings', 'config');
            const updatedCategories = { ...categories };
            delete updatedCategories[categoryId];

            await setDoc(settingsRef, {
                categories: updatedCategories
            }, { merge: true });

            showSuccess('ลบหมวดหมู่สำเร็จ!');
        } catch (error) {
            console.error('Error deleting category:', error);
            showError('เกิดข้อผิดพลาดในการลบหมวดหมู่');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCategoryStatus = async (categoryId: string) => {
        const category = categories[categoryId];
        const newStatus = !category.isOpen;
        
        await handleUpdateCategory(categoryId, {
            isOpen: newStatus,
            openTime: newStatus ? Timestamp.now() : category.openTime,
            closeTime: !newStatus ? Timestamp.now() : null,
        });
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

    if (authLoading || loading || categoriesLoading) {
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
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4 pb-24">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <i className="ri-crown-fill text-5xl text-purple-600"></i>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Super Admin Panel</h1>
                                <p className="text-gray-600">{currentUser.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/Home')}
                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <i className="ri-arrow-left-line"></i> กลับ
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl p-2 mb-6 shadow-lg flex gap-2">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                            activeTab === 'users'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <i className="ri-user-settings-line mr-2"></i>
                        จัดการผู้ใช้
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                            activeTab === 'categories'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <i className="ri-list-settings-line mr-2"></i>
                        จัดการหมวดหมู่
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                            activeTab === 'logs'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <i className="ri-file-list-3-line mr-2"></i>
                        Activity Logs
                    </button>
                </div>

                {/* Activity Logs Tab */}
                {activeTab === 'logs' && (
                    <ActivityLogsViewer />
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                <i className="ri-group-line text-3xl mb-2 text-gray-600"></i>
                                <div className="text-2xl font-bold text-gray-800">{userStats.total}</div>
                                <div className="text-sm text-gray-600">ทั้งหมด</div>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 shadow-lg text-center border-2 border-purple-200">
                                <i className="ri-crown-fill text-3xl mb-2 text-purple-600"></i>
                                <div className="text-2xl font-bold text-purple-700">{userStats.superadmin}</div>
                                <div className="text-sm text-purple-600">SuperAdmin</div>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 shadow-lg text-center border-2 border-blue-200">
                                <i className="ri-admin-line text-3xl mb-2 text-blue-600"></i>
                                <div className="text-2xl font-bold text-blue-700">{userStats.admin}</div>
                                <div className="text-sm text-blue-600">Admin</div>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 shadow-lg text-center border-2 border-green-200">
                                <i className="ri-user-star-line text-3xl mb-2 text-green-600"></i>
                                <div className="text-2xl font-bold text-green-700">{userStats.staff}</div>
                                <div className="text-sm text-green-600">Staff</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 shadow-lg text-center border-2 border-gray-200">
                                <i className="ri-user-line text-3xl mb-2 text-gray-600"></i>
                                <div className="text-2xl font-bold text-gray-700">{userStats.user}</div>
                                <div className="text-sm text-gray-600">User</div>
                            </div>
                        </div>

                        {/* Set Role Form */}
                        <div className="bg-white rounded-2xl p-6 mb-6 shadow-2xl">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i className="ri-shield-user-line"></i>
                                จัดการสิทธิ์ผู้ใช้
                            </h2>
                    
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
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="ri-user-search-line"></i>
                            รายชื่อผู้ใช้ทั้งหมด ({filteredUsers.length} คน)
                        </h2>
                        
                        {/* Search Box */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหา email, ชื่อ, role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none w-64"
                            />
                            <i className="ri-search-line absolute left-3 top-3 text-gray-400"></i>
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
                    </>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && (
                    <>
                        {/* Add Category Button */}
                        <div className="mb-6">
                            <button
                                onClick={() => setShowAddCategoryModal(true)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <i className="ri-add-circle-line text-xl"></i>
                                เพิ่มหมวดหมู่ใหม่
                            </button>
                        </div>

                        {/* Categories Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(categories).map(([categoryId, category]) => {
                                // ใช้ emoji จาก category หรือ fallback
                                const categoryEmoji = category.emoji || {
                                    band: '🎸',
                                    solo: '🎤',
                                    cover: '💃'
                                }[categoryId] || '📋';

                                return (
                                <div
                                    key={categoryId}
                                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            {editingCategory === categoryId ? (
                                                <input
                                                    type="text"
                                                    defaultValue={category.title}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== category.title) {
                                                            handleUpdateCategory(categoryId, { title: e.target.value });
                                                        }
                                                    }}
                                                    className="text-xl font-bold text-gray-800 border-2 border-purple-500 rounded-lg px-2 py-1 w-full"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="text-3xl">{categoryEmoji}</span>
                                                    {category.title}
                                                </h3>
                                            )}
                                            <p className="text-gray-600 text-sm mt-1">
                                                ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{categoryId}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setEditingCategory(editingCategory === categoryId ? null : categoryId)}
                                            className="text-gray-400 hover:text-purple-600 transition-colors"
                                        >
                                            <i className={editingCategory === categoryId ? "ri-check-line text-xl" : "ri-edit-line text-xl"}></i>
                                        </button>
                                    </div>

                                    {editingCategory === categoryId ? (
                                        <textarea
                                            defaultValue={category.description}
                                            onBlur={(e) => {
                                                if (e.target.value !== category.description) {
                                                    handleUpdateCategory(categoryId, { description: e.target.value });
                                                }
                                            }}
                                            className="text-gray-600 text-sm mb-4 border-2 border-purple-500 rounded-lg px-2 py-1 w-full"
                                            rows={2}
                                        />
                                    ) : (
                                        <p className="text-gray-600 text-sm mb-4">{category.description || 'ไม่มีคำอธิบาย'}</p>
                                    )}

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-sm text-gray-600">สถานะ:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                            category.isOpen
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {category.isOpen ? '🟢 เปิดโหวต' : '🔴 ปิดโหวต'}
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-500 mb-4">
                                        <div>Session: {category.sessionId}</div>
                                        {category.openTime && (
                                            <div>เปิดเมื่อ: {category.openTime.toDate().toLocaleString('th-TH')}</div>
                                        )}
                                        {category.closeTime && (
                                            <div>ปิดเมื่อ: {category.closeTime.toDate().toLocaleString('th-TH')}</div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleCategoryStatus(categoryId)}
                                            disabled={loading}
                                            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all disabled:opacity-50 ${
                                                category.isOpen
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                            }`}
                                        >
                                            <i className={category.isOpen ? "ri-stop-circle-line mr-1" : "ri-play-circle-line mr-1"}></i>
                                            {category.isOpen ? 'ปิดโหวต' : 'เปิดโหวต'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(categoryId)}
                                            disabled={loading}
                                            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-bold transition-all disabled:opacity-50"
                                            title="ลบหมวดหมู่"
                                        >
                                            <i className="ri-delete-bin-line"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                            })}
                        </div>

                        {Object.keys(categories).length === 0 && (
                            <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                                <p className="text-gray-500 text-lg">ยังไม่มีหมวดหมู่</p>
                                <p className="text-gray-400 text-sm">คลิกปุ่ม "เพิ่มหมวดหมู่ใหม่" เพื่อเริ่มต้น</p>
                            </div>
                        )}
                    </>
                )}

                {/* Add Category Modal */}
                {showAddCategoryModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <i className="ri-add-circle-line text-green-600"></i>
                                    เพิ่มหมวดหมู่ใหม่
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowAddCategoryModal(false);
                                        setNewCategory({ id: '', title: '', description: '' });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <i className="ri-close-line text-2xl"></i>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        ID หมวดหมู่ (ภาษาอังกฤษ, ไม่มีช่องว่าง)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="เช่น president, bestdancer"
                                        value={newCategory.id}
                                        onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                        className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        ชื่อหมวดหมู่ (ที่แสดงบนหน้าเว็บ)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="เช่น ประธาน, นักเต้นยอดเยี่ยม"
                                        value={newCategory.title}
                                        onChange={(e) => setNewCategory({ ...newCategory, title: e.target.value })}
                                        className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        คำอธิบาย (ไม่บังคับ)
                                    </label>
                                    <textarea
                                        placeholder="อธิบายเพิ่มเติมเกี่ยวกับหมวดหมู่นี้"
                                        value={newCategory.description}
                                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                        className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowAddCategoryModal(false);
                                            setNewCategory({ id: '', title: '', description: '' });
                                        }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleAddCategory}
                                        disabled={loading || !newCategory.id || !newCategory.title}
                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'กำลังเพิ่ม...' : 'เพิ่มหมวดหมู่'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
