/**
 * Code.gs
 * =========================================================================
 * Back Office Management System — โมดูล Vehicle Management (รวมทุกไฟล์ backend
 * เป็นไฟล์เดียวตามที่ขอ เพื่อให้จำนวนไฟล์ในโปรเจกต์ Apps Script น้อยที่สุด)
 *
 * ไฟล์นี้แบ่งเป็นส่วน ๆ ด้วยคอมเมนต์หัวข้อใหญ่ ใช้ Ctrl+F ค้นหาชื่อส่วนที่ต้องการ
 * แก้ไขได้ตามปกติ ทุกฟังก์ชันยังทำงานเหมือนเดิมทุกประการ ไม่มีการเปลี่ยนพฤติกรรมใด ๆ
 *
 * สารบัญ:
 *   1. การตั้งค่าและโครงสร้างข้อมูล (เดิมคือ Config.gs)
 *   2. ฟังก์ชันช่วยเหลือส่วนกลาง (เดิมคือ Utils.gs)
 *   3. จัดการ Google Drive (เดิมคือ DriveService.gs)
 *   4. สร้าง/ตรวจสอบชีตและโฟลเดอร์อัตโนมัติ (เดิมคือ SetupService.gs)
 *   5. โมดูลรถบริษัท: ข้อมูลรถ (เดิมคือ VehicleService.gs)
 *   6. โมดูลรถบริษัท: ประกันภัย (เดิมคือ InsuranceService.gs)
 *   7. โมดูลรถบริษัท: ภาษี (เดิมคือ TaxService.gs)
 *   8. โมดูลรถบริษัท: พ.ร.บ. (เดิมคือ CompulsoryService.gs)
 *   9. โมดูลรถบริษัท: ประวัติเช็คระยะ (เดิมคือ ServiceHistoryService.gs)
 *   10. โมดูลรถบริษัท: ค่าใช้จ่าย (เดิมคือ ExpenseService.gs)
 *   11. โมดูลรถมอเตอร์ไซค์ (เดิมคือ MotorcycleService.gs)
 *   12. โมดูลแพ็คเกจจิ้ง: วัสดุ/อุปกรณ์แพ็คของส่งพัสดุ (เดิมคือ PackagingService.gs)
 *   13. Dashboard (เดิมคือ DashboardService.gs)
 *   14. การแจ้งเตือนใกล้หมดอายุ (เดิมคือ AlertService.gs)
 *   15. จุดเริ่มต้นเว็บแอป (เดิมคือ Code.gs)
 * =========================================================================
 */



/* ========================================================================
 * 1) การตั้งค่าและโครงสร้างข้อมูล (เดิมคือ Config.gs)
 * ======================================================================== */

/**
 * Config.gs
 * -----------------------------------------------------------------------
 * Back Office Management System — ค่าคงที่และโครงสร้างข้อมูล (Schema)
 * โมดูลแรก: จัดการรถบริษัท (Vehicle Management)
 *
 * ไฟล์นี้เป็น "แหล่งความจริงเดียว" (single source of truth) ของโครงสร้างชีตทั้งหมด
 * โมดูลหลังบ้านอื่น ๆ ในอนาคตสามารถเพิ่ม SHEET_* ใหม่ + รายการใน SCHEMAS ได้เลย
 * โดยไม่กระทบโค้ดเดิม
 * -----------------------------------------------------------------------
 */

// ========================= การตั้งค่าทั่วไป =========================

// ชื่อ Property ที่เก็บ Spreadsheet ID และ Drive Root Folder ID
// ตั้งค่าได้จากเมนู "Project Settings > Script Properties" ใน Apps Script
// หรือรันฟังก์ชัน setupWizard() ครั้งแรก
var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
var PROP_DRIVE_ROOT_FOLDER_ID = 'DRIVE_ROOT_FOLDER_ID';

// APP_TOKEN (ไม่บังคับ): ตั้งค่าใน Script properties เพื่อกันคนแปลก ๆ เดา URL ของ Web App มายิง API เล่น
// ถ้าตั้งค่าไว้ ทุก request จาก frontend (GitHub Pages) ต้องแนบ token นี้มาด้วยเสมอ (ดู config.js ฝั่ง frontend)
// หมายเหตุ: นี่เป็นแค่ "ประตูกันคนทั่วไป" ไม่ใช่ระบบ authentication จริงจัง เพราะ Web App ต้อง deploy แบบ
// Anyone (เปิดสาธารณะ) เพื่อให้ GitHub Pages เรียกข้ามโดเมนได้ — ห้ามเก็บข้อมูลอ่อนไหวจริงจังไว้ในระบบนี้
var PROP_APP_TOKEN = 'APP_TOKEN';

var APP_TIMEZONE = 'Asia/Bangkok';      // เวลาในระบบทั้งหมดใช้เวลาไทย
var DATE_FORMAT = 'dd-MM-yyyy';         // วันที่แบบ วัน-เดือน-ปี (ค.ศ.)
var DATETIME_FORMAT = 'dd-MM-yyyy HH:mm'; // วันที่ + เวลา (ค.ศ. + เวลาไทย)

var APP_TITLE = 'Back Office Management System';
var DRIVE_ROOT_FOLDER_NAME = 'BACK OFFICE';

// เกณฑ์แจ้งเตือนใกล้หมดอายุ (ปรับได้ตามต้องการ)
var ALERT_DAYS_INSURANCE = 30;   // ประกันภัย
var ALERT_DAYS_TAX = 30;         // ภาษี
var ALERT_DAYS_COMPULSORY = 30;  // พ.ร.บ.
var ALERT_DAYS_SERVICE = 15;     // ใกล้ถึงวันนัดเช็กระยะ
var ALERT_KM_SERVICE = 1000;     // ใกล้ถึงเลขไมล์เช็กระยะ (กม. ที่เหลือ)
var ALERT_SEVERITY_CRITICAL_DAYS = 7;  // <=7 วัน = วิกฤต (แดง)
var ALERT_SEVERITY_WARNING_DAYS = 30;  // <=30 วัน = เฝ้าระวัง (ส้ม)

// ========================= รายชื่อชีตทั้งหมด =========================

var SHEET_VEHICLES = 'Vehicles';
var SHEET_INSURANCE = 'VehicleInsurance';
var SHEET_TAX = 'VehicleTax';
var SHEET_COMPULSORY = 'VehicleCompulsory';
var SHEET_SERVICE = 'VehicleService';          // ในหน้าเว็บแสดงเป็น "เช็คระยะ"
var SHEET_DOCUMENTS = 'VehicleDocuments';
var SHEET_EXPENSES = 'VehicleExpenses';
var SHEET_ALERTS = 'VehicleAlerts';
var SHEET_MOTORCYCLES = 'Motorcycles';
var SHEET_MOTO_INSURANCE = 'MotorcycleInsurance';
var SHEET_EMPLOYEES = 'Employees';
var SHEET_MASTERDATA = 'MasterData';
var SHEET_USERS = 'Users';
var SHEET_LOG = 'SystemLog';
var SHEET_PACKAGING_ITEMS = 'PackagingItems';   // โมดูลแพ็คเกจจิ้ง: รายการวัสดุ/อุปกรณ์ (กล่อง, เทป, ถุงแพ็ค ฯลฯ)
var SHEET_PACKAGING_ORDERS = 'PackagingOrders'; // โมดูลแพ็คเกจจิ้ง: ประวัติการสั่งซื้อแต่ละครั้งของแต่ละรายการ

// รายการค่าตัวเลือกมาตรฐาน (ใช้เป็นค่าเริ่มต้นใน MasterData ตอนสร้างชีตครั้งแรก)
var DEFAULT_VEHICLE_STATUS = ['ใช้งาน', 'ซ่อม', 'จำหน่าย'];
var DEFAULT_RECORD_STATUS = ['ยังไม่หมดอายุ', 'ใกล้หมดอายุ', 'หมดอายุ'];
var DEFAULT_DEPARTMENTS = ['ธุรการ', 'ขนส่ง', 'ขาย', 'คลังสินค้า', 'ผู้บริหาร'];
var DEFAULT_EXPENSE_CATEGORIES = ['น้ำมันเชื้อเพลิง', 'ค่าทางด่วน', 'ค่าล้างรถ', 'ค่าปรับ', 'อะไหล่/ซ่อมบำรุง', 'อื่นๆ'];
var DEFAULT_INSURANCE_TYPES = ['ประกันชั้น 1', 'ประกันชั้น 2', 'ประกันชั้น 2+', 'ประกันชั้น 3', 'ประกันชั้น 3+', 'ประกันอุบัติเหตุ'];
var DEFAULT_PACKAGING_CATEGORIES = ['กล่องพัสดุ', 'เทปกาว', 'ถุงแพ็ค/ถุงไปรษณีย์', 'กันกระแทก/บับเบิ้ล', 'อื่นๆ'];
var DEFAULT_PACKAGING_UNITS = ['ชิ้น', 'กล่อง', 'ม้วน', 'แผ่น', 'ห่อ', 'มัด', 'เมตร'];

/**
 * SCHEMAS: นิยามคอลัมน์ของทุกชีต
 * key      = ชื่อฟิลด์ที่ใช้ในโค้ด (JS/Apps Script)
 * header   = หัวคอลัมน์ภาษาไทยที่แสดงในชีต (แถวที่ 1)
 * type     = ชนิดข้อมูล: string | number | date | datetime | currency | url | enum
 * label    = ป้ายข้อความภาษาไทยสำหรับแสดงผลบนหน้าเว็บ (ฟอร์ม/ตาราง)
 */
var SCHEMAS = {};

