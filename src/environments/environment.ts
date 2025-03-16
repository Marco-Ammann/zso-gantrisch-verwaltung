export interface Environment {
  production: boolean;
  firebase: {
    projectId: string;
    appId: string;
    storageBucket: string;
    apiKey: string;
    authDomain: string;
    messagingSenderId: string;
    measurementId: string;
  };
  useEmulators?: boolean;
  emulators?: {
    auth: string;
    firestore: string;
    functions: string;
    storage: string;
  };
}

export const environment: Environment = {
  production: true,
  firebase: {
    projectId: 'zso-gantrisch-verwaltung',
    appId: '1:177544181049:web:0144e7e882ac3c443424e8',
    storageBucket: 'zso-gantrisch-verwaltung.firebasestorage.app',
    apiKey: 'AIzaSyAOaY0iUTYfQDolJjeI35jKZw8n34qCfzM',
    authDomain: 'zso-gantrisch-verwaltung.firebaseapp.com',
    messagingSenderId: '177544181049',
    measurementId: 'G-QZDLMK6PRR',
  },
  useEmulators: false
};