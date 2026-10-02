// API Configuration
// Production backend is served by the same Render Python service.
const BACKEND_URL = 'https://projects-2-s7ee.onrender.com';

const host = window.location.hostname;
const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('10.') ||
    host.startsWith('192.') ||
    host.startsWith('172.');

export const API_BASE = isLocal ? '' : BACKEND_URL;
