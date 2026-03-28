// ===== ROYAL MATCH - COMPLETE WITH WAGER REQUIREMENT =====
console.log("🎮 Royal Match - Loading...");

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDgxEgtvrugTxXL5l10hvzQBILmqUzWBLA",
  authDomain: "nj777-2756c.firebaseapp.com",
  databaseURL: "https://nj777-2756c-default-rtdb.firebaseio.com",
  projectId: "nj777-2756c",
  storageBucket: "nj777-2756c.appspot.com",
  messagingSenderId: "388549837175",
  appId: "1:388549837175:web:6c831e431443d8227c2172"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ===== CONSTANTS =====
const WAGER_REQUIREMENT_RATE = 0.6; // 60% of balance must be wagered
const DEPOSIT_WAGER_REQUIREMENT_RATE = 0.7; // 70% of deposit must be wagered
const FIRST_WITHDRAWAL_WAGER_REQUIREMENT = 5000;
const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 50000;
const NEW_USER_STARTING_COINS = 0;
const MIN_DEPOSIT_AMOUNT = 100;
const MAX_DEPOSIT_AMOUNT = 50000;

const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 50,
  MIN_DEPOSIT_FOR_COMMISSION: 3000,
  COMMISSION_RATE: 0.10,
  DEPOSIT_BONUS_RATE: 0.025
};

// ===== VIP CONFIG =====
const VIP_CONFIG = {
  levels: [
    { level: 0, requiredSpend: 0, dailyReward: 5, weeklyReward: 35, monthlyReward: 60 },
    { level: 1, requiredSpend: 40000, dailyReward: 10, weeklyReward: 70, monthlyReward: 120 },
    { level: 2, requiredSpend: 80000, dailyReward: 20, weeklyReward: 140, monthlyReward: 240 },
    { level: 3, requiredSpend: 160000, dailyReward: 40, weeklyReward: 280, monthlyReward: 480 },
    { level: 4, requiredSpend: 320000, dailyReward: 80, weeklyReward: 560, monthlyReward: 960 },
    { level: 5, requiredSpend: 640000, dailyReward: 160, weeklyReward: 1120, monthlyReward: 1920 },
    { level: 6, requiredSpend: 1280000, dailyReward: 320, weeklyReward: 2240, monthlyReward: 3840 },
    { level: 7, requiredSpend: 2560000, dailyReward: 640, weeklyReward: 4480, monthlyReward: 7680 },
    { level: 8, requiredSpend: 5120000, dailyReward: 1280, weeklyReward: 8960, monthlyReward: 15360 },
    { level: 9, requiredSpend: 10240000, dailyReward: 2560, weeklyReward: 17920, monthlyReward: 30720 },
    { level: 10, requiredSpend: 20480000, dailyReward: 5120, weeklyReward: 35840, monthlyReward: 61440 }
  ]
};

// ===== MISSION CONFIG =====
const MISSIONS = [
  { id: 'firstGame', title: 'First Game', description: 'Play your first game', reward: 25, icon: '🎮', type: 'play_game', target: 1 },
  { id: 'firstWin', title: 'First Victory', description: 'Win your first game', reward: 50, icon: '🏆', type: 'win_game', target: 1 },
  { id: 'play5Games', title: 'Enthusiast', description: 'Play 5 games', reward: 100, icon: '🎯', type: 'play_game', target: 5 },
  { id: 'win3Games', title: 'Rising Star', description: 'Win 3 games', reward: 150, icon: '⭐', type: 'win_game', target: 3 },
  { id: 'play10Games', title: 'Veteran', description: 'Play 10 games', reward: 250, icon: '🏅', type: 'play_game', target: 10 },
  { id: 'win5Games', title: 'Champion', description: 'Win 5 games', reward: 500, icon: '👑', type: 'win_game', target: 5 },
  { id: 'bigWin', title: 'Big Winner', description: 'Win 500+ coins in one game', reward: 300, icon: '💎', type: 'big_win', target: 500 },
  { id: 'firstDeposit', title: 'First Deposit', description: 'Make your first deposit', reward: 200, icon: '💰', type: 'deposit', target: 1 }
];

// ===== GAME STATE =====
let currentUser = null;
let isInGame = false;
let autoRefreshInterval = null;
let notifications = [];

const gameState = {
  balance: 0,
  currentBet: 0,
  currentWin: 0,
  multiplier: 1,
  pairsMatched: 0,
  isPlaying: false,
  canFlip: false,
  firstCard: null,
  secondCard: null,
  cards: [],
  matchedCards: new Set(),
  totalBets: 0,
  totalWins: 0,
  totalSpent: 0,
  totalWagered: 0,
  pendingWagerRequirement: 0, // New: tracks wager requirement from deposits
  vipLevel: 0,
  firstWithdrawalCompleted: false
};

let rewardState = {
  lastDailyClaim: null,
  lastWeeklyClaim: null,
  lastMonthlyClaim: null,
  dailyStreak: 0
};

let referralData = {
  code: null,
  link: null,
  totalReferrals: 0,
  activeReferrals: 0,
  totalEarnings: 0,
  referrals: []
};

let missionsCompleted = {};
let savedAccounts = { jazzcash: "", easypaisa: "", bank: "" };

// ===== GAME CONFIG =====
const CONFIG = {
  PAIRS_COUNT: 12,
  BOMB_COUNT: 4,
  GOLDEN_COUNT: 2,
  GOLDEN_MULTIPLIER: 20,
  MULTIPLIERS: [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0, 15.0, 22.0, 35.0, 50.0],
  MIN_BET: 10,
  MAX_BET: 5000
};

const CARD_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
const CARD_SUITS = [
  { symbol: '♥', color: 'red' },
  { symbol: '♠', color: 'black' },
  { symbol: '♦', color: 'red' },
  { symbol: '♣', color: 'black' }
];

const pakistaniNames = ['Ahmed Hassan', 'Ali Khan', 'Bilal Ahmed', 'Hassan Ali', 'Muhammad Imran', 'Faisal Khan', 'Karim Abdul', 'Malik Saeed', 'Nasir Ahmed', 'Omar Khan'];
const championAvatars = ['👑', '🥈', '🥉', '🎯', '💎', '🦁', '⭐', '🏆'];

// ===== AUDIO SYSTEM =====
class AudioSystem {
  constructor() { this.muted = false; this.audioContext = null; this.initAudioContext(); }
  initAudioContext() { try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (this.muted || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  playCardFlip() { this.playTone(800, 0.08, 'sine', 0.2); setTimeout(() => this.playTone(600, 0.08, 'sine', 0.15), 40); }
  playMatch() { const notes = [523, 659, 784, 1047]; notes.forEach((note, i) => setTimeout(() => this.playTone(note, 0.15, 'sine', 0.25), i * 80)); }
  playWin() { const melody = [523, 659, 784, 1047, 1319, 1568]; melody.forEach((note, i) => setTimeout(() => this.playTone(note, 0.25, 'sine', 0.3), i * 100)); }
  playBomb() { this.playTone(150, 0.4, 'sawtooth', 0.4); setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.3), 80); setTimeout(() => this.playTone(80, 0.2, 'sawtooth', 0.2), 160); }
  playClick() { this.playTone(1000, 0.04, 'sine', 0.15); }
  playCashout() { const notes = [784, 988, 1175, 1568]; notes.forEach((note, i) => setTimeout(() => this.playTone(note, 0.2, 'sine', 0.3), i * 60)); }
  playShuffle() { for (let i = 0; i < 5; i++) { setTimeout(() => this.playTone(200 + Math.random() * 400, 0.05, 'sine', 0.1), i * 50); } }
  playError() { this.playTone(300, 0.2, 'sawtooth', 0.2); setTimeout(() => this.playTone(250, 0.15, 'sawtooth', 0.2), 150); }
  toggle() { this.muted = !this.muted; const soundToggle = document.getElementById('soundToggle'); if (soundToggle) soundToggle.classList.toggle('active', !this.muted); return this.muted; }
}
const audio = new AudioSystem();

