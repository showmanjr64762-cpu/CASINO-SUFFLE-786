// ===== ROYAL MATCH - COMPLETE MULTIPLAYER WITH FIREBASE LIVE ACTIVITY =====
console.log("🎮 Royal Match Live - Loading...");

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isInGame = false;
let notificationsEnabled = true;

// ===== GAME STATE =====
const gameState = {
  balance: 1000,
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
  goldenCardsFound: 0
};

// ===== DATA =====
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

  recordDeposit(amount) {
    const data = this.getMissionData();
    data.totalDeposits += amount;
    
    if (!data.firstDepositMade && amount >= 100) {
      data.firstDepositMade = true;
    }
    
    this.saveMissionData(data);
  },

  claimFirstDepositReward() {
    if (!currentUser || currentUser.isGuest) return { success: false, message: 'Login Required' };
    
    const data = this.getMissionData();
    
    if (!data.firstDepositMade) {
      return { success: false, message: 'No deposit made yet' };
    }
    
    if (data.firstDepositRewardClaimed) {
      return { success: false, message: 'Already claimed' };
    }

    const reward = this.getRandomReward(15, 30);
    data.firstDepositRewardClaimed = true;
    this.saveMissionData(data);

    return { success: true, reward };
  },

  claimSevenDayReward() {
    if (!currentUser || currentUser.isGuest) return { success: false, message: 'Login Required' };
    
    const data = this.getMissionData();
    
    if (data.consecutiveLoginDays < 7) {
      return { success: false, message: 'Need 7 consecutive days' };
    }
    
    if (data.sevenDayRewardClaimed) {
      return { success: false, message: 'Already claimed' };
    }

    const reward = this.getRandomReward(20, 40);
    data.sevenDayRewardClaimed = true;
    data.sevenDayRewardClaimedDate = this.getTodayString();
    data.consecutiveLoginDays = 0;
    this.saveMissionData(data);

    return { success: true, reward };
  },

  recordGamePlayed(won) {
    const data = this.getMissionData();
    data.gamesPlayed++;
    if (won) data.totalWins++;
    this.saveMissionData(data);
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
      }
    ];
  }
};

// ===== FIREBASE DATA SAVING FUNCTIONS =====
function saveGameResultToFirebase(won, winAmount) {
  if (!currentUser || currentUser.isGuest) {
    console.log("Guest mode - not saving to Firebase");
    return;
  }
  
  const userId = currentUser.id;
  const userRef = firebase.database().ref('users/' + userId);
  
  userRef.once('value')
    .then(snapshot => {
      const userData = snapshot.val() || {};
      
      const gamesPlayed = (userData.gamesPlayed || 0) + 1;
      const totalWins = (userData.totalWins || 0) + (won ? 1 : 0);
      const totalLosses = (userData.totalLosses || 0) + (won ? 0 : 1);
      const coins = gameState.balance;
      
      return userRef.update({
        gamesPlayed: gamesPlayed,
        totalWins: totalWins,
        totalLosses: totalLosses,
        coins: coins,
        lastGamePlayed: new Date().toISOString(),
        lastGameResult: won ? 'win' : 'loss',
        lastWinAmount: winAmount || 0
      });
    })
    .then(() => {
      console.log("✅ Game result saved to Firebase");
    })
    .catch(error => {
      console.error("❌ Error saving game result:", error);
    });
}

function saveCoinsToFirebase(newBalance) {
  if (!currentUser || currentUser.isGuest) return;
  
  const userId = currentUser.id;
  firebase.database().ref('users/' + userId).update({
    coins: newBalance,
    lastUpdated: new Date().toISOString()
  })
  .then(() => console.log("✅ Coins saved to Firebase"))
  .catch(error => console.error("❌ Error saving coins:", error));
}

function loadUserDataFromFirebase(userId) {
  firebase.database().ref('users/' + userId).once('value')
    .then(snapshot => {
      const userData = snapshot.val();
      if (userData) {
        console.log("✅ Loaded user data");
        
        if (userData.coins) {
          gameState.balance = userData.coins;
          updateUI();
        }
        
        if (currentUser) {
          currentUser.stats = {
            games: userData.gamesPlayed || 0,
            wins: userData.totalWins || 0,
            winRate: userData.gamesPlayed ? 
              Math.round((userData.totalWins / userData.gamesPlayed) * 100) : 0
          };
        }
      }
    })
    .catch(error => {
      console.error("❌ Error loading user data:", error);
    });
}

// ===== NEW: FIREBASE LIVE ACTIVITY FUNCTIONS =====

// Save live activity to Firebase
function saveLiveActivityToFirebase(activityType, data) {
  if (!currentUser || currentUser.isGuest) return;
  
  const activityRef = firebase.database().ref('live-activity').push();
  
  const activityData = {
    type: activityType,
    username: currentUser.username,
    userId: currentUser.id,
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    ...data
  };
  
  activityRef.set(activityData)
    .then(() => {
      console.log(`✅ Live activity saved: ${activityType}`);
      
      // Keep only last 50 activities
      firebase.database().ref('live-activity').limitToFirst(-51).once('value', snapshot => {
        const activities = snapshot.val();
        if (activities) {
          const keys = Object.keys(activities);
          if (keys.length > 50) {
            const keysToRemove = keys.slice(0, keys.length - 50);
            keysToRemove.forEach(key => {
              firebase.database().ref('live-activity/' + key).remove();
            });
          }
        }
      });
    })
    .catch(error => console.error("❌ Error saving live activity:", error));
}

// Save online player to Firebase
function updateOnlinePlayersInFirebase() {
  if (!currentUser || currentUser.isGuest) return;
  
  const onlineRef = firebase.database().ref('online-players/' + currentUser.id);
  
  onlineRef.set({
    username: currentUser.username,
    lastSeen: new Date().toISOString(),
    status: 'online'
  });
  
  // Remove after disconnect
  window.addEventListener('beforeunload', () => {
    onlineRef.remove();
  });
}

// Get live activities from Firebase
function loadLiveActivitiesFromFirebase() {
  firebase.database().ref('live-activity').limitToLast(20).once('value', snapshot => {
    const activities = snapshot.val();
    if (activities) {
      const activitiesList = Object.values(activities).reverse();
      updateLiveFeedFromFirebase(activitiesList);
    }
  });
  
  // Listen for new activities
  firebase.database().ref('live-activity').limitToLast(1).on('child_added', snapshot => {
    const activity = snapshot.val();
    addToLiveFeedFromFirebase(activity);
  });
}

