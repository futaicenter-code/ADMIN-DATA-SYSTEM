/**
 * config.js — ตั้งค่าการเชื่อมต่อ API (แก้ไขไฟล์นี้ไฟล์เดียวหลัง deploy Apps Script)
 *
 * 1) หลัง Deploy Google Apps Script เป็น Web App แล้ว จะได้ URL ประมาณ
 *    https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
 *    ให้คัดลอกมาใส่ใน API_URL ด้านล่าง
 *
 * 2) APP_TOKEN เป็นตัวเลือกเสริม (ไม่บังคับ) — ถ้าตั้งค่า Script property ชื่อ APP_TOKEN ไว้ในฝั่ง
 *    Apps Script ให้ใส่ค่าเดียวกันตรงนี้ด้วย เพื่อกันคนแปลกหน้าเดา URL มายิง API เล่น
 *    (นี่เป็นแค่ตัวกันเบื้องต้น ไม่ใช่ระบบ authentication ที่ปลอดภัยจริงจัง — ห้ามเก็บข้อมูลอ่อนไหวจริง ๆ
 *    ไว้ในระบบนี้ เพราะตัว Web App ต้อง deploy แบบ "Anyone" เพื่อให้ GitHub Pages เรียกข้ามโดเมนได้)
 */
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwLD0XSt3SKxJLWZHL0voxSHHL5DCLo0SNjSmk2Fl5xds18gHuLKsoZkYPX7k2jtnPy/exec",
  APP_TOKEN: ""
};
