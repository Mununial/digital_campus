/**
 * BEC Digital Campus Portal - Screen Router & Navigation Controller
 */

let screenHistory = ['screen-dashboard'];

function navigateToScreen(targetScreenId, updateHistory = true) {
  const currentScreen = document.querySelector('.portal-screen.active');
  const targetScreen = document.getElementById(targetScreenId);

  if (!targetScreen) {
    console.warn(`Screen with ID "${targetScreenId}" not found.`);
    return;
  }

  if (currentScreen) {
    currentScreen.classList.remove('active');
  }

  targetScreen.classList.add('active');

  // Scroll to top of the screen container
  const scrollContainer = document.querySelector('.screen-scroll-container');
  if (scrollContainer) scrollContainer.scrollTop = 0;

  if (updateHistory && screenHistory[screenHistory.length - 1] !== targetScreenId) {
    screenHistory.push(targetScreenId);
  }

  // Update bottom navigation bar active state
  updateBottomNavHighlight(targetScreenId);
}

function goBackScreen() {
  if (screenHistory.length > 1) {
    screenHistory.pop(); // Remove current screen
    const previousScreen = screenHistory[screenHistory.length - 1];
    navigateToScreen(previousScreen, false);
  } else {
    navigateToScreen('screen-dashboard', false);
  }
}

function updateBottomNavHighlight(screenId) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  if (screenId === 'screen-dashboard') {
    const nav = document.getElementById('nav-item-home');
    if (nav) nav.classList.add('active');
  } else if (screenId === 'screen-services') {
    const nav = document.getElementById('nav-item-services');
    if (nav) nav.classList.add('active');
  } else if (screenId === 'screen-activity') {
    const nav = document.getElementById('nav-item-activity');
    if (nav) nav.classList.add('active');
  } else if (screenId === 'screen-profile') {
    const nav = document.getElementById('nav-item-profile');
    if (nav) nav.classList.add('active');
  }
}

// Quick Action Sheet (+) Modal Toggle
function openQuickActionSheet() {
  const modal = document.getElementById('quick-action-modal');
  if (modal) modal.style.display = 'flex';
}

function closeQuickActionSheet() {
  const modal = document.getElementById('quick-action-modal');
  if (modal) modal.style.display = 'none';
}

// Global expose
window.navigateToScreen = navigateToScreen;
window.goBackScreen = goBackScreen;
window.openQuickActionSheet = openQuickActionSheet;
window.closeQuickActionSheet = closeQuickActionSheet;