// Update live feed from Firebase
function updateLiveFeedFromFirebase(activities) {
  const feed = document.getElementById('liveActivityFeed');
  const gameFeed = document.getElementById('gameActivityFeed');
  if (!feed && !gameFeed) return;
  
  let feedHtml = '';
  activities.forEach(activity => {
    let message = '';
    let typeClass = 'normal';
    
    switch(activity.type) {
      case 'game-start':
        message = `🎮 ${activity.username} started playing`;
        break;
      case 'game-win':
        message = `🏆 ${activity.username} won ${activity.amount} coins!`;
        typeClass = 'win';
        break;
      case 'game-loss':
        message = `💥 ${activity.username} lost ${activity.amount} coins`;
        typeClass = 'loss';
        break;
      case 'game-maxwin':
        message = `🔥 ${activity.username} hit MAX WIN ${activity.amount}!`;
        typeClass = 'win';
        break;
      case 'user-join':
        message = `👋 ${activity.username} joined the game`;
        break;
      case 'user-left':
        message = `👋 ${activity.username} left`;
        break;
      case 'purchase':
        message = `🛒 ${activity.username} bought ${activity.amount} coins`;
        break;
      case 'vip-unlock':
        message = `👑 ${activity.username} unlocked VIP!`;
        typeClass = 'win';
        break;
    }
    
    feedHtml += `<div class="activity-item ${typeClass}">
      <span>${message}</span>
      <span class="activity-time">${activity.time}</span>
    </div>`;
  });
  
  if (feed) feed.innerHTML = feedHtml;
  if (gameFeed) gameFeed.innerHTML = feedHtml.slice(0, 5);
}

// Add single activity to feed
function addToLiveFeedFromFirebase(activity) {
  const feed = document.getElementById('liveActivityFeed');
  const gameFeed = document.getElementById('gameActivityFeed');
  if (!feed && !gameFeed) return;
  
  let message = '';
  let typeClass = 'normal';
  
  switch(activity.type) {
    case 'game-start':
      message = `🎮 ${activity.username} started playing`;
      break;
    case 'game-win':
      message = `🏆 ${activity.username} won ${activity.amount} coins!`;
      typeClass = 'win';
      break;
    case 'game-loss':
      message = `💥 ${activity.username} lost ${activity.amount} coins`;
      typeClass = 'loss';
      break;
    case 'game-maxwin':
      message = `🔥 ${activity.username} hit MAX WIN ${activity.amount}!`;
      typeClass = 'win';
      break;
    case 'user-join':
      message = `👋 ${activity.username} joined the game`;
      break;
    case 'user-left':
      message = `👋 ${activity.username} left`;
      break;
    case 'purchase':
      message = `🛒 ${activity.username} bought ${activity.amount} coins`;
      break;
    case 'vip-unlock':
      message = `👑 ${activity.username} unlocked VIP!`;
      typeClass = 'win';
      break;
  }
  
  const item = document.createElement('div');
  item.className = `activity-item ${typeClass}`;
  item.innerHTML = `
    <span>${message}</span>
    <span class="activity-time">${activity.time}</span>
  `;
  
  if (feed) {
    feed.insertBefore(item, feed.firstChild);
    if (feed.children.length > 20) feed.removeChild(feed.lastChild);
  }
  
  if (gameFeed) {
    gameFeed.insertBefore(item.cloneNode(true), gameFeed.firstChild);
    if (gameFeed.children.length > 10) gameFeed.removeChild(gameFeed.lastChild);
  }
}

// Get online players from Firebase
function loadOnlinePlayersFromFirebase() {
  firebase.database().ref('online-players').on('value', snapshot => {
    const players = snapshot.val();
    const list = document.getElementById('livePlayersList');
    const onlineCount = document.getElementById('liveOnlineCount');
    const lobbyOnlineCount = document.getElementById('lobbyOnlineCount');
    const onlineCountDisplay = document.getElementById('onlineCount');
    const onlineCountGame = document.getElementById('onlineCountGame');
    
    if (players) {
      const playerList = Object.values(players);
      const count = playerList.length;
      
      if (onlineCount) onlineCount.textContent = count;
      if (lobbyOnlineCount) lobbyOnlineCount.textContent = count + ' online';
      if (onlineCountDisplay) onlineCountDisplay.textContent = count + ' online';
      if (onlineCountGame) onlineCountGame.innerHTML = `<span class="live-dot" style="width:6px;height:6px;"></span> ${count} online`;
      
      if (list) {
        list.innerHTML = playerList.slice(0, 10).map(p => `
          <div class="activity-item">
            <span class="live-dot" style="width: 8px; height: 8px; background: #00ff88;"></span>
            <span>${p.username}</span>
            <span class="activity-time">online</span>
          </div>
        `).join('');
      }
    } else {
      if (onlineCount) onlineCount.textContent = '0';
      if (lobbyOnlineCount) lobbyOnlineCount.textContent = '0 online';
      if (onlineCountDisplay) onlineCountDisplay.textContent = '0 online';
      if (onlineCountGame) onlineCountGame.innerHTML = `<span class="live-dot"></span> 0 online`;
      if (list) list.innerHTML = '<div class="activity-item">No players online</div>';
    }
  });
}

// ===== REAL-TIME MULTIPLAYER FEATURES =====

// Toggle notifications
function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  const toggle = document.getElementById('notificationToggle');
  if (toggle) toggle.classList.toggle('active');
}

