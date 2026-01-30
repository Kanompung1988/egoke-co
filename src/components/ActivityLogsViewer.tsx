import { useState, useMemo } from 'react';
import { useActivityLogs } from '../hooks/useVote';
import type { ActivityLog } from '../types/voteRights';

const LOG_TYPE_COLORS = {
    POINT_GRANT: 'bg-green-100 text-green-800 border-green-300',
    POINT_DEDUCT: 'bg-red-100 text-red-800 border-red-300',
    VOTE_CAST: 'bg-blue-100 text-blue-800 border-blue-300',
    VOTE_RIGHTS_PURCHASE: 'bg-purple-100 text-purple-800 border-purple-300',
    PRIZE_CLAIM: 'bg-amber-100 text-amber-800 border-amber-300',
    GAME_SPIN: 'bg-pink-100 text-pink-800 border-pink-300',
    ADMIN_ADJUST: 'bg-orange-100 text-orange-800 border-orange-300',
    CHECKIN: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    grant_free_vote: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    update_purchase_points: 'bg-violet-100 text-violet-800 border-violet-300',
    change_podium_mode: 'bg-teal-100 text-teal-800 border-teal-300',
    toggle_announcement: 'bg-rose-100 text-rose-800 border-rose-300',
};

const LOG_TYPE_EMOJI = {
    POINT_GRANT: '💰',
    POINT_DEDUCT: '💸',
    VOTE_CAST: '🗳️',
    VOTE_RIGHTS_PURCHASE: '🎫',
    PRIZE_CLAIM: '🎁',
    GAME_SPIN: '🎰',
    ADMIN_ADJUST: '👨‍💼',
    CHECKIN: '✅',
    grant_free_vote: '🎉',
    update_purchase_points: '📊',
    change_podium_mode: '🏆',
    toggle_announcement: '📢',
};

const LOG_TYPE_LABELS = {
    POINT_GRANT: 'เพิ่มแต้ม',
    POINT_DEDUCT: 'หักแต้ม',
    VOTE_CAST: 'โหวต',
    VOTE_RIGHTS_PURCHASE: 'ซื้อสิทธิ์',
    PRIZE_CLAIM: 'แลกของรางวัล',
    GAME_SPIN: 'หมุนวงล้อ',
    ADMIN_ADJUST: 'ปรับแต้ม',
    CHECKIN: 'เช็คอิน',
    grant_free_vote: 'แจกสิทธิ์โหวต',
    update_purchase_points: 'แก้ไขคะแนนซื้อ',
    change_podium_mode: 'เปลี่ยนโหมดโพเดียม',
    toggle_announcement: 'เปิด/ปิดประกาศ',
};

