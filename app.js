/* ===========================================================================
   app.js — Back Office Management System (Static Frontend)
   Frontend ล้วน ๆ ไม่มี server-side templating ใด ๆ — คุยกับ backend (Google Apps Script
   Web App) ผ่าน fetch() เท่านั้น ตามมาตรฐานสถาปัตยกรรมที่กำหนด (ดู README.md)

   สารบัญ:
     1. เลเยอร์เรียก API (fetch แทน google.script.run) + บีบอัดรูปก่อนอัปโหลด
     2. Router หลัก + หน้าตั้งค่าระบบ
     3. หน้า Dashboard
     4. หน้ารถทั้งหมด
     5. หน้ารายละเอียดรถ
     6. หน้าประกันรถมอไซ
     7. ฟอร์ม เพิ่ม/แก้ไข/อัปโหลดไฟล์
   =========================================================================== */


/* --------------------------------------------------------------------
   1) เลเยอร์เรียก API
   -------------------------------------------------------------------- */

/** อ่านผล fetch() แล้วแปลงเป็น data หรือ throw Error ตามรูปแบบ {success,data|error} ที่ backend ส่งมา */
function handleApiResponse_(res) {
  if (!res.ok) throw new Error('เครือข่ายมีปัญหา (HTTP ' + res.status + ')');
  return res.json().then(function (json) {
    if (json && json.success) return json.data;
    throw new Error((json && json.error) || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
  });
}

/* ---------------- ชื่อผู้ใช้งาน (สำหรับบันทึกลงประวัติ/log เท่านั้น ไม่ใช่ระบบ login) ----------------
   Apps Script Web App ที่ deploy แบบ "Anyone" (จำเป็นเพื่อให้ GitHub Pages เรียกข้ามโดเมนได้) จะไม่มีทาง
   รู้อีเมลผู้ใช้งานจริงเลย (Session.getActiveUser() คืนค่าว่างเสมอสำหรับผู้เข้าชมแบบไม่ login) จึงให้ผู้ใช้
   ตั้ง "ชื่อที่ใช้แสดง" กันเองต่อเครื่อง/เบราว์เซอร์ (ตั้งได้ที่หน้า ⚙️ ตั้งค่าระบบ) เก็บไว้ใน localStorage
   ของเบราว์เซอร์นั้น ๆ เท่านั้น — เป็นแค่ค่ากำหนดของผู้ใช้ ไม่ใช่ข้อมูลธุรกิจ จึงเก็บใน localStorage ได้ตาม
   มาตรฐานที่กำหนด แล้วส่งชื่อนี้แนบไปกับทุก action เพื่อให้ backend บันทึกลง SystemLog/ประวัติอัปโหลดแทน */
var ACTOR_NAME_KEY = 'boms_actor_name';
function getActorName_() {
  try { return localStorage.getItem(ACTOR_NAME_KEY) || ''; } catch (e) { return ''; }
}
function setActorName_(name) {
  try { localStorage.setItem(ACTOR_NAME_KEY, name || ''); } catch (e) { /* ignore เช่น private mode */ }
}

/** เรียก action แบบอ่านอย่างเดียวผ่าน GET — params เป็น object ของ query string เพิ่มเติม */
function apiGetRaw_(action, params) {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('http') !== 0) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js กรุณาแก้ไขไฟล์ config.js ก่อนใช้งาน'));
  }
  var url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  if (CONFIG.APP_TOKEN) url.searchParams.set('token', CONFIG.APP_TOKEN);
  if (getActorName_()) url.searchParams.set('actor', getActorName_());
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k]);
  });
  return fetch(url.toString(), { method: 'GET' }).then(handleApiResponse_);
}

/**
 * เรียก action แบบเขียน/แก้ไข/อัปโหลดผ่าน POST
 * ใช้ Content-Type: text/plain โดยตั้งใจ (ไม่ใช่ application/json) เพื่อให้เบราว์เซอร์ไม่ยิง
 * CORS preflight (OPTIONS) เพราะ Apps Script Web App ไม่รองรับ preflight เต็มรูปแบบ — เป็นวิธี
 * มาตรฐานที่ใช้กันทั่วไปเวลาเรียก Apps Script จากโดเมนอื่น (เช่น GitHub Pages)
 */
function apiPostRaw_(action, payload) {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('http') !== 0) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js กรุณาแก้ไขไฟล์ config.js ก่อนใช้งาน'));
  }
  return fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, token: CONFIG.APP_TOKEN || '', actor: getActorName_(), payload: payload || {} })
  }).then(handleApiResponse_);
}

/** ครอบ apiGetRaw_/apiPostRaw_ ให้แสดง loading overlay + toast ข้อผิดพลาดอัตโนมัติเสมอ */
function apiGet(action, params) {
  showLoading(true);
  return apiGetRaw_(action, params)
    .then(function (data) { showLoading(false); return data; })
    .catch(function (err) { showLoading(false); showToast(err.message || 'เกิดข้อผิดพลาด', 'error'); throw err; });
}
function apiPost(action, payload) {
  showLoading(true);
  return apiPostRaw_(action, payload)
    .then(function (data) { showLoading(false); return data; })
    .catch(function (err) { showLoading(false); showToast(err.message || 'เกิดข้อผิดพลาด', 'error'); throw err; });
}

/* ---------------- วันที่ / เวลา / ตัวเลข (ฝั่ง client) ---------------- */

/** แปลง ISO string หรือ Date จาก server ให้เป็น วัน-เดือน-ปี (ค.ศ.) เช่น 25-08-2026 */
function fmtDate(value) {
  if (!value) return '-';
  var d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  var dd = ('0' + d.getDate()).slice(-2);
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var yyyy = d.getFullYear();
  return dd + '-' + mm + '-' + yyyy;
}

/** แปลงเป็นวันที่ + เวลาไทย เช่น 25-08-2026 14:35 */
function fmtDateTime(value) {
  if (!value) return '-';
  var d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  var datePart = fmtDate(value);
  var timeStr = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok'
  }).format(d);
  return datePart + ' ' + timeStr + ' น.';
}

/** แปลง Date เป็นค่าที่ใช้กับ <input type="date"> คือ yyyy-MM-dd (อิงปี ค.ศ.) */
function toDateInputValue(value) {
  if (!value) return '';
  var d = new Date(value);
  if (isNaN(d.getTime())) return '';
  var yyyy = d.getFullYear();
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return yyyy + '-' + mm + '-' + dd;
}

/** ตัวเลขค่าใช้จ่ายแบบมีคอมมาคั่นหลักพัน เช่น 18,500 หรือ 18,500.50 */
function fmtCurrency(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '-';
  var n = Number(value);
  if (isNaN(n)) return '-';
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' บาท';
}

function fmtNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '-';
  var n = Number(value);
  if (isNaN(n)) return '-';
  return n.toLocaleString('th-TH');
}

function esc(s) {
  if (s === null || typeof s === 'undefined') return '';
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** badge ระดับความสำคัญของรายการแจ้งเตือน */
function severityBadge(severity) {
  var cls = severity === 'วิกฤต' ? 'crit' : (severity === 'เฝ้าระวัง' ? 'warn' : 'normal');
  return '<span class="badge ' + cls + '">' + esc(severity) + '</span>';
}

/* ---------------- Toast / Loading ---------------- */

function showToast(message, type) {
  var root = document.getElementById('toast-root');
  var el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(function () { el.remove(); }, 3800);
}

function showLoading(show) {
  var existing = document.getElementById('global-loading');
  if (show) {
    if (existing) return;
    var el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  } else if (existing) {
    existing.remove();
  }
}

/* ---------------- ไฟล์แนบ + บีบอัดรูปก่อนอัปโหลด ---------------- */

// ไฟล์รูปที่ใหญ่กว่านี้ (ไบต์) จะถูกบีบอัด/ย่อขนาดก่อนอัปโหลดเสมอ ไฟล์เล็กกว่านี้ส่งตรง ๆ ไม่บีบ (กันภาพเบลอ)
var IMAGE_COMPRESS_THRESHOLD_BYTES = 300 * 1024;
var IMAGE_MAX_DIMENSION = 1600;
var IMAGE_JPEG_QUALITY = 0.82;

/** อ่านไฟล์จาก <input type="file"> เป็น {base64, mimeType, fileName} เพื่อส่งขึ้น server
 *  ถ้าเป็นรูปภาพและไฟล์ใหญ่ จะย่อขนาด/บีบอัดเป็น JPEG ก่อนโดยอัตโนมัติ เพื่อให้อัปโหลดเร็วขึ้นบนมือถือ */
function readFileAsPayload(file) {
  var isImage = file.type && file.type.indexOf('image/') === 0;
  if (isImage && file.size > IMAGE_COMPRESS_THRESHOLD_BYTES) {
    return compressImagePayload_(file).catch(function () {
      // บีบอัดไม่สำเร็จ (เช่นเบราว์เซอร์เก่า) — ส่งไฟล์ต้นฉบับแทนดีกว่าอัปโหลดไม่ได้เลย
      return readFileRaw_(file);
    });
  }
  return readFileRaw_(file);
}

function readFileRaw_(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      resolve({ base64: reader.result, mimeType: file.type, fileName: file.name });
    };
    reader.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
    reader.readAsDataURL(file);
  });
}

