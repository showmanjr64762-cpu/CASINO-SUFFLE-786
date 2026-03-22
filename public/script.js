// ===== ROYAL MATCH - COMPLETE WITH REFERRAL SYSTEM =====
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();



// Update user coins with proper auth
async function updateUserCoins(userId, newBalance) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("No authenticated user");
            return false;
        }
        
        // Update only if it's the current user or admin
        await database.ref('users/' + userId).update({
            coins: newBalance
        });
        return true;
    } catch (error) {
        console.error("Error updating coins:", error);
        return false;
    }
}

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isInGame = false;
let autoRefreshInterval = null;
let currentWithdrawalId = null;
let withdrawalTimer = null;
let notifications = [];

// ===== FIXED WITHDRAWAL ACCOUNT STRUCTURE =====
let savedAccounts = {
  jazzcash: "",
  easypaisa: "",
  bank: ""
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
  goldenCardsFound: 0,
  totalBets: 0,
  totalWins: 0,
  lastGameResult: null,
  lastGameTimestamp: 0
};

// ===== REFERRAL SYSTEM VARIABLES =====
let referralData = {
  code: null,
  link: null,
  totalReferrals: 0,
  activeReferrals: 0,
  totalEarnings: 0,
  referrals: [],
  milestones: {
    5: false,
    10: false,
    25: false,
    50: false
  }
};

// Commission rates
const COMMISSION_RATES = {
  level1: 0.05,
  level2: 0.02,
  level3: 0.01
};

// ===== DATA =====
const pakistaniNames = [
  'Ahmed Hassan', 'Ali Khan', 'Bilal Ahmed', 'Hassan Ali', 'Muhammad Imran',
  'Faisal Khan', 'Karim Abdul', 'Malik Saeed', 'Nasir Ahmed', 'Omar Khan',
  'Rashid Ali', 'Samir Khan', 'Tariq Hassan', 'Usman Ahmed', 'Wasim Khan',
  'Yousaf Ali', 'Zain Ahmed', 'Adnan Khan', 'Babar Ahmed', 'Chand Hassan'
];

const championAvatars = ['👑', '🥈', '🥉', '🎯', '💎', '🦁', '⭐', '🏆'];

