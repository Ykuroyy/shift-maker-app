// シフトの種類
const SHIFT_TYPES = {
    DAY: { id: 'day', name: '日勤', time: '9:00-17:30', class: 'day-shift' },
    LATE: { id: 'late', name: '遅番', time: '16:00-24:00', class: 'late-shift' },
    NIGHT: { id: 'night', name: '夜勤', time: '23:00-9:00', class: 'night-shift' },
    OFF: { id: 'off', name: '休み', time: '', class: 'requested-off' }
};

// スタッフデータ（仮データ）
let staffData = [
    { id: 1, name: '山田太郎', skills: ['リーダー', '新人指導'], maxNightShifts: 8 },
    { id: 2, name: '佐藤花子', skills: ['ICU経験', 'リーダー'], maxNightShifts: 8 },
    { id: 3, name: '鈴木一郎', skills: ['救急対応'], maxNightShifts: 10 },
    { id: 4, name: '田中美咲', skills: ['新人'], maxNightShifts: 4 },
    { id: 5, name: '高橋健太', skills: ['ICU経験'], maxNightShifts: 8 },
    { id: 6, name: '伊藤由美', skills: ['リーダー', '救急対応'], maxNightShifts: 8 },
    { id: 7, name: '渡辺直子', skills: [], maxNightShifts: 8 },
    { id: 8, name: '小林正人', skills: ['新人指導'], maxNightShifts: 8 },
    { id: 9, name: '加藤愛', skills: ['新人'], maxNightShifts: 4 },
    { id: 10, name: '山口隆', skills: ['ICU経験', '救急対応'], maxNightShifts: 10 }
];

// シフトデータ
let shiftData = {};

// 希望休みデータ
let requestedDaysOff = {};

// 現在の表示月
let currentDate = new Date();

// DOM要素
const staffListEl = document.getElementById('staffList');
const calendarEl = document.getElementById('calendar');
const currentMonthEl = document.getElementById('currentMonth');
const shiftDetailEl = document.getElementById('shiftDetail');
const staffModal = document.getElementById('staffModal');
const requestModal = document.getElementById('requestModal');

// 選択中の日付
let selectedDate = null;

// 初期化
function init() {
    renderStaffList();
    renderCalendar();
    setupEventListeners();
}

// スタッフリストの表示
function renderStaffList() {
    staffListEl.innerHTML = '';
    staffData.forEach(staff => {
        const staffItem = document.createElement('div');
        staffItem.className = 'staff-item';
        staffItem.draggable = true;
        staffItem.dataset.staffId = staff.id;
        staffItem.innerHTML = `
            <strong>${staff.name}</strong>
            <div style="font-size: 12px; color: #666;">${staff.skills.join(', ') || 'スキルなし'}</div>
        `;
        
        // ドラッグイベント
        staffItem.addEventListener('dragstart', handleDragStart);
        staffItem.addEventListener('dragend', handleDragEnd);
        
        staffListEl.appendChild(staffItem);
    });
}

// カレンダーの表示
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthEl.textContent = `${year}年${month + 1}月`;
    
    calendarEl.innerHTML = '';
    
    // 曜日ヘッダー
    const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarEl.appendChild(header);
    });
    
    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    // 前月の日付
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDay.getDate() - i;
        createCalendarDay(year, month - 1, day, true);
    }
    
    // 当月の日付
    for (let day = 1; day <= lastDay.getDate(); day++) {
        createCalendarDay(year, month, day, false);
    }
    
    // 次月の日付
    const remainingDays = 42 - (firstDayOfWeek + lastDay.getDate());
    for (let day = 1; day <= remainingDays; day++) {
        createCalendarDay(year, month + 1, day, true);
    }
}

// カレンダーの日付セルを作成
function createCalendarDay(year, month, day, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    
    const dateStr = formatDate(new Date(year, month, day));
    dayEl.dataset.date = dateStr;
    
    dayEl.innerHTML = `<div class="calendar-day-number">${day}</div>`;
    
    // シフト表示エリア
    const shiftsEl = document.createElement('div');
    shiftsEl.className = 'shifts-container';
    dayEl.appendChild(shiftsEl);
    
    // この日のシフトを表示
    if (shiftData[dateStr]) {
        Object.entries(shiftData[dateStr]).forEach(([shiftType, staffIds]) => {
            staffIds.forEach(staffId => {
                const staff = staffData.find(s => s.id === parseInt(staffId));
                if (staff) {
                    const shiftEl = document.createElement('div');
                    shiftEl.className = `shift-slot ${SHIFT_TYPES[shiftType.toUpperCase()].class}`;
                    shiftEl.textContent = staff.name;
                    shiftEl.dataset.staffId = staffId;
                    shiftEl.dataset.shiftType = shiftType;
                    shiftsEl.appendChild(shiftEl);
                }
            });
        });
    }
    
    // 希望休み表示
    if (requestedDaysOff[dateStr]) {
        requestedDaysOff[dateStr].forEach(staffId => {
            const staff = staffData.find(s => s.id === staffId);
            if (staff) {
                const requestEl = document.createElement('div');
                requestEl.className = 'shift-slot requested-off';
                requestEl.textContent = `${staff.name}(希望休)`;
                shiftsEl.appendChild(requestEl);
            }
        });
    }
    
    // クリックイベント
    dayEl.addEventListener('click', () => selectDate(dateStr));
    
    // ドロップイベント
    dayEl.addEventListener('dragover', handleDragOver);
    dayEl.addEventListener('drop', handleDrop);
    dayEl.addEventListener('dragleave', handleDragLeave);
    
    calendarEl.appendChild(dayEl);
}