SCHEMAS[SHEET_VEHICLES] = [
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'plateNumber', header: 'ทะเบียน', type: 'string', label: 'ทะเบียน' },
  { key: 'brand', header: 'ยี่ห้อ', type: 'string', label: 'ยี่ห้อ' },
  { key: 'model', header: 'รุ่น', type: 'string', label: 'รุ่น' },
  { key: 'year', header: 'ปีรถ', type: 'number', label: 'ปีรถ' },
  { key: 'color', header: 'สี', type: 'string', label: 'สี' },
  { key: 'chassisNo', header: 'เลขตัวถัง', type: 'string', label: 'เลขตัวถัง' },
  { key: 'engineNo', header: 'เลขเครื่อง', type: 'string', label: 'เลขเครื่อง' },
  { key: 'responsiblePerson', header: 'ผู้รับผิดชอบรถ', type: 'string', label: 'ผู้รับผิดชอบรถ' },
  { key: 'department', header: 'แผนก', type: 'string', label: 'แผนก' },
  { key: 'status', header: 'สถานะรถ', type: 'enum', label: 'สถานะรถ' },
  { key: 'mainPhotoUrl', header: 'รูปรถหลัก', type: 'url', label: 'รูปรถ' },
  { key: 'driveFolderId', header: 'รหัสโฟลเดอร์ไดรฟ์', type: 'string', label: 'โฟลเดอร์ไดรฟ์' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่สร้างข้อมูล', type: 'datetime', label: 'วันที่สร้างข้อมูล' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

SCHEMAS[SHEET_INSURANCE] = [
  { key: 'insuranceId', header: 'รหัสประกัน', type: 'string', label: 'รหัสประกัน' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'company', header: 'บริษัทประกัน', type: 'string', label: 'บริษัทประกัน' },
  { key: 'policyNo', header: 'เลขกรมธรรม์', type: 'string', label: 'เลขกรมธรรม์' },
  { key: 'insuranceType', header: 'ประเภทประกัน', type: 'enum', label: 'ประเภทประกัน' },
  { key: 'startDate', header: 'วันที่เริ่มประกัน', type: 'date', label: 'วันที่เริ่มประกัน' },
  { key: 'expiryDate', header: 'วันหมดประกัน', type: 'date', label: 'วันหมดประกัน' },
  { key: 'nextRenewalDate', header: 'วันที่ต่อครั้งถัดไป', type: 'date', label: 'วันที่ต่อครั้งถัดไป' },
  { key: 'sumInsured', header: 'ทุนประกัน', type: 'currency', label: 'ทุนประกัน (บาท)' },
  { key: 'premium', header: 'เบี้ยประกัน', type: 'currency', label: 'เบี้ยประกัน (บาท)' },
  { key: 'policyFileUrl', header: 'ไฟล์กรมธรรม์', type: 'url', label: 'ไฟล์กรมธรรม์' },
  { key: 'receiptFileUrl', header: 'ไฟล์ใบเสร็จ', type: 'url', label: 'ไฟล์ใบเสร็จ' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

SCHEMAS[SHEET_TAX] = [
  { key: 'taxId', header: 'รหัสภาษี', type: 'string', label: 'รหัสภาษี' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'lastRenewalDate', header: 'วันที่ต่อภาษีล่าสุด', type: 'date', label: 'วันที่ต่อภาษีล่าสุด' },
  { key: 'expiryDate', header: 'วันหมดอายุภาษี', type: 'date', label: 'วันหมดอายุภาษี' },
  { key: 'nextRenewalDate', header: 'วันที่ต่อครั้งถัดไป', type: 'date', label: 'วันที่ต่อครั้งถัดไป' },
  { key: 'docNo', header: 'เลขที่เอกสาร', type: 'string', label: 'เลขที่เอกสาร' },
  { key: 'cost', header: 'ค่าใช้จ่าย', type: 'currency', label: 'ค่าใช้จ่าย (บาท)' },
  { key: 'fileUrl', header: 'ไฟล์เอกสาร', type: 'url', label: 'ไฟล์เอกสาร' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

SCHEMAS[SHEET_COMPULSORY] = [
  { key: 'compulsoryId', header: 'รหัส พ.ร.บ.', type: 'string', label: 'รหัส พ.ร.บ.' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'lastRenewalDate', header: 'วันที่ต่อล่าสุด', type: 'date', label: 'วันที่ต่อล่าสุด' },
  { key: 'expiryDate', header: 'วันหมดอายุ', type: 'date', label: 'วันหมดอายุ' },
  { key: 'nextRenewalDate', header: 'วันที่ต่อครั้งถัดไป', type: 'date', label: 'วันที่ต่อครั้งถัดไป' },
  { key: 'docNo', header: 'เลขที่เอกสาร', type: 'string', label: 'เลขที่เอกสาร' },
  { key: 'cost', header: 'ค่าใช้จ่าย', type: 'currency', label: 'ค่าใช้จ่าย (บาท)' },
  { key: 'fileUrl', header: 'ไฟล์เอกสาร', type: 'url', label: 'ไฟล์เอกสาร' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

// VehicleService = ประวัติ "เช็คระยะ" (แสดงผลในหน้าเว็บว่า เช็คระยะ ไม่ใช่ เข้าศูนย์)
SCHEMAS[SHEET_SERVICE] = [
  { key: 'serviceId', header: 'รหัสรายการ', type: 'string', label: 'รหัสรายการ' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'serviceDate', header: 'วันที่เช็คระยะ', type: 'date', label: 'วันที่เช็คระยะ' },
  { key: 'mileage', header: 'เลขไมล์', type: 'number', label: 'เลขไมล์ (กม.)' },
  { key: 'serviceCenter', header: 'ศูนย์บริการ', type: 'string', label: 'ศูนย์บริการ' },
  { key: 'serviceType', header: 'ประเภทงาน', type: 'string', label: 'ประเภทงาน' },
  { key: 'itemsDone', header: 'รายการที่ทำ', type: 'string', label: 'รายการที่ทำ' },
  { key: 'cost', header: 'ค่าใช้จ่าย', type: 'currency', label: 'ค่าใช้จ่าย (บาท)' },
  { key: 'nextAppointmentDate', header: 'นัดครั้งถัดไป', type: 'date', label: 'นัดครั้งถัดไป' },
  { key: 'nextMileage', header: 'เลขไมล์เช็คระยะครั้งถัดไป', type: 'number', label: 'เลขไมล์เช็คระยะครั้งถัดไป' },
  { key: 'receiptFileUrl', header: 'ไฟล์ใบเสร็จ', type: 'url', label: 'ไฟล์ใบเสร็จ' },
  { key: 'photo1Url', header: 'รูปที่1', type: 'url', label: 'รูปที่ 1' },
  { key: 'photo2Url', header: 'รูปที่2', type: 'url', label: 'รูปที่ 2' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

SCHEMAS[SHEET_DOCUMENTS] = [
  { key: 'documentId', header: 'รหัสเอกสาร', type: 'string', label: 'รหัสเอกสาร' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'category', header: 'หมวดหมู่', type: 'enum', label: 'หมวดหมู่' },
  { key: 'refId', header: 'รหัสอ้างอิง', type: 'string', label: 'รหัสอ้างอิง' },
  { key: 'fileName', header: 'ชื่อไฟล์', type: 'string', label: 'ชื่อไฟล์' },
  { key: 'fileUrl', header: 'ลิงก์ไฟล์', type: 'url', label: 'ลิงก์ไฟล์' },
  { key: 'fileId', header: 'รหัสไฟล์ไดรฟ์', type: 'string', label: 'รหัสไฟล์ไดรฟ์' },
  { key: 'uploadedAt', header: 'วันที่อัปโหลด', type: 'datetime', label: 'วันที่อัปโหลด' },
  { key: 'uploadedBy', header: 'ผู้อัปโหลด', type: 'string', label: 'ผู้อัปโหลด' }
];

SCHEMAS[SHEET_EXPENSES] = [
  { key: 'expenseId', header: 'รหัสค่าใช้จ่าย', type: 'string', label: 'รหัสค่าใช้จ่าย' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'expenseDate', header: 'วันที่', type: 'date', label: 'วันที่' },
  { key: 'category', header: 'ประเภทค่าใช้จ่าย', type: 'enum', label: 'ประเภทค่าใช้จ่าย' },
  { key: 'description', header: 'รายละเอียด', type: 'string', label: 'รายละเอียด' },
  { key: 'cost', header: 'ค่าใช้จ่าย', type: 'currency', label: 'ค่าใช้จ่าย (บาท)' },
  { key: 'refType', header: 'เชื่อมโยงกับ', type: 'string', label: 'เชื่อมโยงกับ' },
  { key: 'refId', header: 'รหัสอ้างอิง', type: 'string', label: 'รหัสอ้างอิง' },
  { key: 'fileUrl', header: 'ไฟล์แนบ', type: 'url', label: 'ไฟล์แนบ' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' }
];

SCHEMAS[SHEET_ALERTS] = [
  { key: 'alertId', header: 'รหัสแจ้งเตือน', type: 'string', label: 'รหัสแจ้งเตือน' },
  { key: 'vehicleId', header: 'รหัสรถ', type: 'string', label: 'รหัสรถ' },
  { key: 'vehicleLabel', header: 'ชื่อรถ', type: 'string', label: 'ชื่อรถ' },
  { key: 'alertType', header: 'ประเภท', type: 'string', label: 'ประเภท' },
  { key: 'dueDate', header: 'วันครบกำหนด', type: 'date', label: 'วันครบกำหนด' },
  { key: 'daysLeft', header: 'เหลืออีก (วัน)', type: 'number', label: 'เหลืออีก (วัน)' },
  { key: 'message', header: 'ข้อความแจ้งเตือน', type: 'string', label: 'ข้อความแจ้งเตือน' },
  { key: 'severity', header: 'ระดับความสำคัญ', type: 'string', label: 'ระดับความสำคัญ' },
  { key: 'generatedAt', header: 'สร้างเมื่อ', type: 'datetime', label: 'สร้างเมื่อ' }
];

// รถมอเตอร์ไซค์ — เก็บเฉพาะข้อมูลจำเป็น + ประกันอุบัติเหตุเท่านั้น
SCHEMAS[SHEET_MOTORCYCLES] = [
  { key: 'motorcycleId', header: 'รหัสรถมอไซ', type: 'string', label: 'รหัสรถมอไซ' },
  { key: 'label', header: 'ทะเบียน/ชื่อเรียก', type: 'string', label: 'ทะเบียน/ชื่อเรียก' },
  { key: 'responsiblePerson', header: 'ผู้ใช้งาน/ผู้รับผิดชอบ', type: 'string', label: 'ผู้ใช้งาน/ผู้รับผิดชอบ' },
  { key: 'driveFolderId', header: 'รหัสโฟลเดอร์ไดรฟ์', type: 'string', label: 'โฟลเดอร์ไดรฟ์' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่สร้างข้อมูล', type: 'datetime', label: 'วันที่สร้างข้อมูล' }
];

SCHEMAS[SHEET_MOTO_INSURANCE] = [
  { key: 'motoInsuranceId', header: 'รหัสประกัน', type: 'string', label: 'รหัสประกัน' },
  { key: 'motorcycleId', header: 'รหัสรถมอไซ', type: 'string', label: 'รหัสรถมอไซ' },
  { key: 'company', header: 'บริษัทประกัน', type: 'string', label: 'บริษัทประกัน' },
  { key: 'policyNo', header: 'เลขกรมธรรม์', type: 'string', label: 'เลขกรมธรรม์' },
  { key: 'coverageType', header: 'ประเภทความคุ้มครอง', type: 'string', label: 'ประเภทความคุ้มครอง' },
  { key: 'startDate', header: 'วันที่เริ่มประกัน', type: 'date', label: 'วันที่เริ่มประกัน' },
  { key: 'expiryDate', header: 'วันหมดประกัน', type: 'date', label: 'วันหมดประกัน' },
  { key: 'nextRenewalDate', header: 'วันที่ต่อครั้งถัดไป', type: 'date', label: 'วันที่ต่อครั้งถัดไป' },
  { key: 'premium', header: 'เบี้ยประกัน', type: 'currency', label: 'เบี้ยประกัน (บาท)' },
  { key: 'policyFileUrl', header: 'ไฟล์กรมธรรม์', type: 'url', label: 'ไฟล์กรมธรรม์' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

SCHEMAS[SHEET_EMPLOYEES] = [
  { key: 'employeeId', header: 'รหัสพนักงาน', type: 'string', label: 'รหัสพนักงาน' },
  { key: 'fullName', header: 'ชื่อ-สกุล', type: 'string', label: 'ชื่อ-สกุล' },
  { key: 'position', header: 'ตำแหน่ง', type: 'string', label: 'ตำแหน่ง' },
  { key: 'department', header: 'แผนก', type: 'string', label: 'แผนก' },
  { key: 'phone', header: 'เบอร์โทร', type: 'string', label: 'เบอร์โทร' },
  { key: 'email', header: 'อีเมล', type: 'string', label: 'อีเมล' },
  { key: 'status', header: 'สถานะ', type: 'string', label: 'สถานะ' }
];

SCHEMAS[SHEET_MASTERDATA] = [
  { key: 'category', header: 'หมวดหมู่', type: 'string', label: 'หมวดหมู่' },
  { key: 'value', header: 'ค่าตัวเลือก', type: 'string', label: 'ค่าตัวเลือก' },
  { key: 'isActive', header: 'ใช้งานอยู่', type: 'string', label: 'ใช้งานอยู่' },
  { key: 'sortOrder', header: 'ลำดับ', type: 'number', label: 'ลำดับ' }
];

SCHEMAS[SHEET_USERS] = [
  { key: 'userId', header: 'อีเมลผู้ใช้', type: 'string', label: 'อีเมลผู้ใช้' },
  { key: 'fullName', header: 'ชื่อ-สกุล', type: 'string', label: 'ชื่อ-สกุล' },
  { key: 'role', header: 'สิทธิ์การใช้งาน', type: 'string', label: 'สิทธิ์การใช้งาน' },
  { key: 'status', header: 'สถานะ', type: 'string', label: 'สถานะ' },
  { key: 'createdAt', header: 'วันที่เพิ่ม', type: 'datetime', label: 'วันที่เพิ่ม' }
];

SCHEMAS[SHEET_LOG] = [
  { key: 'logId', header: 'รหัส', type: 'string', label: 'รหัส' },
  { key: 'timestamp', header: 'เวลา', type: 'datetime', label: 'เวลา' },
  { key: 'user', header: 'ผู้ใช้งาน', type: 'string', label: 'ผู้ใช้งาน' },
  { key: 'action', header: 'การกระทำ', type: 'string', label: 'การกระทำ' },
  { key: 'module', header: 'โมดูล', type: 'string', label: 'โมดูล' },
  { key: 'targetId', header: 'รหัสเป้าหมาย', type: 'string', label: 'รหัสเป้าหมาย' },
  { key: 'detail', header: 'รายละเอียด', type: 'string', label: 'รายละเอียด' }
];

// PackagingItems = รายการวัสดุ/อุปกรณ์แพ็คของแต่ละชนิด (ตารางแม่ — ไซส์/สเปกเดิมที่สั่งซ้ำ ๆ)
SCHEMAS[SHEET_PACKAGING_ITEMS] = [
  { key: 'itemId', header: 'รหัสรายการ', type: 'string', label: 'รหัสรายการ' },
  { key: 'itemName', header: 'ชื่อรายการ', type: 'string', label: 'ชื่อรายการ' },
  { key: 'category', header: 'ประเภท', type: 'enum', label: 'ประเภท' },
  { key: 'unit', header: 'หน่วยนับ', type: 'enum', label: 'หน่วยนับ' },
  { key: 'referenceImageUrl', header: 'รูปตัวอย่าง', type: 'url', label: 'รูปตัวอย่าง' },
  { key: 'status', header: 'สถานะ', type: 'string', label: 'สถานะ' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่เพิ่ม', type: 'datetime', label: 'วันที่เพิ่ม' },
  { key: 'updatedAt', header: 'แก้ไขล่าสุด', type: 'datetime', label: 'แก้ไขล่าสุด' }
];

// PackagingOrders = ประวัติการสั่งซื้อแต่ละครั้งของแต่ละรายการ (ดูย้อนหลังได้ว่าสั่งล่าสุดเมื่อไหร่ ราคาเท่าไหร่ บิลไหน)
SCHEMAS[SHEET_PACKAGING_ORDERS] = [
  { key: 'orderId', header: 'รหัสการสั่งซื้อ', type: 'string', label: 'รหัสการสั่งซื้อ' },
  { key: 'itemId', header: 'รหัสรายการ', type: 'string', label: 'รหัสรายการ' },
  { key: 'orderDate', header: 'วันที่สั่งซื้อ', type: 'date', label: 'วันที่สั่งซื้อ' },
  { key: 'quantity', header: 'จำนวน', type: 'number', label: 'จำนวน' },
  { key: 'unitPrice', header: 'ราคาต่อหน่วย', type: 'currency', label: 'ราคาต่อหน่วย (บาท)' },
  { key: 'totalCost', header: 'ราคารวม', type: 'currency', label: 'ราคารวมทั้งหมด (บาท)' },
  { key: 'billNumber', header: 'เลขที่บิล', type: 'string', label: 'เลขที่บิล/ใบเสร็จ' },
  { key: 'billFileUrl', header: 'ไฟล์บิล', type: 'url', label: 'ไฟล์บิล' },
  { key: 'supplier', header: 'ร้าน/ผู้ขาย', type: 'string', label: 'ร้าน/ผู้ขาย' },
  { key: 'notes', header: 'หมายเหตุ', type: 'string', label: 'หมายเหตุ' },
  { key: 'createdAt', header: 'วันที่บันทึก', type: 'datetime', label: 'วันที่บันทึก' }
];

// รายชื่อชีตทั้งหมด (ใช้วนสร้าง/ตรวจสอบใน SetupService.gs)
var ALL_SHEET_NAMES = [
  SHEET_VEHICLES, SHEET_INSURANCE, SHEET_TAX, SHEET_COMPULSORY, SHEET_SERVICE,
  SHEET_DOCUMENTS, SHEET_EXPENSES, SHEET_ALERTS, SHEET_MOTORCYCLES, SHEET_MOTO_INSURANCE,
  SHEET_EMPLOYEES, SHEET_MASTERDATA, SHEET_USERS, SHEET_LOG,
  SHEET_PACKAGING_ITEMS, SHEET_PACKAGING_ORDERS
];


/* ========================================================================
 * 2) ฟังก์ชันช่วยเหลือส่วนกลาง (เดิมคือ Utils.gs)
 * ======================================================================== */

/**
 * Utils.gs
 * -----------------------------------------------------------------------
 * ฟังก์ชันช่วยเหลือส่วนกลาง: การอ่าน/เขียนชีตแบบ generic (ใช้ SCHEMAS จาก Config.gs),
 * การจัดรูปแบบวันที่/เวลา/ตัวเลข, การสร้างรหัส, และรูปแบบ response มาตรฐาน
 * -----------------------------------------------------------------------
 */

// ========================= Spreadsheet / Sheet helpers =========================

function getSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) {
    throw new Error('ยังไม่ได้ตั้งค่า SPREADSHEET_ID กรุณาตั้งค่าใน Project Settings > Script properties ' +
      'หรือรันฟังก์ชัน setupWizard() จาก Apps Script editor ก่อนใช้งาน (ดูคู่มือ README.md)');
  }
  return id;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getSheet_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // เผื่อกรณีเรียกใช้ก่อนรัน setup — สร้างให้อัตโนมัติ
    sheet = ensureSingleSheet_(ss, sheetName);
  }
  return sheet;
}

function getSchema_(sheetName) {
  var schema = SCHEMAS[sheetName];
  if (!schema) throw new Error('ไม่พบ schema ของชีต: ' + sheetName);
  return schema;
}

function getHeaders_(sheetName) {
  return getSchema_(sheetName).map(function (c) { return c.header; });
}

function getKeys_(sheetName) {
  return getSchema_(sheetName).map(function (c) { return c.key; });
}

// ========================= อ่าน/เขียนข้อมูลแบบ Object =========================

/**
 * อ่านทุกแถวของชีตเป็น array ของ object {key: value}
 */
function getAllRecords_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var schema = getSchema_(sheetName);
  if (lastRow < 2) return [];
  var lastCol = schema.length;
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var records = [];
  for (var i = 0; i < values.length; i++) {
    var obj = rowArrayToObject_(sheetName, values[i]);
    obj._row = i + 2; // เก็บเลขแถวจริงไว้ใช้อัปเดต/ลบ (ไม่แสดงผลที่หน้าเว็บ)
    // ข้ามแถวว่างสนิท (ไม่มีคีย์หลักใด ๆ)
    if (isRowEmpty_(obj, schema)) continue;
    records.push(obj);
  }
  return records;
}

function isRowEmpty_(obj, schema) {
  for (var i = 0; i < schema.length; i++) {
    var v = obj[schema[i].key];
    if (v !== '' && v !== null && typeof v !== 'undefined') return false;
  }
  return true;
}

function rowArrayToObject_(sheetName, rowArray) {
  var schema = getSchema_(sheetName);
  var obj = {};
  for (var i = 0; i < schema.length; i++) {
    var col = schema[i];
    var raw = rowArray[i];
    obj[col.key] = normalizeCellForRead_(raw, col.type);
  }
  return obj;
}

function normalizeCellForRead_(raw, type) {
  if (raw === '' || raw === null || typeof raw === 'undefined') return '';
  if ((type === 'date' || type === 'datetime') && Object.prototype.toString.call(raw) === '[object Date]') {
    return raw.toISOString();
  }
  return raw;
}

function objectToRowArray_(sheetName, obj) {
  var schema = getSchema_(sheetName);
  return schema.map(function (col) {
    var v = obj[col.key];
    if (typeof v === 'undefined' || v === null) return '';
    if ((col.type === 'date' || col.type === 'datetime') && typeof v === 'string' && v) {
      var d = parseDateInput_(v);
      return d || v;
    }
    // ค่าตัวเลข/ค่าใช้จ่าย: แปลงจาก string (ที่ส่งมาจากฟอร์มเว็บ) เป็น Number จริง
    // เพื่อให้ Google Sheets เก็บเป็นตัวเลข (จัดเรียง/รวมยอดได้) ไม่ใช่ข้อความ
    if ((col.type === 'number' || col.type === 'currency') && v !== '') {
      var n = Number(v);
      return isNaN(n) ? v : n;
    }
    return v;
  });
}

/**
 * เพิ่มระเบียนใหม่ในชีต — ใส่ id อัตโนมัติถ้ายังไม่มี, ใส่ createdAt/updatedAt อัตโนมัติ
 * idPrefix ใช้สร้างรหัสอัตโนมัติ เช่น 'VH' -> VH-0001
 */
function appendRecord_(sheetName, obj, idKey, idPrefix) {
  var sheet = getSheet_(sheetName);
  var now = new Date();
  if (idKey && !obj[idKey]) {
    obj[idKey] = generateDatedId_(sheetName, idKey, idPrefix);
  }
  var schema = getSchema_(sheetName);
  var hasCreatedAt = schema.some(function (c) { return c.key === 'createdAt'; });
  var hasUpdatedAt = schema.some(function (c) { return c.key === 'updatedAt'; });
  if (hasCreatedAt && !obj.createdAt) obj.createdAt = now;
  if (hasUpdatedAt) obj.updatedAt = now;
  var row = objectToRowArray_(sheetName, obj);
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  return obj;
}

/**
 * อัปเดตระเบียนที่ id ตรงกับ idValue ในคอลัมน์ idKey — merge เฉพาะฟิลด์ที่ส่งมาใน patch
 */
function updateRecordById_(sheetName, idKey, idValue, patch) {
  var sheet = getSheet_(sheetName);
  var schema = getSchema_(sheetName);
  var idColIndex = getKeys_(sheetName).indexOf(idKey);
  if (idColIndex === -1) throw new Error('ไม่พบคอลัมน์ ' + idKey + ' ในชีต ' + sheetName);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('ไม่พบระเบียนที่ต้องการแก้ไข');
  var idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(idValue)) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) throw new Error('ไม่พบระเบียนรหัส ' + idValue + ' ในชีต ' + sheetName);

  var currentRowValues = sheet.getRange(targetRow, 1, 1, schema.length).getValues()[0];
  var currentObj = rowArrayToObject_(sheetName, currentRowValues);
  for (var k in patch) {
    if (patch.hasOwnProperty(k) && k !== '_row') currentObj[k] = patch[k];
  }
  var hasUpdatedAt = schema.some(function (c) { return c.key === 'updatedAt'; });
  if (hasUpdatedAt) currentObj.updatedAt = new Date();

  var newRow = objectToRowArray_(sheetName, currentObj);
  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  SpreadsheetApp.flush();
  return currentObj;
}

/**
 * ลบระเบียนที่ id ตรงกับ idValue ออกจากชีต (ลบแถวจริง) — ใช้เฉพาะจุดที่ตั้งใจเปิดให้ลบได้เท่านั้น
 * (เช่น รายการค่าใช้จ่ายที่กรอกผิด) ไม่ใช่ helper ที่เรียกลบข้อมูลหลักของระบบ
 */
function deleteRecordById_(sheetName, idKey, idValue) {
  var sheet = getSheet_(sheetName);
  var idColIndex = getKeys_(sheetName).indexOf(idKey);
  if (idColIndex === -1) throw new Error('ไม่พบคอลัมน์ ' + idKey + ' ในชีต ' + sheetName);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('ไม่พบระเบียนที่ต้องการลบ');
  var idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(idValue)) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) throw new Error('ไม่พบระเบียนรหัส ' + idValue + ' ในชีต ' + sheetName);

  sheet.deleteRow(targetRow);
  SpreadsheetApp.flush();
  return true;
}

function findRecordsByField_(sheetName, fieldKey, value) {
  var all = getAllRecords_(sheetName);
  return all.filter(function (r) { return String(r[fieldKey]) === String(value); });
}

function findOneById_(sheetName, idKey, idValue) {
  var all = findRecordsByField_(sheetName, idKey, idValue);
  return all.length ? all[0] : null;
}

/**
 * สร้างรหัสอัตโนมัติแบบมีวันที่ เช่น VH-20260826-0001, VH-20260826-0002 ...
 * (ไม่ใช้เลขแถวเป็น primary key ตามมาตรฐานที่กำหนด — เลขลำดับนับใหม่ทุกวันต่อ prefix เดียวกัน
 * รวมกับวันที่แล้วยังคงไม่ซ้ำกันเสมอ)
 */
function generateDatedId_(sheetName, idKey, prefix) {
  var todayStr = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyyMMdd');
  var all = getAllRecords_(sheetName);
  var maxNum = 0;
  var re = new RegExp('^' + prefix + '-' + todayStr + '-(\\d+)$');
  all.forEach(function (r) {
    var m = String(r[idKey] || '').match(re);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  var next = maxNum + 1;
  var padded = ('0000' + next).slice(-4);
  return prefix + '-' + todayStr + '-' + padded;
}

// ========================= วันที่ / เวลา / ตัวเลข =========================

/**
 * แปลงค่าที่รับจาก <input type="date"> (yyyy-MM-dd) หรือ ISO string ให้เป็น Date object
 */
function parseDateInput_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  var s = String(value).trim();
  if (!s) return null;
  // yyyy-MM-dd หรือ yyyy-MM-ddTHH:mm...
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

/** จัดรูปแบบวันที่เป็น วัน-เดือน-ปี (ค.ศ.) เช่น 25-08-2026 */
function formatThaiDate_(value) {
  var d = parseDateInput_(value);
  if (!d) return '';
  return Utilities.formatDate(d, APP_TIMEZONE, DATE_FORMAT);
}

/** จัดรูปแบบวันที่ + เวลาไทย เช่น 25-08-2026 14:35 */
function formatThaiDateTime_(value) {
  var d = parseDateInput_(value);
  if (!d) return '';
  return Utilities.formatDate(d, APP_TIMEZONE, DATETIME_FORMAT);
}

/** จัดรูปแบบตัวเลขค่าใช้จ่ายแบบมีคอมมาคั่นหลักพัน เช่น 18,500 */
function formatCurrency_(value) {
  var n = Number(value);
  if (isNaN(n)) return '';
  var parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts[1] === '00') return parts[0];
  return parts[0] + '.' + parts[1];
}

/** จำนวนวันที่เหลือจากวันนี้ (เวลาไทย) ถึงวันที่กำหนด — ค่าติดลบ = เลยกำหนดแล้ว */
function daysUntil_(value) {
  var d = parseDateInput_(value);
  if (!d) return null;
  var todayStr = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
  var dueStr = Utilities.formatDate(d, APP_TIMEZONE, 'yyyy-MM-dd');
  var today = new Date(todayStr + 'T00:00:00');
  var due = new Date(dueStr + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function currentYearBE_() {
  return Number(Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyy'));
}

// ========================= Response helpers =========================

function ok_(data) {
  return { success: true, data: data };
}

function fail_(message) {
  return { success: false, error: String(message) };
}

/** เรียกใช้ครอบทุกฟังก์ชันที่ frontend เรียกผ่าน API (fetch → doGet/doPost) เพื่อดักข้อผิดพลาดให้ขึ้นข้อความไทยเสมอ */
function safeCall_(fn) {
  try {
    return ok_(fn());
  } catch (err) {
    logError_(err);
    return fail_(err && err.message ? err.message : String(err));
  }
}

function logError_(err) {
  try {
    Logger.log((err && err.stack) ? err.stack : err);
  } catch (e) { /* ignore */ }
}

/**
 * ตัวแปรระดับสคริปต์ เก็บ "ชื่อผู้ใช้งาน" ที่ frontend ส่งแนบมากับ request ปัจจุบัน (ดู doGet/doPost)
 * ใช้เป็น fallback ตอนที่ Session.getActiveUser() คืนค่าว่าง (กรณีปกติของ Web App แบบ "Anyone"
 * ที่ผู้เข้าชมไม่ได้ login ด้วย Google — ระบบจะไม่มีทางรู้อีเมลจริงได้เลยในโหมดนี้)
 */
var CURRENT_ACTOR_NAME_ = '';

function getActiveUserEmail_() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) return email;
  } catch (e) { /* ignore */ }
  return CURRENT_ACTOR_NAME_ || 'ไม่ทราบผู้ใช้';
}

/** บันทึกประวัติการแก้ไขข้อมูลลง SystemLog */
function logAction_(action, module, targetId, detail) {
  try {
    appendRecord_(SHEET_LOG, {
      timestamp: new Date(),
      user: getActiveUserEmail_(),
      action: action,
      module: module,
      targetId: targetId || '',
      detail: detail || ''
    }, 'logId', 'LOG');
  } catch (e) {
    logError_(e);
  }
}


/* ========================================================================
 * 3) จัดการ Google Drive (เดิมคือ DriveService.gs)
 * ======================================================================== */

/**
 * DriveService.gs
 * -----------------------------------------------------------------------
 * จัดการโครงสร้างโฟลเดอร์ Google Drive และการอัปโหลดไฟล์
 *
 * โครงสร้างที่สร้างอัตโนมัติ:
 *   BACK OFFICE/
 *     VEHICLE/
 *       {vehicleId}_{ทะเบียน}/
 *         Photos/  Insurance/  Tax/  Compulsory/  Service/
 *     MOTORCYCLE/
 *       {motorcycleId}_{ทะเบียน}/
 *         Insurance/
 * -----------------------------------------------------------------------
 */

function getDriveRootFolder_() {
  var rootId = PropertiesService.getScriptProperties().getProperty(PROP_DRIVE_ROOT_FOLDER_ID);
  if (!rootId) {
    return ensureDriveRootFolder_();
  }
  try {
    return DriveApp.getFolderById(rootId);
  } catch (e) {
    return ensureDriveRootFolder_();
  }
}

function getOrCreateSubfolder_(parentFolder, name) {
  var it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function sanitizeFolderName_(name) {
  return String(name || '').replace(/[\\\/:*?"<>|]/g, '-').trim() || 'ไม่มีชื่อ';
}

/** สร้าง/คืนโฟลเดอร์ของรถคันหนึ่ง พร้อมโฟลเดอร์ย่อยครบทุกหมวด คืนค่า {folderId, subfolders:{...}} */
function ensureVehicleFolder_(vehicleId, plateNumber) {
  var root = getDriveRootFolder_();
  var vehicleRoot = getOrCreateSubfolder_(root, 'VEHICLE');
  var folderName = sanitizeFolderName_(vehicleId) + '_' + sanitizeFolderName_(plateNumber);
  var vFolder = getOrCreateSubfolder_(vehicleRoot, folderName);
  var subfolders = {
    Photos: getOrCreateSubfolder_(vFolder, 'Photos').getId(),
    Insurance: getOrCreateSubfolder_(vFolder, 'Insurance').getId(),
    Tax: getOrCreateSubfolder_(vFolder, 'Tax').getId(),
    Compulsory: getOrCreateSubfolder_(vFolder, 'Compulsory').getId(),
    Service: getOrCreateSubfolder_(vFolder, 'Service').getId()
  };
  return { folderId: vFolder.getId(), subfolders: subfolders };
}

/** สร้าง/คืนโฟลเดอร์ของรถมอเตอร์ไซค์คันหนึ่ง */
function ensureMotorcycleFolder_(motorcycleId, label) {
  var root = getDriveRootFolder_();
  var motoRoot = getOrCreateSubfolder_(root, 'MOTORCYCLE');
  var folderName = sanitizeFolderName_(motorcycleId) + '_' + sanitizeFolderName_(label);
  var mFolder = getOrCreateSubfolder_(motoRoot, folderName);
  var subfolders = {
    Insurance: getOrCreateSubfolder_(mFolder, 'Insurance').getId()
  };
  return { folderId: mFolder.getId(), subfolders: subfolders };
}

/**
 * อัปโหลดไฟล์ (base64) เข้าโฟลเดอร์ที่กำหนด
 * fileData: { base64: string, mimeType: string, fileName: string }
 * คืนค่า { fileId, fileUrl, imageUrl, fileName }
 *   - fileUrl  = ลิงก์เปิดไฟล์ใน Google Drive viewer (ใช้กับ <a href> ทุกกรณี — เปิดดู/ดาวน์โหลดไฟล์เต็ม)
 *   - imageUrl = ลิงก์รูปภาพโดยตรง ใช้กับ <img src> เท่านั้น (fileUrl เปิดเป็นหน้า viewer ของ Drive
 *                ไม่ใช่ไฟล์รูปดิบ ๆ จึงฝังใน <img> ไม่ได้ ต้องใช้ URL แบบ thumbnail นี้แทน)
 */
function uploadFileToFolder_(folderId, fileData) {
  if (!fileData || !fileData.base64) throw new Error('ไม่พบข้อมูลไฟล์ที่จะอัปโหลด');
  var folder = DriveApp.getFolderById(folderId);
  var bytes = Utilities.base64Decode(fileData.base64.split(',').pop());
  var blob = Utilities.newBlob(bytes, fileData.mimeType || 'application/octet-stream', fileData.fileName || 'file');
  var file = folder.createFile(blob);
  // แชร์ไฟล์แบบ "ใครมีลิงก์ก็ดูได้" เสมอ — จำเป็นเพราะหน้าเว็บ (GitHub Pages) เป็นคนละโดเมน/ไม่มี
  // login ของ Google ติดไปด้วย ถ้าไม่ตั้งค่านี้ ไฟล์/รูปจะเปิดไม่ขึ้นสำหรับคนอื่นนอกจากเจ้าของไฟล์
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // บางองค์กร (Google Workspace) อาจปิดสิทธิ์แชร์ออกนอกองค์กรไว้ — ปล่อยผ่านไม่ให้การอัปโหลดล้มเหลว
    // แต่ไฟล์จะยังคงสืบสิทธิ์การแชร์จากโฟลเดอร์แม่ "BACK OFFICE" ที่แชร์ให้ทีมไว้แล้วแทน
  }
  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    imageUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w2000',
    fileName: file.getName()
  };
}

/**
 * อัปโหลดไฟล์ให้รถคันหนึ่งตามหมวดหมู่ (Photos/Insurance/Tax/Compulsory/Service)
 * และบันทึกประวัติลงชีต VehicleDocuments โดยอัตโนมัติ
 */
function uploadVehicleDocument_(vehicleId, category, fileData, refId) {
  var vehicle = findOneById_(SHEET_VEHICLES, 'vehicleId', vehicleId);
  if (!vehicle) throw new Error('ไม่พบรถรหัส ' + vehicleId);
  var folders = ensureVehicleFolder_(vehicleId, vehicle.plateNumber).subfolders;
  var folderId = folders[category];
  if (!folderId) throw new Error('ไม่พบหมวดหมู่โฟลเดอร์: ' + category);

  var result = uploadFileToFolder_(folderId, fileData);

  appendRecord_(SHEET_DOCUMENTS, {
    vehicleId: vehicleId,
    category: category,
    refId: refId || '',
    fileName: result.fileName,
    fileUrl: result.fileUrl,
    fileId: result.fileId,
    uploadedAt: new Date(),
    uploadedBy: getActiveUserEmail_()
  }, 'documentId', 'DOC');

  return result;
}

/** อัปโหลดไฟล์ประกันรถมอเตอร์ไซค์ */
function uploadMotorcycleDocument_(motorcycleId, fileData) {
  var moto = findOneById_(SHEET_MOTORCYCLES, 'motorcycleId', motorcycleId);
  if (!moto) throw new Error('ไม่พบรถมอไซรหัส ' + motorcycleId);
  var folders = ensureMotorcycleFolder_(motorcycleId, moto.label).subfolders;
  return uploadFileToFolder_(folders.Insurance, fileData);
}


/* ========================================================================
 * 4) สร้าง/ตรวจสอบชีตและโฟลเดอร์อัตโนมัติ (เดิมคือ SetupService.gs)
 * ======================================================================== */

/**
 * SetupService.gs
 * -----------------------------------------------------------------------
 * สร้าง/ตรวจสอบ Google Sheets และโครงสร้างโฟลเดอร์ Google Drive โดยอัตโนมัติ
 * รันได้ 2 ทาง:
 *   1) จากหน้าเว็บ (ปุ่ม "ตั้งค่าระบบ" เรียก action runSystemSetup ผ่าน fetch()/apiPost — ดู doPost)
 *   2) จาก Apps Script editor โดยตรง เลือกฟังก์ชัน setupWizard() แล้วกด Run (ครั้งแรกสุด)
 * -----------------------------------------------------------------------
 */

/**
 * ตัวช่วยตั้งค่าระบบครั้งแรก — รันจาก Apps Script editor (เมนู Run)
 * ถ้ายังไม่เคยตั้งค่า SPREADSHEET_ID จะสร้างสเปรดชีตใหม่ให้อัตโนมัติ
 * และสร้างโฟลเดอร์ไดรฟ์รากให้อัตโนมัติเช่นกัน
 */
function setupWizard() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty(PROP_SPREADSHEET_ID);

  if (!ssId) {
    var ss = SpreadsheetApp.create(APP_TITLE + ' - Database');
    ssId = ss.getId();
    props.setProperty(PROP_SPREADSHEET_ID, ssId);
    Logger.log('สร้าง Spreadsheet ใหม่แล้ว: ' + ss.getUrl());
  }

  ensureAllSheets_();
  ensureDriveRootFolder_();
  seedMasterData_();

  Logger.log('ตั้งค่าระบบเสร็จสมบูรณ์');
  Logger.log('Spreadsheet ID: ' + props.getProperty(PROP_SPREADSHEET_ID));
  Logger.log('Drive Root Folder ID: ' + props.getProperty(PROP_DRIVE_ROOT_FOLDER_ID));
  return {
    spreadsheetId: props.getProperty(PROP_SPREADSHEET_ID),
    spreadsheetUrl: SpreadsheetApp.openById(props.getProperty(PROP_SPREADSHEET_ID)).getUrl(),
    driveRootFolderId: props.getProperty(PROP_DRIVE_ROOT_FOLDER_ID)
  };
}

/** เรียกจากหน้าเว็บ (action: runSystemSetup ผ่าน fetch()/apiPost) — ตรวจสอบว่าตั้งค่า SPREADSHEET_ID ไว้แล้วหรือยัง แล้วสร้าง/ตรวจชีต+โฟลเดอร์ให้ครบ */
function runSystemSetup() {
  return safeCall_(function () {
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty(PROP_SPREADSHEET_ID)) {
      throw new Error('กรุณาตั้งค่า SPREADSHEET_ID ใน Project Settings > Script properties ก่อน ' +
        '(หรือรัน setupWizard() จาก Apps Script editor เพื่อให้ระบบสร้างสเปรดชีตใหม่ให้อัตโนมัติ)');
    }
    ensureAllSheets_();
    ensureDriveRootFolder_();
    seedMasterData_();
    logAction_('SETUP', 'System', '', 'ตรวจสอบ/สร้างโครงสร้างชีตและโฟลเดอร์ไดรฟ์');
    return { message: 'ตรวจสอบและสร้างโครงสร้างข้อมูลเรียบร้อยแล้ว' };
  });
}

/** ตรวจสอบและสร้างทุกชีตตาม SCHEMAS ให้ครบ พร้อมหัวคอลัมน์ที่ถูกต้อง */
function ensureAllSheets_() {
  var ss = getSpreadsheet_();
  ALL_SHEET_NAMES.forEach(function (name) {
    ensureSingleSheet_(ss, name);
  });
  // ลบชีตเปล่าเริ่มต้นชื่อ "Sheet1" ถ้ามีการสร้างสเปรดชีตใหม่และยังไม่ได้ใช้งาน
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0 && sheet1.getLastColumn() === 0) {
    ss.deleteSheet(sheet1);
  }
  return true;
}

function ensureSingleSheet_(ss, sheetName) {
  var schema = getSchema_(sheetName);
  var headers = schema.map(function (c) { return c.header; });
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var firstRow = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn() || 1)).getValues()[0];
  var needsHeader = headers.some(function (h, i) { return firstRow[i] !== h; });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  }
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  try { sheet.autoResizeColumns(1, headers.length); } catch (e) { /* ignore ถ้าคอลัมน์ยังว่าง */ }
  return sheet;
}

/** สร้างโฟลเดอร์ราก "BACK OFFICE" ใน Drive (ถ้ายังไม่มี) และเก็บ ID ไว้ใน Script properties */
function ensureDriveRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty(PROP_DRIVE_ROOT_FOLDER_ID);
  var rootFolder;
  if (rootId) {
    try {
      rootFolder = DriveApp.getFolderById(rootId);
    } catch (e) {
      rootFolder = null;
    }
  }
  if (!rootFolder) {
    var existing = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
    rootFolder = existing.hasNext() ? existing.next() : DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);
    props.setProperty(PROP_DRIVE_ROOT_FOLDER_ID, rootFolder.getId());
  }
  getOrCreateSubfolder_(rootFolder, 'VEHICLE');
  getOrCreateSubfolder_(rootFolder, 'MOTORCYCLE');
  getOrCreateSubfolder_(rootFolder, 'PACKAGING');
  return rootFolder;
}

