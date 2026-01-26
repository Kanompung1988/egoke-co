import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { db, getAllUsers, setUserRole } from '../firebaseApp';
import { doc, updateDoc, collection, addDoc, deleteDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';

interface CandidateForm {
    name: string;
    description: string;
    imageUrl: string;
}

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    points: number;
    photoURL?: string;
}

export default function Admin() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { categories: voteSettings, loading } = useVoteSettings();
    const [selectedCategory, setSelectedCategory] = useState('karaoke');
    const { candidates } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newCandidate, setNewCandidate] = useState<CandidateForm>({
        name: '',
        description: '',
        imageUrl: ''
    });

    // User Management (for Admin and SuperAdmin)
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [activeTab, setActiveTab] = useState<'vote' | 'users'>('vote');

    const isAdmin = currentUser?.role === 'admin';
    const isSuperAdmin = currentUser?.role === 'superadmin';
    const canManageUsers = isAdmin || isSuperAdmin;

    // Check if user is admin, staff, or superadmin
    useEffect(() => {
        if (!loading && !['admin', 'staff', 'superadmin'].includes(currentUser?.role || '')) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            navigate('/');
        }
    }, [currentUser, loading, navigate]);

    // Load users if admin/superadmin
    useEffect(() => {
        if (canManageUsers && activeTab === 'users') {
            loadUsers();
        }
    }, [canManageUsers, activeTab]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const allUsers = await getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleRoleChange = async (userId: string, email: string, newRole: string) => {
        if (!confirm(`ยืนยันการเปลี่ยน Role ของ ${email} เป็น ${newRole}?`)) return;

        setLoadingUsers(true);
        try {
            const result = await setUserRole(userId, newRole as 'user' | 'staff' | 'admin');
            
            if (result.success) {
                alert(`✅ เปลี่ยน Role เป็น ${newRole} สำเร็จ`);
                await loadUsers(); // Reload to reflect changes
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            alert('❌ ไม่สามารถเปลี่ยน Role ได้: ' + (error as Error).message);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Function to sync vote counts from votes collection
    const syncVoteCounts = async (category: string) => {
        console.log('🔄 Syncing vote counts for category:', category);
        
        try {
            // Get all candidates in this category
            const candidatesRef = collection(db, 'candidates');
            const candidatesQuery = query(candidatesRef, where('category', '==', category));
            const candidatesSnapshot = await getDocs(candidatesQuery);
            
            // Count votes for each candidate
            const votesRef = collection(db, 'votes');
            
            for (const candidateDoc of candidatesSnapshot.docs) {
                const candidateId = candidateDoc.id;
                const votesQuery = query(votesRef, where('candidateId', '==', candidateId));
                const votesSnapshot = await getDocs(votesQuery);
                const voteCount = votesSnapshot.size;
                
                // Update candidate's voteCount
                await updateDoc(doc(db, 'candidates', candidateId), {
                    voteCount: voteCount,
                    lastSyncedAt: Timestamp.now()
                });
                
                console.log(`  ✅ ${candidateDoc.data().name}: ${voteCount} votes`);
            }
            
            console.log('✅ Vote count sync completed');
        } catch (error) {
            console.error('❌ Failed to sync vote counts:', error);
            throw error;
        }
    };

    const toggleCategory = async (category: string) => {
        const categorySettings = voteSettings[category];
        if (!categorySettings) return;

        console.log('🔄 Toggling category:', category, 'Current user role:', currentUser?.role);

        try {
            const docRef = doc(db, 'voteSettings', 'config');
            const newIsOpen = !categorySettings.isOpen;
            
            console.log('📝 Updating Firestore:', { category, newIsOpen });
            
            await updateDoc(docRef, {
                [`categories.${category}.isOpen`]: newIsOpen,
                [`categories.${category}.updatedAt`]: Timestamp.now(),
                // If opening, create new session
                ...(newIsOpen && { [`categories.${category}.sessionId`]: `session_${Date.now()}` })
            });
            
            // If closing, sync vote counts automatically
            if (!newIsOpen) {
                console.log('📊 Closing vote - syncing vote counts...');
                await syncVoteCounts(category);
                alert(`⏸️ ปิดการโหวต ${category} และรวมคะแนนเรียบร้อยแล้ว ✅`);
            } else {
                alert(`✅ เปิดการโหวต ${category} แล้ว`);
            }
            
            console.log('✅ Toggle success');
        } catch (error) {
            console.error('❌ Failed to toggle category:', error);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + (error as Error).message);
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name.trim() || !newCandidate.description.trim()) {
            alert('❌ กรุณากรอกชื่อและคำอธิบาย');
            return;
        }

        console.log('➕ Adding candidate:', newCandidate, 'User role:', currentUser?.role);

        try {
            // Get current max order for this category
            const candidatesRef = collection(db, 'candidates');
            const q = query(candidatesRef, where('category', '==', selectedCategory));
            const snapshot = await getDocs(q);
            const maxOrder = snapshot.docs.reduce((max: number, doc) => {
                const order = doc.data().order || 0;
                return order > max ? order : max;
            }, 0);

            await addDoc(collection(db, 'candidates'), {
                ...newCandidate,
                category: selectedCategory,
                voteCount: 0,
                order: maxOrder + 1,
                createdAt: Timestamp.now(),
                createdBy: currentUser?.uid || 'unknown'
            });

            setNewCandidate({ name: '', description: '', imageUrl: '' });
            setShowAddModal(false);
            alert('✅ เพิ่มผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('❌ Failed to add candidate:', error);
            alert('❌ เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร: ' + (error as Error).message);
        }
    };

    const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${candidateName}"?`)) return;

        console.log('🗑️ Deleting candidate:', candidateId, 'User role:', currentUser?.role);

        try {
            await deleteDoc(doc(db, 'candidates', candidateId));
            alert('✅ ลบผู้สมัครสำเร็จ');
        } catch (error) {
            console.error('❌ Failed to delete candidate:', error);
            alert('เกิดข้อผิดพลาดในการลบผู้สมัคร: ' + (error as Error).message);
        }
    };

    if (loading || !currentUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            🛡️ Admin Dashboard
                        </h1>
                        <p className="text-purple-100">จัดการระบบโหวต{canManageUsers && ' และผู้ใช้'}</p>
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
                {/* Tab Navigation (for Admin/SuperAdmin only) */}
                {canManageUsers && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('vote')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'vote'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            🎯 จัดการระบบโหวต
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                                activeTab === 'users'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            👥 จัดการผู้ใช้
                        </button>
                    </div>
                )}

                {/* User Management Panel */}
                {activeTab === 'users' && canManageUsers && (
                    <div className="bg-white rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้ใช้และสิทธิ์</h2>
                            <button
                                onClick={loadUsers}
                                disabled={loadingUsers}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {loadingUsers ? '⏳ กำลังโหลด...' : '🔄 รีเฟรช'}
                            </button>
                        </div>

                        {loadingUsers ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                                <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left p-3 font-bold text-gray-700">อีเมล</th>
                                            <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                            <th className="text-center p-3 font-bold text-gray-700">Role</th>
                                            <th className="text-right p-3 font-bold text-gray-700">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.uid} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3 text-sm text-gray-800">{user.email}</td>
                                                <td className="p-3 text-sm text-gray-800">{user.displayName}</td>
                                                <td className="p-3 text-center">
                                                    {user.role === 'superadmin' ? (
                                                        <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                                            👑 SuperAdmin
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.uid, user.email, e.target.value)}
                                                            className="bg-gray-100 border-2 border-gray-300 rounded-lg px-3 py-1 font-bold text-sm focus:border-purple-500 focus:outline-none"
                                                        >
                                                            <option value="user">👤 User</option>
                                                            <option value="staff">🔧 Staff</option>
                                                            {isSuperAdmin && <option value="admin">🛡️ Admin</option>}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-mono text-sm">{user.points.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {users.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        ไม่พบข้อมูลผู้ใช้
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="text-sm text-blue-800">
                                <strong>ℹ️ หมายเหตุ:</strong>
                                <ul className="list-disc ml-4 mt-2 space-y-1">
                                    <li>👤 <strong>User</strong>: ผู้ใช้ทั่วไป</li>
                                    <li>🔧 <strong>Staff</strong>: จัดการระบบโหวต</li>
                                    <li>🛡️ <strong>Admin</strong>: จัดการระบบโหวต + เพิ่ม Staff</li>
                                    <li>👑 <strong>SuperAdmin</strong>: สิทธิ์เต็ม (เพิ่ม Admin ได้)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vote Management Panel */}
                {activeTab === 'vote' && (
                    <>
                {/* Vote Control Panel */}
                <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">🎛️ ควบคุมการโหวต</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(voteSettings).map(([categoryId, category]) => {
                            const categoryInfo = {
                                karaoke: { emoji: '🎤', name: 'Karaoke Contest' },
                                food: { emoji: '🍜', name: 'Best Food' },
                                cosplay: { emoji: '👘', name: 'Cosplay Contest' }
                            }[categoryId as 'karaoke' | 'food' | 'cosplay'] || { emoji: '📋', name: categoryId };

                            return (
                                <div
                                    key={categoryId}
                                    className={`p-6 rounded-xl border-2 transition-all ${
                                        category.isOpen
                                            ? 'bg-green-50 border-green-400'
                                            : 'bg-gray-50 border-gray-300'
                                    }`}
                                >
                                    <div className="text-center mb-4">
                                        <div className="text-4xl mb-2">{categoryInfo.emoji}</div>
                                        <div className="font-bold text-gray-800">{categoryInfo.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Session: {category.sessionId}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleCategory(categoryId)}
                                        className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                                            category.isOpen
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                    >
                                        {category.isOpen ? '🔴 ปิดการโหวต' : '▶️ เปิดการโหวต'}
                                    </button>

                                    <div className={`mt-3 text-center font-bold ${
                                        category.isOpen ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                        {category.isOpen ? '✅ เปิดอยู่' : '⏸️ ปิดอยู่'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Candidate Management */}
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้สมัคร</h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all"
                        >
                            ➕ เพิ่มผู้สมัคร
                        </button>
                    </div>

                    {/* Category Selector */}
                    <div className="flex gap-2 mb-4">
                        {['karaoke', 'food', 'cosplay'].map((cat) => {
                            const info = {
                                karaoke: { emoji: '🎤', name: 'Karaoke' },
                                food: { emoji: '🍜', name: 'Food' },
                                cosplay: { emoji: '👘', name: 'Cosplay' }
                            }[cat];

                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">{info?.emoji}</div>
                                    <div className="text-sm">{info?.name}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl p-4 mb-4 border border-red-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-600">ผู้สมัครทั้งหมด</div>
                                <div className="text-2xl font-bold text-gray-800">{candidates.length} คน</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">โหวตทั้งหมด</div>
                                <div className="text-2xl font-bold text-red-600">{totalVotes} โหวต</div>
                            </div>
                        </div>
                    </div>

                    {/* Candidates Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="text-left p-3 font-bold text-gray-700">#</th>
                                    <th className="text-left p-3 font-bold text-gray-700">ชื่อ</th>
                                    <th className="text-left p-3 font-bold text-gray-700">คำอธิบาย</th>
                                    <th className="text-center p-3 font-bold text-gray-700">โหวต</th>
                                    <th className="text-center p-3 font-bold text-gray-700">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((candidate, index) => (
                                    <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3 text-gray-600">#{index + 1}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0">
                                                    {candidate.imageUrl ? (
                                                        <img 
                                                            src={candidate.imageUrl} 
                                                            alt={candidate.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl">
                                                            {candidate.category === 'karaoke' && '🎤'}
                                                            {candidate.category === 'food' && '🍜'}
                                                            {candidate.category === 'cosplay' && '👘'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-medium text-gray-800">{candidate.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                                            {candidate.description}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                                                {candidate.voteCount}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold transition-colors"
                                            >
                                                🗑️ ลบ
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {candidates.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                ยังไม่มีผู้สมัครในหมวดนี้
                            </div>
                        )}
                    </div>
                </div>
                </>
                )}
            </div>

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                            ➕ เพิ่มผู้สมัครใหม่
                        </h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    หมวดหมู่
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                >
                                    <option value="karaoke">🎤 Karaoke</option>
                                    <option value="food">🍜 Food</option>
                                    <option value="cosplay">👘 Cosplay</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    ชื่อ *
                                </label>
                                <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    placeholder="ใส่ชื่อผู้สมัคร"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    คำอธิบาย *
                                </label>
                                <textarea
                                    value={newCandidate.description}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    rows={3}
                                    placeholder="ใส่คำอธิบายผู้สมัคร"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    URL รูปภาพ (ไม่บังคับ)
                                </label>
                                <input
                                    type="text"
                                    value={newCandidate.imageUrl}
                                    onChange={(e) => setNewCandidate({ ...newCandidate, imageUrl: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewCandidate({ name: '', description: '', imageUrl: '' });
                                }}
                                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-bold transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAddCandidate}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg"
                            >
                                ✓ เพิ่มผู้สมัคร
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
