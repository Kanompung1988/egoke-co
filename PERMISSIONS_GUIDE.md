# 🔐 คู่มือระบบสิทธิ์ (Hierarchical Permissions)

## 📊 ลำดับชั้นสิทธิ์

```
👑 SuperAdmin (Level 4) - สิทธิ์สูงสุด
   ↓ สามารถทำทุกอย่างที่ Admin, Staff, User ทำได้
   
🛡️ Admin (Level 3)
   ↓ สามารถทำทุกอย่างที่ Staff, User ทำได้
   
🔧 Staff (Level 2)
   ↓ สามารถทำทุกอย่างที่ User ทำได้
   
👤 User (Level 1) - สิทธิ์พื้นฐาน
```

---

## 🎯 สิทธิ์แต่ละ Role

### 👑 SuperAdmin (thanaponchanal@gmail.com)
**สิทธิ์เต็ม - ทำได้ทุกอย่าง:**
- ✅ จัดการ Users ทั้งหมด (เปลี่ยน Role, Points, Tickets)
- ✅ ลบ Users
- ✅ จัดการระบบโหวต (เปิด/ปิด, เพิ่ม/ลบผู้สมัคร)
- ✅ จัดการ Prizes, Settings ทั้งหมด
- ✅ ดู/แก้ไข QR Scans
- ✅ ดูประวัติทั้งหมดของทุกคน
- ✅ เข้าถึง `/superadmin` และ `/admin`

### 🛡️ Admin
**สิทธิ์ระดับสูง:**
- ✅ เปลี่ยน Role ของ Users (ยกเว้น SuperAdmin)
- ✅ แก้ไข Points, Tickets ของ Users
- ✅ จัดการระบบโหวต (เปิด/ปิด, เพิ่ม/ลบผู้สมัคร)
- ✅ จัดการ Prizes, Categories
- ✅ ดู/แก้ไข QR Scans
- ✅ ดูประวัติการโหวตทั้งหมด
- ✅ เข้าถึง `/admin`
- ❌ ไม่สามารถลบ Users
- ❌ ไม่สามารถแก้ไข SuperAdmin

### 🔧 Staff
**สิทธิ์จัดการ:**
- ✅ เปิด/ปิดการโหวต
- ✅ เพิ่ม/ลบ/แก้ไขผู้สมัคร
- ✅ ดูรายชื่อ Users ทั้งหมด
- ✅ สแกน QR Code
- ✅ ดูประวัติการโหวตทั้งหมด
- ✅ เข้าถึง `/admin` (แบบจำกัด)
- ❌ ไม่สามารถเปลี่ยน Role
- ❌ ไม่สามารถแก้ไข Points/Tickets
- ❌ ไม่สามารถจัดการ Prizes/Settings

### 👤 User
**สิทธิ์พื้นฐาน:**
- ✅ โหวตได้ (เมื่อเปิดระบบ)
- ✅ หมุนวงล้อ (ถ้ามี Tickets)
- ✅ ดูประวัติของตัวเอง
- ✅ แก้ไขโปรไฟล์ (ยกเว้น Role, Points, Tickets)
- ❌ ไม่สามารถดูข้อมูลคนอื่น
- ❌ ไม่สามารถแก้ไข Points/Tickets ตัวเอง

---

## 🗂️ สิทธิ์การเข้าถึงข้อมูล (Firestore Collections)

### 👥 Users Collection
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| อ่านข้อมูลตัวเอง | ✅ | ✅ | ✅ | ✅ |
| อ่านข้อมูลคนอื่น | ✅ | ✅ | ✅ | ❌ |
| แก้ไขโปรไฟล์ตัวเอง | ✅ | ✅ | ✅ | ✅* |
| แก้ไข Role/Points/Tickets | ✅ | ✅ | ❌ | ❌ |
| ลบ User | ✅ | ❌ | ❌ | ❌ |

*User แก้ไขได้แต่ห้ามแก้ `role`, `points`, `tickets`

### 🗳️ Votes Collection
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| โหวต (สร้าง Vote) | ✅ | ✅ | ✅ | ✅ |
| ดูโหวตตัวเอง | ✅ | ✅ | ✅ | ✅ |
| ดูโหวตทั้งหมด | ✅ | ✅ | ✅ | ❌ |
| แก้ไข/ลบ Vote | ✅ | ✅ | ❌ | ❌ |

