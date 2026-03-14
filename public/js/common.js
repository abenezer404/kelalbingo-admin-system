// Authentication check
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        redirectToLogin();
        return null;
    }
    
    // Basic token format validation
    if (!token.includes('.') || token.split('.').length !== 3) {
        // Invalid JWT format - clear and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        redirectToLogin();
        return null;
    }
    
    return token;
}

// Redirect to login with clean state
function redirectToLogin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'index.html';
}

// Get admin info
function getAdminInfo() {
    return {
        username: localStorage.getItem('adminUsername'),
        token: localStorage.getItem('adminToken')
    };
}

// Logout function (basic version - enhanced version is at the end of file)
function logoutBasic() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    
    // Force reload with cache clearing to prevent autofill
    window.location.replace('index.html?t=' + Date.now());
}

// API request helper (from admin.js)
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('adminToken');
    
    // Check if token exists and has valid format
    if (!token || !token.includes('.') || token.split('.').length !== 3) {
        redirectToLogin();
        return { success: false, message: 'Authentication required' };
    }
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`http://localhost:3000${endpoint}`, options);
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
            return { success: false, message: 'Authentication failed' };
        }
        
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Network error' };
    }
}

// Show message helper
function showMessage(elementId, message, type = 'success') {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}

// Set active navigation
function setActiveNav(pageName) {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === pageName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Activity tracking variables
let activityTimer = null;
let warningTimer = null;
let sessionCheckInterval = null;
let warningShown = false;

// Activity tracking configuration (will be loaded from server)
let INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes (default)
let WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before logout (default)
const SESSION_CHECK_INTERVAL = 30 * 1000; // Check session every 30 seconds

// Initialize page
function initPage(pageName) {
    checkAuth();
    const adminInfo = getAdminInfo();
    
    // Set admin name if element exists
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = adminInfo.username;
    }
    
    // Set active navigation
    setActiveNav(pageName);
    
    // Add logout button listener if exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }
    
    // Initialize activity tracking
    initActivityTracking();
}

// Initialize activity tracking
async function initActivityTracking() {
    // Load session configuration from server
    await loadSessionConfig();
    
    // Clear any existing timers
    clearActivityTimers();
    
    // Start activity tracking
    resetActivityTimer();
    
    // Add event listeners for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
    });
    
    // Start periodic session validation
    sessionCheckInterval = setInterval(validateSession, SESSION_CHECK_INTERVAL);
}

// Load session configuration from server
async function loadSessionConfig() {
    try {
        const response = await fetch('http://localhost:3000/admin/session-config');
        const data = await response.json();
        
        if (data.success) {
            INACTIVITY_TIMEOUT = data.config.timeoutMs;
            WARNING_TIME = data.config.warningMs;
        }
    } catch (error) {
        // Use default values if server request fails
    }
}

// Handle user activity
function handleUserActivity() {
    // Reset activity timer on any user interaction
    resetActivityTimer();
    
    // Hide warning if shown
    if (warningShown) {
        hideInactivityWarning();
    }
}

