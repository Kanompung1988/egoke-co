# 🎯 วิธีเปิดการโหวตให้ User โหวตได้

## 🚀 วิธีที่ 1: ผ่าน Firebase Console (แนะนำ - ง่ายที่สุด!)

### ขั้นตอน:

1. **เปิด Firebase Console:**
   - ไปที่: https://console.firebase.google.com/project/egoke-7dae5/firestore/data

2. **สร้าง Collection `voteSettings`:**
   - คลิก **"Start collection"**
   - Document ID: `config`
   - คลิก **"Next"**

3. **เพิ่ม Field `categories` (type: map):**
   ```
   Field: categories
   Type: map
   
   ภายใน map มี 3 หมวด:
   
   ├─ karaoke (map)
   │  ├─ id: "karaoke" (string)
   │  ├─ title: "Karaoke Contest" (string)
   │  ├─ description: "ประกวดร้องเพลง" (string)
   │  ├─ isOpen: false (boolean) ← ⭐ สำคัญ!
   │  ├─ sessionId: "session_001_karaoke" (string)
   │  ├─ openTime: null
   │  ├─ closeTime: null
   │  └─ autoClose: false (boolean)
   │
   ├─ food (map)
   │  ├─ id: "food" (string)
   │  ├─ title: "Best Food" (string)
   │  ├─ description: "อาหารอร่อยที่สุด" (string)
   │  ├─ isOpen: false (boolean) ← ⭐ สำคัญ!
   │  ├─ sessionId: "session_001_food" (string)
   │  ├─ openTime: null
   │  ├─ closeTime: null
   │  └─ autoClose: false (boolean)
   │
   └─ cosplay (map)
      ├─ id: "cosplay" (string)
      ├─ title: "Cosplay Contest" (string)
      ├─ description: "คอสเพลย์สวยที่สุด" (string)
      ├─ isOpen: false (boolean) ← ⭐ สำคัญ!
      ├─ sessionId: "session_001_cosplay" (string)
      ├─ openTime: null
      ├─ closeTime: null
      └─ autoClose: false (boolean)
   ```

4. **บันทึก** แล้วเสร็จ!

---

## 🎮 วิธีที่ 2: ใช้ Script (ถ้า login Firebase CLI แล้ว)

### ขั้นตอน:

1. **Deploy Firestore Rules ก่อน:**
   ```bash
   cd /Users/t333838/Downloads/EGOKE
   firebase login
   firebase deploy --only firestore:rules
   ```

2. **รัน Setup Script:**
   ```bash
   npx tsx setup-vote-settings.ts
   ```

---

## 📋 วิธีที่ 3: Copy-Paste JSON (เร็วที่สุด!)

### ขั้นตอน:

1. เปิด Firebase Console: https://console.firebase.google.com/project/egoke-7dae5/firestore/data

2. คลิก **"Start collection"**
   - Collection ID: `voteSettings`
   - Document ID: `config`

3. คลิก **"Add field"** → เลือก **"Code editor"**

4. **Copy JSON นี้ทั้งหมดแล้ว Paste:**

```json
{
  "categories": {
    "karaoke": {
      "id": "karaoke",
      "title": "Karaoke Contest",
      "description": "ประกวดร้องเพลง",
      "isOpen": false,
      "openTime": null,
      "closeTime": null,
      "autoClose": false,
      "sessionId": "session_20260126_karaoke"
    },
    "food": {
      "id": "food",
      "title": "Best Food",
      "description": "อาหารอร่อยที่สุด",
      "isOpen": false,
      "openTime": null,
      "closeTime": null,
      "autoClose": false,
      "sessionId": "session_20260126_food"
    },
    "cosplay": {
      "id": "cosplay",
      "title": "Cosplay Contest",
      "description": "คอสเพลย์สวยที่สุด",
      "isOpen": false,
      "openTime": null,
      "closeTime": null,
      "autoClose": false,
      "sessionId": "session_20260126_cosplay"
    }
  }
}
```

5. คลิก **"Save"** เสร็จเลย!

---

## ✅ หลังจากสร้างแล้ว

### 1. **รีเฟรชหน้า Admin:**
   - กลับไปที่ http://localhost:5173/admin
   - กด F5 รีเฟรช

### 2. **คุณจะเห็นปุ่มเหล่านี้:**
   ```
   🎛️ ควบคุมการโหวต
   
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │   🎤 Karaoke    │  │    🍜 Food      │  │  👘 Cosplay     │
   │                 │  │                 │  │                 │
   │ [▶️ เปิดการโหวต]│  │ [▶️ เปิดการโหวต]│  │ [▶️ เปิดการโหวต]│
   │   ⏸️ ปิดอยู่     │  │   ⏸️ ปิดอยู่     │  │   ⏸️ ปิดอยู่     │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
   ```

### 3. **เปิดการโหวต:**
   - คลิกปุ่ม **"▶️ เปิดการโหวต"** ที่หมวดที่ต้องการ (เช่น Cosplay)
   - ปุ่มจะเปลี่ยนเป็น **"🔴 ปิดการโหวต"**
   - สถานะจะเป็น **"✅ เปิดอยู่"** (สีเขียว)

### 4. **User สามารถโหวตได้แล้ว!**
   - User เข้าหน้า `/vote`
   - จะเห็นผู้สมัครในหมวดที่เปิด
   - สามารถโหวตได้เลย!

---

## 🔥 ปิดการโหวต

เมื่อต้องการปิด:
1. กลับมาที่หน้า `/admin`
2. คลิกปุ่ม **"🔴 ปิดการโหวต"**
3. สถานะจะเปลี่ยนเป็น **"⏸️ ปิดอยู่"**
4. User จะโหวตไม่ได้แล้ว (แสดงข้อความ "เร็วๆ นี้")

---

## 📊 สรุปแบบเร็ว

```bash
# ถ้ายังไม่มีข้อมูล voteSettings:
1. ไปที่ Firebase Console
2. สร้าง collection: voteSettings
3. สร้าง document: config
4. Copy JSON ข้างบนไป Paste
5. Save

# หลังจากนั้น:
1. รีเฟรชหน้า /admin
2. คลิก "▶️ เปิดการโหวต"
3. User โหวตได้เลย!
```

---

## ⚠️ หมายเหตุ

- **isOpen: false** = ปิดการโหวต
- **isOpen: true** = เปิดการโหวต
- **sessionId** ควรไม่ซ้ำกันในแต่ละรอบ (ถ้าเปิดใหม่จะสร้าง session ใหม่อัตโนมัติ)
- Staff/Admin/SuperAdmin สามารถเปิด/ปิดการโหวตได้

---

## 🆘 แก้ไขปัญหา

### ปัญหา: ไม่เห็นปุ่มเปิด/ปิดการโหวต
**แก้:** ตรวจสอบว่ามีข้อมูล `voteSettings/config` ใน Firestore หรือยัง

### ปัญหา: PERMISSION_DENIED
**แก้:** Deploy Firestore Rules:
```bash
firebase deploy --only firestore:rules
```

### ปัญหา: User โหวตไม่ได้
**แก้:** 
1. ตรวจสอบว่า `isOpen: true` หรือยัง
2. ตรวจสอบว่ามีผู้สมัคร (candidates) ในหมวดนั้นหรือยัง
3. Deploy Firestore Rules

---

**🎉 เสร็จแล้ว! ระบบโหวตพร้อมใช้งาน!**
