// ===== ROYAL MATCH - COMPLETE WORKING GAME =====
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

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let isInGame = false;
let autoRefreshInterval = null;
let currentWithdrawalId = null;
let notifications = [];
let savedAccounts = { jazzcash: "", easypaisa: "", bank: "" };

// ===== REFERRAL SYSTEM CONSTANTS =====
const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 50,
  MIN_DEPOSIT_FOR_COMMISSION: 3000,
  COMMISSION_RATE: 0.10, // 10% commission
  DEPOSIT_BONUS_RATE: 0.025, // 2.5% bonus on every deposit
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
  lastGameResult: null
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

// ===== GAME CONFIGURATION =====
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
  } catch (error) {
    console.error("Error updating user data:", error);
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

// ===== DEPOSIT WITH 2.5% BONUS =====
function purchaseCoins(amount, coins) {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to purchase coins');
    openAuthModal('login');
    return;
  }

  // Calculate 2.5% bonus
  const bonusRate = REFERRAL_CONFIG.DEPOSIT_BONUS_RATE;
  const bonusCoins = Math.floor(coins * bonusRate);
  const totalCoins = coins + bonusCoins;

  gameState.balance += totalCoins;
  updateUI();

  // Save transaction with bonus info
  const transactionRef = database.ref('transactions').push();
  transactionRef.set({
    userId: currentUser.id,
    username: currentUser.username,
    amount: amount,
    coins: coins,
    bonusCoins: bonusCoins,
    totalCoins: totalCoins,
    bonusRate: `${bonusRate * 100}%`,
    type: 'purchase',
    timestamp: new Date().toISOString()
  });

  updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });

  // Show bonus message
  showPopup('Purchase Successful!', `+${formatNumber(totalCoins)} coins (Including ${bonusRate*100}% bonus: +${formatNumber(bonusCoins)})`);
  
  // Check for referral commission if deposit meets minimum
  if (totalCoins >= REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION && currentUser.referredBy) {
    processDepositForReferral(currentUser.id, totalCoins);
  }
  
  if (audio) audio.playClick();
}

// ===== DEPOSIT COMMISSION FOR REFERRALS =====
async function processDepositForReferral(userId, depositAmount) {
  try {
    const userSnap = await database.ref('users/' + userId).once('value');
    const userData = userSnap.val();
    
    if (!userData.referredBy) return null;
    
    const referralsRef = database.ref('referrals');
    const referralsSnap = await referralsRef.orderByChild('referredUserId').equalTo(userId).once('value');
    
    let referralRecord = null;
    let referralId = null;
    
    for (const [id, ref] of Object.entries(referralsSnap.val() || {})) {
      if (ref.referredUserId === userId && ref.status === 'pending') {
        referralRecord = ref;
        referralId = id;
        break;
      }
    }
    
    if (!referralRecord) return null;
    
    const commission = Math.floor(depositAmount * REFERRAL_CONFIG.COMMISSION_RATE);
    
    const referrerRef = database.ref('users/' + referralRecord.referrerId);
    const referrerSnap = await referrerRef.once('value');
    const referrerData = referrerSnap.val();
    
    await referrerRef.update({
      coins: (referrerData.coins || 0) + commission,
      referralEarnings: (referrerData.referralEarnings || 0) + commission
    });
    
    await database.ref('referrals/' + referralId).update({
      status: 'active',
      depositAmount: depositAmount,
      commissionEarned: commission,
      commissionPaid: true,
      paidAt: new Date().toISOString()
    });
    
    sendNotificationToPlayer(referralRecord.referrerId, '💰 Commission Earned!', `${userData.username} deposited ${depositAmount} coins! You earned ${commission} coins!`, '💰');
    
    return commission;
  } catch (error) {
    console.error("Error processing deposit commission:", error);
    return null;
  }
}

