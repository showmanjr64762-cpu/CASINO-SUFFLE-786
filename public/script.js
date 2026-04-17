// ===== ROYAL MATCH - COMPLETE GAME =====
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

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// ===== ENABLE FIREBASE PERSISTENCE =====
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log("✅ Firebase persistence enabled"))
  .catch((error) => console.error("Persistence error:", error));

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isInGame = false;
let autoRefreshInterval = null;
let currentWithdrawalId = null;
let countdownInterval = null;
let notifications = [];
let pendingPurchaseAmount = null;
let pendingPurchaseCoins = null;
let pendingPurchaseBonus = null;

// ===== WAGER CONFIGURATION =====
const WAGER_CONFIG = {
  WITHDRAWAL_REQUIREMENT_RATE: 0.70
};

// ===== WITHDRAWAL CONFIGURATION =====
const WITHDRAWAL_CONFIG = {
  MIN_WITHOUT_WAGER: 1000,
  MIN_AFTER_WAGER: 100
};

// ===== VIP SYSTEM CONFIGURATION =====
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

// ===== REFERRAL CONSTANTS =====
const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 50,
  MIN_DEPOSIT_FOR_COMMISSION: 3000,
  COMMISSION_RATE: 0.10,
  DEPOSIT_BONUS_RATE: 0.025,
  MILESTONE_REWARDS: { 5: 500, 10: 1500, 25: 5000, 50: 15000 }
};

// ===== GAME STATE =====
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
  totalDeposits: 0,
  requiredWagered: 0,
  vipLevel: 0,
  lastGameResult: null,
  lastGameTimestamp: 0
};

// ===== REWARD TRACKING =====
let rewardState = {
  lastDailyClaim: null,
  lastWeeklyClaim: null,
  lastMonthlyClaim: null,
  weeklyStreak: 0,
  lastWeeklyClaimDate: null,
  dailyStreak: 0
};

// ===== REFERRAL DATA =====
let referralData = {
  code: null,
  link: null,
  totalReferrals: 0,
  activeReferrals: 0,
  totalEarnings: 0,
  referrals: [],
  milestones: { 5: false, 10: false, 25: false, 50: false }
};

// ===== WITHDRAWAL ACCOUNTS =====
let savedAccounts = {
  jazzcash: "",
  easypaisa: ""
};

// ===== GAME CONFIG - UPDATED =====
const CONFIG = {
  PAIRS_COUNT: 11,
  BOMB_COUNT: 4,
  GOLDEN_COUNT: 2,
  GOLDEN_MULTIPLIER: 20,
  MULTIPLIERS: [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0, 15.0, 22.0, 35.0],
  MIN_BET: 10,
  MAX_BET: 5000
};

const CARD_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4'];
const CARD_SUITS = [
  { symbol: '♥', color: 'red' },
  { symbol: '♠', color: 'black' },
  { symbol: '♦', color: 'red' },
  { symbol: '♣', color: 'black' }
];

// ===== CHAMPIONS DATA =====
const pakistaniNames = [
  'Ahmed Hassan', 'Ali Khan', 'Bilal Ahmed', 'Hassan Ali', 'Muhammad Imran',
  'Faisal Khan', 'Karim Abdul', 'Malik Saeed', 'Nasir Ahmed', 'Omar Khan'
];
const championAvatars = ['👑', '🥈', '🥉', '🎯', '💎', '🦁', '⭐', '🏆'];

// ===== HELPER FUNCTIONS =====
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showPopup(title, text) {
  const popupTitle = document.getElementById('popupTitle');
  const popupMessage = document.getElementById('popupMessage');
  const successPopup = document.getElementById('successPopup');
  
  if (popupTitle) popupTitle.textContent = title;
  if (popupMessage) popupMessage.textContent = text;
  if (successPopup) successPopup.classList.add('active');
  setTimeout(() => {
    if (successPopup) successPopup.classList.remove('active');
  }, 3000);
}

function closePopup() {
  const successPopup = document.getElementById('successPopup');
  if (successPopup) successPopup.classList.remove('active');
}

// ===== COPY JAZZCASH NUMBER =====
function copyJazzCashNumber() {
  const number = '03149595863';
  navigator.clipboard.writeText(number);
  showPopup('Copied!', 'JazzCash number copied to clipboard');
}

// ===== VIP FUNCTIONS =====
function calculateVIPLevel(totalSpent) {
  let level = 0;
  for (let i = VIP_CONFIG.levels.length - 1; i >= 0; i--) {
    if (totalSpent >= VIP_CONFIG.levels[i].requiredSpend) {
      level = VIP_CONFIG.levels[i].level;
      break;
    }
  }
  return level;
}

function getVIPRewards(level) {
  const vipData = VIP_CONFIG.levels.find(v => v.level === level);
  return vipData || VIP_CONFIG.levels[0];
}

function getNextVIPRequirement(currentLevel) {
  const nextLevel = VIP_CONFIG.levels.find(v => v.level === currentLevel + 1);
  return nextLevel ? nextLevel.requiredSpend : null;
}

async function updateVIPLevel(userId, totalSpent) {
  const newLevel = calculateVIPLevel(totalSpent);
  const currentVIP = gameState.vipLevel;
  
  if (newLevel > currentVIP) {
    const rewards = getVIPRewards(newLevel);
    sendNotificationToPlayer(userId, '👑 VIP Level Up!', `Congratulations! You've reached VIP Level ${newLevel}! Your rewards have increased!`, '👑');
    showPopup('VIP Level Up!', `Congratulations! You've reached VIP Level ${newLevel}! Daily rewards increased to ${rewards.dailyReward} coins!`);
  }
  
  gameState.vipLevel = newLevel;
  await updateUserDataInFirebase(userId, { 
    vipLevel: newLevel,
    totalSpent: totalSpent
  });
  
  return newLevel;
}

// ===== DAILY REWARDS FUNCTIONS =====
async function loadRewardState() {
  if (!currentUser || currentUser.isGuest) return;
  
  const userRef = database.ref('users/' + currentUser.id + '/rewards');
  const snapshot = await userRef.once('value');
  const data = snapshot.val();
  
  if (data) {
    rewardState = { ...rewardState, ...data };
  }
  
  updateRewardUI();
}

async function saveRewardState() {
  if (!currentUser || currentUser.isGuest) return;
  await database.ref('users/' + currentUser.id + '/rewards').set(rewardState);
}

function canClaimDaily() {
  if (!rewardState.lastDailyClaim) return true;
  const lastClaim = new Date(rewardState.lastDailyClaim);
  const today = new Date();
  return lastClaim.getDate() !== today.getDate() || 
         lastClaim.getMonth() !== today.getMonth() || 
         lastClaim.getFullYear() !== today.getFullYear();
}

function canClaimWeekly() {
  if (!rewardState.lastWeeklyClaim) return true;
  const lastClaim = new Date(rewardState.lastWeeklyClaim);
  const today = new Date();
  const daysDiff = Math.floor((today - lastClaim) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
}

function canClaimMonthly() {
  if (!rewardState.lastMonthlyClaim) return true;
  const lastClaim = new Date(rewardState.lastMonthlyClaim);
  const today = new Date();
  return lastClaim.getMonth() !== today.getMonth() || 
         lastClaim.getFullYear() !== today.getFullYear();
}

async function claimDailyReward() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to claim rewards');
    return;
  }
  
  if (!canClaimDaily()) {
    const nextClaim = new Date(rewardState.lastDailyClaim);
    nextClaim.setDate(nextClaim.getDate() + 1);
    showPopup('Already Claimed', `Next daily reward available on ${nextClaim.toLocaleDateString()}`);
    return;
  }
  
  const vipRewards = getVIPRewards(gameState.vipLevel);
  const reward = vipRewards.dailyReward;
  
  gameState.balance += reward;
  rewardState.lastDailyClaim = new Date().toISOString();
  
  await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
  await saveRewardState();
  updateUI();
  updateRewardUI();
  
  showPopup('Daily Reward Claimed!', `You received ${reward} coins for VIP Level ${gameState.vipLevel}!`);
  if (audio) audio.playWin();
  
  const today = new Date().toDateString();
  if (rewardState.lastDailyClaimDate !== today) {
    rewardState.dailyStreak = (rewardState.dailyStreak || 0) + 1;
    rewardState.lastDailyClaimDate = today;
    await saveRewardState();
  }
}

async function claimWeeklyReward() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to claim rewards');
    return;
  }
  
  if (!canClaimWeekly()) {
    const nextClaim = new Date(rewardState.lastWeeklyClaim);
    nextClaim.setDate(nextClaim.getDate() + 7);
    showPopup('Already Claimed', `Next weekly reward available on ${nextClaim.toLocaleDateString()}`);
    return;
  }
  
  const vipRewards = getVIPRewards(gameState.vipLevel);
  const reward = vipRewards.weeklyReward;
  
  gameState.balance += reward;
  rewardState.lastWeeklyClaim = new Date().toISOString();
  
  await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
  await saveRewardState();
  updateUI();
  updateRewardUI();
  
  showPopup('Weekly Reward Claimed!', `You received ${reward} coins for VIP Level ${gameState.vipLevel}!`);
  if (audio) audio.playWin();
}

async function claimMonthlyReward() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to claim rewards');
    return;
  }
  
  if (!canClaimMonthly()) {
    showPopup('Already Claimed', 'Monthly reward can be claimed once per month');
    return;
  }
  
  const vipRewards = getVIPRewards(gameState.vipLevel);
  const reward = vipRewards.monthlyReward;
  
  gameState.balance += reward;
  rewardState.lastMonthlyClaim = new Date().toISOString();
  
  await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
  await saveRewardState();
  updateUI();
  updateRewardUI();
  
  showPopup('Monthly Reward Claimed!', `You received ${reward} coins for VIP Level ${gameState.vipLevel}!`);
  if (audio) audio.playWin();
}