function compressImagePayload_(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var width = img.width, height = img.height;
        if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
          if (width > height) { height = Math.round(height * IMAGE_MAX_DIMENSION / width); width = IMAGE_MAX_DIMENSION; }
          else { width = Math.round(width * IMAGE_MAX_DIMENSION / height); height = IMAGE_MAX_DIMENSION; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('เบราว์เซอร์นี้ไม่รองรับการบีบอัดรูป')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        var base64 = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);
        resolve({
          base64: base64,
          mimeType: 'image/jpeg',
          fileName: String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg'
        });
      };
      img.onerror = function () { reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้')); };
      img.src = e.target.result;
    };
    reader.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
    reader.readAsDataURL(file);
  });
}


/* --------------------------------------------------------------------
   2) Router หลัก + หน้าตั้งค่าระบบ
   -------------------------------------------------------------------- */

var APP_STATE = {
  route: 'dashboard',
  params: {},
  formOptions: null
};

var ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboardPage },
  vehicles: { title: '🚗 รถทั้งหมด', render: renderVehicleListPage },
  vehicleDetail: { title: 'รายละเอียดรถ', render: renderVehicleDetailPage },
  motorcycles: { title: '🏍️ ประกันรถมอไซ', render: renderMotorcyclePage },
  settings: { title: '⚙️ ตั้งค่าระบบ', render: renderSettingsPage }
};

document.addEventListener('DOMContentLoaded', function () {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('http') !== 0) {
    renderApiUrlMissingScreen();
    return;
  }
  apiGetRaw_('checkSystemStatus').then(onSystemStatus).catch(onSystemStatusFail);
});

function renderApiUrlMissingScreen() {
  document.getElementById('setup-container').innerHTML =
    '<div class="setup-screen">' +
    '<h2>🚧 ยังไม่ได้ตั้งค่า config.js</h2>' +
    '<p>เปิดไฟล์ <code>config.js</code> แล้วใส่ URL ของ Web App ที่ deploy จาก Google Apps Script ' +
    'ลงในตัวแปร <code>API_URL</code> ก่อนใช้งาน (ดูขั้นตอนใน README.md)</p>' +
    '</div>';
}

function onSystemStatusFail(err) {
  document.getElementById('setup-container').innerHTML =
    '<div class="setup-screen"><h2>ไม่สามารถเชื่อมต่อระบบได้</h2><p>' + esc(err.message || String(err)) +
    '</p><p style="color:#5f6368;font-size:13px;">ตรวจสอบว่า deploy Apps Script เป็น Web App แบบ ' +
    '"Anyone" แล้ว และ API_URL ใน config.js ถูกต้อง</p></div>';
}

function onSystemStatus(data) {
  if (!data.configured) {
    renderSetupNeededScreen();
    return;
  }
  updateUserEmailDisplay_();
  document.getElementById('app-shell').style.display = 'flex';
  initNav();
  navigate('dashboard');
}

/** แสดงชื่อผู้ใช้งานที่มุมขวาบน — ใช้ชื่อที่ตั้งไว้เอง (หน้าตั้งค่าระบบ) ถ้ามี ไม่งั้นขึ้น "ไม่ทราบผู้ใช้" */
function updateUserEmailDisplay_() {
  document.getElementById('user-email').textContent = getActorName_() || 'ไม่ทราบผู้ใช้ (ยังไม่ได้ตั้งชื่อ)';
}

function renderSetupNeededScreen() {
  document.getElementById('setup-container').innerHTML =
    '<div class="setup-screen">' +
    '<h2>🚧 ยังไม่ได้ตั้งค่าระบบฝั่ง Apps Script</h2>' +
    '<p>ยังไม่ได้กำหนดค่า <code>SPREADSHEET_ID</code> ใน Script properties ของโปรเจกต์ Apps Script</p>' +
    '<ol>' +
    '<li>เปิด Apps Script editor ของโปรเจกต์นี้</li>' +
    '<li>เปิดไฟล์ <code>Code.gs</code> แล้วเลือกฟังก์ชัน <code>setupWizard</code> จากแถบด้านบน</li>' +
    '<li>กด ▶ Run (ระบบจะสร้าง Spreadsheet ใหม่ให้อัตโนมัติ พร้อมชีตและโฟลเดอร์ Drive ครบทุกส่วน)</li>' +
    '<li>รีเฟรชหน้านี้อีกครั้ง</li>' +
    '</ol>' +
    '<p style="color:#5f6368;font-size:13px;">ดูรายละเอียดเพิ่มเติมในไฟล์ README.md ของโปรเจกต์</p>' +
    '</div>';
}

function initNav() {
  var items = document.querySelectorAll('#sidebar .nav-item');
  items.forEach(function (el) {
    el.addEventListener('click', function () {
      navigate(el.getAttribute('data-route'));
    });
  });
}

function setActiveNav(route) {
  var items = document.querySelectorAll('#sidebar .nav-item');
  items.forEach(function (el) {
    el.classList.toggle('active', el.getAttribute('data-route') === route ||
      (route === 'vehicleDetail' && el.getAttribute('data-route') === 'vehicles'));
  });
}

function navigate(route, params) {
  APP_STATE.route = route;
  APP_STATE.params = params || {};
  setActiveNav(route);
  var r = ROUTES[route];
  document.getElementById('page-title').textContent = r ? r.title : '';
  var content = document.getElementById('content');
  content.innerHTML = '';
  if (r) r.render(content, APP_STATE.params);
  window.scrollTo(0, 0);
}

/** โหลดตัวเลือกฟอร์ม (dropdown) ครั้งเดียวแล้วแคชไว้ */
function getFormOptionsCached() {
  if (APP_STATE.formOptions) return Promise.resolve(APP_STATE.formOptions);
  return apiGet('getFormOptions').then(function (opts) {
    APP_STATE.formOptions = opts;
    return opts;
  });
}

