// シフトの種類
const SHIFT_TYPES = {
    DAY: { id: 'day', name: '日勤', time: '9:00-17:30', class: 'day-shift' },
    LATE: { id: 'late', name: '遅番', time: '16:00-24:00', class: 'late-shift' },
    NIGHT: { id: 'night', name: '夜勤', time: '23:00-翌9:00', class: 'night-shift' },
    OFF: { id: 'off', name: '休み', time: '', class: 'requested-off' }
};

// スタッフデータ（仮データ）
let staffData = [
    { id: 1, name: '山田太郎', skills: ['リーダー', '新人指導'], maxNightShifts: 8, minRestDays: 8 },
    { id: 2, name: '佐藤花子', skills: ['ICU経験', 'リーダー'], maxNightShifts: 8, minRestDays: 8 },
    { id: 3, name: '鈴木一郎', skills: ['救急対応'], maxNightShifts: 10, minRestDays: 8 },
    { id: 4, name: '田中美咲', skills: ['新人'], maxNightShifts: 4, minRestDays: 10 },
    { id: 5, name: '高橋健太', skills: ['ICU経験'], maxNightShifts: 8, minRestDays: 8 },
    { id: 6, name: '伊藤由美', skills: ['リーダー', '救急対応'], maxNightShifts: 8, minRestDays: 8 },
    { id: 7, name: '渡辺直子', skills: [], maxNightShifts: 8, minRestDays: 8 },
    { id: 8, name: '小林正人', skills: ['新人指導'], maxNightShifts: 8, minRestDays: 8 },
    { id: 9, name: '加藤愛', skills: ['新人'], maxNightShifts: 4, minRestDays: 10 },
    { id: 10, name: '山口隆', skills: ['ICU経験', '救急対応'], maxNightShifts: 10, minRestDays: 8 }
];

// シフト必要人数の設定
const SHIFT_REQUIREMENTS = {
    day: { min: 4, max: 5, requiredSkills: ['リーダー'] },
    late: { min: 3, max: 4, requiredSkills: [] },
    night: { min: 3, max: 3, requiredSkills: ['リーダー'] }
};