function updateRewardUI() {
  const vipRewards = getVIPRewards(gameState.vipLevel);
  
  const dailyBtn = document.getElementById('claimDailyBtn');
  const weeklyBtn = document.getElementById('claimWeeklyBtn');
  const monthlyBtn = document.getElementById('claimMonthlyBtn');
  const dailyCooldown = document.getElementById('dailyCooldown');
  const weeklyCooldown = document.getElementById('weeklyCooldown');
  const monthlyCooldown = document.getElementById('monthlyCooldown');
  
  const dailyAmount = document.getElementById('dailyRewardAmount');
  const weeklyAmount = document.getElementById('weeklyRewardAmount');
  const monthlyAmount = document.getElementById('monthlyRewardAmount');
  
  if (dailyAmount) dailyAmount.textContent = vipRewards.dailyReward;
  if (weeklyAmount) weeklyAmount.textContent = vipRewards.weeklyReward;
  if (monthlyAmount) monthlyAmount.textContent = vipRewards.monthlyReward;
  
  if (dailyBtn) {
    if (canClaimDaily()) {
      dailyBtn.disabled = false;
      dailyBtn.style.opacity = '1';
      if (dailyCooldown) dailyCooldown.textContent = 'Ready to claim!';
    } else {
      dailyBtn.disabled = true;
      dailyBtn.style.opacity = '0.5';
      if (dailyCooldown && rewardState.lastDailyClaim) {
        const next = new Date(rewardState.lastDailyClaim);
        next.setDate(next.getDate() + 1);
        dailyCooldown.textContent = `Available: ${next.toLocaleDateString()}`;
      }
    }
  }
  
  if (weeklyBtn) {
    if (canClaimWeekly()) {
      weeklyBtn.disabled = false;
      weeklyBtn.style.opacity = '1';
      if (weeklyCooldown) weeklyCooldown.textContent = 'Ready to claim!';
    } else {
      weeklyBtn.disabled = true;
      weeklyBtn.style.opacity = '0.5';
      if (weeklyCooldown && rewardState.lastWeeklyClaim) {
        const next = new Date(rewardState.lastWeeklyClaim);
        next.setDate(next.getDate() + 7);
        weeklyCooldown.textContent = `Available: ${next.toLocaleDateString()}`;
      }
    }
  }
  
  if (monthlyBtn) {
    if (canClaimMonthly()) {
      monthlyBtn.disabled = false;
      monthlyBtn.style.opacity = '1';
      if (monthlyCooldown) monthlyCooldown.textContent = 'Ready to claim!';
    } else {
      monthlyBtn.disabled = true;
      monthlyBtn.style.opacity = '0.5';
      if (monthlyCooldown && rewardState.lastMonthlyClaim) {
        const next = new Date(rewardState.lastMonthlyClaim);
        next.setMonth(next.getMonth() + 1);
        monthlyCooldown.textContent = `Available: ${next.toLocaleDateString()}`;
      }
    }
  }
}

function updateVIPUI() {
  const vipLevelDisplay = document.getElementById('vipLevelDisplay');
  const nextVipAmount = document.getElementById('nextVipAmount');
  const totalSpentDisplay = document.getElementById('totalSpentDisplay');
  const vipProgressBar = document.getElementById('vipProgressBar');
  const profileVipBadge = document.getElementById('profileVipBadge');
  const profileVipLevel = document.getElementById('profileVipLevel');
  const profileTotalSpent = document.getElementById('profileTotalSpent');
  const profileNextVip = document.getElementById('profileNextVip');
  
  if (vipLevelDisplay) vipLevelDisplay.textContent = gameState.vipLevel;
  if (totalSpentDisplay) totalSpentDisplay.textContent = formatNumber(gameState.totalSpent);
  if (profileVipBadge) profileVipBadge.textContent = `VIP ${gameState.vipLevel}`;
  if (profileVipLevel) profileVipLevel.textContent = gameState.vipLevel;
  if (profileTotalSpent) profileTotalSpent.textContent = formatNumber(gameState.totalSpent);
  
  const nextVIP = getNextVIPRequirement(gameState.vipLevel);
  if (nextVIP) {
    if (nextVipAmount) nextVipAmount.textContent = formatNumber(nextVIP);
    if (profileNextVip) profileNextVip.textContent = formatNumber(nextVIP - gameState.totalSpent);
    
    const previousRequired = gameState.vipLevel > 0 ? VIP_CONFIG.levels[gameState.vipLevel].requiredSpend : 0;
    const currentRequired = nextVIP;
    const progress = ((gameState.totalSpent - previousRequired) / (currentRequired - previousRequired)) * 100;
    if (vipProgressBar) vipProgressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  } else {
    if (nextVipAmount) nextVipAmount.textContent = 'MAX';
    if (vipProgressBar) vipProgressBar.style.width = '100%';
  }
}