// ===== HELPER FUNCTIONS =====
function formatNumber(num) { if (num === undefined || num === null) return '0'; if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'; if (num >= 1000) return (num / 1000).toFixed(1) + 'K'; return num.toLocaleString(); }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showPopup(title, text) { const popupTitle = document.getElementById('popupTitle'); const popupMessage = document.getElementById('popupMessage'); const successPopup = document.getElementById('successPopup'); if (popupTitle) popupTitle.textContent = title; if (popupMessage) popupMessage.textContent = text; if (successPopup) successPopup.classList.add('active'); setTimeout(() => { if (successPopup) successPopup.classList.remove('active'); }, 3000); }
function closePopup() { const successPopup = document.getElementById('successPopup'); if (successPopup) successPopup.classList.remove('active'); }

// ===== WAGER SYSTEM =====
function calculateRequiredWagered() {
  // Total required = 60% of balance + 70% of pending deposit wager
  const balanceRequired = Math.floor(gameState.balance * WAGER_REQUIREMENT_RATE);
  return Math.max(balanceRequired, gameState.pendingWagerRequirement || 0);
}

function getWagerProgress() {
  const required = calculateRequiredWagered();
  if (required <= 0) return 100;
  return Math.min(100, Math.max(0, (gameState.totalWagered / required) * 100));
}

function canWithdraw() {
  const requiredWagered = calculateRequiredWagered();
  const wagerMet = gameState.totalWagered >= requiredWagered;
  if (!gameState.firstWithdrawalCompleted) {
    const firstWagerMet = gameState.totalWagered >= FIRST_WITHDRAWAL_WAGER_REQUIREMENT;
    return { canWithdraw: firstWagerMet, reason: firstWagerMet ? null : `First withdrawal requires ${formatNumber(FIRST_WITHDRAWAL_WAGER_REQUIREMENT)} coins wagered. Current: ${formatNumber(gameState.totalWagered)}` };
  }
  return { canWithdraw: wagerMet, reason: wagerMet ? null : `Need to wager ${formatNumber(requiredWagered - gameState.totalWagered)} more coins (${Math.floor(getWagerProgress())}% complete)` };
}

function updateWagerUI() {
  const requiredWagered = calculateRequiredWagered();
  const progress = getWagerProgress();
  const profileTotalWagered = document.getElementById('profileTotalWagered');
  const profileRequiredWagered = document.getElementById('profileRequiredWagered');
  const wagerProgressFill = document.getElementById('wagerProgressFill');
  const wagerStatusText = document.getElementById('wagerStatusText');
  if (profileTotalWagered) profileTotalWagered.textContent = formatNumber(gameState.totalWagered);
  if (profileRequiredWagered) profileRequiredWagered.textContent = formatNumber(requiredWagered);
  if (wagerProgressFill) wagerProgressFill.style.width = progress + '%';
  if (wagerStatusText) {
    const result = canWithdraw();
    if (!gameState.firstWithdrawalCompleted) {
      wagerStatusText.innerHTML = `⚠️ First withdrawal: ${formatNumber(FIRST_WITHDRAWAL_WAGER_REQUIREMENT)} wagered needed`;
    } else if (result.canWithdraw) {
      wagerStatusText.innerHTML = '✅ You can withdraw!';
      wagerStatusText.style.color = '#10b981';
    } else {
      wagerStatusText.innerHTML = `⏳ Need ${formatNumber(requiredWagered - gameState.totalWagered)} more wagered (${Math.floor(progress)}%)`;
      wagerStatusText.style.color = '#ffaa44';
    }
  }
}

async function addWageredAmount(amount) {
  if (!currentUser || currentUser.isGuest) return;
  gameState.totalWagered += amount;
  await updateUserDataInFirebase(currentUser.id, { totalWagered: gameState.totalWagered });
  updateWagerUI();
}

// ===== VIP FUNCTIONS =====
function calculateVIPLevel(totalSpent) { let level = 0; for (let i = VIP_CONFIG.levels.length - 1; i >= 0; i--) { if (totalSpent >= VIP_CONFIG.levels[i].requiredSpend) { level = VIP_CONFIG.levels[i].level; break; } } return level; }
function getVIPRewards(level) { return VIP_CONFIG.levels.find(v => v.level === level) || VIP_CONFIG.levels[0]; }
async function updateVIPLevel(userId, totalSpent) { const newLevel = calculateVIPLevel(totalSpent); if (newLevel > gameState.vipLevel) { sendNotificationToPlayer(userId, '👑 VIP Level Up!', `You reached VIP Level ${newLevel}!`, '👑'); showPopup('VIP Level Up!', `Congratulations! You're now VIP Level ${newLevel}!`); } gameState.vipLevel = newLevel; await updateUserDataInFirebase(userId, { vipLevel: newLevel, totalSpent: totalSpent }); return newLevel; }

// ===== MISSION FUNCTIONS =====
async function loadMissionsProgress() { if (!currentUser || currentUser.isGuest) return; const snapshot = await database.ref('users/' + currentUser.id + '/missions').once('value'); const data = snapshot.val(); if (data) missionsCompleted = data; renderMissions(); }
async function saveMissionsProgress() { if (!currentUser || currentUser.isGuest) return; await database.ref('users/' + currentUser.id + '/missions').set(missionsCompleted); }
async function checkMissionProgress(type, value = 0) { if (!currentUser || currentUser.isGuest) return; let updated = false; for (const mission of MISSIONS) { if (mission.type !== type) continue; if (missionsCompleted[mission.id]) continue; if (missionsCompleted[`${mission.id}_claimed`]) continue; let progress = missionsCompleted[`${mission.id}_progress`] || 0; let newProgress = progress + (value || 1); if (type === 'big_win' && value >= mission.target) { newProgress = mission.target; } if (newProgress >= mission.target) { missionsCompleted[mission.id] = true; updated = true; sendNotificationToPlayer(currentUser.id, '🎯 Mission Complete!', `${mission.title} completed! Click to claim ${mission.reward} coins!`, mission.icon); showPopup('Mission Complete!', `${mission.icon} ${mission.title} completed! Go to Missions to claim your ${mission.reward} coins!`); } else { missionsCompleted[`${mission.id}_progress`] = newProgress; } } if (updated) { await saveMissionsProgress(); renderMissions(); } }
function renderMissions() { const container = document.getElementById('missionsContent'); if (!container) return; let html = ''; for (const mission of MISSIONS) { const completed = missionsCompleted[mission.id]; const claimed = missionsCompleted[`${mission.id}_claimed`]; const progress = missionsCompleted[`${mission.id}_progress`] || 0; const percent = Math.min(100, (progress / mission.target) * 100); if (claimed) { html += `<div class="mission-card claimed"><div class="mission-header"><span class="mission-icon">${mission.icon}</span><span class="mission-title">${mission.title}</span><span class="mission-badge claimed">✓ Claimed</span></div><div class="mission-desc">${mission.description}</div><div class="mission-reward-display">+${mission.reward} coins</div><button class="mission-claim-btn disabled" disabled>Already Claimed</button></div>`; } else if (completed) { html += `<div class="mission-card ready"><div class="mission-header"><span class="mission-icon">${mission.icon}</span><span class="mission-title">${mission.title}</span><span class="mission-badge ready">✓ Ready to Claim!</span></div><div class="mission-desc">${mission.description}</div><div class="mission-reward-display">+${mission.reward} coins</div><button class="mission-claim-btn claim" onclick="claimMissionReward('${mission.id}')">Collect Reward</button></div>`; } else { html += `<div class="mission-card"><div class="mission-header"><span class="mission-icon">${mission.icon}</span><span class="mission-title">${mission.title}</span><span class="mission-badge">${progress}/${mission.target}</span></div><div class="mission-desc">${mission.description}</div><div class="mission-reward-display">Reward: +${mission.reward} coins</div><div class="mission-progress-bar"><div class="mission-progress-fill" style="width: ${percent}%"></div></div><div class="mission-progress-text">${progress}/${mission.target} completed</div><button class="mission-claim-btn disabled" disabled>In Progress</button></div>`; } } container.innerHTML = html; }
async function claimMissionReward(missionId) { if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login to claim rewards'); return; } if (!missionsCompleted[missionId]) { showPopup('Not Completed', 'Complete this mission first!'); return; } if (missionsCompleted[`${missionId}_claimed`]) { showPopup('Already Claimed', 'You already claimed this reward'); return; } const mission = MISSIONS.find(m => m.id === missionId); if (!mission) return; gameState.balance += mission.reward; missionsCompleted[`${missionId}_claimed`] = true; await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance }); await saveMissionsProgress(); updateUI(); renderMissions(); showPopup('Reward Claimed!', `You received ${mission.reward} coins for ${mission.title}!`); if (audio) audio.playWin(); }

// ===== DAILY REWARDS =====
async function loadRewardState() { if (!currentUser || currentUser.isGuest) return; const snapshot = await database.ref('users/' + currentUser.id + '/rewards').once('value'); const data = snapshot.val(); if (data) rewardState = { ...rewardState, ...data }; updateRewardUI(); }
async function saveRewardState() { if (!currentUser || currentUser.isGuest) return; await database.ref('users/' + currentUser.id + '/rewards').set(rewardState); }
function canClaimDaily() { if (!rewardState.lastDailyClaim) return true; const last = new Date(rewardState.lastDailyClaim); const today = new Date(); return last.getDate() !== today.getDate() || last.getMonth() !== today.getMonth() || last.getFullYear() !== today.getFullYear(); }
function canClaimWeekly() { if (!rewardState.lastWeeklyClaim) return true; const daysDiff = Math.floor((new Date() - new Date(rewardState.lastWeeklyClaim)) / (1000 * 60 * 60 * 24)); return daysDiff >= 7; }
function canClaimMonthly() { if (!rewardState.lastMonthlyClaim) return true; const last = new Date(rewardState.lastMonthlyClaim); const today = new Date(); return last.getMonth() !== today.getMonth() || last.getFullYear() !== today.getFullYear(); }
async function claimDailyReward() { if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login'); return; } if (!canClaimDaily()) { showPopup('Already Claimed', 'Come back tomorrow'); return; } const reward = getVIPRewards(gameState.vipLevel).dailyReward; gameState.balance += reward; rewardState.lastDailyClaim = new Date().toISOString(); await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance }); await saveRewardState(); updateUI(); updateRewardUI(); showPopup('Daily Reward!', `+${reward} coins!`); if (audio) audio.playWin(); }
async function claimWeeklyReward() { if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login'); return; } if (!canClaimWeekly()) { showPopup('Already Claimed', 'Next week'); return; } const reward = getVIPRewards(gameState.vipLevel).weeklyReward; gameState.balance += reward; rewardState.lastWeeklyClaim = new Date().toISOString(); await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance }); await saveRewardState(); updateUI(); updateRewardUI(); showPopup('Weekly Reward!', `+${reward} coins!`); if (audio) audio.playWin(); }
async function claimMonthlyReward() { if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login'); return; } if (!canClaimMonthly()) { showPopup('Already Claimed', 'Next month'); return; } const reward = getVIPRewards(gameState.vipLevel).monthlyReward; gameState.balance += reward; rewardState.lastMonthlyClaim = new Date().toISOString(); await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance }); await saveRewardState(); updateUI(); updateRewardUI(); showPopup('Monthly Reward!', `+${reward} coins!`); if (audio) audio.playWin(); }
function updateRewardUI() { const rewards = getVIPRewards(gameState.vipLevel); document.getElementById('dailyRewardAmount').textContent = rewards.dailyReward; document.getElementById('weeklyRewardAmount').textContent = rewards.weeklyReward; document.getElementById('monthlyRewardAmount').textContent = rewards.monthlyReward; const dailyBtn = document.getElementById('claimDailyBtn'); const weeklyBtn = document.getElementById('claimWeeklyBtn'); const monthlyBtn = document.getElementById('claimMonthlyBtn'); const dailyCd = document.getElementById('dailyCooldown'); const weeklyCd = document.getElementById('weeklyCooldown'); const monthlyCd = document.getElementById('monthlyCooldown'); if (canClaimDaily()) { dailyBtn.disabled = false; if(dailyCd) dailyCd.textContent = 'Ready!'; } else { dailyBtn.disabled = true; if(dailyCd && rewardState.lastDailyClaim) dailyCd.textContent = `Available: ${new Date(new Date(rewardState.lastDailyClaim).setDate(new Date(rewardState.lastDailyClaim).getDate()+1)).toLocaleDateString()}`; } if (canClaimWeekly()) { weeklyBtn.disabled = false; if(weeklyCd) weeklyCd.textContent = 'Ready!'; } else { weeklyBtn.disabled = true; if(weeklyCd && rewardState.lastWeeklyClaim) weeklyCd.textContent = `Available: ${new Date(new Date(rewardState.lastWeeklyClaim).setDate(new Date(rewardState.lastWeeklyClaim).getDate()+7)).toLocaleDateString()}`; } if (canClaimMonthly()) { monthlyBtn.disabled = false; if(monthlyCd) monthlyCd.textContent = 'Ready!'; } else { monthlyBtn.disabled = true; if(monthlyCd && rewardState.lastMonthlyClaim) monthlyCd.textContent = `Available: ${new Date(new Date(rewardState.lastMonthlyClaim).setMonth(new Date(rewardState.lastMonthlyClaim).getMonth()+1)).toLocaleDateString()}`; } }
function updateVIPUI() { document.getElementById('vipLevelDisplay').textContent = gameState.vipLevel; document.getElementById('totalSpentDisplay').textContent = formatNumber(gameState.totalSpent); document.getElementById('profileVipBadge').textContent = `VIP ${gameState.vipLevel}`; document.getElementById('profileVipLevel').textContent = gameState.vipLevel; document.getElementById('profileTotalSpent').textContent = formatNumber(gameState.totalSpent); const nextVIP = VIP_CONFIG.levels.find(v => v.level === gameState.vipLevel + 1); if (nextVIP) { document.getElementById('nextVipAmount').textContent = formatNumber(nextVIP.requiredSpend); document.getElementById('profileNextVip').textContent = formatNumber(nextVIP.requiredSpend - gameState.totalSpent); const prevRequired = gameState.vipLevel > 0 ? VIP_CONFIG.levels[gameState.vipLevel].requiredSpend : 0; const progress = ((gameState.totalSpent - prevRequired) / (nextVIP.requiredSpend - prevRequired)) * 100; document.getElementById('vipProgressBar').style.width = Math.min(100, Math.max(0, progress)) + '%'; } else { document.getElementById('nextVipAmount').textContent = 'MAX'; document.getElementById('vipProgressBar').style.width = '100%'; } const vipTable = document.getElementById('vipTable'); if (vipTable) { let html = '<div class="vip-row header"><span>VIP Level</span><span>Daily</span><span>Weekly</span><span>Monthly</span><span>Required Spend</span></div>'; VIP_CONFIG.levels.forEach(vip => { html += `<div class="vip-row ${vip.level === gameState.vipLevel ? 'current' : ''}"><span>VIP ${vip.level}</span><span>${vip.dailyReward}</span><span>${vip.weeklyReward}</span><span>${vip.monthlyReward}</span><span>${formatNumber(vip.requiredSpend)}</span></div>`; }); vipTable.innerHTML = html; } }

// ===== FIREBASE FUNCTIONS =====
async function getUserDataFromFirebase(userId) { try { const snapshot = await database.ref('users/' + userId).once('value'); return snapshot.val(); } catch (error) { console.error("Error loading user data:", error); return null; } }
async function updateUserDataInFirebase(userId, updates) { try { await database.ref('users/' + userId).update(updates); return true; } catch (error) { console.error("Error updating user data:", error); return false; } }
function sendNotificationToPlayer(userId, title, message, icon = '📢') { database.ref('notifications/' + userId).push().set({ title, message, icon, read: false, timestamp: new Date().toISOString() }); }

// ===== REFERRAL FUNCTIONS =====
function generateReferralCode(username) { const prefix = username.substring(0, 3).toUpperCase(); const randomNum = Math.floor(Math.random() * 9000 + 1000); return `${prefix}${randomNum}`; }
async function createReferralCode(userId, username) { const referralCode = generateReferralCode(username); await updateUserDataInFirebase(userId, { referralCode: referralCode, referralCount: 0, referralEarnings: 0, activeReferrals: 0 }); return referralCode; }
function getReferralCodeFromURL() { const urlParams = new URLSearchParams(window.location.search); return urlParams.get('ref'); }
async function applyReferral(referralCode, newUserId, newUsername) { if (!referralCode) return null; try { const usersSnap = await database.ref('users').once('value'); const users = usersSnap.val(); let referrerId = null; for (const [id, user] of Object.entries(users)) { if (user.referralCode === referralCode && id !== newUserId) { referrerId = id; break; } } if (referrerId) { await updateUserDataInFirebase(newUserId, { referredBy: referrerId, referredAt: new Date().toISOString() }); const referrerData = users[referrerId]; await updateUserDataInFirebase(referrerId, { referralCount: (referrerData.referralCount || 0) + 1, coins: (referrerData.coins || 0) + REFERRAL_CONFIG.SIGNUP_BONUS, referralEarnings: (referrerData.referralEarnings || 0) + REFERRAL_CONFIG.SIGNUP_BONUS }); await database.ref('referrals').push({ referrerId: referrerId, referrerUsername: referrerData.username, referredUserId: newUserId, referredUsername: newUsername, status: 'pending', signupBonusPaid: true, timestamp: new Date().toISOString() }); sendNotificationToPlayer(referrerId, '🎉 New Referral!', `${newUsername} signed up! You earned ${REFERRAL_CONFIG.SIGNUP_BONUS} coins!`, '🎉'); if (currentUser && currentUser.id === referrerId) { gameState.balance = (referrerData.coins || 0) + REFERRAL_CONFIG.SIGNUP_BONUS; updateUI(); loadReferralData(); } return referrerId; } return null; } catch (error) { console.error("Error applying referral:", error); return null; } }
async function checkAndPayReferralCommission(userId, depositAmount) { try { const userSnap = await database.ref('users/' + userId).once('value'); const userData = userSnap.val(); if (!userData.referredBy) return; if (depositAmount < REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION) return; const referralsSnap = await database.ref('referrals').orderByChild('referredUserId').equalTo(userId).once('value'); let referralRecord = null, referralId = null; if (referralsSnap.val()) { for (const [id, ref] of Object.entries(referralsSnap.val())) { if (ref.referredUserId === userId && ref.status === 'pending') { referralRecord = ref; referralId = id; break; } } } if (!referralRecord) return; const commission = Math.floor(depositAmount * REFERRAL_CONFIG.COMMISSION_RATE); const referrerRef = database.ref('users/' + referralRecord.referrerId); const referrerSnap = await referrerRef.once('value'); const referrerData = referrerSnap.val(); await referrerRef.update({ coins: (referrerData.coins || 0) + commission, referralEarnings: (referrerData.referralEarnings || 0) + commission, activeReferrals: (referrerData.activeReferrals || 0) + 1 }); await database.ref('referrals/' + referralId).update({ status: 'active', depositAmount: depositAmount, commissionEarned: commission, commissionPaid: true, paidAt: new Date().toISOString() }); sendNotificationToPlayer(referralRecord.referrerId, '💰 Commission Earned!', `${userData.username} deposited ${depositAmount} coins! You earned ${commission} coins!`, '💰'); if (currentUser && currentUser.id === referralRecord.referrerId) { gameState.balance = (referrerData.coins || 0) + commission; referralData.totalEarnings = (referrerData.referralEarnings || 0) + commission; referralData.activeReferrals = (referrerData.activeReferrals || 0) + 1; updateUI(); loadReferralData(); } } catch (error) { console.error("Error paying referral commission:", error); } }
async function loadReferralData() { if (!currentUser || currentUser.isGuest) return; try { const userData = await getUserDataFromFirebase(currentUser.id); if (!userData) return; referralData.code = userData.referralCode; referralData.totalReferrals = userData.referralCount || 0; referralData.activeReferrals = userData.activeReferrals || 0; referralData.totalEarnings = userData.referralEarnings || 0; referralData.link = `${window.location.origin}/?ref=${referralData.code}`; const referralsSnap = await database.ref('referrals').orderByChild('referrerId').equalTo(currentUser.id).once('value'); const referrals = referralsSnap.val(); referralData.referrals = referrals ? Object.values(referrals).map(r => ({ username: r.referredUsername, status: r.status, depositAmount: r.depositAmount || 0, commissionEarned: r.commissionEarned || 0, joined: r.timestamp })) : []; updateReferralUI(); } catch (error) { console.error("Error loading referral data:", error); } }
function updateReferralUI() { document.getElementById('referralCodeDisplay').textContent = referralData.code || 'Loading...'; document.getElementById('referralLinkInput').value = referralData.link || ''; document.getElementById('totalReferrals').textContent = referralData.totalReferrals; document.getElementById('activeReferrals').textContent = referralData.activeReferrals; document.getElementById('totalEarnings').textContent = formatNumber(referralData.totalEarnings); const tbody = document.getElementById('referralsBody'); if (tbody) { if (referralData.referrals.length === 0) { tbody.innerHTML = ' <td colspan="5" style="text-align:center;">No referrals yet<\/td><\/tr>'; } else { tbody.innerHTML = referralData.referrals.map(r => `   <td>${escapeHtml(r.username)}<\/td><td><span class="status-badge ${r.status === 'active' ? 'approved' : 'pending'}">${r.status === 'active' ? 'Active' : 'Pending'}<\/span><\/td><td class="amount-positive">${formatNumber(r.depositAmount)}<\/td><td class="amount-positive">${formatNumber(r.commissionEarned)}<\/td><td>${new Date(r.joined).toLocaleDateString()}<\/td><\/tr>`).join(''); } } }
function copyReferralCode() { if (referralData.code) { navigator.clipboard.writeText(referralData.code); showPopup('Copied!', 'Referral code copied'); } }
function copyReferralLink() { if (referralData.link) { navigator.clipboard.writeText(referralData.link); showPopup('Copied!', 'Referral link copied'); } }
function filterReferrals(filter) { const tbody = document.getElementById('referralsBody'); if (!tbody) return; let filtered = referralData.referrals; if (filter === 'active') filtered = referralData.referrals.filter(r => r.status === 'active'); if (filter === 'pending') filtered = referralData.referrals.filter(r => r.status !== 'active'); if (filtered.length === 0) { tbody.innerHTML = ' <td colspan="5" style="text-align:center;">No referrals found<\/td><\/tr>'; } else { tbody.innerHTML = filtered.map(r => `   <td>${escapeHtml(r.username)}<\/td><td><span class="status-badge ${r.status === 'active' ? 'approved' : 'pending'}">${r.status === 'active' ? 'Active' : 'Pending'}<\/span><\/td><td class="amount-positive">${formatNumber(r.depositAmount)}<\/td><td class="amount-positive">${formatNumber(r.commissionEarned)}<\/td><td>${new Date(r.joined).toLocaleDateString()}<\/td><\/tr>`).join(''); } document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); if (event && event.target) event.target.classList.add('active'); }

// ===== SHOP FUNCTIONS WITH DEPOSIT WAGER REQUIREMENT =====
function purchaseCoins(amount, coins) {
  if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login'); return; }
  if (amount < MIN_DEPOSIT_AMOUNT) { showPopup('Error', `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} coins`); return; }
  if (amount > MAX_DEPOSIT_AMOUNT) { showPopup('Error', `Maximum deposit is ${MAX_DEPOSIT_AMOUNT} coins`); return; }
  
  const bonusCoins = Math.floor(coins * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE);
  const totalCoins = coins + bonusCoins;
  
  // Calculate wager requirement for this deposit (70% of deposited amount)
  const depositWagerRequired = Math.floor(amount * DEPOSIT_WAGER_REQUIREMENT_RATE);
  
  gameState.balance += totalCoins;
  gameState.totalSpent += coins;
  gameState.pendingWagerRequirement = (gameState.pendingWagerRequirement || 0) + depositWagerRequired;
  
  updateUI();
  updateVIPLevel(currentUser.id, gameState.totalSpent);
  
  database.ref('transactions').push().set({
    userId: currentUser.id, username: currentUser.username, amount: amount, coins: coins,
    bonusCoins: bonusCoins, totalCoins: totalCoins, type: 'purchase', 
    wagerRequirement: depositWagerRequired,
    timestamp: new Date().toISOString()
  });
  
  updateUserDataInFirebase(currentUser.id, { 
    coins: gameState.balance, 
    totalSpent: gameState.totalSpent, 
    vipLevel: gameState.vipLevel, 
    totalDeposits: (currentUser.totalDeposits || 0) + amount,
    pendingWagerRequirement: gameState.pendingWagerRequirement
  });
  
  showPopup('Purchase Successful!', `+${formatNumber(totalCoins)} coins! You need to wager ${formatNumber(depositWagerRequired)} coins (70% of deposit) before withdrawal.`);
  
  if (totalCoins >= REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION) {
    checkAndPayReferralCommission(currentUser.id, totalCoins);
  }
  
  // Check first deposit mission
  if ((currentUser.totalDeposits || 0) === 0) {
    checkMissionProgress('deposit');
  }
  
  closeShop();
  if (audio) audio.playClick();
}

function renderShopGrid() {
  const shopGrid = document.getElementById('shopGrid');
  if (!shopGrid) return;
  const bonusRate = REFERRAL_CONFIG.DEPOSIT_BONUS_RATE * 100;
  const shopItems = [
    { amount: 100, coins: 100 },
    { amount: 500, coins: 500 },
    { amount: 1000, coins: 1000 },
    { amount: 3000, coins: 3000, featured: true },
    { amount: 5000, coins: 5000 },
    { amount: 10000, coins: 10000 },
    { amount: 20000, coins: 20000 },
    { amount: 30000, coins: 30000 },
    { amount: 40000, coins: 40000 },
    { amount: 50000, coins: 50000, featured: true }
  ];
  
  shopGrid.innerHTML = shopItems.map(item => `
    <div class="shop-card ${item.featured ? 'featured' : ''}" onclick="purchaseCoins(${item.amount}, ${item.coins})">
      <div class="shop-icon">💰</div>
      <div class="shop-amount">₨${item.amount}</div>
      <div class="shop-coins">${formatNumber(item.coins)} Coins</div>
      <div class="shop-bonus">+${formatNumber(Math.floor(item.coins * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE))} Bonus (${bonusRate}%)</div>
      <div class="shop-total">Total: ${formatNumber(item.coins + Math.floor(item.coins * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE))} Coins</div>
      <div class="shop-wager-requirement">Wager Required: ${formatNumber(Math.floor(item.amount * DEPOSIT_WAGER_REQUIREMENT_RATE))} coins (70%)</div>
      <button class="shop-btn">BUY NOW</button>
    </div>
  `).join('');
  
  const paymentGrid = document.getElementById('paymentMethodsGrid');
  if (paymentGrid) {
    paymentGrid.innerHTML = `
      <div class="payment-card" onclick="showPopup('Payment', 'JazzCash payment coming soon')"><div class="payment-icon">📱</div><div class="payment-name">JazzCash</div><div class="payment-desc">+${bonusRate}% bonus</div></div>
      <div class="payment-card" onclick="showPopup('Payment', 'Easypaisa coming soon')"><div class="payment-icon">💳</div><div class="payment-name">Easypaisa</div><div class="payment-desc">+${bonusRate}% bonus</div></div>
      <div class="payment-card" onclick="showPopup('Payment', 'Bank Transfer coming soon')"><div class="payment-icon">🏦</div><div class="payment-name">Bank Transfer</div><div class="payment-desc">+${bonusRate}% bonus</div></div>
    `;
  }
}

function openShop() { renderShopGrid(); document.getElementById('shopSection').classList.add('active'); if(audio) audio.playClick(); }
function closeShop() { document.getElementById('shopSection').classList.remove('active'); if(audio) audio.playClick(); }

// ===== WITHDRAW FUNCTIONS =====
async function saveWithdrawalAccounts() { if (!currentUser || currentUser.isGuest) { showPopup('Error', 'Please login'); return; } const jazzcash = document.getElementById('jazzcashNumber')?.value.trim(); const easypaisa = document.getElementById('easypaisaNumber')?.value.trim(); const bank = document.getElementById('bankAccount')?.value.trim(); const accounts = {}; if (jazzcash) accounts.jazzcash = jazzcash; if (easypaisa) accounts.easypaisa = easypaisa; if (bank) accounts.bank = bank; if (Object.keys(accounts).length === 0) { showPopup('Error', 'Enter at least one account'); return; } await updateUserDataInFirebase(currentUser.id, { withdrawalAccounts: accounts }); savedAccounts = accounts; showPopup('Success', 'Accounts saved'); }
async function loadWithdrawalAccounts() { if (!currentUser || currentUser.isGuest) return; const userData = await getUserDataFromFirebase(currentUser.id); if (userData && userData.withdrawalAccounts) { savedAccounts = userData.withdrawalAccounts; document.getElementById('jazzcashNumber').value = savedAccounts.jazzcash || ''; document.getElementById('easypaisaNumber').value = savedAccounts.easypaisa || ''; document.getElementById('bankAccount').value = savedAccounts.bank || ''; } }
function updateWithdrawPopup() { const method = document.getElementById('withdrawMethod')?.value; const accountDisplay = document.getElementById('accountDisplay'); const wagerInfo = document.getElementById('withdrawWagerInfo'); if (method && accountDisplay) { if (savedAccounts[method]) accountDisplay.innerHTML = `Account: ${savedAccounts[method]}`; else accountDisplay.innerHTML = 'No account saved. Add in profile.'; } if (wagerInfo) { const result = canWithdraw(); if (!gameState.firstWithdrawalCompleted) wagerInfo.innerHTML = `<div style="color:#ffaa44;">⚠️ First withdrawal: need ${formatNumber(FIRST_WITHDRAWAL_WAGER_REQUIREMENT)} wagered</div>`; else if (result.canWithdraw) wagerInfo.innerHTML = `<div style="color:#10b981;">✅ Wager requirement met! (${formatNumber(gameState.totalWagered)}/${formatNumber(calculateRequiredWagered())})</div>`; else wagerInfo.innerHTML = `<div style="color:#ffaa44;">⏳ Need ${formatNumber(calculateRequiredWagered() - gameState.totalWagered)} more wagered (${Math.floor(getWagerProgress())}%)</div>`; } }
function openWithdraw() { if (!currentUser || currentUser.isGuest) { showPopup('Login Required', 'Please login'); openAuthModal('login'); return; } const result = canWithdraw(); if (!result.canWithdraw) { showPopup('Cannot Withdraw', result.reason); return; } document.getElementById('withdrawBalance').textContent = formatNumber(gameState.balance); document.getElementById('withdrawPopup').classList.add('active'); updateWithdrawPopup(); if(audio) audio.playClick(); }
function closeWithdrawPopup() { document.getElementById('withdrawPopup').classList.remove('active'); document.getElementById('withdrawAmount').value = ''; }
async function processWithdraw() { const amount = parseInt(document.getElementById('withdrawAmount')?.value); const method = document.getElementById('withdrawMethod')?.value; if (!amount || amount < MIN_WITHDRAWAL) { showPopup('Error', `Minimum: ${MIN_WITHDRAWAL} coins`); return; } if (amount > MAX_WITHDRAWAL) { showPopup('Error', `Maximum: ${MAX_WITHDRAWAL} coins`); return; } if (amount > gameState.balance) { showPopup('Error', 'Insufficient balance'); return; } if (!savedAccounts[method]) { showPopup('Error', 'Save account in profile first'); openProfile(); return; } const result = canWithdraw(); if (!result.canWithdraw) { showPopup('Cannot Withdraw', result.reason); return; } await database.ref('withdrawals').push().set({ userId: currentUser.id, username: currentUser.username, amount: amount, method: method, accountNumber: savedAccounts[method], status: 'pending', timestamp: new Date().toISOString(), wagerStatus: { totalWagered: gameState.totalWagered, requiredWagered: calculateRequiredWagered(), firstWithdrawal: !gameState.firstWithdrawalCompleted } }); showPopup('Request Submitted', `Withdrawal request for ${formatNumber(amount)} coins sent to admin`); closeWithdrawPopup(); }

// ===== NOTIFICATION FUNCTIONS WITH FIXED DELETION =====
function loadNotifications() { if (!currentUser || currentUser.isGuest) return; database.ref('notifications/' + currentUser.id).on('value', snapshot => { const notifs = snapshot.val(); if (notifs) { notifications = Object.entries(notifs).map(([id, n]) => ({ ...n, id })).reverse(); updateNotificationBadge(); renderNotifications(); } }); }
function updateNotificationBadge() { const unreadCount = notifications.filter(n => !n.read).length; const badge = document.getElementById('notificationBadge'); const badgeSmall = document.getElementById('notificationBadgeSmall'); if (unreadCount > 0) { if (badge) { badge.style.display = 'block'; badge.textContent = unreadCount > 9 ? '9+' : unreadCount; } if (badgeSmall) { badgeSmall.style.display = 'inline-block'; badgeSmall.textContent = unreadCount > 9 ? '9+' : unreadCount; } } else { if (badge) badge.style.display = 'none'; if (badgeSmall) badgeSmall.style.display = 'none'; } }
function renderNotifications() { const container = document.getElementById('notificationList'); if (!container) return; if (notifications.length === 0) { container.innerHTML = '<div class="notification-item"><div class="notification-icon">📭</div><div class="notification-content"><div class="notification-title">No Notifications</div><div class="notification-message">You have no new notifications</div></div></div>'; return; } container.innerHTML = notifications.map(n => `<div class="notification-item ${!n.read ? 'unread' : ''}" onclick="markNotificationRead('${n.id}')"><div class="notification-icon">${n.icon || '📢'}</div><div class="notification-content"><div class="notification-title">${n.title}</div><div class="notification-message">${n.message}</div><div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div></div><button class="delete-notification" onclick="event.stopPropagation(); deleteNotification('${n.id}')">×</button></div>`).join(''); }
function openNotificationPanel() { document.getElementById('notificationPanel').classList.add('open'); markAllNotificationsRead(); if(audio) audio.playClick(); }
function closeNotificationPanel() { document.getElementById('notificationPanel').classList.remove('open'); }
async function deleteNotification(notificationId) { if(currentUser && !currentUser.isGuest) { try { await database.ref('notifications/' + currentUser.id + '/' + notificationId).remove(); showPopup('Deleted', 'Notification removed'); refreshUserData(); } catch(e) { console.error("Error deleting notification:", e); } } }
async function deleteAllNotifications() { if(confirm('Delete all notifications?')) { try { await database.ref('notifications/' + currentUser.id).remove(); showPopup('All Deleted', 'All notifications removed'); refreshUserData(); } catch(e) { console.error("Error deleting all notifications:", e); } } }
async function markNotificationRead(notificationId) { if(currentUser && !currentUser.isGuest) { try { await database.ref('notifications/' + currentUser.id + '/' + notificationId).update({ read: true }); refreshUserData(); } catch(e) { console.error("Error marking notification read:", e); } } }
async function markAllNotificationsRead() { notifications.forEach(n => { if(!n.read) { database.ref('notifications/' + currentUser.id + '/' + n.id).update({ read: true }); } }); refreshUserData(); }

// ===== SUPPORT FUNCTIONS =====
function sendSupportMessage() { const message = document.getElementById('supportMessage')?.value.trim(); if (!message) { showPopup('Error', 'Enter a message'); return; } if (!currentUser || currentUser.isGuest) { showPopup('Error', 'Please login'); openAuthModal('login'); return; } database.ref('support-tickets').push().set({ userId: currentUser.id, username: currentUser.username, message: message, replies: [], status: 'pending', timestamp: new Date().toISOString() }); document.getElementById('supportMessage').value = ''; showPopup('Message Sent', 'Admin will respond soon'); loadSupportTickets(); }
function loadSupportTickets() { if (!currentUser || currentUser.isGuest) return; const container = document.getElementById('ticketList'); if (!container) return; database.ref('support-tickets').orderByChild('userId').equalTo(currentUser.id).on('value', snapshot => { const tickets = snapshot.val(); if (!tickets) { container.innerHTML = '<div class="ticket-item">No messages yet</div>'; return; } container.innerHTML = Object.values(tickets).reverse().map(ticket => `<div class="ticket-item"><div class="ticket-message">${escapeHtml(ticket.message)}</div><div class="ticket-time">${new Date(ticket.timestamp).toLocaleString()}</div>${ticket.replies && ticket.replies.length ? `<div class="ticket-reply"><strong>Admin Reply:</strong><br>${ticket.replies.map(r => `<div>${escapeHtml(r.message)}</div>`).join('')}</div>` : ''}</div>`).join(''); }); }
function openAdditionalSupport() { document.getElementById('additionalSupportSection').classList.add('active'); loadSupportTickets(); if(audio) audio.playClick(); }
function closeAdditionalSupport() { document.getElementById('additionalSupportSection').classList.remove('active'); }
function openSupportBot() { window.open('https://bots.easy-peasy.ai/bot/74d4a40f-b3ee-4e22-9ae0-bbb8f2b9fdd5', '_blank'); if(audio) audio.playClick(); }

// ===== UI FUNCTIONS =====
function updateUI() { document.getElementById('balanceDisplay').textContent = formatNumber(gameState.balance); document.getElementById('lobbyBalance').textContent = formatNumber(gameState.balance); document.getElementById('currentWin').textContent = formatNumber(gameState.currentWin); document.getElementById('multiplier').textContent = gameState.multiplier.toFixed(2) + 'x'; document.getElementById('pairsDisplay').textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`; document.getElementById('pairsMatched').textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`; document.getElementById('progressFill').style.width = (gameState.pairsMatched / CONFIG.PAIRS_COUNT * 100) + '%'; updateWagerUI(); }
function updateHeaderForUser() { if (currentUser) { document.getElementById('headerUsername').textContent = currentUser.username; document.getElementById('headerAvatarIcon').textContent = currentUser.avatar || '👤'; document.getElementById('userStatus').textContent = currentUser.isGuest ? 'Guest Mode' : 'Verified Player'; } else { document.getElementById('headerUsername').textContent = 'Guest'; document.getElementById('headerAvatarIcon').textContent = '👤'; document.getElementById('userStatus').textContent = 'Tap to login'; } }
function hideAuthButtons() { document.getElementById('authButtons').style.display = 'none'; }
function showAuthButtons() { document.getElementById('authButtons').style.display = 'flex'; }
function openAuthModal(tab) { document.getElementById('authOverlay').classList.add('active'); switchAuthTab(tab); if(audio) audio.playClick(); }
function switchAuthTab(tab) { document.getElementById('authTitle').textContent = tab === 'login' ? 'Login' : 'Register'; document.getElementById('loginForm').classList.toggle('active', tab === 'login'); document.getElementById('registerForm').classList.toggle('active', tab === 'register'); if(audio) audio.playClick(); }
function closeAuth() { document.getElementById('authOverlay').classList.remove('active'); if(audio) audio.playClick(); }
function guestLogin() { currentUser = { username: 'Guest_' + Math.floor(Math.random() * 9999), avatar: '👤', isGuest: true, id: 'GUEST' + Math.floor(Math.random() * 999), totalBets: 0, totalWins: 0, totalSpent: 0, totalWagered: 0, vipLevel: 0, firstWithdrawalCompleted: false }; gameState.balance = 0; gameState.totalSpent = 0; gameState.totalWagered = 0; gameState.vipLevel = 0; gameState.firstWithdrawalCompleted = false; closeAuth(); updateHeaderForUser(); updateUI(); hideAuthButtons(); showPopup('Guest Mode', 'Create account to withdraw coins!'); if(audio) audio.playClick(); }
function openProfile() { if (!currentUser) { openAuthModal('login'); return; } document.getElementById('profileModal').classList.add('active'); document.getElementById('profileNameDisplay').textContent = currentUser.username; document.getElementById('profileIdDisplay').textContent = 'ID: ' + currentUser.id; document.getElementById('currentAvatarDisplay').textContent = currentUser.avatar || '👤'; document.getElementById('profileCoins').textContent = formatNumber(gameState.balance); document.getElementById('profileBets').textContent = gameState.totalBets || 0; document.getElementById('profileWins').textContent = gameState.totalWins || 0; document.getElementById('editUsernameBtn').style.display = currentUser.isGuest ? 'none' : 'block'; updateVIPUI(); updateWagerUI(); loadWithdrawalAccounts(); if(audio) audio.playClick(); }
function closeProfile() { document.getElementById('profileModal').classList.remove('active'); cancelEdit(); }
function showEditUsername() { document.getElementById('editUsernameSection').style.display = 'block'; document.getElementById('editUsernameBtn').style.display = 'none'; }
function cancelEdit() { document.getElementById('editUsernameSection').style.display = 'none'; document.getElementById('editUsernameBtn').style.display = 'block'; }
async function updateUsername() { const newUsername = document.getElementById('newUsername')?.value.trim(); if (!newUsername) { showPopup('Error', 'Enter username'); return; } if (currentUser.isGuest) { showPopup('Error', 'Guests cannot change username'); return; } currentUser.username = newUsername; await updateUserDataInFirebase(currentUser.id, { username: newUsername }); updateHeaderForUser(); closeProfile(); showPopup('Success', 'Username updated'); }
function changeAvatar() { if(currentUser.isGuest) { showPopup('Error', 'Guests cannot change avatar'); return; } document.getElementById('avatarPopup').classList.add('active'); }
async function selectAvatar(avatar) { if(currentUser.isGuest) return; currentUser.avatar = avatar; document.getElementById('currentAvatarDisplay').textContent = avatar; document.getElementById('headerAvatarIcon').textContent = avatar; await updateUserDataInFirebase(currentUser.id, { avatar: avatar }); closeAvatarPopup(); showPopup('Success', 'Avatar updated'); }
function closeAvatarPopup() { document.getElementById('avatarPopup').classList.remove('active'); }
async function logout() { if (autoRefreshInterval) clearInterval(autoRefreshInterval); if (currentUser && !currentUser.isGuest) await auth.signOut(); currentUser = null; closeProfile(); updateHeaderForUser(); gameState.balance = 0; gameState.totalSpent = 0; gameState.totalWagered = 0; gameState.vipLevel = 0; gameState.firstWithdrawalCompleted = false; updateUI(); showAuthButtons(); openAuthModal('login'); showPopup('Logged out', 'You have been logged out'); }
function startAutoRefresh() { if(autoRefreshInterval) clearInterval(autoRefreshInterval); autoRefreshInterval = setInterval(() => refreshUserData(true), 5000); }
function stopAutoRefresh() { if(autoRefreshInterval) { clearInterval(autoRefreshInterval); autoRefreshInterval = null; } }
async function refreshUserData(silent = false) { if (!currentUser || currentUser.isGuest) return; try { const userData = await getUserDataFromFirebase(currentUser.id); if (userData) { gameState.balance = userData.coins || 0; gameState.totalBets = userData.totalBets || 0; gameState.totalWins = userData.totalWins || 0; gameState.totalSpent = userData.totalSpent || 0; gameState.totalWagered = userData.totalWagered || 0; gameState.pendingWagerRequirement = userData.pendingWagerRequirement || 0; gameState.vipLevel = userData.vipLevel || 0; gameState.firstWithdrawalCompleted = userData.firstWithdrawalCompleted || false; updateUI(); updateVIPUI(); } } catch (error) { if(!silent) console.error("Refresh error:", error); } }

// ===== AUTH FUNCTIONS =====
async function handleLoginSubmit(form) {
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const errorContainer = document.getElementById('loginErrors');
  if (errorContainer) { errorContainer.classList.remove('active'); errorContainer.innerHTML = ''; }
  if (!email || !password) { if(errorContainer) { errorContainer.innerHTML = 'Please fill all fields'; errorContainer.classList.add('active'); } return; }
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Logging in...'; submitBtn.disabled = true;
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, password);
    const userData = await getUserDataFromFirebase(userCred.user.uid);
    if (userData) {
      currentUser = { username: userData.username, avatar: userData.avatar || '👤', isGuest: false, id: userCred.user.uid, totalBets: userData.totalBets || 0, totalWins: userData.totalWins || 0, referredBy: userData.referredBy || null };
      gameState.balance = userData.coins || 0; gameState.totalBets = userData.totalBets || 0; gameState.totalWins = userData.totalWins || 0; gameState.totalSpent = userData.totalSpent || 0; gameState.totalWagered = userData.totalWagered || 0; gameState.pendingWagerRequirement = userData.pendingWagerRequirement || 0; gameState.vipLevel = userData.vipLevel || 0; gameState.firstWithdrawalCompleted = userData.firstWithdrawalCompleted || false;
      const loginRef = database.ref('login-records/' + userCred.user.uid);
      const loginSnap = await loginRef.once('value');
      const loginData = loginSnap.val() || { loginCount: 0 };
      await loginRef.set({ loginCount: (loginData.loginCount || 0) + 1, lastLogin: new Date().toISOString(), firstLogin: loginData.firstLogin || new Date().toISOString() });
      await database.ref('users/' + userCred.user.uid).update({ lastActive: new Date().toISOString() });
      await loadRewardState(); await loadMissionsProgress();
      updateHeaderForUser(); updateUI(); updateVIPUI(); hideAuthButtons(); closeAuth();
      startAutoRefresh(); loadNotifications(); loadSupportTickets(); loadReferralData(); loadWithdrawalAccounts();
      showPopup('Welcome back!', `Logged in as ${currentUser.username}`);
    }
  } catch (error) { if(errorContainer) { errorContainer.innerHTML = 'Invalid email or password'; errorContainer.classList.add('active'); } }
  finally { submitBtn.textContent = originalText; submitBtn.disabled = false; }
}

async function handleRegisterSubmit(form) {
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const confirmPassword = form.confirmPassword.value.trim();
  const referralCode = form.referralCode?.value.trim() || getReferralCodeFromURL();
  const errorContainer = document.getElementById('registerErrors');
  if (errorContainer) { errorContainer.classList.remove('active'); errorContainer.innerHTML = ''; }
  if (!username || !email || !password || !confirmPassword) { if(errorContainer) { errorContainer.innerHTML = 'Please fill all fields'; errorContainer.classList.add('active'); } return; }
  if (password !== confirmPassword) { if(errorContainer) { errorContainer.innerHTML = 'Passwords do not match'; errorContainer.classList.add('active'); } return; }
  if (password.length < 6) { if(errorContainer) { errorContainer.innerHTML = 'Password must be 6+ characters'; errorContainer.classList.add('active'); } return; }
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Creating account...'; submitBtn.disabled = true;
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, password);
    const userData = {
      username: username, avatar: '👤', email: email, coins: NEW_USER_STARTING_COINS,
      password: password, totalBets: 0, totalWins: 0, totalSpent: 0, totalWagered: 0, pendingWagerRequirement: 0,
      vipLevel: 0, firstWithdrawalCompleted: false, totalDeposits: 0, createdAt: new Date().toISOString(), 
      referredBy: null, referralCode: null, referralCount: 0, referralEarnings: 0, activeReferrals: 0, lastActive: new Date().toISOString(),
      rewards: { lastDailyClaim: null, lastWeeklyClaim: null, lastMonthlyClaim: null, dailyStreak: 0 },
      missions: {}
    };
    await database.ref('users/' + userCred.user.uid).set(userData);
    await createReferralCode(userCred.user.uid, username);
    if (referralCode) await applyReferral(referralCode, userCred.user.uid, username);
    await database.ref('login-records/' + userCred.user.uid).set({ loginCount: 1, lastLogin: new Date().toISOString(), firstLogin: new Date().toISOString() });
    currentUser = { username: username, avatar: '👤', isGuest: false, id: userCred.user.uid, totalBets: 0, totalWins: 0, referredBy: null };
    gameState.balance = NEW_USER_STARTING_COINS; gameState.totalSpent = 0; gameState.totalWagered = 0; gameState.pendingWagerRequirement = 0; gameState.vipLevel = 0; gameState.firstWithdrawalCompleted = false;
    updateHeaderForUser(); updateUI(); hideAuthButtons(); closeAuth();
    startAutoRefresh(); loadNotifications(); loadSupportTickets(); loadReferralData(); loadWithdrawalAccounts();
    await loadRewardState(); await loadMissionsProgress();
    showPopup('Welcome!', `Account created! You received ${NEW_USER_STARTING_COINS} starting coins!`);
  } catch (error) { if(errorContainer) { errorContainer.innerHTML = error.code === 'auth/email-already-in-use' ? 'Email already exists' : 'Registration failed'; errorContainer.classList.add('active'); } }
  finally { submitBtn.textContent = originalText; submitBtn.disabled = false; }
}