// 利用可能なスキルのマスタ
const SKILL_MASTER = [
    'リーダー',
    '新人指導',
    'ICU経験',
    '救急対応',
    '新人',
    '認定看護師',
    '主任',
    '感染管理',
    'がん看護',
    '精神科対応'
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
    // ガントチャートボタンを追加
    addGanttChartButton();
    // CSVダウンロードボタンを追加
    addDownloadButton();
    // 月間統計ボタンを追加
    addStatsButton();
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
    
    // この日の休み人数を計算
    const workingStaffIds = new Set();
    if (shiftData[dateStr]) {
        Object.values(shiftData[dateStr]).forEach(staffIds => {
            staffIds.forEach(id => workingStaffIds.add(parseInt(id)));
        });
    }
    // 前日の夜勤スタッフも勤務扱い
    const prevDateStr = formatDate(new Date(year, month, day - 1));
    if (shiftData[prevDateStr] && shiftData[prevDateStr].night) {
        shiftData[prevDateStr].night.forEach(id => workingStaffIds.add(parseInt(id)));
    }
    const restCount = staffData.length - workingStaffIds.size;
    
    dayEl.innerHTML = `
        <div class="calendar-day-number">${day}</div>
        <div style="font-size: 10px; color: #666; text-align: right;">休:${restCount}</div>
    `;
    
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
    dayEl.addEventListener('click', (e) => {
        // ダブルクリックで詳細表示
        if (e.detail === 2) {
            showDayDetailGantt(dateStr);
        } else {
            selectDate(dateStr);
        }
    });
    
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
    
    // この日の休み人数を計算
    const workingStaffIds = new Set();
    if (shiftData[dateStr]) {
        Object.values(shiftData[dateStr]).forEach(staffIds => {
            staffIds.forEach(id => workingStaffIds.add(id));
        });
    }
    // 前日の夜勤スタッフも勤務扱い
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = formatDate(prevDate);
    if (shiftData[prevDateStr] && shiftData[prevDateStr].night) {
        shiftData[prevDateStr].night.forEach(id => workingStaffIds.add(id));
    }
    
    const restCount = staffData.length - workingStaffIds.size;
    
    let html = `<h3>${dateLabel}</h3>`;
    html += `<div style="background: #e3f2fd; padding: 10px; margin: 10px 0; border-radius: 5px;">`;
    html += `<strong>📅 この日の休み: ${restCount}名</strong>`;
    html += `</div>`;
    
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
    
    // 同じ日に既にシフトがあるかチェック
    if (shiftData[dateStr]) {
        let alreadyAssigned = false;
        Object.keys(shiftData[dateStr]).forEach(shiftType => {
            if (shiftData[dateStr][shiftType].includes(staffId)) {
                alreadyAssigned = true;
            }
        });
        
        if (alreadyAssigned) {
            alert('このスタッフは既にこの日にシフトが割り当てられています。');
            return;
        }
    }
    
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
        showShiftRequirementsModal();
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
    
    // 新規スタッフ追加ボタン
    html += `
        <div style="margin-bottom: 20px;">
            <button class="btn" onclick="addNewStaff()">新規スタッフ追加</button>
        </div>
    `;
    
    staffData.forEach((staff) => {
        html += `
            <div class="staff-edit-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 200px 2fr 150px; gap: 15px; align-items: start;">
                    <div>
                        <input type="text" id="staff-name-${staff.id}" value="${staff.name}" style="width: 100%;">
                    </div>
                    <div>
                        <label>スキル:</label>
                        <div id="skills-${staff.id}" style="margin: 5px 0;">
                            ${staff.skills.map(skill => 
                                `<span class="skill-tag" style="display: inline-block; margin: 2px; padding: 4px 8px; background: #e9ecef; border-radius: 3px;">
                                    ${skill} 
                                    <span onclick="removeSkill(${staff.id}, '${skill}')" style="cursor: pointer; color: red;">×</span>
                                </span>`
                            ).join('')}
                        </div>
                        <select id="skill-select-${staff.id}" onchange="addSkill(${staff.id})" style="margin-top: 5px;">
                            <option value="">スキルを追加...</option>
                            ${SKILL_MASTER.map(skill => 
                                `<option value="${skill}" ${staff.skills.includes(skill) ? 'disabled' : ''}>${skill}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label>夜勤上限: 
                            <input type="number" id="night-limit-${staff.id}" value="${staff.maxNightShifts}" min="0" max="20" style="width: 60px;">
                        </label>
                        <br>
                        <label style="margin-top: 5px;">最低休日数: 
                            <input type="number" id="rest-days-${staff.id}" value="${staff.minRestDays}" min="4" max="20" style="width: 60px;">
                        </label>
                        <br>
                        <button class="btn" onclick="saveStaffChanges(${staff.id})" style="margin-top: 10px;">保存</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    managementEl.innerHTML = html;
    managementEl.style.maxHeight = '70vh';
    managementEl.style.overflowY = 'auto';
    staffModal.style.display = 'block';
}

// スキル追加
function addSkill(staffId) {
    const selectEl = document.getElementById(`skill-select-${staffId}`);
    const skill = selectEl.value;
    
    if (!skill) return;
    
    const staff = staffData.find(s => s.id === staffId);
    if (staff && !staff.skills.includes(skill)) {
        staff.skills.push(skill);
        showStaffManagement(); // 画面を再描画
        renderStaffList(); // スタッフリストも更新
    }
}

// スキル削除
function removeSkill(staffId, skill) {
    const staff = staffData.find(s => s.id === staffId);
    if (staff) {
        staff.skills = staff.skills.filter(s => s !== skill);
        showStaffManagement(); // 画面を再描画
        renderStaffList(); // スタッフリストも更新
    }
}

// スタッフ情報保存
function saveStaffChanges(staffId) {
    const staff = staffData.find(s => s.id === staffId);
    if (!staff) return;
    
    const nameEl = document.getElementById(`staff-name-${staffId}`);
    const nightLimitEl = document.getElementById(`night-limit-${staffId}`);
    const restDaysEl = document.getElementById(`rest-days-${staffId}`);
    
    staff.name = nameEl.value;
    staff.maxNightShifts = parseInt(nightLimitEl.value);
    staff.minRestDays = parseInt(restDaysEl.value);
    
    renderStaffList(); // スタッフリストを更新
    renderCalendar(); // カレンダーも更新（名前が変わった場合のため）
    alert('スタッフ情報を更新しました');
}

// 新規スタッフ追加
function addNewStaff() {
    const name = prompt('新規スタッフの名前を入力してください:');
    if (!name) return;
    
    const newId = Math.max(...staffData.map(s => s.id)) + 1;
    const newStaff = {
        id: newId,
        name: name,
        skills: [],
        maxNightShifts: 8,
        minRestDays: 8
    };
    
    staffData.push(newStaff);
    showStaffManagement(); // 画面を再描画
    renderStaffList(); // スタッフリストも更新
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

// シフト自動生成機能
function autoGenerateShifts() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // 既存のシフトをクリア（希望休みは保持）
    shiftData = {};
    
    // スタッフごとの制約管理
    const staffConstraints = {};
    staffData.forEach(staff => {
        staffConstraints[staff.id] = {
            nightCount: 0,
            restDays: 0,
            lastNight: null,
            consecutiveWork: 0
        };
    });
    
    // 各日付でシフトを生成
    for (let day = 1; day <= lastDay; day++) {
        const dateStr = formatDate(new Date(year, month, day));
        const dayOfWeek = new Date(year, month, day).getDay();
        
        // この日の利用可能なスタッフを取得
        const availableStaff = getAvailableStaff(dateStr, staffConstraints);
        
        // シフトタイプごとに割り当て
        shiftData[dateStr] = {};
        
        // 各シフトタイプに対してスタッフを割り当て
        ['day', 'late', 'night'].forEach(shiftType => {
            const assigned = assignShiftWithConstraints(
                shiftType,
                dateStr,
                availableStaff,
                staffConstraints,
                dayOfWeek
            );
            if (assigned.length > 0) {
                shiftData[dateStr][shiftType] = assigned;
            }
        });
        
        // 365日必ず誰かが勤務しているかチェック
        const totalAssigned = Object.values(shiftData[dateStr]).reduce((sum, staffIds) => sum + staffIds.length, 0);
        if (totalAssigned === 0) {
            // 緊急割り当て：最低限日勤に人員を確保
            const emergencyStaff = staffData.filter(staff => 
                (!requestedDaysOff[dateStr] || !requestedDaysOff[dateStr].includes(staff.id)) &&
                staffConstraints[staff.id].consecutiveWork < 7 // 7連勤未満
            );
            
            if (emergencyStaff.length > 0) {
                // 最低3名を日勤に割り当て
                const assignCount = Math.min(emergencyStaff.length, SHIFT_REQUIREMENTS.day.min);
                shiftData[dateStr].day = emergencyStaff.slice(0, assignCount).map(s => s.id);
                console.warn(`${dateStr}: 緊急割り当て実施 - ${assignCount}名を日勤に配置`);
            } else {
                // それでも誰もいない場合は、希望休みを無視して割り当て（病院なので必須）
                const forceAssign = staffData.slice(0, 3).map(s => s.id);
                shiftData[dateStr].day = forceAssign;
                console.error(`${dateStr}: 強制割り当て実施 - 希望休みを無視して配置`);
            }
        }
        
        // 遅番の最低人数チェック
        if (!shiftData[dateStr].late || shiftData[dateStr].late.length < SHIFT_REQUIREMENTS.late.min) {
            const currentLateCount = shiftData[dateStr].late ? shiftData[dateStr].late.length : 0;
            const neededLate = SHIFT_REQUIREMENTS.late.min - currentLateCount;
            
            // 遅番に追加可能なスタッフを探す
            const lateCandidates = staffData.filter(staff => {
                if (shiftData[dateStr].late && shiftData[dateStr].late.includes(staff.id)) return false;
                if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].includes(staff.id)) return false;
                const inOtherShift = Object.entries(shiftData[dateStr]).some(([type, ids]) => 
                    type !== 'late' && ids.includes(staff.id)
                );
                if (inOtherShift) return false;
                return true;
            });
            
            // 遅番に追加
            const toAddLate = lateCandidates.slice(0, neededLate);
            if (!shiftData[dateStr].late) shiftData[dateStr].late = [];
            toAddLate.forEach(staff => {
                shiftData[dateStr].late.push(staff.id);
                console.warn(`${dateStr}: ${staff.name}を遅番に追加割り当て（最低人数確保のため）`);
            });
        }
        
        // 夜勤の最低人数チェック（特に重要）
        if (!shiftData[dateStr].night || shiftData[dateStr].night.length < SHIFT_REQUIREMENTS.night.min) {
            const currentNightCount = shiftData[dateStr].night ? shiftData[dateStr].night.length : 0;
            const needed = SHIFT_REQUIREMENTS.night.min - currentNightCount;
            
            // 夜勤に追加可能なスタッフを探す
            const nightCandidates = staffData.filter(staff => {
                // すでに夜勤に割り当てられていない
                if (shiftData[dateStr].night && shiftData[dateStr].night.includes(staff.id)) return false;
                // 希望休みでない
                if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].includes(staff.id)) return false;
                // 他のシフトに入っていない
                const inOtherShift = Object.entries(shiftData[dateStr]).some(([type, ids]) => 
                    type !== 'night' && ids.includes(staff.id)
                );
                if (inOtherShift) return false;
                
                return true;
            });
            
            // 夜勤に追加
            const toAdd = nightCandidates.slice(0, needed);
            if (!shiftData[dateStr].night) shiftData[dateStr].night = [];
            toAdd.forEach(staff => {
                shiftData[dateStr].night.push(staff.id);
                console.warn(`${dateStr}: ${staff.name}を夜勤に追加割り当て（最低人数確保のため）`);
            });
            
            // それでも足りない場合は他のシフトから移動
            if (shiftData[dateStr].night.length < SHIFT_REQUIREMENTS.night.min) {
                const stillNeeded = SHIFT_REQUIREMENTS.night.min - shiftData[dateStr].night.length;
                let moved = 0;
                
                // 日勤から移動（日勤は人数に余裕がある場合が多い）
                if (shiftData[dateStr].day && shiftData[dateStr].day.length > SHIFT_REQUIREMENTS.day.min) {
                    const toMove = Math.min(stillNeeded, shiftData[dateStr].day.length - SHIFT_REQUIREMENTS.day.min);
                    for (let i = 0; i < toMove; i++) {
                        const staffId = shiftData[dateStr].day.pop();
                        shiftData[dateStr].night.push(staffId);
                        moved++;
                        console.warn(`${dateStr}: スタッフID${staffId}を日勤から夜勤へ移動`);
                    }
                }
            }
        }
        
        // 制約情報を更新
        updateStaffConstraints(dateStr, shiftData[dateStr], staffConstraints);
    }
    
    // カレンダーを再描画
    renderCalendar();
    renderStaffList(); // スタッフリストも更新して休日数を表示
    alert('シフトを自動生成しました');
}

