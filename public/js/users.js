// Early token validation to prevent malformed JWT errors
const token = localStorage.getItem('adminToken');
if (!token || !token.includes('.') || token.split('.').length !== 3) {
    redirectToLogin();
} else {
    initPage('users.html');
    // Load users on page load
    let allUsers = []; // Store all users for filtering
    loadUsers();
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayUsers(allUsers);
    } else {
        const filtered = allUsers.filter(user => {
            const username = (user.username || '').toLowerCase();
            const machineSerial = (user.machine_serial || '').toLowerCase();
            return username.includes(searchTerm) || machineSerial.includes(searchTerm);
        });
        displayUsers(filtered);
    }
});

// Create user form
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const machineSerial = document.getElementById('machineSerial').value.trim();
    const address = document.getElementById('userAddress').value.trim();
    const expiresInDays = document.getElementById('expiresInDays').value;

    // Validate machine serial
    if (!machineSerial) {
        showMessage('createMessage', 'Machine serial number is required', 'error');
        return;
    }

    try {
        const response = await apiRequest('/admin/users/create', 'POST', {
            username,
            password,
            machineSerial,
            address: address || null,
            expiresInDays: expiresInDays ? parseInt(expiresInDays) : null
        });

        if (response.success) {
            showMessage('createMessage', 'User created successfully!', 'success');
            document.getElementById('createUserForm').reset();
            loadUsers();
        } else {
            showMessage('createMessage', response.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        showMessage('createMessage', 'Error creating user', 'error');
    }
});

// Refresh button
document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);

// Load users function
async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users');
        if (response.success) {
            allUsers = response.users; // Store for filtering
            displayUsers(allUsers);
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

    let html = '<table class="data-table"><thead><tr><th>Username</th><th>Address</th><th>Phone</th><th>Machine Serial</th><th>Current Balance</th><th>Pending Packages</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    users.forEach(user => {
        const status = user.is_synced ? '<span class="badge badge-success">Synced</span>' : '<span class="badge badge-warning">Pending</span>';
        const createdAt = new Date(user.created_at).toLocaleString();
        const machineSerial = user.machine_serial || '<span style="color: #999;">Not registered</span>';
        const address = user.address || '<span style="color: #999;">N/A</span>';
        const phone = user.phone || '<span style="color: #999;">N/A</span>';
        const currentBalance = user.current_balance || 0;
        const pendingBalance = user.pending_balance || 0;
        const balanceUpdated = user.balance_updated_at ? new Date(user.balance_updated_at).toLocaleString() : 'Never';

        html += `
          <tr>
            <td>${user.username}</td>
            <td>${address}</td>
            <td>${phone}</td>
            <td>${machineSerial}</td>
            <td>
              <strong style="color: #667eea; font-size: 1.1em;">${currentBalance} ብር</strong>
              <br><small style="color: #999;">Updated: ${balanceUpdated}</small>
            </td>
            <td>${pendingBalance > 0 ? '<span style="color: #10b981; font-weight: 600;">' + pendingBalance + ' ብር</span>' : '0 ብር'}</td>
            <td>${createdAt}</td>
            <td>${status}</td>
            <td>
              <button class="btn btn-primary btn-sm edit-user-btn" data-user-id="${user.id}" data-username="${user.username}" data-address="${user.address || ''}" data-phone="${user.phone || ''}">Edit Info</button>
              <button class="btn btn-warning btn-sm reset-password-btn" data-user-id="${user.id}" data-username="${user.username}">Reset Password</button>
              <button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}" data-username="${user.username}">Delete</button>
            </td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    userList.innerHTML = html;

    // Add event listeners to dynamically created buttons
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            const address = this.getAttribute('data-address');
            const phone = this.getAttribute('data-phone');
            editUser(userId, username, address, phone);
        });
    });

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
        } else {
            await showError(response.message || 'Failed to delete user', 'Delete Failed');
        }
    } catch (error) {
        await showError('Error deleting user', 'Network Error');
    }
}

async function editUser(id, currentUsername, currentAddress, currentPhone) {
    // Create a modal dialog for editing user data
    const modalHtml = `
        <div id="editUserModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            ">
                <h3 style="margin-top: 0; color: #333; text-align: center;">Edit User Information</h3>
                <form id="editUserForm">
                    <div style="margin-bottom: 20px;">
                        <label for="editUsername" style="display: block; margin-bottom: 5px; font-weight: bold;">Username:</label>
                        <input type="text" id="editUsername" value="${currentUsername}" readonly style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 16px;
                            box-sizing: border-box;
                            background-color: #f5f5f5;
                            color: #666;
                            cursor: not-allowed;
                        ">
                        <small style="color: #666; font-style: italic;">Username cannot be changed for security reasons</small>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label for="editAddress" style="display: block; margin-bottom: 5px; font-weight: bold;">Address:</label>
                        <input type="text" id="editAddress" value="${currentAddress}" placeholder="Enter user address" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label for="editPhone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number:</label>
                        <input type="tel" id="editPhone" value="${currentPhone || ''}" placeholder="Enter phone number" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div id="editMessage" class="message" style="margin-bottom: 15px;"></div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" id="cancelEditBtn" style="
                            padding: 10px 20px;
                            border: 1px solid #ddd;
                            background: #f8f9fa;
                            color: #333;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        ">Cancel</button>
                        <button type="submit" style="
                            padding: 10px 20px;
                            border: none;
                            background: #007bff;
                            color: white;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        ">Update Information</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Handle form submission
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newAddress = document.getElementById('editAddress').value.trim();
        const newPhone = document.getElementById('editPhone').value.trim();

        try {
            const response = await apiRequest(`/admin/users/${id}`, 'PUT', {
                address: newAddress || null,
                phone: newPhone || null
            });

            if (response.success) {
                showMessage('editMessage', 'User information updated successfully!', 'success');
                setTimeout(() => {
                    closeEditModal();
                    loadUsers(); // Refresh the user list
                }, 1500);
            } else {
                showMessage('editMessage', response.message || 'Failed to update user', 'error');
            }
        } catch (error) {
            showMessage('editMessage', 'Error updating user', 'error');
        }
    });

    // Handle cancel button
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);

    // Handle clicking outside modal
    document.getElementById('editUserModal').addEventListener('click', (e) => {
        if (e.target.id === 'editUserModal') {
            closeEditModal();
        }
    });

    function closeEditModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.remove();
        }
    }
}