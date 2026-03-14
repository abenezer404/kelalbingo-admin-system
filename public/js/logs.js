// Early token validation to prevent malformed JWT errors
const token = localStorage.getItem('adminToken');
if (!token || !token.includes('.') || token.split('.').length !== 3) {
    redirectToLogin();
} else {
    initPage('logs.html');
    // Load logs on page load
    let allResetLogs = [];
    let allBalanceLogs = [];
    loadPasswordResetLogs();
    loadBalanceSyncLogs();
}

// Refresh buttons
document.getElementById('refreshResetLogsBtn').addEventListener('click', loadPasswordResetLogs);
document.getElementById('refreshBalanceLogsBtn').addEventListener('click', loadBalanceSyncLogs);

// Search functionality for reset logs
document.getElementById('searchResetLogs').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayPasswordResetLogs(allResetLogs);
    } else {
        const filtered = allResetLogs.filter(log => {
            const username = (log.username || '').toLowerCase();
            const machineSerial = (log.machine_serial || '').toLowerCase();
            return username.includes(searchTerm) || machineSerial.includes(searchTerm);
        });
        displayPasswordResetLogs(filtered);
    }
});

// Search functionality for balance logs
document.getElementById('searchBalanceLogs').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayBalanceSyncLogs(allBalanceLogs);
    } else {
        const filtered = allBalanceLogs.filter(log => {
            const username = (log.username || '').toLowerCase();
            const machineSerial = (log.machine_serial || '').toLowerCase();
            return username.includes(searchTerm) || machineSerial.includes(searchTerm);
        });
        displayBalanceSyncLogs(filtered);
    }
});

// Load password reset logs
async function loadPasswordResetLogs() {
    try {
        const response = await apiRequest('/admin/password-reset-logs');
        if (response.success) {
            allResetLogs = response.logs;
            displayPasswordResetLogs(allResetLogs);
        }
    } catch (error) {
        // Error loading password reset logs - handled silently
    }
}

function displayPasswordResetLogs(logs) {
    const resetLogsList = document.getElementById('resetLogsList');

    if (logs.length === 0) {
        resetLogsList.innerHTML = '<p class="no-data">No password reset requests found</p>';
        return;
    }

    let html = '<table class="data-table"><thead><tr><th>Username</th><th>IP Address</th><th>Machine Serial</th><th>Date/Time</th><th>Status</th></tr></thead><tbody>';

    logs.forEach(log => {
        const status = log.success ? '<span class="badge badge-success">Success</span>' : '<span class="badge badge-danger">Failed</span>';
        const createdAt = new Date(log.created_at).toLocaleString();
        const username = log.username || 'Unknown';
        const machineSerial = log.machine_serial || '-';

        html += `
          <tr>
            <td>${username}</td>
            <td>${log.ip_address || '-'}</td>
            <td>${machineSerial}</td>
            <td>${createdAt}</td>
            <td>${status}</td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    resetLogsList.innerHTML = html;
}

// Load balance sync logs
async function loadBalanceSyncLogs() {
    try {
        const response = await apiRequest('/admin/balance-sync-logs');
        if (response.success) {
            allBalanceLogs = response.logs;
            displayBalanceSyncLogs(allBalanceLogs);
        } else {
            document.getElementById('balanceLogsList').innerHTML = '<p class="no-data">Unable to load balance sync logs</p>';
        }
    } catch (error) {
        // Error loading balance sync logs - show error in UI
        document.getElementById('balanceLogsList').innerHTML = '<p class="no-data">Error loading balance sync logs</p>';
    }
}

function displayBalanceSyncLogs(logs) {
    const balanceLogsList = document.getElementById('balanceLogsList');

    if (logs.length === 0) {
        balanceLogsList.innerHTML = '<p class="no-data">No balance sync logs found</p>';
        return;
    }

    let html = '<table class="data-table"><thead><tr><th>Username</th><th>Amount Synced</th><th>IP Address</th><th>Machine Serial</th><th>Date/Time</th></tr></thead><tbody>';

    logs.forEach(log => {
        const createdAt = new Date(log.created_at).toLocaleString();
        const username = log.username || 'Unknown';
        const machineSerial = log.machine_serial || '-';

        html += `
          <tr>
            <td>${username}</td>
            <td>${log.amount_synced} ብር</td>
            <td>${log.ip_address || '-'}</td>
            <td>${machineSerial}</td>
            <td>${createdAt}</td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    balanceLogsList.innerHTML = html;
}