function renderVIPTable() {
  const container = document.getElementById('vipTable');
  if (!container) return;
  
  let html = `<div class="vip-row header"><span>VIP Level</span><span>Daily</span><span>7-Day</span><span>Monthly</span><span>Required Spend</span></div>`;
  
  VIP_CONFIG.levels.forEach(vip => {
    const isCurrent = vip.level === gameState.vipLevel;
    html += `
      <div class="vip-row ${isCurrent ? 'current' : ''}">
        <span>VIP ${vip.level}</span>
        <span>${vip.dailyReward} coins</span>
        <span>${vip.weeklyReward} coins</span>
        <span>${vip.monthlyReward} coins</span>
        <span>${formatNumber(vip.requiredSpend)} coins</span>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function openDailyRewards() {
  const section = document.getElementById('dailyRewardsSection');
  if (section) section.classList.add('active');
  updateRewardUI();
  updateVIPUI();
  renderVIPTable();
  closeOffers();
  if (audio) audio.playClick();
}

function closeDailyRewards() {
  const section = document.getElementById('dailyRewardsSection');
  if (section) section.classList.remove('active');
  openOffers();
}

// ===== FIREBASE FUNCTIONS =====
async function getUserDataFromFirebase(userId) {
  try {
    const snapshot = await database.ref('users/' + userId).once('value');
    return snapshot.val();
  } catch (error) {
    console.error("Error loading user data:", error);
    return null;
  }
}

async function updateUserDataInFirebase(userId, updates) {
  try {
    await database.ref('users/' + userId).update(updates);
    console.log("✅ User data updated");
    return true;
  } catch (error) {
    console.error("Error updating user data:", error);
    return false;
  }
}

function sendNotificationToPlayer(userId, title, message, icon = '📢') {
  const notifRef = database.ref('notifications/' + userId).push();
  notifRef.set({
    title: title,
    message: message,
    icon: icon,
    read: false,
    timestamp: new Date().toISOString()
  });
}

// ===== PAYMENT REQUEST FUNCTIONS =====
async function submitPaymentRequest() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to purchase');
    openAuthModal('login');
    return;
  }
  
  const playerNumber = document.getElementById('playerNumberInput').value.trim();
  if (!playerNumber || playerNumber.length < 10) {
    showPopup('Error', 'Please enter a valid JazzCash/Easypaisa number');
    return;
  }
  
  const paymentRequestRef = database.ref('payment-requests').push();
  await paymentRequestRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    playerNumber: playerNumber,
    amount: pendingPurchaseAmount,
    coins: pendingPurchaseCoins,
    bonusCoins: pendingPurchaseBonus,
    totalCoins: pendingPurchaseCoins + pendingPurchaseBonus,
    requiredWager: Math.floor((pendingPurchaseCoins + pendingPurchaseBonus) * WAGER_CONFIG.WITHDRAWAL_REQUIREMENT_RATE),
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  const adminNotifRef = database.ref('admin-notifications').push();
  await adminNotifRef.set({
    type: 'payment_request',
    userId: currentUser.id,
    username: currentUser.username,
    amount: pendingPurchaseAmount,
    message: `New payment request for ${pendingPurchaseAmount} PKR from ${currentUser.username}`,
    read: false,
    timestamp: new Date().toISOString()
  });
  
  showPaymentInfoPage();
  
  pendingPurchaseAmount = null;
  pendingPurchaseCoins = null;
  pendingPurchaseBonus = null;
}

function showPaymentNumberPage(amount, coins, bonusCoins) {
  pendingPurchaseAmount = amount;
  pendingPurchaseCoins = coins;
  pendingPurchaseBonus = bonusCoins;
  
  const amountDisplay = document.getElementById('paymentAmountDisplay');
  if (amountDisplay) {
    amountDisplay.innerHTML = `
      <div class="payment-amount-card-content">
        <h3>Purchase Details</h3>
        <p>Amount: ₨${amount}</p>
        <p>Coins: ${formatNumber(coins)}</p>
        <p>Bonus: +${formatNumber(bonusCoins)} coins</p>
        <p>Total: ${formatNumber(coins + bonusCoins)} coins</p>
      </div>
    `;
  }
  
  document.getElementById('paymentNumberPage').classList.add('active');
  document.getElementById('shopSection').classList.remove('active');
  if (audio) audio.playClick();
}

function closePaymentNumberPage() {
  document.getElementById('paymentNumberPage').classList.remove('active');
  document.getElementById('playerNumberInput').value = '';
  openShop();
}

function showPaymentInfoPage() {
  const infoAmount = document.getElementById('paymentInfoAmount');
  if (infoAmount && pendingPurchaseCoins) {
    infoAmount.innerHTML = `<strong>Amount to Pay:</strong> ₨${pendingPurchaseAmount}<br>
                            <strong>You will receive:</strong> ${formatNumber(pendingPurchaseCoins + pendingPurchaseBonus)} coins`;
  }
  
  document.getElementById('paymentNumberPage').classList.remove('active');
  document.getElementById('paymentInfoPage').classList.add('active');
  if (audio) audio.playClick();
}

function closePaymentInfoPage() {
  document.getElementById('paymentInfoPage').classList.remove('active');
  openShop();
}

function goBackToShop() {
  closePaymentInfoPage();
}

// ===== WAGER FUNCTIONS =====
function getRemainingWagerRequirement(user) {
  const requiredWager = user.requiredWagered || 0;
  const wagered = user.totalWagered || 0;
  const remaining = requiredWager - wagered;
  return Math.max(0, remaining);
}

function hasMetWagerRequirement(user) {
  const requiredWager = user.requiredWagered || 0;
  const wagered = user.totalWagered || 0;
  return wagered >= requiredWager;
}

function canWithdraw(user, withdrawalAmount) {
  const wagerMet = hasMetWagerRequirement(user);
  const hasBalance = (user.coins || 0) >= withdrawalAmount;
  return wagerMet && hasBalance;
}

function getWagerProgress(user) {
  const requiredWager = user.requiredWagered || 0;
  const wagered = user.totalWagered || 0;
  if (requiredWager === 0) return 100;
  const progress = (wagered / requiredWager) * 100;
  return Math.min(100, Math.max(0, progress));
}

function getMinWithdrawalAmount(user) {
  return hasMetWagerRequirement(user) ? WITHDRAWAL_CONFIG.MIN_AFTER_WAGER : WITHDRAWAL_CONFIG.MIN_WITHOUT_WAGER;
}

// ===== REFERRAL FUNCTIONS =====
function generateReferralCode(username) {
  const prefix = username.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${randomNum}`;
}

async function createReferralCode(userId, username) {
  const referralCode = generateReferralCode(username);
  await updateUserDataInFirebase(userId, {
    referralCode: referralCode,
    referralCount: 0,
    referralEarnings: 0,
    activeReferrals: 0,
    referralMilestones: { 5: false, 10: false, 25: false, 50: false }
  });
  return referralCode;
}

function getReferralCodeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref');
}

async function applyReferral(referralCode, newUserId, newUsername) {
  if (!referralCode) return null;
  try {
    const usersSnap = await database.ref('users').once('value');
    const users = usersSnap.val();
    let referrerId = null;
    
    for (const [id, user] of Object.entries(users)) {
      if (user.referralCode === referralCode && id !== newUserId) {
        referrerId = id;
        break;
      }
    }
    
    if (referrerId) {
      await updateUserDataInFirebase(newUserId, { referredBy: referrerId, referredAt: new Date().toISOString() });
      const referrerData = users[referrerId];
      await updateUserDataInFirebase(referrerId, { 
        referralCount: (referrerData.referralCount || 0) + 1,
        coins: (referrerData.coins || 0) + REFERRAL_CONFIG.SIGNUP_BONUS,
        referralEarnings: (referrerData.referralEarnings || 0) + REFERRAL_CONFIG.SIGNUP_BONUS
      });
      
      await database.ref('referrals').push({
        referrerId: referrerId,
        referrerUsername: referrerData.username,
        referredUserId: newUserId,
        referredUsername: newUsername,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
      sendNotificationToPlayer(referrerId, '🎉 New Referral!', `${newUsername} signed up using your code! You earned ${REFERRAL_CONFIG.SIGNUP_BONUS} coins!`, '🎉');
      return referrerId;
    }
    return null;
  } catch (error) {
    console.error("Error applying referral:", error);
    return null;
  }
}

async function checkAndPayReferralCommission(userId, depositAmount) {
  try {
    const userSnap = await database.ref('users/' + userId).once('value');
    const userData = userSnap.val();
    
    if (!userData.referredBy) return;
    if (depositAmount < REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION) return;
    
    const referralsSnap = await database.ref('referrals').orderByChild('referredUserId').equalTo(userId).once('value');
    let referralRecord = null;
    let referralId = null;
    
    if (referralsSnap.val()) {
      for (const [id, ref] of Object.entries(referralsSnap.val())) {
        if (ref.referredUserId === userId && ref.status === 'pending') {
          referralRecord = ref;
          referralId = id;
          break;
        }
      }
    }
    
    if (!referralRecord) return;
    
    const commission = Math.floor(depositAmount * REFERRAL_CONFIG.COMMISSION_RATE);
    const referrerRef = database.ref('users/' + referralRecord.referrerId);
    const referrerSnap = await referrerRef.once('value');
    const referrerData = referrerSnap.val();
    
    await referrerRef.update({
      coins: (referrerData.coins || 0) + commission,
      referralEarnings: (referrerData.referralEarnings || 0) + commission,
      activeReferrals: (referrerData.activeReferrals || 0) + 1
    });
    
    await database.ref('referrals/' + referralId).update({
      status: 'active',
      depositAmount: depositAmount,
      commissionEarned: commission,
      commissionPaid: true,
      paidAt: new Date().toISOString()
    });
    
    sendNotificationToPlayer(referralRecord.referrerId, '💰 Commission Earned!', `${userData.username} deposited ${depositAmount} coins! You earned ${commission} coins!`, '💰');
    
    if (currentUser && currentUser.id === referralRecord.referrerId) {
      gameState.balance = (referrerData.coins || 0) + commission;
      referralData.totalEarnings = (referrerData.referralEarnings || 0) + commission;
      referralData.activeReferrals = (referrerData.activeReferrals || 0) + 1;
      updateUI();
      loadReferralData();
    }
  } catch (error) {
    console.error("Error paying referral commission:", error);
  }
}

async function loadReferralData() {
  if (!currentUser || currentUser.isGuest) return;
  try {
    const userData = await getUserDataFromFirebase(currentUser.id);
    if (!userData) return;
    
    referralData.code = userData.referralCode;
    referralData.totalReferrals = userData.referralCount || 0;
    referralData.activeReferrals = userData.activeReferrals || 0;
    referralData.totalEarnings = userData.referralEarnings || 0;
    referralData.link = `${window.location.origin}/?ref=${referralData.code}`;
    
    const referralsSnap = await database.ref('referrals').orderByChild('referrerId').equalTo(currentUser.id).once('value');
    const referrals = referralsSnap.val();
    referralData.referrals = referrals ? Object.values(referrals).map(r => ({
      username: r.referredUsername,
      status: r.status,
      depositAmount: r.depositAmount || 0,
      commissionEarned: r.commissionEarned || 0,
      joined: r.timestamp
    })) : [];
    
    updateReferralUI();
  } catch (error) {
    console.error("Error loading referral data:", error);
  }
}

function updateReferralUI() {
  const codeDisplay = document.getElementById('referralCodeDisplay');
  const linkInput = document.getElementById('referralLinkInput');
  const totalReferralsEl = document.getElementById('totalReferrals');
  const activeReferralsEl = document.getElementById('activeReferrals');
  const totalEarningsEl = document.getElementById('totalEarnings');
  
  if (codeDisplay) codeDisplay.textContent = referralData.code || 'Loading...';
  if (linkInput) linkInput.value = referralData.link || '';
  if (totalReferralsEl) totalReferralsEl.textContent = referralData.totalReferrals;
  if (activeReferralsEl) activeReferralsEl.textContent = referralData.activeReferrals;
  if (totalEarningsEl) totalEarningsEl.textContent = formatNumber(referralData.totalEarnings);
  
  const tbody = document.getElementById('referralsBody');
  if (tbody) {
    if (referralData.referrals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No referrals yet<\/td><\/tr>';
    } else {
      tbody.innerHTML = referralData.referrals.map(r => `
        <tr>
          <td>${escapeHtml(r.username)}<\/td>
          <td><span class="status-badge ${r.status === 'active' ? 'approved' : 'pending'}">${r.status === 'active' ? 'Active' : 'Pending'}<\/span><\/td>
          <td class="amount-positive">${formatNumber(r.depositAmount)}<\/td>
          <td class="amount-positive">${formatNumber(r.commissionEarned)}<\/td>
          <td>${new Date(r.joined).toLocaleDateString()}<\/td>
        <\/tr>
      `).join('');
    }
  }
}

function copyReferralCode() {
  if (referralData.code) {
    navigator.clipboard.writeText(referralData.code);
    showPopup('Copied!', 'Referral code copied to clipboard');
  }
}

function copyReferralLink() {
  if (referralData.link) {
    navigator.clipboard.writeText(referralData.link);
    showPopup('Copied!', 'Referral link copied to clipboard');
  }
}

function filterReferrals(filter) {
  const tbody = document.getElementById('referralsBody');
  if (!tbody) return;
  let filtered = referralData.referrals;
  if (filter === 'active') filtered = referralData.referrals.filter(r => r.status === 'active');
  if (filter === 'pending') filtered = referralData.referrals.filter(r => r.status !== 'active');
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No referrals found<\/td><\/tr>';
  } else {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${escapeHtml(r.username)}<\/td>
        <td><span class="status-badge ${r.status === 'active' ? 'approved' : 'pending'}">${r.status === 'active' ? 'Active' : 'Pending'}<\/span><\/td>
        <td class="amount-positive">${formatNumber(r.depositAmount)}<\/td>
        <td class="amount-positive">${formatNumber(r.commissionEarned)}<\/td>
        <td>${new Date(r.joined).toLocaleDateString()}<\/td>
      <\/tr>
    `).join('');
  }
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
}

function claimMilestone(milestone) {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Error', 'Please login to claim rewards');
    return;
  }
  if (referralData.totalReferrals >= milestone && !referralData.milestones[milestone]) {
    const reward = REFERRAL_CONFIG.MILESTONE_REWARDS[milestone];
    gameState.balance += reward;
    updateUI();
    updateUserDataInFirebase(currentUser.id, { coins: gameState.balance, referralEarnings: (referralData.totalEarnings + reward) });
    referralData.totalEarnings += reward;
    referralData.milestones[milestone] = true;
    updateReferralUI();
    showPopup('Milestone Claimed!', `You earned ${reward} coins for reaching ${milestone} referrals! 🎉`);
  } else if (referralData.milestones[milestone]) {
    showPopup('Already Claimed', 'You have already claimed this milestone reward');
  } else {
    showPopup('Not Yet', `You need ${milestone} referrals to unlock this milestone`);
  }
}

// ===== SHOP FUNCTIONS =====
function purchaseCoins(amount, coins) {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to purchase');
    openAuthModal('login');
    return;
  }
  
  const bonusRate = REFERRAL_CONFIG.DEPOSIT_BONUS_RATE;
  const bonusCoins = Math.floor(coins * bonusRate);
  
  showPaymentNumberPage(amount, coins, bonusCoins);
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
    { amount: 25000, coins: 25000 },
    { amount: 50000, coins: 50000, featured: true }
  ];
  
  shopGrid.innerHTML = shopItems.map(item => `
    <div class="shop-card ${item.featured ? 'featured' : ''}" onclick="purchaseCoins(${item.amount}, ${item.coins})">
      <div class="shop-icon">💰</div>
      <div class="shop-amount">₨${item.amount}</div>
      <div class="shop-coins">${formatNumber(item.coins)} Coins</div>
      <div class="shop-bonus">+${formatNumber(Math.floor(item.coins * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE))} Bonus (${bonusRate}%)</div>
      <div class="shop-total">Total: ${formatNumber(item.coins + Math.floor(item.coins * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE))} Coins</div>
      <button class="shop-btn">BUY NOW</button>
    </div>
  `).join('');
}

function openShop() {
  renderShopGrid();
  const shopSection = document.getElementById('shopSection');
  if (shopSection) shopSection.classList.add('active');
  if (audio) audio.playClick();
}

function closeShop() {
  const shopSection = document.getElementById('shopSection');
  if (shopSection) shopSection.classList.remove('active');
  if (audio) audio.playClick();
}

// ===== WITHDRAW FUNCTIONS =====
async function saveWithdrawalAccounts() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Error', 'Please login to save accounts');
    return;
  }
  
  const jazzcash = document.getElementById('jazzcashNumber')?.value.trim();
  const easypaisa = document.getElementById('easypaisaNumber')?.value.trim();
  
  const accounts = {};
  if (jazzcash) accounts.jazzcash = jazzcash;
  if (easypaisa) accounts.easypaisa = easypaisa;
  
  if (Object.keys(accounts).length === 0) {
    showPopup('Error', 'Please enter at least one withdrawal account');
    return;
  }
  
  await updateUserDataInFirebase(currentUser.id, { withdrawalAccounts: accounts });
  savedAccounts = accounts;
  showPopup('Success', 'Withdrawal accounts saved successfully');
}

async function loadWithdrawalAccounts() {
  if (!currentUser || currentUser.isGuest) return;
  const userData = await getUserDataFromFirebase(currentUser.id);
  if (userData && userData.withdrawalAccounts) {
    savedAccounts = userData.withdrawalAccounts;
    const jazzcashInput = document.getElementById('jazzcashNumber');
    const easypaisaInput = document.getElementById('easypaisaNumber');
    if (jazzcashInput) jazzcashInput.value = savedAccounts.jazzcash || '';
    if (easypaisaInput) easypaisaInput.value = savedAccounts.easypaisa || '';
  }
}

function updateWithdrawPopup() {
  const method = document.getElementById('withdrawMethod')?.value;
  const accountDisplay = document.getElementById('accountDisplay');
  if (method && accountDisplay) {
    if (savedAccounts[method]) {
      accountDisplay.innerHTML = `Account: ${savedAccounts[method]}`;
      accountDisplay.style.color = '#10b981';
    } else {
      accountDisplay.innerHTML = 'No account saved. Please add in profile.';
      accountDisplay.style.color = '#ff6b6b';
    }
  }
}

async function openWithdraw() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to withdraw');
    openAuthModal('login');
    return;
  }
  
  const userData = await getUserDataFromFirebase(currentUser.id);
  const remainingWager = getRemainingWagerRequirement(userData);
  const wagerMet = hasMetWagerRequirement(userData);
  const minWithdrawal = getMinWithdrawalAmount(userData);
  
  if (!wagerMet) {
    const progress = getWagerProgress(userData);
    showPopup('Wager Requirement Not Met', `You need to wager ${formatNumber(remainingWager)} more coins (${Math.floor(progress)}% complete) before you can withdraw. Minimum withdrawal is ${minWithdrawal} coins.`);
    return;
  }
  
  const withdrawBalance = document.getElementById('withdrawBalance');
  if (withdrawBalance) withdrawBalance.textContent = formatNumber(gameState.balance);
  
  const withdrawPopupText = document.getElementById('withdrawPopupText');
  if (withdrawPopupText) {
    withdrawPopupText.innerHTML = `Available Balance: <strong id="withdrawBalance">${formatNumber(gameState.balance)}</strong> coins<br>Minimum withdrawal: ${minWithdrawal} coins`;
  }
  
  const withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.add('active');
  updateWithdrawPopup();
  if (audio) audio.playClick();
}

function closeWithdrawPopup() {
  const withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.remove('active');
  const withdrawAmount = document.getElementById('withdrawAmount');
  if (withdrawAmount) withdrawAmount.value = '';
}

async function processWithdraw() {
  const amount = parseInt(document.getElementById('withdrawAmount')?.value);
  const method = document.getElementById('withdrawMethod')?.value;
  
  const userData = await getUserDataFromFirebase(currentUser.id);
  const minWithdrawal = getMinWithdrawalAmount(userData);
  
  if (!amount || amount < minWithdrawal) {
    showPopup('Error', `Minimum withdrawal amount is ${minWithdrawal} coins`);
    return;
  }
  if (amount > gameState.balance) {
    showPopup('Error', 'Insufficient balance');
    return;
  }
  if (!savedAccounts[method]) {
    showPopup('Error', 'Please save your account number in profile first');
    openProfile();
    return;
  }
  
  if (!canWithdraw(userData, amount)) {
    showPopup('Wager Requirement Not Met', 'You have not met the wager requirement for withdrawal.');
    return;
  }
  
  const withdrawRef = database.ref('withdrawals').push();
  withdrawRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    amount: amount,
    method: method,
    accountNumber: savedAccounts[method],
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  showPopup('Withdrawal Request', `Your withdrawal request for ${formatNumber(amount)} coins has been submitted. Admin will process it shortly.`);
  closeWithdrawPopup();
}

// ===== NOTIFICATION FUNCTIONS =====
function loadNotifications() {
  if (!currentUser || currentUser.isGuest) return;
  database.ref('notifications/' + currentUser.id).on('value', snapshot => {
    const notifs = snapshot.val();
    if (notifs) {
      notifications = Object.entries(notifs).map(([id, n]) => ({ ...n, id })).reverse();
      updateNotificationBadge();
      renderNotifications();
    }
  });
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  const badgeSmall = document.getElementById('notificationBadgeSmall');
  if (unreadCount > 0) {
    if (badge) { badge.style.display = 'block'; badge.textContent = unreadCount > 9 ? '9+' : unreadCount; }
    if (badgeSmall) { badgeSmall.style.display = 'inline-block'; badgeSmall.textContent = unreadCount > 9 ? '9+' : unreadCount; }
  } else {
    if (badge) badge.style.display = 'none';
    if (badgeSmall) badgeSmall.style.display = 'none';
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  if (!container) return;
  if (notifications.length === 0) {
    container.innerHTML = '<div class="notification-item"><div class="notification-icon">📭</div><div class="notification-content"><div class="notification-title">No Notifications</div><div class="notification-message">You have no new notifications</div></div></div>';
    return;
  }
  container.innerHTML = notifications.map(n => `
    <div class="notification-item ${!n.read ? 'unread' : ''}" onclick="markNotificationRead('${n.id}')">
      <div class="notification-icon">${n.icon || '📢'}</div>
      <div class="notification-content">
        <div class="notification-title">${n.title}</div>
        <div class="notification-message">${n.message}</div>
        <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
      </div>
      <button class="delete-notification" onclick="event.stopPropagation(); deleteNotification('${n.id}')">×</button>
    </div>
  `).join('');
}

function openNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.add('open');
  markAllNotificationsRead();
  if (audio) audio.playClick();
}

function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('open');
}

function deleteNotification(notificationId) {
  if (!currentUser || currentUser.isGuest) return;
  database.ref('notifications/' + currentUser.id + '/' + notificationId).remove();
  showPopup('Deleted', 'Notification removed');
}

function deleteAllNotifications() {
  if (!currentUser || currentUser.isGuest) return;
  if (confirm('Delete all notifications?')) {
    database.ref('notifications/' + currentUser.id).remove();
    showPopup('All Deleted', 'All notifications removed');
  }
}

function markNotificationRead(notificationId) {
  if (!currentUser || currentUser.isGuest) return;
  database.ref('notifications/' + currentUser.id + '/' + notificationId).update({ read: true });
}

function markAllNotificationsRead() {
  if (!currentUser || currentUser.isGuest) return;
  notifications.forEach(n => {
    if (!n.read) {
      database.ref('notifications/' + currentUser.id + '/' + n.id).update({ read: true });
    }
  });
}

// ===== SUPPORT FUNCTIONS =====
function sendSupportMessage() {
  const message = document.getElementById('supportMessage')?.value.trim();
  if (!message) {
    showPopup('Error', 'Please enter a message');
    return;
  }
  if (!currentUser || currentUser.isGuest) {
    showPopup('Error', 'Please login to send support messages');
    openAuthModal('login');
    return;
  }
  
  database.ref('support-tickets').push().set({
    userId: currentUser.id,
    username: currentUser.username,
    message: message,
    replies: [],
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  const supportMessage = document.getElementById('supportMessage');
  if (supportMessage) supportMessage.value = '';
  showPopup('Message Sent', 'Your support message has been sent to admin');
  loadSupportTickets();
}

function loadSupportTickets() {
  if (!currentUser || currentUser.isGuest) return;
  const container = document.getElementById('ticketList');
  if (!container) return;
  
  database.ref('support-tickets').orderByChild('userId').equalTo(currentUser.id).on('value', snapshot => {
    const tickets = snapshot.val();
    if (!tickets) {
      container.innerHTML = '<div class="ticket-item"><div class="ticket-message">No messages yet</div></div>';
      return;
    }
    const ticketsArray = Object.values(tickets).reverse();
    container.innerHTML = ticketsArray.map(ticket => `
      <div class="ticket-item">
        <div class="ticket-message">${escapeHtml(ticket.message)}</div>
        <div class="ticket-time">${new Date(ticket.timestamp).toLocaleString()}</div>
        ${ticket.replies && ticket.replies.length > 0 ? `<div class="ticket-reply"><strong>Admin Reply:</strong><br>${ticket.replies.map(r => `<div>${escapeHtml(r.message)} - ${new Date(r.timestamp).toLocaleTimeString()}</div>`).join('')}</div>` : ''}
      </div>
    `).join('');
  });
}

function openAdditionalSupport() {
  const section = document.getElementById('additionalSupportSection');
  if (section) section.classList.add('active');
  loadSupportTickets();
  if (audio) audio.playClick();
}

function closeAdditionalSupport() {
  const section = document.getElementById('additionalSupportSection');
  if (section) section.classList.remove('active');
}

function openSupportBot() {
  window.open('https://bots.easy-peasy.ai/bot/74d4a40f-b3ee-4e22-9ae0-bbb8f2b9fdd5', '_blank');
  if (audio) audio.playClick();
}

// ===== UI FUNCTIONS =====
function updateUI() {
  const balanceDisplay = document.getElementById('balanceDisplay');
  const lobbyBalance = document.getElementById('lobbyBalance');
  const currentWin = document.getElementById('currentWin');
  const multiplier = document.getElementById('multiplier');
  const pairsDisplay = document.getElementById('pairsDisplay');
  const pairsMatched = document.getElementById('pairsMatched');
  const progressFill = document.getElementById('progressFill');
  
  if (balanceDisplay) balanceDisplay.textContent = formatNumber(gameState.balance);
  if (lobbyBalance) lobbyBalance.textContent = formatNumber(gameState.balance);
  if (currentWin) currentWin.textContent = formatNumber(gameState.currentWin);
  if (multiplier) multiplier.textContent = gameState.multiplier.toFixed(2) + 'x';
  if (pairsDisplay) pairsDisplay.textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`;
  if (pairsMatched) pairsMatched.textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`;
  if (progressFill) progressFill.style.width = (gameState.pairsMatched / CONFIG.PAIRS_COUNT * 100) + '%';
}

function updateHeaderForUser() {
  const headerUsername = document.getElementById('headerUsername');
  const headerAvatar = document.getElementById('headerAvatarIcon');
  const userStatus = document.getElementById('userStatus');
  
  if (currentUser) {
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (headerAvatar) headerAvatar.textContent = currentUser.avatar || '👤';
    if (userStatus) userStatus.textContent = currentUser.isGuest ? 'Guest Mode' : 'Verified Player';
  } else {
    if (headerUsername) headerUsername.textContent = 'Guest';
    if (headerAvatar) headerAvatar.textContent = '👤';
    if (userStatus) userStatus.textContent = 'Tap to login';
  }
}

function hideAuthButtons() {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'none';
}

function showAuthButtons() {
  const authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'flex';
}

function openAuthModal(tab) {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('active');
  switchAuthTab(tab);
  if (audio) audio.playClick();
}

function switchAuthTab(tab) {
  const authTitle = document.getElementById('authTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (authTitle) authTitle.textContent = tab === 'login' ? 'Login' : 'Register';
  if (loginForm) loginForm.classList.toggle('active', tab === 'login');
  if (registerForm) registerForm.classList.toggle('active', tab === 'register');
  if (audio) audio.playClick();
}

function closeAuth() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('active');
  if (audio) audio.playClick();
}

function guestLogin() {
  currentUser = {
    username: 'Guest_' + Math.floor(Math.random() * 9999),
    avatar: '👤',
    isGuest: true,
    id: 'GUEST' + Math.floor(Math.random() * 999),
    totalBets: 0,
    totalWins: 0,
    totalSpent: 0,
    totalWagered: 0,
    totalDeposits: 0,
    requiredWagered: 0,
    vipLevel: 0
  };
  gameState.balance = 0;
  gameState.totalSpent = 0;
  gameState.totalWagered = 0;
  gameState.totalDeposits = 0;
  gameState.requiredWagered = 0;
  gameState.vipLevel = 0;
  closeAuth();
  updateHeaderForUser();
  updateUI();
  hideAuthButtons();
  showPopup('Guest Mode', 'You are playing as guest with 0 coins');
  if (audio) audio.playClick();
}

function openProfile() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  const profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.add('active');
  
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const profileIdDisplay = document.getElementById('profileIdDisplay');
  const currentAvatarDisplay = document.getElementById('currentAvatarDisplay');
  const profileCoins = document.getElementById('profileCoins');
  const profileBets = document.getElementById('profileBets');
  const profileWins = document.getElementById('profileWins');
  const editUsernameBtn = document.getElementById('editUsernameBtn');
  
  if (profileNameDisplay) profileNameDisplay.textContent = currentUser.username;
  if (profileIdDisplay) profileIdDisplay.textContent = 'ID: ' + currentUser.id;
  if (currentAvatarDisplay) currentAvatarDisplay.textContent = currentUser.avatar || '👤';
  if (profileCoins) profileCoins.textContent = formatNumber(gameState.balance);
  if (profileBets) profileBets.textContent = gameState.totalBets || 0;
  if (profileWins) profileWins.textContent = gameState.totalWins || 0;
  if (editUsernameBtn) editUsernameBtn.style.display = currentUser.isGuest ? 'none' : 'block';
  
  updateVIPUI();
  loadWithdrawalAccounts();
  if (audio) audio.playClick();
}

function closeProfile() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.remove('active');
  cancelEdit();
}

function showEditUsername() {
  const editSection = document.getElementById('editUsernameSection');
  const editBtn = document.getElementById('editUsernameBtn');
  if (editSection) editSection.style.display = 'block';
  if (editBtn) editBtn.style.display = 'none';
}

function cancelEdit() {
  const editSection = document.getElementById('editUsernameSection');
  const editBtn = document.getElementById('editUsernameBtn');
  if (editSection) editSection.style.display = 'none';
  if (editBtn) editBtn.style.display = 'block';
}

async function updateUsername() {
  const newUsername = document.getElementById('newUsername')?.value.trim();
  if (!newUsername) {
    showPopup('Error', 'Please enter a username');
    return;
  }
  if (currentUser.isGuest) {
    showPopup('Error', 'Guests cannot change username');
    return;
  }
  currentUser.username = newUsername;
  await updateUserDataInFirebase(currentUser.id, { username: newUsername });
  updateHeaderForUser();
  closeProfile();
  showPopup('Success', 'Username updated');
}

function changeAvatar() {
  if (currentUser.isGuest) {
    showPopup('Error', 'Guests cannot change avatar');
    return;
  }
  const avatarPopup = document.getElementById('avatarPopup');
  if (avatarPopup) avatarPopup.classList.add('active');
}

async function selectAvatar(avatar) {
  if (currentUser.isGuest) return;
  currentUser.avatar = avatar;
  const currentAvatarDisplay = document.getElementById('currentAvatarDisplay');
  const headerAvatarIcon = document.getElementById('headerAvatarIcon');
  if (currentAvatarDisplay) currentAvatarDisplay.textContent = avatar;
  if (headerAvatarIcon) headerAvatarIcon.textContent = avatar;
  await updateUserDataInFirebase(currentUser.id, { avatar: avatar });
  closeAvatarPopup();
  showPopup('Success', 'Avatar updated');
}

function closeAvatarPopup() {
  const avatarPopup = document.getElementById('avatarPopup');
  if (avatarPopup) avatarPopup.classList.remove('active');
}

async function logout() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (currentUser && !currentUser.isGuest) {
    await auth.signOut();
  }
  currentUser = null;
  closeProfile();
  stopAutoRefresh();
  updateHeaderForUser();
  gameState.balance = 0;
  gameState.totalSpent = 0;
  gameState.totalWagered = 0;
  gameState.totalDeposits = 0;
  gameState.requiredWagered = 0;
  gameState.vipLevel = 0;
  updateUI();
  showAuthButtons();
  openAuthModal('login');
  showPopup('Logged out', 'You have been logged out');
}

// ===== AUTO-REFRESH =====
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => refreshUserData(true), 5000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

async function refreshUserData(silent = false) {
  if (!currentUser || currentUser.isGuest) return;
  try {
    const userData = await getUserDataFromFirebase(currentUser.id);
    if (userData) {
      const oldBalance = gameState.balance;
      const newBalance = userData.coins || 0;
      if (!gameState.isPlaying || Math.abs(newBalance - oldBalance) < 1000) {
        gameState.balance = newBalance;
      }
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;
      gameState.totalSpent = userData.totalSpent || 0;
      gameState.totalWagered = userData.totalWagered || 0;
      gameState.totalDeposits = userData.totalDeposits || 0;
      gameState.requiredWagered = userData.requiredWagered || 0;
      gameState.vipLevel = userData.vipLevel || 0;
      updateUI();
      updateVIPUI();
    }
  } catch (error) {
    if (!silent) console.error("Refresh error:", error);
  }
}

// ===== AUTH FUNCTIONS =====
async function handleLoginSubmit(form) {
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const errorContainer = document.getElementById('loginErrors');
  
  if (errorContainer) {
    errorContainer.classList.remove('active');
    errorContainer.innerHTML = '';
  }
  if (!email || !password) {
    if (errorContainer) {
      errorContainer.innerHTML = 'Please fill in all fields';
      errorContainer.classList.add('active');
    }
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Logging in...';
  submitBtn.disabled = true;
  
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, password);
    const userData = await getUserDataFromFirebase(userCred.user.uid);
    if (userData) {
      currentUser = {
        username: userData.username,
        avatar: userData.avatar || '👤',
        isGuest: false,
        id: userCred.user.uid,
        totalBets: userData.totalBets || 0,
        totalWins: userData.totalWins || 0,
        totalWagered: userData.totalWagered || 0,
        totalDeposits: userData.totalDeposits || 0,
        requiredWagered: userData.requiredWagered || 0,
        referredBy: userData.referredBy || null
      };
      gameState.balance = userData.coins || 0;
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;
      gameState.totalSpent = userData.totalSpent || 0;
      gameState.totalWagered = userData.totalWagered || 0;
      gameState.totalDeposits = userData.totalDeposits || 0;
      gameState.requiredWagered = userData.requiredWagered || 0;
      gameState.vipLevel = userData.vipLevel || 0;
      
      const rewardSnap = await database.ref('users/' + currentUser.id + '/rewards').once('value');
      if (rewardSnap.val()) {
        rewardState = { ...rewardState, ...rewardSnap.val() };
      }
      
      updateHeaderForUser();
      updateUI();
      updateVIPUI();
      hideAuthButtons();
      closeAuth();
      startAutoRefresh();
      loadNotifications();
      loadSupportTickets();
      loadReferralData();
      loadWithdrawalAccounts();
      showPopup('Welcome back!', `Logged in as ${currentUser.username}`);
    } else {
      throw new Error('User data not found');
    }
  } catch (error) {
    console.error("Login error:", error);
    if (errorContainer) {
      if (error.code === 'auth/user-not-found') {
        errorContainer.innerHTML = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorContainer.innerHTML = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorContainer.innerHTML = 'Invalid email format';
      } else {
        errorContainer.innerHTML = 'Login failed. Please check your credentials.';
      }
      errorContainer.classList.add('active');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

async function handleRegisterSubmit(form) {
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const confirmPassword = form.confirmPassword.value.trim();
  const manualCode = form.referralCode?.value.trim() || '';
  const urlCode = getReferralCodeFromURL();
  const referralCode = urlCode || manualCode;
  const errorContainer = document.getElementById('registerErrors');
  
  if (errorContainer) {
    errorContainer.classList.remove('active');
    errorContainer.innerHTML = '';
  }
  
  if (!username || !email || !password || !confirmPassword) {
    if (errorContainer) {
      errorContainer.innerHTML = 'Please fill all fields';
      errorContainer.classList.add('active');
    }
    return;
  }
  if (password !== confirmPassword) {
    if (errorContainer) {
      errorContainer.innerHTML = 'Passwords do not match';
      errorContainer.classList.add('active');
    }
    return;
  }
  if (password.length < 6) {
    if (errorContainer) {
      errorContainer.innerHTML = 'Password must be 6+ characters';
      errorContainer.classList.add('active');
    }
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Creating account...';
  submitBtn.disabled = true;
  
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, password);
    const userData = {
      username: username,
      avatar: '👤',
      email: email,
      coins: 0,
      totalBets: 0,
      totalWins: 0,
      totalSpent: 0,
      totalWagered: 0,
      totalDeposits: 0,
      requiredWagered: 0,
      vipLevel: 0,
      createdAt: new Date().toISOString(),
      referredBy: null,
      referralCode: null,
      referralCount: 0,
      referralEarnings: 0,
      activeReferrals: 0,
      referralMilestones: { 5: false, 10: false, 25: false, 50: false },
      rewards: {
        lastDailyClaim: null,
        lastWeeklyClaim: null,
        lastMonthlyClaim: null,
        dailyStreak: 0
      }
    };
    
    await database.ref('users/' + userCred.user.uid).set(userData);
    await createReferralCode(userCred.user.uid, username);
    
    if (referralCode) {
      await applyReferral(referralCode, userCred.user.uid, username);
    }
    
    currentUser = {
      username: username,
      avatar: '👤',
      isGuest: false,
      id: userCred.user.uid,
      totalBets: 0,
      totalWins: 0,
      totalWagered: 0,
      totalDeposits: 0,
      requiredWagered: 0,
      referredBy: null
    };
    
    gameState.balance = 0;
    gameState.totalSpent = 0;
    gameState.totalWagered = 0;
    gameState.totalDeposits = 0;
    gameState.requiredWagered = 0;
    gameState.vipLevel = 0;
    
    updateHeaderForUser();
    updateUI();
    hideAuthButtons();
    closeAuth();
    startAutoRefresh();
    loadNotifications();
    loadSupportTickets();
    loadReferralData();
    loadWithdrawalAccounts();
    
    if (referralCode) {
      showPopup('Welcome!', `Account created with referral! Deposit ${REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION}+ coins to earn commission for your referrer!`);
    } else {
      showPopup('Welcome!', `Account created, ${username}! Get 2.5% bonus on every deposit!`);
    }
  } catch (error) {
    console.error("Registration error:", error);
    if (errorContainer) {
      if (error.code === 'auth/email-already-in-use') {
        errorContainer.innerHTML = 'Email already exists. Please use another email or login.';
      } else if (error.code === 'auth/weak-password') {
        errorContainer.innerHTML = 'Password is too weak. Use at least 6 characters.';
      } else {
        errorContainer.innerHTML = 'Registration failed. Please try again.';
      }
      errorContainer.classList.add('active');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ===== GAME FUNCTIONS =====
function enterGame() {
  const loader = document.getElementById('gameEntryLoader');
  const gameView = document.getElementById('gameView');
  if (loader) loader.classList.add('active');
  if (audio) audio.playClick();
  
  setTimeout(() => {
    if (loader) loader.classList.remove('active');
    if (gameView) gameView.classList.add('active');
    isInGame = true;
    const betPanel = document.getElementById('betPanel');
    const startBtn = document.getElementById('startBtn');
    const messageText = document.getElementById('messageText');
    if (betPanel) betPanel.style.display = 'block';
    if (startBtn) startBtn.classList.remove('hidden');
    if (messageText) messageText.textContent = currentUser ? 'Select your bet' : 'Login to play';
  }, 2000);
}

function exitGame() {
  const gameView = document.getElementById('gameView');
  if (gameView) gameView.classList.remove('active');
  isInGame = false;
  if (audio) audio.playClick();
}

function setActiveNav(element) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');
}

function getRandomChampions() {
  const shuffled = [...pakistaniNames].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 7).map((name, index) => ({
    name: name,
    win: Math.floor(Math.random() * 90000 + 10000),
    rank: index + 1,
    avatar: championAvatars[index % championAvatars.length]
  }));
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  const champions = getRandomChampions();
  list.innerHTML = champions.map((c, i) => {
    let rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return `<div class="leaderboard-item"><div class="rank-number ${rankClass}">${c.rank}</div><div class="leader-avatar">${c.avatar}</div><div class="leader-info"><div class="leader-name">${c.name}</div><div class="leader-win">${formatNumber(c.win)} won</div></div></div>`;
  }).join('');
}

let leaderboardInterval;
function startLeaderboardRotation() {
  renderLeaderboard();
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  leaderboardInterval = setInterval(renderLeaderboard, 5000);
}

// ===== GAME CORE FUNCTIONS =====
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateCards() {
  const cards = [];
  for (let i = 0; i < CONFIG.PAIRS_COUNT; i++) {
    const value = CARD_VALUES[i % CARD_VALUES.length];
    const suit = CARD_SUITS[i % 4];
    cards.push({ value, suit, id: `c${i}a` });
    cards.push({ value, suit, id: `c${i}b` });
  }
  for (let i = 0; i < CONFIG.BOMB_COUNT; i++) cards.push({ isBomb: true, id: `b${i}` });
  for (let i = 0; i < CONFIG.GOLDEN_COUNT; i++) cards.push({ isGolden: true, id: `g${i}` });
  return shuffleArray(cards);
}

function createCardElement(card, index) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.index = index;
  cardEl.dataset.id = card.id;
  cardEl.dataset.value = card.value;
  cardEl.dataset.isBomb = card.isBomb;
  cardEl.dataset.isGolden = card.isGolden;
  
  const backHTML = `<div class="card-face card-back"><div class="card-back-pattern"></div><span class="card-back-logo">RM</span></div>`;
  
  let frontHTML = '';
  if (card.isBomb) {
    frontHTML = `<div class="card-face card-front bomb"><div class="bomb-content"><span class="bomb-icon">💣</span><span class="bomb-text">BOOM!</span></div></div>`;
  } else if (card.isGolden) {
    frontHTML = `<div class="card-face card-front golden"><div class="golden-content"><span class="golden-icon">👑</span><span class="golden-text">20X WIN!</span></div></div>`;
  } else {
    frontHTML = `<div class="card-face card-front ${card.suit.color}"><div class="card-corner card-corner-tl"><span class="card-rank">${card.value}</span><span class="card-suit-small">${card.suit.symbol}</span></div><span class="card-center">${card.suit.symbol}</span><div class="card-corner card-corner-br"><span class="card-rank">${card.value}</span><span class="card-suit-small">${card.suit.symbol}</span></div></div>`;
  }
  
  cardEl.innerHTML = backHTML + frontHTML;
  cardEl.addEventListener('click', () => handleCardClick(cardEl));
  return cardEl;
}

function renderCards() {
  const cardGrid = document.getElementById('cardGrid');
  if (!cardGrid) return;
  cardGrid.innerHTML = '';
  gameState.cards.forEach((card, i) => cardGrid.appendChild(createCardElement(card, i)));
}

async function animateShuffle() {
  const cardGrid = document.getElementById('cardGrid');
  const cards = cardGrid?.querySelectorAll('.card');
  if (!cards) return;
  for (let round = 0; round < 5; round++) {
    cardGrid.classList.add('shuffling');
    if (audio) audio.playShuffle();
    await new Promise(r => setTimeout(r, 120));
    cards.forEach(c => c.style.order = Math.floor(Math.random() * cards.length));
  }
  cardGrid.classList.remove('shuffling');
  cards.forEach((c, i) => c.style.order = i);
}

function selectBet(amount) {
  if (gameState.isPlaying) return;
  if (amount < CONFIG.MIN_BET || amount > CONFIG.MAX_BET) {
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = `Bet ${CONFIG.MIN_BET}-${CONFIG.MAX_BET}`;
    return;
  }
  if (amount > gameState.balance) {
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'Insufficient balance';
    return;
  }
  gameState.currentBet = amount;
  if (audio) audio.playClick();
  document.querySelectorAll('.bet-option').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.bet) === amount);
  });
  const messageText = document.getElementById('messageText');
  if (messageText) messageText.textContent = `Bet: ${amount} coins`;
}

async function startGame() {
  if (!currentUser) {
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'Login first';
    openAuthModal('login');
    return;
  }
  if (gameState.currentBet <= 0) {
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'Select bet';
    return;
  }
  if (gameState.balance < gameState.currentBet) {
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'Insufficient balance';
    return;
  }
  
  gameState.balance -= gameState.currentBet;
  gameState.totalSpent += gameState.currentBet;
  await updateUserDataInFirebase(currentUser.id, { 
    coins: gameState.balance,
    totalSpent: gameState.totalSpent
  });
  
  await updateVIPLevel(currentUser.id, gameState.totalSpent);
  updateUI();
  updateVIPUI();
  
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.isPlaying = true;
  gameState.canFlip = false;
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.matchedCards.clear();
  gameState.cards = generateCards();
  renderCards();
  
  const betPanel = document.getElementById('betPanel');
  const startBtn = document.getElementById('startBtn');
  const progressSection = document.getElementById('progressSection');
  const multiplierDisplay = document.getElementById('multiplierDisplay');
  const messageText = document.getElementById('messageText');
  
  if (betPanel) betPanel.style.display = 'none';
  if (startBtn) startBtn.classList.add('hidden');
  if (progressSection) progressSection.classList.remove('hidden');
  
  if (multiplierDisplay) {
    multiplierDisplay.innerHTML = CONFIG.MULTIPLIERS.map((m, i) => `<span class="multiplier-item">${i + 1}:${m}x</span>`).join('');
  }
  
  updateProgress();
  if (messageText) messageText.textContent = 'Shuffling...';
  await animateShuffle();
  gameState.canFlip = true;
  if (messageText) messageText.textContent = 'Find matching pairs! Avoid bombs!';
  if (audio) audio.playClick();
}

function handleCardClick(el) {
  if (!gameState.canFlip || el.classList.contains('flipped') || el.classList.contains('matched')) return;
  
  const isBomb = el.dataset.isBomb === 'true';
  const isGolden = el.dataset.isGolden === 'true';
  
  el.classList.add('flipped');
  if (audio) audio.playCardFlip();
  
  if (isBomb) {
    setTimeout(handleBomb, 400);
    return;
  }
  
  if (!gameState.firstCard) {
    gameState.firstCard = el;
    if (isGolden) return;
  } else if (!gameState.secondCard) {
    gameState.secondCard = el;
    gameState.canFlip = false;
    setTimeout(isGolden ? checkGoldenMatch : checkMatch, 500);
  }
}

function checkGoldenMatch() {
  const f = gameState.firstCard?.dataset.isGolden === 'true';
  const s = gameState.secondCard?.dataset.isGolden === 'true';
  
  if (f && s) {
    gameState.firstCard.classList.add('matched');
    gameState.secondCard.classList.add('matched');
    gameState.currentWin = gameState.currentBet * CONFIG.GOLDEN_MULTIPLIER;
    gameState.multiplier = CONFIG.GOLDEN_MULTIPLIER;
    if (audio) audio.playWin();
    updateUI();
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.canFlip = true;
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = `GOLDEN! +${formatNumber(gameState.currentWin)}`;
    showCashoutOption();
  } else {
    gameState.firstCard.classList.remove('flipped');
    gameState.secondCard.classList.remove('flipped');
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.canFlip = true;
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'No match';
  }
}

function checkMatch() {
  if (!gameState.firstCard || !gameState.secondCard) return;
  
  const fv = gameState.firstCard.dataset.value;
  const sv = gameState.secondCard.dataset.value;
  const fid = gameState.firstCard.dataset.id;
  const sid = gameState.secondCard.dataset.id;
  
  if (fv === sv && fid !== sid) {
    gameState.firstCard.classList.add('matched');
    gameState.secondCard.classList.add('matched');
    gameState.pairsMatched++;
    gameState.multiplier = CONFIG.MULTIPLIERS[gameState.pairsMatched - 1] || 1;
    gameState.currentWin = Math.floor(gameState.currentBet * gameState.multiplier);
    
    gameState.totalWagered += gameState.currentBet;
    updateUserDataInFirebase(currentUser.id, { totalWagered: gameState.totalWagered });
    
    if (audio) audio.playMatch();
    updateUI();
    updateProgress();
    
    if (gameState.pairsMatched >= CONFIG.PAIRS_COUNT) {
      gameState.currentWin = gameState.currentBet * CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1];
      setTimeout(handleMaxWin, 400);
    } else {
      const messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = `MATCH! +${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`;
      showCashoutOption();
    }
    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.canFlip = true;
  } else {
    setTimeout(() => {
      gameState.firstCard.classList.remove('flipped');
      gameState.secondCard.classList.remove('flipped');
      gameState.firstCard = null;
      gameState.secondCard = null;
      gameState.canFlip = true;
      const messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = 'Try again';
    }, 400);
  }
}

function showCashoutOption() {
  const cashoutBtn = document.getElementById('cashoutBtn');
  const continueBtn = document.getElementById('continueBtn');
  if (cashoutBtn) cashoutBtn.classList.remove('hidden');
  if (continueBtn) continueBtn.classList.remove('hidden');
  gameState.canFlip = false;
}

function cashout() {
  if (gameState.currentWin <= 0) return;
  
  gameState.balance += gameState.currentWin;
  gameState.totalBets++;
  gameState.totalWins++;
  
  updateUserDataInFirebase(currentUser.id, {
    coins: gameState.balance,
    totalBets: gameState.totalBets,
    totalWins: gameState.totalWins,
    totalSpent: gameState.totalSpent,
    totalWagered: gameState.totalWagered
  });
  
  saveGameToHistory(true, gameState.currentBet, gameState.currentWin, gameState.multiplier);
  if (audio) audio.playCashout();
  
  const winAmountDisplay = document.getElementById('winAmountDisplay');
  const winMultiplierDisplay = document.getElementById('winMultiplierDisplay');
  const winOverlay = document.getElementById('winOverlay');
  
  if (winAmountDisplay) winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  if (winMultiplierDisplay) winMultiplierDisplay.textContent = `${gameState.multiplier}x`;
  if (winOverlay) winOverlay.classList.add('active');
  endRound();
}

function continuePlaying() {
  const cashoutBtn = document.getElementById('cashoutBtn');
  const continueBtn = document.getElementById('continueBtn');
  const messageText = document.getElementById('messageText');
  
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
  if (continueBtn) continueBtn.classList.add('hidden');
  gameState.canFlip = true;
  if (messageText) messageText.textContent = 'Continue playing!';
  if (audio) audio.playClick();
}

function handleBomb() {
  gameState.totalBets++;
  gameState.totalWagered += gameState.currentBet;
  
  updateUserDataInFirebase(currentUser.id, {
    coins: gameState.balance,
    totalBets: gameState.totalBets,
    totalSpent: gameState.totalSpent,
    totalWagered: gameState.totalWagered
  });
  saveGameToHistory(false, gameState.currentBet, 0, 1);
  if (audio) audio.playBomb();
  
  const loseSubtext = document.getElementById('loseSubtext');
  const loseOverlay = document.getElementById('loseOverlay');
  
  if (loseSubtext) loseSubtext.textContent = `Lost ${formatNumber(gameState.currentBet)} coins`;
  if (loseOverlay) loseOverlay.classList.add('active');
  endRound();
}

function handleMaxWin() {
  gameState.balance += gameState.currentWin;
  gameState.totalBets++;
  gameState.totalWins++;
  
  updateUserDataInFirebase(currentUser.id, {
    coins: gameState.balance,
    totalBets: gameState.totalBets,
    totalWins: gameState.totalWins,
    totalSpent: gameState.totalSpent,
    totalWagered: gameState.totalWagered
  });
  saveGameToHistory(true, gameState.currentBet, gameState.currentWin, CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]);
  if (audio) audio.playWin();
  
  const winAmountDisplay = document.getElementById('winAmountDisplay');
  const winMultiplierDisplay = document.getElementById('winMultiplierDisplay');
  const winOverlay = document.getElementById('winOverlay');
  
  if (winAmountDisplay) winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  if (winMultiplierDisplay) winMultiplierDisplay.textContent = `${CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]}x MAX!`;
  if (winOverlay) winOverlay.classList.add('active');
  endRound();
}

function endRound() {
  gameState.isPlaying = false;
  gameState.canFlip = false;
  const cashoutBtn = document.getElementById('cashoutBtn');
  const continueBtn = document.getElementById('continueBtn');
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
  if (continueBtn) continueBtn.classList.add('hidden');
  updateUI();
}

function resetGame() {
  const winOverlay = document.getElementById('winOverlay');
  const loseOverlay = document.getElementById('loseOverlay');
  const betPanel = document.getElementById('betPanel');
  const startBtn = document.getElementById('startBtn');
  const progressSection = document.getElementById('progressSection');
  const cardGrid = document.getElementById('cardGrid');
  const messageText = document.getElementById('messageText');
  
  if (winOverlay) winOverlay.classList.remove('active');
  if (loseOverlay) loseOverlay.classList.remove('active');
  if (betPanel) betPanel.style.display = 'block';
  if (startBtn) startBtn.classList.remove('hidden');
  if (progressSection) progressSection.classList.add('hidden');
  if (cardGrid) cardGrid.innerHTML = '';
  
  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  updateUI();
  if (messageText) messageText.textContent = 'Select bet';
  if (audio) audio.playClick();
}

function updateProgress() {
  const pairsMatched = document.getElementById('pairsMatched');
  const progressFill = document.getElementById('progressFill');
  if (pairsMatched) pairsMatched.textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`;
  const percent = (gameState.pairsMatched / CONFIG.PAIRS_COUNT) * 100;
  if (progressFill) progressFill.style.width = percent + '%';
}

function saveGameToHistory(won, betAmount, winAmount, multiplier) {
  if (!currentUser || currentUser.isGuest) return;
  database.ref('game-history').push().set({
    userId: currentUser.id,
    username: currentUser.username,
    bet: betAmount,
    winAmount: winAmount,
    multiplier: multiplier,
    result: won ? (multiplier >= 20 ? 'maxwin' : 'win') : 'loss',
    timestamp: new Date().toISOString()
  });
}

// ===== OFFERS FUNCTIONS =====
function openOffers() { 
  const section = document.getElementById('offersSection');
  if (section) section.classList.add('active'); 
  if (audio) audio.playClick(); 
}

function closeOffers() { 
  const section = document.getElementById('offersSection');
  if (section) section.classList.remove('active'); 
  if (audio) audio.playClick(); 
}

function openMissions() { 
  const missionsSection = document.getElementById('missionsSection');
  if (missionsSection) missionsSection.classList.add('active');
  renderMissions();
  closeOffers(); 
  if (audio) audio.playClick(); 
}

function closeMissions() { 
  const missionsSection = document.getElementById('missionsSection');
  if (missionsSection) missionsSection.classList.remove('active');
  openOffers(); 
}

function renderMissions() {
  const container = document.getElementById('missionsContent');
  if (!container) return;
  
  const missions = [
    { id: 'dailyLogin', icon: '🎁', title: 'Daily Login', desc: 'Login daily to claim reward', reward: '10-25 Coins', status: 'available' },
    { id: 'firstDeposit', icon: '💰', title: 'First Deposit', desc: 'Make your first deposit', reward: '15-30 Coins', status: 'locked' },
    { id: 'gamesPlayed', icon: '🎮', title: 'Betting Enthusiast', desc: 'Place 10 bets', reward: '25-40 Coins', status: 'locked' },
    { id: 'bigWin', icon: '🏆', title: 'Winner\'s Circle', desc: 'Win 5 games', reward: '30-50 Coins', status: 'locked' }
  ];
  
  container.innerHTML = missions.map(mission => `
    <div class="mission-card">
      <div class="mission-header"><span class="mission-title">${mission.title}</span></div>
      <div class="mission-desc">${mission.desc}</div>
      <div class="mission-reward">🎁 ${mission.reward}</div>
      <button class="mission-btn" onclick="showPopup('Coming Soon', 'This mission will be available soon')">Claim</button>
    </div>
  `).join('');
}

function openEvents() { 
  const eventsSection = document.getElementById('eventsSection');
  if (eventsSection) eventsSection.classList.add('active');
  closeOffers(); 
  if (audio) audio.playClick(); 
}

function closeEvents() { 
  const eventsSection = document.getElementById('eventsSection');
  if (eventsSection) eventsSection.classList.remove('active');
  openOffers(); 
}

function openSupport() { 
  const supportSection = document.getElementById('supportSection');
  if (supportSection) supportSection.classList.add('active');
  closeOffers(); 
  if (audio) audio.playClick(); 
}

function closeSupport() { 
  const supportSection = document.getElementById('supportSection');
  if (supportSection) supportSection.classList.remove('active');
  openOffers(); 
}

function openVIPPopup() {
  const content = document.getElementById('vipPopupContent');
  if (content) {
    let html = '<h3>VIP Benefits</h3>';
    VIP_CONFIG.levels.slice(0, 6).forEach(vip => {
      html += `
        <div style="margin: 0.5rem 0; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 8px;">
          <strong>VIP ${vip.level}</strong> - Daily: ${vip.dailyReward} | Weekly: ${vip.weeklyReward} | Monthly: ${vip.monthlyReward}<br>
          <small>Requires ${formatNumber(vip.requiredSpend)} coins spent</small>
        </div>
      `;
    });
    content.innerHTML = html;
  }
  const vipPopup = document.getElementById('vipPopup');
  if (vipPopup) vipPopup.classList.add('active'); 
  if (audio) audio.playClick(); 
}

function closeVIPPopup() { 
  const vipPopup = document.getElementById('vipPopup');
  if (vipPopup) vipPopup.classList.remove('active'); 
  if (audio) audio.playClick(); 
}

function unlockVIP() {
  showPopup('VIP Info', 'Your VIP level increases automatically based on total coins spent in the game!');
  closeVIPPopup();
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) { 
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active'); 
  if (audio) audio.playClick(); 
}

function closeModal(modalId) { 
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active'); 
  if (audio) audio.playClick(); 
}

function toggleSound() { 
  audio.toggle(); 
}

function toggleNotifications() { 
  showPopup('Notifications', 'Notification settings saved'); 
}

function showThemeSelector() { 
  const selector = document.getElementById('themeSelector');
  if (selector) selector.classList.toggle('active'); 
  if (audio) audio.playClick(); 
}

function changeTheme(themeName) {
  document.body.className = 'theme-' + themeName;
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    const btn = event.target.closest('.theme-btn');
    if (btn) btn.classList.add('active');
  }
  if (audio) audio.playClick();
}

function openReferral() { 
  const referralSection = document.getElementById('referralSection');
  if (referralSection) referralSection.classList.add('active');
  loadReferralData();
  if (audio) audio.playClick(); 
}

function closeReferral() { 
  const referralSection = document.getElementById('referralSection');
  if (referralSection) referralSection.classList.remove('active');
}

// ===== AUDIO SYSTEM =====
class AudioSystem {
  constructor() { 
    this.muted = false; 
    this.audioContext = null; 
    this.initAudioContext(); 
  }
  
  initAudioContext() { 
    try { 
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
    } catch (e) {} 
  }
  
  playTone(f, d, type = 'sine', v = 0.3) {
    if (this.muted || !this.audioContext) return;
    const o = this.audioContext.createOscillator();
    const g = this.audioContext.createGain();
    o.connect(g); 
    g.connect(this.audioContext.destination);
    o.frequency.value = f; 
    o.type = type;
    g.gain.setValueAtTime(v, this.audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + d);
    o.start(this.audioContext.currentTime);
    o.stop(this.audioContext.currentTime + d);
  }
  
  playCardFlip() { 
    this.playTone(800, 0.08, 'sine', 0.2); 
    setTimeout(() => this.playTone(600, 0.08, 'sine', 0.15), 40); 
  }
  playMatch() { 
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => this.playTone(n, 0.15), i * 80)); 
  }
  playWin() { 
    [523, 659, 784, 1047, 1319, 1568].forEach((n, i) => setTimeout(() => this.playTone(n, 0.25), i * 100)); 
  }
  playBomb() { 
    this.playTone(150, 0.4); 
    setTimeout(() => this.playTone(100, 0.3), 80); 
    setTimeout(() => this.playTone(80, 0.2), 160); 
  }
  playClick() { 
    this.playTone(1000, 0.04); 
  }
  playCashout() { 
    [784, 988, 1175, 1568].forEach((n, i) => setTimeout(() => this.playTone(n, 0.2), i * 60)); 
  }
  playShuffle() { 
    for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(200 + Math.random() * 400, 0.05), i * 50); 
  }
  toggle() { 
    this.muted = !this.muted; 
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) soundToggle.classList.toggle('active', !this.muted); 
    return this.muted; 
  }
}