// Show live notification
function showLiveNotification(message, icon = '🔔') {
  if (!notificationsEnabled) return;
  
  const notification = document.createElement('div');
  notification.className = 'real-time-notification';
  notification.innerHTML = `${icon} ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// ===== UI FUNCTIONS =====
function openAuthModal(tab) {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('active');
  switchAuthTab(tab);
  if (audio) audio.playClick();
}

function switchAuthTab(tab) {
  const authTitle = document.getElementById('authTitle');
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    if (authTitle) authTitle.textContent = 'Login';
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.classList.add('active');
  } else {
    if (authTitle) authTitle.textContent = 'Register';
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.classList.add('active');
  }
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
    stats: { games: 0, wins: 0, winRate: 0 }
  };
  
  closeAuth();
  updateHeaderForUser();
  gameState.balance = 1000;
  updateUI();
  if (audio) audio.playClick();
}

function updateHeaderForUser() {
  if (currentUser) {
    const headerUsername = document.getElementById('headerUsername');
    const headerAvatar = document.getElementById('headerAvatarIcon');
    const userStatus = document.getElementById('userStatus');
    
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (headerAvatar) headerAvatar.textContent = currentUser.avatar;
    if (userStatus) {
      if (!currentUser.isGuest) {
        userStatus.innerHTML = '<span class="live-dot" style="width:8px;height:8px;background:#00ff88;"></span> Live';
      } else {
        userStatus.innerHTML = '<span class="live-dot"></span> Guest';
      }
    }
  }
}

function openProfile() {
  if (!currentUser) {
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) authOverlay.classList.add('active');
    return;
  }
  
  const profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.add('active');
  
  const nameDisplay = document.getElementById('profileNameDisplay');
  const idDisplay = document.getElementById('profileIdDisplay');
  const avatarDisplay = document.getElementById('currentAvatarDisplay');
  const gamesDisplay = document.getElementById('profileGames');
  const winsDisplay = document.getElementById('profileWins');
  const winRateDisplay = document.getElementById('profileWinRate');
  const liveStatus = document.getElementById('liveStatusIndicator');
  
  if (nameDisplay) nameDisplay.textContent = currentUser.username;
  if (idDisplay) idDisplay.textContent = 'ID: ' + currentUser.id;
  if (avatarDisplay) avatarDisplay.textContent = currentUser.avatar;
  if (gamesDisplay) gamesDisplay.textContent = currentUser.stats?.games || 0;
  if (winsDisplay) winsDisplay.textContent = currentUser.stats?.wins || 0;
  
  const winRate = currentUser.stats?.games > 0 
    ? Math.round((currentUser.stats.wins / currentUser.stats.games) * 100) 
    : 0;
  if (winRateDisplay) winRateDisplay.textContent = winRate + '%';
  
  if (liveStatus) {
    if (!currentUser.isGuest) {
      liveStatus.innerHTML = '<span class="live-dot" style="background:#00ff88;"></span> <span>Live Mode</span>';
    } else {
      liveStatus.innerHTML = '<span class="live-dot"></span> <span>Guest Mode</span>';
    }
  }
  
  if (audio) audio.playClick();
}

function closeProfile() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.remove('active');
}

function logout() {
  if (currentUser && !currentUser.isGuest) {
    // Save to Firebase
    saveLiveActivityToFirebase('user-left', {});
    firebase.database().ref('online-players/' + currentUser.id).remove();
  }
  
  currentUser = null;
  closeProfile();
  
  const headerUsername = document.getElementById('headerUsername');
  const headerAvatar = document.getElementById('headerAvatarIcon');
  const userStatus = document.getElementById('userStatus');
  
  if (headerUsername) headerUsername.textContent = 'Guest';
  if (headerAvatar) headerAvatar.textContent = '👤';
  if (userStatus) userStatus.innerHTML = '<span class="live-dot"></span> Offline';
  
  gameState.balance = 1000;
  updateUI();
  
  const authOverlay = document.getElementById('authOverlay');
  if (authOverlay) authOverlay.classList.add('active');
}

// ===== POPUP FUNCTIONS =====
let popupTimeout;

function showPopup(title, text) {
  const popupTitle = document.querySelector('.popup-title');
  const popupText = document.querySelector('.popup-text');
  const popup = document.getElementById('successPopup');
  
  if (popupTitle) popupTitle.textContent = title;
  if (popupText) popupText.textContent = text;
  if (popup) popup.classList.add('active');
  
  clearTimeout(popupTimeout);
  popupTimeout = setTimeout(() => {
    closePopup();
  }, 5000);
}

function closePopup() {
  const popup = document.getElementById('successPopup');
  if (popup) popup.classList.remove('active');
  clearTimeout(popupTimeout);
}

function openVIPPopup() {
  const popup = document.getElementById('vipPopup');
  if (popup) popup.classList.add('active');
  if (audio) audio.playClick();
}

function closeVIPPopup() {
  const popup = document.getElementById('vipPopup');
  if (popup) popup.classList.remove('active');
  if (audio) audio.playClick();
}

function unlockVIP() {
  if (gameState.balance < 100000) {
    showPopup('Insufficient Balance', 'You need ₨100,000 to unlock VIP room!');
    return;
  }

  gameState.balance -= 100000;
  updateUI();
  closeVIPPopup();
  showPopup('VIP Unlocked!', '🎉 Welcome to the VIP room!');
  
  // Save to Firebase
  if (currentUser && !currentUser.isGuest) {
    saveLiveActivityToFirebase('vip-unlock', {});
  }
  
  if (audio) audio.playWin();
}

// ===== PARTICLES =====
const championAvatars = ['👑', '🥈', '🥉', '🎯', '💎', '🦁', '⭐', '🏆'];
let leaderboardInterval;

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

  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (this.muted || !this.audioContext) return;
    this.resumeContext();
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
    const notes = [523, 659, 784, 1047];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.15, 'sine', 0.25), i * 80);
    });
  }

  playWin() {
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.25, 'sine', 0.3), i * 100);
    });
  }

  playBomb() {
    this.playTone(150, 0.4, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.3), 80);
    setTimeout(() => this.playTone(80, 0.2, 'sawtooth', 0.2), 160);
  }

  playClick() {
    this.playTone(1000, 0.04, 'sine', 0.15);
  }

  playCashout() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.2, 'sine', 0.3), i * 60);
    });
  }

  playShuffle() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(200 + Math.random() * 400, 0.05, 'sine', 0.1);
      }, i * 50);
    }
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const audio = new AudioSystem();

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
  const toggle = document.getElementById('soundToggle');
  if (toggle) toggle.classList.toggle('active');
  const isMuted = audio.toggle();
  console.log('Sound:', isMuted ? 'OFF' : 'ON');
}

function showThemeSelector() {
  const selector = document.getElementById('themeSelector');
  if (selector) selector.classList.toggle('active');
  if (audio) audio.playClick();
}

function changeTheme(themeName) {
  document.body.className = 'theme-' + themeName;
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event && event.target) {
    const btn = event.target.closest('.theme-btn');
    if (btn) btn.classList.add('active');
  }
  if (audio) audio.playClick();
}

function setActiveNav(element) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  if (element) element.classList.add('active');
}

function closeAllSections() {
  document.querySelectorAll('.fullscreen-section').forEach(section => {
    section.classList.remove('active');
  });
}

// ===== SECTION FUNCTIONS =====
function openOffers() {
  const section = document.getElementById('offersSection');
  if (section) section.classList.add('active');
  if (audio) audio.playClick();
}

function closeOffers() {
  const section = document.getElementById('offersSection');
  if (section) section.classList.remove('active');
}

function openMissions() {
  renderMissions();
  const section = document.getElementById('missionsSection');
  if (section) section.classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
}

function closeMissions() {
  const section = document.getElementById('missionsSection');
  if (section) section.classList.remove('active');
  openOffers();
}

function renderMissions() {
  const container = document.getElementById('missionsContent');
  if (!container) return;
  
  const isGuest = currentUser && currentUser.isGuest;
  const missions = MissionSystem.getMissionsStatus();

  let html = '';

  if (isGuest) {
    html += `
      <div class="guest-warning">
        <p>⚠️ Missions are only available for registered users. 
        <a onclick="closeMissions(); openAuthModal('register');">Register now</a> to start earning rewards!</p>
      </div>
    `;
  }

  const easyMissions = missions.filter(m => !m.isHard);

  easyMissions.forEach(mission => {
    html += renderMissionCard(mission, isGuest);
  });

  container.innerHTML = html;
}

function renderMissionCard(mission, isGuest) {
  const statusText = mission.status === 'claimed' ? 'Claimed ✓' : 
                    (mission.status === 'locked' ? 'Locked' : 'Available');
  
  let btnHtml = '';
  if (isGuest) {
    btnHtml = `<button class="mission-btn guest" disabled>Login Required</button>`;
  } else if (mission.status === 'claimed') {
    btnHtml = `<button class="mission-btn completed">Already Claimed</button>`;
  } else if (mission.status === 'locked') {
    btnHtml = `<button class="mission-btn locked" disabled>Locked</button>`;
  } else {
    btnHtml = `<button class="mission-btn claim" onclick="claimMissionReward('${mission.id}')">Claim Reward</button>`;
  }

  return `
    <div class="mission-item">
      <div class="mission-header">
        <div class="mission-title">
          <span>${mission.icon}</span>
          <span>${mission.title}</span>
        </div>
        <span class="mission-status ${mission.status}">${statusText}</span>
      </div>
      <div class="mission-desc">${mission.description}</div>
      ${mission.progress ? `
        <div class="mission-progress">
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width: ${mission.status === 'claimed' ? '100' : '50'}%"></div>
          </div>
          <div class="mission-progress-text">${mission.progress}</div>
        </div>
      ` : ''}
      <div class="mission-reward">
        <span>🎁</span>
        <span>${mission.reward}</span>
      </div>
      ${btnHtml}
    </div>
  `;
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
    default:
      result = { success: false, message: 'Unknown mission' };
  }

  if (result.success) {
    gameState.balance += result.reward;
    updateUI();
    showPopup('Reward Claimed!', `You received ${result.reward} coins!`);
    if (audio) audio.playWin();
    renderMissions();
  } else {
    showPopup('Cannot Claim', result.message);
  }
}

function openLiveEvents() {
  const section = document.getElementById('liveEventsSection');
  if (section) section.classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
  
  // Update live event data
  updateEventLeaderboard();
  startEventTimers();
}

function closeLiveEvents() {
  const section = document.getElementById('liveEventsSection');
  if (section) section.classList.remove('active');
}

function updateEventLeaderboard() {
  const list = document.getElementById('eventLeaderboard');
  if (!list) return;
  
  // Get from Firebase or use mock
  firebase.database().ref('users').orderByChild('totalWins').limitToLast(5).once('value', snapshot => {
    const users = snapshot.val();
    if (users) {
      const leaders = Object.values(users).map(u => ({
        name: u.username,
        score: u.totalWins || 0
      })).reverse();
      
      list.innerHTML = leaders.map(l => `
        <div class="activity-item">
          <span>👤 ${l.name}</span>
          <span>${l.score} wins</span>
        </div>
      `).join('');
    }
  });
}

function startEventTimers() {
  // Championship countdown
  const timer = document.getElementById('championshipTimer');
  if (timer) {
    let timeLeft = 194400; // 2 days 5 hours in seconds
    setInterval(() => {
      if (timer) {
        const days = Math.floor(timeLeft / 86400);
        const hours = Math.floor((timeLeft % 86400) / 3600);
        timer.textContent = `${days}d ${hours}h`;
        timeLeft--;
      }
    }, 1000);
  }
  
  // Update prize pool randomly
  const prizePool = document.getElementById('prizePool');
  if (prizePool) {
    setInterval(() => {
      const increase = Math.floor(Math.random() * 1000);
      const current = parseInt(prizePool.textContent.replace(/,/g, '')) || 1000000;
      prizePool.textContent = (current + increase).toLocaleString();
    }, 30000);
  }
}

function openLivePlayers() {
  openOffers();
  document.getElementById('livePlayerBadge').style.display = 'none';
}

function refreshLeaderboard() {
  renderLeaderboard();
  showLiveNotification('Leaderboard updated', '🔄');
}

function openSupport() {
  const section = document.getElementById('supportSection');
  if (section) section.classList.add('active');
  closeOffers();
  if (audio) audio.playClick();
}

function closeSupport() {
  const section = document.getElementById('supportSection');
  if (section) section.classList.remove('active');
  openOffers();
}

function openSupportBot() {
  const supportBotUrl = 'https://bots.easy-peasy.ai/bot/74d4a40f-b3ee-4e22-9ae0-bbb8f2b9fdd5';
  window.open(supportBotUrl, '_blank');
  if (audio) audio.playClick();
}

// ===== SHOP FUNCTIONS =====
const shopItems = [
  { amount: 10, coins: 10, icon: '💰' },
  { amount: 20, coins: 20, icon: '💰' },
  { amount: 50, coins: 50, icon: '💰' },
  { amount: 100, coins: 100, icon: '💰' },
  { amount: 200, coins: 200, icon: '💰' },
  { amount: 500, coins: 500, icon: '💰' },
  { amount: 1000, coins: 1000, icon: '💰' },
  { amount: 2000, coins: 2000, icon: '💰' },
];

function renderShopGrid() {
  const shopGrid = document.getElementById('shopGrid');
  if (!shopGrid) return;
  
  shopGrid.innerHTML = shopItems.map((item) => `
    <div class="shop-card" onclick="purchaseCoins(${item.coins})">
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-amount">₨${item.amount}</div>
      <div class="shop-coins">${formatNumber(item.coins)} Coins</div>
      <button class="shop-btn">BUY NOW</button>
    </div>
  `).join('');
}

function openShop() {
  renderShopGrid();
  renderPaymentMethods();
  const section = document.getElementById('shopSection');
  if (section) section.classList.add('active');
  if (audio) audio.playClick();
}

function closeShop() {
  const section = document.getElementById('shopSection');
  if (section) section.classList.remove('active');
  if (audio) audio.playClick();
}

function openWithdraw() {
  alert('Withdraw feature coming soon! Minimum withdrawal: 10');
  if (audio) audio.playClick();
}

function renderPaymentMethods() {
  const grid = document.getElementById('paymentMethodsGrid');
  if (!grid) return;
  
  grid.innerHTML = pakistaniPaymentMethods.map(method => `
    <div class="payment-card" onclick="selectPaymentMethod('${method.name}')">
      <div class="payment-icon">${method.icon}</div>
      <div class="payment-name">${method.name}</div>
      <div class="payment-desc">${method.desc}</div>
    </div>
  `).join('');
}

function selectPaymentMethod(method) {
  showPopup('Payment Method Selected', `You selected ${method}. Proceeding to top-up...`);
  if (audio) audio.playClick();
}

function purchaseCoins(coins) {
  gameState.balance += coins;
  updateUI();
  
  MissionSystem.recordDeposit(coins);
  
  // Save to Firebase
  saveCoinsToFirebase(gameState.balance);
  if (currentUser && !currentUser.isGuest) {
    saveLiveActivityToFirebase('purchase', { amount: coins });
  }
  
  closeShop();
  showPopup('Purchase Successful!', `You received ${formatNumber(coins)} coins!`);
  if (audio) audio.playClick();
}

// ===== LEADERBOARD FUNCTIONS =====
function getRandomWinAmount() {
  return Math.floor(Math.random() * (99999 - 9990 + 1)) + 9990;
}

function formatWinAmount(amount) {
  if (amount >= 1000) {
    return Math.floor(amount / 1000) + 'k';
  }
  return amount.toString();
}

function formatNumber(num) {
  return num.toLocaleString();
}

function getRandomChampions() {
  const shuffled = [...pakistaniNames].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 7).map((name, index) => ({
    name: name,
    win: formatWinAmount(getRandomWinAmount()),
    rank: index + 1,
    avatar: championAvatars[index]
  }));
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  
  // Try to get from Firebase first
  firebase.database().ref('users').orderByChild('totalWins').limitToLast(7).once('value', snapshot => {
    const users = snapshot.val();
    if (users) {
      const leaders = Object.values(users).map(u => ({
        name: u.username,
        win: u.totalWins || 0,
        avatar: '👤'
      })).reverse();
      
      list.innerHTML = leaders.map((champion, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
          <div class="leaderboard-item">
            <div class="rank-number ${rankClass}">${index + 1}</div>
            <div class="leader-avatar">${champion.avatar}</div>
            <div class="leader-info">
              <div class="leader-name">${champion.name}</div>
              <div class="leader-win">${champion.win} wins</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // Fallback to random
      const champions = getRandomChampions();
      list.innerHTML = champions.map((champion, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
          <div class="leaderboard-item">
            <div class="rank-number ${rankClass}">${champion.rank}</div>
            <div class="leader-avatar">${champion.avatar}</div>
            <div class="leader-info">
              <div class="leader-name">${champion.name}</div>
              <div class="leader-win">${champion.win}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  });
}

function startLeaderboardRotation() {
  renderLeaderboard();
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  leaderboardInterval = setInterval(() => {
    renderLeaderboard();
  }, 10000);
}

// ===== GAME FUNCTIONS =====
function enterGame() {
  console.log("🎮 Entering live game...");
  
  const loader = document.getElementById('gameEntryLoader');
  const gameView = document.getElementById('gameView');
  
  if (!loader || !gameView) return;
  
  loader.classList.add('active');
  if (audio) audio.playClick();
  
  gameState.isPlaying = false;
  gameState.canFlip = false;
  gameState.currentBet = 0;
  
  setTimeout(() => {
    loader.classList.remove('active');
    gameView.classList.add('active');
    isInGame = true;
    
    const betPanel = document.getElementById('betPanel');
    const startBtn = document.getElementById('startBtn');
    if (betPanel) betPanel.classList.remove('hidden');
    if (startBtn) startBtn.classList.remove('hidden');
    
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = currentUser ? 'Select your bet and tap START' : 'Login to play live!';
    
    // Save to Firebase
    if (currentUser && !currentUser.isGuest) {
      saveLiveActivityToFirebase('game-start', {});
    }
  }, 3000);
}

function exitGame() {
  const gameView = document.getElementById('gameView');
  if (gameView) gameView.classList.remove('active');
  isInGame = false;
  if (audio) audio.playClick();
}

function initApp() {
  console.log("🚀 Initializing app...");
  
  createParticles();
  startLeaderboardRotation();
  MissionSystem.checkLoginStreak();
  
  // Load live data from Firebase
  if (typeof firebase !== 'undefined') {
    loadOnlinePlayersFromFirebase();
    loadLiveActivitiesFromFirebase();
  }
  
  console.log("✅ App initialized");
}

// ===== GAME CONFIG =====
const CONFIG = {
  TOTAL_CARDS: 28,
  PAIRS_COUNT: 11,
  BOMB_COUNT: 4,
  GOLDEN_COUNT: 2,
  GOLDEN_MULTIPLIER: 20,
  GRID_COLUMNS: 7,
  MULTIPLIERS: [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0, 15.0, 22.0, 35.0, 50.0],
  INITIAL_BALANCE: 1000,
  MIN_BET: 10,
  MAX_BET: 5000,
  MISMATCH_FLIP_DELAY: 400,
  SHUFFLE_ROUNDS: 10
};

const CARD_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
const CARD_SUITS = [
  { symbol: '♥', color: 'red' },
  { symbol: '♠', color: 'black' },
  { symbol: '♦', color: 'red' },
  { symbol: '♣', color: 'black' }
];

// DOM Elements
const elements = {
  balanceDisplay: document.getElementById('balanceDisplay'),
  lobbyBalance: document.getElementById('lobbyBalance'),
  currentWin: document.getElementById('currentWin'),
  multiplier: document.getElementById('multiplier'),
  pairsDisplay: document.getElementById('pairsDisplay'),
  betPanel: document.getElementById('betPanel'),
  betOptions: document.getElementById('betOptions'),
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

// ===== GAME FUNCTIONS =====
function shuffleArray(array) {
  const shuffled = [...array];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
}

function setMessage(text, type = 'normal') {
  if (elements.messageText) {
    elements.messageText.textContent = text;
    elements.messageText.className = 'message-text';
    if (type === 'win') elements.messageText.classList.add('win');
    if (type === 'lose') elements.messageText.classList.add('lose');
  }
}

function generateMultiplierDisplay() {
  const container = elements.multiplierDisplay;
  if (!container) return;
  
  container.innerHTML = '';
  CONFIG.MULTIPLIERS.forEach((mult, index) => {
    const item = document.createElement('span');
    item.className = 'multiplier-item';
    if (index === CONFIG.MULTIPLIERS.length - 1) {
      item.classList.add('final');
      item.textContent = `ALL:${mult}x`;
    } else {
      item.textContent = `${index + 1}:${mult}x`;
    }
    container.appendChild(item);
  });
}

function generateCards() {
  const cards = [];
  for (let i = 0; i < CONFIG.PAIRS_COUNT; i++) {
    const value = CARD_VALUES[i % CARD_VALUES.length];
    const suit = CARD_SUITS[i % CARD_SUITS.length];
    const card = { value, suit, isBomb: false, isGolden: false };
    cards.push({ ...card, id: `card-${i}-a` });
    cards.push({ ...card, id: `card-${i}-b` });
  }
  for (let i = 0; i < CONFIG.BOMB_COUNT; i++) {
    cards.push({
      id: `bomb-${i}`,
      value: 'BOMB',
      suit: null,
      isBomb: true,
      isGolden: false
    });
  }
  for (let i = 0; i < CONFIG.GOLDEN_COUNT; i++) {
    cards.push({
      id: `golden-${i}`,
      value: 'GOLD',
      suit: null,
      isBomb: false,
      isGolden: true
    });
  }
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
      </div>`;

  if (card.isBomb) {
    cardEl.innerHTML = backHTML + `
      <div class="card-face card-front bomb">
        <div class="bomb-content">
          <span class="bomb-icon">💣</span>
          <span class="bomb-text">BOOM!</span>
        </div>
      </div>`;
  } else if (card.isGolden) {
    cardEl.innerHTML = backHTML + `
      <div class="card-face card-front golden">
        <div class="golden-content">
          <span class="golden-icon">👑</span>
          <span class="golden-text">20X WIN!</span>
        </div>
      </div>`;
  } else {
    const colorClass = card.suit.color;
    cardEl.innerHTML = backHTML + `
      <div class="card-face card-front ${colorClass}">
        <div class="card-corner card-corner-tl">
          <span class="card-rank">${card.value}</span>
          <span class="card-suit-small">${card.suit.symbol}</span>
        </div>
        <span class="card-center">${card.suit.symbol}</span>
        <div class="card-corner card-corner-br">
          <span class="card-rank">${card.value}</span>
          <span class="card-suit-small">${card.suit.symbol}</span>
        </div>
      </div>`;
  }

  cardEl.addEventListener('click', () => handleCardClick(cardEl));
  return cardEl;
}

