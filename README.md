# Back Office Management System (ต้นแบบ)
### โมดูลแรก: 🚗 จัดการรถบริษัท (Vehicle Management) + 🏍️ ประกันรถมอไซ

ระบบหลังบ้านที่แยก **หน้าเว็บ (Frontend)** ออกจาก **สมองประมวลผล (Backend)** อย่างชัดเจน
ตามมาตรฐานสถาปัตยกรรมของบริษัท:

| ส่วน | ทำหน้าที่ | โฮสต์ที่ |
|---|---|---|
| 🌐 **Frontend** | หน้าเว็บ (HTML/CSS/JS ล้วน ๆ ไม่มี server-side template) | **GitHub Pages** |
| 🧠 **Backend** | รับ-ตรวจ-ประมวลผลข้อมูล ผ่าน JSON API เท่านั้น (ไม่ render หน้าเว็บ) | **Google Apps Script (Web App)** |
| 🗄️ **ฐานข้อมูล** | เก็บข้อมูลทุกตาราง แก้ไข/ตรวจสอบเองได้โดยตรง | **Google Sheets** |
| 🖼️ **ไฟล์/รูปภาพ** | เก็บรูปรถ, กรมธรรม์, ใบเสร็จ ฯลฯ | **Google Drive** |

หน้าเว็บคุยกับ Apps Script ผ่าน `fetch()` เท่านั้น (ไม่ใช่ `google.script.run` และไม่เปิดแอปจาก URL
ของ Apps Script โดยตรง) ทำให้โหลดเร็ว แก้ไขหน้าเว็บง่ายเหมือนเว็บทั่วไป และ Apps Script ทำหน้าที่เป็น
API/สมองอย่างเดียว — ข้อมูลธุรกิจทั้งหมดยังอยู่ใน Google Sheets, รูป/เอกสารอยู่ใน Google Drive เสมอ
รีเฟรชหน้าเว็บ เปลี่ยนเครื่อง หรือปิดเบราว์เซอร์แล้วเปิดใหม่ ข้อมูลไม่มีทางหาย เพราะไม่มีการเก็บข้อมูลธุรกิจ
ไว้ใน `localStorage`/หน่วยความจำเบราว์เซอร์เลย

---

## 1. โครงสร้างไฟล์ในโปรเจกต์

```
back-office-vms/
├── index.html            ← หน้าเว็บหลัก (SPA shell + เมนู) — ไฟล์ static ล้วน ๆ
├── style.css             ← CSS ทั้งหมด
├── config.js             ← ⚙️ ไฟล์เดียวที่ต้องแก้หลัง deploy: ใส่ API_URL ของ Apps Script
├── app.js                ← โค้ดฝั่ง Client ทั้งหมด (router, dashboard, หน้ารถ, ฟอร์ม, เรียก API ด้วย fetch())
│                            → ทั้ง 4 ไฟล์นี้คือ "Frontend" อัปโหลดขึ้น GitHub แล้วเปิด GitHub Pages ได้เลย
│
└── apps-script/          ← "Backend" — นำไปวางในโปรเจกต์ Google Apps Script
    ├── Code.gs            ← โค้ดฝั่ง Server ทั้งหมด (Config + Utils + Setup + Drive + ทุกโมดูล CRUD +
    │                          Dashboard + Alert + doGet/doPost API) รวมไฟล์เดียว มีสารบัญกำกับหัวข้อ
    └── appsscript.json    ← ไฟล์ manifest (timezone ไทย + สิทธิ์ web app แบบ "Anyone")
```

รวมทั้งหมด **5 ไฟล์เนื้อหา** (ไม่นับ manifest ที่ Apps Script ดูแลให้เอง) แบ่งเป็น 2 กลุ่มตามที่ที่ต้องอัปโหลด:
กลุ่ม Frontend 4 ไฟล์ (root ของ repo → GitHub Pages) และกลุ่ม Backend 1 ไฟล์โค้ด + manifest (โฟลเดอร์
`apps-script/` → วางใน Apps Script editor) ภายในไฟล์ `Code.gs` และ `app.js` มีสารบัญ (comment banner)
อยู่บนสุดของไฟล์ ใช้ Ctrl+F ค้นหาชื่อหัวข้อเพื่อกระโดดไปแก้ได้ทันที

---

## 2. วิธีติดตั้ง (ทำครั้งเดียว)

ลำดับการติดตั้งคือ **ตั้ง Backend ก่อน แล้วค่อยตั้ง Frontend** เพราะ Frontend ต้องรู้ URL ของ Backend
ก่อนถึงจะใช้งานได้

### ขั้นตอนที่ 1 — สร้างโปรเจกต์ Apps Script (Backend)