const audio = new AudioSystem();

// ===== CHECK FOR EXISTING SESSION ON PAGE LOAD =====
async function checkExistingSession() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        console.log("🔄 Restoring existing session for:", user.uid);
        try {
          const userData = await getUserDataFromFirebase(user.uid);
          if (userData) {
            currentUser = {
              username: userData.username,
              avatar: userData.avatar || '👤',
              isGuest: false,
              id: user.uid,
              totalBets: userData.totalBets || 0,
              totalWins: userData.totalWins || 0,
              totalWagered: userData.totalWagered || 0,
              totalDeposits: userData.totalDeposits || 0,
              requiredWagered: userData.requiredWagered || 0,
              referredBy: userData.referredBy || null
            };
            gameState.balance = userData.coins || 0;
            gameState.totalBets = userData.totalBets || 0;
            gameState.totalWins = userData.totalWins || 0;
            gameState.totalSpent = userData.totalSpent || 0;
            gameState.totalWagered = userData.totalWagered || 0;
            gameState.totalDeposits = userData.totalDeposits || 0;
            gameState.requiredWagered = userData.requiredWagered || 0;
            gameState.vipLevel = userData.vipLevel || 0;
            
            const rewardSnap = await database.ref('users/' + currentUser.id + '/rewards').once('value');
            if (rewardSnap.val()) {
              rewardState = { ...rewardState, ...rewardSnap.val() };
            }
            
            updateHeaderForUser();
            updateUI();
            updateVIPUI();
            hideAuthButtons();
            startAutoRefresh();
            loadNotifications();
            loadSupportTickets();
            loadReferralData();
            loadWithdrawalAccounts();
            console.log("✅ Session restored successfully");
          }
        } catch (error) {
          console.error("Error restoring session:", error);
        }
      }
      resolve();
    });
  });
}