// 日付選択
function selectDate(dateStr) {
    // 以前の選択を解除
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 新しい選択
    const dayEl = document.querySelector(`[data-date="${dateStr}"]`);
    if (dayEl) {
        dayEl.classList.add('selected');
        selectedDate = dateStr;
        showShiftDetail(dateStr);
    }
}

// シフト詳細表示
function showShiftDetail(dateStr) {
    const date = new Date(dateStr);
    const dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    let html = `<h3>${dateLabel}</h3>`;
    
    // シフト別に表示
    Object.entries(SHIFT_TYPES).forEach(([key, shift]) => {
        if (key === 'OFF') return;
        
        html += `<div style="margin: 15px 0;">`;
        html += `<h4>${shift.name} (${shift.time})</h4>`;
        
        const staffIds = shiftData[dateStr]?.[shift.id] || [];
        if (staffIds.length > 0) {
            html += '<ul>';
            staffIds.forEach(staffId => {
                const staff = staffData.find(s => s.id === parseInt(staffId));
                if (staff) {
                    html += `<li>${staff.name} ${staff.skills.length > 0 ? `(${staff.skills.join(', ')})` : ''}</li>`;
                }
            });
            html += '</ul>';
        } else {
            html += '<p style="color: #999;">未割り当て</p>';
        }
        
        html += '</div>';
    });
    
    // 希望休み
    if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].length > 0) {
        html += '<div style="margin: 15px 0;">';
        html += '<h4>希望休み</h4><ul>';
        requestedDaysOff[dateStr].forEach(staffId => {
            const staff = staffData.find(s => s.id === staffId);
            if (staff) {
                html += `<li>${staff.name}</li>`;
            }
        });
        html += '</ul></div>';
    }
    
    shiftDetailEl.innerHTML = html;
}

// ドラッグ&ドロップ処理
let draggedStaffId = null;

function handleDragStart(e) {
    draggedStaffId = e.target.dataset.staffId;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedStaffId) return;
    
    const dateStr = e.currentTarget.dataset.date;
    const staffId = parseInt(draggedStaffId);
    
    // シフト選択ダイアログ（簡易版）
    const shiftType = prompt('シフトを選択してください:\n1: 日勤\n2: 遅番\n3: 夜勤');
    
    let shift;
    switch(shiftType) {
        case '1': shift = 'day'; break;
        case '2': shift = 'late'; break;
        case '3': shift = 'night'; break;
        default: return;
    }
    
    // シフトデータ更新
    if (!shiftData[dateStr]) {
        shiftData[dateStr] = {};
    }
    if (!shiftData[dateStr][shift]) {
        shiftData[dateStr][shift] = [];
    }
    
    // 既存のシフトをチェック
    Object.keys(shiftData[dateStr]).forEach(s => {
        shiftData[dateStr][s] = shiftData[dateStr][s].filter(id => id !== staffId);
    });
    
    shiftData[dateStr][shift].push(staffId);
    
    // 再描画
    renderCalendar();
    if (selectedDate) {
        selectDate(selectedDate);
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // 月変更ボタン
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // スタッフ管理ボタン
    document.getElementById('staffManageBtn').addEventListener('click', () => {
        showStaffManagement();
    });
    
    // 自動割り当てボタン
    document.getElementById('autoAssignBtn').addEventListener('click', () => {
        alert('自動割り当て機能は開発中です');
    });
    
    // モーダルの閉じるボタン
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    
    // 希望休み登録
    const requestBtn = document.createElement('button');
    requestBtn.className = 'btn';
    requestBtn.textContent = '希望休み登録';
    requestBtn.style.marginTop = '10px';
    requestBtn.addEventListener('click', showRequestForm);
    document.querySelector('.staff-section').appendChild(requestBtn);
}

// スタッフ管理画面表示
function showStaffManagement() {
    const managementEl = document.getElementById('staffManagement');
    let html = '<div>';
    
    staffData.forEach(staff => {
        html += `
            <div class="staff-edit-item">
                <div>${staff.name}</div>
                <div>スキル: ${staff.skills.join(', ') || 'なし'}</div>
                <div>夜勤上限: ${staff.maxNightShifts}回</div>
            </div>
        `;
    });
    
    html += '</div>';
    managementEl.innerHTML = html;
    staffModal.style.display = 'block';
}

// 希望休み登録フォーム表示
function showRequestForm() {
    // スタッフ選択オプション
    const selectEl = document.getElementById('requestStaff');
    selectEl.innerHTML = '';
    staffData.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id;
        option.textContent = staff.name;
        selectEl.appendChild(option);
    });
    
    // 登録ボタンイベント
    document.getElementById('submitRequest').onclick = () => {
        const staffId = parseInt(document.getElementById('requestStaff').value);
        const date = document.getElementById('requestDate').value;
        
        if (!date) return;
        
        if (!requestedDaysOff[date]) {
            requestedDaysOff[date] = [];
        }
        
        if (!requestedDaysOff[date].includes(staffId)) {
            requestedDaysOff[date].push(staffId);
            renderCalendar();
            alert('希望休みを登録しました');
        }
    };
    
    requestModal.style.display = 'block';
}

// ユーティリティ関数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 初期化実行
init();