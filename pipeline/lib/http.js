const USER_AGENT =
  'random-knowledge-digest/1.0 (+https://github.com/charlottegosselin-projects/random-knowledge)';

// fetch with a timeout, a polite User-Agent and one retry on network errors / 5xx / 429.
export async function httpGet(url, { timeoutMs = 20000, accept, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...(accept ? { Accept: accept } : {}) },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if ((res.status >= 500 || res.status === 429) && attempt < retries) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      if (attempt >= retries || /^HTTP 4/.test(err.message)) throw err;
      await sleep(3000 * (attempt + 1));
    }
  }
}

export async function getText(url, opts) {
  return (await httpGet(url, opts)).text();
}

export async function getJson(url, opts) {
  return (await httpGet(url, { accept: 'application/json', ...opts })).json();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
