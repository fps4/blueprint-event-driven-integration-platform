import { paths } from 'src/routes/paths';

import axios, { authClient } from 'src/lib/axios';

import { JWT_STORAGE_KEY, JWT_USER_STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export function jwtDecode(token) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded || !('exp' in decoded)) {
      return false;
    }

    const currentTime = Date.now() / 1000;

    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Error during token validation:', error);
    return false;
  }
}

// ----------------------------------------------------------------------

export function tokenExpired(exp) {
  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;

  setTimeout(() => {
    sessionStorage.removeItem(JWT_STORAGE_KEY);
    sessionStorage.removeItem(JWT_USER_STORAGE_KEY);
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const query = new URLSearchParams({ returnTo }).toString();
    const loginUrl = `${paths.auth.jwt.signIn}?${query}`;
    window.location.replace(loginUrl);
  }, timeLeft);
}

// ----------------------------------------------------------------------

export async function setSession(accessToken) {
  try {
    if (accessToken) {
      sessionStorage.setItem(JWT_STORAGE_KEY, accessToken);

      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      authClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const decodedToken = jwtDecode(accessToken); // ~3 days by minimals server

      if (decodedToken && 'exp' in decodedToken) {
        tokenExpired(decodedToken.exp);
      } else {
        throw new Error('Invalid access token!');
      }
    } else {
      sessionStorage.removeItem(JWT_STORAGE_KEY);
      sessionStorage.removeItem(JWT_USER_STORAGE_KEY);
      delete axios.defaults.headers.common.Authorization;
      delete authClient.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('Error during set session:', error);
    throw error;
  }
}

export function setStoredUser(user) {
  if (user) {
    sessionStorage.setItem(JWT_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(JWT_USER_STORAGE_KEY);
  }
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(JWT_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error parsing stored user:', error);
    sessionStorage.removeItem(JWT_USER_STORAGE_KEY);
    return null;
  }
}