// 利用可能なスタッフを取得
function getAvailableStaff(dateStr, staffConstraints) {
    const available = [];
    
    staffData.forEach(staff => {
        // 希望休みチェック
        if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].includes(staff.id)) {
            return;
        }
        
        // 5連勤チェック
        if (staffConstraints[staff.id].consecutiveWork >= 5) {
            return;
        }
        
        available.push(staff);
    });
    
    return available;
}

// シフトにスタッフを割り当て
function assignShiftWithConstraints(shiftType, dateStr, availableStaff, staffConstraints) {
    const requirements = SHIFT_REQUIREMENTS[shiftType];
    const assigned = [];
    const assignedToday = new Set(); // その日に既に割り当てられたスタッフ
    
    // その日の既存のシフトから既に割り当てられたスタッフを収集
    if (shiftData[dateStr]) {
        Object.values(shiftData[dateStr]).forEach(staffIds => {
            staffIds.forEach(id => assignedToday.add(id));
        });
    }
    
    // その日にまだ割り当てられていないスタッフのみをフィルタ
    const availableForShift = availableStaff.filter(staff => !assignedToday.has(staff.id));
    
    // ランダム性を加える
    const shuffled = [...availableForShift].sort(() => Math.random() - 0.5);
    
    // 必須スキルを持つスタッフを優先
    const withRequiredSkills = shuffled.filter(staff => 
        requirements.requiredSkills.some(skill => staff.skills.includes(skill))
    );
    const withoutRequiredSkills = shuffled.filter(staff => 
        !requirements.requiredSkills.some(skill => staff.skills.includes(skill))
    );
    
    // 必須スキルを持つスタッフから割り当て
    for (const staff of withRequiredSkills) {
        if (assigned.length >= requirements.max) break;
        
        if (canAssignToShift(staff, shiftType, dateStr, staffConstraints)) {
            assigned.push(staff.id);
            assignedToday.add(staff.id); // 今日の割り当て済みに追加
        }
    }
    
    // 残りのスタッフから割り当て
    for (const staff of withoutRequiredSkills) {
        if (assigned.length >= requirements.max) break;
        
        if (canAssignToShift(staff, shiftType, dateStr, staffConstraints)) {
            assigned.push(staff.id);
            assignedToday.add(staff.id); // 今日の割り当て済みに追加
        }
    }
    
    // 最小人数を満たしているかチェック
    if (assigned.length < requirements.min) {
        // 必要に応じて制約を緩めて再割り当て
        const availableForMin = availableForShift.filter(staff => !assigned.includes(staff.id));
        
        // 夜勤の場合は特別処理
        if (shiftType === 'night') {
            // まず夜勤可能なスタッフを優先
            const nightCapable = availableForMin.filter(staff => {
                const constraint = staffConstraints[staff.id];
                return constraint.nightCount < staff.maxNightShifts;
            });
            
            // 夜勤可能なスタッフから割り当て
            for (const staff of nightCapable) {
                if (assigned.length >= requirements.min) break;
                assigned.push(staff.id);
                assignedToday.add(staff.id);
            }
            
            // それでも足りない場合は制約を無視
            if (assigned.length < requirements.min) {
                for (const staff of availableForMin) {
                    if (assigned.length >= requirements.min) break;
                    if (!assigned.includes(staff.id)) {
                        assigned.push(staff.id);
                        assignedToday.add(staff.id);
                        console.warn(`${dateStr}: ${staff.name}を夜勤に強制割り当て`);
                    }
                }
            }
        } else {
            // 日勤・遅番の場合
            for (const staff of availableForMin) {
                if (assigned.length >= requirements.min) break;
                assigned.push(staff.id);
                assignedToday.add(staff.id);
            }
        }
    }
    
    return assigned;
}

