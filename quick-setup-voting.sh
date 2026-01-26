#!/bin/bash

# 🚀 Quick Setup Vote Settings via Firebase CLI
# ======================================================

echo "🎯 EGOKE - Setup Vote Settings"
echo "=============================="
echo ""

# ตรวจสอบว่ามี Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ ไม่พบ Firebase CLI"
    echo "📦 กำลังติดตั้ง..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI พร้อมใช้งาน"
echo ""

# Login (ถ้ายังไม่ได้ login)
echo "🔑 ตรวจสอบการ Login..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "📝 กรุณา Login เข้า Firebase..."
    firebase login
fi

echo "✅ Login แล้ว"
echo ""

# เลือกโปรเจกต์
echo "📂 เลือกโปรเจกต์..."
firebase use egoke-7dae5

echo ""
echo "🔥 กำลัง Deploy Firestore Rules..."
firebase deploy --only firestore:rules

echo ""
echo "📝 กำลังสร้างข้อมูล Vote Settings..."
echo ""

# รัน TypeScript script ด้วย Admin SDK
npx tsx setup-vote-admin.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ สำเร็จ! Vote Settings ถูกสร้างแล้ว"
    echo ""
    echo "📋 ขั้นตอนต่อไป:"
    echo "   1. เปิด http://localhost:5173/admin (หรือ https://egoke.areazeroai.com/admin)"
    echo "   2. กด F5 รีเฟรช"
    echo "   3. คุณจะเห็นปุ่ม '▶️ เปิดการโหวต' สำหรับ 3 หมวด"
    echo "   4. คลิกปุ่มเพื่อเปิดการโหวต"
    echo ""
    echo "🎉 เสร็จสมบูรณ์!"
else
    echo ""
    echo "❌ เกิดข้อผิดพลาด"
    echo ""
    echo "💡 แก้ไข:"
    echo "   1. ตรวจสอบว่า Firestore Rules ถูก Deploy แล้ว"
    echo "   2. ตรวจสอบว่า login Firebase แล้ว"
    echo "   3. ลองรันใหม่: ./quick-setup-voting.sh"
fi
