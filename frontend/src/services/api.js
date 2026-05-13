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
  try {
    const token = localStorage.getItem('token');
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BASE_URL}${path}`, { headers, ...options });

    // Don't try to refresh token for login endpoint - 401 means invalid credentials
    if (response.status === 401 && !isRetry && path !== '/auth/login') {
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

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : { detail: await response.text() };

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not connect to backend at ${BASE_URL}. Check VITE_API_URL, CORS, and whether the Render service is live.`);
    }
    throw error;
  }
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

export function uploadCv(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/users/cv', {
    method: 'POST',
    body: formData,
  });
}

export function deleteCv() {
  return request('/users/cv', { method: 'DELETE' });
}

export function updateMatchSource(matchSource) {
  return request('/users/match-source', {
    method: 'PUT',
    body: JSON.stringify({ match_source: matchSource }),
  });
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
