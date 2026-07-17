import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

let adminAuthInstance: Auth | null = null;

const FIREBASE_ADMIN_CONFIG = {
  projectId: 'crm-whitelab',
  clientEmail: 'firebase-adminsdk-fbsvc@crm-whitelab.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDY/jtcoUuw/Ngj\nz0LOzo/2AcokMVodt2qP0o2cgqdUnbApT8qFrpxbLd+d/3bJcqUszUlPoUKwPgWk\nKnTxEEwlmBJyr7e7qPF5+ARsBFU4RooKIZaQamd1r3MxF8h9dbBmrobW6O2yaUUJ\ncl2XJ3XPMaqmSuePmxJ5mr7TANQbEUAu/vNvGmELxKqrfcClUU4EtV3UfsVhNLL+\nxjHS/1l+FAOh3oEaI8teqDgVfPOj8v+hbRXSx59EuO0ucZ0n5BuEpy2hiiopTsRT\n5YzjmiqrCT9zOdhLvxyMcJZT9gxGzupsL2D3gSjqwqVRQQRFIUzQODVOZoIpy9dH\ngVr2cRDtAgMBAAECggEAZpnvX6E0tP8ZA/WgVUD+eQfnmK1tOtfbHx4jr3lnvW7C\nOQZtcEBb1hEexwpgFGiNCV4X5/sMGWF6MWGR4doe5ze8oVXMvoLnixBmptx1nyJb\naubu1mI5gT/wa6ofNpNLUYH8Z+nDWrTD2++jqTETV2DYm8CXNSPR3IX67LJbmF/0\nl8eyGovFBWT+LbTgeWz0w/XFB1P0xc3Uzxd347LtcySEPxRQ8EMd0Pjn20hNQpG1\nXUY6aMxe1ImX5gLti545bqtBiXOPPog2YOM0nqDwpYSX4YqQv4RYpkWob8s/mtzo\n2VEvC+5FJx8cfhPhkyGtUPtj5sonIpUAUzHyhBFy0QKBgQD4BOP91Lvn/Ndskpl+\n2U5YeN807Nj/lv8fwmEzPMYLGCBTLmUQURPf/cGWqus4/aJZbo5QkEAmj4zR9kE4\n/KDmaKsA6Tolvr48+mjAyEimoZ3ltnMbq8SpaRk6Jy38vPkZSsiGlIzWcLV/Zzyb\ndEpDdES3qOvqowlZUIlYMyYQmwKBgQDf+cINed7KVupOGg5WoRt14rlej5t+qZKC\nYBS0E70dC33KIWLFghS6ExciQeO1mmTwfg0Ru/JgFOZ6D+I+T7aPHdzpkQvGAosR\nmdid9e58WZwDq6OGYXsoqnn4CVOl4D5oKTd2pbpAyUIW5t/2r7O1K+XV/ai9bEoe\nMtPg4AJpFwKBgA7ES8bLKbzwQutF9zmkOpPt7mw6RdlB5kK/0gW48pmqgBIzyvSj\nvykw9JvB5WtpPodQm8yUKh2homLF5LA96l6NkNDnEf05VB5RUndX9WtmZ/5LVKMr\nIPRtO4FI3+YSYkptN2873P7Pix7gyK0AyYMmowjEV/eKaX4V23eS5AtNAoGAPCDW\n4btH/lYbDOCd3M/fiWRWk3ZGLljjxjB5Hmb2LCf7mxofZBqp6dJaMY4yzXwngRC1\n/X7RcM3rmfVNraDEx+MifWm9GWlxYEZHCxEM90EvSyT2/4qH/8DUgawvUqbC2j/G\nbgnL2LyvC2rr0VQWEJs6VpqEhGXf9/95NjOtMf0CgYEA1z1HPY3MpNIqACELuxMc\n1+KJo/EXu70RqwzOBlwSHhDYgLqKA+MTCi4utm2F2CSfqOvMRHDNW+bbs2VsFG+B\n2XzaB6myM6HXD/nBrz+0W9hCQuhhmqFSN8URwwNtD0lo03k3l+9iYmpbhHZoov+0\nbfVty99MhgYkJMuFsj/kQlc=\n-----END PRIVATE KEY-----\n',
};

export function isAdminAvailable(): boolean {
  return true;
}

function getAdminApp() {
  if (getApps().length > 0) return getApp();

  return initializeApp({
    credential: cert({
      projectId: FIREBASE_ADMIN_CONFIG.projectId,
      clientEmail: FIREBASE_ADMIN_CONFIG.clientEmail,
      privateKey: FIREBASE_ADMIN_CONFIG.privateKey.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = getAdminApp();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}