function renderSettingsPage(container) {
  container.innerHTML =
    '<div class="panel">' +
    '<h3>👤 ชื่อผู้ใช้งาน (เครื่องนี้)</h3>' +
    '<p>ระบบไม่มี login แยกรายคน — ตั้งชื่อที่อยากให้แสดงในประวัติแก้ไข/อัปโหลดไว้ที่นี่ ' +
    '(บันทึกไว้เฉพาะเบราว์เซอร์เครื่องนี้ ถ้าเปลี่ยนเครื่อง/เบราว์เซอร์ต้องตั้งใหม่)</p>' +
    '<div class="form-grid"><div class="form-field"><label>ชื่อผู้ใช้งาน</label>' +
    '<input type="text" id="input-actor-name" placeholder="เช่น น้องวิน, พี่ทรอย" value="' + esc(getActorName_()) + '"></div></div>' +
    '<button class="btn small" id="btn-save-actor-name" style="margin-top:8px;">💾 บันทึกชื่อ</button>' +
    '</div>' +
    '<div class="panel">' +
    '<h3>⚙️ ตั้งค่าระบบ</h3>' +
    '<p>ระบบจะตรวจสอบและสร้างชีตข้อมูล รวมถึงโครงสร้างโฟลเดอร์ Google Drive ให้ครบถ้วนอัตโนมัติ ' +
    'สามารถกดปุ่มด้านล่างได้ทุกเมื่อเพื่อซ่อมแซม/เติมชีตหรือโฟลเดอร์ที่ขาดหายไป โดยไม่กระทบข้อมูลเดิม</p>' +
    '<button class="btn" id="btn-run-setup">🔧 ตรวจสอบ/สร้างโครงสร้างข้อมูลใหม่</button>' +
    '<div id="setup-result" style="margin-top:14px;"></div>' +
    '</div>' +
    '<div class="panel">' +
    '<h3>🔔 รีเฟรชแคชรายการแจ้งเตือน (VehicleAlerts)</h3>' +
    '<p>Dashboard จะคำนวณรายการแจ้งเตือนแบบสดทุกครั้งอยู่แล้ว ปุ่มนี้ใช้บันทึกสำเนารายการแจ้งเตือนล่าสุดลงชีต ' +
    '<code>VehicleAlerts</code> เผื่อใช้เชื่อมกับระบบอื่น เช่น Google Data Studio</p>' +
    '<button class="btn secondary" id="btn-refresh-alerts">🔄 รีเฟรชชีต VehicleAlerts</button>' +
    '<div id="alerts-result" style="margin-top:14px;"></div>' +
    '</div>';

  document.getElementById('btn-save-actor-name').addEventListener('click', function () {
    var name = document.getElementById('input-actor-name').value.trim();
    setActorName_(name);
    updateUserEmailDisplay_();
    showToast(name ? 'บันทึกชื่อ "' + name + '" เรียบร้อยแล้ว' : 'ล้างชื่อผู้ใช้งานแล้ว', 'success');
  });

  document.getElementById('btn-run-setup').addEventListener('click', function () {
    apiPost('runSystemSetup').then(function (res) {
      document.getElementById('setup-result').innerHTML = '<span style="color:#188038;">✅ ' + esc(res.message) + '</span>';
      showToast('ตรวจสอบ/สร้างโครงสร้างข้อมูลเรียบร้อยแล้ว', 'success');
    }).catch(function () {});
  });

  document.getElementById('btn-refresh-alerts').addEventListener('click', function () {
    apiPost('refreshAlertsSheet').then(function (res) {
      document.getElementById('alerts-result').innerHTML =
        '<span style="color:#188038;">✅ บันทึกรายการแจ้งเตือน ' + res.count + ' รายการแล้ว</span>';
      showToast('รีเฟรชรายการแจ้งเตือนแล้ว', 'success');
    }).catch(function () {});
  });
}


/* --------------------------------------------------------------------
   3) หน้า Dashboard
   -------------------------------------------------------------------- */

function renderDashboardPage(container) {
  container.innerHTML = '<div class="empty-state">กำลังโหลดข้อมูล...</div>';
  apiGet('getDashboardSummary').then(function (d) {
    var s = d.statusCounts || {};
    var a = d.alertCounts || {};

    var statCards = [
      { emoji: '🚗', num: d.totalVehicles, label: 'รถทั้งหมด (คัน)' },
      { emoji: '🟢', num: s['ใช้งาน'] || 0, label: 'ใช้งาน' },
      { emoji: '🔧', num: s['ซ่อม'] || 0, label: 'ซ่อม/อยู่ระหว่างซ่อม' },
      { emoji: '⚪', num: s['จำหน่าย'] || 0, label: 'จำหน่ายแล้ว' },
      { emoji: '🛡️', num: a.insurance || 0, label: 'ประกันใกล้หมด' },
      { emoji: '🌵', num: a.tax || 0, label: 'ภาษีใกล้หมด' },
      { emoji: '🌴', num: a.compulsory || 0, label: 'พ.ร.บ. ใกล้หมด' },
      { emoji: '🔧', num: a.service || 0, label: 'ถึงกำหนดเช็คระยะ' },
      { emoji: '🏍️', num: d.totalMotorcycles, label: 'รถมอไซทั้งหมด (คัน)' },
      { emoji: '🏍️', num: a.motoInsurance || 0, label: 'ประกันมอไซใกล้หมด' }
    ];

    var statsHtml = statCards.map(function (c) {
      return '<div class="stat-card"><div class="emoji">' + c.emoji + '</div>' +
        '<div class="stat-num">' + c.num + '</div><div class="stat-label">' + esc(c.label) + '</div></div>';
    }).join('');

    var actionsHtml;
    if (!d.actionItems || !d.actionItems.length) {
      actionsHtml = '<div class="empty-state">🎉 ไม่มีรายการที่ต้องดำเนินการในตอนนี้</div>';
    } else {
      actionsHtml = d.actionItems.map(function (a) {
        var dayText = a.daysLeft < 0
          ? ('เลยกำหนดแล้ว ' + Math.abs(a.daysLeft) + ' วัน')
          : ('เหลืออีก ' + a.daysLeft + ' วัน');
        return '<div class="action-item">' +
          '<div class="icon">' + (a.icon || '⚠️') + '</div>' +
          '<div class="msg"><span class="veh">' + esc(a.vehicleLabel) + '</span> — ' + esc(a.alertType) +
          ' (' + esc(a.dueDateLabel || '') + ') ' + esc(dayText) + '</div>' +
          severityBadge(a.severity) +
          '</div>';
      }).join('');
    }

    container.innerHTML =
      '<div class="stat-grid">' + statsHtml + '</div>' +
      '<div class="panel"><h3>⚠️ รายการที่ต้องดำเนินการ</h3>' + actionsHtml + '</div>' +
      '<div style="font-size:12px;color:#9aa3ad;text-align:right;">อัปเดตล่าสุด: ' + esc(d.generatedAtLabel) + '</div>';
  }).catch(function () {
    container.innerHTML = '<div class="empty-state">ไม่สามารถโหลดข้อมูล Dashboard ได้</div>';
  });
}


/* --------------------------------------------------------------------
   4) หน้ารถทั้งหมด (การ์ดรถ ใหญ่ ซ้าย-ขวา)
   -------------------------------------------------------------------- */

function renderVehicleListPage(container) {
  container.innerHTML =
    '<div class="toolbar"><div></div><button class="btn" id="btn-add-vehicle">➕ เพิ่มรถใหม่</button></div>' +
    '<div id="vehicle-grid" class="vehicle-grid"><div class="empty-state">กำลังโหลดข้อมูล...</div></div>';

  document.getElementById('btn-add-vehicle').addEventListener('click', function () {
    openVehicleFormModal(null, function () { renderVehicleListPage(container); });
  });

  apiGet('listVehicles').then(function (cards) {
    var grid = document.getElementById('vehicle-grid');
    if (!cards.length) {
      grid.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลรถ กด "เพิ่มรถใหม่" เพื่อเริ่มต้น</div>';
      return;
    }
    grid.innerHTML = cards.map(renderVehicleCard).join('');
    cards.forEach(function (c) {
      var el = document.getElementById('card-view-' + c.vehicle.vehicleId);
      if (el) el.addEventListener('click', function () {
        navigate('vehicleDetail', { vehicleId: c.vehicle.vehicleId });
      });
    });
  }).catch(function () {
    document.getElementById('vehicle-grid').innerHTML = '<div class="empty-state">ไม่สามารถโหลดข้อมูลรถได้</div>';
  });
}

function docSummaryRow(emoji, label, doc) {
  var year = doc ? doc.year : new Date().getFullYear();
  var fileHtml = (doc && doc.fileUrl)
    ? '<a href="' + esc(doc.fileUrl) + '" target="_blank" rel="noopener">📎 เปิดไฟล์</a>'
    : '<span style="color:#9aa3ad;">ยังไม่มีไฟล์</span>';
  var nextDate = (doc && doc.nextRenewalDateLabel) ? doc.nextRenewalDateLabel : '-';
  return '<div class="doc-row">' +
    '<span class="label">' + emoji + label + ' ปี ' + year + '</span>' +
    '<span>' + fileHtml + '</span>' +
    '<span class="meta">ต่อครั้งถัดไป: ' + esc(nextDate) + '</span>' +
    '</div>';
}

