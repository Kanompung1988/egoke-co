	import { initializeApp } from "firebase/app";
			import { getAnalytics } from "firebase/analytics";
			const firebaseConfig = {
				apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
				authDomain: "egoke-7dae5.firebaseapp.com",
				projectId: "egoke-7dae5",
				storageBucket: "egoke-7dae5.firebasestorage.app",
				messagingSenderId: "910235640821",
				appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
				measurementId: "G-10MPJ3TPEB"
			};
			const app = initializeApp(firebaseConfig);
			const analytics = getAnalytics(app);