#!/bin/bash

# 🚀 EGOKE Super Admin Setup Script
# สคริปต์นี้จะช่วย Deploy Firestore Rules และเช็คสถานะระบบ

echo "🎯 EGOKE Super Admin Setup"
echo "================================"
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
echo "🔒 กำลัง Deploy Firestore Security Rules..."
firebase deploy --only firestore:rules
echo ""

# ตรวจสอบผลลัพธ์
if [ $? -eq 0 ]; then
    echo "✅ Deploy Firestore Rules สำเร็จ!"
    echo ""
    echo "📋 ขั้นตอนต่อไป:"
    echo "   1. เปิดเว็บไซต์: https://egoke.areazeroai.com"
    echo "   2. Login ด้วย: thanaponchanal@gmail.com"
    echo "   3. เข้าหน้า Super Admin: /superadmin"
    echo "   4. ลองจัดการ role ของ user คนอื่น"
    echo ""
    echo "🎉 เสร็จสมบูรณ์!"
else
    echo "❌ Deploy ล้มเหลว"
    echo "กรุณาตรวจสอบ error ข้างบน"
fi