function renderVehicleCard(c) {
  var v = c.vehicle;
  var photo = v.mainPhotoUrl
    ? '<img src="' + esc(v.mainPhotoUrl) + '" alt="' + esc(v.plateNumber) + '">'
    : '<div class="no-photo">🚗</div>';

  return '<div class="vehicle-card">' +
    '<div class="photo-wrap" id="card-view-' + v.vehicleId + '" style="cursor:pointer;">' +
    photo +
    '<span class="status-chip status-' + esc(v.status || 'ใช้งาน') + '">' + esc(v.status || 'ใช้งาน') + '</span>' +
    '</div>' +
    '<div class="body">' +
    '<div class="title">🚗 ' + esc(v.brand) + ' ' + esc(v.model) + '</div>' +
    '<div class="subtitle">ทะเบียน ' + esc(v.plateNumber) + ' &nbsp;|&nbsp; ผู้รับผิดชอบ: ' + esc(v.responsiblePerson || '-') + '</div>' +
    '<div class="doc-summary">' +
    docSummaryRow('🍀', 'ประกันรถ', c.currentInsurance) +
    docSummaryRow('🌴', 'พ.ร.บ.', c.currentCompulsory) +
    docSummaryRow('🌵', 'ภาษี', c.currentTax) +
    '</div>' +
    '<div class="card-footer">' +
    '<button class="btn secondary small" onclick="navigate(\'vehicleDetail\',{vehicleId:\'' + v.vehicleId + '\'})">ดูรายละเอียด</button>' +
    '</div>' +
    '</div>' +
    '</div>';
}


/* --------------------------------------------------------------------
   5) หน้ารายละเอียดรถ (แบบ Tab)
   -------------------------------------------------------------------- */

var DETAIL_STATE = { vehicleId: null, data: null, activeTab: 'info', container: null };

var DETAIL_TABS = [
  { key: 'info', label: 'ข้อมูลรถ' },
  { key: 'insurance', label: 'ประกัน' },
  { key: 'taxcompulsory', label: 'ภาษี/พ.ร.บ.' },
  { key: 'service', label: 'เช็คระยะ' },
  { key: 'expenses', label: 'ค่าใช้จ่าย' },
  { key: 'documents', label: 'เอกสาร' }
];

function renderVehicleDetailPage(container, params) {
  if (!params || !params.vehicleId) {
    container.innerHTML = '<div class="empty-state">ไม่พบรถที่ต้องการดู</div>';
    return;
  }
  DETAIL_STATE.vehicleId = params.vehicleId;
  DETAIL_STATE.activeTab = 'info';
  DETAIL_STATE.container = container;
  container.innerHTML = '<div class="empty-state">กำลังโหลดข้อมูล...</div>';
  loadVehicleDetail();
}

function loadVehicleDetail() {
  apiGet('getVehicleDetail', { vehicleId: DETAIL_STATE.vehicleId }).then(function (data) {
    DETAIL_STATE.data = data;
    drawVehicleDetail();
  }).catch(function () {
    DETAIL_STATE.container.innerHTML = '<div class="empty-state">ไม่พบข้อมูลรถ</div>';
  });
}

function drawVehicleDetail() {
  var d = DETAIL_STATE.data;
  var v = d.vehicle;
  var container = DETAIL_STATE.container;

  var photo = v.mainPhotoUrl ? '<img class="avatar" src="' + esc(v.mainPhotoUrl) + '">' :
    '<div class="avatar" style="display:flex;align-items:center;justify-content:center;font-size:44px;">🚗</div>';

  var kv = function (k, val) { return '<div class="kv"><div class="k">' + esc(k) + '</div><div class="v">' + esc(val || '-') + '</div></div>'; };

  container.innerHTML =
    '<div class="toolbar">' +
    '<button class="btn ghost small" onclick="navigate(\'vehicles\')">← กลับหน้ารถทั้งหมด</button>' +
    '<div></div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="detail-header">' +
    '<div>' + photo +
    '<div style="margin-top:8px;"><label class="btn secondary small" style="cursor:pointer;">📷 เปลี่ยนรูปรถ' +
    '<input type="file" accept="image/*" style="display:none;" onchange="handleMainPhotoUpload(this)"></label></div>' +
    '</div>' +
    '<div class="info" style="flex:1;min-width:260px;">' +
    '<h2>🚗 ' + esc(v.brand) + ' ' + esc(v.model) + ' <span class="status-chip status-' + esc(v.status) + '" style="position:static;display:inline-block;">' + esc(v.status) + '</span></h2>' +
    '<div class="subtitle">ทะเบียน ' + esc(v.plateNumber) + '</div>' +
    '<div class="kv-grid">' +
    kv('รหัสรถ', v.vehicleId) + kv('ปีรถ', v.year) + kv('สี', v.color) +
    kv('เลขตัวถัง', v.chassisNo) + kv('เลขเครื่อง', v.engineNo) +
    kv('ผู้รับผิดชอบรถ', v.responsiblePerson) + kv('แผนก', v.department) + kv('หมายเหตุ', v.notes) +
    '</div>' +
    '<div style="margin-top:12px;"><button class="btn secondary small" id="btn-edit-vehicle">✏️ แก้ไขข้อมูลรถ</button></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="tabs" id="detail-tabs"></div>' +
    '<div id="tab-content"></div>';

  document.getElementById('btn-edit-vehicle').addEventListener('click', function () {
    openVehicleFormModal(v, function () { loadVehicleDetail(); });
  });

  var tabsEl = document.getElementById('detail-tabs');
  tabsEl.innerHTML = DETAIL_TABS.map(function (t) {
    return '<button class="tab-btn' + (t.key === DETAIL_STATE.activeTab ? ' active' : '') + '" data-tab="' + t.key + '">' + esc(t.label) + '</button>';
  }).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      DETAIL_STATE.activeTab = btn.getAttribute('data-tab');
      tabsEl.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderActiveTab();
    });
  });

  renderActiveTab();
}

function handleMainPhotoUpload(input) {
  var file = input.files[0];
  if (!file) return;
  readFileAsPayload(file).then(function (payload) {
    return apiPost('uploadVehiclePhoto', { vehicleId: DETAIL_STATE.vehicleId, fileData: payload });
  }).then(function () {
    showToast('อัปโหลดรูปรถเรียบร้อยแล้ว', 'success');
    loadVehicleDetail();
  }).catch(function () {});
}

function renderActiveTab() {
  var mount = document.getElementById('tab-content');
  var d = DETAIL_STATE.data;
  switch (DETAIL_STATE.activeTab) {
    case 'info': mount.innerHTML = renderInfoTab_(d); break;
    case 'insurance': mount.innerHTML = renderInsuranceTab_(d); bindInsuranceTabEvents_(); break;
    case 'taxcompulsory': mount.innerHTML = renderTaxCompulsoryTab_(d); bindTaxCompulsoryTabEvents_(); break;
    case 'service': mount.innerHTML = renderServiceTab_(d); bindServiceTabEvents_(); break;
    case 'expenses': mount.innerHTML = renderExpensesTab_(d); bindExpensesTabEvents_(); break;
    case 'documents': mount.innerHTML = renderDocumentsTab_(d); break;
  }
}

function renderInfoTab_(d) {
  var v = d.vehicle;
  return '<div class="panel"><h3>ข้อมูลรถโดยละเอียด</h3>' +
    '<div class="kv-grid">' +
    '<div class="kv"><div class="k">รหัสโฟลเดอร์ไดรฟ์</div><div class="v">' + esc(v.driveFolderId || '-') + '</div></div>' +
    '<div class="kv"><div class="k">วันที่สร้างข้อมูล</div><div class="v">' + fmtDateTime(v.createdAt) + '</div></div>' +
    '<div class="kv"><div class="k">แก้ไขล่าสุด</div><div class="v">' + fmtDateTime(v.updatedAt) + '</div></div>' +
    '</div></div>';
}

