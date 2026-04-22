// ===== ROYAL MATCH 1 - COMPLETE WORKING VERSION =====
console.log("🎮 Casino shuffle 786- Loading...");

// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
  apiKey: "AIzaSyDgxEgtvrugTxXL5l10hvzQBILmqUzWBLA",
  authDomain: "nj777-2756c.firebaseapp.com",
  databaseURL: "https://nj777-2756c-default-rtdb.firebaseio.com",
  projectId: "nj777-2756c",
  storageBucket: "nj777-2756c.firebasestorage.app",
  messagingSenderId: "388549837175",
  appId: "1:388549837175:web:6c831e431443d8227c2172",
  measurementId: "G-901N0SPK1T"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isInGame = false;
let autoRefreshInterval = null;
let notifications = [];
let currentPurchaseAmount = 0;
let currentPurchaseCoins = 0;
let pendingReferralCode = null;
let rewardCountdownInterval = null;

// APK Download Link
const APK_DOWNLOAD_LINK = 'https://www.mediafire.com/file/cop5u59io09ekkl/Casino+shuffle+786.apk/file';

// ===== VIP SYSTEM CONFIGURATION =====
const VIP_CONFIG = {
  levels: [
    { level: 0, requiredSpend: 0, dailyReward: 5, weeklyReward: 35, monthlyReward: 60 },
    { level: 1, requiredSpend: 40000, dailyReward: 10, weeklyReward: 70, monthlyReward: 120 },
    { level: 2, requiredSpend: 80000, dailyReward: 20, weeklyReward: 140, monthlyReward: 240 },
    { level: 3, requiredSpend: 160000, dailyReward: 40, weeklyReward: 280, monthlyReward: 480 },
    { level: 4, requiredSpend: 320000, dailyReward: 80, weeklyReward: 560, monthlyReward: 960 },
    { level: 5, requiredSpend: 640000, dailyReward: 160, weeklyReward: 1120, monthlyReward: 1920 }
  ]
};

// ===== GAME STATE =====
let gameState = {
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
  matchedPairs: 0,
  goldenCardsFound: [],
  totalBets: 0,
  totalWins: 0,
  totalSpent: 0,
  vipLevel: 0,
  firstWagerProgress: 0,
  hasCompletedFirstWager: false,
  pendingWagerAmount: 0,
  totalWagered: 0
};

// ===== REWARD STATE (TRACKED IN FIREBASE) =====
let rewardState = {
  lastDailyClaim: null,
  lastWeeklyClaim: null,
  lastMonthlyClaim: null,
  dailyStreak: 0,
  weeklyStreak: 0,
  lastDailyClaimDate: null,
  lastWeeklyClaimDate: null,
  lastMonthlyClaimDate: null
};

// ===== MISSIONS STATE =====
let missionsState = {
  dailyLogin: { completed: false, claimed: false, progress: 0, target: 1 },
  firstDeposit: { completed: false, claimed: false, progress: 0, target: 1 },
  gamesPlayed: { completed: false, claimed: false, progress: 0, target: 10 },
  bigWin: { completed: false, claimed: false, progress: 0, target: 5 }
};

// ===== REFERRAL DATA =====
let referralData = {
  code: null,
  link: null,
  totalReferrals: 0,
  activeReferrals: 0,
  totalEarnings: 0,
  referrals: []
};

// ===== WITHDRAWAL ACCOUNTS =====
let savedAccounts = {
  jazzcash: "",
  easypaisa: ""
};

// ===== GAME CONFIG =====
const CONFIG = {
  PAIRS_COUNT: 10,
  BOMB_COUNT: 6,
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
  'Faisal Khan', 'Karim Abdul', 'Malik Saeed', 'Nasir Ahmed', 'Omar Khan',
  'Usman Malik', 'Shahid Afridi', 'Babar Azam', 'Shaheen Shah', 'Imad Wasim'
];

// ===== HELPER FUNCTIONS =====
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function showPopup(title, text) {
  var popupTitle = document.getElementById('popupTitle');
  var popupMessage = document.getElementById('popupMessage');
  var successPopup = document.getElementById('successPopup');
  
  if (popupTitle) popupTitle.textContent = title;
  if (popupMessage) popupMessage.textContent = text;
  if (successPopup) successPopup.classList.add('active');
  setTimeout(function() {
    if (successPopup) successPopup.classList.remove('active');
  }, 3000);
}

function closePopup() {
  var successPopup = document.getElementById('successPopup');
  if (successPopup) successPopup.classList.remove('active');
}

// ===== REFERRAL CODE FROM URL =====
function getReferralCodeFromURL() {
  var urlParams = new URLSearchParams(window.location.search);
  var refCode = urlParams.get('ref');
  console.log("Referral code from URL:", refCode);
  return refCode;
}

// ===== DOWNLOAD APK FUNCTIONS =====
function showDownloadPopup() {
  var downloadPopup = document.getElementById('downloadPopup');
  if (downloadPopup) {
    downloadPopup.classList.add('active');
  }
  var linkInput = document.getElementById('downloadLinkInput');
  if (linkInput) {
    linkInput.value = APK_DOWNLOAD_LINK;
  }
}

function closeDownloadPopup() {
  var downloadPopup = document.getElementById('downloadPopup');
  if (downloadPopup) {
    downloadPopup.classList.remove('active');
  }
}

function copyDownloadLink() {
  var linkInput = document.getElementById('downloadLinkInput');
  if (linkInput) {
    linkInput.select();
    document.execCommand('copy');
    showPopup('Copied!', 'Download link copied to clipboard!');
  }
}

