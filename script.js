const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY", // โปรดใช้คีย์ของคุณ
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


document.addEventListener('DOMContentLoaded', () => {

    auth.onAuthStateChanged((user) => {
        const isMainPage = window.location.pathname.includes('main.html');

        if (user) {
            if (isMainPage) {
                fetchAndDisplayUserData(user);
            } else {

                window.location.href = "main.html";
            }
        } else {
            if (isMainPage) {
                window.location.href = "login_page.html";
            }
        }
    });


    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', loginWithGoogle);
    }

    // สำหรับหน้า Main
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

});


// --- Functions ---

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            checkAndCreateUser(user);
        })
        .catch((error) => {
            console.error("Login Error:", error);
        });
}

function checkAndCreateUser(user) {
    if (!user) return;
    const userRef = db.collection('users').doc(user.uid);

    userRef.get().then((doc) => {
        if (!doc.exists) {
            const newUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                points: 0 
            };
            userRef.set(newUser).then(() => {
                console.log("New user created in Firestore.");
            }).catch(error => console.error("Error creating user:", error));
        }
    }).catch((error) => {
        console.error("Error getting user document:", error);
    });
}

function fetchAndDisplayUserData(user) {
    const userRef = db.collection('users').doc(user.uid);
    const userNameEl = document.getElementById('userName');
    const userPointsEl = document.getElementById('userPoints');
    const userImageEl = document.getElementById('userImage'); // สำหรับรูปโปรไฟล์

    userRef.get().then((doc) => {
        if (doc.exists && userNameEl && userPointsEl) {
            const userData = doc.data();
            userNameEl.textContent = `${userData.displayName}`;
            userPointsEl.textContent = `${userData.points}`; // แสดงแค่ตัวเลข
            
            // แสดงรูปโปรไฟล์
            if(userImageEl && user.photoURL) {
                userImageEl.src = user.photoURL;
            }

        } else {
            console.log("No such user document or element not found!");
        }
    }).catch((error) => {
        console.error("Error fetching user data:", error);
    });
}

function logout() {
    auth.signOut().then(() => {
        console.log("User signed out.");
    }).catch((error) => {
        console.error("Sign out error:", error);
    });
}