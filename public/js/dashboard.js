// Check authentication
const token = localStorage.getItem('adminToken');
if (!token) {
    window.location.href = 'index.html';
}

const adminName = localStorage.getItem('adminUsername');
document.getElementById('adminName').textContent = adminName;

// Load initial data
loadStats();
loadUsers();
loadPasswordResetLogs();
loadPackages();

// Create user form
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageDiv = document.getElementById('createMessage');
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const expiresInDays = document.getElementById('expiresInDays').value;

    try {
        const response = await apiRequest('/admin/users/create', 'POST', {
            username,
            password,
            expiresInDays: expiresInDays ? parseInt(expiresInDays) : null
        });

        if (response.success) {
            messageDiv.textContent = 'User created successfully!';
            messageDiv.classList.add('success');
            document.getElementById('createUserForm').reset();
            loadUsers();
            loadStats();
        } else {
            messageDiv.textContent = response.message || 'Failed to create user';
            messageDiv.classList.add('error');
        }
    } catch (error) {
        messageDiv.textContent = 'Error creating user';
        messageDiv.classList.add('error');
    }
});

// Assign package form
document.getElementById('assignPackageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageDiv = document.getElementById('packageMessage');
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    const userId = document.getElementById('packageUserId').value;
    const packageId = document.getElementById('packageId').value;

    try {
        const response = await apiRequest('/admin/packages/assign', 'POST', {
            userId: parseInt(userId),
            packageId: parseInt(packageId)
        });

        if (response.success) {
            messageDiv.textContent = `Package assigned successfully! Amount: ${response.packageAssignment.amount} ብር`;
            messageDiv.classList.add('success');
            document.getElementById('assignPackageForm').reset();
        } else {
            messageDiv.textContent = response.message || 'Failed to assign package';
            messageDiv.classList.add('error');
        }
    } catch (error) {
        messageDiv.textContent = 'Error assigning package';
        messageDiv.classList.add('error');
    }
});

// Event listeners for static buttons
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);
document.getElementById('refreshResetLogsBtn').addEventListener('click', loadPasswordResetLogs);

// Load functions
async function loadStats() {
    try {
        const response = await apiRequest('/admin/stats');
        if (response.success) {
            document.getElementById('totalUsers').textContent = response.stats.total;
            document.getElementById('syncedUsers').textContent = response.stats.synced;
            document.getElementById('pendingUsers').textContent = response.stats.pending;
        }
    } catch (error) {
        // Error loading stats - handled silently
    }
}

async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users');
        if (response.success) {
            displayUsers(response.users);
            
            // Also populate package user dropdown
            const userSelect = document.getElementById('packageUserId');
            userSelect.innerHTML = '<option value="">Select User</option>';
            
            response.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                userSelect.appendChild(option);
            });
        }
    } catch (error) {
        // Error loading users - handled silently
    }
}

function displayUsers(users) {
    const userList = document.getElementById('userList');

    if (users.length === 0) {
        userList.innerHTML = '<p class="no-data">No users found</p>';
        return;
    }

    let html = '<table><thead><tr><th>Username</th><th>Created</th><th>Expires</th><th>Status</th><th>Synced At</th><th>Actions</th></tr></thead><tbody>';

    users.forEach(user => {
        const status = user.is_synced ? '<span class="badge badge-success">Synced</span>' : '<span class="badge badge-warning">Pending</span>';
        const createdAt = new Date(user.created_at).toLocaleString();
        const expiresAt = user.expires_at ? new Date(user.expires_at).toLocaleString() : 'Never';
        const syncedAt = user.synced_at ? new Date(user.synced_at).toLocaleString() : '-';

        html += `
          <tr>
            <td>${user.username}</td>
            <td>${createdAt}</td>
            <td>${expiresAt}</td>
            <td>${status}</td>
            <td>${syncedAt}</td>
            <td>
              <button class="btn btn-warning btn-sm reset-password-btn" data-user-id="${user.id}" data-username="${user.username}">Reset Password</button>
              <button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}" data-username="${user.username}">Delete</button>
            </td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    userList.innerHTML = html;

    // Add event listeners to dynamically created buttons
    document.querySelectorAll('.reset-password-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            resetUserPassword(userId, username);
        });
    });

    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            deleteUser(userId, username);
        });
    });
}

async function resetUserPassword(id, username) {
    const newPassword = prompt(`Enter new password for user "${username}":`);

    if (!newPassword) {
        return;
    }

    if (newPassword.length < 4) {
        await showError('Password must be at least 4 characters long', 'Invalid Password');
        return;
    }

    try {
        const response = await apiRequest(`/admin/users/${id}/password`, 'PUT', {
            newPassword
        });

        if (response.success) {
            await showSuccess(`Password updated successfully!\n\nUsername: ${username}\nNew Password: ${newPassword}\n\nPlease share this with the user.`, 'Password Updated');
        } else {
            await showError(response.message || 'Failed to update password', 'Update Failed');
        }
    } catch (error) {
        await showError('Error updating password', 'Network Error');
    }
}

async function deleteUser(id, username) {
    const confirmed = await showConfirm(
        `Are you sure you want to delete user "${username}"?`, 
        'Delete User', 
        'Delete', 
        'Cancel'
    );
    
    if (!confirmed) {
        return;
    }

    try {
        const response = await apiRequest(`/admin/users/${id}`, 'DELETE');
        if (response.success) {
            await showSuccess('User deleted successfully', 'User Deleted');
            loadUsers();
            loadStats();
        } else {
            await showError(response.message || 'Failed to delete user', 'Delete Failed');
        }
    } catch (error) {
        await showError('Error deleting user', 'Network Error');
    }
}

async function loadPasswordResetLogs() {
    try {
        const response = await apiRequest('/admin/password-reset-logs');
        if (response.success) {
            displayPasswordResetLogs(response.logs);
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

    let html = '<table><thead><tr><th>Username</th><th>IP Address</th><th>Date/Time</th><th>Status</th></tr></thead><tbody>';

    logs.forEach(log => {
        const status = log.success ? '<span class="badge badge-success">Success</span>' : '<span class="badge badge-danger">Failed</span>';
        const createdAt = new Date(log.created_at).toLocaleString();
        const username = log.username || 'Unknown';

        html += `
          <tr>
            <td>${username}</td>
            <td>${log.ip_address || '-'}</td>
            <td>${createdAt}</td>
            <td>${status}</td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    resetLogsList.innerHTML = html;
}

async function loadPackages() {
    try {
        const response = await apiRequest('/admin/packages');
        if (response.success) {
            const packageSelect = document.getElementById('packageId');
            packageSelect.innerHTML = '<option value="">Select Package</option>';
            
            response.packages.forEach(pkg => {
                const option = document.createElement('option');
                option.value = pkg.id;
                option.textContent = `${pkg.name} - ${pkg.amount} ብር`;
                packageSelect.appendChild(option);
            });
        }
    } catch (error) {
        // Error loading packages - handled silently
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'index.html';
}
