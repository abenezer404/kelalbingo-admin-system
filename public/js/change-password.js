// Early token validation to prevent malformed JWT errors
const token = localStorage.getItem('adminToken');
if (!token || !token.includes('.') || token.split('.').length !== 3) {
    redirectToLogin();
} else {
    initPage('change-password.html');
}

let currentStep = 1;
let otpExpiryTime = null;
let timerInterval = null;
let passwordData = {};

// Form elements
const passwordForm = document.getElementById('passwordForm');
const otpForm = document.getElementById('otpForm');
const messageDiv = document.getElementById('message');

// Step navigation
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Hide all step indicators
    document.querySelectorAll('.step-item').forEach(item => {
        item.classList.remove('active', 'completed');
    });
    
    // Show current step
    document.getElementById(`step${stepNumber}`).classList.add('active');
    
    // Update step indicators
    for (let i = 1; i <= stepNumber; i++) {
        const indicator = document.getElementById(`step${i}-indicator`);
        if (i === stepNumber) {
            indicator.classList.add('active');
        } else if (i < stepNumber) {
            indicator.classList.add('completed');
        }
    }
    
    currentStep = stepNumber;
}

// Password validation
function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    return Object.values(requirements).every(req => req);
}

// Password strength indicator
function updatePasswordStrength(password) {
    const requirements = [
        { test: password.length >= 8, text: 'At least 8 characters' },
        { test: /[A-Z]/.test(password), text: 'Uppercase letter' },
        { test: /[a-z]/.test(password), text: 'Lowercase letter' },
        { test: /\d/.test(password), text: 'Number' },
        { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'Special character' }
    ];
    
    // You could add visual indicators here if needed
}

// OTP Timer
function startOTPTimer(expiryTime) {
    otpExpiryTime = new Date(expiryTime);
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = otpExpiryTime - now;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('otpTimer').innerHTML = '<span style="color: red;">OTP expired. Please start over.</span>';
            setTimeout(() => {
                showStep(1);
            }, 3000);
        } else {
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            document.getElementById('otpTimer').textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Step 1: Password Form Submission
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.textContent = '';
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        showMessage('message', 'New passwords do not match', 'error');
        return;
    }
    
    if (!validatePassword(newPassword)) {
        showMessage('message', 'New password does not meet requirements', 'error');
        return;
    }
    
    if (currentPassword === newPassword) {
        showMessage('message', 'New password must be different from current password', 'error');
        return;
    }
    
    // Store password data
    passwordData = {
        currentPassword,
        newPassword
    };
    
    try {
        // Request OTP for password change
        const response = await apiRequest('/admin/request-password-change-otp', 'POST');
        
        if (response.success) {
            showStep(2);
            startOTPTimer(response.expiresAt);
            document.getElementById('otpCode').focus();
            showMessage('message', 'OTP sent to your email', 'success');
        } else {
            showMessage('message', response.message || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        showMessage('message', 'Connection error. Please try again.', 'error');
    }
});

// Step 2: OTP Form Submission
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.textContent = '';
    
    const otpCode = document.getElementById('otpCode').value;
    
    if (otpCode.length !== 6) {
        showMessage('message', 'Please enter a 6-digit OTP code', 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/admin/change-password', 'POST', {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            otpCode: otpCode
        });
        
        if (response.success) {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            showStep(3);
            
            // Auto-logout after 5 seconds
            setTimeout(() => {
                logout();
            }, 5000);
        } else {
            showMessage('message', response.message || 'Password change failed', 'error');
            
            // Clear OTP field for retry
            document.getElementById('otpCode').value = '';
            document.getElementById('otpCode').focus();
        }
    } catch (error) {
        showMessage('message', 'Connection error. Please try again.', 'error');
    }
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    showStep(1);
    
    // Clear form data
    passwordData = {};
    document.getElementById('otpCode').value = '';
});

// Auto-format OTP input
document.getElementById('otpCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
});

// Real-time password validation
document.getElementById('newPassword').addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
});

// Real-time confirm password validation
document.getElementById('confirmPassword').addEventListener('input', (e) => {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = e.target.value;
    
    if (confirmPassword && newPassword !== confirmPassword) {
        e.target.style.borderColor = '#dc3545';
    } else {
        e.target.style.borderColor = '#ddd';
    }
});