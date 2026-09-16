// The AIOps API. Defaults to 127.0.0.1:8000 — override with an
// environment variable if the backend runs elsewhere.
const BASE_URL =
  (typeof process !== "undefined" && process.env.AIOPS_API_URL) ||
  "http://127.0.0.1:8000";

/**
 * Lightweight fetch wrapper matching the axios API shape used by
 * the dashboard components. Throws a readable error when the
 * backend is unreachable so the UI can show what went wrong.
 */
async function request(method, url, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${url}`, options);
  } catch {
    throw new Error(
      `Cannot reach the AIOps API at ${BASE_URL}. ` +
        `Start the backend first:  cd backened && uvicorn app:app --port 8000`
    );
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((data) => data.detail || `HTTP ${response.status}`)
      .catch(() => `HTTP ${response.status}`);
    throw new Error(message);
  }

  return { data: await response.json() };
}

const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  patch: (url, body) => request("PATCH", url, body),
};

export default api;