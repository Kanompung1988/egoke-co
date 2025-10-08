const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // <-- กรุณาใส่ Key จริงของคุณ
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
    measurementId: "G-10MPJ3TPEB"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const userInfoDiv = document.getElementById('userInfo');
const userNameH2 = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const userPointsSpan = document.getElementById('userPoints');

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            handleUserData(user);
        })
        .catch((error) => {
            console.error("Error during login:", error);
        });
}

loginButton.addEventListener('click', loginWithGoogle);
logoutButton.addEventListener('click', logout);

function handleUserData(user) {
    if (!user) return;
    const userRef = db.collection('users').doc(user.uid);
    userRef.get().then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            updateUI(userData);
        } else {
            const newUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                points: 0
            };
            userRef.set(newUser).then(() => {
                updateUI(newUser);
            });
        }
    }).catch((error) => {
        console.error("Error getting user document:", error);
    });
};

function updateUI(userData) {
    loginButton.style.display = 'none';
    userInfoDiv.style.display = 'block';
    userNameH2.textContent = `สวัสดี, ${userData.displayName}`;
    userEmailSpan.textContent = userData.email;
    userPointsSpan.textContent = userData.points;
};

auth.onAuthStateChanged((user) => {
    if (user) {
        handleUserData(user);
    } else {
        loginButton.style.display = 'block';
        userInfoDiv.style.display = 'none';
    }
});

function logout() {
    auth.signOut().catch((error) => {
        console.error("Sign out error:", error);
    });
};