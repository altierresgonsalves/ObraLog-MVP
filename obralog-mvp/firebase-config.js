// Firebase Configuration
// REPLACE THE OBJECT BELOW WITH YOUR OWN KEYS FROM THE FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyDOh6JopTCjU5XrsGYG1v9CEMntq_KhU-o",
    authDomain: "obralog-mvp.firebaseapp.com",
    projectId: "obralog-mvp",
    storageBucket: "obralog-mvp.firebasestorage.app",
    messagingSenderId: "566834860352",
    appId: "1:566834860352:web:8901450e143bf82aa26aa5"
};

// Initialize Firebase (Compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const dbFirestore = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

console.log("Firebase Connected: obralog-mvp");