async function animateShuffle() {
  if (!elements.cardGrid) return;
  
  const cards = elements.cardGrid.querySelectorAll('.card');
  for (let round = 0; round < CONFIG.SHUFFLE_ROUNDS; round++) {
    elements.cardGrid.classList.add('shuffling');
    if (audio) audio.playShuffle();
    await new Promise((resolve) => setTimeout(resolve, 120));
    cards.forEach((card) => {
      card.style.order = Math.floor(Math.random() * cards.length);
    });
  }
  elements.cardGrid.classList.remove('shuffling');
  cards.forEach((card, index) => {
    card.style.order = index;
  });
}

function selectBet(amount) {
  if (gameState.isPlaying) return;
  if (amount < CONFIG.MIN_BET || amount > CONFIG.MAX_BET) {
    setMessage(`Bet must be between ${CONFIG.MIN_BET} and ${formatNumber(CONFIG.MAX_BET)}`);
    return;
  }
  if (amount > gameState.balance) {
    setMessage('Insufficient balance!');
    return;
  }
  gameState.currentBet = amount;
  if (audio) audio.playClick();
  updateBetSelection();
  setMessage(`Bet: ${formatNumber(amount)}. Tap START to begin!`);
}

function updateBetSelection() {
  if (!elements.betOptions) return;
  
  const betButtons = elements.betOptions.querySelectorAll('.bet-option');
  betButtons.forEach((btn) => {
    const betValue = parseInt(btn.dataset.bet, 10);
    btn.classList.toggle('selected', betValue === gameState.currentBet);
    btn.disabled = gameState.isPlaying;
  });
}