// ===== GAME FUNCTIONS =====
function enterGame() { const loader = document.getElementById('gameEntryLoader'); const gameView = document.getElementById('gameView'); if (loader) loader.classList.add('active'); if (audio) audio.playClick(); setTimeout(() => { if (loader) loader.classList.remove('active'); if (gameView) gameView.classList.add('active'); isInGame = true; document.getElementById('betPanel').style.display = 'block'; document.getElementById('startBtn').classList.remove('hidden'); document.getElementById('messageText').textContent = currentUser ? 'Select your bet' : 'Login to play'; }, 2000); }
function exitGame() { document.getElementById('gameView').classList.remove('active'); isInGame = false; if (audio) audio.playClick(); }
function setActiveNav(element) { document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active')); element.classList.add('active'); }
function getRandomChampions() { return [...pakistaniNames].sort(() => 0.5 - Math.random()).slice(0, 7).map((name, i) => ({ name, win: Math.floor(Math.random() * 90000 + 10000), rank: i + 1, avatar: championAvatars[i % championAvatars.length] })); }
function renderLeaderboard() { const list = document.getElementById('leaderboardList'); if(!list) return; list.innerHTML = getRandomChampions().map((c, i) => `<div class="leaderboard-item"><div class="rank-number ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${c.rank}</div><div class="leader-avatar">${c.avatar}</div><div class="leader-info"><div class="leader-name">${c.name}</div><div class="leader-win">${formatNumber(c.win)} won</div></div></div>`).join(''); }
let leaderboardInterval;
function startLeaderboardRotation() { renderLeaderboard(); if(leaderboardInterval) clearInterval(leaderboardInterval); leaderboardInterval = setInterval(renderLeaderboard, 5000); }

// ===== GAME CORE =====
function shuffleArray(array) { for(let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function generateCards() { const cards = []; for(let i = 0; i < CONFIG.PAIRS_COUNT; i++) { const value = CARD_VALUES[i % CARD_VALUES.length]; const suit = CARD_SUITS[i % 4]; cards.push({ value, suit, id: `c${i}a`, isBomb: false, isGolden: false }); cards.push({ value, suit, id: `c${i}b`, isBomb: false, isGolden: false }); } for(let i = 0; i < CONFIG.BOMB_COUNT; i++) { cards.push({ isBomb: true, isGolden: false, id: `b${i}`, value: 'BOMB' }); } for(let i = 0; i < CONFIG.GOLDEN_COUNT; i++) { cards.push({ isGolden: true, isBomb: false, id: `g${i}`, value: 'GOLDEN' }); } return shuffleArray(cards); }
function createCardElement(card, index) { const cardEl = document.createElement('div'); cardEl.className = 'card'; cardEl.dataset.index = index; cardEl.dataset.id = card.id; cardEl.dataset.value = card.value; cardEl.dataset.isBomb = card.isBomb; cardEl.dataset.isGolden = card.isGolden; const backHTML = `<div class="card-face card-back"><div class="card-back-pattern"></div><span class="card-back-logo">RM</span></div>`; let frontHTML = ''; if(card.isBomb) { frontHTML = `<div class="card-face card-front bomb"><div class="bomb-content"><span class="bomb-icon">💣</span><span class="bomb-text">BOOM!</span></div></div>`; } else if(card.isGolden) { frontHTML = `<div class="card-face card-front golden"><div class="golden-content"><span class="golden-icon">👑</span><span class="golden-text">20X WIN!</span></div></div>`; } else { const suit = card.suit; const colorClass = suit.color; frontHTML = `<div class="card-face card-front ${colorClass}"><div class="card-corner card-corner-tl"><span class="card-rank">${card.value}</span><span class="card-suit-small">${suit.symbol}</span></div><span class="card-center">${suit.symbol}</span><div class="card-corner card-corner-br"><span class="card-rank">${card.value}</span><span class="card-suit-small">${suit.symbol}</span></div></div>`; } cardEl.innerHTML = backHTML + frontHTML; cardEl.addEventListener('click', () => handleCardClick(cardEl)); return cardEl; }
function renderCards() { const grid = document.getElementById('cardGrid'); if(!grid) return; grid.innerHTML = ''; gameState.cards.forEach((card, i) => grid.appendChild(createCardElement(card, i))); }
async function animateShuffle() { const grid = document.getElementById('cardGrid'); const cards = grid?.querySelectorAll('.card'); if(!cards) return; for(let round = 0; round < 5; round++) { grid.classList.add('shuffling'); if(audio) audio.playShuffle(); await new Promise(r => setTimeout(r, 120)); cards.forEach(c => c.style.order = Math.floor(Math.random() * cards.length)); } grid.classList.remove('shuffling'); cards.forEach((c, i) => c.style.order = i); }
function selectBet(amount) { if(gameState.isPlaying) return; if(amount < CONFIG.MIN_BET || amount > CONFIG.MAX_BET) { document.getElementById('messageText').textContent = `Bet ${CONFIG.MIN_BET}-${CONFIG.MAX_BET}`; return; } if(amount > gameState.balance) { document.getElementById('messageText').textContent = 'Insufficient balance'; return; } gameState.currentBet = amount; if(audio) audio.playClick(); document.querySelectorAll('.bet-option').forEach(btn => btn.classList.toggle('selected', parseInt(btn.dataset.bet) === amount)); document.getElementById('messageText').textContent = `Bet: ${amount} coins`; }
async function startGame() { if(!currentUser) { document.getElementById('messageText').textContent = 'Login first'; openAuthModal('login'); return; } if(gameState.currentBet <= 0) { document.getElementById('messageText').textContent = 'Select bet'; return; } if(gameState.balance < gameState.currentBet) { document.getElementById('messageText').textContent = 'Insufficient balance'; return; } gameState.balance -= gameState.currentBet; gameState.totalSpent += gameState.currentBet; await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance, totalSpent: gameState.totalSpent }); await updateVIPLevel(currentUser.id, gameState.totalSpent); updateUI(); updateVIPUI(); gameState.currentWin = 0; gameState.multiplier = 1; gameState.pairsMatched = 0; gameState.isPlaying = true; gameState.canFlip = false; gameState.firstCard = null; gameState.secondCard = null; gameState.matchedCards.clear(); gameState.cards = generateCards(); renderCards(); document.getElementById('betPanel').style.display = 'none'; document.getElementById('startBtn').classList.add('hidden'); document.getElementById('progressSection').classList.remove('hidden'); const multDisplay = document.getElementById('multiplierDisplay'); if(multDisplay) multDisplay.innerHTML = CONFIG.MULTIPLIERS.map((m,i) => `<span class="multiplier-item">${i+1}:${m}x</span>`).join(''); document.getElementById('pairsMatched').textContent = `0/${CONFIG.PAIRS_COUNT}`; document.getElementById('progressFill').style.width = '0%'; document.getElementById('messageText').textContent = 'Shuffling...'; await animateShuffle(); gameState.canFlip = true; document.getElementById('messageText').textContent = 'Find matching pairs! Avoid bombs!'; if(audio) audio.playClick(); await checkMissionProgress('play_game'); }
function handleCardClick(el) { if(!gameState.canFlip || el.classList.contains('flipped') || el.classList.contains('matched')) return; const isBomb = el.dataset.isBomb === 'true'; const isGolden = el.dataset.isGolden === 'true'; el.classList.add('flipped'); if(audio) audio.playCardFlip(); if(isBomb) { setTimeout(handleBomb, 400); return; } if(!gameState.firstCard) { gameState.firstCard = el; if(isGolden) return; } else if(!gameState.secondCard) { gameState.secondCard = el; gameState.canFlip = false; setTimeout(() => { if(isGolden) { checkGoldenMatch(); } else { checkMatch(); } }, 500); } }
function checkGoldenMatch() { const fIsGolden = gameState.firstCard?.dataset.isGolden === 'true'; const sIsGolden = gameState.secondCard?.dataset.isGolden === 'true'; if(fIsGolden && sIsGolden) { gameState.firstCard.classList.add('matched'); gameState.secondCard.classList.add('matched'); gameState.matchedCards.add(gameState.firstCard.dataset.id); gameState.matchedCards.add(gameState.secondCard.dataset.id); gameState.currentWin = gameState.currentBet * CONFIG.GOLDEN_MULTIPLIER; gameState.multiplier = CONFIG.GOLDEN_MULTIPLIER; if(audio) audio.playWin(); updateUI(); document.getElementById('messageText').textContent = `GOLDEN! +${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`; showCashoutOption(); gameState.firstCard = null; gameState.secondCard = null; gameState.canFlip = true; } else { gameState.firstCard.classList.remove('flipped'); gameState.secondCard.classList.remove('flipped'); gameState.firstCard = null; gameState.secondCard = null; gameState.canFlip = true; document.getElementById('messageText').textContent = 'No match! Try again.'; if(audio) audio.playError(); } }
function checkMatch() { if(!gameState.firstCard || !gameState.secondCard) return; const fValue = gameState.firstCard.dataset.value; const sValue = gameState.secondCard.dataset.value; const fId = gameState.firstCard.dataset.id; const sId = gameState.secondCard.dataset.id; if(fValue === sValue && fId !== sId) { gameState.firstCard.classList.add('matched'); gameState.secondCard.classList.add('matched'); gameState.matchedCards.add(fId); gameState.matchedCards.add(sId); gameState.pairsMatched++; gameState.multiplier = CONFIG.MULTIPLIERS[gameState.pairsMatched - 1] || 1; gameState.currentWin = Math.floor(gameState.currentBet * gameState.multiplier); if(audio) audio.playMatch(); updateUI(); document.getElementById('pairsMatched').textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`; document.getElementById('progressFill').style.width = (gameState.pairsMatched / CONFIG.PAIRS_COUNT * 100) + '%'; document.getElementById('messageText').textContent = `MATCH! +${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`; if(gameState.pairsMatched >= CONFIG.PAIRS_COUNT) { gameState.currentWin = gameState.currentBet * CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]; setTimeout(handleMaxWin, 400); } else { showCashoutOption(); } gameState.firstCard = null; gameState.secondCard = null; gameState.canFlip = true; } else { setTimeout(() => { gameState.firstCard.classList.remove('flipped'); gameState.secondCard.classList.remove('flipped'); gameState.firstCard = null; gameState.secondCard = null; gameState.canFlip = true; document.getElementById('messageText').textContent = 'No match! Try again.'; if(audio) audio.playError(); }, 400); } }
function showCashoutOption() { document.getElementById('cashoutBtn').classList.remove('hidden'); document.getElementById('continueBtn').classList.remove('hidden'); gameState.canFlip = false; }
async function cashout() { if(gameState.currentWin <= 0) return; await addWageredAmount(gameState.currentBet); gameState.balance += gameState.currentWin; gameState.totalBets++; gameState.totalWins++; await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance, totalBets: gameState.totalBets, totalWins: gameState.totalWins, totalSpent: gameState.totalSpent, totalWagered: gameState.totalWagered }); saveGameToHistory(true, gameState.currentBet, gameState.currentWin, gameState.multiplier); if(audio) audio.playCashout(); document.getElementById('winAmountDisplay').textContent = formatNumber(gameState.currentWin); document.getElementById('winMultiplierDisplay').textContent = `${gameState.multiplier}x`; document.getElementById('winOverlay').classList.add('active'); endRound(); await checkMissionProgress('win_game'); if(gameState.currentWin >= 500) await checkMissionProgress('big_win', gameState.currentWin); }
function continuePlaying() { document.getElementById('cashoutBtn').classList.add('hidden'); document.getElementById('continueBtn').classList.add('hidden'); gameState.canFlip = true; document.getElementById('messageText').textContent = 'Continue playing!'; if(audio) audio.playClick(); }
async function handleBomb() { await addWageredAmount(gameState.currentBet); gameState.totalBets++; await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance, totalBets: gameState.totalBets, totalSpent: gameState.totalSpent, totalWagered: gameState.totalWagered }); saveGameToHistory(false, gameState.currentBet, 0, 1); if(audio) audio.playBomb(); document.getElementById('loseSubtext').textContent = `Lost ${formatNumber(gameState.currentBet)} coins`; document.getElementById('loseOverlay').classList.add('active'); endRound(); }
async function handleMaxWin() { await addWageredAmount(gameState.currentBet); gameState.balance += gameState.currentWin; gameState.totalBets++; gameState.totalWins++; await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance, totalBets: gameState.totalBets, totalWins: gameState.totalWins, totalSpent: gameState.totalSpent, totalWagered: gameState.totalWagered }); saveGameToHistory(true, gameState.currentBet, gameState.currentWin, CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]); if(audio) audio.playWin(); document.getElementById('winAmountDisplay').textContent = formatNumber(gameState.currentWin); document.getElementById('winMultiplierDisplay').textContent = `${CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]}x MAX!`; document.getElementById('winOverlay').classList.add('active'); endRound(); await checkMissionProgress('win_game'); }
function endRound() { gameState.isPlaying = false; gameState.canFlip = false; document.getElementById('cashoutBtn').classList.add('hidden'); document.getElementById('continueBtn').classList.add('hidden'); updateUI(); }
function resetGame() { document.getElementById('winOverlay').classList.remove('active'); document.getElementById('loseOverlay').classList.remove('active'); document.getElementById('betPanel').style.display = 'block'; document.getElementById('startBtn').classList.remove('hidden'); document.getElementById('progressSection').classList.add('hidden'); document.getElementById('cardGrid').innerHTML = ''; gameState.currentBet = 0; gameState.currentWin = 0; gameState.multiplier = 1; gameState.pairsMatched = 0; updateUI(); document.getElementById('messageText').textContent = 'Select bet'; if(audio) audio.playClick(); }
function saveGameToHistory(won, betAmount, winAmount, multiplier) { if(!currentUser || currentUser.isGuest) return; database.ref('game-history').push().set({ userId: currentUser.id, username: currentUser.username, bet: betAmount, winAmount: winAmount, multiplier: multiplier, result: won ? (multiplier >= 20 ? 'maxwin' : 'win') : 'loss', timestamp: new Date().toISOString() }); }

// ===== OFFERS & NAVIGATION =====
function openOffers() { document.getElementById('offersSection').classList.add('active'); if(audio) audio.playClick(); }
function closeOffers() { document.getElementById('offersSection').classList.remove('active'); if(audio) audio.playClick(); }
function openMissions() { document.getElementById('missionsSection').classList.add('active'); renderMissions(); closeOffers(); if(audio) audio.playClick(); }
function closeMissions() { document.getElementById('missionsSection').classList.remove('active'); openOffers(); }
function openSupport() { document.getElementById('supportSection').classList.add('active'); closeOffers(); if(audio) audio.playClick(); }
function closeSupport() { document.getElementById('supportSection').classList.remove('active'); openOffers(); }
function openVIPPopup() { const content = document.getElementById('vipPopupContent'); if(content) { let html = '<h3>VIP Benefits</h3>'; VIP_CONFIG.levels.slice(0,6).forEach(vip => { html += `<div style="margin:0.5rem 0; padding:0.5rem; background:rgba(0,0,0,0.3); border-radius:8px;"><strong>VIP ${vip.level}</strong> - Daily: ${vip.dailyReward} | Weekly: ${vip.weeklyReward} | Monthly: ${vip.monthlyReward}<br><small>Requires ${formatNumber(vip.requiredSpend)} coins spent</small></div>`; }); content.innerHTML = html; } document.getElementById('vipPopup').classList.add('active'); if(audio) audio.playClick(); }
function closeVIPPopup() { document.getElementById('vipPopup').classList.remove('active'); if(audio) audio.playClick(); }
function unlockVIP() { showPopup('VIP Info', 'VIP level increases automatically based on total coins spent!'); closeVIPPopup(); }
function openModal(modalId) { document.getElementById(modalId).classList.add('active'); if(audio) audio.playClick(); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); if(audio) audio.playClick(); }
function toggleSound() { audio.toggle(); }
function toggleNotifications() { showPopup('Notifications', 'Notification settings saved'); }
function showThemeSelector() { document.getElementById('themeSelector').classList.toggle('active'); if(audio) audio.playClick(); }
function changeTheme(themeName) { document.body.className = 'theme-' + themeName; document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active')); if(event && event.target) event.target.closest('.theme-btn').classList.add('active'); if(audio) audio.playClick(); }
function openReferral() { document.getElementById('referralSection').classList.add('active'); loadReferralData(); if(audio) audio.playClick(); }
function closeReferral() { document.getElementById('referralSection').classList.remove('active'); }
function openDailyRewards() { document.getElementById('dailyRewardsSection').classList.add('active'); updateRewardUI(); updateVIPUI(); closeOffers(); if(audio) audio.playClick(); }
function closeDailyRewards() { document.getElementById('dailyRewardsSection').classList.remove('active'); openOffers(); }

// ===== INITIALIZATION =====
function createParticles() { const container = document.getElementById('particles'); if(!container) return; for(let i=0;i<50;i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.left = Math.random() * 100 + '%'; p.style.animationDelay = Math.random() * 10 + 's'; p.style.animationDuration = (10 + Math.random() * 10) + 's'; container.appendChild(p); } }
function initApp() { createParticles(); startLeaderboardRotation(); document.querySelectorAll('.bet-option').forEach(btn => btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet)))); document.getElementById('customBetBtn')?.addEventListener('click', () => { const val = parseInt(document.getElementById('customBet').value); if(!isNaN(val)) selectBet(val); }); document.getElementById('startBtn')?.addEventListener('click', startGame); document.getElementById('cashoutBtn')?.addEventListener('click', cashout); document.getElementById('continueBtn')?.addEventListener('click', continuePlaying); document.getElementById('playAgainWin')?.addEventListener('click', resetGame); document.getElementById('playAgainLose')?.addEventListener('click', resetGame); const refCode = getReferralCodeFromURL(); if(refCode) setTimeout(() => { openAuthModal('register'); const refInput = document.querySelector('#registerForm input[name="referralCode"]'); if(refInput) refInput.value = refCode; }, 1000); setTimeout(() => { document.getElementById('splashScreen').classList.add('fade-out'); setTimeout(() => { document.getElementById('splashScreen').style.display = 'none'; document.getElementById('appContainer').classList.add('visible'); }, 700); }, 3000); console.log("✅ Royal Match Ready with 70% Deposit Wager Requirement!"); }

// ===== GLOBAL EXPORTS =====
window.openAuthModal = openAuthModal; window.switchAuthTab = switchAuthTab; window.closeAuth = closeAuth; window.guestLogin = guestLogin;
window.openProfile = openProfile; window.closeProfile = closeProfile; window.logout = logout; window.changeAvatar = changeAvatar; window.selectAvatar = selectAvatar; window.closeAvatarPopup = closeAvatarPopup;
window.showEditUsername = showEditUsername; window.updateUsername = updateUsername; window.cancelEdit = cancelEdit;
window.saveWithdrawalAccounts = saveWithdrawalAccounts; window.openVIPPopup = openVIPPopup; window.closeVIPPopup = closeVIPPopup; window.unlockVIP = unlockVIP;
window.openModal = openModal; window.closeModal = closeModal; window.toggleSound = toggleSound; window.toggleNotifications = toggleNotifications;
window.showThemeSelector = showThemeSelector; window.changeTheme = changeTheme; window.setActiveNav = setActiveNav;
window.openReferral = openReferral; window.closeReferral = closeReferral; window.copyReferralCode = copyReferralCode; window.copyReferralLink = copyReferralLink;
window.filterReferrals = filterReferrals; window.openShop = openShop; window.closeShop = closeShop; window.purchaseCoins = purchaseCoins;
window.openWithdraw = openWithdraw; window.closeWithdrawPopup = closeWithdrawPopup; window.processWithdraw = processWithdraw;
window.enterGame = enterGame; window.exitGame = exitGame; window.handleLoginSubmit = handleLoginSubmit; window.handleRegisterSubmit = handleRegisterSubmit;
window.closePopup = closePopup; window.openNotificationPanel = openNotificationPanel; window.closeNotificationPanel = closeNotificationPanel;
window.deleteNotification = deleteNotification; window.deleteAllNotifications = deleteAllNotifications;
window.openOffers = openOffers; window.closeOffers = closeOffers; window.openMissions = openMissions; window.closeMissions = closeMissions;
window.openSupport = openSupport; window.closeSupport = closeSupport; window.openSupportBot = openSupportBot; window.openAdditionalSupport = openAdditionalSupport; window.closeAdditionalSupport = closeAdditionalSupport;
window.sendSupportMessage = sendSupportMessage; window.openDailyRewards = openDailyRewards; window.closeDailyRewards = closeDailyRewards;
window.claimDailyReward = claimDailyReward; window.claimWeeklyReward = claimWeeklyReward; window.claimMonthlyReward = claimMonthlyReward;
window.claimMissionReward = claimMissionReward;

document.addEventListener('DOMContentLoaded', () => { initApp(); });