/**
 * ใส่ข้อมูลตัวเลือกเริ่มต้นลงชีต MasterData เฉพาะ "หมวดหมู่ที่ยังไม่มี" เท่านั้น (เพิ่มแบบไม่ทับ/ไม่ซ้ำ)
 * ทำให้รันซ้ำได้เสมอ — สเปรดชีตเก่าที่ตั้งค่ามาก่อนหน้านี้แล้ว พอมีโมดูลใหม่เพิ่ม ตัวเลือกของโมดูลใหม่
 * จะถูกเติมเข้ามาให้อัตโนมัติตอนกด "ตรวจสอบ/สร้างโครงสร้างข้อมูลใหม่" โดยไม่กระทบตัวเลือกเดิมที่มีอยู่แล้ว
 */
function seedMasterData_() {
  var sheet = getSheet_(SHEET_MASTERDATA);
  var existingCategories = {};
  getAllRecords_(SHEET_MASTERDATA).forEach(function (r) { existingCategories[r.category] = true; });

  var rows = [];
  function addAll(category, values) {
    if (existingCategories[category]) return; // มีหมวดหมู่นี้อยู่แล้ว ไม่ต้องเพิ่มซ้ำ
    values.forEach(function (v, i) {
      rows.push([category, v, 'TRUE', i + 1]);
    });
  }
  addAll('สถานะรถ', DEFAULT_VEHICLE_STATUS);
  addAll('แผนก', DEFAULT_DEPARTMENTS);
  addAll('ประเภทค่าใช้จ่าย', DEFAULT_EXPENSE_CATEGORIES);
  addAll('ประเภทประกัน', DEFAULT_INSURANCE_TYPES);
  addAll('ประเภทแพ็คเกจจิ้ง', DEFAULT_PACKAGING_CATEGORIES);
  addAll('หน่วยนับแพ็คเกจจิ้ง', DEFAULT_PACKAGING_UNITS);

  if (rows.length) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, 4).setValues(rows);
  }
}

