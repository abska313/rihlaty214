// --- INITIAL STATE & CONSTANTS ---
const TOTAL_JOURNEY_DAYS = 214;
const START_WEIGHT = 110.0;
const TARGET_WEIGHT = 85.0;

// Default Habit Schema
const DEFAULT_HABITS = [
  { id: 'chia', label: 'مشروب بذور الشيا والليمون', desc: 'قبل الوجبة الرئيسية بـ 20-30 دقيقة' },
  { id: 'diet', label: 'الالتزام بوجبات اليوم (قاعدة ٨٠٪)', desc: 'خبز قمح كامل / توست + شبع مريح' },
  { id: 'workout', label: 'تمرين المقاومة أو المشي الخفيف', desc: 'دمبلص 12-10-8 أو 20 دقيقة مشي' },
  { id: 'spoon', label: 'الأكل بوعي واستخدام ملعقة صغيرة', desc: 'مضغ بطيء لكسر نوبات الأكل السريع' }
];

// App State
let state = {
  startDate: null,
  weights: [],
  dailyLogs: {} // Keyed by YYYY-MM-DD: { habits: [], water: 0 }
};

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initJourneyDate();
  renderDashboard();
  renderWeights();
  registerServiceWorker();
});

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem('rihlaty214_data');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading data', e);
    }
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem('rihlaty214_data', JSON.stringify(state));
}

// Setup or verify journey start date
function initJourneyDate() {
  const todayStr = getTodayKey();
  if (!state.startDate) {
    state.startDate = todayStr;
    saveState();
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Calculate Day Index (1 to 214)
function getJourneyMetrics() {
  const start = new Date(state.startDate);
  const now = new Date(getTodayKey());
  const diffTime = Math.max(0, now - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const currentDay = Math.min(diffDays, TOTAL_JOURNEY_DAYS);
  const remaining = Math.max(0, TOTAL_JOURNEY_DAYS - currentDay);
  const percentage = Math.min(100, Math.round((currentDay / TOTAL_JOURNEY_DAYS) * 100));

  return { currentDay, remaining, percentage };
}

// --- RENDER DASHBOARD ---
function renderDashboard() {
  const metrics = getJourneyMetrics();
  document.getElementById('currentDayNumber').textContent = metrics.currentDay;
  document.getElementById('daysRemaining').textContent = metrics.remaining;
  document.getElementById('journeyPercent').textContent = metrics.percentage + '%';
  document.getElementById('journeyProgressFill').style.width = metrics.percentage + '%';
  
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('headerDate').textContent = now.toLocaleDateString('ar-IQ', options);

  // Load today's log
  const todayKey = getTodayKey();
  if (!state.dailyLogs[todayKey]) {
    state.dailyLogs[todayKey] = { habits: [], water: 0 };
  }
  const todayLog = state.dailyLogs[todayKey];

  // Render habits checklist
  const habitsContainer = document.getElementById('habitsListContainer');
  habitsContainer.innerHTML = '';

  DEFAULT_HABITS.forEach(habit => {
    const isDone = todayLog.habits.includes(habit.id);
    const div = document.createElement('div');
    div.className = `habit-item ${isDone ? 'done' : ''}`;
    div.onclick = () => toggleHabit(habit.id);

    div.innerHTML = `
      <div class="habit-info">
        <h4>${habit.label}</h4>
        <p>${habit.desc}</p>
      </div>
      <div class="habit-check">${isDone ? '✓' : ''}</div>
    `;
    habitsContainer.appendChild(div);
  });

  // Render Water
  document.getElementById('waterCount').textContent = todayLog.water || 0;

  // Calculate adherence
  const doneHabitsCount = todayLog.habits.length;
  const adherence = Math.round((doneHabitsCount / DEFAULT_HABITS.length) * 100);
  document.getElementById('weeklyScore').textContent = `${adherence}% (الهدف ٨٠٪)`;
}

// --- HABIT & WATER ACTIONS ---
function toggleHabit(habitId) {
  const todayKey = getTodayKey();
  const todayLog = state.dailyLogs[todayKey];
  const idx = todayLog.habits.indexOf(habitId);

  if (idx > -1) {
    todayLog.habits.splice(idx, 1);
  } else {
    todayLog.habits.push(habitId);
  }

  saveState();
  renderDashboard();
}

function updateWater(delta) {
  const todayKey = getTodayKey();
  const todayLog = state.dailyLogs[todayKey];
  todayLog.water = Math.max(0, (todayLog.water || 0) + delta);
  saveState();
  document.getElementById('waterCount').textContent = todayLog.water;
}

// --- WEIGHT TRACKING ---
function recordWeight() {
  const input = document.getElementById('inputWeight');
  const val = parseFloat(input.value);

  if (isNaN(val) || val <= 30 || val >= 300) {
    alert('يرجى كتابة رقم وزن صحيح بالكيلوغرام.');
    return;
  }

  const entry = {
    date: getTodayKey(),
    weight: val
  };

  state.weights.unshift(entry);
  saveState();
  input.value = '';
  renderWeights();
}

function renderWeights() {
  const container = document.getElementById('weightLogContainer');
  container.innerHTML = '';

  if (state.weights.length === 0) {
    container.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">لا يوجد قياسات مسجلة بعد. ابدأ بتسجيل أول وزن أسبوعي.</p>`;
    return;
  }

  state.weights.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-surface); margin-bottom:6px; border-radius:8px; font-size:0.85rem;';
    row.innerHTML = `
      <span>📅 ${item.date}</span>
      <strong style="color:var(--accent-gold);">${item.weight} كغم</strong>
    `;
    container.appendChild(row);
  });
}