1. ไปที่ [script.google.com](https://script.google.com) → New Project
2. ตั้งชื่อโปรเจกต์ เช่น "Back Office Management System"
3. ไฟล์ `Code.gs` ที่มีอยู่แล้วเริ่มต้น — เปิดแล้วลบเนื้อหาเดิมทิ้ง วางเนื้อหาจาก `apps-script/Code.gs` แทน
4. เปิด **Project Settings** (รูปเฟือง) → ติ๊ก **"Show appsscript.json manifest file in editor"** →
   กลับไปที่แท็บไฟล์ เปิด `appsscript.json` แล้ววางเนื้อหาจาก `apps-script/appsscript.json` แทน (สำคัญ —
   ค่า `"access": "ANYONE_ANONYMOUS"` ในไฟล์นี้จำเป็นต่อการให้ GitHub Pages เรียก API ข้ามโดเมนได้)

**ทางเลือกสำหรับสาย dev (ใช้ clasp เชื่อมกับ GitHub ได้):**
```bash
npm install -g @google/clasp
clasp login
cd back-office-vms
clasp create --type webapp --title "Back Office Management System" --rootDir ./apps-script
clasp push
```

### ขั้นตอนที่ 2 — สร้าง Spreadsheet + Drive อัตโนมัติ

ระบบจะ**สร้าง Google Sheets และโฟลเดอร์ Drive ใหม่ทั้งหมดให้เองอัตโนมัติ** ไม่ผูกกับสเปรดชีตเก่าที่มีอยู่แล้ว
(ถ้ามีสเปรดชีต/ไฟล์เก่าที่เคยจดข้อมูลรถไว้ ให้ใช้เป็นแค่ข้อมูลอ้างอิงเวลาคีย์ข้อมูลรถเข้าระบบใหม่นี้เท่านั้น
ไม่ต้องเอา Spreadsheet ID ของไฟล์เก่ามาใส่ในระบบ):

1. ในหน้า Apps Script editor เปิดไฟล์ `Code.gs` แล้วเลือกฟังก์ชัน `setupWizard` จาก dropdown บนแถบเครื่องมือ
2. กด ▶ Run (ครั้งแรกจะมีหน้าต่างขอสิทธิ์ authorize ให้กด Allow)
3. ระบบจะ:
   - สร้าง Google Sheets **ใหม่ทั้งหมด** ชื่อ "Back Office Management System - Database"
   - สร้างชีตย่อยทั้ง 14 ชีตพร้อมหัวคอลัมน์ภาษาไทยครบถ้วน (ไม่มีข้อมูลใด ๆ จากไฟล์เก่าติดมาด้วย) —
     ทุกแถวมีรหัสอ้างอิงไม่ซ้ำ (เช่น `VH-20260826-0001`) เป็น primary key เสมอ **ไม่ใช้เลขแถวเป็น ID**
   - สร้างโฟลเดอร์ Google Drive **ใหม่ทั้งหมด** ชื่อ "BACK OFFICE" พร้อมโฟลเดอร์ย่อย VEHICLE/MOTORCYCLE
   - บันทึก Spreadsheet ID และ Drive Folder ID ของไฟล์ใหม่นี้ลงใน **Script properties** ให้อัตโนมัติ
     (ไม่มีการฝัง ID หรือ secret ใด ๆ ไว้ในโค้ดฝั่งหน้าเว็บ)
4. ดู Log (Ctrl+Enter หรือเมนู View > Logs) เพื่อคัดลอกลิงก์ Spreadsheet ใหม่ที่สร้างขึ้น

> รันฟังก์ชัน `setupWizard()` ซ้ำได้เสมอโดยไม่เป็นอันตราย — ครั้งแรกจะสร้างไฟล์ใหม่ให้ ส่วนครั้งถัดไปจะแค่
> **ตรวจสอบและเติมชีต/โฟลเดอร์ที่ขาดหายไปในไฟล์เดิมที่สร้างไว้แล้ว** ไม่สร้างไฟล์ซ้ำและไม่ลบ/ทับข้อมูลเดิม
> (ปุ่ม "ตรวจสอบ/สร้างโครงสร้างข้อมูลใหม่" ในหน้าเว็บ ⚙️ ตั้งค่าระบบ ก็เรียกตัวตรวจสอบชุดเดียวกันนี้ผ่าน API)

### ขั้นตอนที่ 3 — Deploy Apps Script เป็น Web App (API)

1. ที่มุมขวาบนของ Apps Script editor กด **Deploy** → **New deployment**
2. เลือกประเภท (Select type) เป็น **Web app**
3. ตั้งค่าให้ตรงตามนี้ **(สำคัญมาก)**:
   - **Execute as**: `Me` (บัญชีของคุณ) — เพื่อให้ API มีสิทธิ์เข้าถึง Sheets/Drive แทนผู้ใช้ทุกคน
   - **Who has access**: `Anyone` — จำเป็นสำหรับให้ GitHub Pages (คนละโดเมน) เรียก API แบบไม่ต้อง login
     ด้วยบัญชี Google (ตรงกับ `"access": "ANYONE_ANONYMOUS"` ใน `appsscript.json`)
4. กด **Deploy** → คัดลอก **Web app URL** ที่ได้ (รูปแบบ
   `https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec`) — นี่คือ `API_URL` ที่จะเอาไปใส่ใน
   `config.js` ของ Frontend ในขั้นตอนถัดไป
5. ทุกครั้งที่แก้โค้ด `Code.gs` แล้วต้องการให้ URL เดิมใช้เวอร์ชันใหม่ ให้ไปที่ Deploy → Manage deployments →
   แก้ไข (ไอคอนดินสอ) → เปลี่ยน Version เป็น "New version" → Deploy (URL เดิมไม่เปลี่ยน ไม่ต้องแก้ `config.js` ซ้ำ)

> **ทำไมต้อง "Anyone" ทั้งที่ดูไม่ปลอดภัย?** เพราะหน้าเว็บรันอยู่บน GitHub Pages คนละโดเมนกับ Google
> จึงไม่มี session ของ Google ติดไปด้วยตอนเรียก API — ถ้าตั้งเป็น "Anyone within องค์กร" หรือ "Only myself"
> การเรียกจากหน้าเว็บจะถูกปฏิเสธเสมอ ความปลอดภัยที่แท้จริงจึงมาจาก 2 ชั้นนี้แทน: (1) `APP_TOKEN`
> (ดูหัวข้อ 6) และ (2) การที่ secret/credential ทุกตัว (Spreadsheet ID, Drive Folder ID) ถูกเก็บไว้ใน
> Script properties ฝั่ง Apps Script เท่านั้น ไม่เคยถูกส่งลงมาฝัง หรือ hardcode ไว้ในโค้ดฝั่ง GitHub Pages เลย

> **หมายเหตุเรื่องสิทธิ์การเปิดไฟล์**: ไฟล์ที่อัปโหลด (รูปรถ, กรมธรรม์, ใบเสร็จ ฯลฯ) จะถูกเก็บในโฟลเดอร์ Drive
> ของบัญชีที่ deploy เว็บแอป (Execute as: Me) ผู้ใช้งานคนอื่นจะเปิดลิงก์ไฟล์ได้ก็ต่อเมื่อมีสิทธิ์เข้าถึงโฟลเดอร์
> "BACK OFFICE" นั้น แนะนำให้แชร์โฟลเดอร์ "BACK OFFICE" ทั้งโฟลเดอร์ให้กับทีม/องค์กรครั้งเดียวหลังติดตั้งเสร็จ
> (คลิกขวาที่โฟลเดอร์ใน Drive → Share) ไฟล์ใหม่ที่สร้างในโฟลเดอร์ย่อยจะสืบสิทธิ์การแชร์จากโฟลเดอร์แม่โดยอัตโนมัติ

### ขั้นตอนที่ 4 — ตั้งค่าและอัปโหลด Frontend ขึ้น GitHub Pages

1. เปิดไฟล์ `config.js` แก้ค่า `API_URL` ให้เป็น Web app URL ที่คัดลอกมาจากขั้นตอนที่ 3:
   ```js
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec",
     APP_TOKEN: ""   // ใส่ค่าเดียวกับที่ตั้งใน Script properties ถ้าเปิดใช้ APP_TOKEN (ดูหัวข้อ 6)
   };
   ```
2. สร้าง repository ใหม่บน GitHub (หรือใช้ repo เดิม) แล้วอัปโหลดไฟล์ทั้งหมดในโปรเจกต์นี้ขึ้นไป
   (ผ่านเว็บ GitHub: **Add file → Upload files** ลากทุกไฟล์/โฟลเดอร์ในนี้ขึ้นไปได้เลย หรือใช้ `git push`
   ตามหัวข้อ 7 ด้านล่าง)
3. ไปที่ repo → **Settings → Pages** → เลือก **Branch: main** และโฟลเดอร์ **`/ (root)`** → Save
4. รอสักครู่ GitHub จะให้ URL หน้าเว็บ เช่น `https://<username>.github.io/<repo>/` — เปิดลิงก์นี้ใช้งานได้ทันที
5. หลังจากนี้ **แก้เฉพาะไฟล์ในโฟลเดอร์ root** (`index.html`/`style.css`/`config.js`/`app.js`) แล้ว commit
   ขึ้น GitHub เพื่ออัปเดตหน้าเว็บ — GitHub Pages จะ deploy เวอร์ชันใหม่ให้อัตโนมัติภายในไม่กี่นาที
   โดยไม่กระทบข้อมูลใน Google Sheets/Drive เลย (Frontend กับ Backend เป็นอิสระต่อกันโดยสมบูรณ์)

เปิดหน้าเว็บครั้งแรกแล้วเจอ "🚧 ยังไม่ได้ตั้งค่าระบบฝั่ง Apps Script" แปลว่ายังไม่ได้รัน `setupWizard`
(ขั้นตอนที่ 2) หรือรันแล้วแต่ deploy ใหม่ยังไม่เสร็จ — ตรวจสอบและรีเฟรชอีกครั้ง

---

## 3. API Contract (Frontend ↔ Backend)

หน้าเว็บเรียก Apps Script ผ่าน `fetch()` เท่านั้น แบ่งเป็น 2 รูปแบบตามชนิดการทำงาน:

**อ่านข้อมูล (GET)** — เรียกตรง ๆ ผ่าน query string เพราะ GET เป็น "simple request" ไม่ถูกเบราว์เซอร์ยิง
CORS preflight (OPTIONS) มาก่อน:
```
GET {API_URL}?action=listVehicles&token=...
GET {API_URL}?action=getVehicleDetail&vehicleId=VH-20260826-0001&token=...
```

**เขียน/แก้ไข/อัปโหลดไฟล์ (POST)** — ส่ง body เป็น JSON string แต่ตั้ง header
`Content-Type: text/plain;charset=utf-8` โดยตั้งใจ (ไม่ใช่ `application/json`) เพื่อให้ยังนับเป็น
"simple request" เช่นกัน — เลี่ยงปัญหา Apps Script ที่ไม่รองรับ CORS preflight เต็มรูปแบบ:
```
POST {API_URL}
Content-Type: text/plain;charset=utf-8

{ "action": "createVehicle", "token": "...", "payload": { ... } }
```

ทุก response หน้าตาเดียวกันเสมอ: `{ "success": true, "data": {...} }` หรือ `{ "success": false, "error": "ข้อความภาษาไทย" }`

| ชนิด | action | ใช้ทำอะไร |
|---|---|---|
| GET | `checkSystemStatus` | เช็คว่าตั้งค่าระบบไว้หรือยัง (เรียกอัตโนมัติตอนเปิดหน้าเว็บ) |
| GET | `getFormOptions` | ตัวเลือกในฟอร์ม (มาจากชีต `MasterData`) |
| GET | `listVehicles` | รายชื่อรถทั้งหมด + สรุปประกัน/ภาษี/พ.ร.บ. ปีปัจจุบัน สำหรับหน้าการ์ด |
| GET | `getVehicleDetail` | รายละเอียดรถ 1 คัน (รวมประกัน/ภาษี/พ.ร.บ./เช็คระยะ/ค่าใช้จ่าย/เอกสารทั้งหมด) |
| GET | `listInsuranceByVehicle` / `listTaxByVehicle` / `listCompulsoryByVehicle` / `listServiceByVehicle` / `listExpensesByVehicle` | ดึงประวัติแยกทีละประเภท (สำรองไว้ใช้ต่อยอด — หน้าเว็บปัจจุบันใช้ `getVehicleDetail` ที่รวมให้แล้ว) |
| GET | `listMotorcycles` / `listMotoInsurance` | รายชื่อมอไซ / ประกันมอไซ |
| GET | `listPackagingItems` | รายชื่อรายการแพ็คเกจจิ้งทั้งหมด + สรุปการสั่งซื้อล่าสุดของแต่ละรายการ |
| GET | `getPackagingItemDetail` | รายละเอียดรายการ 1 ชนิด + ประวัติการสั่งซื้อทั้งหมด |
| GET | `getDashboardSummary` | สรุปสำหรับหน้า Dashboard |
| GET | `computeAlerts` | คำนวณรายการใกล้หมดอายุสด ๆ (ใช้ภายใน `getDashboardSummary`) |
| POST | `runSystemSetup` | ตรวจสอบ/สร้างชีต+โฟลเดอร์ให้ครบ (ปุ่มในหน้า ⚙️ ตั้งค่าระบบ) |
| POST | `refreshAlertsSheet` | รีเฟรชแคชชีต `VehicleAlerts` |
| POST | `createVehicle` / `updateVehicle` / `uploadVehiclePhoto` | จัดการข้อมูลรถ + รูปรถ |
| POST | `createInsurance` / `updateInsurance` / `uploadInsuranceFile` | ประกันรถ |
| POST | `createTax` / `updateTax` / `uploadTaxFile` | ภาษีรถ |
| POST | `createCompulsory` / `updateCompulsory` / `uploadCompulsoryFile` | พ.ร.บ. |
| POST | `createServiceRecord` / `updateServiceRecord` / `uploadServiceFile` | ประวัติเช็คระยะ (รองรับรูปที่ 1/2 + ใบเสร็จ) |
| POST | `createExpense` / `updateExpense` / `deleteExpense` / `uploadExpenseFile` | ค่าใช้จ่ายรถ (รองรับแก้ไข/ลบเต็มรูปแบบ) |
| POST | `createMotorcycle` / `updateMotorcycle` | ข้อมูลมอไซ |
| POST | `createMotoInsurance` / `updateMotoInsurance` / `uploadMotoInsuranceFile` | ประกันอุบัติเหตุมอไซ |
| POST | `createPackagingItem` / `updatePackagingItem` / `deletePackagingItem` / `uploadPackagingItemImage` | รายการแพ็คเกจจิ้ง (ลบได้เฉพาะรายการที่ยังไม่มีประวัติสั่งซื้อ) |
| POST | `createPackagingOrder` / `updatePackagingOrder` / `deletePackagingOrder` / `uploadPackagingBillFile` | ประวัติการสั่งซื้อของแต่ละรายการ (รองรับแก้ไข/ลบเต็มรูปแบบ) |

ทุก action ที่รับ `fileData` เป็น payload แบบ `{ name, mimeType, base64 }` (ฝั่งหน้าเว็บบีบอัดรูปให้อัตโนมัติ
ก่อนส่งถ้าไฟล์ใหญ่เกินไป — ดูหัวข้อ 6) แล้ว Apps Script จะบันทึกไฟล์ลง Drive และเก็บเฉพาะ `fileId`/`fileUrl`
กลับเข้า Google Sheets เท่านั้น **ไม่มีการเก็บ base64 ของรูปไว้ในชีตเลย**

---

## 4. โครงสร้าง Google Sheets (สร้างอัตโนมัติ)

| ชีต | หน้าที่ |
|---|---|
| `Vehicles` | ข้อมูลรถหลัก (ตารางแม่) |
| `VehicleInsurance` | ประกันรถแต่ละปี/กรมธรรม์ |
| `VehicleTax` | ภาษีรถ |
| `VehicleCompulsory` | พ.ร.บ. |
| `VehicleService` | ประวัติ "เช็คระยะ" (ไม่ทับข้อมูลเดิม เพิ่มแถวใหม่ทุกครั้ง) |
| `VehicleDocuments` | log เอกสารทุกไฟล์ที่อัปโหลดขึ้น Drive |
| `VehicleExpenses` | ค่าใช้จ่ายรถ |
| `VehicleAlerts` | แคชรายการใกล้หมดอายุ (รีเฟรชได้จากหน้าตั้งค่าระบบ) |
| `Motorcycles` | ข้อมูลรถมอไซ (แบบย่อ) |
| `MotorcycleInsurance` | ประกันอุบัติเหตุรถมอไซ |
| `Employees` | ผู้รับผิดชอบรถ (ไว้ต่อยอด) |
| `MasterData` | ค่าตัวเลือกในฟอร์ม (สถานะรถ, แผนก, ประเภทค่าใช้จ่าย ฯลฯ) แก้ไขเพิ่ม/ลดตัวเลือกได้ที่ชีตนี้โดยตรง |
| `Users` | สิทธิ์การเข้าใช้งาน (ไว้ต่อยอดระบบสิทธิ์) |
| `SystemLog` | ประวัติการแก้ไขข้อมูลทุกครั้ง (audit log) |
| `PackagingItems` | รายการ/สเปกวัสดุแพ็คของแต่ละชนิด (กล่อง, เทป, ถุงแพ็ค ฯลฯ) — ตารางแม่ |
| `PackagingOrders` | ประวัติการสั่งซื้อแต่ละครั้งของแต่ละรายการ (วันที่, จำนวน, ราคา, เลขบิล, ไฟล์บิล) |

ทุกตารางย่อยเชื่อมกลับมาที่ `Vehicles` ด้วยคอลัมน์ `รหัสรถ` (vehicleId) — เพิ่มประวัติได้ไม่จำกัดโดยไม่ทับ
ของเดิม (สำคัญที่สุดสำหรับ "เช็คระยะ" ที่ต้องดูย้อนหลังได้ทุกครั้ง) และทุกแถวในทุกชีตมี **รหัสอ้างอิงเฉพาะแถว
เป็นของตัวเอง** ในรูปแบบ `PREFIX-yyyyMMdd-0001` (เช่น `VH-20260826-0001`, `INS-20260826-0002`) —
สร้างจากฟังก์ชัน `generateDatedId_()` ใน `Code.gs` **ไม่มีตารางไหนใช้เลขแถวเป็น primary key**

หัวคอลัมน์ทั้งหมดเป็น**ภาษาไทย** และนิยามไว้ที่เดียวในไฟล์ `apps-script/Code.gs` ส่วนหัวข้อ
"การตั้งค่าและโครงสร้างข้อมูล" (ตัวแปร `SCHEMAS`) — ต้องการเพิ่ม/ลดคอลัมน์ ให้แก้ที่จุดนี้ที่เดียว ระบบจะสร้าง
หัวคอลัมน์ใหม่ให้อัตโนมัติเมื่อรัน `setupWizard`/`runSystemSetup` อีกครั้ง

คุณสามารถเปิด Google Sheet นี้ดูข้อมูลได้เองโดยตรงตลอดเวลา (ไม่ต้องผ่านหน้าเว็บ) เพื่อตรวจสอบหรือแก้ไข
กรณีจำเป็น

---

## 5. โครงสร้าง Google Drive (สร้างอัตโนมัติ)

```
BACK OFFICE/
├── VEHICLE/
│   ├── VH-20260826-0001_กข-1234/
│   │   ├── Photos/       (รูปรถ)
│   │   ├── Insurance/    (กรมธรรม์ + ใบเสร็จ)
│   │   ├── Tax/          (เอกสารภาษี)
│   │   ├── Compulsory/   (เอกสาร พ.ร.บ.)
│   │   └── Service/      (ใบเสร็จ/รูปเช็คระยะ + ไฟล์ค่าใช้จ่ายอื่น)
│   └── VH-20260826-0002_.../
├── MOTORCYCLE/
│   └── MC-20260826-0001_.../
│       └── Insurance/
└── PACKAGING/
    └── PKG-20260826-0001_กล่องพัสดุเบอร์2/
        ├── Reference/  (รูปตัวอย่างสินค้า)
        └── Bills/      (ไฟล์บิล/ใบเสร็จของการสั่งซื้อแต่ละครั้ง)
```

เวลาอัปโหลดจากหน้าเว็บ → บีบอัดรูปถ้าไฟล์ใหญ่เกินไป (ฝั่ง client) → ส่ง base64 ไปที่ Apps Script ผ่าน
`fetch()` → Apps Script ค้นหา/ใช้ folder ID ที่บันทึกไว้ซ้ำ (ไม่สร้างโฟลเดอร์ใหม่ทุกครั้งที่อัปโหลด) →
บันทึกไฟล์เข้าโฟลเดอร์ของรถคันนั้น → คืนค่า File ID/URL กลับมา → บันทึก File ID ลง Google Sheets →
หน้าเว็บแสดงลิงก์ไฟล์ให้กดเปิดได้ทันที ไฟล์จะยังอยู่ครบแม้รีเฟรชหน้า เปลี่ยนเครื่อง หรือปิด-เปิดเบราว์เซอร์ใหม่
เพราะไฟล์จริงอยู่ใน Drive และรหัสอ้างอิงอยู่ใน Sheets เสมอ ไม่ได้พึ่ง cache/localStorage ของเบราว์เซอร์เลย

---

## 6. ความปลอดภัยและการจัดการ error

- **Secret ทุกตัวอยู่ฝั่ง Apps Script เท่านั้น**: `SPREADSHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `APP_TOKEN`
  เก็บใน Script properties (Project Settings → Script properties) ไม่เคยถูกฝังในโค้ดฝั่ง GitHub Pages —
  โค้ดฝั่งหน้าเว็บมีแค่ `API_URL` (ซึ่งเป็น public URL อยู่แล้วโดยธรรมชาติของ Web App) กับ `APP_TOKEN`
  ที่เป็นเพียง**ตัวกันเบื้องต้น** (กันคนแปลกหน้าเดา URL มายิงเล่น) ไม่ใช่ระบบ authentication ที่สมบูรณ์
  — ตั้งค่าได้โดยเพิ่ม Script property ชื่อ `APP_TOKEN` ในฝั่ง Apps Script แล้วใส่ค่าเดียวกันใน
  `config.js` ฝั่งหน้าเว็บ
- **ป้องกันกดซ้ำ/ส่งข้อมูลซ้ำ**: ปุ่มบันทึกในทุกฟอร์มจะถูกปิดทันทีระหว่างรอผลลัพธ์จาก API และเปิดกลับมาเฉพาะ
  ตอนที่เกิดข้อผิดพลาดเท่านั้น เพื่อไม่ให้กดรัว ๆ แล้วสร้างข้อมูลซ้ำซ้อน
- **บีบอัดรูปก่อนอัปโหลด**: ไฟล์รูปที่ใหญ่เกินขนาดที่กำหนดจะถูกย่อ/บีบอัดด้วย `<canvas>` ฝั่งเบราว์เซอร์ก่อนแปลง
  เป็น base64 ส่งไป Apps Script เสมอ (ถ้าบีบอัดไม่สำเร็จจะ fallback ไปส่งไฟล์ต้นฉบับแทนโดยไม่ทำให้ค้าง)
- **แจ้ง error เป็นภาษาไทยเสมอ**: ไม่ว่าจะเป็นเน็ตหลุด, อัปโหลดรูปไม่สำเร็จ, Drive/Sheets มีปัญหา,
  หรือ API timeout ระบบจะจับ error ทุกจุด (`safeCall_` ฝั่ง Backend, `.catch()` ทุกจุดฝั่ง Frontend)
  แล้วแสดง toast ข้อความภาษาไทยที่เข้าใจง่าย ไม่ทำให้หน้าเว็บค้างหรือขึ้น error ดิบของเบราว์เซอร์
- **กรณีอัปโหลดรูปสำเร็จแต่บันทึก Sheet ไม่สำเร็จ**: แต่ละ action เขียนไฟล์แล้วเขียน Sheet ในคำสั่งเดียวกัน
  (synchronous ภายใน request เดียว) หาก Sheet เขียนไม่สำเร็จ Apps Script จะโยน error กลับมาที่หน้าเว็บ
  ทันที ให้ผู้ใช้เห็นข้อความแจ้งเตือนและลองบันทึกใหม่อีกครั้ง — ไม่มีการอัปเดตหน้าเว็บให้เข้าใจผิดว่าสำเร็จ
  ทั้งที่ยังไม่ได้บันทึกลง Sheet จริง

---

## 7. ฟีเจอร์หลักของโมดูล Vehicle Management

- **Dashboard**: สรุปจำนวนรถ, สถานะ, รายการใกล้หมดอายุ (ประกัน/ภาษี/พ.ร.บ./เช็คระยะ), และ "รายการที่ต้องดำเนินการ" เรียงตามความเร่งด่วน
- **หน้ารถทั้งหมด**: การ์ดรถขนาดใหญ่ (ปรับอัตโนมัติเป็น 2 คอลัมน์ซ้าย-ขวาเมื่อมีรถน้อย) พร้อมสรุป
  🍀ประกัน 🌴พ.ร.บ. 🌵ภาษี ปีปัจจุบัน พร้อมลิงก์เปิดไฟล์และวันต่อครั้งถัดไป ใต้รูปรถทันที
- **รายละเอียดรถแบบ Tab**: ข้อมูลรถ | ประกัน | ภาษี/พ.ร.บ. | เช็คระยะ | ค่าใช้จ่าย | เอกสาร
- **ค่าใช้จ่าย**: เพิ่ม/แก้ไข/ลบรายการได้เองครบ (ชื่อรายการ, ราคา, วันที่เปลี่ยน, หมายเหตุ, ไฟล์แนบ) พร้อมยอดรวม
  ทั้งหมดของรถคันนั้น — ลบมีกล่องยืนยันก่อนเสมอเพื่อกันลบพลาด
- **ชื่อผู้ใช้งาน (หน้า ⚙️ ตั้งค่าระบบ)**: เนื่องจาก Web App ต้อง deploy แบบ "Anyone" เพื่อให้ GitHub Pages
  เรียกข้ามโดเมนได้ ระบบจึงไม่มีทางรู้อีเมล Google จริงของผู้เข้าใช้งานเลย (`Session.getActiveUser()` จะว่างเสมอ
  สำหรับผู้เข้าชมแบบไม่ login) — ให้แต่ละคนตั้ง "ชื่อที่ใช้แสดง" ไว้เองที่หน้าตั้งค่าระบบ (เก็บเฉพาะในเบราว์เซอร์
  เครื่องนั้น ไม่ใช่ระบบ login จริง) เพื่อให้ประวัติแก้ไข/อัปโหลดในชีต `SystemLog` และ `VehicleDocuments`
  ระบุตัวได้ว่าใครเป็นคนทำรายการ แทนที่จะขึ้น "ไม่ทราบผู้ใช้" เสมอ
- **ประวัติเช็คระยะแบบ Timeline**: เพิ่มรายการใหม่ทุกครั้งไม่ทับของเดิม รองรับรูปที่ 1 และรูปที่ 2
- **🏍️ ประกันรถมอไซ**: โมดูลย่อยเก็บเฉพาะทะเบียน/ผู้ใช้งาน + ประกันอุบัติเหตุ ไม่ต้องกรอกข้อมูลรถเต็มรูปแบบ
- **📦 แพ็คเกจจิ้ง**: ติดตามวัสดุ/อุปกรณ์แพ็คของส่งพัสดุ (กล่อง, เทป, ถุงแพ็ค, กันกระแทก ฯลฯ) แยกเป็นรายการ
  (ไซส์/สเปกที่สั่งซ้ำ ๆ ตั้งครั้งเดียวใช้ยาว พร้อมรูปตัวอย่าง) แต่ละรายการดูประวัติการสั่งซื้อย้อนหลังได้ทุกครั้ง
  (วันที่, จำนวน, ราคา, เลขบิล, ไฟล์บิลแนบ) เพิ่ม/แก้ไข/ลบประวัติได้เอง และเพิ่มรายการใหม่ได้ทันทีจากดรอปดาวน์
  ตอนบันทึกการสั่งซื้อโดยไม่ต้องสลับหน้าไปสร้างรายการก่อน
- **วันที่ทั้งระบบ**: รูปแบบ วัน-เดือน-ปี (ค.ศ.) เช่น 25-08-2026 ส่วนเวลา (เช่น เวลาบันทึก/อัปโหลด) ใช้เวลาไทย (Asia/Bangkok)
- **ตัวเลขค่าใช้จ่าย**: แสดงผลมีคอมมาคั่นหลักพันเสมอ เช่น 18,500 บาท
- **หัวข้อ/ป้ายข้อความทั้งหมดในหน้าเว็บเป็นภาษาไทย** เพื่อให้ผู้ใช้งานที่ไม่ถนัดภาษาอังกฤษเข้าใจง่าย
- **โหลดเร็ว**: หน้าเว็บเป็น static site ล้วน ๆ บน GitHub Pages ไม่ต้องรอ Apps Script render หน้าเว็บทุกครั้ง

---

## 8. การต่อยอดโมดูลหลังบ้านอื่นในอนาคต

ระบบออกแบบให้เป็น "Back Office Management System" ตัวเดียว ไม่ต้องสร้างเว็บใหม่ทุกครั้ง และให้ยึด
สถาปัตยกรรมเดิมเสมอ (GitHub Pages = หน้าเว็บ, Apps Script = API, Sheets = ข้อมูล, Drive = ไฟล์):

1. **ออกแบบก่อนเขียนโค้ด** ตามลำดับ: (1) โครงสร้าง Sheets ของโมดูลใหม่ (2) โครงสร้างโฟลเดอร์ Drive
   (3) รายชื่อ action ของ API (4) data flow (5) หน้าตา Frontend (6) ค่อยลงมือเขียนโค้ด
2. เพิ่มชื่อชีตใหม่ + schema ในไฟล์ `apps-script/Code.gs` หัวข้อ "การตั้งค่าและโครงสร้างข้อมูล"
   (ตัวแปร `SHEET_*` และ `SCHEMAS`) — ทุกแถวต้องมีรหัสอ้างอิงเฉพาะของตัวเอง (ใช้ `generateDatedId_()`
   รูปแบบเดิม) ห้ามใช้เลขแถวเป็น ID
3. เพิ่มฟังก์ชัน CRUD ของโมดูลใหม่ต่อท้ายใน `Code.gs` ตามรูปแบบโมดูลที่มีอยู่ (ก็อปจากส่วน
   "โมดูลรถบริษัท: ข้อมูลรถ" มาแก้) แล้วเพิ่ม `case` ใหม่ใน `doGet`/`doPost` ให้ตรงชื่อ action ที่ตั้งไว้ในข้อ 1
4. เพิ่มเมนูใน `index.html` (ส่วน `#sidebar`) และ route ใหม่ในตัวแปร `ROUTES` ที่อยู่ในหัวข้อ
   "Router หลัก + หน้าตั้งค่าระบบ" ภายใน `app.js` แล้วเพิ่มฟังก์ชัน render หน้าเว็บของโมดูลใหม่ต่อท้าย
   (เรียก API ด้วย `apiGet('actionName', params)` / `apiPost('actionName', payload)` เท่านั้น
   ห้ามเก็บข้อมูลธุรกิจไว้ใน `localStorage` แม้จะเป็นทางลัดชั่วคราวก็ตาม)
5. ถ้าต้องเก็บไฟล์ ใช้ `getOrCreateSubfolder_()` (อยู่ในหัวข้อ "จัดการ Google Drive") สร้างโฟลเดอร์ย่อยใหม่ใต้
   `BACK OFFICE/` — ฟังก์ชันนี้ค้นหาโฟลเดอร์เดิมก่อนเสมอ ไม่สร้างโฟลเดอร์ซ้ำ
6. **แก้ Frontend กับ Backend แยกกันได้อิสระ**: แก้ `index.html`/`style.css`/`app.js`/`config.js`
   แล้ว commit ขึ้น GitHub อย่างเดียวก็พอ (ไม่กระทบ Sheets/Drive) ส่วนแก้ `Code.gs` ต้อง deploy
   เวอร์ชันใหม่ผ่าน Apps Script (Deploy → Manage deployments → New version) แยกต่างหาก

โครงสร้างนี้ทำให้ Dashboard, ระบบแจ้งเตือน, ระบบสิทธิ์ (`Users`), และ log (`SystemLog`) ใช้ร่วมกันได้ทุกโมดูล

---

## 9. อัปโหลดขึ้น GitHub

โฟลเดอร์นี้ตั้งค่า git ไว้ให้แล้ว ขั้นตอนคร่าว ๆ:

```bash
cd back-office-vms
git init                                   # ถ้ายังไม่เคย init
git add .
git commit -m "Back Office Management System - แยก Frontend (GitHub Pages) / Backend (Apps Script API)"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

หรือถ้าถนัดอัปโหลดผ่านเว็บ: สร้าง repo ใหม่บน github.com → **Add file → Upload files** → ลากไฟล์และ
โฟลเดอร์ทั้งหมดในโปรเจกต์นี้ขึ้นไปทีเดียว (ทั้ง `index.html`, `style.css`, `config.js`, `app.js`,
โฟลเดอร์ `apps-script/`) → Commit changes จากนั้นตั้งค่า GitHub Pages ตามขั้นตอนที่ 4 ในหัวข้อ 2

หากต้องการซิงก์ `apps-script/Code.gs` กับ Apps Script โดยตรง (แก้โค้ดใน GitHub แล้ว push เข้า Apps Script)
แนะนำใช้ `clasp` (ดูขั้นตอนที่ 1 ในหัวข้อ 2) ซึ่งจะสร้างไฟล์ `.clasp.json` ผูก Script ID กับโฟลเดอร์
`apps-script/` ให้อัตโนมัติ (มีตัวอย่างไว้ให้ที่ `.clasp.json.example`)

---

## 10. ข้อจำกัดของต้นแบบนี้ (Prototype) และสิ่งที่ควรทำต่อ

- ยังไม่มีระบบ login/สิทธิ์แยกตามผู้ใช้แบบเต็มรูปแบบ (ชีต `Users` เตรียมไว้ให้แล้ว, `APP_TOKEN` เป็นเพียง
  ตัวกันเบื้องต้นสำหรับกันคนแปลกหน้ามาเดา URL ไม่ใช่ authentication จริง)
- การลบข้อมูล (hard delete) ยังเปิดให้ทำผ่านหน้าเว็บเฉพาะ**รายการค่าใช้จ่าย**เท่านั้น (มีกล่องยืนยันก่อนลบเสมอ
  และเมื่อลบแล้วกู้คืนไม่ได้) ส่วนข้อมูลหลักอื่น ๆ (รถ, ประกัน, ภาษี, พ.ร.บ., ประวัติเช็คระยะ) ยังไม่เปิดให้ลบผ่าน
  หน้าเว็บ เพื่อป้องกันข้อมูลหายโดยไม่ตั้งใจ — แก้ไขข้อมูลในชีตโดยตรงกรณีจำเป็น
- ควรเปิด **Time-driven trigger** (Apps Script → Triggers) ให้รัน `refreshAlertsSheet()` วันละครั้ง
  เพื่อใช้ต่อยอดส่งอีเมล/แจ้งเตือนอัตโนมัติในอนาคต
- ขนาด body ของ POST request ไปยัง Apps Script Web App มีขีดจำกัดตาม quota ของ Google (โดยทั่วไปไม่เกิน
  ~50MB ต่อ request) — การบีบอัดรูปฝั่ง client ก่อนส่ง (หัวข้อ 6) ช่วยลดโอกาสชนขีดจำกัดนี้ในการใช้งานทั่วไป