async function startGame() {
  if (!currentUser) {
    setMessage('Please login first!');
    openAuthModal('login');
    return;
  }
  
  if (gameState.currentBet <= 0) {
    setMessage('Select a bet first!');
    return;
  }
  
  gameState.balance -= gameState.currentBet;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.goldenCardsFound = 0;
  gameState.isPlaying = true;
  gameState.canFlip = false;
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.matchedCards.clear();

  gameState.cards = generateCards();
  renderCards();

  updateUI();
  if (elements.betPanel) elements.betPanel.classList.add('hidden');
  if (elements.startBtn) elements.startBtn.classList.add('hidden');
  if (elements.progressSection) elements.progressSection.classList.remove('hidden');
  generateMultiplierDisplay();
  updateProgress();

  setMessage('Shuffling cards...');
  await animateShuffle();

  gameState.canFlip = true;
  setMessage('Find matching pairs! Avoid the bombs!');
  if (audio) audio.playClick();
}

function renderCards() {
  if (!elements.cardGrid) return;
  
  elements.cardGrid.innerHTML = '';
  gameState.cards.forEach((card, index) => {
    const cardEl = createCardElement(card, index);
    elements.cardGrid.appendChild(cardEl);
  });
}

function handleCardClick(cardEl) {
  if (!gameState.canFlip) return;
  if (cardEl.classList.contains('flipped')) return;
  if (cardEl.classList.contains('matched')) return;

  const isBomb = cardEl.dataset.isBomb === 'true';
  const isGolden = cardEl.dataset.isGolden === 'true';

  cardEl.classList.add('flipped');
  if (audio) audio.playCardFlip();

  if (isBomb) {
    setTimeout(() => handleBomb(), 400);
    return;
  }

  if (isGolden) {
    if (!gameState.firstCard) {
      gameState.firstCard = cardEl;
    } else {
      gameState.secondCard = cardEl;
      gameState.canFlip = false;
      setTimeout(() => checkGoldenMatch(), 500);
    }
    return;
  }

  if (!gameState.firstCard) {
    gameState.firstCard = cardEl;
  } else {
    gameState.secondCard = cardEl;
    gameState.canFlip = false;
    setTimeout(() => checkMatch(), 500);
  }
}

