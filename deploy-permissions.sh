#!/bin/bash

# 🔥 Deploy Firestore Rules with Hierarchical Permissions
# SuperAdmin > Admin > Staff > User

echo "🎯 EGOKE - Deploy Hierarchical Permissions"
echo "=========================================="
echo ""

# ตรวจสอบว่ามี Firebase CLI หรือยัง
if ! command -v firebase &> /dev/null
then
    echo "❌ ไม่พบ Firebase CLI"
    echo "📦 กำลังติดตั้ง Firebase CLI..."
    npm install -g firebase-tools
    echo ""
fi

echo "✅ พบ Firebase CLI แล้ว"
echo ""

# Login เข้า Firebase (ถ้ายังไม่ได้ login)
echo "🔑 ตรวจสอบการ Login..."
firebase login:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "📝 กรุณา Login เข้า Firebase..."
    firebase login
else
    echo "✅ Login แล้ว"
fi
echo ""

# ตรวจสอบโปรเจกต์
echo "📂 ตรวจสอบโปรเจกต์..."
firebase use egoke-7dae5
echo ""

# Deploy Firestore Rules
echo "🔒 กำลัง Deploy Firestore Security Rules (Hierarchical Permissions)..."
echo "   👑 SuperAdmin > 🛡️ Admin > 🔧 Staff > 👤 User"
echo ""
firebase deploy --only firestore:rules
echo ""

# ตรวจสอบผลลัพธ์
if [ $? -eq 0 ]; then
    echo "✅ Deploy Firestore Rules สำเร็จ!"
    echo ""
    echo "📋 ระบบ Permissions ใหม่:"
    echo "   👑 SuperAdmin → สิทธิ์เต็ม (ทำได้ทุกอย่าง)"
    echo "   🛡️ Admin → สิทธิ์สูง (ทำได้ทุกอย่างที่ Staff ทำได้)"
    echo "   🔧 Staff → จัดการโหวต + ดูข้อมูล"
    echo "   👤 User → โหวต + ดูของตัวเอง"
    echo ""
    echo "📖 อ่านเพิ่มเติม: PERMISSIONS_GUIDE.md"
    echo ""
    echo "🎉 เสร็จสมบูรณ์!"
else
    echo "❌ Deploy ล้มเหลว"
    echo "กรุณาตรวจสอบ error ข้างบน"
    echo ""
    echo "วิธีแก้ไข:"
    echo "1. รัน: firebase login"
    echo "2. รันใหม่: ./deploy-permissions.sh"
fi