/** คืนค่าตัวเลือกจาก MasterData ตามหมวดหมู่ (ใช้เติม dropdown ในฟอร์ม) */
function getMasterDataOptions_(category) {
  var all = getAllRecords_(SHEET_MASTERDATA);
  return all
    .filter(function (r) { return r.category === category && String(r.isActive).toUpperCase() !== 'FALSE'; })
    .sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); })
    .map(function (r) { return r.value; });
}

/** เรียกจากหน้าเว็บ — คืนค่าตัวเลือกทั้งหมดที่ใช้ในฟอร์มต่าง ๆ ครั้งเดียว */
function getFormOptions() {
  return safeCall_(function () {
    return {
      vehicleStatus: getMasterDataOptions_('สถานะรถ').length ? getMasterDataOptions_('สถานะรถ') : DEFAULT_VEHICLE_STATUS,
      departments: getMasterDataOptions_('แผนก').length ? getMasterDataOptions_('แผนก') : DEFAULT_DEPARTMENTS,
      expenseCategories: getMasterDataOptions_('ประเภทค่าใช้จ่าย').length ? getMasterDataOptions_('ประเภทค่าใช้จ่าย') : DEFAULT_EXPENSE_CATEGORIES,
      insuranceTypes: getMasterDataOptions_('ประเภทประกัน').length ? getMasterDataOptions_('ประเภทประกัน') : DEFAULT_INSURANCE_TYPES,
      packagingCategories: getMasterDataOptions_('ประเภทแพ็คเกจจิ้ง').length ? getMasterDataOptions_('ประเภทแพ็คเกจจิ้ง') : DEFAULT_PACKAGING_CATEGORIES,
      packagingUnits: getMasterDataOptions_('หน่วยนับแพ็คเกจจิ้ง').length ? getMasterDataOptions_('หน่วยนับแพ็คเกจจิ้ง') : DEFAULT_PACKAGING_UNITS
    };
  });
}