function checkGoldenMatch() {
  if (!gameState.firstCard || !gameState.secondCard) return;
  
  const firstIsGolden = gameState.firstCard.dataset.isGolden === 'true';
  const secondIsGolden = gameState.secondCard.dataset.isGolden === 'true';

  if (firstIsGolden && secondIsGolden) {
    gameState.firstCard.classList.add('matched');
    gameState.secondCard.classList.add('matched');
    gameState.matchedCards.add(gameState.firstCard.dataset.id);
    gameState.matchedCards.add(gameState.secondCard.dataset.id);
    gameState.goldenCardsFound++;

    gameState.currentWin = gameState.currentBet * CONFIG.GOLDEN_MULTIPLIER;
    gameState.multiplier = CONFIG.GOLDEN_MULTIPLIER;

    if (audio) audio.playWin();
    updateUI();

    setTimeout(() => {
      gameState.firstCard = null;
      gameState.secondCard = null;
      gameState.canFlip = true;
      setMessage(`Golden Match! Win: ${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`, 'win');
      showCashoutOption();
    }, 400);
  } else {
    setTimeout(() => {
      if (gameState.firstCard) gameState.firstCard.classList.remove('flipped');
      if (gameState.secondCard) gameState.secondCard.classList.remove('flipped');
      gameState.firstCard = null;
      gameState.secondCard = null;
      gameState.canFlip = true;
      setMessage('No match! Try again.');
    }, CONFIG.MISMATCH_FLIP_DELAY);
  }
}

function checkMatch() {
  if (!gameState.firstCard || !gameState.secondCard) return;
  
  const firstValue = gameState.firstCard.dataset.value;
  const secondValue = gameState.secondCard.dataset.value;
  const firstId = gameState.firstCard.dataset.id;
  const secondId = gameState.secondCard.dataset.id;

  if (firstValue === secondValue && firstId !== secondId) {
    gameState.firstCard.classList.add('matched');
    gameState.secondCard.classList.add('matched');
    gameState.matchedCards.add(firstId);
    gameState.matchedCards.add(secondId);

    gameState.pairsMatched++;
    const multiplierIndex = Math.min(gameState.pairsMatched - 1, CONFIG.MULTIPLIERS.length - 1);
    gameState.multiplier = CONFIG.MULTIPLIERS[multiplierIndex];
    gameState.currentWin = Math.floor(gameState.currentBet * gameState.multiplier);

    if (audio) audio.playMatch();
    updateUI();
    updateProgress();

    if (gameState.pairsMatched >= CONFIG.PAIRS_COUNT) {
      gameState.currentWin = Math.floor(gameState.currentBet * CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]);
      setTimeout(() => handleMaxWin(), 400);
    } else {
      setMessage(`Match! Win: ${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`, 'win');
      showCashoutOption();
    }

    gameState.firstCard = null;
    gameState.secondCard = null;
    gameState.canFlip = true;
  } else {
    setTimeout(() => {
      if (gameState.firstCard) gameState.firstCard.classList.remove('flipped');
      if (gameState.secondCard) gameState.secondCard.classList.remove('flipped');
      gameState.firstCard = null;
      gameState.secondCard = null;
      gameState.canFlip = true;
      setMessage('No match! Try again.');
    }, CONFIG.MISMATCH_FLIP_DELAY);
  }
}