// ===== FIREBASE AUTH FUNCTIONS =====
async function handleLoginSubmit(form) {
  var email = form.email.value.trim();
  var password = form.password.value.trim();
  var errorContainer = document.getElementById('loginErrors');
  
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
  
  var submitBtn = form.querySelector('button[type="submit"]');
  var originalText = submitBtn.textContent;
  submitBtn.textContent = 'Logging in...';
  submitBtn.disabled = true;
  
  try {
    var userCred = await auth.signInWithEmailAndPassword(email, password);
    var userData = await getUserDataFromFirebase(userCred.user.uid);
    
    if (userData) {
      currentUser = {
        username: userData.username,
        avatar: userData.avatar || '👤',
        isGuest: false,
        id: userCred.user.uid,
        email: email
      };
      
      gameState.balance = userData.coins || 0;
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;
      gameState.totalSpent = userData.totalSpent || 0;
      gameState.vipLevel = userData.vipLevel || 0;
      gameState.firstWagerProgress = userData.firstWagerProgress || 0;
      gameState.hasCompletedFirstWager = userData.hasCompletedFirstWager || false;
      
      if (userData.rewards) {
        rewardState = { ...rewardState, ...userData.rewards };
      }
      
      if (userData.missions) {
        missionsState = { ...missionsState, ...userData.missions };
      }
      
      // Check daily login mission
      if (!missionsState.dailyLogin.completed) {
        missionsState.dailyLogin.completed = true;
        missionsState.dailyLogin.progress = 1;
        updateMissionsUI();
        saveUserDataToFirebase();
        showPopup('Mission Update!', 'Daily Login mission completed! Check Missions tab to claim reward!');
      }
      
      updateHeaderForUser();
      updateUI();
      updateRewardUI();
      updateMissionsUI();
      hideAuthButtons();
      closeAuth();
      startAutoRefresh();
      loadReferralData();
      loadWithdrawalAccounts();
      startRewardCountdown();
      showPopup('Welcome back!', 'Logged in as ' + currentUser.username);
    }
  } catch (error) {
    if (errorContainer) {
      if (error.code === 'auth/user-not-found') {
        errorContainer.innerHTML = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorContainer.innerHTML = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorContainer.innerHTML = 'Invalid email format';
      } else {
        errorContainer.innerHTML = 'Login failed: ' + error.message;
      }
      errorContainer.classList.add('active');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

async function handleRegisterSubmit(form) {
  var username = form.username.value.trim();
  var email = form.email.value.trim();
  var password = form.password.value.trim();
  var confirmPassword = form.confirmPassword.value.trim();
  var manualCode = form.referralCode ? form.referralCode.value.trim() : '';
  var urlCode = getReferralCodeFromURL();
  var referralCode = urlCode || manualCode;
  var errorContainer = document.getElementById('registerErrors');
  
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
      errorContainer.innerHTML = 'Password must be at least 6 characters';
      errorContainer.classList.add('active');
    }
    return;
  }
  
  var submitBtn = form.querySelector('button[type="submit"]');
  var originalText = submitBtn.textContent;
  submitBtn.textContent = 'Creating account...';
  submitBtn.disabled = true;
  
  try {
    var userCred = await auth.createUserWithEmailAndPassword(email, password);
    
    var userData = {
      username: username,
      avatar: '👤',
      email: email,
      coins: 0,
      totalBets: 0,
      totalWins: 0,
      totalSpent: 0,
      vipLevel: 0,
      firstWagerProgress: 0,
      hasCompletedFirstWager: false,
      pendingWagerAmount: 0,
      totalWagered: 0,
      referralCode: null,
      referralCount: 0,
      referralEarnings: 0,
      activeReferrals: 0,
      createdAt: new Date().toISOString(),
      rewards: {
        lastDailyClaim: null,
        lastWeeklyClaim: null,
        lastMonthlyClaim: null,
        dailyStreak: 0,
        weeklyStreak: 0,
        lastDailyClaimDate: null,
        lastWeeklyClaimDate: null,
        lastMonthlyClaimDate: null
      },
      missions: {
        dailyLogin: { completed: false, claimed: false, progress: 0, target: 1 },
        firstDeposit: { completed: false, claimed: false, progress: 0, target: 1 },
        gamesPlayed: { completed: false, claimed: false, progress: 0, target: 10 },
        bigWin: { completed: false, claimed: false, progress: 0, target: 5 }
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
      email: email
    };
    
    gameState.balance = 0;
    gameState.totalBets = 0;
    gameState.totalWins = 0;
    gameState.totalSpent = 0;
    gameState.vipLevel = 0;
    gameState.firstWagerProgress = 0;
    gameState.hasCompletedFirstWager = false;
    
    updateHeaderForUser();
    updateUI();
    hideAuthButtons();
    closeAuth();
    startAutoRefresh();
    loadReferralData();
    loadWithdrawalAccounts();
    startRewardCountdown();
    
    if (referralCode) {
      showPopup('Welcome!', 'Account created with referral code ' + referralCode + '! You start with 0 coins. Purchase coins to start playing!');
    } else {
      showPopup('Welcome!', 'Account created successfully! You start with 0 coins. Purchase coins to start playing!');
    }
  } catch (error) {
    if (errorContainer) {
      if (error.code === 'auth/email-already-in-use') {
        errorContainer.innerHTML = 'Email already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorContainer.innerHTML = 'Invalid email format';
      } else if (error.code === 'auth/weak-password') {
        errorContainer.innerHTML = 'Password is too weak';
      } else {
        errorContainer.innerHTML = 'Registration failed: ' + error.message;
      }
      errorContainer.classList.add('active');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function guestLogin() {
  currentUser = {
    username: 'Guest_' + Math.floor(Math.random() * 9999),
    avatar: '👤',
    isGuest: true,
    id: 'GUEST_' + Date.now()
  };
  gameState.balance = 0;
  gameState.totalBets = 0;
  gameState.totalWins = 0;
  gameState.totalSpent = 0;
  gameState.vipLevel = 0;
  gameState.firstWagerProgress = 0;
  gameState.hasCompletedFirstWager = false;
  
  closeAuth();
  updateHeaderForUser();
  updateUI();
  hideAuthButtons();
  showPopup('Guest Mode', 'You are playing as guest with 0 coins. Register to save your progress!');
}

async function logout() {
  if (currentUser && !currentUser.isGuest) {
    await saveUserDataToFirebase();
    await auth.signOut();
  }
  stopAutoRefresh();
  if (rewardCountdownInterval) clearInterval(rewardCountdownInterval);
  currentUser = null;
  gameState.balance = 0;
  gameState.totalBets = 0;
  gameState.totalWins = 0;
  gameState.totalSpent = 0;
  gameState.vipLevel = 0;
  gameState.firstWagerProgress = 0;
  gameState.hasCompletedFirstWager = false;
  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.isPlaying = false;
  
  updateHeaderForUser();
  updateUI();
  showAuthButtons();
  resetGame();
  showPopup('Logged out', 'You have been logged out');
  openAuthModal();
}

// ===== FIREBASE DATABASE FUNCTIONS =====
async function getUserDataFromFirebase(userId) {
  try {
    var snapshot = await database.ref('users/' + userId).once('value');
    return snapshot.val();
  } catch (error) {
    console.error("Error loading user data:", error);
    return null;
  }
}

async function saveUserDataToFirebase() {
  if (!currentUser || currentUser.isGuest) return;
  
  var updates = {
    coins: gameState.balance,
    totalBets: gameState.totalBets,
    totalWins: gameState.totalWins,
    totalSpent: gameState.totalSpent,
    vipLevel: gameState.vipLevel,
    firstWagerProgress: gameState.firstWagerProgress,
    hasCompletedFirstWager: gameState.hasCompletedFirstWager,
    rewards: rewardState,
    missions: missionsState
  };
  
  try {
    await database.ref('users/' + currentUser.id).update(updates);
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

async function updateUserDataInFirebase(userId, updates) {
  try {
    await database.ref('users/' + userId).update(updates);
    return true;
  } catch (error) {
    console.error("Error updating user data:", error);
    return false;
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(refreshUserData, 5000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

async function refreshUserData() {
  if (!currentUser || currentUser.isGuest) return;
  try {
    var userData = await getUserDataFromFirebase(currentUser.id);
    if (userData && !gameState.isPlaying) {
      gameState.balance = userData.coins || 0;
      gameState.totalBets = userData.totalBets || 0;
      gameState.totalWins = userData.totalWins || 0;
      gameState.totalSpent = userData.totalSpent || 0;
      gameState.vipLevel = userData.vipLevel || 0;
      gameState.firstWagerProgress = userData.firstWagerProgress || 0;
      gameState.hasCompletedFirstWager = userData.hasCompletedFirstWager || false;
      if (userData.rewards) {
        rewardState = { ...rewardState, ...userData.rewards };
      }
      if (userData.missions) {
        missionsState = { ...missionsState, ...userData.missions };
      }
      updateUI();
      updateRewardUI();
      updateMissionsUI();
    }
  } catch (error) {
    console.error("Refresh error:", error);
  }
}

// ===== REFERRAL FUNCTIONS =====
async function createReferralCode(userId, username) {
  var prefix = username.substring(0, 3).toUpperCase();
  var randomNum = Math.floor(Math.random() * 9000 + 1000);
  var referralCode = prefix + randomNum;
  await updateUserDataInFirebase(userId, { referralCode: referralCode });
  return referralCode;
}

async function applyReferral(referralCode, newUserId, newUsername) {
  if (!referralCode) return;
  console.log("Applying referral code:", referralCode);
  try {
    var usersSnap = await database.ref('users').once('value');
    var users = usersSnap.val();
    var referrerId = null;
    var referrerData = null;
    
    for (var id in users) {
      if (users[id].referralCode === referralCode && id !== newUserId) {
        referrerId = id;
        referrerData = users[id];
        break;
      }
    }
    
    if (referrerId && referrerData) {
      await updateUserDataInFirebase(newUserId, { referredBy: referrerId, referredAt: new Date().toISOString() });
      await updateUserDataInFirebase(referrerId, {
        referralCount: (referrerData.referralCount || 0) + 1,
        referralEarnings: (referrerData.referralEarnings || 0) + 50,
        coins: (referrerData.coins || 0) + 50
      });
      
      await database.ref('referrals').push({
        referrerId: referrerId,
        referrerUsername: referrerData.username,
        referredUserId: newUserId,
        referredUsername: newUsername,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
      showPopup('Referral Applied!', 'You were referred by ' + referrerData.username + '! They earned 50 coins!');
      console.log("Referral applied successfully from:", referrerData.username);
    } else {
      console.log("No referrer found for code:", referralCode);
    }
  } catch (error) {
    console.error("Error applying referral:", error);
  }
}

async function loadReferralData() {
  if (!currentUser || currentUser.isGuest) return;
  try {
    var userData = await getUserDataFromFirebase(currentUser.id);
    if (userData) {
      referralData.code = userData.referralCode || 'ROYAL777';
      referralData.link = window.location.origin + '/?ref=' + referralData.code;
      referralData.totalReferrals = userData.referralCount || 0;
      referralData.totalEarnings = userData.referralEarnings || 0;
      
      var referralsSnap = await database.ref('referrals').orderByChild('referrerId').equalTo(currentUser.id).once('value');
      var referrals = referralsSnap.val();
      if (referrals) {
        referralData.referrals = Object.values(referrals).map(function(r) {
          return {
            username: r.referredUsername,
            status: r.status,
            deposit: r.depositAmount || 0,
            commission: r.commissionEarned || 0,
            date: new Date(r.timestamp).toLocaleDateString()
          };
        });
      } else {
        referralData.referrals = [];
      }
      
      var codeDisplay = document.getElementById('referralCodeDisplay');
      var linkInput = document.getElementById('referralLinkInput');
      var totalReferralsEl = document.getElementById('totalReferrals');
      var totalEarningsEl = document.getElementById('totalEarnings');
      var activeReferralsEl = document.getElementById('activeReferrals');
      var referralsBody = document.getElementById('referralsBody');
      
      if (codeDisplay) codeDisplay.textContent = referralData.code;
      if (linkInput) linkInput.value = referralData.link;
      if (totalReferralsEl) totalReferralsEl.textContent = referralData.totalReferrals;
      if (totalEarningsEl) totalEarningsEl.textContent = formatNumber(referralData.totalEarnings);
      if (activeReferralsEl) activeReferralsEl.textContent = referralData.referrals.filter(function(r) { return r.status === 'active'; }).length;
      
      if (referralsBody) {
        if (referralData.referrals.length === 0) {
          referralsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No referrals yet</td></tr>';
        } else {
          var referralsHtml = '';
          for (var i = 0; i < referralData.referrals.length; i++) {
            var r = referralData.referrals[i];
            referralsHtml += '<tr>' +
              '<td>' + escapeHtml(r.username) + '</td>' +
              '<td><span class="status-badge ' + (r.status === 'active' ? 'approved' : 'pending') + '">' + (r.status === 'active' ? 'Active' : 'Pending') + '</span></td>' +
              '<td class="amount-positive">' + formatNumber(r.deposit) + '</td>' +
              '<td class="amount-positive">' + formatNumber(r.commission) + '</td>' +
              '<td>' + r.date + '</td>' +
            '</tr>';
          }
          referralsBody.innerHTML = referralsHtml;
        }
      }
    }
  } catch (error) {
    console.error("Error loading referral data:", error);
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
  var btns = document.querySelectorAll('.filter-btn');
  btns.forEach(function(btn) { btn.classList.remove('active'); });
  if (event && event.target) event.target.classList.add('active');
  
  var filtered = [];
  if (filter === 'active') {
    filtered = referralData.referrals.filter(function(r) { return r.status === 'active'; });
  } else if (filter === 'pending') {
    filtered = referralData.referrals.filter(function(r) { return r.status !== 'active'; });
  } else {
    filtered = referralData.referrals;
  }
  
  var referralsBody = document.getElementById('referralsBody');
  if (referralsBody) {
    if (filtered.length === 0) {
      referralsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No referrals found</td></tr>';
    } else {
      var referralsHtml = '';
      for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i];
        referralsHtml += '<tr>' +
          '<td>' + escapeHtml(r.username) + '</td>' +
          '<td><span class="status-badge ' + (r.status === 'active' ? 'approved' : 'pending') + '">' + (r.status === 'active' ? 'Active' : 'Pending') + '</span></td>' +
          '<td class="amount-positive">' + formatNumber(r.deposit) + '</td>' +
          '<td class="amount-positive">' + formatNumber(r.commission) + '</td>' +
          '<td>' + r.date + '</td>' +
        '</tr>';
      }
      referralsBody.innerHTML = referralsHtml;
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== WITHDRAWAL FUNCTIONS =====
async function saveWithdrawalAccounts() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Error', 'Please login to save accounts');
    openAuthModal();
    return;
  }
  
  var jazzcash = document.getElementById('jazzcashNumber') ? document.getElementById('jazzcashNumber').value.trim() : '';
  var easypaisa = document.getElementById('easypaisaNumber') ? document.getElementById('easypaisaNumber').value.trim() : '';
  
  var accounts = {};
  if (jazzcash) accounts.jazzcash = jazzcash;
  if (easypaisa) accounts.easypaisa = easypaisa;
  
  await updateUserDataInFirebase(currentUser.id, { withdrawalAccounts: accounts });
  savedAccounts = accounts;
  showPopup('Success', 'Withdrawal accounts saved successfully!');
}

async function loadWithdrawalAccounts() {
  if (!currentUser || currentUser.isGuest) return;
  var userData = await getUserDataFromFirebase(currentUser.id);
  if (userData && userData.withdrawalAccounts) {
    savedAccounts = userData.withdrawalAccounts;
    var jazzcashInput = document.getElementById('jazzcashNumber');
    var easypaisaInput = document.getElementById('easypaisaNumber');
    if (jazzcashInput) jazzcashInput.value = savedAccounts.jazzcash || '';
    if (easypaisaInput) easypaisaInput.value = savedAccounts.easypaisa || '';
  }
}

function openWithdraw() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to withdraw');
    openAuthModal();
    return;
  }
  
  if (gameState.balance < 1000) {
    showPopup('Insufficient Balance', 'You need at least 1000 coins to withdraw');
    return;
  }
  
  if (!gameState.hasCompletedFirstWager && gameState.firstWagerProgress < 10000) {
    var remaining = 5000 - gameState.firstWagerProgress;
    showPopup('First Withdrawal Requirement', 'You need to wager ' + formatNumber(remaining) + ' more coins before your first withdrawal.');
    return;
  }
  
  var withdrawBalance = document.getElementById('withdrawBalance');
  if (withdrawBalance) withdrawBalance.textContent = formatNumber(gameState.balance);
  var withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.add('active');
  updateWithdrawPopup();
}

function closeWithdrawPopup() {
  var withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.remove('active');
}

function updateWithdrawPopup() {
  var method = document.getElementById('withdrawMethod') ? document.getElementById('withdrawMethod').value : null;
  var accountDisplay = document.getElementById('accountDisplay');
  if (method && accountDisplay) {
    if (savedAccounts[method]) {
      accountDisplay.innerHTML = 'Account: ' + savedAccounts[method];
      accountDisplay.style.color = '#2ecc71';
    } else {
      accountDisplay.innerHTML = 'No account saved. Please add in profile.';
      accountDisplay.style.color = '#e74c3c';
    }
  }
}

function processWithdraw() {
  var amount = parseInt(document.getElementById('withdrawAmount') ? document.getElementById('withdrawAmount').value : 0);
  var method = document.getElementById('withdrawMethod') ? document.getElementById('withdrawMethod').value : null;
  
  if (!amount || amount < 1000) {
    showPopup('Error', 'Minimum withdrawal amount is 1000 coins');
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
  
  if (!gameState.hasCompletedFirstWager && gameState.firstWagerProgress < 10000) {
    showPopup('Error', 'Complete wagering requirement first!');
    return;
  }
  
  gameState.balance -= amount;
  updateUI();
  saveUserDataToFirebase();
  
  showPopup('Withdrawal Request', 'Your withdrawal request for ' + formatNumber(amount) + ' coins has been submitted. Admin will process it shortly.');
  closeWithdrawPopup();
}

// ===== SHOP & PURCHASE FUNCTIONS =====
function renderShopGrid() {
  var shopGrid = document.getElementById('shopGrid');
  if (!shopGrid) return;
  
  var shopItems = [
    { amount: 100, coins: 100, bonus: 5 },
    { amount: 500, coins: 500, bonus: 25 },
    { amount: 1000, coins: 1000, bonus: 50, featured: true },
    { amount: 3000, coins: 3000, bonus: 150 },
    { amount: 5000, coins: 5000, bonus: 250 },
    { amount: 10000, coins: 10000, bonus: 500 }
  ];
  
  var html = '';
  for (var i = 0; i < shopItems.length; i++) {
    var item = shopItems[i];
    html += '<div class="shop-card ' + (item.featured ? 'featured' : '') + '" onclick="openPurchasePage(' + item.amount + ', ' + item.coins + ')">' +
      '<div class="shop-icon">💰</div>' +
      '<div class="shop-amount">₨' + item.amount + '</div>' +
      '<div class="shop-coins">' + formatNumber(item.coins) + ' Coins</div>' +
      '<div class="shop-bonus">+' + item.bonus + ' Bonus</div>' +
      '<div class="shop-total">Total: ' + formatNumber(item.coins + item.bonus) + ' Coins</div>' +
      '<button class="shop-btn">BUY NOW</button>' +
    '</div>';
  }
  shopGrid.innerHTML = html;
}

function openShop() {
  renderShopGrid();
  var shopSection = document.getElementById('shopSection');
  if (shopSection) shopSection.classList.add('active');
}

function closeShop() {
  var shopSection = document.getElementById('shopSection');
  if (shopSection) shopSection.classList.remove('active');
}

function openPurchasePage(amount, coins) {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to purchase');
    openAuthModal();
    return;
  }
  
  currentPurchaseAmount = amount;
  currentPurchaseCoins = coins;
  
  var bonusCoins = Math.floor(coins * 0.025);
  var totalCoins = coins + bonusCoins;
  var wageringAmount = coins * 70;
  
  var purchaseAmount = document.getElementById('purchaseAmount');
  var purchaseCoins = document.getElementById('purchaseCoins');
  var purchaseBonus = document.getElementById('purchaseBonus');
  var wagerInfo = document.getElementById('wagerInfo');
  
  if (purchaseAmount) purchaseAmount.textContent = '₨' + amount;
  if (purchaseCoins) purchaseCoins.textContent = formatNumber(coins) + ' Coins';
  if (purchaseBonus) purchaseBonus.innerHTML = '+' + formatNumber(bonusCoins) + ' Bonus (2.5%)<br>Total: ' + formatNumber(totalCoins) + ' Coins';
  if (wagerInfo) wagerInfo.innerHTML = '⏱️ Wagering Requirement: 70x of deposit (' + formatNumber(wageringAmount) + ' coins needed to wager)';
  
  var purchasePage = document.getElementById('purchasePage');
  if (purchasePage) purchasePage.classList.add('active');
}

function closePurchasePage() {
  var purchasePage = document.getElementById('purchasePage');
  if (purchasePage) purchasePage.classList.remove('active');
  var phoneInput = document.getElementById('purchasePhoneNumber');
  var transInput = document.getElementById('transactionId');
  if (phoneInput) phoneInput.value = '';
  if (transInput) transInput.value = '';
}

function submitPurchaseRequest() {
  var phoneNumber = document.getElementById('purchasePhoneNumber') ? document.getElementById('purchasePhoneNumber').value.trim() : '';
  var transactionId = document.getElementById('transactionId') ? document.getElementById('transactionId').value.trim() : '';
  
  if (!phoneNumber || phoneNumber.length < 10) {
    showPopup('Error', 'Please enter a valid phone number');
    return;
  }
  
  if (!currentUser) {
    showPopup('Error', 'Please login first');
    return;
  }
  
  var bonusCoins = Math.floor(currentPurchaseCoins * 0.025);
  var totalCoins = currentPurchaseCoins + bonusCoins;
  var wageringAmount = currentPurchaseCoins * 70;
  
  var purchaseRef = database.ref('purchase-requests').push();
  purchaseRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    amount: currentPurchaseAmount,
    coins: currentPurchaseCoins,
    bonusCoins: bonusCoins,
    totalCoins: totalCoins,
    phoneNumber: phoneNumber,
    transactionId: transactionId || null,
    wageringRequired: wageringAmount,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  // Update first deposit mission
  if (!missionsState.firstDeposit.completed) {
    missionsState.firstDeposit.completed = true;
    missionsState.firstDeposit.progress = 1;
    updateMissionsUI();
    saveUserDataToFirebase();
    showPopup('Mission Update!', 'First Deposit mission completed! Check Missions tab to claim reward!');
  }
  
  showPopup('Request Sent!', 'Your purchase request for ' + formatNumber(totalCoins) + ' coins has been submitted. Admin will verify and add coins to your account within 24 hours.');
  closePurchasePage();
}

// ===== DAILY REWARDS FUNCTIONS (WITH TIME TRACKING) =====
function canClaimDaily() {
  if (!currentUser) return false;
  if (!rewardState.lastDailyClaim) return true;
  
  var lastClaim = new Date(rewardState.lastDailyClaim);
  var today = new Date();
  
  if (lastClaim.getDate() !== today.getDate() || 
      lastClaim.getMonth() !== today.getMonth() || 
      lastClaim.getFullYear() !== today.getFullYear()) {
    return true;
  }
  return false;
}

function canClaimWeekly() {
  if (!currentUser) return false;
  if (!rewardState.lastWeeklyClaim) return true;
  
  var lastClaim = new Date(rewardState.lastWeeklyClaim);
  var today = new Date();
  var daysDiff = Math.floor((today - lastClaim) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
}

function canClaimMonthly() {
  if (!currentUser) return false;
  if (!rewardState.lastMonthlyClaim) return true;
  
  var lastClaim = new Date(rewardState.lastMonthlyClaim);
  var today = new Date();
  return lastClaim.getMonth() !== today.getMonth() || 
         lastClaim.getFullYear() !== today.getFullYear();
}

function getTimeUntilNextDaily() {
  if (!rewardState.lastDailyClaim) return "Available now!";
  
  var lastClaim = new Date(rewardState.lastDailyClaim);
  var nextClaim = new Date(lastClaim);
  nextClaim.setDate(nextClaim.getDate() + 1);
  nextClaim.setHours(0, 0, 0, 0);
  
  var now = new Date();
  if (now >= nextClaim) return "Available now!";
  
  var diff = nextClaim - now;
  var hours = Math.floor(diff / (1000 * 60 * 60));
  var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return hours + "h " + minutes + "m " + seconds + "s";
}

function getTimeUntilNextWeekly() {
  if (!rewardState.lastWeeklyClaim) return "Available now!";
  
  var lastClaim = new Date(rewardState.lastWeeklyClaim);
  var nextClaim = new Date(lastClaim);
  nextClaim.setDate(nextClaim.getDate() + 7);
  
  var now = new Date();
  if (now >= nextClaim) return "Available now!";
  
  var diff = nextClaim - now;
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return days + "d " + hours + "h";
}

function getTimeUntilNextMonthly() {
  if (!rewardState.lastMonthlyClaim) return "Available now!";
  
  var lastClaim = new Date(rewardState.lastMonthlyClaim);
  var nextClaim = new Date(lastClaim);
  nextClaim.setMonth(nextClaim.getMonth() + 1);
  
  var now = new Date();
  if (now >= nextClaim) return "Available now!";
  
  var diff = nextClaim - now;
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days + " days";
}

function startRewardCountdown() {
  if (rewardCountdownInterval) clearInterval(rewardCountdownInterval);
  rewardCountdownInterval = setInterval(function() {
    updateRewardUI();
  }, 1000);
}

function updateRewardUI() {
  var dailyBtn = document.getElementById('claimDailyBtn');
  var weeklyBtn = document.getElementById('claimWeeklyBtn');
  var monthlyBtn = document.getElementById('claimMonthlyBtn');
  var dailyCooldown = document.getElementById('dailyCooldown');
  var weeklyCooldown = document.getElementById('weeklyCooldown');
  var monthlyCooldown = document.getElementById('monthlyCooldown');
  
  var vipRewards = VIP_CONFIG.levels[gameState.vipLevel];
  var dailyRewardAmount = document.getElementById('dailyRewardAmount');
  var weeklyRewardAmount = document.getElementById('weeklyRewardAmount');
  var monthlyRewardAmount = document.getElementById('monthlyRewardAmount');
  
  if (dailyRewardAmount) dailyRewardAmount.textContent = vipRewards.dailyReward;
  if (weeklyRewardAmount) weeklyRewardAmount.textContent = vipRewards.weeklyReward;
  if (monthlyRewardAmount) monthlyRewardAmount.textContent = vipRewards.monthlyReward;
  
  if (dailyBtn) {
    if (canClaimDaily()) {
      dailyBtn.disabled = false;
      dailyBtn.style.opacity = '1';
      dailyBtn.style.cursor = 'pointer';
      if (dailyCooldown) {
        dailyCooldown.textContent = 'Ready to claim!';
        dailyCooldown.style.color = '#2ecc71';
      }
    } else {
      dailyBtn.disabled = true;
      dailyBtn.style.opacity = '0.5';
      dailyBtn.style.cursor = 'not-allowed';
      if (dailyCooldown) {
        dailyCooldown.textContent = getTimeUntilNextDaily();
        dailyCooldown.style.color = '#e74c3c';
      }
    }
  }
  
  if (weeklyBtn) {
    if (canClaimWeekly()) {
      weeklyBtn.disabled = false;
      weeklyBtn.style.opacity = '1';
      weeklyBtn.style.cursor = 'pointer';
      if (weeklyCooldown) {
        weeklyCooldown.textContent = 'Ready to claim!';
        weeklyCooldown.style.color = '#2ecc71';
      }
    } else {
      weeklyBtn.disabled = true;
      weeklyBtn.style.opacity = '0.5';
      weeklyBtn.style.cursor = 'not-allowed';
      if (weeklyCooldown) {
        weeklyCooldown.textContent = getTimeUntilNextWeekly();
        weeklyCooldown.style.color = '#e74c3c';
      }
    }
  }
  
  if (monthlyBtn) {
    if (canClaimMonthly()) {
      monthlyBtn.disabled = false;
      monthlyBtn.style.opacity = '1';
      monthlyBtn.style.cursor = 'pointer';
      if (monthlyCooldown) {
        monthlyCooldown.textContent = 'Ready to claim!';
        monthlyCooldown.style.color = '#2ecc71';
      }
    } else {
      monthlyBtn.disabled = true;
      monthlyBtn.style.opacity = '0.5';
      monthlyBtn.style.cursor = 'not-allowed';
      if (monthlyCooldown) {
        monthlyCooldown.textContent = getTimeUntilNextMonthly();
        monthlyCooldown.style.color = '#e74c3c';
      }
    }
  }
}

async function claimDailyReward() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to claim rewards');
    openAuthModal();
    return;
  }
  
  if (!canClaimDaily()) {
    showPopup('Already Claimed', 'Daily reward already claimed today! Come back tomorrow for more!');
    return;
  }
  
  var vipRewards = VIP_CONFIG.levels[gameState.vipLevel];
  var reward = vipRewards.dailyReward;
  
  gameState.balance += reward;
  rewardState.lastDailyClaim = new Date().toISOString();
  rewardState.lastDailyClaimDate = new Date().toDateString();
  rewardState.dailyStreak = (rewardState.dailyStreak || 0) + 1;
  
  updateUI();
  await saveUserDataToFirebase();
  updateRewardUI();
  
  showPopup('Daily Reward Claimed!', 'You received ' + reward + ' coins! Streak: ' + rewardState.dailyStreak + ' days');
}

async function claimWeeklyReward() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to claim rewards');
    openAuthModal();
    return;
  }
  
  if (!canClaimWeekly()) {
    var timeLeft = getTimeUntilNextWeekly();
    showPopup('Already Claimed', 'Weekly reward already claimed! ' + timeLeft);
    return;
  }
  
  var vipRewards = VIP_CONFIG.levels[gameState.vipLevel];
  var reward = vipRewards.weeklyReward;
  
  gameState.balance += reward;
  rewardState.lastWeeklyClaim = new Date().toISOString();
  rewardState.lastWeeklyClaimDate = new Date().toDateString();
  rewardState.weeklyStreak = (rewardState.weeklyStreak || 0) + 1;
  
  updateUI();
  await saveUserDataToFirebase();
  updateRewardUI();
  
  showPopup('Weekly Reward Claimed!', 'You received ' + reward + ' coins! Week streak: ' + rewardState.weeklyStreak);
}

async function claimMonthlyReward() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to claim rewards');
    openAuthModal();
    return;
  }
  
  if (!canClaimMonthly()) {
    var timeLeft = getTimeUntilNextMonthly();
    showPopup('Already Claimed', 'Monthly reward already claimed! ' + timeLeft);
    return;
  }
  
  var vipRewards = VIP_CONFIG.levels[gameState.vipLevel];
  var reward = vipRewards.monthlyReward;
  
  gameState.balance += reward;
  rewardState.lastMonthlyClaim = new Date().toISOString();
  rewardState.lastMonthlyClaimDate = new Date().toDateString();
  
  updateUI();
  await saveUserDataToFirebase();
  updateRewardUI();
  
  showPopup('Monthly Reward Claimed!', 'You received ' + reward + ' coins!');
}

// ===== MISSIONS FUNCTIONS =====
function updateMissionsUI() {
  var missionsContent = document.getElementById('missionsContent');
  if (!missionsContent) return;
  
  var missions = [
    { id: 'dailyLogin', title: 'Daily Login', desc: 'Login daily to claim reward', reward: 10, icon: '🎁' },
    { id: 'firstDeposit', title: 'First Deposit', desc: 'Make your first deposit', reward: 50, icon: '💰' },
    { id: 'gamesPlayed', title: 'Betting Enthusiast', desc: 'Place ' + missionsState.gamesPlayed.target + ' bets', reward: 100, icon: '🎮', progress: missionsState.gamesPlayed.progress, target: missionsState.gamesPlayed.target },
    { id: 'bigWin', title: 'Winner\'s Circle', desc: 'Win ' + missionsState.bigWin.target + ' games', reward: 200, icon: '🏆', progress: missionsState.bigWin.progress, target: missionsState.bigWin.target }
  ];
  
  var html = '';
  for (var i = 0; i < missions.length; i++) {
    var mission = missions[i];
    var missionData = missionsState[mission.id];
    var isCompleted = missionData && missionData.completed;
    var isClaimed = missionData && missionData.claimed;
    var progressText = '';
    
    if (mission.progress !== undefined) {
      var percent = (mission.progress / mission.target * 100);
      progressText = '<div class="mission-progress"><div class="mission-progress-bar" style="width: ' + percent + '%"></div><span>' + mission.progress + '/' + mission.target + '</span></div>';
    }
    
    var buttonHtml = '';
    if (isClaimed) {
      buttonHtml = '<button class="mission-btn claimed" disabled>✓ Claimed</button>';
    } else if (isCompleted) {
      buttonHtml = '<button class="mission-btn available" onclick="claimMissionReward(\'' + mission.id + '\', ' + mission.reward + ')">🎁 Claim Reward</button>';
    } else {
      buttonHtml = '<button class="mission-btn locked" disabled>🔒 Locked</button>';
    }
    
    html += '<div class="mission-card">' +
      '<div class="mission-header"><span class="mission-icon">' + mission.icon + '</span><span class="mission-title">' + mission.title + '</span></div>' +
      '<div class="mission-desc">' + mission.desc + '</div>' +
      progressText +
      '<div class="mission-reward">🎁 ' + mission.reward + ' Coins</div>' +
      buttonHtml +
    '</div>';
  }
  missionsContent.innerHTML = html;
}

async function claimMissionReward(missionId, rewardAmount) {
  console.log("Claiming mission reward:", missionId, rewardAmount);
  
  if (!currentUser) {
    showPopup('Login Required', 'Please login to claim rewards');
    openAuthModal();
    return;
  }
  
  if (!missionsState[missionId]) {
    showPopup('Error', 'Mission not found!');
    return;
  }
  
  if (!missionsState[missionId].completed) {
    showPopup('Mission Not Completed', 'Complete the mission first to claim reward!');
    return;
  }
  
  if (missionsState[missionId].claimed) {
    showPopup('Already Claimed', 'You have already claimed this reward!');
    return;
  }
  
  gameState.balance += rewardAmount;
  missionsState[missionId].claimed = true;
  
  updateUI();
  await saveUserDataToFirebase();
  updateMissionsUI();
  
  showPopup('Mission Reward Claimed!', 'You received ' + rewardAmount + ' coins for completing the mission!');
}

function checkAndUpdateMissions() {
  var updated = false;
  
  // Check games played mission
  if (!missionsState.gamesPlayed.completed && gameState.totalBets >= missionsState.gamesPlayed.target) {
    missionsState.gamesPlayed.completed = true;
    updated = true;
  } else if (!missionsState.gamesPlayed.completed) {
    missionsState.gamesPlayed.progress = gameState.totalBets;
  }
  
  // Check big win mission
  if (!missionsState.bigWin.completed && gameState.totalWins >= missionsState.bigWin.target) {
    missionsState.bigWin.completed = true;
    updated = true;
  } else if (!missionsState.bigWin.completed) {
    missionsState.bigWin.progress = gameState.totalWins;
  }
  
  if (updated) {
    updateMissionsUI();
    saveUserDataToFirebase();
    showPopup('Mission Update!', 'A mission has been completed! Check Missions tab to claim your reward!');
  }
}

// ===== UI FUNCTIONS =====
function updateUI() {
  var balanceDisplay = document.getElementById('balanceDisplay');
  var lobbyBalance = document.getElementById('lobbyBalance');
  var currentWin = document.getElementById('currentWin');
  var multiplier = document.getElementById('multiplier');
  var pairsDisplay = document.getElementById('pairsDisplay');
  var profileCoins = document.getElementById('profileCoins');
  var profileBets = document.getElementById('profileBets');
  var profileWins = document.getElementById('profileWins');
  var profileTotalSpent = document.getElementById('profileTotalSpent');
  var profileVipLevel = document.getElementById('profileVipLevel');
  var profileNextVip = document.getElementById('profileNextVip');
  var vipLevelDisplay = document.getElementById('vipLevelDisplay');
  var totalSpentDisplay = document.getElementById('totalSpentDisplay');
  var nextVipAmount = document.getElementById('nextVipAmount');
  var vipProgressBar = document.getElementById('vipProgressBar');
  
  if (balanceDisplay) balanceDisplay.textContent = formatNumber(gameState.balance);
  if (lobbyBalance) lobbyBalance.textContent = formatNumber(gameState.balance);
  if (currentWin) currentWin.textContent = formatNumber(gameState.currentWin);
  if (multiplier) multiplier.textContent = gameState.multiplier.toFixed(2) + 'x';
  if (pairsDisplay) pairsDisplay.textContent = gameState.pairsMatched + '/' + CONFIG.PAIRS_COUNT;
  if (profileCoins) profileCoins.textContent = formatNumber(gameState.balance);
  if (profileBets) profileBets.textContent = gameState.totalBets;
  if (profileWins) profileWins.textContent = gameState.totalWins;
  if (profileTotalSpent) profileTotalSpent.textContent = formatNumber(gameState.totalSpent);
  if (profileVipLevel) profileVipLevel.textContent = gameState.vipLevel;
  if (vipLevelDisplay) vipLevelDisplay.textContent = gameState.vipLevel;
  if (totalSpentDisplay) totalSpentDisplay.textContent = formatNumber(gameState.totalSpent);
  
  var currentVip = VIP_CONFIG.levels[gameState.vipLevel];
  var nextVip = VIP_CONFIG.levels[gameState.vipLevel + 1];
  
  if (nextVip) {
    if (profileNextVip) profileNextVip.textContent = formatNumber(nextVip.requiredSpend - gameState.totalSpent);
    if (nextVipAmount) nextVipAmount.textContent = formatNumber(nextVip.requiredSpend);
    if (vipProgressBar) {
      var progress = ((gameState.totalSpent - currentVip.requiredSpend) / (nextVip.requiredSpend - currentVip.requiredSpend)) * 100;
      vipProgressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
    }
  } else {
    if (profileNextVip) profileNextVip.textContent = 'MAX';
    if (nextVipAmount) nextVipAmount.textContent = 'MAX';
    if (vipProgressBar) vipProgressBar.style.width = '100%';
  }
  
  var progressBar = document.getElementById('firstWagerProgressBar');
  var progressText = document.getElementById('firstWagerProgressText');
  if (progressBar && progressText) {
    var percent = (gameState.firstWagerProgress / 10000) * 100;
    progressBar.style.width = Math.min(100, percent) + '%';
    if (gameState.hasCompletedFirstWager) {
      progressText.innerHTML = '✅ First withdrawal unlocked!';
      progressText.style.color = '#2ecc71';
    } else {
      progressText.innerHTML = formatNumber(gameState.firstWagerProgress) + ' / 10000 wagered';
    }
  }
}

function updateHeaderForUser() {
  var headerUsername = document.getElementById('headerUsername');
  var headerAvatar = document.getElementById('headerAvatarIcon');
  var userStatus = document.getElementById('userStatus');
  var profileNameDisplay = document.getElementById('profileNameDisplay');
  var profileIdDisplay = document.getElementById('profileIdDisplay');
  var currentAvatarDisplay = document.getElementById('currentAvatarDisplay');
  var profileVipBadge = document.getElementById('profileVipBadge');
  
  if (currentUser) {
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (headerAvatar) headerAvatar.textContent = currentUser.avatar || '👤';
    if (userStatus) userStatus.textContent = currentUser.isGuest ? 'Guest Mode' : 'Verified Player';
    if (profileNameDisplay) profileNameDisplay.textContent = currentUser.username;
    if (profileIdDisplay) profileIdDisplay.textContent = 'ID: ' + (currentUser.id ? currentUser.id.substring(0, 8) : 'GUEST');
    if (currentAvatarDisplay) currentAvatarDisplay.textContent = currentUser.avatar || '👤';
    if (profileVipBadge) profileVipBadge.textContent = 'VIP ' + gameState.vipLevel;
  } else {
    if (headerUsername) headerUsername.textContent = 'Guest';
    if (headerAvatar) headerAvatar.textContent = '👤';
    if (userStatus) userStatus.textContent = 'Tap to login';
  }
}

function hideAuthButtons() {
  var authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'none';
}

function showAuthButtons() {
  var authButtons = document.getElementById('authButtons');
  if (authButtons) authButtons.style.display = 'flex';
}

function openAuthModal() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

function closeAuth() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function openProfile() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  var profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.add('active');
  updateUI();
  updateHeaderForUser();
  loadWithdrawalAccounts();
}

function closeProfile() {
  var profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.remove('active');
  cancelEdit();
}

function showEditUsername() {
  var editSection = document.getElementById('editUsernameSection');
  var editBtn = document.getElementById('editUsernameBtn');
  if (editSection) editSection.style.display = 'block';
  if (editBtn) editBtn.style.display = 'none';
}

function cancelEdit() {
  var editSection = document.getElementById('editUsernameSection');
  var editBtn = document.getElementById('editUsernameBtn');
  if (editSection) editSection.style.display = 'none';
  if (editBtn) editBtn.style.display = 'block';
}

async function updateUsername() {
  var newUsername = document.getElementById('newUsername') ? document.getElementById('newUsername').value.trim() : '';
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
  if (currentUser && currentUser.isGuest) {
    showPopup('Error', 'Guests cannot change avatar');
    return;
  }
  var avatarPopup = document.getElementById('avatarPopup');
  if (avatarPopup) avatarPopup.classList.add('active');
}

async function selectAvatar(avatar) {
  if (!currentUser) return;
  if (currentUser.isGuest) {
    showPopup('Error', 'Guests cannot change avatar');
    closeAvatarPopup();
    return;
  }
  currentUser.avatar = avatar;
  await updateUserDataInFirebase(currentUser.id, { avatar: avatar });
  updateHeaderForUser();
  closeAvatarPopup();
  showPopup('Success', 'Avatar updated');
}

function closeAvatarPopup() {
  var avatarPopup = document.getElementById('avatarPopup');
  if (avatarPopup) avatarPopup.classList.remove('active');
}

// ===== NOTIFICATION FUNCTIONS =====
function openNotificationPanel() {
  var panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.add('open');
}

function closeNotificationPanel() {
  var panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('open');
}

function deleteAllNotifications() {
  showPopup('Deleted', 'All notifications removed');
}

// ===== SUPPORT FUNCTIONS =====
function sendSupportMessage() {
  var message = document.getElementById('supportMessage') ? document.getElementById('supportMessage').value.trim() : '';
  if (!message) {
    showPopup('Error', 'Please enter a message');
    return;
  }
  if (!currentUser) {
    showPopup('Error', 'Please login to send support messages');
    openAuthModal();
    return;
  }
  
  database.ref('support-tickets').push().set({
    userId: currentUser.id,
    username: currentUser.username,
    message: message,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  var supportMessage = document.getElementById('supportMessage');
  if (supportMessage) supportMessage.value = '';
  showPopup('Message Sent', 'Your support message has been sent to admin');
}

function openSupportBot() {
  window.open('https://bots.easy-peasy.ai/bot/74d4a40f-b3ee-4e22-9ae0-bbb8f2b9fdd5', '_blank');
}

function openAdditionalSupport() {
  var section = document.getElementById('additionalSupportSection');
  if (section) section.classList.add('active');
}

function closeAdditionalSupport() {
  var section = document.getElementById('additionalSupportSection');
  if (section) section.classList.remove('active');
}

// ===== OFFERS FUNCTIONS =====
function openOffers() {
  var section = document.getElementById('offersSection');
  if (section) section.classList.add('active');
}

function closeOffers() {
  var section = document.getElementById('offersSection');
  if (section) section.classList.remove('active');
}

function openMissions() {
  var missionsSection = document.getElementById('missionsSection');
  if (missionsSection) missionsSection.classList.add('active');
  updateMissionsUI();
  closeOffers();
}

function closeMissions() {
  var missionsSection = document.getElementById('missionsSection');
  if (missionsSection) missionsSection.classList.remove('active');
  openOffers();
}

function openSupport() {
  var supportSection = document.getElementById('supportSection');
  if (supportSection) supportSection.classList.add('active');
  closeOffers();
}

function closeSupport() {
  var supportSection = document.getElementById('supportSection');
  if (supportSection) supportSection.classList.remove('active');
  openOffers();
}

function openVIPPopup() {
  var content = document.getElementById('vipPopupContent');
  if (content) {
    var html = '';
    for (var i = 0; i < VIP_CONFIG.levels.length; i++) {
      var vip = VIP_CONFIG.levels[i];
      html += '<div style="margin: 0.5rem 0; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 8px;">' +
        '<strong>VIP ' + vip.level + '</strong> - Daily: ' + vip.dailyReward + ' | Weekly: ' + vip.weeklyReward + ' | Monthly: ' + vip.monthlyReward + '<br>' +
        '<small>Requires ' + formatNumber(vip.requiredSpend) + ' coins spent</small>' +
      '</div>';
    }
    content.innerHTML = html;
  }
  var vipPopup = document.getElementById('vipPopup');
  if (vipPopup) vipPopup.classList.add('active');
}

function closeVIPPopup() {
  var vipPopup = document.getElementById('vipPopup');
  if (vipPopup) vipPopup.classList.remove('active');
}

function openDailyRewards() {
  var section = document.getElementById('dailyRewardsSection');
  if (section) section.classList.add('active');
  updateRewardUI();
  closeOffers();
}

function closeDailyRewards() {
  var section = document.getElementById('dailyRewardsSection');
  if (section) section.classList.remove('active');
  openOffers();
}

function openReferral() {
  var section = document.getElementById('referralSection');
  if (section) section.classList.add('active');
  loadReferralData();
}

function closeReferral() {
  var section = document.getElementById('referralSection');
  if (section) section.classList.remove('active');
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
  var modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  var modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function toggleSound() {
  var soundToggle = document.getElementById('soundToggle');
  if (soundToggle) soundToggle.classList.toggle('active');
}

function toggleNotifications() {
  showPopup('Notifications', 'Notification settings saved');
}

function showThemeSelector() {
  var selector = document.getElementById('themeSelector');
  if (selector) selector.classList.toggle('active');
}

function changeTheme(themeName) {
  document.body.className = 'theme-' + themeName;
  var btns = document.querySelectorAll('.theme-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
  if (event && event.target) {
    var btn = event.target.closest('.theme-btn');
    if (btn) btn.classList.add('active');
  }
}

// ===== LEADERBOARD FUNCTIONS =====
function renderLeaderboard() {
  var list = document.getElementById('leaderboardList');
  if (!list) return;
  
  var shuffled = [];
  for (var i = 0; i < pakistaniNames.length; i++) {
    shuffled.push(pakistaniNames[i]);
  }
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  
  var champions = [];
  for (var i = 0; i < 7 && i < shuffled.length; i++) {
    champions.push(shuffled[i]);
  }
  var avatars = ['👑', '🥈', '🥉', '🎯', '💎', '🦁', '⭐'];
  
  var html = '';
  for (var i = 0; i < champions.length; i++) {
    var rankClass = '';
    if (i === 0) rankClass = 'gold';
    else if (i === 1) rankClass = 'silver';
    else if (i === 2) rankClass = 'bronze';
    var winAmount = Math.floor(Math.random() * 90000 + 10000);
    html += '<div class="leaderboard-item">' +
      '<div class="rank-number ' + rankClass + '">' + (i + 1) + '</div>' +
      '<div class="leader-avatar">' + avatars[i] + '</div>' +
      '<div class="leader-info">' +
        '<div class="leader-name">' + champions[i] + '</div>' +
        '<div class="leader-win">' + formatNumber(winAmount) + ' won</div>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = html;
}

// ===== GAME FUNCTIONS =====
function enterGame() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to play');
    openAuthModal();
    return;
  }
  
  resetGame();
  
  var gameView = document.getElementById('gameView');
  if (gameView) {
    gameView.classList.add('active');
    isInGame = true;
    updateBalanceDisplay();
  }
}

function exitGame() {
  resetGame();
  
  var gameView = document.getElementById('gameView');
  if (gameView) {
    gameView.classList.remove('active');
    isInGame = false;
  }
}

function updateBalanceDisplay() {
  var balanceDisplay = document.getElementById('balanceDisplay');
  if (balanceDisplay) balanceDisplay.textContent = formatNumber(gameState.balance);
  var lobbyBalance = document.getElementById('lobbyBalance');
  if (lobbyBalance) lobbyBalance.textContent = formatNumber(gameState.balance);
}

function selectBet(amount) {
  if (gameState.isPlaying) return;
  if (amount > gameState.balance) {
    showPopup('Insufficient Balance', 'You don\'t have enough coins! Please purchase coins from shop.');
    return;
  }
  gameState.currentBet = amount;
  var betOptions = document.querySelectorAll('.bet-option');
  for (var i = 0; i < betOptions.length; i++) {
    var btn = betOptions[i];
    btn.classList.remove('selected');
    if (parseInt(btn.getAttribute('data-bet')) === amount) {
      btn.classList.add('selected');
    }
  }
  var msgText = document.getElementById('messageText');
  if (msgText) msgText.textContent = 'Bet: ' + amount + ' coins selected';
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function generateCards() {
  var cards = [];
  for (var i = 0; i < CONFIG.PAIRS_COUNT; i++) {
    var value = CARD_VALUES[i % CARD_VALUES.length];
    var suit = CARD_SUITS[i % 4];
    cards.push({ value: value, suit: suit, id: 'pair' + i + 'a', type: 'normal' });
    cards.push({ value: value, suit: suit, id: 'pair' + i + 'b', type: 'normal' });
  }
  for (var i = 0; i < CONFIG.BOMB_COUNT; i++) {
    cards.push({ type: 'bomb', id: 'bomb' + i });
  }
  for (var i = 0; i < CONFIG.GOLDEN_COUNT; i++) {
    cards.push({ type: 'golden', id: 'golden' + i });
  }
  return shuffleArray(cards);
}

function renderCards() {
  var cardGrid = document.getElementById('cardGrid');
  if (!cardGrid) return;
  
  cardGrid.innerHTML = '';
  for (var i = 0; i < gameState.cards.length; i++) {
    var card = gameState.cards[i];
    var cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.setAttribute('data-index', i);
    cardDiv.setAttribute('data-type', card.type);
    cardDiv.setAttribute('data-value', card.value || '');
    cardDiv.setAttribute('data-id', card.id);
    
    var backDiv = document.createElement('div');
    backDiv.className = 'card-face card-back';
    backDiv.innerHTML = '<div class="card-back-pattern"></div><span class="card-back-logo">RM</span>';
    
    var frontDiv = document.createElement('div');
    frontDiv.className = 'card-face card-front';
    
    if (card.type === 'bomb') {
      frontDiv.classList.add('bomb');
      frontDiv.innerHTML = '<div class="bomb-content"><span class="bomb-icon">💣</span><span class="bomb-text">BOOM!</span></div>';
    } else if (card.type === 'golden') {
      frontDiv.classList.add('golden');
      frontDiv.innerHTML = '<div class="golden-content"><span class="golden-icon">👑</span><span class="golden-text">20X WIN!</span></div>';
    } else {
      frontDiv.classList.add(card.suit.color);
      frontDiv.innerHTML = 
        '<div class="card-corner card-corner-tl">' +
          '<span class="card-rank">' + card.value + '</span>' +
          '<span class="card-suit-small">' + card.suit.symbol + '</span>' +
        '</div>' +
        '<span class="card-center">' + card.suit.symbol + '</span>' +
        '<div class="card-corner card-corner-br">' +
          '<span class="card-rank">' + card.value + '</span>' +
          '<span class="card-suit-small">' + card.suit.symbol + '</span>' +
        '</div>';
    }
    
    cardDiv.appendChild(backDiv);
    cardDiv.appendChild(frontDiv);
    cardDiv.addEventListener('click', (function(el) {
      return function() { handleCardClick(el); };
    })(cardDiv));
    cardGrid.appendChild(cardDiv);
  }
}

async function startGame() {
  if (!currentUser) {
    showPopup('Login Required', 'Please login to play');
    openAuthModal();
    return;
  }
  if (gameState.currentBet <= 0) {
    showPopup('No Bet', 'Please select a bet amount first!');
    return;
  }
  if (gameState.currentBet > gameState.balance) {
    showPopup('Insufficient Balance', 'You don\'t have enough coins! Please purchase coins from shop.');
    return;
  }
  
  gameState.balance -= gameState.currentBet;
  gameState.totalSpent += gameState.currentBet;
  gameState.firstWagerProgress += gameState.currentBet;
  gameState.totalBets++;
  
  checkAndUpdateMissions();
  
  var newVipLevel = 0;
  if (gameState.totalSpent >= 640000) newVipLevel = 5;
  else if (gameState.totalSpent >= 320000) newVipLevel = 4;
  else if (gameState.totalSpent >= 160000) newVipLevel = 3;
  else if (gameState.totalSpent >= 80000) newVipLevel = 2;
  else if (gameState.totalSpent >= 40000) newVipLevel = 1;
  else newVipLevel = 0;
  
  if (newVipLevel > gameState.vipLevel) {
    gameState.vipLevel = newVipLevel;
    showPopup('VIP Level Up!', 'Congratulations! You reached VIP Level ' + newVipLevel + '!');
  }
  
  if (gameState.firstWagerProgress >= 10000 && !gameState.hasCompletedFirstWager) {
    gameState.hasCompletedFirstWager = true;
    showPopup('First Withdrawal Unlocked!', 'You have completed the 10000 coin wagering requirement!');
  }
  
  await saveUserDataToFirebase();
  updateUI();
  updateBalanceDisplay();
  
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.isPlaying = true;
  gameState.canFlip = true;
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.matchedPairs = 0;
  gameState.goldenCardsFound = [];
  
  gameState.cards = generateCards();
  renderCards();
  
  var betPanel = document.getElementById('betPanel');
  var startBtn = document.getElementById('startBtn');
  var cashoutBtn = document.getElementById('cashoutBtn');
  var continueBtn = document.getElementById('continueBtn');
  var messageText = document.getElementById('messageText');
  var currentWinSpan = document.getElementById('currentWin');
  var multiplierSpan = document.getElementById('multiplier');
  var pairsDisplaySpan = document.getElementById('pairsDisplay');
  
  if (betPanel) betPanel.style.display = 'none';
  if (startBtn) startBtn.classList.add('hidden');
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
  if (continueBtn) continueBtn.classList.add('hidden');
  if (messageText) messageText.textContent = 'Find matching pairs! Avoid bombs!';
  if (currentWinSpan) currentWinSpan.textContent = '0';
  if (multiplierSpan) multiplierSpan.textContent = '1.00x';
  if (pairsDisplaySpan) pairsDisplaySpan.textContent = '0/' + CONFIG.PAIRS_COUNT;
}

function handleCardClick(cardDiv) {
  if (!gameState.canFlip) return;
  if (cardDiv.classList.contains('flipped')) return;
  if (cardDiv.classList.contains('matched')) return;
  
  var cardType = cardDiv.getAttribute('data-type');
  
  cardDiv.classList.add('flipped');
  
  if (cardType === 'bomb') {
    gameState.isPlaying = false;
    gameState.canFlip = false;
    saveUserDataToFirebase();
    var loseOverlay = document.getElementById('loseOverlay');
    if (loseOverlay) loseOverlay.classList.add('active');
    return;
  }
  
  if (cardType === 'golden') {
    if (!gameState.firstCard) {
      gameState.firstCard = cardDiv;
    } else if (!gameState.secondCard && gameState.firstCard !== cardDiv) {
      gameState.secondCard = cardDiv;
      gameState.canFlip = false;
      setTimeout(checkGoldenMatch, 500);
    }
    return;
  }
  
  if (!gameState.firstCard) {
    gameState.firstCard = cardDiv;
  } else if (!gameState.secondCard && gameState.firstCard !== cardDiv) {
    gameState.secondCard = cardDiv;
    gameState.canFlip = false;
    setTimeout(checkMatch, 500);
  }
}

function checkGoldenMatch() {
  var card1 = gameState.firstCard;
  var card2 = gameState.secondCard;
  
  var card1Type = card1.getAttribute('data-type');
  var card2Type = card2.getAttribute('data-type');
  
  if (card1Type === 'golden' && card2Type === 'golden') {
    card1.classList.add('matched');
    card2.classList.add('matched');
    gameState.currentWin = gameState.currentBet * CONFIG.GOLDEN_MULTIPLIER;
    gameState.multiplier = CONFIG.GOLDEN_MULTIPLIER;
    gameState.balance += gameState.currentWin;
    gameState.totalWins++;
    updateUI();
    updateBalanceDisplay();
    saveUserDataToFirebase();
    checkAndUpdateMissions();
    
    var winOverlay = document.getElementById('winOverlay');
    var winAmountDisplay = document.getElementById('winAmountDisplay');
    if (winAmountDisplay) winAmountDisplay.textContent = formatNumber(gameState.currentWin);
    if (winOverlay) winOverlay.classList.add('active');
    gameState.isPlaying = false;
  } else {
    setTimeout(function() {
      if (card1) card1.classList.remove('flipped');
      if (card2) card2.classList.remove('flipped');
      var messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = 'No match! Try again!';
      gameState.canFlip = true;
    }, 500);
  }
  
  gameState.firstCard = null;
  gameState.secondCard = null;
}

function checkMatch() {
  var card1 = gameState.firstCard;
  var card2 = gameState.secondCard;
  
  var match = card1.getAttribute('data-value') === card2.getAttribute('data-value') && 
              card1.getAttribute('data-id') !== card2.getAttribute('data-id');
  
  if (match) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    gameState.pairsMatched++;
    gameState.matchedPairs++;
    gameState.multiplier = CONFIG.MULTIPLIERS[gameState.pairsMatched - 1] || gameState.multiplier;
    gameState.currentWin = Math.floor(gameState.currentBet * gameState.multiplier);
    
    updateUI();
    
    var messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'MATCH! +' + formatNumber(gameState.currentWin) + ' (' + gameState.multiplier + 'x)';
    
    if (gameState.pairsMatched >= CONFIG.PAIRS_COUNT) {
      gameState.balance += gameState.currentWin;
      gameState.totalWins++;
      updateUI();
      updateBalanceDisplay();
      saveUserDataToFirebase();
      checkAndUpdateMissions();
      
      var winOverlay = document.getElementById('winOverlay');
      var winAmountDisplay = document.getElementById('winAmountDisplay');
      if (winAmountDisplay) winAmountDisplay.textContent = formatNumber(gameState.currentWin);
      if (winOverlay) winOverlay.classList.add('active');
      gameState.isPlaying = false;
    } else {
      gameState.canFlip = true;
      var cashoutBtn = document.getElementById('cashoutBtn');
      var continueBtn = document.getElementById('continueBtn');
      if (cashoutBtn) cashoutBtn.classList.remove('hidden');
      if (continueBtn) continueBtn.classList.remove('hidden');
    }
  } else {
    setTimeout(function() {
      if (card1) card1.classList.remove('flipped');
      if (card2) card2.classList.remove('flipped');
      var messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = 'No match! Try again!';
      gameState.canFlip = true;
    }, 500);
  }
  
  gameState.firstCard = null;
  gameState.secondCard = null;
}

async function cashout() {
  if (gameState.currentWin <= 0) return;
  
  gameState.balance += gameState.currentWin;
  gameState.totalWins++;
  updateUI();
  updateBalanceDisplay();
  await saveUserDataToFirebase();
  checkAndUpdateMissions();
  
  var winOverlay = document.getElementById('winOverlay');
  var winAmountDisplay = document.getElementById('winAmountDisplay');
  if (winAmountDisplay) winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  if (winOverlay) winOverlay.classList.add('active');
  gameState.isPlaying = false;
}

function continuePlaying() {
  gameState.canFlip = true;
  var cashoutBtn = document.getElementById('cashoutBtn');
  var continueBtn = document.getElementById('continueBtn');
  var messageText = document.getElementById('messageText');
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
  if (continueBtn) continueBtn.classList.add('hidden');
  if (messageText) messageText.textContent = 'Continue playing!';
}

function resetGame() {
  var winOverlay = document.getElementById('winOverlay');
  var loseOverlay = document.getElementById('loseOverlay');
  var betPanel = document.getElementById('betPanel');
  var startBtn = document.getElementById('startBtn');
  var cardGrid = document.getElementById('cardGrid');
  var messageText = document.getElementById('messageText');
  var currentWinSpan = document.getElementById('currentWin');
  var multiplierSpan = document.getElementById('multiplier');
  var pairsDisplaySpan = document.getElementById('pairsDisplay');
  
  if (winOverlay) winOverlay.classList.remove('active');
  if (loseOverlay) loseOverlay.classList.remove('active');
  if (betPanel) betPanel.style.display = 'block';
  if (startBtn) startBtn.classList.remove('hidden');
  if (cardGrid) cardGrid.innerHTML = '';
  if (messageText) messageText.textContent = 'Select your bet and tap START GAME';
  if (currentWinSpan) currentWinSpan.textContent = '0';
  if (multiplierSpan) multiplierSpan.textContent = '1.00x';
  if (pairsDisplaySpan) pairsDisplaySpan.textContent = '0/' + CONFIG.PAIRS_COUNT;
  
  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.isPlaying = false;
  gameState.canFlip = false;
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.goldenCardsFound = [];
  gameState.cards = [];
  
  var cashoutBtn = document.getElementById('cashoutBtn');
  var continueBtn = document.getElementById('continueBtn');
  if (cashoutBtn) cashoutBtn.classList.add('hidden');
  if (continueBtn) continueBtn.classList.add('hidden');
  
  var betOptions = document.querySelectorAll('.bet-option');
  for (var i = 0; i < betOptions.length; i++) {
    betOptions[i].classList.remove('selected');
  }
}

function setActiveNav(element) {
  var navItems = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].classList.remove('active');
  }
  element.classList.add('active');
}

function showHome() {
  exitGame();
}

// ===== AUDIO PLACEHOLDERS =====
function playClick() {}
function playCardFlip() {}
function playMatch() {}
function playWin() {}
function playBomb() {}
function playCashout() {}

// ===== INITIALIZATION =====
function createParticles() {
  var container = document.getElementById('particles');
  if (!container) return;
  for (var i = 0; i < 50; i++) {
    var particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.animationDuration = (10 + Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

function initApp() {
  console.log('Initializing Casino shuffle 786...');
  
  createParticles();
  renderLeaderboard();
  setInterval(renderLeaderboard, 5000);
  
  var betOptions = document.querySelectorAll('.bet-option');
  for (var i = 0; i < betOptions.length; i++) {
    var btn = betOptions[i];
    btn.addEventListener('click', (function(b) {
      return function() {
        selectBet(parseInt(b.getAttribute('data-bet')));
      };
    })(btn));
  }
  
  var startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);
  
  var cashoutBtn = document.getElementById('cashoutBtn');
  if (cashoutBtn) cashoutBtn.addEventListener('click', cashout);
  
  var continueBtn = document.getElementById('continueBtn');
  if (continueBtn) continueBtn.addEventListener('click', continuePlaying);
  
  updateUI();
  updateBalanceDisplay();
  
  var urlRefCode = getReferralCodeFromURL();
  if (urlRefCode) {
    console.log("Referral code found in URL:", urlRefCode);
    setTimeout(function() {
      var referralInput = document.querySelector('#registerForm input[name="referralCode"]');
      if (referralInput) {
        referralInput.value = urlRefCode;
      }
    }, 1000);
  }
  
  if (!currentUser) {
    setTimeout(function() {
      openAuthModal();
    }, 500);
  }
  
  auth.onAuthStateChanged(function(user) {
    if (user && !currentUser) {
      getUserDataFromFirebase(user.uid).then(function(userData) {
        if (userData) {
          currentUser = {
            username: userData.username,
            avatar: userData.avatar || '👤',
            isGuest: false,
            id: user.uid,
            email: user.email
          };
          gameState.balance = userData.coins || 0;
          gameState.totalBets = userData.totalBets || 0;
          gameState.totalWins = userData.totalWins || 0;
          gameState.totalSpent = userData.totalSpent || 0;
          gameState.vipLevel = userData.vipLevel || 0;
          gameState.firstWagerProgress = userData.firstWagerProgress || 0;
          gameState.hasCompletedFirstWager = userData.hasCompletedFirstWager || false;
          if (userData.rewards) {
            rewardState = { ...rewardState, ...userData.rewards };
          }
          if (userData.missions) {
            missionsState = { ...missionsState, ...userData.missions };
          }
          updateHeaderForUser();
          updateUI();
          updateRewardUI();
          updateMissionsUI();
          hideAuthButtons();
          startAutoRefresh();
          startRewardCountdown();
        }
      });
    }
  });
  
  console.log('✅ Casino shuffle 786 - Fully Loaded!');
  console.log('✅ Missions are now collectable!');
  console.log('✅ Login/Register redesigned!');
  console.log('✅ Daily rewards track time properly!');
}

// Make all functions global
window.showDownloadPopup = showDownloadPopup;
window.closeDownloadPopup = closeDownloadPopup;
window.copyDownloadLink = copyDownloadLink;
window.openAuthModal = openAuthModal;
window.closeAuth = closeAuth;
window.guestLogin = guestLogin;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.logout = logout;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.showEditUsername = showEditUsername;
window.updateUsername = updateUsername;
window.cancelEdit = cancelEdit;
window.changeAvatar = changeAvatar;
window.selectAvatar = selectAvatar;
window.closeAvatarPopup = closeAvatarPopup;
window.saveWithdrawalAccounts = saveWithdrawalAccounts;
window.openWithdraw = openWithdraw;
window.closeWithdrawPopup = closeWithdrawPopup;
window.processWithdraw = processWithdraw;
window.openShop = openShop;
window.closeShop = closeShop;
window.openPurchasePage = openPurchasePage;
window.closePurchasePage = closePurchasePage;
window.submitPurchaseRequest = submitPurchaseRequest;
window.openReferral = openReferral;
window.closeReferral = closeReferral;
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.filterReferrals = filterReferrals;
window.openOffers = openOffers;
window.closeOffers = closeOffers;
window.openMissions = openMissions;
window.closeMissions = closeMissions;
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
window.claimMissionReward = claimMissionReward;
window.openVIPPopup = openVIPPopup;
window.closeVIPPopup = closeVIPPopup;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleSound = toggleSound;
window.toggleNotifications = toggleNotifications;
window.showThemeSelector = showThemeSelector;
window.changeTheme = changeTheme;
window.enterGame = enterGame;
window.exitGame = exitGame;
window.setActiveNav = setActiveNav;
window.resetGame = resetGame;
window.closePopup = closePopup;
window.showHome = showHome;

document.addEventListener('DOMContentLoaded', initApp);