// スタッフがシフトに割り当て可能かチェック
function canAssignToShift(staff, shiftType, dateStr, staffConstraints) {
    const constraint = staffConstraints[staff.id];
    
    // 夜勤の場合
    if (shiftType === 'night') {
        // 夜勤上限チェック
        if (constraint.nightCount >= staff.maxNightShifts) {
            return false;
        }
        
        // 前日が夜勤の場合は避ける
        if (constraint.lastNight) {
            const lastNightDate = new Date(constraint.lastNight);
            const currentDate = new Date(dateStr);
            const dayDiff = (currentDate - lastNightDate) / (1000 * 60 * 60 * 24);
            if (dayDiff <= 1) {
                return false;
            }
        }
    }
    
    // 新人は一人にしない（他のスタッフがいることを前提）
    if (staff.skills.includes('新人') && shiftType === 'night') {
        return Math.random() > 0.7; // 新人の夜勤は少なめに
    }
    
    return true;
}

// スタッフの制約情報を更新
function updateStaffConstraints(dateStr, dayShifts, staffConstraints) {
    // 全スタッフの連続勤務と休日をリセット
    staffData.forEach(staff => {
        let worked = false;
        
        // この日に勤務しているかチェック
        Object.entries(dayShifts).forEach(([shiftType, staffIds]) => {
            if (staffIds.includes(staff.id)) {
                worked = true;
                
                // 夜勤の場合
                if (shiftType === 'night') {
                    staffConstraints[staff.id].nightCount++;
                    staffConstraints[staff.id].lastNight = dateStr;
                }
            }
        });
        
        if (worked) {
            staffConstraints[staff.id].consecutiveWork++;
            staffConstraints[staff.id].restDays = 0;
        } else {
            staffConstraints[staff.id].consecutiveWork = 0;
            staffConstraints[staff.id].restDays++;
        }
    });
}