// ===== MISSION SYSTEM =====
const MissionSystem = {
  getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  getMissionData() {
    const data = localStorage.getItem('royalMatchMissions');
    return data ? JSON.parse(data) : this.getDefaultMissionData();
  },

  saveMissionData(data) {
    localStorage.setItem('royalMatchMissions', JSON.stringify(data));
  },

  getDefaultMissionData() {
    return {
      lastLoginDate: null,
      consecutiveLoginDays: 0,
      loginRewardClaimed: false,
      loginRewardClaimedDate: null,
      firstDepositMade: false,
      firstDepositRewardClaimed: false,
      sevenDayRewardClaimed: false,
      sevenDayRewardClaimedDate: null,
      totalBets: 0,
      gamesPlayedRewardClaimed: false,
      totalWins: 0,
      bigWinRewardClaimed: false,
      totalDeposits: 0,
      depositMilestoneClaimed: false,
      hundredWinsRewardClaimed: false,
      thousandCoinsDepositClaimed: false
    };
  },

  checkLoginStreak() {
    const data = this.getMissionData();
    const today = this.getTodayString();

    if (data.lastLoginDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    if (data.lastLoginDate === yesterdayString) {
      data.consecutiveLoginDays++;
    } else if (data.lastLoginDate !== today) {
      data.consecutiveLoginDays = 1;
    }

    data.lastLoginDate = today;
    data.loginRewardClaimed = false;
    this.saveMissionData(data);
  },

  getRandomReward(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  claimLoginReward() {
    if (!currentUser || currentUser.isGuest) return { success: false, message: 'Login Required' };

    const data = this.getMissionData();
    const today = this.getTodayString();

    if (data.loginRewardClaimedDate === today) {
      return { success: false, message: 'Already claimed today' };
    }

    const reward = this.getRandomReward(10, 25);
    data.loginRewardClaimed = true;
    data.loginRewardClaimedDate = today;
    this.saveMissionData(data);

    return { success: true, reward };
  },

  recordGamePlayed(won, betAmount) {
    const data = this.getMissionData();
    data.totalBets = (data.totalBets || 0) + 1;
    if (won) data.totalWins = (data.totalWins || 0) + 1;
    this.saveMissionData(data);

    gameState.totalBets = data.totalBets;
    gameState.totalWins = data.totalWins;
  },

  getMissionsStatus() {
    const data = this.getMissionData();
    const today = this.getTodayString();

    return [
      {
        id: 'login',
        icon: '🎁',
        title: 'Daily Login Reward',
        description: 'Login daily to claim your reward!',
        reward: '10-25 Coins',
        status: (data.loginRewardClaimedDate === today) ? 'claimed' : 'available',
        canClaim: data.loginRewardClaimedDate !== today,
        isHard: false
      },
      {
        id: 'firstDeposit',
        icon: '💰',
        title: 'First Deposit Bonus',
        description: 'Make your first deposit of 100+ coins',
        reward: '15-30 Coins',
        status: data.firstDepositRewardClaimed ? 'claimed' : (data.firstDepositMade ? 'available' : 'locked'),
        canClaim: data.firstDepositMade && !data.firstDepositRewardClaimed,
        isHard: false
      },
      {
        id: 'sevenDay',
        icon: '📅',
        title: '7-Day Login Streak',
        description: 'Login for 7 consecutive days',
        reward: '20-40 Coins',
        status: data.sevenDayRewardClaimed ? 'claimed' : (data.consecutiveLoginDays >= 7 ? 'available' : 'locked'),
        progress: `${data.consecutiveLoginDays}/7 days`,
        canClaim: data.consecutiveLoginDays >= 7 && !data.sevenDayRewardClaimed,
        isHard: false
      },
      {
        id: 'gamesPlayed',
        icon: '🎮',
        title: 'Betting Enthusiast',
        description: 'Place 10 bets',
        reward: '25-40 Coins',
        status: data.gamesPlayedRewardClaimed ? 'claimed' : (data.totalBets >= 10 ? 'available' : 'locked'),
        progress: `${Math.min(data.totalBets, 10)}/10 bets`,
        canClaim: data.totalBets >= 10 && !data.gamesPlayedRewardClaimed,
        isHard: false
      },
      {
        id: 'bigWin',
        icon: '🏆',
        title: 'Winner\'s Circle',
        description: 'Win 5 games',
        reward: '30-50 Coins',
        status: data.bigWinRewardClaimed ? 'claimed' : (data.totalWins >= 5 ? 'available' : 'locked'),
        progress: `${Math.min(data.totalWins, 5)}/5 wins`,
        canClaim: data.totalWins >= 5 && !data.bigWinRewardClaimed,
        isHard: false
      }
    ];
  },

  renderMissions() {
    const container = document.getElementById('missionsContent');
    if (!container) return;

    const isGuest = currentUser && currentUser.isGuest;
    const missions = this.getMissionsStatus();

    let html = '';

    if (isGuest) {
      html += `
        <div class="guest-warning" style="background: rgba(0,0,0,0.8); padding: 1rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
          <p>⚠️ Missions are only available for registered users. 
          <a onclick="closeMissions(); openAuthModal('register');" style="color: #ffd700; cursor: pointer;">Register now</a> to start earning rewards!</p>
        </div>
      `;
    }

    missions.forEach(mission => {
      let btnHtml = '';
      if (isGuest) {
        btnHtml = `<button class="mission-btn" disabled style="background: #666; padding: 0.5rem 1rem; border-radius: 20px; border: none;">Login Required</button>`;
      } else if (mission.status === 'claimed') {
        btnHtml = `<button class="mission-btn" disabled style="background: #2d6a4f; padding: 0.5rem 1rem; border-radius: 20px;">✓ Claimed</button>`;
      } else if (mission.status === 'locked') {
        btnHtml = `<button class="mission-btn" disabled style="background: #555; padding: 0.5rem 1rem; border-radius: 20px;">🔒 Locked</button>`;
      } else {
        btnHtml = `<button class="mission-btn" onclick="claimMissionReward('${mission.id}')" style="background: linear-gradient(145deg, #ffd700, #ffb347); padding: 0.5rem 1rem; border-radius: 20px; border: none; cursor: pointer;">🎁 Claim</button>`;
      }

      html += `
        <div class="mission-card" style="background: linear-gradient(145deg, rgba(6,78,59,0.8), rgba(2,44,34,0.9)); border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span style="font-size: 1.5rem;">${mission.icon}</span>
              <span style="font-weight: bold;">${mission.title}</span>
            </div>
            <span style="background: ${mission.status === 'claimed' ? '#2d6a4f' : (mission.status === 'locked' ? '#555' : '#ffd700')}; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem;">${mission.status}</span>
          </div>
          <div style="color: #aaa; font-size: 0.8rem; margin-bottom: 0.5rem;">${mission.description}</div>
          ${mission.progress ? `
            <div style="margin: 0.5rem 0;">
              <div style="background: #333; border-radius: 10px; height: 6px; overflow: hidden;">
                <div style="width: ${parseInt(mission.progress) / 7 * 100}%; background: #ffd700; height: 100%;"></div>
              </div>
              <div style="font-size: 0.7rem; color: #aaa; margin-top: 0.2rem;">${mission.progress}</div>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
            <span style="color: #ffd700;">🎁 ${mission.reward}</span>
            ${btnHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }
};

// ===== REFERRAL SYSTEM FUNCTIONS =====

function generateReferralCode(username) {
  const prefix = username.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${prefix}${randomNum}`;
}

async function createReferralCode(userId, username) {
  const referralCode = generateReferralCode(username);
  await database.ref('users/' + userId).update({
    referralCode: referralCode,
    referralCount: 0,
    referralEarnings: 0,
    activeReferrals: 0
  });
  return referralCode;
}

async function applyReferral(referralCode, newUserId) {
  if (!referralCode) return null;
  
  const usersRef = database.ref('users');
  const snapshot = await usersRef.once('value');
  const users = snapshot.val();
  
  let referrerId = null;
  for (const [id, user] of Object.entries(users)) {
    if (user.referralCode === referralCode && id !== newUserId) {
      referrerId = id;
      break;
    }
  }
  
  if (referrerId) {
    await database.ref('users/' + newUserId).update({ referredBy: referrerId });
    
    const referrerRef = database.ref('users/' + referrerId);
    const referrerSnap = await referrerRef.once('value');
    const referrerData = referrerSnap.val();
    
    await referrerRef.update({
      referralCount: (referrerData.referralCount || 0) + 1,
      activeReferrals: (referrerData.activeReferrals || 0) + 1
    });
    
    const referralRef = database.ref('referrals').push();
    await referralRef.set({
      referrerId: referrerId,
      referredUserId: newUserId,
      level: 1,
      status: 'active',
      timestamp: new Date().toISOString()
    });
    
    const signupBonus = 50;
    await referrerRef.update({
      coins: (referrerData.coins || 1000) + signupBonus,
      referralEarnings: (referrerData.referralEarnings || 0) + signupBonus
    });
    
    sendNotificationToPlayer(referrerId, 'New Referral!', `Someone signed up using your code! You earned ${signupBonus} coins!`, '🎉');
    
    return referrerId;
  }
  return null;
}

async function processDepositCommission(userId, depositAmount) {
  const userRef = database.ref('users/' + userId);
  const userSnap = await userRef.once('value');
  const userData = userSnap.val();
  
  let referrerId = userData.referredBy;
  let level = 1;
  
  while (referrerId && level <= 3) {
    const referrerRef = database.ref('users/' + referrerId);
    const referrerSnap = await referrerRef.once('value');
    const referrerData = referrerSnap.val();
    
    let commissionRate = level === 1 ? 0.05 : level === 2 ? 0.02 : 0.01;
    const commission = Math.floor(depositAmount * commissionRate);
    
    if (commission > 0) {
      await referrerRef.update({
        coins: (referrerData.coins || 0) + commission,
        referralEarnings: (referrerData.referralEarnings || 0) + commission
      });
      
      sendNotificationToPlayer(referrerId, 'Referral Commission!', `Your level ${level} referral deposited ${depositAmount} coins. You earned ${commission} coins!`, '💰');
    }
    
    const nextReferrerSnap = await database.ref('users/' + referrerId).once('value');
    referrerId = nextReferrerSnap.val().referredBy;
    level++;
  }
}

async function loadReferralData() {
  if (!currentUser || currentUser.isGuest) return;
  
  const userRef = database.ref('users/' + currentUser.id);
  const userSnap = await userRef.once('value');
  const userData = userSnap.val();
  
  referralData.code = userData.referralCode;
  referralData.totalReferrals = userData.referralCount || 0;
  referralData.activeReferrals = userData.activeReferrals || 0;
  referralData.totalEarnings = userData.referralEarnings || 0;
  
  const baseUrl = window.location.origin;
  referralData.link = `${baseUrl}/?ref=${referralData.code}`;
  
  const referralsRef = database.ref('referrals');
  const referralsSnap = await referralsRef.orderByChild('referrerId').equalTo(currentUser.id).once('value');
  const referrals = referralsSnap.val();
  
  if (referrals) {
    referralData.referrals = [];
    for (const [id, ref] of Object.entries(referrals)) {
      const referredUserSnap = await database.ref('users/' + ref.referredUserId).once('value');
      const referredUser = referredUserSnap.val();
      
      const depositsRef = database.ref('transactions');
      const depositsSnap = await depositsRef.orderByChild('userId').equalTo(ref.referredUserId).once('value');
      let totalDeposits = 0;
      if (depositsSnap.val()) {
        Object.values(depositsSnap.val()).forEach(t => {
          if (t.type === 'deposit') totalDeposits += t.amount;
        });
      }
      
      referralData.referrals.push({
        id: id,
        username: referredUser?.username || 'Unknown',
        level: ref.level,
        deposits: totalDeposits,
        status: ref.status,
        joined: ref.timestamp
      });
    }
  }
  
  updateReferralUI();
}

function updateReferralUI() {
  document.getElementById('referralCodeDisplay').textContent = referralData.code || 'Loading...';
  document.getElementById('referralLinkInput').value = referralData.link || '';
  document.getElementById('totalReferrals').textContent = referralData.totalReferrals;
  document.getElementById('activeReferrals').textContent = referralData.activeReferrals;
  document.getElementById('totalEarnings').textContent = formatNumber(referralData.totalEarnings);
  
  const tbody = document.getElementById('referralsBody');
  if (referralData.referrals.length === 0) {
    tbody.innerHTML = '}<td colspan="6" style="text-align:center;">No referrals yet</td></tr>';
  } else {
    tbody.innerHTML = referralData.referrals.map(ref => `
      <tr>
        <td>${escapeHtml(ref.username)}</td>
        <td>Level ${ref.level}</td>
        <td class="amount-positive">${formatNumber(ref.deposits)}</td>
        <td class="amount-positive">${formatNumber(ref.deposits * (ref.level === 1 ? 0.05 : ref.level === 2 ? 0.02 : 0.01))}</td>
        <td><span class="status-badge ${ref.status === 'active' ? 'approved' : 'pending'}">${ref.status}</span></td>
        <td>${new Date(ref.joined).toLocaleDateString()}</td>
      </tr>
    `).join('');
  }
  
  checkMilestones();
}

function checkMilestones() {
  const milestones = [5, 10, 25, 50];
  for (const milestone of milestones) {
    if (referralData.totalReferrals >= milestone && !referralData.milestones[milestone]) {
      const bonus = milestone === 5 ? 500 : milestone === 10 ? 1500 : milestone === 25 ? 5000 : 15000;
      if (currentUser && !currentUser.isGuest) {
        database.ref('users/' + currentUser.id).once('value', snapshot => {
          const userData = snapshot.val();
          database.ref('users/' + currentUser.id).update({
            coins: (userData.coins || 0) + bonus
          });
          gameState.balance += bonus;
          updateUI();
        });
      }
      referralData.milestones[milestone] = true;
      showPopup('Milestone Reached!', `You reached ${milestone} referrals! You earned ${bonus} coins! 🎉`);
    }
  }
}

function copyReferralCode() {
  navigator.clipboard.writeText(referralData.code);
  showPopup('Copied!', 'Referral code copied to clipboard');
}

function copyReferralLink() {
  navigator.clipboard.writeText(referralData.link);
  showPopup('Copied!', 'Referral link copied to clipboard');
}

function filterReferrals(filter) {
  const tbody = document.getElementById('referralsBody');
  let filtered = referralData.referrals;
  
  if (filter === 'active') {
    filtered = referralData.referrals.filter(r => r.status === 'active');
  } else if (filter === 'inactive') {
    filtered = referralData.referrals.filter(r => r.status !== 'active');
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No referrals found</td></tr>';
  } else {
    tbody.innerHTML = filtered.map(ref => `
      <tr>
        <td>${escapeHtml(ref.username)}</td>
        <td>Level ${ref.level}</td>
        <td class="amount-positive">${formatNumber(ref.deposits)}</td>
        <td class="amount-positive">${formatNumber(ref.deposits * (ref.level === 1 ? 0.05 : ref.level === 2 ? 0.02 : 0.01))}</td>
        <td><span class="status-badge ${ref.status === 'active' ? 'approved' : 'pending'}">${ref.status}</span></td>
        <td>${new Date(ref.joined).toLocaleDateString()}</td>
      </tr>
    `).join('');
  }
  
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function claimMilestone(milestone) {
  if (referralData.totalReferrals >= milestone && !referralData.milestones[milestone]) {
    checkMilestones();
  } else if (referralData.milestones[milestone]) {
    showPopup('Already Claimed', 'You have already claimed this milestone reward');
  } else {
    showPopup('Not Yet', `You need ${milestone} referrals to unlock this milestone`);
  }
}

// ===== WITHDRAWAL ACCOUNT FUNCTIONS =====

function validateMobileNumber(number) {
  const mobileRegex = /^03[0-9]{9}$/;
  return mobileRegex.test(number);
}

async function saveWithdrawalAccounts() {
  const jazzcash = document.getElementById('jazzcashNumber').value.trim();
  const easypaisa = document.getElementById('easypaisaNumber').value.trim();
  const bank = document.getElementById('bankAccount').value.trim();
  
  if (jazzcash && !validateMobileNumber(jazzcash)) {
    showPopup('Invalid Number', 'JazzCash number must start with 03 and be 11 digits');
    return;
  }
  
  if (easypaisa && !validateMobileNumber(easypaisa)) {
    showPopup('Invalid Number', 'Easypaisa number must start with 03 and be 11 digits');
    return;
  }
  
  const accounts = {};
  if (jazzcash) accounts.jazzcash = jazzcash;
  if (easypaisa) accounts.easypaisa = easypaisa;
  if (bank) accounts.bank = bank;
  
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
    document.getElementById('jazzcashNumber').value = savedAccounts.jazzcash || '';
    document.getElementById('easypaisaNumber').value = savedAccounts.easypaisa || '';
    document.getElementById('bankAccount').value = savedAccounts.bank || '';
  }
}

function updateWithdrawPopup() {
  const method = document.getElementById('withdrawMethod').value;
  const accountDisplay = document.getElementById('accountDisplay');
  
  if (savedAccounts[method]) {
    accountDisplay.innerHTML = `Account: ${savedAccounts[method]}`;
    accountDisplay.style.color = '#10b981';
  } else {
    accountDisplay.innerHTML = 'No account saved. Please add in profile.';
    accountDisplay.style.color = '#ff6b6b';
  }
}

// ===== FIREBASE FUNCTIONS =====

async function saveUserDataToFirebase(userId, data) {
  try {
    await database.ref('users/' + userId).set(data);
    console.log("✅ User data saved");
  } catch (error) {
    console.error("❌ Error saving user data:", error);
  }
}

async function getUserDataFromFirebase(userId) {
  try {
    const snapshot = await database.ref('users/' + userId).once('value');
    return snapshot.val();
  } catch (error) {
    console.error("❌ Error loading user data:", error);
    return null;
  }
}

async function updateUserDataInFirebase(userId, updates) {
  try {
    await database.ref('users/' + userId).update(updates);
    console.log("✅ User data updated");
  } catch (error) {
    console.error("❌ Error updating user data:", error);
  }
}

function saveGameToHistory(won, betAmount, winAmount, multiplier) {
  if (!currentUser || currentUser.isGuest) return;

  const gameRef = database.ref('game-history').push();
  gameRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    bet: betAmount,
    winAmount: winAmount,
    multiplier: multiplier,
    result: won ? (multiplier >= 20 ? 'maxwin' : 'win') : 'loss',
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString()
  });
}

function savePurchaseToHistory(amount, coins) {
  if (!currentUser || currentUser.isGuest) return;

  const transactionRef = database.ref('transactions').push();
  transactionRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    amount: amount,
    coins: coins,
    type: 'purchase',
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString()
  });
  
  if (currentUser.referredBy) {
    processDepositCommission(currentUser.id, coins);
  }
}

// ===== AUTO-REFRESH FUNCTIONS =====

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => refreshUserData(true), 3000);
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
      const newBalance = userData.coins || 1000;
      
      // Only update balance if not in game or balance difference is small
      if (!gameState.isPlaying || Math.abs(newBalance - oldBalance) < 1000) {
        gameState.balance = newBalance;
      }
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;

      currentUser.totalBets = userData.totalBets || 0;
      currentUser.totalWins = userData.totalWins || 0;

      updateUI();
    }
  } catch (error) {
    if (!silent) console.error("Refresh error:", error);
  }
}

// ===== NOTIFICATION SYSTEM =====

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
    if (badge) {
      badge.style.display = 'block';
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    }
    if (badgeSmall) {
      badgeSmall.style.display = 'inline-block';
      badgeSmall.textContent = unreadCount > 9 ? '9+' : unreadCount;
    }
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
  document.getElementById('notificationPanel').classList.add('open');
  markAllNotificationsRead();
}

function closeNotificationPanel() {
  document.getElementById('notificationPanel').classList.remove('open');
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

// ===== WITHDRAWAL SYSTEM =====

function processWithdraw() {
  const amount = parseInt(document.getElementById('withdrawAmount').value);
  const method = document.getElementById('withdrawMethod').value;
  
  if (!savedAccounts[method]) {
    showPopup('Error', 'Please save your account number in profile first');
    openProfile();
    return;
  }

  if (!amount || amount < 1000) {
    showPopup('Error', 'Minimum withdrawal amount is 1000 coins');
    return;
  }

  if (amount > gameState.balance) {
    showPopup('Error', 'Insufficient balance');
    return;
  }

  if (currentWithdrawalId) {
    showPopup('Error', 'You already have a pending withdrawal request');
    return;
  }

  showWithdrawalLoading();

  const withdrawRef = database.ref('withdrawals').push();
  currentWithdrawalId = withdrawRef.key;

  withdrawRef.set({
    id: currentWithdrawalId,
    userId: currentUser.id,
    username: currentUser.username,
    amount: amount,
    method: method,
    accountNumber: savedAccounts[method],
    status: 'pending',
    timestamp: new Date().toISOString(),
    expiresAt: Date.now() + 60000
  });

  startWithdrawalTimerCountdown();
}

let countdownInterval = null;

function showWithdrawalLoading() {
  document.getElementById('withdrawalLoading').classList.add('active');
  startWithdrawalTimerCountdown();
}

function startWithdrawalTimerCountdown() {
  let timeLeft = 60;
  const timerElement = document.getElementById('loadingTimer');
  const progressFill = document.getElementById('loadingProgressFill');

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timerElement) timerElement.textContent = `Time remaining: ${timeLeft}s`;
    if (progressFill) progressFill.style.width = ((60 - timeLeft) / 60 * 100) + '%';

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      cancelWithdrawal();
    }
  }, 1000);
}

function cancelWithdrawal() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = null;

  if (currentWithdrawalId) {
    database.ref('withdrawals/' + currentWithdrawalId).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });
    showPopup('Withdrawal Cancelled', 'Your withdrawal request has been cancelled');
    currentWithdrawalId = null;
  }

  document.getElementById('withdrawalLoading').classList.remove('active');
  closeWithdrawPopup();
}

function closeWithdrawPopup() {
  document.getElementById('withdrawPopup').classList.remove('active');
  document.getElementById('withdrawAmount').value = '';
  if (audio) audio.playClick();
}

function listenForWithdrawalStatus() {
  if (!currentUser || currentUser.isGuest) return;

  database.ref('withdrawals').orderByChild('userId').equalTo(currentUser.id).on('child_added', snapshot => {
    const withdrawal = snapshot.val();
    if (withdrawal.id === currentWithdrawalId && withdrawal.status !== 'pending') {
      handleWithdrawalResponse(withdrawal);
    }
  });

  database.ref('withdrawals').on('child_changed', snapshot => {
    const withdrawal = snapshot.val();
    if (withdrawal.userId === currentUser.id && withdrawal.id === currentWithdrawalId && withdrawal.status !== 'pending') {
      handleWithdrawalResponse(withdrawal);
    }
  });
}

function handleWithdrawalResponse(withdrawal) {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = null;
  document.getElementById('withdrawalLoading').classList.remove('active');

  if (withdrawal.status === 'approved') {
    gameState.balance -= withdrawal.amount;
    updateUI();
    updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
    showPopup('Withdrawal Approved!', `Your withdrawal of ${formatNumber(withdrawal.amount)} coins has been approved!`);
  } else if (withdrawal.status === 'rejected') {
    showPopup('Withdrawal Rejected', `Your withdrawal request was rejected. Reason: ${withdrawal.reason || 'Please contact support'}`);
  }

  currentWithdrawalId = null;
  closeWithdrawPopup();
}

// ===== ADDITIONAL SUPPORT SYSTEM =====

function openAdditionalSupport() {
  document.getElementById('additionalSupportSection').classList.add('active');
  loadSupportTickets();
}

function closeAdditionalSupport() {
  document.getElementById('additionalSupportSection').classList.remove('active');
}

function sendSupportMessage() {
  const message = document.getElementById('supportMessage').value.trim();

  if (!message) {
    showPopup('Error', 'Please enter a message');
    return;
  }

  if (!currentUser || currentUser.isGuest) {
    showPopup('Error', 'Please login to send support messages');
    openAuthModal('login');
    return;
  }

  const ticketRef = database.ref('support-tickets').push();
  ticketRef.set({
    id: ticketRef.key,
    userId: currentUser.id,
    username: currentUser.username,
    message: message,
    replies: [],
    status: 'pending',
    timestamp: new Date().toISOString()
  });

  document.getElementById('supportMessage').value = '';
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
        ${ticket.replies && ticket.replies.length > 0 ? `
          <div class="ticket-reply">
            <strong>Admin Reply:</strong><br>
            ${ticket.replies.map(r => `<div>${escapeHtml(r.message)} - ${new Date(r.timestamp).toLocaleTimeString()}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  });
}

// ===== UI FUNCTIONS =====

function openAuthModal(tab) {
  document.getElementById('authOverlay').classList.add('active');
  switchAuthTab(tab);
  if (audio) audio.playClick();
}

function switchAuthTab(tab) {
  document.getElementById('authTitle').textContent = tab === 'login' ? 'Login' : 'Register';
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
  if (audio) audio.playClick();
}

function closeAuth() {
  document.getElementById('authOverlay').classList.remove('active');
  if (audio) audio.playClick();
}

function guestLogin() {
  currentUser = {
    username: 'Guest_' + Math.floor(Math.random() * 9999),
    avatar: '👤',
    isGuest: true,
    id: 'GUEST' + Math.floor(Math.random() * 999),
    totalBets: 0,
    totalWins: 0
  };

  gameState.balance = 0;
  gameState.totalBets = 0;
  gameState.totalWins = 0;

  closeAuth();
  updateHeaderForUser();
  updateUI();
  hideAuthButtons();
  stopAutoRefresh();
  if (audio) audio.playClick();
  showPopup('Guest Mode', 'You are playing as guest with 0 coins');
}

function updateHeaderForUser() {
  const headerUsername = document.getElementById('headerUsername');
  const headerAvatar = document.getElementById('headerAvatarIcon');
  const userStatus = document.getElementById('userStatus');

  if (currentUser) {
    headerUsername.textContent = currentUser.username;
    headerAvatar.textContent = currentUser.avatar || '👤';
    userStatus.textContent = currentUser.isGuest ? 'Guest Mode' : 'Verified Player';
  } else {
    headerUsername.textContent = 'Guest';
    headerAvatar.textContent = '👤';
    userStatus.textContent = 'Tap to login';
  }
}

function hideAuthButtons() {
  document.getElementById('authButtons').style.display = 'none';
}

function showAuthButtons() {
  document.getElementById('authButtons').style.display = 'flex';
}

function openProfile() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  document.getElementById('profileModal').classList.add('active');
  document.getElementById('profileNameDisplay').textContent = currentUser.username;
  document.getElementById('profileIdDisplay').textContent = 'ID: ' + currentUser.id;
  document.getElementById('currentAvatarDisplay').textContent = currentUser.avatar || '👤';
  document.getElementById('profileCoins').textContent = gameState.balance;
  document.getElementById('profileBets').textContent = gameState.totalBets || 0;
  document.getElementById('profileWins').textContent = gameState.totalWins || 0;
  document.getElementById('editUsernameBtn').style.display = currentUser.isGuest ? 'none' : 'block';
  
  loadWithdrawalAccounts();
  if (audio) audio.playClick();
}

function closeProfile() {
  document.getElementById('profileModal').classList.remove('active');
  cancelEdit();
}

function showEditUsername() {
  document.getElementById('editUsernameSection').style.display = 'block';
  document.getElementById('editUsernameBtn').style.display = 'none';
}

function cancelEdit() {
  document.getElementById('editUsernameSection').style.display = 'none';
  document.getElementById('editUsernameBtn').style.display = 'block';
}

async function updateUsername() {
  const newUsername = document.getElementById('newUsername').value.trim();
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
  openProfile();
  showPopup('Success', 'Username updated');
}

function changeAvatar() {
  if (currentUser.isGuest) {
    showPopup('Error', 'Guests cannot change avatar');
    return;
  }
  document.getElementById('avatarPopup').classList.add('active');
}

async function selectAvatar(avatar) {
  if (currentUser.isGuest) return;

  currentUser.avatar = avatar;
  document.getElementById('currentAvatarDisplay').textContent = avatar;
  document.getElementById('headerAvatarIcon').textContent = avatar;

  await updateUserDataInFirebase(currentUser.id, { avatar: avatar });

  closeAvatarPopup();
  showPopup('Success', 'Avatar updated');
}

function closeAvatarPopup() {
  document.getElementById('avatarPopup').classList.remove('active');
}

function logout() {
  if (countdownInterval) clearInterval(countdownInterval);
  if (currentWithdrawalId) {
    database.ref('withdrawals/' + currentWithdrawalId).update({ status: 'cancelled' });
    currentWithdrawalId = null;
  }

  if (currentUser && !currentUser.isGuest) {
    auth.signOut();
  }

  currentUser = null;
  closeProfile();
  stopAutoRefresh();

  updateHeaderForUser();
  gameState.balance = 0;
  gameState.totalBets = 0;
  gameState.totalWins = 0;
  updateUI();

  showAuthButtons();
  openAuthModal('login');
  showPopup('Logged out', 'You have been logged out');
}

// ===== FIREBASE AUTH FUNCTIONS =====

function handleLoginSubmit(form) {
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const errorContainer = document.getElementById('loginErrors');

  errorContainer.classList.remove('active');
  errorContainer.innerHTML = '';

  if (!email || !password) {
    errorContainer.innerHTML = 'Please fill in all fields';
    errorContainer.classList.add('active');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Logging in...';
  submitBtn.disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      const userData = await getUserDataFromFirebase(user.uid);

      if (userData) {
        currentUser = {
          username: userData.username,
          avatar: userData.avatar || '👤',
          isGuest: false,
          id: user.uid,
          totalBets: userData.totalBets || 0,
          totalWins: userData.totalWins || 0,
          referredBy: userData.referredBy || null
        };

        gameState.balance = userData.coins || 1000;
        gameState.totalBets = userData.totalBets || 0;
        gameState.totalWins = userData.totalWins || 0;

        updateHeaderForUser();
        updateUI();
        hideAuthButtons();
        closeAuth();
        startAutoRefresh();
        loadNotifications();
        listenForWithdrawalStatus();
        loadSupportTickets();
        loadReferralData();
        loadWithdrawalAccounts();
        showPopup('Welcome back!', `Logged in as ${currentUser.username}`);
      }
    })
    .catch((error) => {
      let errorMessage = 'Email or password is incorrect';
      if (error.code === 'auth/user-not-found') errorMessage = 'No account found';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts';

      errorContainer.innerHTML = errorMessage;
      errorContainer.classList.add('active');
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
}

function handleRegisterSubmit(form) {
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const confirmPassword = form.confirmPassword.value.trim();
  const referralCode = form.referralCode?.value.trim() || '';
  const errorContainer = document.getElementById('registerErrors');

  errorContainer.classList.remove('active');
  errorContainer.innerHTML = '';

  if (!username || !email || !password || !confirmPassword) {
    errorContainer.innerHTML = 'Please fill all fields';
    errorContainer.classList.add('active');
    return;
  }

  if (password !== confirmPassword) {
    errorContainer.innerHTML = 'Passwords do not match';
    errorContainer.classList.add('active');
    return;
  }

  if (password.length < 6) {
    errorContainer.innerHTML = 'Password must be 6+ characters';
    errorContainer.classList.add('active');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Creating account...';
  submitBtn.disabled = true;

  auth.createUserWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      
      let referredBy = null;
      if (referralCode) {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val();
        
        for (const [id, userData] of Object.entries(users)) {
          if (userData.referralCode === referralCode && id !== user.uid) {
            referredBy = id;
            break;
          }
        }
      }

      const userData = {
        username: username,
        avatar: '👤',
        email: email,
        coins: 1000,
        totalBets: 0,
        totalWins: 0,
        createdAt: new Date().toISOString(),
        referredBy: referredBy,
        referralCode: null,
        referralCount: 0,
        referralEarnings: 0,
        activeReferrals: 0
      };

      await saveUserDataToFirebase(user.uid, userData);
      await createReferralCode(user.uid, username);
      
      if (referredBy) {
        await applyReferral(referralCode, user.uid);
      }

      currentUser = {
        username: username,
        avatar: '👤',
        isGuest: false,
        id: user.uid,
        totalBets: 0,
        totalWins: 0,
        referredBy: referredBy
      };

      gameState.balance = 1000;

      updateHeaderForUser();
      updateUI();
      hideAuthButtons();
      closeAuth();
      startAutoRefresh();
      loadNotifications();
      listenForWithdrawalStatus();
      loadSupportTickets();
      loadReferralData();
      showPopup('Welcome!', `Account created, ${username}`);
    })
    .catch((error) => {
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Email already exists';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email';
      else if (error.code === 'auth/weak-password') errorMessage = 'Password too weak';

      errorContainer.innerHTML = errorMessage;
      errorContainer.classList.add('active');
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
}

// ===== POPUP FUNCTIONS =====

let popupTimeout;

function showPopup(title, text) {
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupMessage').textContent = text;
  document.getElementById('successPopup').classList.add('active');

  clearTimeout(popupTimeout);
  popupTimeout = setTimeout(closePopup, 3000);
}

function closePopup() {
  document.getElementById('successPopup').classList.remove('active');
}

function openVIPPopup() {
  document.getElementById('vipPopup').classList.add('active');
  if (audio) audio.playClick();
}

function closeVIPPopup() {
  document.getElementById('vipPopup').classList.remove('active');
  if (audio) audio.playClick();
}

function unlockVIP() {
  if (gameState.balance < 100000) {
    showPopup('Insufficient Balance', 'Need ₨100,000');
    return;
  }

  gameState.balance -= 100000;
  updateUI();

  if (currentUser && !currentUser.isGuest) {
    updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
  }

  closeVIPPopup();
  showPopup('VIP Unlocked!', 'Welcome to VIP');
  if (audio) audio.playWin();
}

// ===== OFFERS SECTION FUNCTIONS =====

function openOffers() {
  document.getElementById('offersSection').classList.add('active');
  if (audio) audio.playClick();
}

function closeOffers() {
  document.getElementById('offersSection').classList.remove('active');
  if (audio) audio.playClick();
}

function openMissions() {
  MissionSystem.renderMissions();
  document.getElementById('missionsSection').classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
}

function closeMissions() {
  document.getElementById('missionsSection').classList.remove('active');
  openOffers();
}

function claimMissionReward(missionId) {
  let result;

  switch(missionId) {
    case 'login':
      result = MissionSystem.claimLoginReward();
      break;
    case 'firstDeposit':
      result = MissionSystem.claimFirstDepositReward();
      break;
    case 'sevenDay':
      result = MissionSystem.claimSevenDayReward();
      break;
    case 'gamesPlayed':
      result = MissionSystem.claimGamesPlayedReward();
      break;
    case 'bigWin':
      result = MissionSystem.claimBigWinReward();
      break;
    default:
      result = { success: false, message: 'Unknown mission' };
  }

  if (result.success) {
    gameState.balance += result.reward;
    if (currentUser && !currentUser.isGuest) {
      currentUser.balance = gameState.balance;
      updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
    }
    updateUI();
    showPopup('Reward Claimed!', `You received ${result.reward} coins!`);
    if (audio) audio.playWin();
    MissionSystem.renderMissions();
  } else {
    showPopup('Cannot Claim', result.message);
  }
}

function openEvents() {
  document.getElementById('eventsSection').classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
}

function closeEvents() {
  document.getElementById('eventsSection').classList.remove('active');
  openOffers();
}

function openSupport() {
  document.getElementById('supportSection').classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
}

function closeSupport() {
  document.getElementById('supportSection').classList.remove('active');
  openOffers();
}

function openSupportBot() {
  window.open('https://bots.easy-peasy.ai/bot/74d4a40f-b3ee-4e22-9ae0-bbb8f2b9fdd5', '_blank');
  if (audio) audio.playClick();
}

// ===== SHOP FUNCTIONS =====

const shopItems = [
  { amount: 10, coins: 100, icon: '💰' },
  { amount: 25, coins: 275, icon: '💰' },
  { amount: 50, coins: 600, icon: '💰' },
  { amount: 100, coins: 1300, icon: '💰' },
  { amount: 250, coins: 3500, icon: '💰' },
  { amount: 500, coins: 7500, icon: '💰' },
];

function renderShopGrid() {
  const shopGrid = document.getElementById('shopGrid');
  const isGuest = currentUser && currentUser.isGuest;

  shopGrid.innerHTML = shopItems.map(item => `
    <div class="shop-card ${isGuest ? 'guest-disabled' : ''}" onclick="${isGuest ? '' : `purchaseCoins(${item.coins}, ${item.amount})`}">
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-amount">₨${item.amount}</div>
      <div class="shop-coins">${formatNumber(item.coins)} Coins</div>
      <button class="shop-btn" ${isGuest ? 'disabled' : ''}>${isGuest ? 'Login to Buy' : 'BUY'}</button>
    </div>
  `).join('');

  const paymentGrid = document.getElementById('paymentMethodsGrid');
  if (paymentGrid) {
    paymentGrid.innerHTML = `
      <div class="payment-card" onclick="selectPaymentMethod('JazzCash')">
        <div class="payment-icon">📱</div>
        <div class="payment-name">JazzCash</div>
        <div class="payment-desc">Instant top-up via JazzCash</div>
      </div>
      <div class="payment-card" onclick="selectPaymentMethod('Easypaisa')">
        <div class="payment-icon">💳</div>
        <div class="payment-name">Easypaisa</div>
        <div class="payment-desc">Quick deposit with Easypaisa</div>
      </div>
      <div class="payment-card" onclick="selectPaymentMethod('Bank Transfer')">
        <div class="payment-icon">🏦</div>
        <div class="payment-name">Bank Transfer</div>
        <div class="payment-desc">Direct bank transfer</div>
      </div>
    `;
  }
}

function openShop() {
  renderShopGrid();
  document.getElementById('shopSection').classList.add('active');
  if (audio) audio.playClick();
}

function closeShop() {
  document.getElementById('shopSection').classList.remove('active');
  if (audio) audio.playClick();
}

function selectPaymentMethod(method) {
  if (currentUser && currentUser.isGuest) {
    showPopup('Guest Mode', 'Login to purchase');
    return;
  }
  showPopup('Payment Method', `You selected ${method}`);
}

function purchaseCoins(coins, amount) {
  if (currentUser && currentUser.isGuest) {
    showPopup('Guest Mode', 'Login to purchase');
    return;
  }

  gameState.balance += coins;
  updateUI();

  if (currentUser && !currentUser.isGuest) {
    updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
    savePurchaseToHistory(amount, coins);
  }

  closeShop();
  showPopup('Purchase Successful!', `+${formatNumber(coins)} coins`);
  if (audio) audio.playClick();
}

function openWithdraw() {
  if (currentUser && currentUser.isGuest) {
    showPopup('Guest Mode', 'Login to withdraw');
    return;
  }

  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  document.getElementById('withdrawBalance').textContent = formatNumber(gameState.balance);
  document.getElementById('withdrawPopup').classList.add('active');
  updateWithdrawPopup();
  if (audio) audio.playClick();
}

// ===== REFERRAL SECTION FUNCTIONS =====

function openReferral() {
  document.getElementById('referralSection').classList.add('active');
  loadReferralData();
  if (audio) audio.playClick();
}

function closeReferral() {
  document.getElementById('referralSection').classList.remove('active');
}

// ===== LEADERBOARD FUNCTIONS =====

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
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
    return `
      <div class="leaderboard-item">
        <div class="rank-number ${rankClass}">${c.rank}</div>
        <div class="leader-avatar">${c.avatar}</div>
        <div class="leader-info">
          <div class="leader-name">${c.name}</div>
          <div class="leader-win">${formatNumber(c.win)} won</div>
        </div>
      </div>
    `;
  }).join('');
}

let leaderboardInterval;

function startLeaderboardRotation() {
  renderLeaderboard();
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  leaderboardInterval = setInterval(renderLeaderboard, 5000);
}

// ===== GAME FUNCTIONS =====

function enterGame() {
  const loader = document.getElementById('gameEntryLoader');
  const gameView = document.getElementById('gameView');

  loader.classList.add('active');
  if (audio) audio.playClick();

  setTimeout(() => {
    loader.classList.remove('active');
    gameView.classList.add('active');
    isInGame = true;

    document.getElementById('betPanel').style.display = 'block';
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('messageText').textContent = currentUser ? 'Select bet' : 'Login to play';
  }, 3000);
}

function exitGame() {
  document.getElementById('gameView').classList.remove('active');
  isInGame = false;
  if (audio) audio.playClick();
}

function setActiveNav(element) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');
}

function initApp() {
  createParticles();
  startLeaderboardRotation();
  MissionSystem.checkLoginStreak();
}

// ===== GAME CONFIG =====

const CONFIG = {
  PAIRS_COUNT: 11,
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

const elements = {
  balanceDisplay: document.getElementById('balanceDisplay'),
  lobbyBalance: document.getElementById('lobbyBalance'),
  currentWin: document.getElementById('currentWin'),
  multiplier: document.getElementById('multiplier'),
  pairsDisplay: document.getElementById('pairsDisplay'),
  betOptions: document.querySelectorAll('.bet-option'),
  customBet: document.getElementById('customBet'),
  customBetBtn: document.getElementById('customBetBtn'),
  startBtn: document.getElementById('startBtn'),
  cashoutBtn: document.getElementById('cashoutBtn'),
  continueBtn: document.getElementById('continueBtn'),
  messageText: document.getElementById('messageText'),
  progressSection: document.getElementById('progressSection'),
  pairsMatched: document.getElementById('pairsMatched'),
  progressFill: document.getElementById('progressFill'),
  multiplierDisplay: document.getElementById('multiplierDisplay'),
  cardGrid: document.getElementById('cardGrid'),
  winOverlay: document.getElementById('winOverlay'),
  winAmountDisplay: document.getElementById('winAmountDisplay'),
  winMultiplierDisplay: document.getElementById('winMultiplierDisplay'),
  playAgainWin: document.getElementById('playAgainWin'),
  loseOverlay: document.getElementById('loseOverlay'),
  loseSubtext: document.getElementById('loseSubtext'),
  playAgainLose: document.getElementById('playAgainLose')
};

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateMultiplierDisplay() {
  if (!elements.multiplierDisplay) return;
  elements.multiplierDisplay.innerHTML = CONFIG.MULTIPLIERS.map((m, i) =>
    `<span class="multiplier-item">${i + 1}:${m}x</span>`
  ).join('');
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

  const backHTML = `
    <div class="card-face card-back">
      <div class="card-back-pattern"></div>
      <div class="card-back-corner tl"></div>
      <div class="card-back-corner tr"></div>
      <div class="card-back-corner bl"></div>
      <div class="card-back-corner br"></div>
      <span class="card-back-logo">RM</span>
    </div>
  `;

  let frontHTML = '';

  if (card.isBomb) {
    frontHTML = `
      <div class="card-face card-front bomb">
        <div class="bomb-content">
          <span class="bomb-icon">💣</span>
          <span class="bomb-text">BOOM!</span>
        </div>
      </div>
    `;
  } else if (card.isGolden) {
    frontHTML = `
      <div class="card-face card-front golden">
        <div class="golden-content">
          <span class="golden-icon">👑</span>
          <span class="golden-text">20X WIN!</span>
        </div>
      </div>
    `;
  } else {
    frontHTML = `
      <div class="card-face card-front ${card.suit.color}">
        <div class="card-corner card-corner-tl">
          <span class="card-rank">${card.value}</span>
          <span class="card-suit-small">${card.suit.symbol}</span>
        </div>
        <span class="card-center">${card.suit.symbol}</span>
        <div class="card-corner card-corner-br">
          <span class="card-rank">${card.value}</span>
          <span class="card-suit-small">${card.suit.symbol}</span>
        </div>
      </div>
    `;
  }

  cardEl.innerHTML = backHTML + frontHTML;
  cardEl.addEventListener('click', () => handleCardClick(cardEl));
  return cardEl;
}

function renderCards() {
  if (!elements.cardGrid) return;
  elements.cardGrid.innerHTML = '';
  gameState.cards.forEach((card, i) => elements.cardGrid.appendChild(createCardElement(card, i)));
}

async function animateShuffle() {
  const cards = elements.cardGrid.querySelectorAll('.card');
  for (let round = 0; round < 5; round++) {
    elements.cardGrid.classList.add('shuffling');
    if (audio) audio.playShuffle();
    await new Promise(r => setTimeout(r, 120));
    cards.forEach(c => c.style.order = Math.floor(Math.random() * cards.length));
  }
  elements.cardGrid.classList.remove('shuffling');
  cards.forEach((c, i) => c.style.order = i);
}

function selectBet(amount) {
  if (gameState.isPlaying) return;
  if (amount < CONFIG.MIN_BET || amount > CONFIG.MAX_BET) {
    elements.messageText.textContent = `Bet ${CONFIG.MIN_BET}-${CONFIG.MAX_BET}`;
    return;
  }
  if (amount > gameState.balance) {
    elements.messageText.textContent = 'Insufficient balance';
    return;
  }
  gameState.currentBet = amount;
  if (audio) audio.playClick();
  document.querySelectorAll('.bet-option').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.bet) === amount);
  });
  elements.messageText.textContent = `Bet: ${amount}`;
}

async function startGame() {
  if (!currentUser) {
    elements.messageText.textContent = 'Login first';
    openAuthModal('login');
    return;
  }

  if (gameState.currentBet <= 0) {
    elements.messageText.textContent = 'Select bet';
    return;
  }

  if (gameState.balance < gameState.currentBet) {
    elements.messageText.textContent = 'Insufficient balance';
    return;
  }

  // ===== CRITICAL FIX: DEDUCT BET FROM BALANCE =====
  gameState.balance -= gameState.currentBet;
  
  // Update Firebase immediately after deduction
  if (currentUser && !currentUser.isGuest) {
    await updateUserDataInFirebase(currentUser.id, { 
      coins: gameState.balance 
    });
  }
  
  updateUI();
  elements.messageText.textContent = `Bet placed! -${gameState.currentBet} coins`;

  gameState.lastGameResult = null;
  gameState.lastGameTimestamp = Date.now();
  
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.isPlaying = true;
  gameState.canFlip = false;
  gameState.firstCard = gameState.secondCard = null;
  gameState.matchedCards.clear();

  gameState.cards = generateCards();
  renderCards();

  document.getElementById('betPanel').style.display = 'none';
  elements.startBtn.classList.add('hidden');
  elements.progressSection.classList.remove('hidden');
  generateMultiplierDisplay();
  updateProgress();

  elements.messageText.textContent = 'Shuffling...';
  await animateShuffle();

  gameState.canFlip = true;
  elements.messageText.textContent = 'Find pairs!';
  if (audio) audio.playClick();
}

function handleCardClick(el) {
  if (!gameState.canFlip || el.classList.contains('flipped')) return;

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
  const f = gameState.firstCard.dataset.isGolden === 'true';
  const s = gameState.secondCard.dataset.isGolden === 'true';

  if (f && s) {
    gameState.firstCard.classList.add('matched');
    gameState.secondCard.classList.add('matched');
    gameState.currentWin = gameState.currentBet * CONFIG.GOLDEN_MULTIPLIER;
    gameState.multiplier = CONFIG.GOLDEN_MULTIPLIER;
    gameState.lastGameResult = 'win';
    if (audio) audio.playWin();
    updateUI();
    gameState.firstCard = gameState.secondCard = null;
    gameState.canFlip = true;
    elements.messageText.textContent = `Golden! +${gameState.currentWin}`;
    showCashoutOption();
  } else {
    gameState.firstCard.classList.remove('flipped');
    gameState.secondCard.classList.remove('flipped');
    gameState.firstCard = gameState.secondCard = null;
    gameState.canFlip = true;
    elements.messageText.textContent = 'No match';
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

    if (audio) audio.playMatch();
    updateUI();
    updateProgress();

    if (gameState.pairsMatched >= CONFIG.PAIRS_COUNT) {
      gameState.currentWin = gameState.currentBet * CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1];
      gameState.lastGameResult = 'win';
      setTimeout(handleMaxWin, 400);
    } else {
      gameState.lastGameResult = 'win';
      elements.messageText.textContent = `Match! +${gameState.currentWin}`;
      showCashoutOption();
    }

    gameState.firstCard = gameState.secondCard = null;
    gameState.canFlip = true;
  } else {
    setTimeout(() => {
      gameState.firstCard.classList.remove('flipped');
      gameState.secondCard.classList.remove('flipped');
      gameState.firstCard = gameState.secondCard = null;
      gameState.canFlip = true;
      elements.messageText.textContent = 'Try again';
    }, 400);
  }
}

function showCashoutOption() {
  elements.cashoutBtn.classList.remove('hidden');
  elements.continueBtn.classList.remove('hidden');
  gameState.canFlip = false;
}

function cashout() {
  if (gameState.currentWin <= 0) return;
  
  // ===== CRITICAL FIX: ADD WINNINGS TO BALANCE =====
  gameState.balance += gameState.currentWin;

  MissionSystem.recordGamePlayed(true, gameState.currentBet);
  gameState.totalBets++;
  gameState.totalWins++;

  if (currentUser && !currentUser.isGuest) {
    updateUserDataInFirebase(currentUser.id, {
      coins: gameState.balance,
      totalBets: gameState.totalBets,
      totalWins: gameState.totalWins
    });
    saveGameToHistory(true, gameState.currentBet, gameState.currentWin, gameState.multiplier);
  }

  if (audio) audio.playCashout();
  elements.winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  elements.winMultiplierDisplay.textContent = `${gameState.multiplier}x`;
  elements.winOverlay.classList.add('active');
  endRound();
}

function continuePlaying() {
  elements.cashoutBtn.classList.add('hidden');
  elements.continueBtn.classList.add('hidden');
  gameState.canFlip = true;
  elements.messageText.textContent = 'Continue!';
  if (audio) audio.playClick();
}

function handleBomb() {
  // ===== CRITICAL FIX: NO ADDITION ON BOMB - BET ALREADY DEDUCTED =====
  // The bet was already deducted at game start, so no further deduction needed
  MissionSystem.recordGamePlayed(false, gameState.currentBet);
  gameState.totalBets++;
  gameState.lastGameResult = 'loss';

  if (currentUser && !currentUser.isGuest) {
    updateUserDataInFirebase(currentUser.id, {
      coins: gameState.balance,
      totalBets: gameState.totalBets
    });
    saveGameToHistory(false, gameState.currentBet, 0, 1);
  }

  if (audio) audio.playBomb();
  elements.loseSubtext.textContent = `Lost ${formatNumber(gameState.currentBet)}`;
  elements.loseOverlay.classList.add('active');
  endRound();
}

function handleMaxWin() {
  // ===== CRITICAL FIX: ADD MAX WIN TO BALANCE =====
  gameState.balance += gameState.currentWin;

  MissionSystem.recordGamePlayed(true, gameState.currentBet);
  gameState.totalBets++;
  gameState.totalWins++;

  if (currentUser && !currentUser.isGuest) {
    updateUserDataInFirebase(currentUser.id, {
      coins: gameState.balance,
      totalBets: gameState.totalBets,
      totalWins: gameState.totalWins
    });
    saveGameToHistory(true, gameState.currentBet, gameState.currentWin, CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]);
  }

  if (audio) audio.playWin();
  elements.winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  elements.winMultiplierDisplay.textContent = `${CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]}x MAX!`;
  elements.winOverlay.classList.add('active');
  endRound();
}

function endRound() {
  gameState.isPlaying = false;
  gameState.canFlip = false;
  elements.cashoutBtn.classList.add('hidden');
  elements.continueBtn.classList.add('hidden');
  updateUI();
}

function resetGame() {
  elements.winOverlay.classList.remove('active');
  elements.loseOverlay.classList.remove('active');
  document.getElementById('betPanel').style.display = 'block';
  elements.startBtn.classList.remove('hidden');
  elements.progressSection.classList.add('hidden');
  elements.cardGrid.innerHTML = '';

  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;

  updateUI();
  elements.messageText.textContent = 'Select bet';
  if (audio) audio.playClick();
}

function updateUI() {
  if (elements.balanceDisplay) elements.balanceDisplay.textContent = formatNumber(gameState.balance);
  if (elements.lobbyBalance) elements.lobbyBalance.textContent = formatNumber(gameState.balance);
  if (elements.currentWin) elements.currentWin.textContent = formatNumber(gameState.currentWin);
  if (elements.multiplier) elements.multiplier.textContent = gameState.multiplier.toFixed(2) + 'x';
  if (elements.pairsDisplay) elements.pairsDisplay.textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`;
}

function updateProgress() {
  if (elements.pairsMatched) elements.pairsMatched.textContent = `${gameState.pairsMatched}/12`;
  const percent = (gameState.pairsMatched / CONFIG.PAIRS_COUNT) * 100;
  if (elements.progressFill) elements.progressFill.style.width = percent + '%';
}

function setupEventListeners() {
  elements.betOptions.forEach(btn => {
    btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet)));
  });

  elements.customBetBtn.addEventListener('click', () => {
    const val = parseInt(elements.customBet.value);
    if (!isNaN(val)) selectBet(val);
  });

  elements.startBtn.addEventListener('click', startGame);
  elements.cashoutBtn.addEventListener('click', cashout);
  elements.continueBtn.addEventListener('click', continuePlaying);
  elements.playAgainWin.addEventListener('click', resetGame);
  elements.playAgainLose.addEventListener('click', resetGame);
}

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
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (this.muted || !this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
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
    document.getElementById('soundToggle').classList.toggle('active', !this.muted);
    return this.muted;
  }
}

const audio = new AudioSystem();

// ===== MODAL FUNCTIONS =====

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  if (audio) audio.playClick();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (audio) audio.playClick();
}

function toggleSound() {
  audio.toggle();
}

function toggleNotifications() {
  const toggle = document.getElementById('notificationToggle');
  if (toggle) toggle.classList.toggle('active');
  showPopup('Notifications', 'Notification settings saved');
}

function showThemeSelector() {
  document.getElementById('themeSelector').classList.toggle('active');
  if (audio) audio.playClick();
}

function changeTheme(themeName) {
  document.body.className = 'theme-' + themeName;
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.theme-btn').classList.add('active');
  if (audio) audio.playClick();
}

// ===== AUTH STATE =====

auth.onAuthStateChanged(async (user) => {
  if (user) {
    const userData = await getUserDataFromFirebase(user.uid);
    if (userData) {
      currentUser = {
        username: userData.username,
        avatar: userData.avatar || '👤',
        isGuest: false,
        id: user.uid,
        totalBets: userData.totalBets || 0,
        totalWins: userData.totalWins || 0,
        referredBy: userData.referredBy || null
      };
      gameState.balance = userData.coins || 1000;
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;

      updateHeaderForUser();
      updateUI();
      hideAuthButtons();
      startAutoRefresh();
      loadNotifications();
      listenForWithdrawalStatus();
      loadSupportTickets();
      loadReferralData();
      loadWithdrawalAccounts();
    }
  }
});

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  gameState.balance = 0;

  setupEventListeners();
  updateUI();
  generateMultiplierDisplay();
  initApp();

  const withdrawMethod = document.getElementById('withdrawMethod');
  if (withdrawMethod) {
    withdrawMethod.addEventListener('change', updateWithdrawPopup);
  }

  // Make functions globally available
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
  window.openShop = openShop;
  window.closeShop = closeShop;
  window.openWithdraw = openWithdraw;
  window.selectPaymentMethod = selectPaymentMethod;
  window.purchaseCoins = purchaseCoins;
  window.enterGame = enterGame;
  window.exitGame = exitGame;
  window.handleLoginSubmit = handleLoginSubmit;
  window.handleRegisterSubmit = handleRegisterSubmit;
  window.closePopup = closePopup;
  window.openNotificationPanel = openNotificationPanel;
  window.closeNotificationPanel = closeNotificationPanel;
  window.deleteNotification = deleteNotification;
  window.deleteAllNotifications = deleteAllNotifications;
  window.cancelWithdrawal = cancelWithdrawal;
  window.closeWithdrawPopup = closeWithdrawPopup;
  window.processWithdraw = processWithdraw;
  window.openAdditionalSupport = openAdditionalSupport;
  window.closeAdditionalSupport = closeAdditionalSupport;
  window.sendSupportMessage = sendSupportMessage;
  window.copyReferralCode = copyReferralCode;
  window.copyReferralLink = copyReferralLink;
  window.filterReferrals = filterReferrals;
  window.claimMilestone = claimMilestone;
  window.openOffers = openOffers;
  window.closeOffers = closeOffers;
  window.openMissions = openMissions;
  window.closeMissions = closeMissions;
  window.claimMissionReward = claimMissionReward;
  window.openEvents = openEvents;
  window.closeEvents = closeEvents;
  window.openSupport = openSupport;
  window.closeSupport = closeSupport;
  window.openSupportBot = openSupportBot;

  console.log("✅ Royal Match ready!");
});