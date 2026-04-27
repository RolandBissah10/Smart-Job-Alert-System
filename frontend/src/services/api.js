const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data.access_token;
}

async function request(path, options = {}, isRetry = false) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, { headers, ...options });

  if (response.status === 401 && !isRetry) {
    try {
      const newToken = await refreshAccessToken();
      return request(path, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      }, true);
    } catch {
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'API request failed');
  }

  return data;
}

export function signup(user) {
  return request('/users/signup', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export function login(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function getMe() {
  return request('/users/me');
}

export function updateProfile(profile) {
  return request('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export function resetProfile() {
  return request('/users/profile', { method: 'DELETE' });
}

export function getDashboard() {
  return request('/dashboard/');
}

export function fetchJobs() {
  return request('/jobs/scrape');
}

export function getJobFeed(page = 1, pageSize = 6) {
  return request(`/jobs/feed?page=${page}&page_size=${pageSize}`);
}

export function runPipeline() {
  return request('/jobs/run-pipeline', {
    method: 'POST',
  });
}

export function saveJob(jobId) {
  return request('/saved-jobs/', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  });
}

export function getSavedJobs() {
  return request('/saved-jobs/');
}

export function unsaveJob(jobId) {
  return request(`/saved-jobs/${jobId}`, {
    method: 'DELETE',
  });
}