// ===== REFERRAL FUNCTIONS =====
function generateReferralCode(username) {
  const prefix = username.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${randomNum}`;
}

async function createReferralCode(userId, username) {
  const referralCode = generateReferralCode(username);
  await database.ref('users/' + userId).update({
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
    const usersRef = database.ref('users');
    const snapshot = await usersRef.once('value');
    const users = snapshot.val();
    
    let referrerId = null;
    let referrerData = null;
    
    for (const [id, user] of Object.entries(users)) {
      if (user.referralCode === referralCode && id !== newUserId) {
        referrerId = id;
        referrerData = user;
        break;
      }
    }
    
    if (referrerId) {
      await database.ref('users/' + newUserId).update({ 
        referredBy: referrerId,
        referredAt: new Date().toISOString()
      });
      
      const newReferralCount = (referrerData.referralCount || 0) + 1;
      await database.ref('users/' + referrerId).update({
        referralCount: newReferralCount,
        activeReferrals: (referrerData.activeReferrals || 0) + 1
      });
      
      const referralRef = database.ref('referrals').push();
      await referralRef.set({
        id: referralRef.key,
        referrerId: referrerId,
        referrerUsername: referrerData.username,
        referredUserId: newUserId,
        referredUsername: newUsername,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      
      sendNotificationToPlayer(referrerId, '🎉 New Referral!', `${newUsername} signed up using your code!`, '🎉');
      
      return referrerId;
    }
    return null;
  } catch (error) {
    console.error("Error applying referral:", error);
    return null;
  }
}

async function loadReferralData() {
  if (!currentUser || currentUser.isGuest) return;
  
  try {
    const userSnap = await database.ref('users/' + currentUser.id).once('value');
    const userData = userSnap.val();
    
    referralData.code = userData.referralCode;
    referralData.totalReferrals = userData.referralCount || 0;
    referralData.activeReferrals = userData.activeReferrals || 0;
    referralData.totalEarnings = userData.referralEarnings || 0;
    referralData.milestones = userData.referralMilestones || { 5: false, 10: false, 25: false, 50: false };
    
    const baseUrl = window.location.origin;
    referralData.link = `${baseUrl}/?ref=${referralData.code}`;
    
    const referralsSnap = await database.ref('referrals').orderByChild('referrerId').equalTo(currentUser.id).once('value');
    const referrals = referralsSnap.val();
    
    if (referrals) {
      referralData.referrals = [];
      for (const [id, ref] of Object.entries(referrals)) {
        referralData.referrals.push({
          id: id,
          username: ref.referredUsername,
          status: ref.status,
          depositAmount: ref.depositAmount || 0,
          commissionEarned: ref.commissionEarned || 0,
          joined: ref.timestamp,
          isActive: ref.status === 'active'
        });
      }
    }
    
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
      tbody.innerHTML = '}<td colspan="5" style="text-align:center;">No referrals yet</td><\/tr>';
    } else {
      tbody.innerHTML = referralData.referrals.map(ref => `
        <tr>
          <td>${escapeHtml(ref.username)}</td>
          <td>${ref.isActive ? '✅ Active' : '⏳ Pending'}</td>
          <td class="positive">${formatNumber(ref.depositAmount)}</td>
          <td class="positive">${formatNumber(ref.commissionEarned)}</td>
          <td>${new Date(ref.joined).toLocaleDateString()}</td>
        </tr>
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

  const backHTML = `
    <div class="card-face card-back">
      <div class="card-back-pattern"></div>
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
          <span class="golden-text">${CONFIG.GOLDEN_MULTIPLIER}X WIN!</span>
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

function updateGameUI() {
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

  // Deduct bet
  gameState.balance -= gameState.currentBet;
  await updateUserDataInFirebase(currentUser.id, { coins: gameState.balance });
  updateGameUI();

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
  const messageText = document.getElementById('messageText');
  
  if (betPanel) betPanel.style.display = 'none';
  if (startBtn) startBtn.classList.add('hidden');
  if (progressSection) progressSection.classList.remove('hidden');
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
    updateGameUI();
    
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = `GOLDEN MATCH! +${formatNumber(gameState.currentWin)}`;
    showCashoutOption();
  } else {
    gameState.firstCard.classList.remove('flipped');
    gameState.secondCard.classList.remove('flipped');
    const messageText = document.getElementById('messageText');
    if (messageText) messageText.textContent = 'No match';
  }
  
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.canFlip = true;
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
    updateGameUI();

    if (gameState.pairsMatched >= CONFIG.PAIRS_COUNT) {
      gameState.currentWin = gameState.currentBet * CONFIG.MULTIPLIERS[CONFIG.MULTIPLIERS.length - 1];
      setTimeout(handleMaxWin, 400);
    } else {
      const messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = `MATCH! +${formatNumber(gameState.currentWin)} (${gameState.multiplier}x)`;
      showCashoutOption();
    }
  } else {
    setTimeout(() => {
      gameState.firstCard.classList.remove('flipped');
      gameState.secondCard.classList.remove('flipped');
      const messageText = document.getElementById('messageText');
      if (messageText) messageText.textContent = 'Try again';
    }, 400);
  }
  
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.canFlip = true;
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
    totalWins: gameState.totalWins
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
  if (messageText) messageText.textContent = 'Continue playing!';
  gameState.canFlip = true;
  if (audio) audio.playClick();
}

function handleBomb() {
  gameState.totalBets++;
  
  updateUserDataInFirebase(currentUser.id, { 
    coins: gameState.balance,
    totalBets: gameState.totalBets
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
    totalWins: gameState.totalWins
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
  updateGameUI();
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
  if (messageText) messageText.textContent = 'Select bet';

  gameState.currentBet = 0;
  gameState.currentWin = 0;
  gameState.multiplier = 1;
  gameState.pairsMatched = 0;

  updateGameUI();
  if (audio) audio.playClick();
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
    timestamp: new Date().toISOString()
  });
}

// ===== SHOP FUNCTIONS =====
function renderShopGrid() {
  const shopGrid = document.getElementById('shopGrid');
  if (!shopGrid) return;
  
  const isGuest = currentUser && currentUser.isGuest;
  const bonusRate = REFERRAL_CONFIG.DEPOSIT_BONUS_RATE * 100;
  
  const shopItems = [
    { amount: 100, coins: 100, icon: '💰', bonus: Math.floor(100 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE) },
    { amount: 500, coins: 500, icon: '💰', bonus: Math.floor(500 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE) },
    { amount: 1000, coins: 1000, icon: '💰', bonus: Math.floor(1000 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE) },
    { amount: 3000, coins: 3000, icon: '💰', bonus: Math.floor(3000 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE), featured: true },
    { amount: 5000, coins: 5000, icon: '💰', bonus: Math.floor(5000 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE) },
    { amount: 10000, coins: 10000, icon: '💰', bonus: Math.floor(10000 * REFERRAL_CONFIG.DEPOSIT_BONUS_RATE) },
  ];

  shopGrid.innerHTML = shopItems.map(item => `
    <div class="shop-card ${isGuest ? 'guest-disabled' : ''} ${item.featured ? 'featured' : ''}" onclick="${isGuest ? '' : `purchaseCoins(${item.amount}, ${item.coins})`}">
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-amount">₨${item.amount}</div>
      <div class="shop-coins">${formatNumber(item.coins)} Coins</div>
      <div class="shop-bonus">+${formatNumber(item.bonus)} Bonus (${bonusRate}%)</div>
      <div class="shop-total">Total: ${formatNumber(item.coins + item.bonus)} Coins</div>
      ${item.featured ? '<div class="shop-badge">🔥 BEST VALUE</div>' : ''}
      <button class="shop-btn" ${isGuest ? 'disabled' : ''}>${isGuest ? 'Login to Buy' : 'BUY NOW'}</button>
    </div>
  `).join('');

  const paymentGrid = document.getElementById('paymentMethodsGrid');
  if (paymentGrid) {
    paymentGrid.innerHTML = `
      <div class="payment-card">
        <div class="payment-icon">📱</div>
        <div class="payment-name">JazzCash</div>
        <div class="payment-desc">Instant top-up with ${bonusRate}% bonus</div>
      </div>
      <div class="payment-card">
        <div class="payment-icon">💳</div>
        <div class="payment-name">Easypaisa</div>
        <div class="payment-desc">Quick deposit with ${bonusRate}% bonus</div>
      </div>
      <div class="payment-card">
        <div class="payment-icon">🏦</div>
        <div class="payment-name">Bank Transfer</div>
        <div class="payment-desc">Direct transfer with ${bonusRate}% bonus</div>
      </div>
    `;
  }
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

// ===== AUTH FUNCTIONS =====
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
    totalWins: 0
  };
  gameState.balance = 0;
  closeAuth();
  updateHeaderForUser();
  updateGameUI();
  hideAuthButtons();
  showPopup('Guest Mode', 'You are playing as guest with 0 coins');
}

function updateHeaderForUser() {
  const headerUsername = document.getElementById('headerUsername');
  const headerAvatar = document.getElementById('headerAvatarIcon');
  const userStatus = document.getElementById('userStatus');

  if (currentUser) {
    if (headerUsername) headerUsername.textContent = currentUser.username;
    if (headerAvatar) headerAvatar.textContent = currentUser.avatar || '👤';
    if (userStatus) userStatus.textContent = currentUser.isGuest ? 'Guest Mode' : 'Verified Player';
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
  
  if (profileNameDisplay) profileNameDisplay.textContent = currentUser.username;
  if (profileIdDisplay) profileIdDisplay.textContent = 'ID: ' + currentUser.id;
  if (currentAvatarDisplay) currentAvatarDisplay.textContent = currentUser.avatar || '👤';
  if (profileCoins) profileCoins.textContent = formatNumber(gameState.balance);
  if (profileBets) profileBets.textContent = gameState.totalBets || 0;
  if (profileWins) profileWins.textContent = gameState.totalWins || 0;
}

function closeProfile() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.classList.remove('active');
}

function logout() {
  if (currentUser && !currentUser.isGuest) {
    auth.signOut();
  }
  currentUser = null;
  closeProfile();
  gameState.balance = 0;
  updateHeaderForUser();
  updateGameUI();
  showAuthButtons();
  openAuthModal('login');
  showPopup('Logged out', 'You have been logged out');
}

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
  }, 3000);
}

function exitGame() {
  const gameView = document.getElementById('gameView');
  if (gameView) gameView.classList.remove('active');
  isInGame = false;
  if (audio) audio.playClick();
}

function handleLoginSubmit(form) {
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
        updateGameUI();
        hideAuthButtons();
        closeAuth();
        loadReferralData();
        showPopup('Welcome back!', `Logged in as ${currentUser.username}`);
      }
    })
    .catch((error) => {
      let errorMessage = 'Email or password is incorrect';
      if (error.code === 'auth/user-not-found') errorMessage = 'No account found';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      
      if (errorContainer) {
        errorContainer.innerHTML = errorMessage;
        errorContainer.classList.add('active');
      }
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
  const manualReferralCode = form.referralCode?.value.trim() || '';
  const urlReferralCode = getReferralCodeFromURL();
  const referralCode = urlReferralCode || manualReferralCode;
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

  auth.createUserWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      
      const userData = {
        username: username,
        avatar: '👤',
        email: email,
        coins: 1000,
        totalBets: 0,
        totalWins: 0,
        createdAt: new Date().toISOString(),
        referredBy: null,
        referralCode: null,
        referralCount: 0,
        referralEarnings: 0,
        activeReferrals: 0,
        referralMilestones: { 5: false, 10: false, 25: false, 50: false }
      };

      await database.ref('users/' + user.uid).set(userData);
      await createReferralCode(user.uid, username);
      
      let referredById = null;
      if (referralCode) {
        referredById = await applyReferral(referralCode, user.uid, username);
        if (referredById) {
          await database.ref('users/' + user.uid).update({ referredBy: referredById });
        }
      }

      currentUser = {
        username: username,
        avatar: '👤',
        isGuest: false,
        id: user.uid,
        totalBets: 0,
        totalWins: 0,
        referredBy: referredById
      };

      gameState.balance = 1000;

      updateHeaderForUser();
      updateGameUI();
      hideAuthButtons();
      closeAuth();
      loadReferralData();
      
      if (referralCode && referredById) {
        showPopup('Welcome!', `Account created with referral! Deposit ${REFERRAL_CONFIG.MIN_DEPOSIT_FOR_COMMISSION}+ coins to earn commission for your referrer!`);
      } else {
        showPopup('Welcome!', `Account created, ${username}! Get ${REFERRAL_CONFIG.DEPOSIT_BONUS_RATE*100}% bonus on every deposit!`);
      }
    })
    .catch((error) => {
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Email already exists';
      
      if (errorContainer) {
        errorContainer.innerHTML = errorMessage;
        errorContainer.classList.add('active');
      }
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
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

function openWithdraw() {
  if (!currentUser || currentUser.isGuest) {
    showPopup('Login Required', 'Please login to withdraw');
    openAuthModal('login');
    return;
  }
  
  const withdrawBalance = document.getElementById('withdrawBalance');
  if (withdrawBalance) withdrawBalance.textContent = formatNumber(gameState.balance);
  
  const withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.add('active');
  if (audio) audio.playClick();
}

function closeWithdrawPopup() {
  const withdrawPopup = document.getElementById('withdrawPopup');
  if (withdrawPopup) withdrawPopup.classList.remove('active');
}

function processWithdraw() {
  const amount = parseInt(document.getElementById('withdrawAmount')?.value);
  const method = document.getElementById('withdrawMethod')?.value;
  
  if (!amount || amount < 1000) {
    showPopup('Error', 'Minimum withdrawal is 1000 coins');
    return;
  }
  
  if (amount > gameState.balance) {
    showPopup('Error', 'Insufficient balance');
    return;
  }
  
  showPopup('Withdrawal Request', `Your withdrawal request for ${amount} coins has been submitted. Admin will process it shortly.`);
  closeWithdrawPopup();
}

// ===== NOTIFICATION FUNCTIONS =====
function openNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.add('open');
}

function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) panel.classList.remove('open');
}

// ===== UI FUNCTIONS =====
function updateUI() {
  updateGameUI();
}

function setActiveNav(element) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  element.classList.add('active');
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

function initApp() {
  createParticles();
  
  // Setup bet options
  document.querySelectorAll('.bet-option').forEach(btn => {
    btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet)));
  });
  
  document.getElementById('customBetBtn')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('customBet')?.value);
    if (!isNaN(val)) selectBet(val);
  });
  
  document.getElementById('startBtn')?.addEventListener('click', startGame);
  document.getElementById('cashoutBtn')?.addEventListener('click', cashout);
  document.getElementById('continueBtn')?.addEventListener('click', continuePlaying);
  document.getElementById('playAgainWin')?.addEventListener('click', resetGame);
  document.getElementById('playAgainLose')?.addEventListener('click', resetGame);
  
  // Check for referral code in URL
  const refCode = getReferralCodeFromURL();
  if (refCode) {
    localStorage.setItem('pendingReferralCode', refCode);
    setTimeout(() => {
      openAuthModal('register');
      const referralInput = document.querySelector('#registerForm input[name="referralCode"]');
      if (referralInput) referralInput.value = refCode;
    }, 1000);
  }
  
  console.log("✅ Royal Match ready! Get 2.5% bonus on every deposit!");
}

// ===== AUDIO SYSTEM =====
class AudioSystem {
  constructor() {
    this.muted = false;
    this.audioContext = null;
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }

  playTone(frequency, duration, volume = 0.3) {
    if (this.muted || !this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playCardFlip() {
    this.playTone(800, 0.08, 0.2);
    setTimeout(() => this.playTone(600, 0.08, 0.15), 40);
  }

  playMatch() {
    [523, 659, 784].forEach((n, i) => setTimeout(() => this.playTone(n, 0.15), i * 80));
  }

  playWin() {
    [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => this.playTone(n, 0.2), i * 100));
  }

  playBomb() {
    this.playTone(150, 0.4);
    setTimeout(() => this.playTone(100, 0.3), 80);
  }

  playClick() {
    this.playTone(1000, 0.04);
  }

  playCashout() {
    [784, 988, 1175].forEach((n, i) => setTimeout(() => this.playTone(n, 0.2), i * 60));
  }

  playShuffle() {
    for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(200 + Math.random() * 400, 0.05), i * 50);
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const audio = new AudioSystem();

// Make functions globally available
window.openAuthModal = openAuthModal;
window.switchAuthTab = switchAuthTab;
window.closeAuth = closeAuth;
window.guestLogin = guestLogin;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.logout = logout;
window.enterGame = enterGame;
window.exitGame = exitGame;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.openShop = openShop;
window.closeShop = closeShop;
window.purchaseCoins = purchaseCoins;
window.openReferral = openReferral;
window.closeReferral = closeReferral;
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.openWithdraw = openWithdraw;
window.closeWithdrawPopup = closeWithdrawPopup;
window.processWithdraw = processWithdraw;
window.openNotificationPanel = openNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.setActiveNav = setActiveNav;
window.showPopup = showPopup;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  updateGameUI();
});