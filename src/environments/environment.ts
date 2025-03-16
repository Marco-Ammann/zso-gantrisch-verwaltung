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
    databaseURL?: string;  // Add optional databaseURL property
  };
  useEmulators?: boolean;
  emulators?: {
    auth: string;
    firestore: string;
    functions: string;
    storage: string;
  };
  skipEmailVerification?: boolean; // Add this property
}

export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyAOaY0iUTYfQDolJjeI35jKZw8n34qCfzM",
    authDomain: "zso-gantrisch-verwaltung.firebaseapp.com",
    databaseURL: "https://zso-gantrisch-verwaltung-default-rtdb.firebaseio.com",
    projectId: "zso-gantrisch-verwaltung",
    storageBucket: "zso-gantrisch-verwaltung.firebasestorage.app",
    messagingSenderId: "177544181049",
    appId: "1:177544181049:web:0144e7e882ac3c443424e8",
    measurementId: "G-QZDLMK6PRR"
  },
  skipEmailVerification: false // Set to true if you want to bypass email verification during development
};