function showCashoutOption() {
  if (elements.cashoutBtn) elements.cashoutBtn.classList.remove('hidden');
  if (elements.continueBtn) elements.continueBtn.classList.remove('hidden');
  gameState.canFlip = false;
}

function cashout() {
  if (gameState.currentWin <= 0) return;
  gameState.balance += gameState.currentWin;
  
  MissionSystem.recordGamePlayed(true);
  
  // Save to Firebase
  saveGameResultToFirebase(true, gameState.currentWin);
  
  // Save live activity to Firebase
  if (currentUser && !currentUser.isGuest) {
    saveLiveActivityToFirebase('game-win', { amount: gameState.currentWin, multiplier: gameState.multiplier });
  }
  
  // Notify live server
  if (window.socket && currentUser && !currentUser.isGuest) {
    window.socket.emit('game-won', {
      userId: currentUser.id,
      username: currentUser.username,
      amount: gameState.currentWin,
      multiplier: gameState.multiplier
    });
  }
  
  if (gameState.currentWin > 1000) {
    showLiveNotification(`🏆 ${currentUser?.username} won BIG!`);
  }
  
  if (audio) audio.playCashout();
  if (elements.winAmountDisplay) elements.winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  if (elements.winMultiplierDisplay) elements.winMultiplierDisplay.textContent = `${gameState.multiplier}x`;
  if (elements.winOverlay) elements.winOverlay.classList.add('active');
  endRound();
}

function continuePlaying() {
  if (elements.cashoutBtn) elements.cashoutBtn.classList.add('hidden');
  if (elements.continueBtn) elements.continueBtn.classList.add('hidden');
  gameState.canFlip = true;
  setMessage('Continue! Risk it for bigger wins!');
  if (audio) audio.playClick();
}

function handleBomb() {
  MissionSystem.recordGamePlayed(false);
  
  // Save to Firebase
  saveGameResultToFirebase(false, 0);
  
  // Save live activity to Firebase
  if (currentUser && !currentUser.isGuest) {
    saveLiveActivityToFirebase('game-loss', { amount: gameState.currentBet });
  }
  
  if (window.socket && currentUser && !currentUser.isGuest) {
    window.socket.emit('game-lost', {
      userId: currentUser.id,
      username: currentUser.username,
      amount: gameState.currentBet
    });
  }
  
  if (audio) audio.playBomb();
  if (elements.loseSubtext) elements.loseSubtext.textContent = `You lost ${formatNumber(gameState.currentBet)}`;
  if (elements.loseOverlay) elements.loseOverlay.classList.add('active');

  const flippedCards = document.querySelectorAll('.card.flipped');
  flippedCards.forEach((card) => {
    if (card.dataset.isBomb === 'true') {
      card.classList.add('bomb-revealed');
    }
  });
  endRound();
}

function handleMaxWin() {
  gameState.balance += gameState.currentWin;
  
  MissionSystem.recordGamePlayed(true);
  
  // Save to Firebase
  saveGameResultToFirebase(true, gameState.currentWin);
  
  // Save live activity to Firebase
  if (currentUser && !currentUser.isGuest) {
    saveLiveActivityToFirebase('game-maxwin', { amount: gameState.currentWin, multiplier: CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1] });
  }
  
  if (window.socket && currentUser && !currentUser.isGuest) {
    window.socket.emit('game-maxwin', {
      userId: currentUser.id,
      username: currentUser.username,
      amount: gameState.currentWin,
      multiplier: CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]
    });
  }
  
  showLiveNotification(`🔥 ${currentUser?.username} won BIG!`, '🏆');
  
  if (audio) audio.playWin();
  if (elements.winAmountDisplay) elements.winAmountDisplay.textContent = formatNumber(gameState.currentWin);
  if (elements.winMultiplierDisplay) elements.winMultiplierDisplay.textContent = `${CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1]}x - MAX WIN!`;
  if (elements.winOverlay) elements.winOverlay.classList.add('active');
  endRound();
}

function endRound() {
  gameState.isPlaying = false;
  gameState.canFlip = false;
  if (elements.cashoutBtn) elements.cashoutBtn.classList.add('hidden');
  if (elements.continueBtn) elements.continueBtn.classList.add('hidden');
  updateUI();
}

function resetGame() {
  if (elements.winOverlay) elements.winOverlay.classList.remove('active');
  if (elements.loseOverlay) elements.loseOverlay.classList.remove('active');
  if (elements.betPanel) elements.betPanel.classList.remove('hidden');
  if (elements.startBtn) elements.startBtn.classList.remove('hidden');
  if (elements.progressSection) elements.progressSection.classList.add('hidden');
  if (elements.cardGrid) elements.cardGrid.innerHTML = '';

  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;
  gameState.goldenCardsFound = 0;

  updateUI();
  updateBetSelection();
  setMessage('Select your bet and tap START');
  if (audio) audio.playClick();
}

function updateUI() {
  if (elements.balanceDisplay) elements.balanceDisplay.textContent = formatNumber(gameState.balance);
  if (elements.lobbyBalance) elements.lobbyBalance.textContent = formatNumber(gameState.balance);
  if (elements.currentWin) elements.currentWin.textContent = formatNumber(gameState.currentWin);
  if (elements.multiplier) elements.multiplier.textContent = `${gameState.multiplier.toFixed(2)}x`;
  if (elements.pairsDisplay) elements.pairsDisplay.textContent = `${gameState.pairsMatched}/${CONFIG.PAIRS_COUNT}`;
}

function updateProgress() {
  if (elements.pairsMatched) elements.pairsMatched.textContent = `${gameState.pairsMatched} / ${CONFIG.PAIRS_COUNT}`;
  const progressPercent = (gameState.pairsMatched / CONFIG.PAIRS_COUNT) * 100;
  if (elements.progressFill) elements.progressFill.style.width = `${progressPercent}%`;

  if (!elements.multiplierDisplay) return;
  
  const multiplierItems = elements.multiplierDisplay.querySelectorAll('.multiplier-item');
  multiplierItems.forEach((item, index) => {
    item.classList.remove('active', 'passed');
    if (index < gameState.pairsMatched) {
      item.classList.add('passed');
    } else if (index === gameState.pairsMatched) {
      item.classList.add('active');
    }
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  if (elements.betOptions) {
    elements.betOptions.querySelectorAll('.bet-option').forEach((btn) => {
      btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet, 10)));
    });
  }

  if (elements.customBetBtn) {
    elements.customBetBtn.addEventListener('click', () => {
      const value = parseInt(elements.customBet.value, 10);
      if (!Number.isNaN(value)) selectBet(value);
    });
  }

  if (elements.customBet) {
    elements.customBet.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const value = parseInt(elements.customBet.value, 10);
        if (!Number.isNaN(value)) selectBet(value);
      }
    });
  }

  if (elements.startBtn) elements.startBtn.addEventListener('click', startGame);
  if (elements.cashoutBtn) elements.cashoutBtn.addEventListener('click', cashout);
  if (elements.continueBtn) elements.continueBtn.addEventListener('click', continuePlaying);
  if (elements.playAgainWin) elements.playAgainWin.addEventListener('click', resetGame);
  if (elements.playAgainLose) elements.playAgainLose.addEventListener('click', resetGame);
}

