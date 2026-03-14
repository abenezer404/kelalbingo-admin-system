// Early token validation to prevent malformed JWT errors
const token = localStorage.getItem('adminToken');
if (!token || !token.includes('.') || token.split('.').length !== 3) {
    redirectToLogin();
} else {
    initPage('packages.html');
    // Load initial data
    let allAssignments = [];
    loadUsers();
    loadPackages();
    loadPackagesList();
    loadPackageAssignments();
}

// Assign package form
document.getElementById('assignPackageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('packageUserId').value;
    const packageId = document.getElementById('packageId').value;

    try {
        const response = await apiRequest('/admin/packages/assign', 'POST', {
            userId: parseInt(userId),
            packageId: parseInt(packageId)
        });

        if (response.success) {
            showMessage('packageMessage', `Package assigned successfully! Amount: ${response.packageAssignment.amount} ብር`, 'success');
            document.getElementById('assignPackageForm').reset();
            loadPackageAssignments();
        } else {
            showMessage('packageMessage', response.message || 'Failed to assign package', 'error');
        }
    } catch (error) {
        showMessage('packageMessage', 'Error assigning package', 'error');
    }
});

// Custom balance adjustment form
document.getElementById('customBalanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('customUserId').value;
    const amount = parseFloat(document.getElementById('customAmount').value);
    const reason = document.getElementById('customReason').value;

    if (amount === 0) {
        showMessage('customBalanceMessage', 'Amount cannot be zero', 'error');
        return;
    }

    try {
        const response = await apiRequest('/admin/balance/adjust', 'POST', {
            userId: parseInt(userId),
            amount: amount,
            reason: reason
        });

        if (response.success) {
            const action = amount > 0 ? 'added' : 'deducted';
            const absAmount = Math.abs(amount);
            showMessage('customBalanceMessage', `Balance ${action} successfully! Amount: ${absAmount} ብር`, 'success');
            document.getElementById('customBalanceForm').reset();
            loadPackageAssignments();
        } else {
            showMessage('customBalanceMessage', response.message || 'Failed to adjust balance', 'error');
        }
    } catch (error) {
        showMessage('customBalanceMessage', 'Error adjusting balance', 'error');
    }
});

// Load users for dropdown
async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users');
        if (response.success) {
            // Populate package assignment dropdown
            const userSelect = document.getElementById('packageUserId');
            userSelect.innerHTML = '<option value="">Select User</option>';
            
            // Populate custom balance dropdown
            const customUserSelect = document.getElementById('customUserId');
            customUserSelect.innerHTML = '<option value="">Select User</option>';
            
            response.users.forEach(user => {
                // Package assignment dropdown
                const option1 = document.createElement('option');
                option1.value = user.id;
                option1.textContent = `${user.username} (${user.machine_serial || 'No Serial'})`;
                userSelect.appendChild(option1);
                
                // Custom balance dropdown
                const option2 = document.createElement('option');
                option2.value = user.id;
                option2.textContent = `${user.username} (${user.machine_serial || 'No Serial'})`;
                customUserSelect.appendChild(option2);
            });
        }
    } catch (error) {
        // Error loading users - handled silently
    }
}

// Load packages for dropdown
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

// Load and display packages list
async function loadPackagesList() {
    try {
        const response = await apiRequest('/admin/packages');
        if (response.success) {
            displayPackagesList(response.packages);
        }
    } catch (error) {
        // Error loading packages list - handled silently
    }
}