/* ---------------- ประกัน ---------------- */
function renderInsuranceTab_(d) {
  var rows = d.insurance.map(function (r) {
    return '<div class="record-card">' +
      '<div class="rc-head"><span class="rc-title">' + esc(r.company || 'ไม่ระบุบริษัท') + ' — ' + esc(r.insuranceType || '') + '</span>' +
      recordExpiryBadge_(r.expiryDate) + '</div>' +
      '<div class="kv-grid">' +
      kvInline_('เลขกรมธรรม์', r.policyNo) + kvInline_('เริ่ม', fmtDate(r.startDate)) + kvInline_('หมด', fmtDate(r.expiryDate)) +
      kvInline_('ต่อครั้งถัดไป', fmtDate(r.nextRenewalDate)) + kvInline_('ทุนประกัน', fmtCurrency(r.sumInsured)) + kvInline_('เบี้ยประกัน', fmtCurrency(r.premium)) +
      '</div>' +
      '<div class="file-links">' +
      fileLinkOrUpload_(r.policyFileUrl, 'ดูกรมธรรม์', 'uploadInsuranceFile', { insuranceId: r.insuranceId, fileKind: 'policy' }) +
      fileLinkOrUpload_(r.receiptFileUrl, 'ดูใบเสร็จ', 'uploadInsuranceFile', { insuranceId: r.insuranceId, fileKind: 'receipt' }) +
      '<a href="#" onclick="openInsuranceFormModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไข</a>' +
      '</div></div>';
  }).join('') || '<div class="empty-state">ยังไม่มีข้อมูลประกันภัย</div>';

  return '<div class="toolbar"><div></div><button class="btn small" id="btn-add-insurance">➕ เพิ่มประกันภัย</button></div>' + rows;
}
function bindInsuranceTabEvents_() {
  var btn = document.getElementById('btn-add-insurance');
  if (btn) btn.addEventListener('click', function () { openInsuranceFormModal(null); });
}

/* ---------------- ภาษี / พ.ร.บ. ---------------- */
function renderTaxCompulsoryTab_(d) {
  var taxRows = d.tax.map(function (r) {
    return '<div class="record-card"><div class="rc-head"><span class="rc-title">🌵 ภาษี — เอกสารเลขที่ ' + esc(r.docNo || '-') + '</span>' +
      recordExpiryBadge_(r.expiryDate) + '</div>' +
      '<div class="kv-grid">' + kvInline_('ต่อล่าสุด', fmtDate(r.lastRenewalDate)) + kvInline_('วันหมดอายุ', fmtDate(r.expiryDate)) +
      kvInline_('ต่อครั้งถัดไป', fmtDate(r.nextRenewalDate)) + kvInline_('ค่าใช้จ่าย', fmtCurrency(r.cost)) + '</div>' +
      '<div class="file-links">' + fileLinkOrUpload_(r.fileUrl, 'ดูไฟล์เอกสาร', 'uploadTaxFile', { taxId: r.taxId }) +
      '<a href="#" onclick="openTaxFormModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไข</a></div></div>';
  }).join('') || '<div class="empty-state">ยังไม่มีข้อมูลภาษี</div>';

  var comRows = d.compulsory.map(function (r) {
    return '<div class="record-card"><div class="rc-head"><span class="rc-title">🌴 พ.ร.บ. — เอกสารเลขที่ ' + esc(r.docNo || '-') + '</span>' +
      recordExpiryBadge_(r.expiryDate) + '</div>' +
      '<div class="kv-grid">' + kvInline_('ต่อล่าสุด', fmtDate(r.lastRenewalDate)) + kvInline_('วันหมดอายุ', fmtDate(r.expiryDate)) +
      kvInline_('ต่อครั้งถัดไป', fmtDate(r.nextRenewalDate)) + kvInline_('ค่าใช้จ่าย', fmtCurrency(r.cost)) + '</div>' +
      '<div class="file-links">' + fileLinkOrUpload_(r.fileUrl, 'ดูไฟล์เอกสาร', 'uploadCompulsoryFile', { compulsoryId: r.compulsoryId }) +
      '<a href="#" onclick="openCompulsoryFormModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไข</a></div></div>';
  }).join('') || '<div class="empty-state">ยังไม่มีข้อมูล พ.ร.บ.</div>';

  return '<div class="panel"><div class="toolbar"><h3 style="margin:0;">🌵 ภาษี</h3><button class="btn small" id="btn-add-tax">➕ เพิ่มรายการภาษี</button></div>' + taxRows + '</div>' +
    '<div class="panel"><div class="toolbar"><h3 style="margin:0;">🌴 พ.ร.บ.</h3><button class="btn small" id="btn-add-compulsory">➕ เพิ่ม พ.ร.บ.</button></div>' + comRows + '</div>';
}
function bindTaxCompulsoryTabEvents_() {
  var b1 = document.getElementById('btn-add-tax'); if (b1) b1.addEventListener('click', function () { openTaxFormModal(null); });
  var b2 = document.getElementById('btn-add-compulsory'); if (b2) b2.addEventListener('click', function () { openCompulsoryFormModal(null); });
}

/* ---------------- เช็คระยะ (Timeline) ---------------- */
function renderServiceTab_(d) {
  var items = d.service.map(function (r) {
    var photos = '';
    if (r.photo1Url || r.photo2Url) {
      photos = '<div class="timeline-photos">' +
        (r.photo1Url ? '<a href="' + esc(r.photo1Url) + '" target="_blank"><img src="' + esc(r.photo1Url) + '"></a>' : '') +
        (r.photo2Url ? '<a href="' + esc(r.photo2Url) + '" target="_blank"><img src="' + esc(r.photo2Url) + '"></a>' : '') +
        '</div>';
    }
    return '<div class="timeline-item">' +
      '<div class="ti-date">' + fmtDate(r.serviceDate) + '</div>' +
      '<div class="ti-mileage">🚙 ' + fmtNumber(r.mileage) + ' กม. &nbsp;|&nbsp; 🏢 ' + esc(r.serviceCenter || '-') + ' &nbsp;|&nbsp; ' + esc(r.serviceType || '') + '</div>' +
      '<div>' + esc(r.itemsDone || '') + '</div>' +
      '<div style="margin-top:6px;">ค่าใช้จ่าย ' + fmtCurrency(r.cost) + '</div>' +
      '<div style="font-size:13px;color:#5f6368;margin-top:4px;">นัดครั้งถัดไป: ' + fmtDate(r.nextAppointmentDate) +
      (r.nextMileage ? (' &nbsp;|&nbsp; เลขไมล์ครั้งถัดไป: ' + fmtNumber(r.nextMileage) + ' กม.') : '') + '</div>' +
      '<div class="file-links">' + fileLinkOrUpload_(r.receiptFileUrl, 'ใบเสร็จ', 'uploadServiceFile', { serviceId: r.serviceId, fileKind: 'receipt' }) +
      fileLinkUpload_('รูปที่1', 'uploadServiceFile', { serviceId: r.serviceId, fileKind: 'photo1' }) +
      fileLinkUpload_('รูปที่2', 'uploadServiceFile', { serviceId: r.serviceId, fileKind: 'photo2' }) +
      '<a href="#" onclick="openServiceFormModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไข</a></div>' +
      photos +
      '</div>';
  }).join('') || '<div class="empty-state">ยังไม่มีประวัติเช็คระยะ</div>';

  return '<div class="toolbar"><div></div><button class="btn small" id="btn-add-service">➕ เพิ่มประวัติเช็คระยะ</button></div>' +
    '<div class="timeline">' + items + '</div>';
}
function bindServiceTabEvents_() {
  var btn = document.getElementById('btn-add-service');
  if (btn) btn.addEventListener('click', function () { openServiceFormModal(null); });
}