// Reset activity timer
function resetActivityTimer() {
    // Clear existing timers
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    // Set warning timer (show warning 2 minutes before logout)
    warningTimer = setTimeout(() => {
        showInactivityWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);
    
    // Set logout timer
    activityTimer = setTimeout(() => {
        handleInactivityLogout();
    }, INACTIVITY_TIMEOUT);
}

// Show inactivity warning
function showInactivityWarning() {
    if (warningShown) return;
    
    warningShown = true;
    
    // Create warning modal
    const warningModal = document.createElement('div');
    warningModal.id = 'inactivityWarning';
    warningModal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content warning-modal">
                <div class="warning-icon">⚠️</div>
                <h3>Session Expiring Soon</h3>
                <p>You will be logged out in <span id="warningCountdown">${Math.floor(WARNING_TIME/60000)}:00</span> due to inactivity.</p>
                <div class="modal-buttons">
                    <button id="stayLoggedIn" class="btn btn-primary">Stay Logged In</button>
                    <button id="logoutNow" class="btn btn-secondary">Logout Now</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    warningModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(warningModal);
    
    // Add event listeners
    document.getElementById('stayLoggedIn').addEventListener('click', () => {
        hideInactivityWarning();
        updateServerActivity();
    });
    
    document.getElementById('logoutNow').addEventListener('click', () => {
        logout();
    });
    
    // Start countdown
    startWarningCountdown();
}

// Hide inactivity warning
function hideInactivityWarning() {
    const warningModal = document.getElementById('inactivityWarning');
    if (warningModal) {
        warningModal.remove();
    }
    warningShown = false;
}

// Start warning countdown
function startWarningCountdown() {
    let timeLeft = WARNING_TIME / 1000; // Convert to seconds
    const countdownEl = document.getElementById('warningCountdown');
    
    const countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        if (countdownEl) {
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        timeLeft--;
        
        if (timeLeft < 0 || !warningShown) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

// Handle inactivity logout
async function handleInactivityLogout() {
    // Clear all timers
    clearActivityTimers();
    
    // Show logout message using modal
    await showWarning('You have been logged out due to inactivity.', 'Session Expired');
    
    // Logout
    logout();
}

// Update server activity
async function updateServerActivity() {
    try {
        const response = await apiRequest('/admin/update-activity', 'POST');
        
        if (response.success) {
            // Activity updated successfully
            resetActivityTimer();
        } else if (response.expired) {
            // Session expired on server
            handleInactivityLogout();
        }
    } catch (error) {
        // Network error - continue with client-side tracking
    }
}

// Validate session with server
async function validateSession() {
    try {
        const response = await apiRequest('/admin/update-activity', 'POST');
        
        if (!response.success && response.expired) {
            // Session expired on server
            handleInactivityLogout();
        }
    } catch (error) {
        // Network error - continue with client-side tracking
    }
}

// Clear all activity timers
function clearActivityTimers() {
    if (activityTimer) {
        clearTimeout(activityTimer);
        activityTimer = null;
    }
    
    if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
    }
    
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// Enhanced logout function
function logout() {
    // Clear activity tracking
    clearActivityTimers();
    
    // Hide warning if shown
    if (warningShown) {
        hideInactivityWarning();
    }
    
    // Remove activity event listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
    });
    
    // Clear localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    
    // Force reload with cache clearing to prevent autofill
    window.location.replace('index.html?t=' + Date.now());
}

// Modal System for replacing alert() and confirm()
class AdminModal {
    constructor() {
        this.modalId = 'adminModal';
        this.isOpen = false;
    }

    // Show alert modal (replaces alert())
    showAlert(message, title = 'Notice', type = 'info') {
        return new Promise((resolve) => {
            this.createModal({
                title,
                message,
                type,
                buttons: [
                    {
                        text: 'OK',
                        class: 'btn-primary',
                        action: () => {
                            this.close();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    // Show confirm modal (replaces confirm())
    showConfirm(message, title = 'Confirm', confirmText = 'Yes', cancelText = 'No') {
        return new Promise((resolve) => {
            this.createModal({
                title,
                message,
                type: 'warning',
                buttons: [
                    {
                        text: cancelText,
                        class: 'btn-secondary',
                        action: () => {
                            this.close();
                            resolve(false);
                        }
                    },
                    {
                        text: confirmText,
                        class: 'btn-primary',
                        action: () => {
                            this.close();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    // Show success modal
    showSuccess(message, title = 'Success') {
        return this.showAlert(message, title, 'success');
    }

    // Show error modal
    showError(message, title = 'Error') {
        return this.showAlert(message, title, 'error');
    }

    // Show warning modal
    showWarning(message, title = 'Warning') {
        return this.showAlert(message, title, 'warning');
    }

    // Create modal DOM structure
    createModal({ title, message, type, buttons }) {
        if (this.isOpen) {
            this.close();
        }

        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'admin-modal-overlay';

        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const colorMap = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header" style="border-top: 4px solid ${colorMap[type]}">
                    <div class="admin-modal-icon" style="color: ${colorMap[type]}">${iconMap[type]}</div>
                    <h3 class="admin-modal-title">${title}</h3>
                </div>
                <div class="admin-modal-body">
                    <p class="admin-modal-message">${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="admin-modal-footer">
                    ${buttons.map((btn, index) => 
                        `<button class="btn ${btn.class}" data-action="${index}">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.isOpen = true;

        // Add event listeners
        buttons.forEach((btn, index) => {
            const button = modal.querySelector(`[data-action="${index}"]`);
            button.addEventListener('click', btn.action);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                buttons[buttons.length - 1].action(); // Execute last button action (usually cancel)
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                buttons[buttons.length - 1].action(); // Execute last button action (usually cancel)
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus first button
        setTimeout(() => {
            const firstButton = modal.querySelector('.btn');
            if (firstButton) firstButton.focus();
        }, 100);
    }

    // Close modal
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
            this.isOpen = false;
        }
    }
}

// Global modal instance
const adminModal = new AdminModal();

// Global functions for easy access (replaces alert and confirm)
function showAlert(message, title = 'Notice', type = 'info') {
    return adminModal.showAlert(message, title, type);
}

function showConfirm(message, title = 'Confirm', confirmText = 'Yes', cancelText = 'No') {
    return adminModal.showConfirm(message, title, confirmText, cancelText);
}

function showSuccess(message, title = 'Success') {
    return adminModal.showSuccess(message, title);
}

function showError(message, title = 'Error') {
    return adminModal.showError(message, title);
}

function showWarning(message, title = 'Warning') {
    return adminModal.showWarning(message, title);
}