function displayPackagesList(packages) {
    const packagesList = document.getElementById('packagesList');

    if (packages.length === 0) {
        packagesList.innerHTML = '<p class="no-data">No packages found</p>';
        return;
    }

    let html = '<table class="data-table"><thead><tr><th>Name</th><th>Amount</th><th>Description</th><th>Status</th></tr></thead><tbody>';

    packages.forEach(pkg => {
        const status = pkg.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
        
        html += `
          <tr>
            <td>${pkg.name}</td>
            <td>${pkg.amount} ብር</td>
            <td>${pkg.description || '-'}</td>
            <td>${status}</td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    packagesList.innerHTML = html;
}

// Refresh assignments button
document.getElementById('refreshAssignmentsBtn').addEventListener('click', loadPackageAssignments);

// Search functionality for assignments
document.getElementById('searchAssignments').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayPackageAssignments(allAssignments);
    } else {
        const filtered = allAssignments.filter(assignment => {
            const username = (assignment.username || '').toLowerCase();
            const machineSerial = (assignment.machine_serial || '').toLowerCase();
            return username.includes(searchTerm) || machineSerial.includes(searchTerm);
        });
        displayPackageAssignments(filtered);
    }
});

// Load package assignments
async function loadPackageAssignments() {
    try {
        const response = await apiRequest('/admin/package-assignments');
        if (response.success) {
            allAssignments = response.assignments;
            displayPackageAssignments(allAssignments);
        } else {
            document.getElementById('assignmentsList').innerHTML = '<p class="no-data">Unable to load package assignments</p>';
        }
    } catch (error) {
        // Error loading package assignments - show error in UI
        document.getElementById('assignmentsList').innerHTML = '<p class="no-data">Error loading package assignments</p>';
    }
}

function displayPackageAssignments(assignments) {
    const assignmentsList = document.getElementById('assignmentsList');

    if (assignments.length === 0) {
        assignmentsList.innerHTML = '<p class="no-data">No package assignments found</p>';
        return;
    }

    let html = '<table class="data-table"><thead><tr><th>Username</th><th>Machine Serial</th><th>Type</th><th>Amount</th><th>Assigned By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    assignments.forEach(assignment => {
        const createdAt = new Date(assignment.created_at).toLocaleString();
        const username = assignment.username || 'Unknown';
        const machineSerial = assignment.machine_serial || '-';
        const status = assignment.is_redeemed 
            ? '<span class="badge badge-success">Redeemed</span>' 
            : '<span class="badge badge-warning">Pending</span>';
        
        // Determine type based on package_name and amount
        let type = assignment.package_name || 'Custom Adjustment';
        if (!assignment.package_name) {
            type = assignment.amount > 0 ? 'Balance Addition' : 'Balance Deduction';
        }
        
        // Color code the amount
        const amountColor = assignment.amount < 0 ? 'color: red;' : '';
        const amountDisplay = `<span style="${amountColor}">${assignment.amount} ብር</span>`;

        // Actions column - only show cancel button for pending packages
        let actionsHtml = '-';
        if (!assignment.is_redeemed) {
            actionsHtml = `<button class="btn btn-danger btn-sm cancel-package-btn" data-assignment-id="${assignment.id}" data-username="${username}" data-amount="${assignment.amount}">Cancel</button>`;
        }

        html += `
          <tr>
            <td>${username}</td>
            <td>${machineSerial}</td>
            <td>${type}</td>
            <td>${amountDisplay}</td>
            <td>${assignment.assigned_by || '-'}</td>
            <td>${createdAt}</td>
            <td>${status}</td>
            <td>${actionsHtml}</td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    assignmentsList.innerHTML = html;

    // Add event listeners to cancel buttons
    document.querySelectorAll('.cancel-package-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const assignmentId = this.getAttribute('data-assignment-id');
            const username = this.getAttribute('data-username');
            const amount = this.getAttribute('data-amount');
            cancelPendingPackage(assignmentId, username, amount);
        });
    });
}

// Cancel pending package function
async function cancelPendingPackage(assignmentId, username, amount) {
    const actionText = amount > 0 ? 'addition' : 'deduction';
    const absAmount = Math.abs(amount);
    
    const confirmed = await showConfirm(
        `Are you sure you want to cancel this ${actionText} of ${absAmount} ብር for user "${username}"?\n\nThis will permanently remove it from the pending list.`,
        'Cancel Package',
        'Yes, Cancel',
        'No, Keep'
    );
    
    if (!confirmed) {
        return;
    }

    try {
        const response = await apiRequest('/admin/packages/cancel', 'POST', {
            packageAssignmentId: parseInt(assignmentId)
        });

        if (response.success) {
            showMessage('packageMessage', `Package cancelled successfully! ${actionText} of ${absAmount} ብር removed from pending list.`, 'success');
            loadPackageAssignments(); // Refresh the list
        } else {
            showMessage('packageMessage', response.message || 'Failed to cancel package', 'error');
        }
    } catch (error) {
        showMessage('packageMessage', 'Error cancelling package', 'error');
    }
}