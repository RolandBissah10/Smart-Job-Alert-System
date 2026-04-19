const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });

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

export function fetchJobs() {
  return request('/jobs/scrape');
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