/* ========================================================================
 * 5) โมดูลรถบริษัท: ข้อมูลรถ (เดิมคือ VehicleService.gs)
 * ======================================================================== */

/**
 * VehicleService.gs
 * -----------------------------------------------------------------------
 * CRUD ข้อมูลรถบริษัท (ตารางแม่ Vehicles) + ข้อมูลสรุปสำหรับหน้า "รถทั้งหมด"
 * ทุกฟังก์ชันที่ขึ้นต้นด้วยตัวพิมพ์เล็กไม่มี underscore ต่อท้าย คือฟังก์ชันที่ถูกเรียกจาก
 * หน้าเว็บผ่าน API (fetch → doGet/doPost, ดู action ที่ตรงกันใน app.js)
 * -----------------------------------------------------------------------
 */

/** ดึงรายชื่อรถทั้งหมด พร้อมข้อมูลสรุป ประกัน/ภาษี/พ.ร.บ. ปีปัจจุบัน สำหรับหน้าการ์ดรถทั้งหมด */
function listVehicles() {
  return safeCall_(function () {
    var vehicles = getAllRecords_(SHEET_VEHICLES);
    var insurance = getAllRecords_(SHEET_INSURANCE);
    var tax = getAllRecords_(SHEET_TAX);
    var compulsory = getAllRecords_(SHEET_COMPULSORY);

    return vehicles.map(function (v) {
      return buildVehicleCard_(v, insurance, tax, compulsory);
    });
  });
}

/** ประกอบข้อมูลการ์ดของรถคันหนึ่ง (ใช้ทั้งหน้ารถทั้งหมด และหน้ารายละเอียด) */
function buildVehicleCard_(vehicle, insuranceAll, taxAll, compulsoryAll) {
  var vIns = insuranceAll.filter(function (r) { return r.vehicleId === vehicle.vehicleId; });
  var vTax = taxAll.filter(function (r) { return r.vehicleId === vehicle.vehicleId; });
  var vCom = compulsoryAll.filter(function (r) { return r.vehicleId === vehicle.vehicleId; });

  var curIns = pickCurrentOrLatest_(vIns, 'startDate', 'expiryDate');
  var curTax = pickCurrentOrLatest_(vTax, 'lastRenewalDate', 'expiryDate');
  var curCom = pickCurrentOrLatest_(vCom, 'lastRenewalDate', 'expiryDate');

  return {
    vehicle: vehicle,
    currentInsurance: summarizeDocRecord_(curIns, 'policyFileUrl'),
    currentTax: summarizeDocRecord_(curTax, 'fileUrl'),
    currentCompulsory: summarizeDocRecord_(curCom, 'fileUrl')
  };
}

function summarizeDocRecord_(record, fileKey) {
  if (!record) return null;
  return {
    year: currentYearBE_(),
    fileUrl: record[fileKey] || '',
    nextRenewalDate: record.nextRenewalDate || '',
    nextRenewalDateLabel: formatThaiDate_(record.nextRenewalDate),
    expiryDate: record.expiryDate || '',
    expiryDateLabel: formatThaiDate_(record.expiryDate),
    daysLeft: daysUntil_(record.expiryDate)
  };
}

/** เลือกระเบียนที่ "กำลังคุ้มครองอยู่ปัจจุบัน" ถ้าไม่มีให้เลือกอันล่าสุดตามวันที่เริ่ม */
function pickCurrentOrLatest_(records, startKey, endKey) {
  if (!records || !records.length) return null;
  var now = new Date();
  var active = records.filter(function (r) {
    var s = parseDateInput_(r[startKey]);
    var e = parseDateInput_(r[endKey]);
    return s && e && s.getTime() <= now.getTime() && now.getTime() <= e.getTime();
  });
  var pool = active.length ? active : records;
  pool = pool.slice().sort(function (a, b) {
    var da = parseDateInput_(a[startKey]);
    var db = parseDateInput_(b[startKey]);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });
  return pool[0];
}

/** ดึงรายละเอียดรถคันเดียวแบบเต็ม พร้อมประวัติทุกโมดูลย่อย (สำหรับหน้ารายละเอียดแบบ Tab) */
function getVehicleDetail(vehicleId) {
  return safeCall_(function () {
    var vehicle = findOneById_(SHEET_VEHICLES, 'vehicleId', vehicleId);
    if (!vehicle) throw new Error('ไม่พบรถรหัส ' + vehicleId);

    var insurance = findRecordsByField_(SHEET_INSURANCE, 'vehicleId', vehicleId)
      .sort(byDateDesc_('startDate'));
    var tax = findRecordsByField_(SHEET_TAX, 'vehicleId', vehicleId)
      .sort(byDateDesc_('lastRenewalDate'));
    var compulsory = findRecordsByField_(SHEET_COMPULSORY, 'vehicleId', vehicleId)
      .sort(byDateDesc_('lastRenewalDate'));
    var service = findRecordsByField_(SHEET_SERVICE, 'vehicleId', vehicleId)
      .sort(byDateDesc_('serviceDate'));
    var expenses = findRecordsByField_(SHEET_EXPENSES, 'vehicleId', vehicleId)
      .sort(byDateDesc_('expenseDate'));
    var documents = findRecordsByField_(SHEET_DOCUMENTS, 'vehicleId', vehicleId)
      .sort(byDateDesc_('uploadedAt'));

    return {
      vehicle: vehicle,
      insurance: insurance,
      tax: tax,
      compulsory: compulsory,
      service: service,
      expenses: expenses,
      documents: documents
    };
  });
}

function byDateDesc_(key) {
  return function (a, b) {
    var da = parseDateInput_(a[key]);
    var db = parseDateInput_(b[key]);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  };
}

/** สร้างรถใหม่ — สร้างโฟลเดอร์ไดรฟ์ให้อัตโนมัติ */
function createVehicle(data) {
  return safeCall_(function () {
    if (!data || !data.plateNumber) throw new Error('กรุณาระบุทะเบียนรถ');
    var record = appendRecord_(SHEET_VEHICLES, {
      plateNumber: data.plateNumber,
      brand: data.brand || '',
      model: data.model || '',
      year: data.year || '',
      color: data.color || '',
      chassisNo: data.chassisNo || '',
      engineNo: data.engineNo || '',
      responsiblePerson: data.responsiblePerson || '',
      department: data.department || '',
      status: data.status || 'ใช้งาน',
      mainPhotoUrl: '',
      driveFolderId: '',
      notes: data.notes || ''
    }, 'vehicleId', 'VH');

    var folders = ensureVehicleFolder_(record.vehicleId, record.plateNumber);
    updateRecordById_(SHEET_VEHICLES, 'vehicleId', record.vehicleId, { driveFolderId: folders.folderId });
    record.driveFolderId = folders.folderId;

    logAction_('CREATE', 'Vehicle', record.vehicleId, 'เพิ่มรถใหม่ ' + record.plateNumber);
    return record;
  });
}

/** แก้ไขข้อมูลรถ */
function updateVehicle(vehicleId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_VEHICLES, 'vehicleId', vehicleId, {
      plateNumber: data.plateNumber,
      brand: data.brand,
      model: data.model,
      year: data.year,
      color: data.color,
      chassisNo: data.chassisNo,
      engineNo: data.engineNo,
      responsiblePerson: data.responsiblePerson,
      department: data.department,
      status: data.status,
      notes: data.notes
    });
    logAction_('UPDATE', 'Vehicle', vehicleId, 'แก้ไขข้อมูลรถ');
    return updated;
  });
}

/** อัปโหลดรูปรถหลัก */
function uploadVehiclePhoto(vehicleId, fileData) {
  return safeCall_(function () {
    var result = uploadVehicleDocument_(vehicleId, 'Photos', fileData, '');
    updateRecordById_(SHEET_VEHICLES, 'vehicleId', vehicleId, { mainPhotoUrl: result.imageUrl });
    logAction_('UPLOAD', 'Vehicle', vehicleId, 'อัปโหลดรูปรถหลัก: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 6) โมดูลรถบริษัท: ประกันภัย (เดิมคือ InsuranceService.gs)
 * ======================================================================== */

/**
 * InsuranceService.gs — ประกันภัยรถบริษัท (VehicleInsurance)
 */

function listInsuranceByVehicle(vehicleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_INSURANCE, 'vehicleId', vehicleId).sort(byDateDesc_('startDate'));
  });
}

function createInsurance(data) {
  return safeCall_(function () {
    if (!data || !data.vehicleId) throw new Error('ไม่พบรหัสรถ');
    var record = appendRecord_(SHEET_INSURANCE, {
      vehicleId: data.vehicleId,
      company: data.company || '',
      policyNo: data.policyNo || '',
      insuranceType: data.insuranceType || '',
      startDate: data.startDate || '',
      expiryDate: data.expiryDate || '',
      nextRenewalDate: data.nextRenewalDate || '',
      sumInsured: data.sumInsured || 0,
      premium: data.premium || 0,
      policyFileUrl: '',
      receiptFileUrl: '',
      notes: data.notes || ''
    }, 'insuranceId', 'INS');
    logAction_('CREATE', 'Insurance', record.insuranceId, 'เพิ่มประกันรถ ' + data.vehicleId);
    return record;
  });
}

function updateInsurance(insuranceId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_INSURANCE, 'insuranceId', insuranceId, {
      company: data.company, policyNo: data.policyNo, insuranceType: data.insuranceType,
      startDate: data.startDate, expiryDate: data.expiryDate, nextRenewalDate: data.nextRenewalDate,
      sumInsured: data.sumInsured, premium: data.premium, notes: data.notes
    });
    logAction_('UPDATE', 'Insurance', insuranceId, 'แก้ไขประกันรถ');
    return updated;
  });
}

/** อัปโหลดไฟล์กรมธรรม์ หรือ ใบเสร็จ — fileKind = 'policy' | 'receipt' */
function uploadInsuranceFile(insuranceId, fileKind, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_INSURANCE, 'insuranceId', insuranceId);
    if (!record) throw new Error('ไม่พบรายการประกันรหัส ' + insuranceId);
    var result = uploadVehicleDocument_(record.vehicleId, 'Insurance', fileData, insuranceId);
    var patch = {};
    patch[fileKind === 'receipt' ? 'receiptFileUrl' : 'policyFileUrl'] = result.fileUrl;
    updateRecordById_(SHEET_INSURANCE, 'insuranceId', insuranceId, patch);
    logAction_('UPLOAD', 'Insurance', insuranceId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 7) โมดูลรถบริษัท: ภาษี (เดิมคือ TaxService.gs)
 * ======================================================================== */

/**
 * TaxService.gs — ภาษีรถบริษัท (VehicleTax)
 */

function listTaxByVehicle(vehicleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_TAX, 'vehicleId', vehicleId).sort(byDateDesc_('lastRenewalDate'));
  });
}

function createTax(data) {
  return safeCall_(function () {
    if (!data || !data.vehicleId) throw new Error('ไม่พบรหัสรถ');
    var record = appendRecord_(SHEET_TAX, {
      vehicleId: data.vehicleId,
      lastRenewalDate: data.lastRenewalDate || '',
      expiryDate: data.expiryDate || '',
      nextRenewalDate: data.nextRenewalDate || '',
      docNo: data.docNo || '',
      cost: data.cost || 0,
      fileUrl: '',
      notes: data.notes || ''
    }, 'taxId', 'TAX');
    logAction_('CREATE', 'Tax', record.taxId, 'เพิ่มภาษีรถ ' + data.vehicleId);
    return record;
  });
}

function updateTax(taxId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_TAX, 'taxId', taxId, {
      lastRenewalDate: data.lastRenewalDate, expiryDate: data.expiryDate, nextRenewalDate: data.nextRenewalDate,
      docNo: data.docNo, cost: data.cost, notes: data.notes
    });
    logAction_('UPDATE', 'Tax', taxId, 'แก้ไขภาษีรถ');
    return updated;
  });
}