export default function ActivityLogsViewer() {
    const { logs, loading, error } = useActivityLogs();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ActivityLog['type'] | 'ALL'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Filter logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.adminName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = filterType === 'ALL' || log.type === filterType;

            return matchesSearch && matchesType;
        });
    }, [logs, searchQuery, filterType]);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['เวลา', 'ประเภท', 'อีเมล', 'ชื่อ', 'รายละเอียด', 'ดำเนินการโดย', 'แต้มก่อน', 'แต้มหลัง', 'เปลี่ยนแปลง'];
        const rows = filteredLogs.map(log => {
            const actionBy = log.metadata?.adjustedByEmail || log.metadata?.claimedByEmail || log.metadata?.grantedByEmail || log.adminEmail || 'ผู้ใช้เอง';
            return [
                log.timestamp?.toDate?.()?.toLocaleString('th-TH') || '',
                LOG_TYPE_LABELS[log.type] || log.type,
                log.userEmail || log.adminEmail || '',
                log.userName || log.adminName || '',
                log.description || log.message || '',
                actionBy,
                log.pointsBefore ?? '',
                log.pointsAfter ?? '',
                log.pointsChange ?? '',
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
                <p className="text-gray-600 text-lg font-medium">กำลังโหลด Activity Logs...</p>
                <p className="text-gray-400 text-sm mt-2">กำลังดึงข้อมูลจาก Firebase</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
                <p className="text-red-600">{error}</p>
                <p className="text-sm text-gray-600 mt-2">กรุณาตรวจสอบ Firestore Rules และ Indexes</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-sm font-semibold opacity-90 mb-1">รายการทั้งหมด</div>
                    <div className="text-4xl font-bold mb-1">{logs.length}</div>
                    <div className="text-xs opacity-75">Total Logs</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-3xl font-bold">{logs.filter(log => log.type === 'POINT_GRANT').length}</div>
                    <div className="text-xs opacity-90">เพิ่มแต้ม</div>
                </div>
                
                <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">💸</div>
                    <div className="text-3xl font-bold">{logs.filter(log => log.type === 'POINT_DEDUCT').length}</div>
                    <div className="text-xs opacity-90">หักแต้ม</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">🗳️</div>
                    <div className="text-3xl font-bold">{logs.filter(log => log.type === 'VOTE_CAST').length}</div>
                    <div className="text-xs opacity-90">โหวต</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">🎫</div>
                    <div className="text-3xl font-bold">{logs.filter(log => log.type === 'VOTE_RIGHTS_PURCHASE').length}</div>
                    <div className="text-xs opacity-90">ซื้อสิทธิ์</div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">🎁</div>
                    <div className="text-3xl font-bold">{logs.filter(log => log.type === 'PRIZE_CLAIM').length}</div>
                    <div className="text-xs opacity-90">แลกของรางวัล</div>
                </div>
            </div>
            
            {/* Additional Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-xl mb-1">🎰</div>
                    <div className="text-2xl font-bold">{logs.filter(log => log.type === 'GAME_SPIN').length}</div>
                    <div className="text-xs opacity-90">หมุนวงล้อ</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-xl mb-1">👨‍💼</div>
                    <div className="text-2xl font-bold">{logs.filter(log => log.type === 'ADMIN_ADJUST').length}</div>
                    <div className="text-xs opacity-90">ปรับแต้ม</div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-xl mb-1">✅</div>
                    <div className="text-2xl font-bold">{logs.filter(log => log.type === 'CHECKIN').length}</div>
                    <div className="text-xs opacity-90">เช็คอิน</div>
                </div>
                
                <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-xl mb-1">👥</div>
                    <div className="text-2xl font-bold">{new Set(logs.map(log => log.userId)).size}</div>
                    <div className="text-xs opacity-90">ผู้ใช้ที่มีกิจกรรม</div>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-xl mb-1">📈</div>
                    <div className="text-2xl font-bold">{logs.filter(log => log.metadata?.isAdminAction).length}</div>
                    <div className="text-xs opacity-90">กิจกรรมโดย Admin</div>
                </div>
            </div>

            {/* Header & Controls */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            📊 Activity Logs
                            <span className="text-sm font-normal text-gray-500">
                                ({filteredLogs.length} รายการ)
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            🔄 Real-time • เชื่อมต่อ Firebase Firestore
                        </p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        disabled={filteredLogs.length === 0}
                    >
                        📥 Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            🔍 ค้นหา
                        </label>
                        <input
                            type="text"
                            placeholder="ค้นหาด้วยอีเมล, ชื่อ, หรือรายละเอียด..."
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            🏷️ กรองตามประเภท
                        </label>
                        <select
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value as ActivityLog['type'] | 'ALL');
                                setCurrentPage(1);
                            }}
                        >
                            <option value="ALL">✨ ทั้งหมด</option>
                            <option value="POINT_GRANT">💰 เพิ่มแต้ม</option>
                            <option value="POINT_DEDUCT">💸 หักแต้ม</option>
                            <option value="VOTE_CAST">🗳️ โหวต</option>
                            <option value="VOTE_RIGHTS_PURCHASE">🎫 ซื้อสิทธิ์</option>
                            <option value="PRIZE_CLAIM">🎁 แลกของรางวัล</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr className="bg-base-200">
                                <th className="w-40">เวลา</th>
                                <th className="w-32">ประเภท</th>
                                <th>ผู้ใช้</th>
                                <th>รายละเอียด</th>
                                <th>ดำเนินการโดย</th>
                                <th className="text-right">แต้มก่อน</th>
                                <th className="text-right">แต้มหลัง</th>
                                <th className="text-right">เปลี่ยนแปลง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        ไม่พบข้อมูล
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover">
                                        <td className="text-xs">
                                            {log.timestamp?.toDate?.()?.toLocaleString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td>
                                            <div className={`badge badge-sm ${LOG_TYPE_COLORS[log.type]}`}>
                                                {LOG_TYPE_EMOJI[log.type]} {LOG_TYPE_LABELS[log.type]}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold text-sm">{log.userName || log.adminName || '-'}</div>
                                            <div className="text-xs text-gray-500">{log.userEmail || log.adminEmail || '-'}</div>
                                        </td>
                                        <td className="text-sm">{log.description || log.message || '-'}</td>
                                        <td className="text-sm">
                                            {log.metadata?.adjustedByEmail ? (
                                                <div>
                                                    <div className="font-medium text-orange-700">👨‍💼 Admin</div>
                                                    <div className="text-xs text-gray-500">{log.metadata.adjustedByEmail}</div>
                                                </div>
                                            ) : log.metadata?.claimedByEmail ? (
                                                <div>
                                                    <div className="font-medium text-purple-700">👨‍💼 Staff</div>
                                                    <div className="text-xs text-gray-500">{log.metadata.claimedByEmail}</div>
                                                </div>
                                            ) : log.metadata?.grantedByEmail ? (
                                                <div>
                                                    <div className="font-medium text-blue-700">👨‍💼 Staff</div>
                                                    <div className="text-xs text-gray-500">{log.metadata.grantedByEmail}</div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 text-xs">ผู้ใช้เอง</div>
                                            )}
                                        </td>
                                        <td className="text-right font-mono text-sm">{log.pointsBefore ?? '-'}</td>
                                        <td className="text-right font-mono text-sm">{log.pointsAfter ?? '-'}</td>
                                        <td className="text-right font-mono text-sm">
                                            {log.pointsChange !== undefined ? (
                                                <span className={log.pointsChange > 0 ? 'text-green-600' : log.pointsChange < 0 ? 'text-red-600' : ''}>
                                                    {log.pointsChange > 0 ? '+' : ''}{log.pointsChange}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-gray-600">
                            แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} จาก {filteredLogs.length} รายการ
                        </div>
                        <div className="btn-group">
                            <button
                                className="btn btn-sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                «
                            </button>
                            <button className="btn btn-sm">
                                หน้า {currentPage} / {totalPages}
                            </button>
                            <button
                                className="btn btn-sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
