/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(url, method = 'GET', body = null) {
  const token = localStorage.getItem('adminToken');
  
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

  const response = await fetch(url, options);
  
  if (response.status === 401 || response.status === 403) {
    // Token expired or invalid
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'index.html';
    return;
  }

  return await response.json();
}