// ===== INITIALIZATION =====
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.animationDuration = (10 + Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

async function initApp() {
  createParticles();
  startLeaderboardRotation();
  
  await checkExistingSession();
  
  document.querySelectorAll('.bet-option').forEach(btn => {
    btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet)));
  });
  
  const customBetBtn = document.getElementById('customBetBtn');
  if (customBetBtn) {
    customBetBtn.addEventListener('click', () => {
      const val = parseInt(document.getElementById('customBet').value);
      if (!isNaN(val)) selectBet(val);
    });
  }
  
  const startBtn = document.getElementById('startBtn');
  const cashoutBtn = document.getElementById('cashoutBtn');
  const continueBtn = document.getElementById('continueBtn');
  const playAgainWin = document.getElementById('playAgainWin');
  const playAgainLose = document.getElementById('playAgainLose');
  
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (cashoutBtn) cashoutBtn.addEventListener('click', cashout);
  if (continueBtn) continueBtn.addEventListener('click', continuePlaying);
  if (playAgainWin) playAgainWin.addEventListener('click', resetGame);
  if (playAgainLose) playAgainLose.addEventListener('click', resetGame);
  
  const refCode = getReferralCodeFromURL();
  if (refCode) {
    setTimeout(() => {
      openAuthModal('register');
      const referralInput = document.querySelector('#registerForm input[name="referralCode"]');
      if (referralInput) referralInput.value = refCode;
    }, 1000);
  }
  
  console.log("✅ Royal Match ready with working login and wager system!");
}