/* ---------------- ค่าใช้จ่าย ---------------- */
function renderExpensesTab_(d) {
  var totalCost = d.expenses.reduce(function (sum, r) { return sum + (Number(r.cost) || 0); }, 0);
  var rows = d.expenses.map(function (r) {
    return '<div class="record-card"><div class="rc-head"><span class="rc-title">' + esc(r.category || 'ค่าใช้จ่าย') + '</span>' +
      '<span style="font-weight:700;">' + fmtCurrency(r.cost) + '</span></div>' +
      '<div class="kv-grid">' + kvInline_('วันที่', fmtDate(r.expenseDate)) + kvInline_('รายละเอียด', r.description) + '</div>' +
      (r.notes ? '<div class="kv-grid">' + kvInline_('หมายเหตุ', r.notes) + '</div>' : '') +
      '<div class="file-links">' + fileLinkOrUpload_(r.fileUrl, 'ดูไฟล์แนบ', 'uploadExpenseFile', { expenseId: r.expenseId }) +
      '<a href="#" onclick="openExpenseFormModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไข</a>' +
      '<a href="#" style="color:#d93025;" onclick="deleteExpenseRecord_(' + JSON.stringify(r.expenseId) + ');return false;">🗑️ ลบ</a>' +
      '</div></div>';
  }).join('') || '<div class="empty-state">ยังไม่มีรายการค่าใช้จ่าย</div>';
  var summary = d.expenses.length
    ? '<div class="kv-grid" style="margin-bottom:10px;">' + kvInline_('รวมค่าใช้จ่ายทั้งหมด', fmtCurrency(totalCost)) + '</div>'
    : '';
  return '<div class="toolbar"><div></div><button class="btn small" id="btn-add-expense">➕ เพิ่มค่าใช้จ่าย</button></div>' + summary + rows;
}
function bindExpensesTabEvents_() {
  var btn = document.getElementById('btn-add-expense');
  if (btn) btn.addEventListener('click', function () { openExpenseFormModal(null); });
}

/** ลบรายการค่าใช้จ่าย — ยืนยันก่อนเสมอเพื่อกันลบพลาด (การลบเป็นการลบจริง กู้คืนไม่ได้) */
function deleteExpenseRecord_(expenseId) {
  if (!window.confirm('ยืนยันลบรายการค่าใช้จ่ายนี้? การลบไม่สามารถกู้คืนได้')) return;
  apiPost('deleteExpense', { expenseId: expenseId }).then(function () {
    showToast('ลบรายการเรียบร้อยแล้ว', 'success');
    loadVehicleDetail();
  }).catch(function () {});
}

/* ---------------- เอกสารทั้งหมด ---------------- */
function renderDocumentsTab_(d) {
  var rows = d.documents.map(function (r) {
    return '<div class="record-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div><b>' + esc(r.category) + '</b> — ' + esc(r.fileName) + '<div style="font-size:12px;color:#5f6368;">อัปโหลดเมื่อ ' + fmtDateTime(r.uploadedAt) + ' โดย ' + esc(r.uploadedBy) + '</div></div>' +
      '<a href="' + esc(r.fileUrl) + '" target="_blank" class="btn secondary small">เปิดไฟล์</a></div>';
  }).join('') || '<div class="empty-state">ยังไม่มีเอกสารที่อัปโหลด</div>';
  return '<div class="panel"><h3>📁 เอกสารทั้งหมดของรถคันนี้</h3>' + rows + '</div>';
}

/* ---------------- ตัวช่วยย่อย ---------------- */
function kvInline_(k, v) {
  return '<div class="kv"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v || '-') + '</div></div>';
}
function recordExpiryBadge_(expiryDate) {
  if (!expiryDate) return '';
  var days = Math.round((new Date(expiryDate) - new Date()) / 86400000);
  var severity = days <= 7 ? 'วิกฤต' : (days <= 30 ? 'เฝ้าระวัง' : 'ปกติ');
  return severityBadge(severity);
}
/** payloadBase = object ของ payload พื้นฐาน (ไม่รวม fileData) ที่จะส่งไปกับ action นั้น ๆ */
function fileLinkOrUpload_(url, label, actionName, payloadBase) {
  if (url) return '<a href="' + esc(url) + '" target="_blank" rel="noopener">📎 ' + esc(label) + '</a>' + fileLinkUpload_('เปลี่ยนไฟล์', actionName, payloadBase);
  return fileLinkUpload_('อัปโหลด' + label, actionName, payloadBase);
}
function fileLinkUpload_(label, actionName, payloadBase) {
  var inputId = 'up-' + Math.random().toString(36).slice(2);
  setTimeout(function () {
    var el = document.getElementById(inputId);
    if (el) el.addEventListener('change', function () {
      var file = el.files[0];
      if (!file) return;
      readFileAsPayload(file).then(function (fileData) {
        var payload = Object.assign({}, payloadBase, { fileData: fileData });
        return apiPost(actionName, payload);
      }).then(function () {
        showToast('อัปโหลดไฟล์เรียบร้อยแล้ว', 'success');
        loadVehicleDetail();
      }).catch(function () {});
    });
  }, 0);
  return '<label style="cursor:pointer;color:#1a73e8;">📤 ' + esc(label) +
    '<input type="file" id="' + inputId + '" style="display:none;"></label>';
}


/* --------------------------------------------------------------------
   6) หน้าประกันรถมอไซ
   เก็บเฉพาะข้อมูลจำเป็น + ประกันอุบัติเหตุ ไม่มีข้อมูลรถแบบเต็มเหมือนรถยนต์
   -------------------------------------------------------------------- */

function renderMotorcyclePage(container) {
  container.innerHTML =
    '<div class="toolbar"><div></div><button class="btn" id="btn-add-moto">➕ เพิ่มรถมอไซ</button></div>' +
    '<div id="moto-list"><div class="empty-state">กำลังโหลดข้อมูล...</div></div>';

  document.getElementById('btn-add-moto').addEventListener('click', function () {
    openMotorcycleFormModal(null, function () { renderMotorcyclePage(container); });
  });

  apiGet('listMotorcycles').then(function (items) {
    var mount = document.getElementById('moto-list');
    if (!items.length) {
      mount.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลรถมอไซ กด "เพิ่มรถมอไซ" เพื่อเริ่มต้น</div>';
      return;
    }
    mount.innerHTML = items.map(renderMotoCard_).join('');
    items.forEach(function (it) {
      bindMotoCardEvents_(it.motorcycle.motorcycleId);
    });
  }).catch(function () {
    document.getElementById('moto-list').innerHTML = '<div class="empty-state">ไม่สามารถโหลดข้อมูลได้</div>';
  });
}

