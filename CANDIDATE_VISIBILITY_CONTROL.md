# 🎯 ระบบควบคุมการแสดงผู้สมัคร - Candidate Visibility & Active Control

## 📋 สรุปฟีเจอร์

ระบบนี้เพิ่มความยืดหยุ่นในการควบคุมผู้สมัครแต่ละคนว่า:
1. **isVisible** - User จะเห็นและโหวตได้หรือไม่
2. **isActive** - คะแนนจะนับใน Podium (Vote Results) หรือไม่

---

## 🎛️ การทำงาน

### 1. **Admin Dashboard - จัดการผู้สมัคร**

#### หน้าจัดการผู้สมัคร
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 จัดการผู้สมัคร                                           │
├─────────────────────────────────────────────────────────────┤
│ ⚡ Bulk Actions                                              │
│ ┌──────────────────────┬──────────────────────┐            │
│ │ 👁️ isVisible         │ 🏆 isActive          │            │
│ │ ✅ เปิดทั้งหมด       │ ✅ เปิดทั้งหมด       │            │
│ │ ❌ ปิดทั้งหมด        │ ❌ ปิดทั้งหมด        │            │
│ └──────────────────────┴──────────────────────┘            │
├─────────────────────────────────────────────────────────────┤
│ # │ ชื่อ         │ โหวต │ 👁️ แสดง │ 🏆 Podium │ จัดการ  │
│ 1 │ Band A       │ 100   │ ✅ เปิด  │ 🏆 นับ    │ 🗑️ ลบ   │
│ 2 │ Band B       │ 80    │ ❌ ปิด   │ ⏸️ ไม่นับ  │ 🗑️ ลบ   │
│ 3 │ Band C       │ 50    │ ✅ เปิด  │ 🏆 นับ    │ 🗑️ ลบ   │
└─────────────────────────────────────────────────────────────┘
```

#### คอลัมน์ใหม่
- **👁️ แสดง (isVisible)**: 
  - ✅ เปิด = User เห็นและโหวตได้
  - ❌ ปิด = User ไม่เห็น (ซ่อน)

- **🏆 Podium (isActive)**: 
  - 🏆 นับ = คะแนนนับใน Podium
  - ⏸️ ไม่นับ = คะแนนไม่แสดงใน Podium

#### Bulk Actions (เปิด/ปิดทั้งหมด)
- **isVisible**:
  - ✅ เปิดทั้งหมด → แสดงผู้สมัครทุกคนให้ User เห็น
  - ❌ ปิดทั้งหมด → ซ่อนผู้สมัครทุกคน

- **isActive**:
  - ✅ เปิดทั้งหมด → นับคะแนนทุกคนใน Podium
  - ❌ ปิดทั้งหมด → ไม่นับคะแนนใครเลยใน Podium

---

### 2. **หน้า Vote (User)**

#### Filter ผู้สมัคร
```typescript
// ✅ User เห็นเฉพาะผู้สมัครที่ isVisible = true
const candidates = allCandidates.filter(c => c.isVisible === true);
```

#### ตัวอย่าง
```
สถานการณ์: มีผู้สมัคร 8 คน

Admin ตั้งค่า:
- Band A: isVisible = true  → User เห็น ✅
- Band B: isVisible = false → User ไม่เห็น ❌
- Band C: isVisible = true  → User เห็น ✅
- Band D-H: isVisible = false → User ไม่เห็น ❌

ผลลัพธ์:
User จะเห็นเฉพาะ Band A และ Band C เท่านั้น
```

---

### 3. **หน้า Vote Results (Podium)**

#### Filter Podium
```typescript
// ✅ แสดงเฉพาะผู้สมัครที่ isActive = true
const activeCandidates = allCandidates.filter(c => c.isActive === true);
const sortedCandidates = [...activeCandidates].sort((a, b) => b.voteCount - a.voteCount);
```

#### ตัวอย่าง
```
สถานการณ์: ปิดโหวตแล้ว มีคะแนนดังนี้

คะแนนทั้งหมด:
- Band A: 100 votes (isActive = true)
- Band B: 80 votes  (isActive = false)
- Band C: 50 votes  (isActive = true)
- Band D: 40 votes  (isActive = false)

Podium แสดง:
🥇 Band A - 100 votes
🥈 Band C - 50 votes

ไม่แสดง: Band B และ Band D (แม้จะมีคะแนนก็ตาม)
```

---

## 🔧 Use Cases

### Use Case 1: เปิดผู้สมัครทีละคน
```
1. Admin เปิด isVisible = true สำหรับ Band A
   → User เห็นเฉพาะ Band A และโหวตได้

2. Admin เปิด isVisible = true สำหรับ Band B เพิ่ม
   → User เห็น Band A และ Band B

3. Admin ปิด isVisible = false สำหรับ Band A
   → User เห็นเฉพาะ Band B
```

### Use Case 2: ปิดโหวตแล้ว แต่ต้องการแสดงผลเฉพาะบางคน
```
สถานการณ์:
- มีผู้สมัคร 8 คน ทุกคนมีคะแนน
- Admin ต้องการแสดงผลเฉพาะ 3 คนแรก

