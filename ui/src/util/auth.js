import * as axios from 'axios';
import * as jwtdecode from 'jwt-decode';
import Cookies from 'js-cookie'

export function getJwt() {
  try {
    return jwtdecode(Cookies.get('jwt'));
  } catch(e) {
    return null;
  }
}

export function getRoles() {
  const jwt = getJwt();
  return (jwt && jwt.roles) || [];
}

export function isLoggedIn() {
  const jwt = getJwt();
  return jwt && jwt.expires && new Date(jwt.expires).getTime() > new Date().getTime();
}

export function logout() {
  Cookies.remove('jwt');
}

export async function validateJwt() {
  return axios.post('/api/auth/validate')
    .then(() => true)
    .catch(() => false);
}

export function isOfficer() {
  return getRoles().includes('OFFICER') || isSuperuser();
}

export function isSuperuser() {
  return getRoles().includes('SUPERUSER');
}