function renderMotoCard_(item) {
  var m = item.motorcycle;
  var ins = item.currentInsurance;
  var lbl = item.currentInsuranceLabel;

  var insHtml;
  if (ins) {
    insHtml = '<div class="kv-grid">' +
      '<div class="kv"><div class="k">บริษัทประกัน</div><div class="v">' + esc(ins.company || '-') + '</div></div>' +
      '<div class="kv"><div class="k">เลขกรมธรรม์</div><div class="v">' + esc(ins.policyNo || '-') + '</div></div>' +
      '<div class="kv"><div class="k">ความคุ้มครอง</div><div class="v">' + esc(ins.coverageType || 'ประกันอุบัติเหตุ') + '</div></div>' +
      '<div class="kv"><div class="k">เบี้ยประกัน</div><div class="v">' + fmtCurrency(ins.premium) + '</div></div>' +
      '<div class="kv"><div class="k">วันหมดประกัน</div><div class="v">' + esc(lbl.expiryDateLabel) + '</div></div>' +
      '<div class="kv"><div class="k">ต่อครั้งถัดไป</div><div class="v">' + esc(lbl.nextRenewalDateLabel) + '</div></div>' +
      '</div>' +
      '<div class="file-links">' +
      fileLinkOrUpload_(ins.policyFileUrl, 'ดูกรมธรรม์', 'uploadMotoInsuranceFile', { motoInsuranceId: ins.motoInsuranceId }) +
      '<a href="#" onclick="openMotoInsuranceFormModal(\'' + m.motorcycleId + '\', ' + JSON.stringify(ins).replace(/"/g, '&quot;') + ');return false;">✏️ แก้ไขประกัน</a>' +
      '</div>';
  } else {
    insHtml = '<div class="empty-state">ยังไม่มีข้อมูลประกัน</div>';
  }

  return '<div class="panel">' +
    '<div class="rc-head">' +
    '<span class="rc-title">🏍️ ' + esc(m.label) + ' — ผู้ใช้งาน: ' + esc(m.responsiblePerson || '-') + '</span>' +
    (ins ? recordExpiryBadge_(ins.expiryDate) : '') +
    '</div>' +
    insHtml +
    '<div style="margin-top:10px;display:flex;gap:10px;">' +
    '<button class="btn secondary small" id="btn-add-moto-ins-' + m.motorcycleId + '">➕ เพิ่มประกันปีใหม่</button>' +
    '<button class="btn ghost small" id="btn-edit-moto-' + m.motorcycleId + '">✏️ แก้ไขข้อมูลรถมอไซ</button>' +
    '</div>' +
    '</div>';
}

function bindMotoCardEvents_(motorcycleId) {
  var addBtn = document.getElementById('btn-add-moto-ins-' + motorcycleId);
  if (addBtn) addBtn.addEventListener('click', function () { openMotoInsuranceFormModal(motorcycleId, null); });
  var editBtn = document.getElementById('btn-edit-moto-' + motorcycleId);
  if (editBtn) editBtn.addEventListener('click', function () {
    apiGet('listMotorcycles').then(function (items) {
      var found = items.find(function (it) { return it.motorcycle.motorcycleId === motorcycleId; });
      if (found) openMotorcycleFormModal(found.motorcycle);
    }).catch(function () {});
  });
}


/* --------------------------------------------------------------------
   7) ฟอร์ม เพิ่ม/แก้ไข/อัปโหลดไฟล์
   -------------------------------------------------------------------- */

/* ---------------- Modal กลาง ---------------- */

function closeModal() {
  var root = document.getElementById('modal-root');
  root.innerHTML = '';
}

/**
 * opts = { title, bodyHtml, saveLabel, onSave: function(values){ return Promise } }
 * values = object ของทุก input ที่มี attribute name ภายใน .modal-body
 * มีการปิดปุ่มบันทึกระหว่างรอผลลัพธ์เสมอ เพื่อกันผู้ใช้กดบันทึกซ้ำ/กดปุ่มรัว
 */
function openModal(opts) {
  var root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-backdrop" id="modal-backdrop">' +
    '<div class="modal">' +
    '<div class="modal-head"><h3>' + esc(opts.title) + '</h3><button class="modal-close" id="modal-close-btn">✕</button></div>' +
    '<div class="modal-body">' + opts.bodyHtml + '</div>' +
    '<div class="modal-foot">' +
    '<button class="btn ghost" id="modal-cancel-btn">ยกเลิก</button>' +
    '<button class="btn" id="modal-save-btn">' + esc(opts.saveLabel || 'บันทึก') + '</button>' +
    '</div></div></div>';

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', function (e) {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.getElementById('modal-save-btn').addEventListener('click', function () {
    var saveBtn = this;
    if (saveBtn.disabled) return; // กันกดซ้ำระหว่างกำลังบันทึก
    var values = collectFormValues_(root);
    if (opts.onSave) {
      saveBtn.disabled = true;
      opts.onSave(values).then(function () {
        closeModal();
        if (opts.onDone) opts.onDone();
      }).catch(function () {
        saveBtn.disabled = false; // apiPost แสดง toast ข้อผิดพลาดให้แล้ว — เปิดปุ่มให้กดใหม่ได้
      });
    }
  });
}

function collectFormValues_(root) {
  var values = {};
  root.querySelectorAll('[name]').forEach(function (el) {
    values[el.getAttribute('name')] = el.value;
  });
  return values;
}

