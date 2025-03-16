import { Environment } from './environment';

export const environment: Environment = {
  production: true,
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
  skipEmailVerification: false // Require email verification in production
};
