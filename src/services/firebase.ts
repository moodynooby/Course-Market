// Mock Firebase configuration for demo
// Replace with actual Firebase config when ready

export const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "course-market-demo.firebaseapp.com",
  projectId: "course-market-demo",
  storageBucket: "course-market-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo-app-id"
};

// Auth helpers (mock implementation)
export const signInWithGoogle = async () => {
  console.log('Sign in with Google');
};

export const signInWithGithub = async () => {
  console.log('Sign in with GitHub');
};

export const signInWithPhone = async (phone: string) => {
  console.log('Sign in with phone:', phone);
};

export const signOut = async () => {
  console.log('Sign out');
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  callback(null);
  return () => {};
};