function uploadTaxFile(taxId, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_TAX, 'taxId', taxId);
    if (!record) throw new Error('ไม่พบรายการภาษีรหัส ' + taxId);
    var result = uploadVehicleDocument_(record.vehicleId, 'Tax', fileData, taxId);
    updateRecordById_(SHEET_TAX, 'taxId', taxId, { fileUrl: result.fileUrl });
    logAction_('UPLOAD', 'Tax', taxId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 8) โมดูลรถบริษัท: พ.ร.บ. (เดิมคือ CompulsoryService.gs)
 * ======================================================================== */

/**
 * CompulsoryService.gs — พ.ร.บ. รถบริษัท (VehicleCompulsory)
 */

function listCompulsoryByVehicle(vehicleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_COMPULSORY, 'vehicleId', vehicleId).sort(byDateDesc_('lastRenewalDate'));
  });
}

function createCompulsory(data) {
  return safeCall_(function () {
    if (!data || !data.vehicleId) throw new Error('ไม่พบรหัสรถ');
    var record = appendRecord_(SHEET_COMPULSORY, {
      vehicleId: data.vehicleId,
      lastRenewalDate: data.lastRenewalDate || '',
      expiryDate: data.expiryDate || '',
      nextRenewalDate: data.nextRenewalDate || '',
      docNo: data.docNo || '',
      cost: data.cost || 0,
      fileUrl: '',
      notes: data.notes || ''
    }, 'compulsoryId', 'PRB');
    logAction_('CREATE', 'Compulsory', record.compulsoryId, 'เพิ่ม พ.ร.บ. รถ ' + data.vehicleId);
    return record;
  });
}

function updateCompulsory(compulsoryId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_COMPULSORY, 'compulsoryId', compulsoryId, {
      lastRenewalDate: data.lastRenewalDate, expiryDate: data.expiryDate, nextRenewalDate: data.nextRenewalDate,
      docNo: data.docNo, cost: data.cost, notes: data.notes
    });
    logAction_('UPDATE', 'Compulsory', compulsoryId, 'แก้ไข พ.ร.บ. รถ');
    return updated;
  });
}

function uploadCompulsoryFile(compulsoryId, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_COMPULSORY, 'compulsoryId', compulsoryId);
    if (!record) throw new Error('ไม่พบรายการ พ.ร.บ. รหัส ' + compulsoryId);
    var result = uploadVehicleDocument_(record.vehicleId, 'Compulsory', fileData, compulsoryId);
    updateRecordById_(SHEET_COMPULSORY, 'compulsoryId', compulsoryId, { fileUrl: result.fileUrl });
    logAction_('UPLOAD', 'Compulsory', compulsoryId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 9) โมดูลรถบริษัท: ประวัติเช็คระยะ (เดิมคือ ServiceHistoryService.gs)
 * ======================================================================== */

/**
 * ServiceHistoryService.gs — ประวัติ "เช็คระยะ" ของรถบริษัท (VehicleService)
 * หมายเหตุ: ในหน้าเว็บใช้คำว่า "เช็คระยะ" แทน "เข้าศูนย์" ตามที่ผู้ใช้ต้องการ
 */

function listServiceByVehicle(vehicleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_SERVICE, 'vehicleId', vehicleId).sort(byDateDesc_('serviceDate'));
  });
}

/** เพิ่มประวัติเช็คระยะใหม่ — ไม่ทับข้อมูลเดิม เพิ่มเป็นแถวใหม่เสมอ */
function createServiceRecord(data) {
  return safeCall_(function () {
    if (!data || !data.vehicleId) throw new Error('ไม่พบรหัสรถ');
    var record = appendRecord_(SHEET_SERVICE, {
      vehicleId: data.vehicleId,
      serviceDate: data.serviceDate || '',
      mileage: data.mileage || 0,
      serviceCenter: data.serviceCenter || '',
      serviceType: data.serviceType || '',
      itemsDone: data.itemsDone || '',
      cost: data.cost || 0,
      nextAppointmentDate: data.nextAppointmentDate || '',
      nextMileage: data.nextMileage || '',
      receiptFileUrl: '',
      photo1Url: '',
      photo2Url: '',
      notes: data.notes || ''
    }, 'serviceId', 'SVC');
    logAction_('CREATE', 'Service', record.serviceId, 'เพิ่มประวัติเช็คระยะรถ ' + data.vehicleId);
    return record;
  });
}

function updateServiceRecord(serviceId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_SERVICE, 'serviceId', serviceId, {
      serviceDate: data.serviceDate, mileage: data.mileage, serviceCenter: data.serviceCenter,
      serviceType: data.serviceType, itemsDone: data.itemsDone, cost: data.cost,
      nextAppointmentDate: data.nextAppointmentDate, nextMileage: data.nextMileage, notes: data.notes
    });
    logAction_('UPDATE', 'Service', serviceId, 'แก้ไขประวัติเช็คระยะ');
    return updated;
  });
}

/** อัปโหลดไฟล์ของประวัติเช็คระยะ — fileKind = 'receipt' | 'photo1' | 'photo2' */
function uploadServiceFile(serviceId, fileKind, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_SERVICE, 'serviceId', serviceId);
    if (!record) throw new Error('ไม่พบประวัติเช็คระยะรหัส ' + serviceId);
    var result = uploadVehicleDocument_(record.vehicleId, 'Service', fileData, serviceId);
    var keyMap = { receipt: 'receiptFileUrl', photo1: 'photo1Url', photo2: 'photo2Url' };
    var isPhoto = fileKind === 'photo1' || fileKind === 'photo2';
    var patch = {};
    patch[keyMap[fileKind] || 'receiptFileUrl'] = isPhoto ? result.imageUrl : result.fileUrl;
    updateRecordById_(SHEET_SERVICE, 'serviceId', serviceId, patch);
    logAction_('UPLOAD', 'Service', serviceId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 10) โมดูลรถบริษัท: ค่าใช้จ่าย (เดิมคือ ExpenseService.gs)
 * ======================================================================== */

/**
 * ExpenseService.gs — ค่าใช้จ่ายรถบริษัท (VehicleExpenses)
 */

function listExpensesByVehicle(vehicleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_EXPENSES, 'vehicleId', vehicleId).sort(byDateDesc_('expenseDate'));
  });
}

function createExpense(data) {
  return safeCall_(function () {
    if (!data || !data.vehicleId) throw new Error('ไม่พบรหัสรถ');
    var record = appendRecord_(SHEET_EXPENSES, {
      vehicleId: data.vehicleId,
      expenseDate: data.expenseDate || '',
      category: data.category || '',
      description: data.description || '',
      cost: data.cost || 0,
      refType: data.refType || '',
      refId: data.refId || '',
      fileUrl: '',
      notes: data.notes || ''
    }, 'expenseId', 'EXP');
    logAction_('CREATE', 'Expense', record.expenseId, 'เพิ่มค่าใช้จ่ายรถ ' + data.vehicleId);
    return record;
  });
}

function updateExpense(expenseId, data) {
  return safeCall_(function () {
    if (!expenseId) throw new Error('ไม่พบรหัสค่าใช้จ่าย');
    var record = updateRecordById_(SHEET_EXPENSES, 'expenseId', expenseId, {
      expenseDate: data.expenseDate || '',
      category: data.category || '',
      description: data.description || '',
      cost: data.cost || 0,
      notes: data.notes || ''
    });
    logAction_('UPDATE', 'Expense', expenseId, 'แก้ไขค่าใช้จ่าย: ' + (data.description || ''));
    return record;
  });
}

/** ลบรายการค่าใช้จ่าย — ใช้กรณีกรอกผิด/ซ้ำ (ฝั่งหน้าเว็บมีกล่องยืนยันก่อนเรียก action นี้เสมอ) */
function deleteExpense(expenseId) {
  return safeCall_(function () {
    if (!expenseId) throw new Error('ไม่พบรหัสค่าใช้จ่าย');
    deleteRecordById_(SHEET_EXPENSES, 'expenseId', expenseId);
    logAction_('DELETE', 'Expense', expenseId, 'ลบรายการค่าใช้จ่าย');
    return { deleted: true, expenseId: expenseId };
  });
}

function uploadExpenseFile(expenseId, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_EXPENSES, 'expenseId', expenseId);
    if (!record) throw new Error('ไม่พบรายการค่าใช้จ่ายรหัส ' + expenseId);
    var vehicle = findOneById_(SHEET_VEHICLES, 'vehicleId', record.vehicleId);
    var folders = ensureVehicleFolder_(record.vehicleId, vehicle.plateNumber).subfolders;
    // เก็บไฟล์ค่าใช้จ่ายทั่วไปไว้ในโฟลเดอร์ Service เพื่อไม่ต้องเพิ่มโฟลเดอร์ย่อยใหม่
    var result = uploadFileToFolder_(folders.Service, fileData);
    updateRecordById_(SHEET_EXPENSES, 'expenseId', expenseId, { fileUrl: result.fileUrl });
    logAction_('UPLOAD', 'Expense', expenseId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 11) โมดูลรถมอเตอร์ไซค์ (เดิมคือ MotorcycleService.gs)
 * ======================================================================== */

/**
 * MotorcycleService.gs
 * -----------------------------------------------------------------------
 * โมดูล "ประกันรถมอไซ" — เก็บเฉพาะข้อมูลจำเป็นของรถมอเตอร์ไซค์ (ไม่เก็บข้อมูลรถแบบเต็มเหมือนรถยนต์)
 * และประกันอุบัติเหตุของแต่ละคัน
 * -----------------------------------------------------------------------
 */

function listMotorcycles() {
  return safeCall_(function () {
    var motos = getAllRecords_(SHEET_MOTORCYCLES);
    var allIns = getAllRecords_(SHEET_MOTO_INSURANCE);
    return motos.map(function (m) {
      var ins = allIns.filter(function (r) { return r.motorcycleId === m.motorcycleId; });
      var current = pickCurrentOrLatest_(ins, 'startDate', 'expiryDate');
      return {
        motorcycle: m,
        currentInsurance: current,
        currentInsuranceLabel: current ? {
          expiryDateLabel: formatThaiDate_(current.expiryDate),
          nextRenewalDateLabel: formatThaiDate_(current.nextRenewalDate),
          daysLeft: daysUntil_(current.expiryDate)
        } : null
      };
    });
  });
}

function createMotorcycle(data) {
  return safeCall_(function () {
    if (!data || !data.label) throw new Error('กรุณาระบุทะเบียน/ชื่อเรียกรถมอไซ');
    var record = appendRecord_(SHEET_MOTORCYCLES, {
      label: data.label,
      responsiblePerson: data.responsiblePerson || '',
      driveFolderId: '',
      notes: data.notes || ''
    }, 'motorcycleId', 'MC');
    var folders = ensureMotorcycleFolder_(record.motorcycleId, record.label);
    updateRecordById_(SHEET_MOTORCYCLES, 'motorcycleId', record.motorcycleId, { driveFolderId: folders.folderId });
    record.driveFolderId = folders.folderId;
    logAction_('CREATE', 'Motorcycle', record.motorcycleId, 'เพิ่มรถมอไซ ' + record.label);
    return record;
  });
}

function updateMotorcycle(motorcycleId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_MOTORCYCLES, 'motorcycleId', motorcycleId, {
      label: data.label, responsiblePerson: data.responsiblePerson, notes: data.notes
    });
    logAction_('UPDATE', 'Motorcycle', motorcycleId, 'แก้ไขข้อมูลรถมอไซ');
    return updated;
  });
}

function listMotoInsurance(motorcycleId) {
  return safeCall_(function () {
    return findRecordsByField_(SHEET_MOTO_INSURANCE, 'motorcycleId', motorcycleId).sort(byDateDesc_('startDate'));
  });
}

function createMotoInsurance(data) {
  return safeCall_(function () {
    if (!data || !data.motorcycleId) throw new Error('ไม่พบรหัสรถมอไซ');
    var record = appendRecord_(SHEET_MOTO_INSURANCE, {
      motorcycleId: data.motorcycleId,
      company: data.company || '',
      policyNo: data.policyNo || '',
      coverageType: data.coverageType || 'ประกันอุบัติเหตุ',
      startDate: data.startDate || '',
      expiryDate: data.expiryDate || '',
      nextRenewalDate: data.nextRenewalDate || '',
      premium: data.premium || 0,
      policyFileUrl: '',
      notes: data.notes || ''
    }, 'motoInsuranceId', 'MCI');
    logAction_('CREATE', 'MotoInsurance', record.motoInsuranceId, 'เพิ่มประกันรถมอไซ ' + data.motorcycleId);
    return record;
  });
}

function updateMotoInsurance(motoInsuranceId, data) {
  return safeCall_(function () {
    var updated = updateRecordById_(SHEET_MOTO_INSURANCE, 'motoInsuranceId', motoInsuranceId, {
      company: data.company, policyNo: data.policyNo, coverageType: data.coverageType,
      startDate: data.startDate, expiryDate: data.expiryDate, nextRenewalDate: data.nextRenewalDate,
      premium: data.premium, notes: data.notes
    });
    logAction_('UPDATE', 'MotoInsurance', motoInsuranceId, 'แก้ไขประกันรถมอไซ');
    return updated;
  });
}