วิธีทำ:
1. Admin ปิดโหวต
2. Admin กด "ปิดทั้งหมด" ที่ isActive
3. Admin เปิด isActive = true เฉพาะ 3 คนที่ต้องการ
4. Podium แสดงเฉพาะ 3 คนที่เปิด
```

### Use Case 3: ซ่อนผู้สมัครชั่วคราว
```
สถานการณ์:
- Band A ไม่มาแสดง ต้องการซ่อนชั่วคราว

วิธีทำ:
1. Admin ปิด isVisible = false สำหรับ Band A
   → User ไม่เห็น Band A
2. เมื่อ Band A กลับมา
   → Admin เปิด isVisible = true กลับ
   → User เห็น Band A อีกครั้ง
```

---

## 📊 ตาราง Field ใหม่

| Field      | Type    | Default | Description                              |
|------------|---------|---------|------------------------------------------|
| isVisible  | boolean | false   | แสดงให้ User เห็นและโหวตได้             |
| isActive   | boolean | false   | นับคะแนนใน Podium                       |

### Default Values
- **ผู้สมัครใหม่**: `isVisible = false`, `isActive = false`
- **ผู้สมัครเก่า**: Auto update เป็น `true` ทั้งคู่ (รันสคริปต์)

---

## 🚀 วิธีใช้งาน

### 1. รันสคริปต์อัปเดตผู้สมัครเก่า (ครั้งแรก)
```bash
node update-existing-candidates.cjs
```

สคริปต์นี้จะ:
- ✅ อัปเดตผู้สมัครเก่าทั้งหมดให้มี `isVisible = true` และ `isActive = true`
- ⏭️ ข้ามผู้สมัครที่มีฟิลด์อยู่แล้ว

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. เริ่มใช้งานบน Admin Dashboard
1. เข้า Admin Dashboard
2. เลือกหมวด (Band, Solo, Cover)
3. ใช้ Bulk Actions หรือ Toggle แต่ละคน

---

## 🔒 Firestore Rules

```javascript
match /candidates/{candidateId} {
  // อ่านได้: ทุกคนที่ login แล้ว
  allow read: if isAuthenticated();
  
  // อัพเดทได้:
  // - User: แก้เฉพาะ voteCount, updatedAt (โหวต)
  // - Admin: แก้ได้ทุกอย่าง (รวม isVisible, isActive)
  allow update: if isAuthenticated() && (
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['voteCount', 'updatedAt'])
    || isAdmin()
  );
  
  // สร้าง/ลบ: เฉพาะ Admin
  allow create, delete: if isAdmin();
}
```

---

## 💡 Tips & Best Practices

### ✅ DO
- ใช้ Bulk Actions เมื่อต้องการเปิด/ปิดหลายคนพร้อมกัน
- ตรวจสอบ Podium หลังแก้ไข isActive ว่าแสดงถูกต้อง
- ใช้ isVisible = false สำหรับซ่อนผู้สมัครชั่วคราว

### ❌ DON'T
- อย่าลืมเปิด isVisible สำหรับผู้สมัครใหม่ (Default = false)
- อย่าปิด isActive ทั้งหมดถ้าต้องการแสดง Podium
- อย่าลืม Deploy Rules หลังแก้ไข

---

## 📝 Changelog

### Version 1.0.0 (2026-01-29)
- ✅ เพิ่มฟิลด์ `isVisible` และ `isActive` ใน Candidate interface
- ✅ เพิ่ม Toggle buttons ใน Admin Dashboard
- ✅ เพิ่ม Bulk Actions (เปิด/ปิดทั้งหมด)
- ✅ Filter ผู้สมัครใน Vote page (isVisible)
- ✅ Filter Podium ใน VoteResults page (isActive)
- ✅ อัปเดต Firestore Rules
- ✅ สร้างสคริปต์ `update-existing-candidates.cjs`

---

## 🆘 Troubleshooting

### ปัญหา: ผู้สมัครใหม่ไม่แสดงหน้า Vote
**สาเหตุ**: Default `isVisible = false`
**แก้ไข**: Admin เปิด isVisible = true ใน Admin Dashboard

### ปัญหา: Podium ไม่แสดงผู้สมัคร
**สาเหตุ**: Default `isActive = false`
**แก้ไข**: Admin เปิด isActive = true ใน Admin Dashboard

### ปัญหา: ผู้สมัครเก่าไม่มีฟิลด์ isVisible/isActive
**แก้ไข**: รันสคริปต์
```bash
node update-existing-candidates.cjs
```

### ปัญหา: Admin แก้ isVisible/isActive ไม่ได้
**สาเหตุ**: Firestore Rules ยังไม่ deploy
**แก้ไข**:
```bash
firebase deploy --only firestore:rules
```

---

## 📞 Support
หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อ Admin

---

**สร้างโดย**: GitHub Copilot  
**วันที่**: 29 มกราคม 2026  
**เวอร์ชัน**: 1.0.0