// Make all functions globally available
window.openAuthModal = openAuthModal;
window.switchAuthTab = switchAuthTab;
window.closeAuth = closeAuth;
window.guestLogin = guestLogin;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.logout = logout;
window.changeAvatar = changeAvatar;
window.selectAvatar = selectAvatar;
window.closeAvatarPopup = closeAvatarPopup;
window.showEditUsername = showEditUsername;
window.updateUsername = updateUsername;
window.cancelEdit = cancelEdit;
window.saveWithdrawalAccounts = saveWithdrawalAccounts;
window.openVIPPopup = openVIPPopup;
window.closeVIPPopup = closeVIPPopup;
window.unlockVIP = unlockVIP;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleSound = toggleSound;
window.toggleNotifications = toggleNotifications;
window.showThemeSelector = showThemeSelector;
window.changeTheme = changeTheme;
window.setActiveNav = setActiveNav;
window.openReferral = openReferral;
window.closeReferral = closeReferral;
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.filterReferrals = filterReferrals;
window.claimMilestone = claimMilestone;
window.openShop = openShop;
window.closeShop = closeShop;
window.purchaseCoins = purchaseCoins;
window.openWithdraw = openWithdraw;
window.closeWithdrawPopup = closeWithdrawPopup;
window.processWithdraw = processWithdraw;
window.enterGame = enterGame;
window.exitGame = exitGame;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.closePopup = closePopup;
window.openNotificationPanel = openNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.deleteNotification = deleteNotification;
window.deleteAllNotifications = deleteAllNotifications;
window.openOffers = openOffers;
window.closeOffers = closeOffers;
window.openMissions = openMissions;
window.closeMissions = closeMissions;
window.openEvents = openEvents;
window.closeEvents = closeEvents;
window.openSupport = openSupport;
window.closeSupport = closeSupport;
window.openSupportBot = openSupportBot;
window.openAdditionalSupport = openAdditionalSupport;
window.closeAdditionalSupport = closeAdditionalSupport;
window.sendSupportMessage = sendSupportMessage;
window.openDailyRewards = openDailyRewards;
window.closeDailyRewards = closeDailyRewards;
window.claimDailyReward = claimDailyReward;
window.claimWeeklyReward = claimWeeklyReward;
window.claimMonthlyReward = claimMonthlyReward;
window.submitPaymentRequest = submitPaymentRequest;
window.closePaymentNumberPage = closePaymentNumberPage;
window.closePaymentInfoPage = closePaymentInfoPage;
window.goBackToShop = goBackToShop;
window.copyJazzCashNumber = copyJazzCashNumber;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});