// ガントチャート表示関数
function showGanttChart() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // モーダルコンテンツを作成
    const ganttModal = document.createElement('div');
    ganttModal.className = 'modal';
    ganttModal.id = 'ganttModal';
    ganttModal.style.display = 'block';
    
    let html = `
        <div class="modal-content" style="max-width: 95%; width: 1200px;">
            <span class="close" onclick="document.getElementById('ganttModal').remove()">&times;</span>
            <h2>${year}年${month + 1}月 シフトガントチャート</h2>
            <div class="gantt-container" style="overflow-x: auto; margin-top: 20px;">
                <table class="gantt-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="position: sticky; left: 0; background: white; border: 1px solid #ddd; padding: 8px; min-width: 150px;">スタッフ/日付</th>
    `;
    
    // 日付ヘッダー
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        html += `<th style="border: 1px solid #ddd; padding: 4px; min-width: 80px; text-align: center; ${isWeekend ? 'background: #f0f0f0;' : ''}">${day}<br><small>${dayOfWeek}</small></th>`;
    }
    html += '</tr></thead><tbody>';
    
    // 各スタッフの行
    staffData.forEach(staff => {
        html += `<tr><td style="position: sticky; left: 0; background: white; border: 1px solid #ddd; padding: 8px; font-weight: bold;">${staff.name}</td>`;
        
        for (let day = 1; day <= lastDay; day++) {
            const dateStr = formatDate(new Date(year, month, day));
            let cellContent = '';
            let cellStyle = 'border: 1px solid #ddd; padding: 4px; text-align: center;';
            
            // 希望休みチェック
            if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].includes(staff.id)) {
                cellContent = '希望休';
                cellStyle += ' background: #f8d7da; color: #721c24;';
            } else if (shiftData[dateStr]) {
                // シフトチェック
                Object.entries(shiftData[dateStr]).forEach(([shiftType, staffIds]) => {
                    if (staffIds.includes(staff.id)) {
                        const shift = SHIFT_TYPES[shiftType.toUpperCase()];
                        cellContent = `<div style="font-size: 11px; font-weight: bold;">${shift.name}</div><div style="font-size: 10px;">${shift.time}</div>`;
                        
                        // シフトごとの色分け
                        switch(shiftType) {
                            case 'day':
                                cellStyle += ' background: #fff3cd; color: #856404;';
                                break;
                            case 'late':
                                cellStyle += ' background: #cce5ff; color: #004085;';
                                break;
                            case 'night':
                                cellStyle += ' background: #d1ecf1; color: #0c5460;';
                                break;
                        }
                    }
                });
            }
            
            html += `<td style="${cellStyle}">${cellContent}</td>`;
        }
        html += '</tr>';
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #fff3cd; border: 1px solid #ddd;"></div>
                    <span>日勤 (9:00-17:30)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #cce5ff; border: 1px solid #ddd;"></div>
                    <span>遅番 (16:00-24:00)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #d1ecf1; border: 1px solid #ddd;"></div>
                    <span>夜勤 (23:00-9:00)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #f8d7da; border: 1px solid #ddd;"></div>
                    <span>希望休</span>
                </div>
            </div>
        </div>
    `;
    
    ganttModal.innerHTML = html;
    document.body.appendChild(ganttModal);
    
    // モーダル外クリックで閉じる
    ganttModal.addEventListener('click', (e) => {
        if (e.target === ganttModal) {
            ganttModal.remove();
        }
    });
}

// ガントチャートボタンを追加
function addGanttChartButton() {
    const calendarHeader = document.querySelector('.calendar-header');
    const ganttBtn = document.createElement('button');
    ganttBtn.className = 'btn';
    ganttBtn.textContent = 'ガントチャート表示';
    ganttBtn.style.marginLeft = '10px';
    ganttBtn.addEventListener('click', showGanttChart);
    
    // 既存のボタンの後に追加
    const existingButtons = calendarHeader.querySelector('div:last-child');
    existingButtons.appendChild(ganttBtn);
}

// シフト必要人数設定モーダルを表示
function showShiftRequirementsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'requirementsModal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('requirementsModal').remove()">&times;</span>
            <h2>シフト必要人数設定</h2>
            <div style="margin: 20px 0;">
                <h3>日勤 (9:00-17:30)</h3>
                <label>
                    最小人数: <input type="number" id="day-min" value="${SHIFT_REQUIREMENTS.day.min}" min="1" max="10" style="width: 60px;">
                </label>
                <label style="margin-left: 20px;">
                    最大人数: <input type="number" id="day-max" value="${SHIFT_REQUIREMENTS.day.max}" min="1" max="10" style="width: 60px;">
                </label>
            </div>
            <div style="margin: 20px 0;">
                <h3>遅番 (16:00-24:00)</h3>
                <label>
                    最小人数: <input type="number" id="late-min" value="${SHIFT_REQUIREMENTS.late.min}" min="1" max="10" style="width: 60px;">
                </label>
                <label style="margin-left: 20px;">
                    最大人数: <input type="number" id="late-max" value="${SHIFT_REQUIREMENTS.late.max}" min="1" max="10" style="width: 60px;">
                </label>
            </div>
            <div style="margin: 20px 0;">
                <h3>夜勤 (23:00-9:00)</h3>
                <label>
                    最小人数: <input type="number" id="night-min" value="${SHIFT_REQUIREMENTS.night.min}" min="1" max="10" style="width: 60px;">
                </label>
                <label style="margin-left: 20px;">
                    最大人数: <input type="number" id="night-max" value="${SHIFT_REQUIREMENTS.night.max}" min="1" max="10" style="width: 60px;">
                </label>
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <button class="btn" onclick="applyRequirementsAndGenerate()">設定して自動作成</button>
                <button class="btn" style="background: #6c757d; margin-left: 10px;" onclick="document.getElementById('requirementsModal').remove()">キャンセル</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 必要人数を適用して自動生成
function applyRequirementsAndGenerate() {
    // 入力値を取得
    const dayMin = parseInt(document.getElementById('day-min').value);
    const dayMax = parseInt(document.getElementById('day-max').value);
    const lateMin = parseInt(document.getElementById('late-min').value);
    const lateMax = parseInt(document.getElementById('late-max').value);
    const nightMin = parseInt(document.getElementById('night-min').value);
    const nightMax = parseInt(document.getElementById('night-max').value);
    
    // バリデーション
    if (dayMin > dayMax || lateMin > lateMax || nightMin > nightMax) {
        alert('最小人数は最大人数以下にしてください。');
        return;
    }
    
    // 設定を更新
    SHIFT_REQUIREMENTS.day.min = dayMin;
    SHIFT_REQUIREMENTS.day.max = dayMax;
    SHIFT_REQUIREMENTS.late.min = lateMin;
    SHIFT_REQUIREMENTS.late.max = lateMax;
    SHIFT_REQUIREMENTS.night.min = nightMin;
    SHIFT_REQUIREMENTS.night.max = nightMax;
    
    // モーダルを閉じる
    document.getElementById('requirementsModal').remove();
    
    // 確認後、自動生成
    if (confirm('現在のシフトをクリアして自動作成しますか？')) {
        autoGenerateShifts();
    }
}

// 月間統計ボタンを追加
function addStatsButton() {
    const shiftSection = document.querySelector('.shift-section');
    const statsBtn = document.createElement('button');
    statsBtn.className = 'btn';
    statsBtn.textContent = '月間統計';
    statsBtn.style.marginTop = '10px';
    statsBtn.style.background = '#28a745';
    statsBtn.addEventListener('click', showMonthlyStats);
    shiftSection.appendChild(statsBtn);
}

// CSVダウンロードボタンを追加
function addDownloadButton() {
    const shiftSection = document.querySelector('.shift-section');
    const csvBtn = document.createElement('button');
    csvBtn.className = 'btn';
    csvBtn.textContent = 'CSVダウンロード';
    csvBtn.style.marginTop = '10px';
    csvBtn.style.background = '#17a2b8';
    csvBtn.addEventListener('click', showDownloadOptions);
    shiftSection.appendChild(csvBtn);
}

// 月間統計を表示
function showMonthlyStats() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthlyRestDays = calculateMonthlyRestDays(year, month);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'statsModal';
    modal.style.display = 'block';
    
    let html = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('statsModal').remove()">&times;</span>
            <h2>${year}年${month + 1}月 勤務統計</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">スタッフ名</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">休日数</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">日勤</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">遅番</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">夜勤</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">スキル</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 各スタッフの統計を計算
    staffData.forEach(staff => {
        const stats = calculateStaffMonthlyStats(staff.id, year, month);
        const restDays = monthlyRestDays[staff.id] || 0;
        const rowStyle = restDays < staff.minRestDays ? 'background: #ffe4e1;' : '';
        
        html += `
            <tr style="${rowStyle}">
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${restDays}日</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.day}回</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.late}回</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.night}回</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${staff.skills.join(', ') || 'なし'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            <p style="margin-top: 15px; font-size: 14px; color: #666;">※ 赤色背景: 各スタッフの設定した最低休日数未満のスタッフ</p>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn" style="background: #28a745; margin-right: 10px;" onclick="downloadStatsCSV()">📄 統計をCSVダウンロード</button>
                <button class="btn" style="background: #17a2b8;" onclick="downloadScheduleCSV()">📅 シフト表をCSVダウンロード</button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// CSVダウンロードオプションを表示
function showDownloadOptions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'downloadModal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('downloadModal').remove()">&times;</span>
            <h2>📄 CSVダウンロード</h2>
            <p>エクセルに貼り付け可能なCSVファイルをダウンロードできます。</p>
            <div style="margin: 30px 0; text-align: center;">
                <button class="btn" style="background: #28a745; margin: 10px; padding: 15px 30px;" onclick="downloadStatsCSV()">
                    📈 勤務統計CSV<br><small>スタッフ別の休日数、シフト回数</small>
                </button>
                <button class="btn" style="background: #17a2b8; margin: 10px; padding: 15px 30px;" onclick="downloadScheduleCSV()">
                    📅 シフト表CSV<br><small>ガントチャート形式のシフト表</small>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// CSV ダウンロード機能を追加
function downloadStatsCSV() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthlyRestDays = calculateMonthlyRestDays(year, month);
    
    let csvContent = `${year}年${month + 1}月 勤務統計\n`;
    csvContent += 'スタッフ名,休日数,日勤,遅番,夜勤,スキル\n';
    
    staffData.forEach(staff => {
        const stats = calculateStaffMonthlyStats(staff.id, year, month);
        const restDays = monthlyRestDays[staff.id] || 0;
        const skills = staff.skills.join('・') || 'なし';
        
        csvContent += `${staff.name},${restDays},${stats.day},${stats.late},${stats.night},${skills}\n`;
    });
    
    downloadCSV(csvContent, `勤務統計_${year}年${month + 1}月.csv`);
    document.getElementById('downloadModal').remove();
}