// --- WORKOUT REST TIMER ---
let workoutTimerInterval = null;

function startWorkoutTimer(seconds) {
  clearInterval(workoutTimerInterval);
  let timeLeft = seconds;
  const display = document.getElementById('workoutTimer');

  const updateDisplay = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  updateDisplay();

  workoutTimerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
      clearInterval(workoutTimerInterval);
      display.textContent = 'انتهت الراحة! 💪';
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    } else {
      updateDisplay();
    }
  }, 1000);
}

function resetWorkoutTimer() {
  clearInterval(workoutTimerInterval);
  document.getElementById('workoutTimer').textContent = '01:15';
}

// --- EMERGENCY BINGE TIMER ---
let emergencyInterval = null;

function openEmergencyModal() {
  document.getElementById('emergencyModal').classList.add('active');
}

function closeEmergencyModal() {
  clearInterval(emergencyInterval);
  document.getElementById('emergencyModal').classList.remove('active');
  document.getElementById('emergencyTimer').textContent = '05:00';
}

function startEmergencyTimer() {
  clearInterval(emergencyInterval);
  let timeLeft = 300; // 5 minutes
  const display = document.getElementById('emergencyTimer');

  emergencyInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(emergencyInterval);
      display.textContent = 'أحسنت! الموجة انكسرت 🌟';
      if ('vibrate' in navigator) navigator.vibrate([300, 200, 300]);
    }
  }, 1000);
}

// --- NAVIGATION TABS ---
function switchTab(tabId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const activeSec = document.getElementById(`sec-${tabId}`);
  if (activeSec) activeSec.classList.add('active');

  const clickedBtn = event.currentTarget;
  if (clickedBtn) clickedBtn.classList.add('active');
}

// --- BACKUP & EXPORT/IMPORT ---
function exportAppData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `rihlaty214_backup_${getTodayKey()}.json`);
  dlAnchor.click();
}

function importAppData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.startDate && imported.dailyLogs) {
        state = imported;
        saveState();
        renderDashboard();
        renderWeights();
        alert('تم استرجاع البيانات بنجاح!');
      } else {
        alert('ملف النسخة غير متطابق.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء قراءة الملف.');
    }
  };
  reader.readAsText(file);
}

// --- SERVICE WORKER REGISTRATION ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('PWA Service Worker جاهز ومفعل'))
        .catch(err => console.error('Service Worker فشل في التسجيل:', err));
    });
  }
}