### 👔 Candidates Collection (ผู้สมัคร)
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| ดูผู้สมัคร | ✅ | ✅ | ✅ | ✅ |
| เพิ่มผู้สมัคร | ✅ | ✅ | ✅ | ❌ |
| แก้ไขผู้สมัคร | ✅ | ✅ | ✅ | ❌ |
| ลบผู้สมัคร | ✅ | ✅ | ✅ | ❌ |

### ⚙️ VoteSettings Collection (การตั้งค่าโหวต)
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| ดูการตั้งค่า | ✅ | ✅ | ✅ | ✅ |
| เปิด/ปิดการโหวต | ✅ | ✅ | ✅ | ❌ |
| แก้ไขการตั้งค่า | ✅ | ✅ | ✅ | ❌ |

### 🎁 Prizes Collection
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| ดูรางวัล | ✅ | ✅ | ✅ | ✅ |
| เพิ่ม/แก้ไข/ลบรางวัล | ✅ | ✅ | ❌ | ❌ |

### 📱 QRScans Collection
| Action | SuperAdmin | Admin | Staff | User |
|--------|-----------|-------|-------|------|
| สแกน QR | ✅ | ✅ | ✅ | ❌ |
| ดูประวัติการสแกน | ✅ | ✅ | ✅ | ❌ |
| แก้ไข/ลบการสแกน | ✅ | ✅ | ❌ | ❌ |

---

## 💻 การใช้งานใน Code

### ตรวจสอบสิทธิ์ใน TypeScript/React:

```typescript
import { hasAdminAccess, hasStaffAccess, isRole } from './firebaseApp';

// ตรวจสอบว่าเป็น Admin ขึ้นไป (SuperAdmin หรือ Admin)
if (hasAdminAccess(currentUser?.role)) {
  // แสดงฟีเจอร์สำหรับ Admin
}

// ตรวจสอบว่าเป็น Staff ขึ้นไป (SuperAdmin, Admin, หรือ Staff)
if (hasStaffAccess(currentUser?.role)) {
  // แสดงฟีเจอร์สำหรับ Staff
}

// ตรวจสอบว่ามีสิทธิ์ระดับนั้นหรือสูงกว่า
if (isRole(currentUser?.role, 'staff')) {
  // User นี้เป็น Staff ขึ้นไป
}
```

### ตัวอย่างใน Component:

```tsx
function AdminPanel() {
  const { currentUser } = useAuth();
  
  // แสดง UI ตาม Role
  return (
    <div>
      {hasStaffAccess(currentUser?.role) && (
        <button onClick={toggleVoting}>เปิด/ปิดการโหวต</button>
      )}
      
      {hasAdminAccess(currentUser?.role) && (
        <button onClick={managePrizes}>จัดการรางวัล</button>
      )}
      
      {isSuperAdmin(currentUser?.email) && (
        <button onClick={deleteUser}>ลบ User</button>
      )}
    </div>
  );
}
```

---

## 🔥 Deploy Firestore Rules

หลังจากแก้ไข permissions แล้ว ต้อง deploy rules:

```bash
# วิธีที่ 1: ใช้ script
./setup-superadmin.sh

# วิธีที่ 2: Deploy ด้วยมือ
firebase deploy --only firestore:rules
```

---

## ⚠️ ข้อควรระวัง

1. **SuperAdmin ปกป้อง**: ไม่สามารถลบหรือเปลี่ยน role ของ `thanaponchanal@gmail.com` ได้
2. **User ห้ามแก้ไข**: User ทั่วไปแก้ไข `role`, `points`, `tickets` ของตัวเองไม่ได้
3. **Hierarchical**: Admin ทำได้ทุกอย่างที่ Staff ทำได้, SuperAdmin ทำได้ทุกอย่างที่ Admin ทำได้
4. **Firestore Rules**: ต้อง deploy rules ก่อนใช้งาน มิฉะนั้นจะเกิด PERMISSION_DENIED

---

## 📞 สรุป

```
👑 SuperAdmin → ทำได้ทุกอย่าง (100%)
🛡️ Admin     → ทำได้เกือบทุกอย่าง (85%) ยกเว้นลบ User
🔧 Staff     → จัดการโหวต + ดูข้อมูล (60%)
👤 User      → โหวต + ดูของตัวเอง (30%)
```

ระบบนี้ทำให้ SuperAdmin ไม่ต้องทำทุกอย่างเอง สามารถมอบหมายงานให้ Admin และ Staff ได้!