function downloadScheduleCSV() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    let csvContent = `${year}年${month + 1}月 シフト表\n`;
    
    // ヘッダー行
    csvContent += 'スタッフ名';
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        csvContent += `,${day}日(${dayOfWeek})`;
    }
    csvContent += '\n';
    
    // 各スタッフの行
    staffData.forEach(staff => {
        csvContent += staff.name;
        
        for (let day = 1; day <= lastDay; day++) {
            const dateStr = formatDate(new Date(year, month, day));
            let cellContent = '休';
            
            // 希望休みチェック
            if (requestedDaysOff[dateStr] && requestedDaysOff[dateStr].includes(staff.id)) {
                cellContent = '希望休';
            } else if (shiftData[dateStr]) {
                // シフトチェック
                Object.entries(shiftData[dateStr]).forEach(([shiftType, staffIds]) => {
                    if (staffIds.includes(staff.id)) {
                        const shift = SHIFT_TYPES[shiftType.toUpperCase()];
                        cellContent = shift.name;
                    }
                });
            }
            
            // 前日の夜勤チェック（明け）
            const prevDate = new Date(year, month, day - 1);
            const prevDateStr = formatDate(prevDate);
            if (shiftData[prevDateStr] && shiftData[prevDateStr].night && shiftData[prevDateStr].night.includes(staff.id)) {
                if (cellContent === '休') {
                    cellContent = '明け';
                } else {
                    cellContent += '/明け';
                }
            }
            
            csvContent += `,${cellContent}`;
        }
        csvContent += '\n';
    });
    
    downloadCSV(csvContent, `シフト表_${year}年${month + 1}月.csv`);
    document.getElementById('downloadModal').remove();
}

