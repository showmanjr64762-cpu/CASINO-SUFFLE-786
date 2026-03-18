// ========== FIX FOR FIREBASE ERRORS ==========
// Create safe Firebase references
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDatabase = null;

try {
  if (typeof firebase !== 'undefined') {
    console.log("✅ Firebase SDK loaded");
    
    // Check if Firebase is initialized
    if (firebase.apps && firebase.apps.length > 0) {
      firebaseApp = firebase.app();
      firebaseAuth = firebase.auth();
      firebaseDatabase = firebase.database();
      console.log("✅ Firebase services initialized");
    } else {
      console.log("⚠️ Firebase not initialized yet");
    }
  } else {
    console.log("⚠️ Firebase SDK not loaded - using offline mode");
  }
} catch (e) {
  console.log("⚠️ Firebase error:", e.message);
}

// Make Firebase services globally available
window.firebaseApp = firebaseApp;
window.firebaseAuth = firebaseAuth;
window.firebaseDatabase = firebaseDatabase;

// ========== ORIGINAL CODE STARTS HERE ==========

const pakistaniNames = [
  'Ahmed Hassan', 'Ali Khan', 'Bilal Ahmed', 'Hassan Ali', 'Muhammad Imran',
  'Faisal Khan', 'Karim Abdul', 'Malik Saeed', 'Nasir Ahmed', 'Omar Khan',
  'Rashid Ali', 'Samir Khan', 'Tariq Hassan', 'Usman Ahmed', 'Wasim Khan',
  'Yousaf Ali', 'Zain Ahmed', 'Adnan Khan', 'Babar Ahmed', 'Chand Hassan',
  'Danyal Khan', 'Eman Ahmed', 'Farhan Ali', 'Ghani Khan', 'Hamid Ahmed',
  'Imran Khan', 'Junaid Hassan', 'Karim Ahmed', 'Laraib Ali', 'Mazhar Khan',
  'Ahmed Khan', 'Ali Raza', 'Usman Ali', 'Bilal Ahmed',
  'Hassan Raza', 'Zain Ali', 'Ahsan Khan', 'Saad Ahmed',
];

const avatarEmojis = ['👤', '👴', '🤷‍♀️', '👨', '🦅', '🕵️‍♀️', '🏎', '💎', '🤦‍♂️'];

const pakistaniPaymentMethods = [
  { name: 'JazzCash', icon: '📱', desc: 'Instant top-up via JazzCash' },
  { name: 'Easypaisa', icon: '💳', desc: 'Quick deposit with Easypaisa' },
  { name: 'UBL Omni', icon: '🏦', desc: 'Bank transfer via UBL Omni' },
  { name: 'Bank Transfer', icon: '🏪', desc: 'Direct bank transfer' }
];

let currentUser = null;
let isInGame = false;

// Mission System
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
      gamesPlayed: 0,
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
    
    if (data.lastLoginDate === today) {
      return;
    }

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
    
    if (data.consecutiveLoginDays >= 7 && !data.sevenDayRewardClaimed) {
    } else if (data.consecutiveLoginDays === 1) {
      data.sevenDayRewardClaimed = false;
    }

    this.saveMissionData(data);
  },

  getRandomReward(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  claimLoginReward() {
    if (!currentUser || currentUser.isGuest) return { success: false, message: 'Login Required: Register or login to claim rewards' };
    
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

  // ... rest of your MissionSystem code continues here
  // (I'm truncating for brevity, keep your existing code)
};

// ========== REST OF YOUR ORIGINAL CODE CONTINUES ==========
// Keep ALL your existing code below this line
// Your functions: openAuthModal, switchAuthTab, closeAuth, guestLogin, etc.
// Your game code, audio system, etc.