// ===== AUTH FUNCTIONS =====
function handleLoginSubmit(form) {
  const username = form.username.value.trim();
  const password = form.password.value.trim();
  const errorContainer = document.getElementById('loginErrors');
  const successContainer = document.getElementById('loginSuccess');

  if (errorContainer) errorContainer.classList.remove('active');
  if (successContainer) successContainer.classList.remove('active');
  if (errorContainer) errorContainer.innerHTML = '';
  if (successContainer) successContainer.innerHTML = '';

  const errors = [];
  if (!username) errors.push('Username is required');
  if (!password) errors.push('Password is required');

  if (errors.length) {
    if (errorContainer) {
      errorContainer.innerHTML = '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';
      errorContainer.classList.add('active');
    }
    return;
  }

  // Demo login
  currentUser = {
    username: username,
    avatar: '👤',
    isGuest: false,
    id: 'USER' + Math.floor(Math.random() * 99999),
    stats: { games: 0, wins: 0, winRate: 0 }
  };

  updateHeaderForUser();
  
  // Save to Firebase
  if (typeof firebase !== 'undefined') {
    updateOnlinePlayersInFirebase();
    saveLiveActivityToFirebase('user-join', {});
  }
  
  // Tell server user is online
  if (window.socket) {
    window.socket.emit('user-online', {
      userId: currentUser.id,
      username: currentUser.username
    });
  }
  
  if (successContainer) {
    successContainer.textContent = 'Login successful!';
    successContainer.classList.add('active');
  }
  
  showLiveNotification(`Welcome ${username}!`, '👋');

  setTimeout(() => {
    closeAuth();
  }, 800);
}

function handleRegisterSubmit(form) {
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password1 = form.password_1.value.trim();
  const password2 = form.password_2.value.trim();
  const errorContainer = document.getElementById('registerErrors');
  const successContainer = document.getElementById('registerSuccess');

  if (errorContainer) errorContainer.classList.remove('active');
  if (successContainer) successContainer.classList.remove('active');
  if (errorContainer) errorContainer.innerHTML = '';
  if (successContainer) successContainer.innerHTML = '';

  const errors = [];
  if (!username) errors.push('Username is required');
  if (!email) errors.push('Email is required');
  if (!password1) errors.push('Password is required');
  if (password1 && password1.length < 6) errors.push('Password must be at least 6 characters');
  if (password1 !== password2) errors.push('Passwords do not match');

  if (errors.length) {
    if (errorContainer) {
      errorContainer.innerHTML = '<ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';
      errorContainer.classList.add('active');
    }
    return;
  }

  // Show loading
  if (successContainer) {
    successContainer.textContent = 'Creating account...';
    successContainer.classList.add('active');
  }

  // Create user in Firebase Auth
  firebase.auth().createUserWithEmailAndPassword(email, password1)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("✅ User created in Auth:", user.uid);
      
      // Save user data to Realtime Database
      return firebase.database().ref('users/' + user.uid).set({
        username: username,
        email: email,
        coins: 1000,
        gamesPlayed: 0,
        totalWins: 0,
        totalLosses: 0,
        createdAt: new Date().toISOString()
      });
    })
    .then(() => {
      console.log("✅ User data saved to Realtime Database");
      
      currentUser = {
        username: username,
        avatar: '👤',
        isGuest: false,
        id: firebase.auth().currentUser.uid,
        stats: { games: 0, wins: 0, winRate: 0 }
      };

      // Save to Firebase
      updateOnlinePlayersInFirebase();
      saveLiveActivityToFirebase('user-join', {});

      // Tell server user is online
      if (window.socket) {
        window.socket.emit('user-online', {
          userId: currentUser.id,
          username: currentUser.username
        });
      }

      loadUserDataFromFirebase(currentUser.id);
      updateHeaderForUser();
      
      if (successContainer) {
        successContainer.textContent = 'Registration successful!';
      }
      
      showLiveNotification(`Welcome ${username}!`, '👋');
      
      setTimeout(() => {
        switchAuthTab('login');
        closeAuth();
      }, 1500);
    })
    .catch((error) => {
      console.error("❌ Firebase error:", error);
      if (errorContainer) {
        errorContainer.innerHTML = '<ul><li>' + error.message + '</li></ul>';
        errorContainer.classList.add('active');
      }
      if (successContainer) successContainer.classList.remove('active');
    });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 DOM loaded - starting live game");
  
  gameState.balance = CONFIG.INITIAL_BALANCE;
  
  setupEventListeners();
  updateUI();
  generateMultiplierDisplay();
  initApp();
  
  // Make functions globally available
  window.showLiveNotification = showLiveNotification;
  window.toggleNotifications = toggleNotifications;
  window.openLiveEvents = openLiveEvents;
  window.closeLiveEvents = closeLiveEvents;
  window.openLivePlayers = openLivePlayers;
  window.refreshLeaderboard = refreshLeaderboard;
  window.closeAllSections = closeAllSections;
  window.showPopup = showPopup;
  window.closePopup = closePopup;
  window.openVIPPopup = openVIPPopup;
  window.closeVIPPopup = closeVIPPopup;
  window.unlockVIP = unlockVIP;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.toggleSound = toggleSound;
  window.showThemeSelector = showThemeSelector;
  window.changeTheme = changeTheme;
  window.setActiveNav = setActiveNav;
  window.openOffers = openOffers;
  window.closeOffers = closeOffers;
  window.openMissions = openMissions;
  window.closeMissions = closeMissions;
  window.claimMissionReward = claimMissionReward;
  window.openSupport = openSupport;
  window.closeSupport = closeSupport;
  window.openSupportBot = openSupportBot;
  window.openShop = openShop;
  window.closeShop = closeShop;
  window.openWithdraw = openWithdraw;
  window.selectPaymentMethod = selectPaymentMethod;
  window.purchaseCoins = purchaseCoins;
  window.enterGame = enterGame;
  window.exitGame = exitGame;
  window.guestLogin = guestLogin;
  window.openProfile = openProfile;
  window.closeProfile = closeProfile;
  window.logout = logout;
  window.openAuthModal = openAuthModal;
  window.switchAuthTab = switchAuthTab;
  window.closeAuth = closeAuth;
  window.handleLoginSubmit = handleLoginSubmit;
  window.handleRegisterSubmit = handleRegisterSubmit;
  
  console.log("✅ Royal Match Live ready!");
});