function downloadCSV(content, filename) {
    // BOMを追加して日本語文字化けを防ぐ  
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 1日の詳細ガントチャートを表示
function showDayDetailGantt(dateStr) {
    const selectedDate = new Date(dateStr);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    // 前日、当日、翌日の情報を取得
    const prevDate = new Date(year, month, day - 1);
    const nextDate = new Date(year, month, day + 1);
    const prevDateStr = formatDate(prevDate);
    const nextDateStr = formatDate(nextDate);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'dayDetailModal';
    modal.style.display = 'block';
    
    let html = `
        <div class="modal-content" style="max-width: 95%; width: 1200px; max-height: 90vh; overflow-y: auto;">
            <span class="close" onclick="document.getElementById('dayDetailModal').remove()">&times;</span>
            <h2>🕐 ${month + 1}月${day}日の詳細シフト表 (ダブルクリックで表示)</h2>
            <div style="overflow-x: auto; margin-top: 20px;">
                <table style="width: 100%; border-collapse: collapse; min-width: 1000px;">
                    <thead>
                        <tr>
                            <th rowspan="2" style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa; position: sticky; left: 0; min-width: 120px;">スタッフ</th>
                            <th colspan="24" style="border: 1px solid #ddd; padding: 8px; background: #e9ecef; text-align: center;">${month + 1}月${day - 1}日</th>
                            <th colspan="24" style="border: 1px solid #ddd; padding: 8px; background: #d4edda; text-align: center;">${month + 1}月${day}日 (今日)</th>
                            <th colspan="24" style="border: 1px solid #ddd; padding: 8px; background: #e9ecef; text-align: center;">${month + 1}月${day + 1}日</th>
                        </tr>
                        <tr>
    `;
    
    // 時間ヘッダー (3日分)
    for (let d = 0; d < 3; d++) {
        for (let hour = 0; hour < 24; hour++) {
            const bgColor = d === 1 ? '#d4edda' : '#e9ecef'; // 今日は緑系
            html += `<th style="border: 1px solid #ddd; padding: 2px; font-size: 10px; background: ${bgColor}; min-width: 25px;">${hour}</th>`;
        }
    }
    html += '</tr></thead><tbody>';
    
    // 各スタッフの行
    staffData.forEach(staff => {
        html += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f8f9fa; position: sticky; left: 0; font-weight: bold;">${staff.name}</td>
        `;
        
        // 3日分の時間帯をチェック
        const dates = [prevDateStr, dateStr, nextDateStr];
        dates.forEach((currentDateStr, dayIndex) => {
            for (let hour = 0; hour < 24; hour++) {
                let cellContent = '';
                let cellStyle = 'border: 1px solid #ddd; padding: 1px; text-align: center; font-size: 10px; min-width: 25px;';
                const isToday = dayIndex === 1;
                
                // シフトチェック
                if (shiftData[currentDateStr]) {
                    Object.entries(shiftData[currentDateStr]).forEach(([shiftType, staffIds]) => {
                        if (staffIds.includes(staff.id)) {
                            const shift = SHIFT_TYPES[shiftType.toUpperCase()];
                            let isInShift = false;
                            
                            // シフトの時間帯をチェック
                            switch(shiftType) {
                                case 'day': // 9:00-17:30
                                    isInShift = hour >= 9 && hour < 18;
                                    break;
                                case 'late': // 16:00-24:00
                                    isInShift = hour >= 16 && hour < 24;
                                    break;
                                case 'night': // 23:00-9:00 (翌日)
                                    isInShift = hour >= 23 || hour < 9;
                                    break;
                            }
                            
                            if (isInShift) {
                                cellContent = shift.name.charAt(0); // 日/遅/夜
                                switch(shiftType) {
                                    case 'day':
                                        cellStyle += ' background: #fff3cd; color: #856404;';
                                        break;
                                    case 'late':
                                        cellStyle += ' background: #cce5ff; color: #004085;';
                                        break;
                                    case 'night':
                                        cellStyle += ' background: #d1ecf1; color: #0c5460;';
                                        break;
                                }
                            }
                        }
                    });
                }
                
                // 今日の背景色
                if (isToday && !cellContent) {
                    cellStyle += ' background: #f8fff8;';
                }
                
                html += `<td style="${cellStyle}">${cellContent}</td>`;
            }
        });
        
        html += '</tr>';
    });
    
    html += `
                </tbody>
            </table>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #fff3cd; border: 1px solid #856404;"></div>
                    <span>日勤 (9:00-17:30)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #cce5ff; border: 1px solid #004085;"></div>
                    <span>遅番 (16:00-24:00)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #d1ecf1; border: 1px solid #0c5460;"></div>
                    <span>夜勤 (23:00-翌9:00)</span>
                </div>
            </div>
            <p style="margin-top: 15px; text-align: center; color: #666; font-size: 14px;">
                ※ カレンダーの日付をダブルクリックするとこの表示が開きます
            </p>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 初期化実行
init();