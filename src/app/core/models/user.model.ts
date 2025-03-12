export interface User {
    uid: string;
    email: string;
    displayName?: string;
    role: 'admin' | 'oberleutnant' | 'leutnant' | 'korporal' | 'leserecht';
  }