function uploadMotoInsuranceFile(motoInsuranceId, fileData) {
  return safeCall_(function () {
    var record = findOneById_(SHEET_MOTO_INSURANCE, 'motoInsuranceId', motoInsuranceId);
    if (!record) throw new Error('ไม่พบรายการประกันรหัส ' + motoInsuranceId);
    var result = uploadMotorcycleDocument_(record.motorcycleId, fileData);
    updateRecordById_(SHEET_MOTO_INSURANCE, 'motoInsuranceId', motoInsuranceId, { policyFileUrl: result.fileUrl });
    logAction_('UPLOAD', 'MotoInsurance', motoInsuranceId, 'อัปโหลดไฟล์: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 12) โมดูลแพ็คเกจจิ้ง: วัสดุ/อุปกรณ์แพ็คของส่งพัสดุ (เดิมคือ PackagingService.gs)
 * ======================================================================== */

/**
 * PackagingService.gs
 * -----------------------------------------------------------------------
 * ติดตามวัสดุ/อุปกรณ์แพ็คของส่งพัสดุ (กล่อง, เทป, ถุงแพ็ค, กันกระแทก ฯลฯ) แยกเป็น 2 ชั้น:
 *   - PackagingItems  = รายการ/สเปกแต่ละชนิด (ตารางแม่ — ไซส์เดิมที่สั่งซ้ำ ๆ ตั้งครั้งเดียวใช้ยาว)
 *   - PackagingOrders = ประวัติการสั่งซื้อแต่ละครั้งของแต่ละรายการ (ดูย้อนหลังได้ว่าสั่งล่าสุดเมื่อไหร่
 *     ราคาเท่าไหร่ บิลไหน) — ออกแบบให้ดูเป็น "ประวัติของรายการ" เป็นหลัก ไม่ใช่ "ประวัติของบิล"
 *     ตามที่ต้องการ (บิลเป็นแค่ไฟล์แนบของแต่ละครั้งที่สั่ง)
 * -----------------------------------------------------------------------
 */

/** สร้าง/คืนโฟลเดอร์ของรายการแพ็คเกจจิ้งชนิดหนึ่ง (มีโฟลเดอร์ย่อย Reference และ Bills) */
function ensurePackagingItemFolder_(itemId, itemName) {
  var root = getDriveRootFolder_();
  var pkgRoot = getOrCreateSubfolder_(root, 'PACKAGING');
  var folderName = sanitizeFolderName_(itemId) + '_' + sanitizeFolderName_(itemName);
  var itemFolder = getOrCreateSubfolder_(pkgRoot, folderName);
  var subfolders = {
    Reference: getOrCreateSubfolder_(itemFolder, 'Reference').getId(),
    Bills: getOrCreateSubfolder_(itemFolder, 'Bills').getId()
  };
  return { folderId: itemFolder.getId(), subfolders: subfolders };
}

/** รายชื่อรายการแพ็คเกจจิ้งทั้งหมด พร้อมสรุปการสั่งซื้อล่าสุดของแต่ละรายการ สำหรับหน้าการ์ดรวม */
function listPackagingItems() {
  return safeCall_(function () {
    var items = getAllRecords_(SHEET_PACKAGING_ITEMS).filter(function (r) { return r.status !== 'ปิดใช้งาน'; });
    var orders = getAllRecords_(SHEET_PACKAGING_ORDERS);
    return items.map(function (item) {
      var itemOrders = orders.filter(function (o) { return o.itemId === item.itemId; }).sort(byDateDesc_('orderDate'));
      var last = itemOrders[0] || null;
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        unit: item.unit,
        referenceImageUrl: item.referenceImageUrl,
        notes: item.notes,
        orderCount: itemOrders.length,
        lastOrderDate: last ? last.orderDate : '',
        lastQuantity: last ? last.quantity : '',
        lastUnitPrice: last ? last.unitPrice : '',
        lastTotalCost: last ? last.totalCost : '',
        lastBillFileUrl: last ? last.billFileUrl : '',
        lastSupplier: last ? last.supplier : ''
      };
    }).sort(function (a, b) { return String(a.itemName).localeCompare(String(b.itemName), 'th'); });
  });
}

/** รายละเอียดรายการเดียว + ประวัติการสั่งซื้อทั้งหมด (ใหม่สุดก่อน) สำหรับหน้ารายละเอียด */
function getPackagingItemDetail(itemId) {
  return safeCall_(function () {
    var item = findOneById_(SHEET_PACKAGING_ITEMS, 'itemId', itemId);
    if (!item) throw new Error('ไม่พบรายการรหัส ' + itemId);
    var orders = findRecordsByField_(SHEET_PACKAGING_ORDERS, 'itemId', itemId).sort(byDateDesc_('orderDate'));
    return { item: item, orders: orders };
  });
}

function createPackagingItem(data) {
  return safeCall_(function () {
    if (!data || !String(data.itemName || '').trim()) throw new Error('กรุณาระบุชื่อรายการ');
    var record = appendRecord_(SHEET_PACKAGING_ITEMS, {
      itemName: data.itemName.trim(),
      category: data.category || '',
      unit: data.unit || '',
      referenceImageUrl: '',
      status: 'ใช้งาน',
      notes: data.notes || ''
    }, 'itemId', 'PKG');
    logAction_('CREATE', 'PackagingItem', record.itemId, 'เพิ่มรายการแพ็คเกจจิ้ง: ' + record.itemName);
    return record;
  });
}

function updatePackagingItem(itemId, data) {
  return safeCall_(function () {
    if (!itemId) throw new Error('ไม่พบรหัสรายการ');
    var patch = {
      itemName: data.itemName || '',
      category: data.category || '',
      unit: data.unit || '',
      notes: data.notes || ''
    };
    if (data.status) patch.status = data.status; // 'ใช้งาน' หรือ 'ปิดใช้งาน' (ซ่อนจากหน้ารวม แต่ประวัติเดิมยังอยู่)
    var record = updateRecordById_(SHEET_PACKAGING_ITEMS, 'itemId', itemId, patch);
    logAction_('UPDATE', 'PackagingItem', itemId, 'แก้ไขรายการแพ็คเกจจิ้ง');
    return record;
  });
}

/** ลบรายการได้เฉพาะตอนที่ยังไม่เคยมีประวัติการสั่งซื้อผูกอยู่เท่านั้น (กันลบพลาดแล้วประวัติหาย) */
function deletePackagingItem(itemId) {
  return safeCall_(function () {
    if (!itemId) throw new Error('ไม่พบรหัสรายการ');
    var hasOrders = findRecordsByField_(SHEET_PACKAGING_ORDERS, 'itemId', itemId).length > 0;
    if (hasOrders) {
      throw new Error('ลบไม่ได้เพราะมีประวัติการสั่งซื้อผูกอยู่แล้ว — ถ้าเลิกใช้รายการนี้ ให้แก้ไขสถานะเป็น "ปิดใช้งาน" แทน');
    }
    deleteRecordById_(SHEET_PACKAGING_ITEMS, 'itemId', itemId);
    logAction_('DELETE', 'PackagingItem', itemId, 'ลบรายการแพ็คเกจจิ้ง');
    return { deleted: true, itemId: itemId };
  });
}

/** อัปโหลด/เปลี่ยนรูปตัวอย่างของรายการ */
function uploadPackagingItemImage(itemId, fileData) {
  return safeCall_(function () {
    var item = findOneById_(SHEET_PACKAGING_ITEMS, 'itemId', itemId);
    if (!item) throw new Error('ไม่พบรายการรหัส ' + itemId);
    var folders = ensurePackagingItemFolder_(itemId, item.itemName).subfolders;
    var result = uploadFileToFolder_(folders.Reference, fileData);
    updateRecordById_(SHEET_PACKAGING_ITEMS, 'itemId', itemId, { referenceImageUrl: result.imageUrl });
    logAction_('UPLOAD', 'PackagingItem', itemId, 'อัปโหลดรูปตัวอย่าง: ' + result.fileName);
    return result;
  });
}

function createPackagingOrder(data) {
  return safeCall_(function () {
    if (!data || !data.itemId) throw new Error('กรุณาเลือกรายการที่จะสั่งซื้อ');
    var item = findOneById_(SHEET_PACKAGING_ITEMS, 'itemId', data.itemId);
    if (!item) throw new Error('ไม่พบรายการรหัส ' + data.itemId);
    var record = appendRecord_(SHEET_PACKAGING_ORDERS, {
      itemId: data.itemId,
      orderDate: data.orderDate || '',
      quantity: data.quantity || 0,
      unitPrice: data.unitPrice || '',
      totalCost: data.totalCost || '',
      billNumber: data.billNumber || '',
      billFileUrl: '',
      supplier: data.supplier || '',
      notes: data.notes || ''
    }, 'orderId', 'PKGORD');
    logAction_('CREATE', 'PackagingOrder', record.orderId, 'บันทึกการสั่งซื้อ: ' + item.itemName);
    return record;
  });
}

function updatePackagingOrder(orderId, data) {
  return safeCall_(function () {
    if (!orderId) throw new Error('ไม่พบรหัสการสั่งซื้อ');
    var record = updateRecordById_(SHEET_PACKAGING_ORDERS, 'orderId', orderId, {
      orderDate: data.orderDate || '',
      quantity: data.quantity || 0,
      unitPrice: data.unitPrice || '',
      totalCost: data.totalCost || '',
      billNumber: data.billNumber || '',
      supplier: data.supplier || '',
      notes: data.notes || ''
    });
    logAction_('UPDATE', 'PackagingOrder', orderId, 'แก้ไขประวัติการสั่งซื้อ');
    return record;
  });
}

/** ลบประวัติการสั่งซื้อ 1 รายการ — ใช้กรณีกรอกผิด/ซ้ำ (ฝั่งหน้าเว็บมีกล่องยืนยันก่อนเรียก action นี้เสมอ) */
function deletePackagingOrder(orderId) {
  return safeCall_(function () {
    if (!orderId) throw new Error('ไม่พบรหัสการสั่งซื้อ');
    deleteRecordById_(SHEET_PACKAGING_ORDERS, 'orderId', orderId);
    logAction_('DELETE', 'PackagingOrder', orderId, 'ลบประวัติการสั่งซื้อ');
    return { deleted: true, orderId: orderId };
  });
}

/** อัปโหลดไฟล์บิล/ใบเสร็จของการสั่งซื้อครั้งนั้น ๆ */
function uploadPackagingBillFile(orderId, fileData) {
  return safeCall_(function () {
    var order = findOneById_(SHEET_PACKAGING_ORDERS, 'orderId', orderId);
    if (!order) throw new Error('ไม่พบรายการสั่งซื้อรหัส ' + orderId);
    var item = findOneById_(SHEET_PACKAGING_ITEMS, 'itemId', order.itemId);
    var folders = ensurePackagingItemFolder_(order.itemId, item ? item.itemName : order.itemId).subfolders;
    var result = uploadFileToFolder_(folders.Bills, fileData);
    updateRecordById_(SHEET_PACKAGING_ORDERS, 'orderId', orderId, { billFileUrl: result.fileUrl });
    logAction_('UPLOAD', 'PackagingOrder', orderId, 'อัปโหลดไฟล์บิล: ' + result.fileName);
    return result;
  });
}


/* ========================================================================
 * 13) Dashboard (เดิมคือ DashboardService.gs)
 * ======================================================================== */

/**
 * DashboardService.gs — ข้อมูลสรุปสำหรับหน้า Dashboard
 */

function getDashboardSummary() {
  return safeCall_(function () {
    var vehicles = getAllRecords_(SHEET_VEHICLES);
    var motos = getAllRecords_(SHEET_MOTORCYCLES);
    var alerts = computeAlerts_();

    var statusCounts = { 'ใช้งาน': 0, 'ซ่อม': 0, 'จำหน่าย': 0 };
    vehicles.forEach(function (v) {
      var s = v.status || 'ใช้งาน';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    function countByType(type) {
      return alerts.filter(function (a) { return a.alertType === type; }).length;
    }

    return {
      totalVehicles: vehicles.length,
      totalMotorcycles: motos.length,
      statusCounts: statusCounts,
      alertCounts: {
        insurance: countByType('ประกันภัย'),
        tax: countByType('ภาษี'),
        compulsory: countByType('พ.ร.บ.'),
        service: countByType('เช็คระยะ'),
        motoInsurance: countByType('ประกันรถมอไซ')
      },
      actionItems: alerts.slice(0, 20),
      generatedAtLabel: formatThaiDateTime_(new Date())
    };
  });
}


/* ========================================================================
 * 14) การแจ้งเตือนใกล้หมดอายุ (เดิมคือ AlertService.gs)
 * ======================================================================== */

/**
 * AlertService.gs
 * -----------------------------------------------------------------------
 * คำนวณรายการ "ใกล้หมดอายุ / ถึงกำหนด" ของประกัน ภาษี พ.ร.บ. และเช็คระยะ
 * ทั้งรถยนต์และรถมอเตอร์ไซค์ ใช้แสดงผลใน Dashboard และบันทึกแคชลงชีต VehicleAlerts
 * -----------------------------------------------------------------------
 */

/** เรียกจากหน้าเว็บ — คำนวณรายการแจ้งเตือนสดใหม่ทุกครั้ง (ไม่ต้องพึ่งชีต VehicleAlerts) */
function computeAlerts() {
  return safeCall_(function () {
    return computeAlerts_();
  });
}

function computeAlerts_() {
  var vehicles = getAllRecords_(SHEET_VEHICLES);
  var vehicleMap = {};
  vehicles.forEach(function (v) { vehicleMap[v.vehicleId] = v; });

  var alerts = [];

  alerts = alerts.concat(buildAlertsFromRecords_(
    getAllRecords_(SHEET_INSURANCE), vehicleMap, 'ประกันภัย', 'expiryDate', ALERT_DAYS_INSURANCE, '🛡️'));
  alerts = alerts.concat(buildAlertsFromRecords_(
    getAllRecords_(SHEET_TAX), vehicleMap, 'ภาษี', 'expiryDate', ALERT_DAYS_TAX, '📄'));
  alerts = alerts.concat(buildAlertsFromRecords_(
    getAllRecords_(SHEET_COMPULSORY), vehicleMap, 'พ.ร.บ.', 'expiryDate', ALERT_DAYS_COMPULSORY, '📄'));

  // เช็คระยะ: แจ้งเตือนจากวันนัดครั้งถัดไป
  var serviceRecords = getAllRecords_(SHEET_SERVICE);
  serviceRecords.forEach(function (r) {
    if (!r.nextAppointmentDate) return;
    var days = daysUntil_(r.nextAppointmentDate);
    if (days === null) return;
    if (days <= ALERT_DAYS_SERVICE) {
      var v = vehicleMap[r.vehicleId];
      alerts.push({
        vehicleId: r.vehicleId,
        vehicleLabel: v ? (v.brand + ' ' + v.model + ' (' + v.plateNumber + ')') : r.vehicleId,
        alertType: 'เช็คระยะ',
        icon: '🔧',
        dueDate: r.nextAppointmentDate,
        dueDateLabel: formatThaiDate_(r.nextAppointmentDate),
        daysLeft: days,
        message: (v ? v.plateNumber : r.vehicleId) + ' — ถึงกำหนดเช็คระยะใน ' + days + ' วัน',
        severity: severityFromDays_(days)
      });
    }
  });

  // มอเตอร์ไซค์: ประกันอุบัติเหตุ
  var motos = getAllRecords_(SHEET_MOTORCYCLES);
  var motoMap = {};
  motos.forEach(function (m) { motoMap[m.motorcycleId] = m; });
  var motoIns = getAllRecords_(SHEET_MOTO_INSURANCE);
  motoIns.forEach(function (r) {
    if (!r.expiryDate) return;
    var days = daysUntil_(r.expiryDate);
    if (days === null) return;
    if (days <= ALERT_DAYS_INSURANCE) {
      var m = motoMap[r.motorcycleId];
      alerts.push({
        vehicleId: r.motorcycleId,
        vehicleLabel: m ? ('มอไซ ' + m.label) : r.motorcycleId,
        alertType: 'ประกันรถมอไซ',
        icon: '🏍️',
        dueDate: r.expiryDate,
        dueDateLabel: formatThaiDate_(r.expiryDate),
        daysLeft: days,
        message: (m ? m.label : r.motorcycleId) + ' — ประกันอุบัติเหตุ' +
          (days < 0 ? 'หมดอายุแล้ว ' + Math.abs(days) + ' วัน' : 'หมดใน ' + days + ' วัน'),
        severity: severityFromDays_(days)
      });
    }
  });

  alerts.sort(function (a, b) { return a.daysLeft - b.daysLeft; });
  return alerts;
}

function buildAlertsFromRecords_(records, vehicleMap, typeLabel, dateKey, thresholdDays, icon) {
  var out = [];
  records.forEach(function (r) {
    if (!r[dateKey]) return;
    var days = daysUntil_(r[dateKey]);
    if (days === null) return;
    if (days <= thresholdDays) {
      var v = vehicleMap[r.vehicleId];
      var label = v ? (v.brand + ' ' + v.model + ' (' + v.plateNumber + ')') : r.vehicleId;
      out.push({
        vehicleId: r.vehicleId,
        vehicleLabel: label,
        alertType: typeLabel,
        icon: icon,
        dueDate: r[dateKey],
        dueDateLabel: formatThaiDate_(r[dateKey]),
        daysLeft: days,
        message: (v ? v.plateNumber : r.vehicleId) + ' — ' + typeLabel +
          (days < 0 ? 'หมดอายุแล้ว ' + Math.abs(days) + ' วัน' : 'หมดใน ' + days + ' วัน'),
        severity: severityFromDays_(days)
      });
    }
  });
  return out;
}

function severityFromDays_(days) {
  if (days <= ALERT_SEVERITY_CRITICAL_DAYS) return 'วิกฤต';
  if (days <= ALERT_SEVERITY_WARNING_DAYS) return 'เฝ้าระวัง';
  return 'ปกติ';
}

/** บันทึกแคชรายการแจ้งเตือนลงชีต VehicleAlerts (เรียกด้วยมือ หรือทำ time-driven trigger เพิ่มเองภายหลังได้) */
function refreshAlertsSheet() {
  return safeCall_(function () {
    var sheet = getSheet_(SHEET_ALERTS);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

    var alerts = computeAlerts_();
    var now = new Date();
    var rows = alerts.map(function (a, i) {
      return objectToRowArray_(SHEET_ALERTS, {
        alertId: 'ALT-' + ('0000' + (i + 1)).slice(-4),
        vehicleId: a.vehicleId,
        vehicleLabel: a.vehicleLabel,
        alertType: a.alertType,
        dueDate: a.dueDate,
        daysLeft: a.daysLeft,
        message: a.message,
        severity: a.severity,
        generatedAt: now
      });
    });
    if (rows.length) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return { count: rows.length };
  });
}


/* ========================================================================
 * 15) จุดเริ่มต้นเว็บแอป (เดิมคือ Code.gs)
 * ======================================================================== */

/**
 * Code.gs
 * -----------------------------------------------------------------------
 * Back Office Management System — Backend / JSON API เท่านั้น
 * โมดูลแรก: จัดการรถบริษัท (Vehicle Management)
 *
 * ตามมาตรฐานสถาปัตยกรรมที่กำหนด: ไฟล์นี้ทำหน้าที่เป็น API ล้วน ๆ ไม่มีการ render หน้าเว็บ (HtmlService)
 * ฝั่งหน้าเว็บ (index.html/style.css/app.js/config.js) เป็น static site แยกต่างหาก โฮสต์บน GitHub Pages
 * แล้วเรียกเข้ามาที่นี่ผ่าน fetch() เท่านั้น — ดู README.md หัวข้อ "API Contract" สำหรับรายชื่อ action ทั้งหมด
 * -----------------------------------------------------------------------
 */

// ========================= JSON API router =========================

/** สร้าง response แบบ JSON เสมอ — Apps Script จะแนบ Access-Control-Allow-Origin: * ให้อัตโนมัติ
 *  สำหรับ Web App ที่ deploy แบบ "Anyone" ทำให้ fetch() ข้ามโดเมนจาก GitHub Pages อ่านผลลัพธ์ได้ */
function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** ตรวจสอบ APP_TOKEN (ถ้ามีการตั้งค่าไว้ใน Script properties) — ป้องกันคนแปลกหน้าเดา URL มายิง API เล่น */
function checkToken_(token) {
  var required = PropertiesService.getScriptProperties().getProperty(PROP_APP_TOKEN);
  if (!required) return true; // ไม่ได้ตั้งค่า token ไว้ = ไม่เช็ค (โหมดเปิดอิสระ)
  return token === required;
}

/**
 * GET — สำหรับ action ที่ "อ่านข้อมูลอย่างเดียว" ทั้งหมด เรียกผ่าน:
 * {API_URL}?action=ชื่อaction&param1=...&token=...
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || '';
  CURRENT_ACTOR_NAME_ = String(p.actor || '').trim();

  if (!checkToken_(p.token)) {
    return jsonOutput_(fail_('Unauthorized: token ไม่ถูกต้อง'));
  }

  var result;
  try {
    switch (action) {
      case '':
        result = ok_({ message: APP_TITLE + ' API พร้อมใช้งาน — ระบุ ?action=... เพื่อเรียกใช้งาน' });
        break;
      case 'checkSystemStatus': result = checkSystemStatus(); break;
      case 'getFormOptions': result = getFormOptions(); break;
      case 'listVehicles': result = listVehicles(); break;
      case 'getVehicleDetail': result = getVehicleDetail(p.vehicleId); break;
      case 'listInsuranceByVehicle': result = listInsuranceByVehicle(p.vehicleId); break;
      case 'listTaxByVehicle': result = listTaxByVehicle(p.vehicleId); break;
      case 'listCompulsoryByVehicle': result = listCompulsoryByVehicle(p.vehicleId); break;
      case 'listServiceByVehicle': result = listServiceByVehicle(p.vehicleId); break;
      case 'listExpensesByVehicle': result = listExpensesByVehicle(p.vehicleId); break;
      case 'listMotorcycles': result = listMotorcycles(); break;
      case 'listMotoInsurance': result = listMotoInsurance(p.motorcycleId); break;
      case 'listPackagingItems': result = listPackagingItems(); break;
      case 'getPackagingItemDetail': result = getPackagingItemDetail(p.itemId); break;
      case 'getDashboardSummary': result = getDashboardSummary(); break;
      case 'computeAlerts': result = computeAlerts(); break;
      default:
        result = fail_('ไม่รู้จัก action: ' + action);
    }
  } catch (err) {
    logError_(err);
    result = fail_(err && err.message ? err.message : String(err));
  }
  return jsonOutput_(result);
}

/**
 * POST — สำหรับ action ที่ "เขียน/แก้ไข/อัปโหลดไฟล์" ทั้งหมด
 * ฝั่ง frontend ต้องส่ง body เป็น JSON string ด้วย Content-Type: text/plain;charset=utf-8
 * (ไม่ใช่ application/json) เพื่อให้เบราว์เซอร์ไม่ยิง CORS preflight (Apps Script ไม่รองรับ doOptions
 * เต็มรูปแบบ) รูปแบบ body: { "action": "ชื่อaction", "token": "...", "payload": {...} }
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOutput_(fail_('รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง (ต้องเป็น JSON)'));
  }

  if (!checkToken_(body.token)) {
    return jsonOutput_(fail_('Unauthorized: token ไม่ถูกต้อง'));
  }
  CURRENT_ACTOR_NAME_ = String(body.actor || '').trim();

  var action = body.action || '';
  var payload = body.payload || {};
  var result;
  try {
    switch (action) {
      case 'runSystemSetup': result = runSystemSetup(); break;
      case 'refreshAlertsSheet': result = refreshAlertsSheet(); break;

      case 'createVehicle': result = createVehicle(payload); break;
      case 'updateVehicle': result = updateVehicle(payload.vehicleId, payload.data); break;
      case 'uploadVehiclePhoto': result = uploadVehiclePhoto(payload.vehicleId, payload.fileData); break;

      case 'createInsurance': result = createInsurance(payload); break;
      case 'updateInsurance': result = updateInsurance(payload.insuranceId, payload.data); break;
      case 'uploadInsuranceFile': result = uploadInsuranceFile(payload.insuranceId, payload.fileKind, payload.fileData); break;

      case 'createTax': result = createTax(payload); break;
      case 'updateTax': result = updateTax(payload.taxId, payload.data); break;
      case 'uploadTaxFile': result = uploadTaxFile(payload.taxId, payload.fileData); break;

      case 'createCompulsory': result = createCompulsory(payload); break;
      case 'updateCompulsory': result = updateCompulsory(payload.compulsoryId, payload.data); break;
      case 'uploadCompulsoryFile': result = uploadCompulsoryFile(payload.compulsoryId, payload.fileData); break;

      case 'createServiceRecord': result = createServiceRecord(payload); break;
      case 'updateServiceRecord': result = updateServiceRecord(payload.serviceId, payload.data); break;
      case 'uploadServiceFile': result = uploadServiceFile(payload.serviceId, payload.fileKind, payload.fileData); break;

      case 'createExpense': result = createExpense(payload); break;
      case 'updateExpense': result = updateExpense(payload.expenseId, payload.data); break;
      case 'deleteExpense': result = deleteExpense(payload.expenseId); break;
      case 'uploadExpenseFile': result = uploadExpenseFile(payload.expenseId, payload.fileData); break;

      case 'createMotorcycle': result = createMotorcycle(payload); break;
      case 'updateMotorcycle': result = updateMotorcycle(payload.motorcycleId, payload.data); break;
      case 'createMotoInsurance': result = createMotoInsurance(payload); break;
      case 'updateMotoInsurance': result = updateMotoInsurance(payload.motoInsuranceId, payload.data); break;
      case 'uploadMotoInsuranceFile': result = uploadMotoInsuranceFile(payload.motoInsuranceId, payload.fileData); break;

      case 'createPackagingItem': result = createPackagingItem(payload); break;
      case 'updatePackagingItem': result = updatePackagingItem(payload.itemId, payload.data); break;
      case 'deletePackagingItem': result = deletePackagingItem(payload.itemId); break;
      case 'uploadPackagingItemImage': result = uploadPackagingItemImage(payload.itemId, payload.fileData); break;
      case 'createPackagingOrder': result = createPackagingOrder(payload); break;
      case 'updatePackagingOrder': result = updatePackagingOrder(payload.orderId, payload.data); break;
      case 'deletePackagingOrder': result = deletePackagingOrder(payload.orderId); break;
      case 'uploadPackagingBillFile': result = uploadPackagingBillFile(payload.orderId, payload.fileData); break;

      default:
        result = fail_('ไม่รู้จัก action: ' + action);
    }
  } catch (err) {
    logError_(err);
    result = fail_(err && err.message ? err.message : String(err));
  }
  return jsonOutput_(result);
}

/** เผื่อบางเบราว์เซอร์/ไลบรารียิง preflight OPTIONS มาจริง ๆ — ตอบ 200 ว่าง ๆ กลับไปเฉย ๆ */
function doOptions(e) {
  return jsonOutput_(ok_({}));
}

/**
 * เรียกจากหน้าเว็บตอนโหลดแอปครั้งแรก — ตรวจสอบว่าตั้งค่าระบบไว้แล้วหรือยัง
 * ถ้ายังไม่ได้ตั้งค่า SPREADSHEET_ID จะคืนค่า configured:false เพื่อให้หน้าเว็บแสดงคำแนะนำการติดตั้ง
 */
function checkSystemStatus() {
  var props = PropertiesService.getScriptProperties();
  var configured = !!props.getProperty(PROP_SPREADSHEET_ID);
  return ok_({
    configured: configured,
    appTitle: APP_TITLE,
    userEmail: getActiveUserEmail_()
  });
}