function field_(opts) {
  // opts: {type,name,label,value,options,hint,full}
  var full = opts.full ? ' full' : '';
  var val = (opts.value === null || typeof opts.value === 'undefined') ? '' : opts.value;
  var inputHtml;
  if (opts.type === 'select') {
    inputHtml = '<select name="' + opts.name + '">' +
      (opts.options || []).map(function (o) {
        return '<option value="' + esc(o) + '"' + (String(o) === String(val) ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
  } else if (opts.type === 'textarea') {
    inputHtml = '<textarea name="' + opts.name + '">' + esc(val) + '</textarea>';
  } else if (opts.type === 'date') {
    inputHtml = '<input type="date" name="' + opts.name + '" value="' + esc(toDateInputValue(val)) + '">';
  } else {
    inputHtml = '<input type="' + (opts.type || 'text') + '" name="' + opts.name + '" value="' + esc(val) + '"' +
      (opts.type === 'number' ? ' step="any"' : '') + '>';
  }
  return '<div class="form-field' + full + '"><label>' + esc(opts.label) + '</label>' + inputHtml +
    (opts.hint ? '<div class="hint">' + esc(opts.hint) + '</div>' : '') + '</div>';
}

/* ---------------- ฟอร์มรถบริษัท ---------------- */

function openVehicleFormModal(vehicle, onDone) {
  getFormOptionsCached().then(function (opts) {
    var isEdit = !!vehicle;
    var v = vehicle || {};
    var body = '<div class="form-grid">' +
      field_({ name: 'plateNumber', label: 'ทะเบียน', value: v.plateNumber, full: true }) +
      field_({ name: 'brand', label: 'ยี่ห้อ', value: v.brand }) +
      field_({ name: 'model', label: 'รุ่น', value: v.model }) +
      field_({ name: 'year', label: 'ปีรถ (ค.ศ.)', type: 'number', value: v.year }) +
      field_({ name: 'color', label: 'สี', value: v.color }) +
      field_({ name: 'chassisNo', label: 'เลขตัวถัง', value: v.chassisNo }) +
      field_({ name: 'engineNo', label: 'เลขเครื่อง', value: v.engineNo }) +
      field_({ name: 'responsiblePerson', label: 'ผู้รับผิดชอบรถ', value: v.responsiblePerson }) +
      field_({ name: 'department', label: 'แผนก', type: 'select', value: v.department, options: opts.departments }) +
      field_({ name: 'status', label: 'สถานะรถ', type: 'select', value: v.status || 'ใช้งาน', options: opts.vehicleStatus }) +
      field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: v.notes, full: true }) +
      '</div>';

    openModal({
      title: isEdit ? '✏️ แก้ไขข้อมูลรถ' : '➕ เพิ่มรถใหม่',
      bodyHtml: body,
      onSave: function (values) {
        return isEdit
          ? apiPost('updateVehicle', { vehicleId: v.vehicleId, data: values })
          : apiPost('createVehicle', values);
      },
      onDone: onDone || function () { navigate('vehicles'); }
    });
  });
}

/* ---------------- ฟอร์มประกันภัยรถบริษัท ---------------- */

function openInsuranceFormModal(record) {
  getFormOptionsCached().then(function (opts) {
    var isEdit = !!record;
    var r = record || { vehicleId: DETAIL_STATE.vehicleId };
    var body = '<div class="form-grid">' +
      field_({ name: 'company', label: 'บริษัทประกัน', value: r.company, full: true }) +
      field_({ name: 'policyNo', label: 'เลขกรมธรรม์', value: r.policyNo }) +
      field_({ name: 'insuranceType', label: 'ประเภทประกัน', type: 'select', value: r.insuranceType, options: opts.insuranceTypes }) +
      field_({ name: 'startDate', label: 'วันที่เริ่มประกัน', type: 'date', value: r.startDate }) +
      field_({ name: 'expiryDate', label: 'วันหมดประกัน', type: 'date', value: r.expiryDate }) +
      field_({ name: 'nextRenewalDate', label: 'วันที่ต่อครั้งถัดไป', type: 'date', value: r.nextRenewalDate }) +
      field_({ name: 'sumInsured', label: 'ทุนประกัน (บาท)', type: 'number', value: r.sumInsured }) +
      field_({ name: 'premium', label: 'เบี้ยประกัน (บาท)', type: 'number', value: r.premium }) +
      field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
      '</div>';

    openModal({
      title: isEdit ? '✏️ แก้ไขประกันภัย' : '➕ เพิ่มประกันภัย',
      bodyHtml: body,
      onSave: function (values) {
        if (isEdit) return apiPost('updateInsurance', { insuranceId: r.insuranceId, data: values });
        values.vehicleId = r.vehicleId;
        return apiPost('createInsurance', values);
      },
      onDone: function () { loadVehicleDetail(); }
    });
  });
}

/* ---------------- ฟอร์มภาษี ---------------- */

function openTaxFormModal(record) {
  var isEdit = !!record;
  var r = record || { vehicleId: DETAIL_STATE.vehicleId };
  var body = '<div class="form-grid">' +
    field_({ name: 'lastRenewalDate', label: 'วันที่ต่อภาษีล่าสุด', type: 'date', value: r.lastRenewalDate }) +
    field_({ name: 'expiryDate', label: 'วันหมดอายุภาษี', type: 'date', value: r.expiryDate }) +
    field_({ name: 'nextRenewalDate', label: 'วันที่ต่อครั้งถัดไป', type: 'date', value: r.nextRenewalDate }) +
    field_({ name: 'docNo', label: 'เลขที่เอกสาร', value: r.docNo }) +
    field_({ name: 'cost', label: 'ค่าใช้จ่าย (บาท)', type: 'number', value: r.cost }) +
    field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
    '</div>';

  openModal({
    title: isEdit ? '✏️ แก้ไขภาษีรถ' : '➕ เพิ่มรายการภาษี',
    bodyHtml: body,
    onSave: function (values) {
      if (isEdit) return apiPost('updateTax', { taxId: r.taxId, data: values });
      values.vehicleId = r.vehicleId;
      return apiPost('createTax', values);
    },
    onDone: function () { loadVehicleDetail(); }
  });
}

/* ---------------- ฟอร์ม พ.ร.บ. ---------------- */

function openCompulsoryFormModal(record) {
  var isEdit = !!record;
  var r = record || { vehicleId: DETAIL_STATE.vehicleId };
  var body = '<div class="form-grid">' +
    field_({ name: 'lastRenewalDate', label: 'วันที่ต่อล่าสุด', type: 'date', value: r.lastRenewalDate }) +
    field_({ name: 'expiryDate', label: 'วันหมดอายุ', type: 'date', value: r.expiryDate }) +
    field_({ name: 'nextRenewalDate', label: 'วันที่ต่อครั้งถัดไป', type: 'date', value: r.nextRenewalDate }) +
    field_({ name: 'docNo', label: 'เลขที่เอกสาร', value: r.docNo }) +
    field_({ name: 'cost', label: 'ค่าใช้จ่าย (บาท)', type: 'number', value: r.cost }) +
    field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
    '</div>';

  openModal({
    title: isEdit ? '✏️ แก้ไข พ.ร.บ.' : '➕ เพิ่ม พ.ร.บ.',
    bodyHtml: body,
    onSave: function (values) {
      if (isEdit) return apiPost('updateCompulsory', { compulsoryId: r.compulsoryId, data: values });
      values.vehicleId = r.vehicleId;
      return apiPost('createCompulsory', values);
    },
    onDone: function () { loadVehicleDetail(); }
  });
}

/* ---------------- ฟอร์มเช็คระยะ ---------------- */

function openServiceFormModal(record) {
  var isEdit = !!record;
  var r = record || { vehicleId: DETAIL_STATE.vehicleId };
  var body = '<div class="form-grid">' +
    field_({ name: 'serviceDate', label: 'วันที่เช็คระยะ', type: 'date', value: r.serviceDate }) +
    field_({ name: 'mileage', label: 'เลขไมล์ (กม.)', type: 'number', value: r.mileage }) +
    field_({ name: 'serviceCenter', label: 'ศูนย์บริการ', value: r.serviceCenter }) +
    field_({ name: 'serviceType', label: 'ประเภทงาน', value: r.serviceType }) +
    field_({ name: 'itemsDone', label: 'รายการที่ทำ', type: 'textarea', value: r.itemsDone, full: true }) +
    field_({ name: 'cost', label: 'ค่าใช้จ่าย (บาท)', type: 'number', value: r.cost }) +
    field_({ name: 'nextAppointmentDate', label: 'นัดครั้งถัดไป', type: 'date', value: r.nextAppointmentDate }) +
    field_({ name: 'nextMileage', label: 'เลขไมล์เช็คระยะครั้งถัดไป', type: 'number', value: r.nextMileage }) +
    field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
    '</div>';

  openModal({
    title: isEdit ? '✏️ แก้ไขประวัติเช็คระยะ' : '➕ เพิ่มประวัติเช็คระยะ',
    bodyHtml: body,
    onSave: function (values) {
      if (isEdit) return apiPost('updateServiceRecord', { serviceId: r.serviceId, data: values });
      values.vehicleId = r.vehicleId;
      return apiPost('createServiceRecord', values);
    },
    onDone: function () { loadVehicleDetail(); }
  });
}

/* ---------------- ฟอร์มค่าใช้จ่าย ---------------- */

function openExpenseFormModal(record) {
  getFormOptionsCached().then(function (opts) {
    var isEdit = !!record;
    var r = record || { vehicleId: DETAIL_STATE.vehicleId };
    var body = '<div class="form-grid">' +
      field_({ name: 'expenseDate', label: 'วันที่', type: 'date', value: r.expenseDate }) +
      field_({ name: 'category', label: 'ประเภทค่าใช้จ่าย', type: 'select', value: r.category, options: opts.expenseCategories }) +
      field_({ name: 'cost', label: 'ค่าใช้จ่าย (บาท)', type: 'number', value: r.cost }) +
      field_({ name: 'description', label: 'รายละเอียด', type: 'textarea', value: r.description, full: true }) +
      field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
      '</div>';

    openModal({
      title: isEdit ? '✏️ แก้ไขค่าใช้จ่าย' : '➕ เพิ่มค่าใช้จ่าย',
      bodyHtml: body,
      onSave: function (values) {
        if (isEdit) return apiPost('updateExpense', { expenseId: r.expenseId, data: values });
        values.vehicleId = r.vehicleId;
        return apiPost('createExpense', values);
      },
      onDone: function () { loadVehicleDetail(); }
    });
  });
}

/* ---------------- ฟอร์มรถมอเตอร์ไซค์ ---------------- */

function openMotorcycleFormModal(moto, onDone) {
  var isEdit = !!moto;
  var m = moto || {};
  var body = '<div class="form-grid">' +
    field_({ name: 'label', label: 'ทะเบียน/ชื่อเรียก', value: m.label, full: true }) +
    field_({ name: 'responsiblePerson', label: 'ผู้ใช้งาน/ผู้รับผิดชอบ', value: m.responsiblePerson }) +
    field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: m.notes, full: true }) +
    '</div>';

  openModal({
    title: isEdit ? '✏️ แก้ไขข้อมูลรถมอไซ' : '➕ เพิ่มรถมอไซ',
    bodyHtml: body,
    onSave: function (values) {
      return isEdit
        ? apiPost('updateMotorcycle', { motorcycleId: m.motorcycleId, data: values })
        : apiPost('createMotorcycle', values);
    },
    onDone: onDone || function () { navigate('motorcycles'); }
  });
}

/* ---------------- ฟอร์มประกันรถมอเตอร์ไซค์ ---------------- */

function openMotoInsuranceFormModal(motorcycleId, record) {
  var isEdit = !!record;
  var r = record || {};
  var body = '<div class="form-grid">' +
    field_({ name: 'company', label: 'บริษัทประกัน', value: r.company, full: true }) +
    field_({ name: 'policyNo', label: 'เลขกรมธรรม์', value: r.policyNo }) +
    field_({ name: 'coverageType', label: 'ประเภทความคุ้มครอง', value: r.coverageType || 'ประกันอุบัติเหตุ' }) +
    field_({ name: 'startDate', label: 'วันที่เริ่มประกัน', type: 'date', value: r.startDate }) +
    field_({ name: 'expiryDate', label: 'วันหมดประกัน', type: 'date', value: r.expiryDate }) +
    field_({ name: 'nextRenewalDate', label: 'วันที่ต่อครั้งถัดไป', type: 'date', value: r.nextRenewalDate }) +
    field_({ name: 'premium', label: 'เบี้ยประกัน (บาท)', type: 'number', value: r.premium }) +
    field_({ name: 'notes', label: 'หมายเหตุ', type: 'textarea', value: r.notes, full: true }) +
    '</div>';

  openModal({
    title: isEdit ? '✏️ แก้ไขประกันรถมอไซ' : '➕ เพิ่มประกันรถมอไซ',
    bodyHtml: body,
    onSave: function (values) {
      if (isEdit) return apiPost('updateMotoInsurance', { motoInsuranceId: r.motoInsuranceId, data: values });
      values.motorcycleId = motorcycleId;
      return apiPost('createMotoInsurance', values);
    },
    onDone: function () { navigate('motorcycles'); }
  });
}
