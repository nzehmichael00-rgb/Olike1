import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Copy, 
  TrendingUp, 
  Wallet, 
  Coins, 
  ArrowUpRight, 
  ShieldAlert, 
  Share2, 
  Megaphone, 
  Plus, 
  ChevronRight, 
  ShoppingBag, 
  User, 
  Layers, 
  DollarSign, 
  Bell, 
  Award, 
  Trophy,
  Search, 
  Upload, 
  Play, 
  HelpCircle, 
  CheckCircle,
  ExternalLink,
  Info,
  LogOut,
  Smartphone,
  Home,
  Trash,
  Shield
} from 'lucide-react';
import { SocialTask, MarketplaceItem, WalletTransaction, OperationType, FirestoreErrorInfo } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  db, 
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot 
} from "./firebase";

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


// Seed initial values for offline-first resilience
const INITIAL_TASKS: SocialTask[] = [];

const INITIAL_MARKETPLACE: MarketplaceItem[] = [];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [];

const INITIAL_SUBMISSIONS: any[] = [];

const NIGERIAN_BANKS = [
  "Guaranty Trust Bank (GTBank)",
  "Zenith Bank Plc",
  "Access Bank",
  "Kuda Microfinance Bank",
  "OPay Digital Services",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria (FirstBank)",
  "Sterling Bank",
  "Wema Bank / ALAT",
  "Stanbic IBTC Bank",
  "Union Bank of Nigeria",
  "Fidelity Bank Plc",
  "Moniepoint Microfinance Bank",
  "PalmPay Limited",
  "Ecobank Nigeria",
  "First City Monument Bank (FCMB)",
  "Keystone Bank",
  "Polaris Bank Plc",
  "Providus Bank Plc",
  "Taj Bank",
  "Jaiz Bank",
  "Signature Bank",
  "Globus Bank",
  "Titan Trust Bank",
  "Standard Chartered Bank",
  "CitiBank Nigeria"
];

const PLATFORM_ACTIONS: Record<string, { value: string; label: string }[]> = {
  Instagram: [
    { value: 'Follow', label: 'Followers / Subscriptions' },
    { value: 'Like', label: 'Post Likes / Hearts' },
    { value: 'Comment', label: 'Custom Creative Review' }
  ],
  Twitter: [
    { value: 'Follow', label: 'Followers / Subscriptions' },
    { value: 'Like', label: 'Post Likes / Hearts' },
    { value: 'Retweet', label: 'Repost / Retweets' },
    { value: 'Comment', label: 'Custom Creative Review' }
  ],
  TikTok: [
    { value: 'Follow', label: 'Followers / Subscriptions' },
    { value: 'Like', label: 'Post Likes / Hearts' },
    { value: 'Comment', label: 'Custom Creative Review' }
  ],
  YouTube: [
    { value: 'Subscribe', label: 'Subscribe Channel' },
    { value: 'Like', label: 'Post Likes / Hearts' },
    { value: 'Comment', label: 'Custom Creative Review' }
  ],
  WhatsApp: [
    { value: 'Post', label: 'Status Advertisement Posts' },
    { value: 'Follow', label: 'Join Group or Channel' }
  ],
  Website: [
    { value: 'View Website', label: 'View Website' }
  ]
};

export default function App() {
  // Navigation tabs: 'overview' | 'tasks' | 'advertise' | 'wallet' | 'marketplace' | 'admin'
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'advertise' | 'wallet' | 'marketplace' | 'admin'>('overview');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authScreen, setAuthScreen] = useState<'landing' | 'login' | 'signup' | 'forgot_password'>('landing');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email/Password inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');

  // Notifications & Referral states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [referralCodeInput, setReferralCodeInput] = useState<string>('');
  const [userReferralCode, setUserReferralCode] = useState<string>('');

  // State synchronized with Firebase Firestore
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState<number>(0.00);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isProfileAdmin, setIsProfileAdmin] = useState<boolean>(false);
  const [paidOnetimeFee, setPaidOnetimeFee] = useState<boolean>(false);
  const [referees, setReferees] = useState<any[]>([]);
  const isUserAdmin = currentUser?.email === 'nzehmichael00@gmail.com' || (currentUser?.email?.toLowerCase()?.includes('admin') ?? false) || isProfileAdmin;
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [pricingGrid, setPricingGrid] = useState<any[]>([
    { id: 'Follow', label: 'Follow Profile', advertiserRate: 15.00, earnerRate: 6.00 },
    { id: 'Like', label: 'Like/Heart', advertiserRate: 8.00, earnerRate: 3.20 },
    { id: 'Retweet', label: 'Retweet Pin', advertiserRate: 12.00, earnerRate: 4.80 },
    { id: 'Post', label: 'Post on Status/Story', advertiserRate: 120.00, earnerRate: 48.00 },
    { id: 'Subscribe', label: 'Subscribe Channel', advertiserRate: 25.00, earnerRate: 10.00 },
    { id: 'Comment', label: 'Comment Review', advertiserRate: 15.00, earnerRate: 6.00 },
    { id: 'View Website', label: 'View Website', advertiserRate: 10.00, earnerRate: 4.00 },
  ]);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper for generating last 7 days for the recharts daily earnings visualization
  const getEarningsChartData = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push({
        dateObj: d,
        dateString: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        amount: 0
      });
    }
    
    transactions.forEach(tx => {
      if (tx.type !== 'earn') return;
      
      let txDateStr = tx.date;
      if (txDateStr === 'Today') {
        txDateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      const match = days.find(day => {
        const dayStrClean = day.dateString.replace(/\s+/g, ' ');
        const txStrClean = txDateStr.replace(/\s+/g, ' ');
        return dayStrClean === txStrClean;
      });
      
      if (match) {
        match.amount += tx.amount;
      } else {
        try {
          const txDate = new Date(txDateStr);
          if (!isNaN(txDate.getTime())) {
            const matchedDay = days.find(day => {
              return day.dateObj.getDate() === txDate.getDate() &&
                     day.dateObj.getMonth() === txDate.getMonth();
            });
            if (matchedDay) {
              matchedDay.amount += tx.amount;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    });
    
    return days.map(d => ({
      name: d.label,
      Earnings: d.amount
    }));
  };

  // Paystack verification effect for callback query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;

    // Small helper to verify
    const verifyPaystackTrx = async () => {
      if (!currentUser) return; // Wait until authenticated user is ready
      
      showToast("Verifying Paystack payment reference...");
      try {
        const verifyRes = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
        const verifyData = await verifyRes.json();
        
        if (verifyData && verifyData.success) {
          const verifiedAmount = verifyData.amount;
          const uid = currentUser.uid;
          
          const userProfileRef = doc(db, "profiles", uid);
          const userProfileSnap = await getDoc(userProfileRef);
          let currentBalance = balance;
          if (userProfileSnap.exists()) {
            currentBalance = userProfileSnap.data().balance ?? 0;
          }
          
          const newBalance = currentBalance + verifiedAmount;
          
          // Update profile balance
          await setDoc(userProfileRef, { 
            name: currentUser.displayName || currentUser.email?.split('@')[0] || "Olike Member",
            balance: newBalance, 
            isPremium,
            email: currentUser.email || ""
          }, { merge: true });
          
          // Save successful transaction to list
          const txId = reference;
          const newTx: WalletTransaction = {
            id: txId,
            description: 'Wallet Deposit Credit (Paystack)',
            amount: verifiedAmount,
            type: 'deposit',
            date: 'Today',
            status: 'successful',
            userId: currentUser.uid
          };
          await setDoc(doc(db, "transactions", txId), newTx);
          
          showToast(`Success! Wallet credited with ₦${verifiedAmount.toLocaleString()} via Paystack.`);
          
          // Strip parameters from URL cleanly
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        } else {
          // Silent log or toast if reference was already processed
          console.log("Paystack reference already processed or invalid:", verifyData.error);
          // Strip parameters anyway
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        }
      } catch (err) {
        console.error("Paystack verification error:", err);
      }
    };

    verifyPaystackTrx();
  }, [currentUser]);

  // Preload Paystack SDK for any other fallback usecases
  useEffect(() => {
    if (!(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Handle Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthScreen('landing');
      } else {
        // Only reset if it is not a sandbox/demo mock login session
        setCurrentUser(prev => {
          if (prev && (prev.uid.startsWith('sandbox-') || prev.uid.startsWith('demo-'))) {
            return prev; // Retain mock user
          }
          return null;
        });
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initial seeding and real-time synchronization with Cloud Firestore
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubProfile: () => void;
    let unsubTasks: () => void;
    let unsubMarket: () => void;
    let unsubTx: () => void;
    let unsubSavedAccounts: () => void;
    let unsubPricing: () => void;
    let unsubNotifications: () => void;
    let unsubReferees: () => void;
    let unsubLeaderboard: () => void;
    
    const initAndListen = async () => {
      try {
        setLoading(true);
        const uid = currentUser.uid;
        const isUserAdminEmail = currentUser.email === 'nzehmichael00@gmail.com' || (currentUser.email?.toLowerCase()?.includes('admin') ?? false);

        // 1. Seed user profile if missing
        const profileDocRef = doc(db, "profiles", uid);
        const profileSnap = await getDoc(profileDocRef);
        if (!profileSnap.exists()) {
          const defaultName = currentUser.displayName || currentUser.email?.split('@')[0] || "Olike Member";
          const cleanName = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const derivedCode = `${cleanName}_${Math.floor(10 + Math.random() * 90)}`;
          await setDoc(profileDocRef, { 
            name: defaultName,
            balance: 0.00, 
            isPremium: uid.includes('premium') || isUserAdminEmail,
            isAdmin: isUserAdminEmail,
            email: currentUser.email || "",
            referralCode: derivedCode,
            paidOnetimeFee: false
          });
          // Register public referral mapping
          await setDoc(doc(db, "referral_codes", derivedCode), {
            userId: uid,
            name: defaultName
          });
          setUserReferralCode(derivedCode);
        } else {
          const pData = profileSnap.data();
          if (isUserAdminEmail && !pData?.isAdmin) {
            await setDoc(profileDocRef, { isAdmin: true, isPremium: true }, { merge: true });
          }
          let code = pData?.referralCode;
          if (!code) {
            const cleanName = (pData?.name || "member").toLowerCase().replace(/[^a-z0-9]/g, '');
            code = `${cleanName}_${Math.floor(10 + Math.random() * 90)}`;
            await setDoc(profileDocRef, { referralCode: code }, { merge: true });
          }
          // Sync with public referral mapping on session init
          await setDoc(doc(db, "referral_codes", code), {
            userId: uid,
            name: pData?.name || currentUser.displayName || "Olike Member"
          });
          setUserReferralCode(code);
        }

        // 2. Seed tasks if empty
        const tasksSnap = await getDocs(collection(db, "tasks"));
        if (tasksSnap.empty) {
          for (const t of INITIAL_TASKS) {
            await setDoc(doc(db, "tasks", t.id), t);
          }
        }

        // 3. Seed marketplace if empty
        const marketSnap = await getDocs(collection(db, "marketplace"));
        if (marketSnap.empty) {
          for (const item of INITIAL_MARKETPLACE) {
            await setDoc(doc(db, "marketplace", item.id), item);
          }
        }

        // 4. Seed transactions if empty
        const txSnap = await getDocs(collection(db, "transactions"));
        if (txSnap.empty) {
          for (const tx of INITIAL_TRANSACTIONS) {
            await setDoc(doc(db, "transactions", tx.id), tx);
          }
        }

        // 5. Seed submissions if empty (Admin only)
        if (isUserAdminEmail) {
          const subsSnap = await getDocs(collection(db, "submissions"));
          if (subsSnap.empty) {
            for (const sub of INITIAL_SUBMISSIONS) {
              await setDoc(doc(db, "submissions", sub.id), sub);
            }
          }
        }

        // Set up real time subscriptions to Firestore collections
        unsubProfile = onSnapshot(doc(db, "profiles", uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setBalance(data.balance ?? 0.00);
            setIsPremium(data.isPremium ?? false);
            setIsProfileAdmin(data.isAdmin ?? false);
            setIsBlocked(data.blocked ?? false);
            setPaidOnetimeFee(data.paidOnetimeFee ?? false);
            setProfileName(data.name ?? data.email ?? 'Olike User');
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `profiles/${uid}`);
        });

        // Listen to referees
        const refereesQuery = query(collection(db, "profiles"), where("referredBy.id", "==", uid));
        unsubReferees = onSnapshot(refereesQuery, (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setReferees(list);
        }, (error) => {
          console.error("Referees listener error:", error);
        });

        // Listen to leaderboards
        const leaderboardQuery = query(collection(db, "leaderboards"), orderBy("referralCount", "desc"));
        unsubLeaderboard = onSnapshot(leaderboardQuery, (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setLeaderboard(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "leaderboards");
        });

        // Live config pricing grid listener
        unsubPricing = onSnapshot(doc(db, "config", "pricing"), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.grid) {
              setPricingGrid(data.grid);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "config/pricing");
        });

        unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
          const list: SocialTask[] = [];
          snap.forEach((docSnap) => {
            list.push(docSnap.data() as SocialTask);
          });
          setTasks(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "tasks");
        });

        unsubMarket = onSnapshot(collection(db, "marketplace"), (snap) => {
          const list: MarketplaceItem[] = [];
          snap.forEach((docSnap) => {
            list.push(docSnap.data() as MarketplaceItem);
          });
          setMarketplace(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "marketplace");
        });

        const txQuery = query(collection(db, "transactions"), where("userId", "==", uid));
        unsubTx = onSnapshot(txQuery, (snap) => {
          const list: WalletTransaction[] = [];
          snap.forEach((docSnap) => {
            list.push(docSnap.data() as WalletTransaction);
          });
          // Keep transactions chronologically consistent
          setTransactions(list.sort((a, b) => b.id.localeCompare(a.id)));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "transactions");
        });

        // Listen for user's saved bank accounts in Firestore
        unsubSavedAccounts = onSnapshot(collection(db, "profiles", uid, "saved_accounts"), (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setSavedAccounts(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `profiles/${uid}/saved_accounts`);
        });

        // Listen for user's notifications in Firestore
        unsubNotifications = onSnapshot(collection(db, "profiles", uid, "notifications"), (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setNotifications(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `profiles/${uid}/notifications`);
        });

        setLoading(false);
      } catch (err) {
        console.error("Critical error in Firestore initialization:", err);
        setLoading(false);
      }
    };

    initAndListen();

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubTasks) unsubTasks();
      if (unsubMarket) unsubMarket();
      if (unsubTx) unsubTx();
      if (unsubSavedAccounts) unsubSavedAccounts();
      if (unsubPricing) unsubPricing();
      if (unsubNotifications) unsubNotifications();
      if (unsubReferees) unsubReferees();
      if (unsubLeaderboard) unsubLeaderboard();
    };
  }, [currentUser]);

  // Keep the user's public leaderboard document synchronized automatically
  useEffect(() => {
    if (!currentUser) return;
    const updateLeaderboardStats = async () => {
      try {
        const successfulCount = referees.filter(ref => ref.paidOnetimeFee === true).length;
        const nameToUse = profileName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Olike Member';
        await setDoc(doc(db, "leaderboards", currentUser.uid), {
          userId: currentUser.uid,
          name: nameToUse,
          referralCount: successfulCount,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leaderboards/${currentUser.uid}`);
      }
    };
    
    const timer = setTimeout(() => {
      updateLeaderboardStats();
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentUser, profileName, referees]);

  // Admin-only real-time database subscriptions
  useEffect(() => {
    if (!currentUser || !isUserAdmin) {
      setAllProfiles([]);
      setSubmissions([]);
      setAllTransactions([]);
      return;
    }

    let unsubAllProfiles: () => void;
    let unsubSubmissions: () => void;
    let unsubAllTransactions: () => void;

    try {
      unsubAllProfiles = onSnapshot(collection(db, "profiles"), (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAllProfiles(list);
      }, (error) => {
        console.error("Admin profiles listener error:", error);
      });

      unsubSubmissions = onSnapshot(collection(db, "submissions"), (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setSubmissions(list.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id)));
      }, (error) => {
        console.error("Admin submissions listener error:", error);
      });

      unsubAllTransactions = onSnapshot(collection(db, "transactions"), (snap) => {
        const list: WalletTransaction[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as WalletTransaction);
        });
        setAllTransactions(list.sort((a, b) => b.id.localeCompare(a.id)));
      }, (error) => {
        console.error("Admin transactions listener error:", error);
      });
    } catch (err) {
      console.error("Admin listeners subscription error:", err);
    }

    return () => {
      if (unsubAllProfiles) unsubAllProfiles();
      if (unsubSubmissions) unsubSubmissions();
      if (unsubAllTransactions) unsubAllTransactions();
    };
  }, [currentUser, isUserAdmin]);

  // Modals & UI helpers
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<SocialTask | null>(null);
  const [taskProofHandle, setTaskProofHandle] = useState('');
  const [taskProofScreenshot, setTaskProofScreenshot] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Advertise Form state
  const [advPlatform, setAdvPlatform] = useState<'Instagram' | 'Twitter' | 'TikTok' | 'YouTube' | 'WhatsApp' | 'Website'>('Instagram');
  const [advType, setAdvType] = useState<'Follow' | 'Like' | 'Retweet' | 'Post' | 'Subscribe' | 'Comment' | 'View Website'>('Follow');
  const [advDescription, setAdvDescription] = useState('');
  const [advUrl, setAdvUrl] = useState('');
  const [advSlots, setAdvSlots] = useState<number>(100);
  const [advError, setAdvError] = useState<string | null>(null);

  // Marketplace Form state
  const [marketTitle, setMarketTitle] = useState('');
  const [marketPrice, setMarketPrice] = useState<number>(0);
  const [marketCategory, setMarketCategory] = useState('Electronics');
  const [marketImage, setMarketImage] = useState('📦');
  const [marketContact, setMarketContact] = useState('');
  const [marketDescription, setMarketDescription] = useState('');

  // Payout Form state
  const [cashoutAmount, setCashoutAmount] = useState<number>(0);
  const [cashoutBank, setCashoutBank] = useState('Guaranty Trust Bank (GTBank)');
  const [cashoutAccountNumber, setCashoutAccountNumber] = useState('');
  const [cashoutAccountName, setCashoutAccountName] = useState('');
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Funding state
  const [walletSubTab, setWalletSubTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [fundingAmount, setFundingAmount] = useState<string>('2000');
  const [isFundingLoading, setIsFundingLoading] = useState<boolean>(false);
  
  // Saved bank accounts list state
  const [savedAccounts, setSavedAccounts] = useState<{ id: string; bankName: string; accountNumber: string; accountName: string }[]>([]);
  const [saveCurrentAccount, setSaveCurrentAccount] = useState<boolean>(true);
  const [savingAccountLoading, setSavingAccountLoading] = useState<boolean>(false);

  // Admin Create Task Form State
  const [adminPlatform, setAdminPlatform] = useState<'Instagram' | 'Twitter' | 'TikTok' | 'YouTube' | 'WhatsApp' | 'Website'>('Instagram');
  const [adminType, setAdminType] = useState<'Follow' | 'Like' | 'Retweet' | 'Post' | 'Subscribe' | 'Comment' | 'View Website'>('Follow');
  const [adminDescription, setAdminDescription] = useState('');
  const [adminPayout, setAdminPayout] = useState<number>(10);
  const [adminUrl, setAdminUrl] = useState('');
  const [adminSlots, setAdminSlots] = useState<number>(100);

  // Admin Editing user states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState<string>('');
  const [adminSubFilter, setAdminSubFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [adminWithdrawFilter, setAdminWithdrawFilter] = useState<'all' | 'pending' | 'successful' | 'failed'>('pending');
  const [adminViewMode, setAdminViewMode] = useState<'list' | 'gallery'>('gallery');

  // Helper values
  const totalCompleted = tasks.filter(t => t.status === 'approved' || t.status === 'submitted').length;
  const [isUpgradingModal, setIsUpgradingModal] = useState(false);

  // Toast / Status auto-fade
  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const addNotification = async (userId: string, title: string, message: string, type: string) => {
    try {
      const notifId = `notif-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await setDoc(doc(db, "profiles", userId, "notifications", notifId), {
        id: notifId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error adding notification:", err);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "profiles", currentUser.uid, "notifications", notifId), {
        read: true
      }, { merge: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await setDoc(doc(db, "profiles", currentUser.uid, "notifications", n.id), {
          read: true
        }, { merge: true });
      }
      showToast("All notifications marked as read!");
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "profiles", currentUser.uid, "notifications", notifId));
      showToast("Notification removed.");
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const copyRefLink = () => {
    const link = `olike.pro/ref/${userReferralCode || 'join'}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link);
      setCopiedId('ref');
      setTimeout(() => setCopiedId(null), 2000);
      showToast("Referral URL copied successfully!");
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId('ref');
      setTimeout(() => setCopiedId(null), 2000);
      showToast("Referral URL copied (fallback)!");
    }
  };

  // Submit task Proof sequence with Cloud Firestore integration
  const executeProofSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !currentUser) return;
    if (!taskProofHandle.trim()) {
      alert("Please enter your Social Media Handle or Username as proof.");
      return;
    }
    if (!taskProofScreenshot) {
      alert("Please upload a proof screenshot (or paste an image URL) to verify completion.");
      return;
    }

    setSubmittingProof(true);
    const uid = currentUser.uid;
    
    // Simulate real backend processing delay
    setTimeout(async () => {
      try {
        const earnedAmount = isPremium ? selectedTask.payout * 2 : selectedTask.payout;
        
        // Insert pending submission into Cloud Firestore
        const submissionId = `sub-${Math.floor(10000 + Math.random() * 90000)}`;
        const submissionObj = {
          id: submissionId,
          taskId: selectedTask.id,
          taskName: `${selectedTask.type} (${selectedTask.platform})`,
          payout: earnedAmount,
          userId: uid,
          userName: currentUser.displayName || currentUser.email?.split('@')[0] || "Olike Member",
          userEmail: currentUser.email || "",
          handle: taskProofHandle,
          screenshot: taskProofScreenshot || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150",
          status: 'pending', // pending, approved, rejected
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "submissions", submissionId), submissionObj);

        setSubmittingProof(false);
        setSelectedTask(null);
        setTaskProofHandle('');
        setTaskProofScreenshot('');
        
        showToast(`Success! Your proof has been submitted. Admin will verify and credit you shortly.`);
      } catch (err: any) {
        console.error("Firebase error posting task proof:", err);
        setSubmittingProof(false);
        alert("Firestore error: failed to submit task proof.");
      }
    }, 1200);
  };

  // Dynamic Paystack script loader helper
  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Fund Wallet via Paystack integrated with Cloud Firestore & Server verification
  const fundWalletWithPaystack = async (amountToDeposit?: number) => {
    if (!currentUser) {
      alert("Please login first to fund your wallet.");
      return;
    }
    
    let depositAmount: number;
    if (amountToDeposit !== undefined) {
      depositAmount = amountToDeposit;
    } else {
      const amountStr = prompt("Enter deposit amount in ₦:", "2000");
      if (!amountStr) return;
      depositAmount = parseFloat(amountStr);
    }

    if (isNaN(depositAmount) || depositAmount <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    if (depositAmount < 100) {
      alert("Minimum deposit amount is ₦100.");
      return;
    }

    try {
      setIsFundingLoading(true);
      showToast("Initializing payment with Paystack...");
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: currentUser.email || 'customer@olike.pro',
          amount: depositAmount,
          callbackUrl: window.location.href // Redirects back to this exact page after successful pay
        })
      });

      const initData = await res.json();
      setIsFundingLoading(false);
      if (initData && initData.success && initData.authorization_url) {
        showToast("Redirecting to Paystack secure checkout...");
        // Redirect to Paystack secure checkout
        window.location.href = initData.authorization_url;
      } else {
        alert(`Failed to initialize payment: ${initData.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setIsFundingLoading(false);
      console.error("Paystack initialization error:", err);
      alert("Error contacting payment gateway. Please try again.");
    }
  };

  // Post Campaign / Social Task (Advertise) with Cloud Firestore integration
  const submitAdvertiseCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvError(null);
    if (!currentUser) return;

    if (!advDescription.trim()) {
      setAdvError("Please enter a campaign follow instruction or tagline.");
      return;
    }
    if (!advUrl.trim()) {
      setAdvError("Please provide your target social media profile links.");
      return;
    }

    const rateItem = pricingGrid.find(r => r.id === advType) || { advertiserRate: 12.00, earnerRate: 4.80 };
    const pricePerTask = rateItem.advertiserRate;
    const earnerPayout = rateItem.earnerRate;
    const totalCost = pricePerTask * advSlots;

    if (balance < totalCost) {
      setAdvError(`Insufficient funds. Your balance is ₦${balance.toLocaleString()}. This advertiser campaign will cost ₦${totalCost.toLocaleString()} (₦${pricePerTask} × ${advSlots} users).`);
      return;
    }

    try {
      // Deduct cost and update profiles
      const newBalance = balance - totalCost;
      const uid = currentUser.uid;
      await setDoc(doc(db, "profiles", uid), { 
        balance: newBalance
      }, { merge: true });

      // Create a new task globally in Firestore
      const taskId = `task-${Date.now()}`;
      const newTask: SocialTask = {
        id: taskId,
        platform: advPlatform,
        type: advType,
        description: advDescription,
        payout: earnerPayout, // Managed and custom-defined earner payout rate configured by Admin
        url: advUrl.startsWith('http') ? advUrl : `https://${advUrl}`,
        status: 'available',
        slotsLeft: advSlots,
        platformIcon: advPlatform === 'Instagram' ? '📸' : advPlatform === 'Twitter' ? '🐦' : advPlatform === 'TikTok' ? '🎵' : advPlatform === 'YouTube' ? '▶️' : advPlatform === 'Website' ? '🌐' : '💬'
      };
      await setDoc(doc(db, "tasks", taskId), newTask);

      // Transaction entry in Firestore
      const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTx: WalletTransaction = {
        id: txId,
        description: `Launched ${advPlatform} marketing campaign (${advSlots} slots)`,
        amount: totalCost,
        type: 'advert_buy',
        date: 'Today',
        status: 'successful',
        userId: currentUser.uid
      };
      await setDoc(doc(db, "transactions", txId), newTx);

      setAdvDescription('');
      setAdvUrl('');
      setAdvSlots(100);
      setActiveTab('tasks');
      showToast(`Campaign launched live in Firestore! Other users can start completing your tasks instantly.`);
    } catch (err: any) {
      console.error("Firebase campaign launch error:", err);
      setAdvError("Error submitting campaign to Cloud Firestore database.");
    }
  };

  // Post Marketplace Item with Firestore Integration
  const submitMarketplaceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!marketTitle.trim() || marketPrice <= 0 || !marketContact.trim()) {
      alert("Please fill in basic description, price, and active contact numbers.");
      return;
    }

    try {
      const itemId = `item-${Date.now()}`;
      const newItem: MarketplaceItem = {
        id: itemId,
        title: marketTitle,
        price: marketPrice,
        category: marketCategory,
        image: marketImage || '📦',
        contact: marketContact,
        description: marketDescription,
        seller: currentUser.displayName || currentUser.email || 'Olike Member'
      };

      await setDoc(doc(db, "marketplace", itemId), newItem);

      setMarketTitle('');
      setMarketPrice(0);
      setMarketContact('');
      setMarketDescription('');
      showToast(`Marketplace item posted to Firestore! Buyers can now see your listing.`);
    } catch (err) {
      console.error("Firebase error posting marketplace item:", err);
      alert("Failed to submit item to Firestore database.");
    }
  };

  // Perform marketplace instant transaction with firestore
  const buyMarketplaceItem = async (item: MarketplaceItem) => {
    if (!currentUser) return;
    if (balance < item.price) {
      alert(`Insufficient wallet funds to purchase this item outright. Please deposit details or do more tasks first!`);
      return;
    }

    if (confirm(`Confirm you want to purchase "${item.title}" for ₦${item.price.toLocaleString()} using your Olike balance?`)) {
      try {
        const newBalance = balance - item.price;
        const uid = currentUser.uid;
        await setDoc(doc(db, "profiles", uid), { 
          balance: newBalance
        }, { merge: true });
        
        const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
        const newTx: WalletTransaction = {
          id: txId,
          description: `Bought: ${item.title} from ${item.seller}`,
          amount: item.price,
          type: 'marketplace_buy',
          date: 'Today',
          status: 'successful',
          userId: uid
        };
        await setDoc(doc(db, "transactions", txId), newTx);

        // Remove from list in Firestore
        await deleteDoc(doc(db, "marketplace", item.id));

        showToast(`Purchase recorded! Connect directly with the seller via whatsapp at ${item.contact} using receipt reference.`);
      } catch (err) {
        console.error("Firebase purchase error:", err);
        alert("Buying operation failed on Firestore.");
      }
    }
  };

  // Delete a user's saved bank account from Firestore
  const deleteSavedAccount = async (accountId: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "profiles", currentUser.uid, "saved_accounts", accountId));
      showToast("Saved bank account deleted successfully.");
    } catch (err) {
      console.error("Error deleting saved account:", err);
      alert("Failed to delete saved bank account.");
    }
  };

  // Manually save bank details to Firestore saved_accounts sub-collection
  const handleSaveBankDetails = async () => {
    if (!currentUser) return;
    if (!cashoutAccountNumber || cashoutAccountNumber.length !== 10) {
      alert("Please enter a valid 10-digit Nigerian NUBAN account number first.");
      return;
    }
    if (!cashoutAccountName.trim()) {
      alert("Please enter a valid beneficiary account name first.");
      return;
    }

    setSavingAccountLoading(true);
    try {
      const docId = `${cashoutBank.replace(/\s+/g, '_')}_${cashoutAccountNumber}`;
      await setDoc(doc(db, "profiles", currentUser.uid, "saved_accounts", docId), {
        bankName: cashoutBank,
        accountNumber: cashoutAccountNumber,
        accountName: cashoutAccountName,
        createdAt: new Date().toISOString()
      });
      setSavingAccountLoading(false);
      showToast("Beneficiary bank account saved successfully!");
    } catch (err) {
      console.error("Error saving account details:", err);
      setSavingAccountLoading(false);
      alert("Failed to save bank account details.");
    }
  };

  // Pay one-time verification fee
  const payOnetimeVerificationFee = async () => {
    if (!currentUser) return;
    const feeAmount = 1000;
    if (balance < feeAmount) {
      alert("Insufficient wallet balance. Please complete enough tasks to accumulate ₦1,000.00 or deposit funds via Paystack.");
      return;
    }

    try {
      const uid = currentUser.uid;
      const newBalance = balance - feeAmount;

      // Update profile
      await setDoc(doc(db, "profiles", uid), {
        balance: newBalance,
        paidOnetimeFee: true
      }, { merge: true });

      // Record transaction
      const txId = `tx-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx: WalletTransaction = {
        id: txId,
        description: "One-Time Verification Fee Paid",
        amount: feeAmount,
        type: 'upgrade',
        date: 'Today',
        status: 'successful',
        userId: currentUser.uid
      };
      await setDoc(doc(db, "transactions", txId), newTx);

      showToast("Verification Fee Paid Successfully! Your wallet is now activated for withdrawals. 🎉");
    } catch (err) {
      console.error("Error paying one-time fee:", err);
      alert("Failed to pay one-time fee. Please try again.");
    }
  };

  // Submit Real Withdrawal transaction with Firestore
  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashoutError(null);
    if (!currentUser) return;

    if (!paidOnetimeFee) {
      setCashoutError("You must pay the one-time activation/verification fee of ₦1,000.00 before making your first withdrawal.");
      return;
    }

    const unpaidRefereesList = referees.filter(ref => !ref.paidOnetimeFee);
    const lockedCommission = unpaidRefereesList.length * 250.00;
    const withdrawable = Math.max(0, balance - lockedCommission);

    if (withdrawable < cashoutAmount) {
      setCashoutError(`Insufficient withdrawable balance. ₦${lockedCommission.toLocaleString()} of your balance is currently locked because ${unpaidRefereesList.length} of your referee(s) have not paid their one-time activation fee.`);
      return;
    }

    if (cashoutAmount < 1000) {
      setCashoutError("Minimum cashout withdrawal is ₦1,000.00");
      return;
    }

    if (balance < cashoutAmount) {
      setCashoutError("Insufficient funds to fulfill withdrawal.");
      return;
    }

    if (!cashoutAccountNumber || cashoutAccountNumber.length !== 10) {
      setCashoutError("Account number must be a valid 10-digit Nigerian NUBAN.");
      return;
    }

    if (!cashoutAccountName.trim()) {
      setCashoutError("Please enter the beneficiary account name.");
      return;
    }

    try {
      const uid = currentUser.uid;

      // If user checked "save this bank account", save it to Firestore
      if (saveCurrentAccount) {
        const docId = `${cashoutBank.replace(/\s+/g, '_')}_${cashoutAccountNumber}`;
        await setDoc(doc(db, "profiles", uid, "saved_accounts", docId), {
          bankName: cashoutBank,
          accountNumber: cashoutAccountNumber,
          accountName: cashoutAccountName,
          createdAt: new Date().toISOString()
        });
      }

      // Deduct
      const newBalance = balance - cashoutAmount;
      await setDoc(doc(db, "profiles", uid), { 
        balance: newBalance
      }, { merge: true });

      const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTx: WalletTransaction = {
        id: txId,
        description: `Withdrew to ${cashoutBank} (${cashoutAccountNumber})`,
        amount: cashoutAmount,
        type: 'withdraw',
        date: 'Today',
        status: 'pending', // pending approval simulated
        userId: currentUser.uid
      };
      await setDoc(doc(db, "transactions", txId), newTx);

      setCashoutAmount(0);
      setCashoutAccountNumber('');
      setCashoutAccountName('');
      showToast(`Bank Withdrawal Requested in Firestore! We will credit ${cashoutAccountNumber} within 12 hours.`);
    } catch (err) {
      console.error("Firebase withdrawal error:", err);
      setCashoutError("Error recording withdrawal request in Cloud Firestore.");
    }
  };

  // Upgrade club with Firestore
  const activatePremiumClub = async () => {
    if (!currentUser) return;
    const cost = 1000;
    if (balance < cost) {
      alert("Insufficient wallet balance. Please add demo funds or do enough free tasks to accumulate ₦1,000 first.");
      return;
    }

    try {
      const newBalance = balance - cost;
      const uid = currentUser.uid;
      await setDoc(doc(db, "profiles", uid), { 
        balance: newBalance,
        isPremium: true
      }, { merge: true });

      const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTx: WalletTransaction = {
        id: txId,
        description: 'Upgraded to Olike Premium Influencer Club',
        amount: cost,
        type: 'upgrade',
        date: 'Today',
        status: 'successful',
        userId: currentUser.uid
      };
      await setDoc(doc(db, "transactions", txId), newTx);
      showToast("Congratulations! You are now a Premium Influencer Club Member! Earnings 2x Multiplier activated!");
    } catch (err) {
      console.error("Firebase upgrade error:", err);
    }
  };

  // ----------------------------------------------------
  // ADMINISTRATIVE ACTION HANDLERS
  // ----------------------------------------------------

  const handleApproveSubmission = async (sub: any) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can approve submissions.");
      return;
    }
    try {
      // 1. Fetch target user's current profile to update balance safely
      const userProfileRef = doc(db, "profiles", sub.userId);
      let userSnap;
      try {
        userSnap = await getDoc(userProfileRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `profiles/${sub.userId}`);
        return;
      }

      let currentBal = 0;
      let isUserPrem = false;
      let userEmail = sub.userEmail;
      let userName = sub.userName;

      if (userSnap.exists()) {
        const uData = userSnap.data();
        currentBal = uData.balance ?? 0;
        isUserPrem = uData.isPremium ?? false;
        userEmail = uData.email ?? sub.userEmail;
        userName = uData.name ?? sub.userName;
      }

      const newBal = currentBal + sub.payout;

      // 2. Write updated user balance back to profile
      try {
        await setDoc(userProfileRef, {
          name: userName,
          email: userEmail,
          isPremium: isUserPrem,
          balance: newBal
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `profiles/${sub.userId}`);
        return;
      }

      // 3. Write successful transaction record to history
      const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTx: WalletTransaction = {
        id: txId,
        description: `Social Earn Approved: ${sub.taskName}`,
        amount: sub.payout,
        type: 'earn',
        date: 'Today',
        status: 'successful',
        userId: sub.userId
      };
      try {
        await setDoc(doc(db, "transactions", txId), newTx);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `transactions/${txId}`);
        return;
      }

      // 4. Update task remaining slots if found
      const taskRef = doc(db, "tasks", sub.taskId);
      let taskSnap;
      try {
        taskSnap = await getDoc(taskRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `tasks/${sub.taskId}`);
        return;
      }
      if (taskSnap.exists()) {
        const tData = taskSnap.data();
        try {
          await setDoc(taskRef, {
            slotsLeft: Math.max(0, (tData.slotsLeft ?? 1) - 1)
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tasks/${sub.taskId}`);
          return;
        }
      }

      // 5. Update submission status to approved in real-time
      try {
        await setDoc(doc(db, "submissions", sub.id), {
          status: 'approved'
        }, { merge: true });

        // Add user notification for successful verification
        await addNotification(
          sub.userId,
          "Task Verification Approved! ✅",
          `Your proof submission for "${sub.taskName}" was verified by the Admin. ₦${sub.payout.toLocaleString()} has been credited to your balance.`,
          "verification_success"
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `submissions/${sub.id}`);
        return;
      }

      showToast(`Approved proof from ${sub.userName} successfully. Credited ₦${sub.payout.toLocaleString()}!`);
    } catch (err) {
      console.error("Admin approval error:", err);
      alert("Error approving task proof.");
    }
  };

  const handleRejectSubmission = async (subId: string) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can reject submissions.");
      return;
    }
    try {
      await setDoc(doc(db, "submissions", subId), {
        status: 'rejected'
      }, { merge: true });

      // Fetch submission details to notify the earner
      const subSnap = await getDoc(doc(db, "submissions", subId));
      if (subSnap.exists()) {
        const subData = subSnap.data();
        await addNotification(
          subData.userId,
          "Task Verification Rejected 🚫",
          `Your proof submission for "${subData.taskName || 'Campaign Task'}" was rejected by the Admin. Please review instruction guidelines.`,
          "verification_fail"
        );
      }

      showToast("Proof submission was successfully marked as Rejected.");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `submissions/${subId}`);
      } catch (e) {
        console.error("Admin rejection error:", e);
      }
      alert("Error rejecting task proof.");
    }
  };

  const handleApproveWithdrawal = async (tx: WalletTransaction) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can approve withdrawals.");
      return;
    }
    if (!confirm(`Are you sure you want to APPROVE the withdrawal of ₦${tx.amount.toLocaleString()} for transaction ID ${tx.id}?`)) {
      return;
    }
    try {
      await setDoc(doc(db, "transactions", tx.id), {
        status: 'successful'
      }, { merge: true });

      if (tx.userId) {
        await addNotification(
          tx.userId,
          "Withdrawal Approved! ✅ 💰",
          `Your withdrawal request of ₦${tx.amount.toLocaleString()} has been approved. The funds have been sent to your bank account.`,
          "withdrawal_success"
        );
      }
      showToast(`Successfully approved withdrawal of ₦${tx.amount.toLocaleString()}!`);
    } catch (err) {
      console.error("Error approving withdrawal:", err);
      alert("Error approving withdrawal.");
    }
  };

  const handleRejectWithdrawal = async (tx: WalletTransaction) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can reject withdrawals.");
      return;
    }
    if (!confirm(`Are you sure you want to REJECT and refund the withdrawal of ₦${tx.amount.toLocaleString()} for transaction ID ${tx.id}?`)) {
      return;
    }
    try {
      // 1. Mark transaction as failed
      await setDoc(doc(db, "transactions", tx.id), {
        status: 'failed'
      }, { merge: true });

      // 2. Refund balance
      if (tx.userId) {
        const userProfileRef = doc(db, "profiles", tx.userId);
        const userSnap = await getDoc(userProfileRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const currentBal = uData.balance ?? 0;
          const newBal = currentBal + tx.amount;
          await setDoc(userProfileRef, {
            balance: newBal
          }, { merge: true });
        }

        // 3. Add user notification
        await addNotification(
          tx.userId,
          "Withdrawal Request Declined ❌",
          `Your withdrawal request of ₦${tx.amount.toLocaleString()} was declined. The funds have been fully refunded to your wallet balance.`,
          "withdrawal_fail"
        );
      }
      showToast(`Successfully declined and refunded withdrawal of ₦${tx.amount.toLocaleString()}!`);
    } catch (err) {
      console.error("Error rejecting withdrawal:", err);
      alert("Error rejecting withdrawal.");
    }
  };

  const handleModifyUserBalance = async (userId: string, targetName: string, newBalanceVal: number) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can modify user balances.");
      return;
    }
    try {
      await setDoc(doc(db, "profiles", userId), {
        balance: newBalanceVal
      }, { merge: true });
      showToast(`Successfully updated ${targetName}'s wallet balance to ₦${newBalanceVal.toLocaleString()}!`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `profiles/${userId}`);
      } catch (e) {
        console.error("Admin balance modification error:", e);
      }
      alert("Error setting user balance.");
    }
  };

  const handleToggleUserAdmin = async (userId: string, targetName: string, currentIsAdmin: boolean) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can modify credentials.");
      return;
    }
    try {
      await setDoc(doc(db, "profiles", userId), {
        isAdmin: !currentIsAdmin
      }, { merge: true });
      showToast(`Successfully ${currentIsAdmin ? 'removed' : 'granted'} admin credentials for ${targetName}!`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `profiles/${userId}`);
      } catch (e) {
        console.error("Admin privilege toggle error:", e);
      }
      alert("Error modifying administrator status.");
    }
  };

  const handleCreateGlobalTask = async (platform: string, type: string, description: string, payout: number, url: string, slots: number) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can launch campaigns.");
      return;
    }
    try {
      const taskId = `task-${Math.floor(10000 + Math.random() * 90000)}`;
      const platformIconMap: Record<string, string> = {
        Instagram: '📸',
        Twitter: '🐦',
        TikTok: '🎵',
        YouTube: '▶️',
        WhatsApp: '💬',
        Website: '🌐'
      };
      
      const newTaskObj = {
        id: taskId,
        platform,
        type,
        description,
        payout,
        url: url || 'https://olike.pro',
        status: 'available',
        slotsLeft: slots,
        platformIcon: platformIconMap[platform] || '🛡️'
      };

      await setDoc(doc(db, "tasks", taskId), newTaskObj);
      showToast(`Successfully launched new campaign! [${type} - ₦${payout}]`);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `tasks`);
      } catch (e) {
        console.error("Admin campaign launch error:", e);
      }
      alert("Error launching global earn campaign.");
    }
  };

  const handleDeleteCampaign = async (taskId: string) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can delete campaigns.");
      return;
    }
    if (!confirm("Are you sure you want to delete this campaign permanently?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      showToast("Campaign deleted successfully.");
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Error deleting campaign.");
    }
  };

  const handleToggleBlockUser = async (userId: string, targetName: string, currentlyBlocked: boolean) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can block users.");
      return;
    }
    const actionWord = currentlyBlocked ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${actionWord} ${targetName}?`)) {
      return;
    }
    try {
      await setDoc(doc(db, "profiles", userId), {
        blocked: !currentlyBlocked
      }, { merge: true });
      showToast(`Successfully ${currentlyBlocked ? 'unblocked' : 'blocked'} ${targetName}!`);
    } catch (err) {
      console.error("Error toggling block user:", err);
      alert("Error performing action.");
    }
  };

  const handleDeleteUserProfile = async (userId: string, targetName: string) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can delete user profiles.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user profile for ${targetName}? This action is irreversible.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "profiles", userId));
      showToast(`Successfully deleted ${targetName}'s profile from database!`);
    } catch (err) {
      console.error("Error deleting user profile:", err);
      alert("Error deleting user profile.");
    }
  };

  const deleteMarketplaceItem = async (itemId: string) => {
    if (!isUserAdmin) {
      alert("Unauthorized! Only administrators can delete marketplace listings.");
      return;
    }
    if (!confirm("Are you sure you want to delete this marketplace item?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "marketplace", itemId));
      showToast("Marketplace item deleted successfully.");
    } catch (err) {
      console.error("Error deleting marketplace item:", err);
      alert("Error deleting marketplace item.");
    }
  };

  // Restore states in Firestore Database directly
  const resetDemoState = async () => {
    if (!currentUser) return;
    if (confirm("Reset layout/database back to defaults? This deletes all custom Firestore items!")) {
      try {
        setLoading(true);
        // Delete tasks from Firestore
        const tasksSnapshot = await getDocs(collection(db, "tasks"));
        for (const docSnapshot of tasksSnapshot.docs) {
          await deleteDoc(doc(db, "tasks", docSnapshot.id));
        }

        // Delete marketplace items
        const marketSnapshot = await getDocs(collection(db, "marketplace"));
        for (const docSnapshot of marketSnapshot.docs) {
          await deleteDoc(doc(db, "marketplace", docSnapshot.id));
        }

        // Delete transactions
        const txSnapshot = await getDocs(collection(db, "transactions"));
        for (const docSnapshot of txSnapshot.docs) {
          await deleteDoc(doc(db, "transactions", docSnapshot.id));
        }

        // Reset profile
        const uid = currentUser.uid;
        const isUserAdminEmail = currentUser.email === 'nzehmichael00@gmail.com' || (currentUser.email?.toLowerCase()?.includes('admin') ?? false);
        await setDoc(doc(db, "profiles", uid), { 
          name: currentUser.displayName || currentUser.email?.split('@')[0] || "Olike Member",
          balance: 0.00, 
          isPremium: uid.includes('premium') || isUserAdminEmail,
          isAdmin: isUserAdminEmail,
          email: currentUser.email || ""
        }, { merge: true });

        // Force reseed
        for (const t of INITIAL_TASKS) {
          await setDoc(doc(db, "tasks", t.id), t);
        }
        for (const item of INITIAL_MARKETPLACE) {
          await setDoc(doc(db, "marketplace", item.id), item);
        }
        for (const tx of INITIAL_TRANSACTIONS) {
          await setDoc(doc(db, "transactions", tx.id), tx);
        }

        setLoading(false);
        showToast("System returned to factory Nigerian Olike defaults in Firestore!");
      } catch (err) {
        console.error("Error resetting Database in Firestore:", err);
        setLoading(false);
      }
    }
  };

  // Authentication Sequence handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!emailInput.trim() || !passwordInput.trim() || !fullNameInput.trim()) {
      setAuthError("All registration fields are required.");
      setAuthLoading(false);
      return;
    }

    try {
      let referrerId: string | null = null;
      let referrerName = "";
      const typedReferralCode = referralCodeInput.trim();

      if (typedReferralCode) {
        // Find matching referrer profile using our safe, public referral_codes mapping
        const refDocSnap = await getDoc(doc(db, "referral_codes", typedReferralCode.toLowerCase()));
        if (refDocSnap.exists()) {
          referrerId = refDocSnap.data().userId;
          referrerName = refDocSnap.data().name || "Olike Member";
        } else {
          setAuthError(`The referral code "${typedReferralCode}" is invalid. Leave blank if you don't have one.`);
          setAuthLoading(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
      const user = userCredential.user;

      // Seed the Firestore profile immediately
      const profileDocRef = doc(db, "profiles", user.uid);
      const generatedCode = fullNameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + Math.floor(10 + Math.random() * 90);
      const signupBonus = referrerId ? 150.00 : 0.00;

      await setDoc(profileDocRef, {
        name: fullNameInput.trim(),
        balance: signupBonus,
        isPremium: false,
        email: user.email || "",
        referralCode: generatedCode,
        referredBy: referrerId ? { id: referrerId, name: referrerName, code: typedReferralCode } : null,
        paidOnetimeFee: false
      });

      // Register the referral code publicly for O(1) secure lookups
      await setDoc(doc(db, "referral_codes", generatedCode), {
        userId: user.uid,
        name: fullNameInput.trim()
      });

      // Write transaction ledger entry for referee sign-up bonus
      if (signupBonus > 0) {
        const txId = `tx-${Math.floor(100000 + Math.random() * 900000)}`;
        await setDoc(doc(db, "transactions", txId), {
          id: txId,
          description: `Sign-up Bonus (Referred by ${referrerName})`,
          amount: signupBonus,
          type: 'earn',
          date: 'Today',
          status: 'successful',
          userId: user.uid
        });
      }

      // Reward the referrer
      if (referrerId) {
        const referrerRef = doc(db, "profiles", referrerId);
        const referrerSnap = await getDoc(referrerRef);
        if (referrerSnap.exists()) {
          const currentReferrerBal = referrerSnap.data().balance || 0;
          await setDoc(referrerRef, {
            balance: currentReferrerBal + 250.00
          }, { merge: true });

          // Add transaction for referrer
          const refTxId = `tx-${Math.floor(100000 + Math.random() * 900000)}`;
          await setDoc(doc(db, "transactions", refTxId), {
            id: refTxId,
            description: `Referral Bonus (New User: ${fullNameInput.trim()})`,
            amount: 250.00,
            type: 'earn',
            date: 'Today',
            status: 'successful',
            userId: referrerId
          });

          // Add a notification for referrer
          await addNotification(
            referrerId,
            "Referral Bonus Credited! 🎉",
            `Congratulations! ${fullNameInput.trim()} signed up using your referral code. You have been credited ₦250.00.`,
            "referral_bonus"
          );
        }
      }

      // Add notifications for the new user
      await addNotification(
        user.uid,
        "Welcome to Olike! 🚀",
        "Start executing social campaigns to earn real revenue daily or list products in the marketplace.",
        "welcome"
      );

      if (referrerId) {
        await addNotification(
          user.uid,
          "Referral Bonus Credited! 🎁",
          `You have been credited with a sign-up bonus of ₦150.00 for joining via ${referrerName}'s invite code!`,
          "referral_bonus"
        );
      }

      showToast(`Welcome! Your account has been registered successfully.`);
      setEmailInput('');
      setPasswordInput('');
      setFullNameInput('');
      setReferralCodeInput('');
    } catch (err: any) {
      console.error("Sign up exception:", err);
      setAuthError(err.message || "Failed to register account. Please check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!emailInput.trim() || !passwordInput.trim()) {
      setAuthError("Email and Password are required.");
      setAuthLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
      const user = userCredential.user;
      showToast(`Welcome back!`);
      setEmailInput('');
      setPasswordInput('');
    } catch (err: any) {
      console.error("Login exception:", err);
      setAuthError(err.message || "Invalid email or password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!emailInput.trim()) {
      setAuthError("Please enter your email address to reset your password.");
      setAuthLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      showToast("Password reset email sent! Check your inbox or spam mail. 📧");
      setAuthScreen('login');
    } catch (err: any) {
      console.error("Forgot password exception:", err);
      setAuthError(err.message || "Failed to send password reset email. Please verify the email is correct.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      showToast(`Google authenticated! Welcome, ${user.displayName || user.email}.`);
    } catch (err: any) {
      console.error("Google popup error:", err);
      setAuthError("Google Sign-In popup is restricted by browser or environment constraints. Please register or login using the Email and Password forms.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setCurrentUser(null);
    setActiveTab('overview');
    showToast("Signed out successfully.");
  };

  if (loading) {
    return (
      <div id="loading-state" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-fade-in animate-duration-300">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black tracking-tighter text-3xl shadow-xl shadow-indigo-600/30 animate-pulse">
            O
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tracking-tight text-indigo-950">OLIKE</span>
          </div>
          <div className="mt-4 flex gap-1.5 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-2">Connecting to secure Firestore database...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div id="olike-auth-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-x-hidden">
        {/* Auth Toast Notification */}
        {successMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 text-white border-l-4 border-green-500 px-5 py-4 rounded-xl shadow-2xl max-w-md animate-bounce flex items-center gap-3">
            <div className="bg-green-500/20 text-green-400 p-1.5 rounded-full">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
            <span className="text-xs font-bold leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Global Navigation Header */}
        <header className="h-20 bg-white border-b border-slate-100 px-6 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAuthScreen('landing')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black tracking-tighter text-2xl shadow-lg shadow-indigo-600/30">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-indigo-950 leading-none">OLIKE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setAuthScreen('login'); setAuthError(null); }} 
              className="text-xs font-black text-indigo-950 hover:text-indigo-600 px-4 py-2 transition-all uppercase tracking-wide cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthScreen('signup'); setAuthError(null); }} 
              className="text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 uppercase tracking-wide cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </header>

        {/* Dynamic Route: LANDING PAGE */}
        {authScreen === 'landing' && (
          <div className="flex-1 flex flex-col items-center">
            {/* Hero Section */}
            <section className="w-full max-w-7xl px-6 md:px-12 py-16 md:py-24 text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-6 text-indigo-600 font-black tracking-wide text-[10px] uppercase">
                <span>🇳🇬</span> The Premier Social-Earning & Direct Advertising Registry
              </div>
              <h1 className="text-4xl md:text-7xl font-sans font-black tracking-tighter text-indigo-950 max-w-4xl leading-tight">
                Turn your Social Media Accounts into <span className="text-indigo-600 underline decoration-indigo-250 font-black">Passive Income</span>
              </h1>
              <p className="text-slate-500 font-medium text-base md:text-xl max-w-2xl mt-6 leading-relaxed">
                Get paid up to ₦100 per action for simple social tasks, launch real and targeted advertising campaigns instantly, or showcase products to daily active Nigerian buyers.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
                <button
                  onClick={() => { setAuthScreen('signup'); setAuthError(null); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-widest py-4 bg-indigo-600 rounded-xl px-8 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Start Earning Now (Free)
                </button>
                <button
                  onClick={() => { setAuthScreen('login'); setAuthError(null); }}
                  className="bg-white hover:bg-slate-100 text-indigo-950 text-sm font-black uppercase tracking-widest px-8 py-4 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Access Dashboard
                </button>
              </div>

              {/* Dynamic Live Ticker Stats */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl text-left">
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Earners</span>
                  <div className="text-2xl md:text-3xl font-black text-indigo-950 mt-1 font-mono">142,892</div>
                  <p className="text-xs text-green-600 font-bold mt-1">● 4.2k online now</p>
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Naira Distributed</span>
                  <div className="text-2xl md:text-3xl font-black text-indigo-950 mt-1 font-mono">₦48.2M+</div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Direct bank transfers</p>
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amplify Campaigns</span>
                  <div className="text-2xl md:text-3xl font-black text-indigo-950 mt-1 font-mono">19,451</div>
                  <p className="text-xs text-indigo-600 font-bold mt-1">Instagram, TikTok & Twitter</p>
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payout Velocity</span>
                  <div className="text-2xl md:text-3xl font-black text-indigo-950 mt-1 font-mono">99.8%</div>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Settled within 12 hours</p>
                </div>
              </div>
            </section>

            {/* Core Features Overview Section */}
            <section className="w-full bg-indigo-950 text-white py-16 md:py-20 px-6 md:px-12 text-center">
              <div className="max-w-7xl mx-auto">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">How Olike Operates</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-3 text-white">Full-Suite Digital Ecosystem</h2>
                <p className="text-indigo-200/80 font-medium text-sm md:text-base max-w-xl mt-4 mx-auto">
                  A multi-layered ecosystem connecting advertisers looking for actual engagement with Nigerians looking to monetize their social screens.
                </p>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-indigo-900/40 border border-indigo-800/40 rounded-2xl p-6 text-left">
                    <div className="text-3xl mb-4">📱</div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Social Task Registry</h3>
                    <p className="text-indigo-200/70 text-xs leading-relaxed mt-2">
                      Accumulate real monetary credit by performing simple tasks like liking pages, commenting on campaigns, following handles, and sharing content across leading platforms.
                    </p>
                  </div>
                  <div className="bg-indigo-900/40 border border-indigo-800/40 rounded-2xl p-6 text-left">
                    <div className="text-3xl mb-4">🚀</div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Targeted Advertising</h3>
                    <p className="text-indigo-200/70 text-xs leading-relaxed mt-2">
                      Hire Thousands of real on-the-ground Nigerians to follow you, share your WhatsApp statuses, comment on your products, or like your promotional videos to unlock viral reach.
                    </p>
                  </div>
                  <div className="bg-indigo-900/40 border border-indigo-800/40 rounded-2xl p-6 text-left">
                    <div className="text-3xl mb-4">👜</div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Product Marketplace</h3>
                    <p className="text-indigo-200/70 text-xs leading-relaxed mt-2">
                      Upload physical and digital goods like clothing, ebooks, smartphones, courses, and electronics to show directly to a hyper-active community of daily bargain hunters.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Elite Influencer Section */}
            <section className="w-full bg-slate-100 py-16 md:py-20 px-6 md:px-12 flex flex-col items-center">
              <div className="max-w-3xl text-center bg-white border border-slate-200 rounded-2xl px-8 py-10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-indigo-950 font-black text-[9px] uppercase px-4 py-1.5 rounded-bl-xl tracking-wider shadow">
                  Elite Multiply
                </div>
                <span className="text-2xl">👑</span>
                <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tight mt-2">Olike Influencer Club</h3>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                  Become an official VIP Influencer for just ₦1,000! Instantly unlock a **2x multiplier** on all social task payouts, plus special access to premier campaigns.
                </p>
                <div className="mt-6 flex justify-center gap-6 text-left text-xs text-slate-600 font-bold border-t border-slate-100 pt-6">
                  <div>✨ 2x Task Rewards</div>
                  <div>✨ Priority Support</div>
                  <div>✨ Elite Status Badge</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Dynamic Route: SECURE SIGN UP / REGISTRATION */}
        {authScreen === 'signup' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl relative">
              <button 
                onClick={() => setAuthScreen('landing')} 
                className="absolute top-4 left-4 text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase"
              >
                ← Back
              </button>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow mb-2">O</div>
                <h2 className="text-2xl font-black text-indigo-950 tracking-tight text-center">Generate Olike Account</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold text-center">Start taking social tasks in under 60 seconds.</p>
              </div>

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-xs font-bold leading-relaxed mb-4 text-center">
                  {authError}
                </div>
              )}

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Obinna Chukwu"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Referral Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. jdoe_92"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[9px] text-slate-450 mt-1 font-semibold leading-normal">
                    Enter an invite code to earn an instant <span className="text-indigo-650 font-bold">₦150.00 sign-up bonus</span>!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 font-sans cursor-pointer mt-2"
                >
                  {authLoading ? 'Registering...' : 'Register Account'}
                </button>
              </form>

              {/* Alternate Login trigger */}
              <div className="text-center text-xs font-semibold text-slate-500 mt-4">
                Already registered?{' '}
                <button 
                  onClick={() => { setAuthScreen('login'); setAuthError(null); }} 
                  className="text-indigo-600 hover:underline font-bold"
                >
                  Sign In instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route: SECURE SIGN IN / LOGIN */}
        {authScreen === 'login' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl relative animate-fade-in">
              <button 
                onClick={() => setAuthScreen('landing')} 
                className="absolute top-4 left-4 text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase"
              >
                ← Back
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow mb-2">O</div>
                <h2 className="text-2xl font-black text-indigo-950 tracking-tight text-center">Access Olike Registry</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold text-center">Enter your secure credentials below.</p>
              </div>

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-xs font-bold leading-relaxed mb-4 text-center">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Password</label>
                    <button 
                      type="button"
                      onClick={() => { setAuthScreen('forgot_password'); setAuthError(null); }}
                      className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-wider"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 mt-2 font-sans cursor-pointer"
                >
                  {authLoading ? 'Logging in...' : 'Sign In'}
                </button>
              </form>

              {/* Alternate Registration trigger */}
              <div className="text-center text-xs font-semibold text-slate-500 mt-4">
                New to Olike?{' '}
                <button 
                  onClick={() => { setAuthScreen('signup'); setAuthError(null); }} 
                  className="text-indigo-600 hover:underline font-bold"
                >
                  Create an Account
                </button>
              </div>
            </div>
          </div>
        )}

        {authScreen === 'forgot_password' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl relative animate-fade-in">
              <button 
                onClick={() => { setAuthScreen('login'); setAuthError(null); }} 
                className="absolute top-4 left-4 text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase bg-transparent border-0 cursor-pointer"
              >
                ← Back to Login
              </button>

              <div className="flex flex-col items-center mb-6 mt-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow mb-2">O</div>
                <h2 className="text-2xl font-black text-indigo-950 tracking-tight text-center">Reset Password</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold text-center">Enter your email below to receive a password reset link in the spam mail.</p>
              </div>

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-xs font-bold leading-relaxed mb-4 text-center">
                  {authError}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 mt-2 font-sans cursor-pointer"
                >
                  {authLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Global Footer */}
        <footer className="h-16 bg-slate-100 border-t border-slate-200/60 flex items-center justify-center px-6 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
          © {new Date().getFullYear()} Olike Global Services Ltd. Secure Cloud-Synced Ledger System.
        </footer>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-red-650/30 mb-6 animate-bounce">
          <ShieldAlert className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white max-w-xl">
          Account Suspended
        </h1>
        <p className="text-slate-400 font-medium text-xs md:text-sm max-w-md mt-3 leading-relaxed">
          Your Olike account has been temporarily or permanently restricted by the administrator due to suspicious activities or violation of community standards.
        </p>
        <p className="text-slate-500 font-semibold text-[11px] max-w-md mt-2">
          If you believe this is an error, please reach out to support.
        </p>
        <button
          onClick={handleSignOut}
          className="mt-8 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-700 cursor-pointer"
        >
          Sign Out / Exit Dashboard
        </button>
      </div>
    );
  }

  return (
    <div id="olike-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-x-hidden animate-fade-in pb-16 md:pb-0">
      
      {/* Dynamic Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 text-white border-l-4 border-green-500 px-5 py-4 rounded-xl shadow-2xl max-w-md animate-bounce flex items-center gap-3">
          <div className="bg-green-500/20 text-green-400 p-1.5 rounded-full">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <span className="text-xs font-bold leading-relaxed">{successMessage}</span>
        </div>
      )}

      {/* Primary Header - Styled exactly like the video */}
      <header id="olike-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-10 flex-1">
          {/* Logo */}
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[11px] font-black leading-none">o</div>
            <span className="text-xl font-bold tracking-tight text-slate-800 leading-none lowercase">olike</span>
          </div>

          {/* Search bar in the middle */}
          <div className="hidden lg:flex items-center bg-slate-100 border border-slate-200/60 rounded-lg px-3 py-1.5 w-80 max-w-md">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search Products/Services" 
              className="bg-transparent text-xs text-slate-700 outline-none w-full" 
              disabled 
            />
          </div>
        </div>

        {/* Navigation & Logout */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-wider">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`pb-5 pt-5 border-b-2 hover:text-indigo-600 transition-colors pointer-events-auto ${activeTab === 'overview' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveTab('tasks')} 
              className={`pb-5 pt-5 border-b-2 hover:text-indigo-600 transition-colors pointer-events-auto ${activeTab === 'tasks' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent'}`}
            >
              Earn
            </button>
            <button 
              onClick={() => setActiveTab('advertise')} 
              className={`pb-5 pt-5 border-b-2 hover:text-indigo-600 transition-colors pointer-events-auto ${activeTab === 'advertise' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent'}`}
            >
              Advertise
            </button>
            <button 
              onClick={() => setActiveTab('marketplace')} 
              className={`pb-5 pt-5 border-b-2 hover:text-indigo-600 transition-colors pointer-events-auto ${activeTab === 'marketplace' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent'}`}
            >
              Market
            </button>
            <button 
              onClick={() => setActiveTab('wallet')} 
              className={`pb-5 pt-5 border-b-2 hover:text-indigo-600 transition-colors pointer-events-auto ${activeTab === 'wallet' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent'}`}
            >
              More
            </button>
            {isUserAdmin && (
              <button 
                onClick={() => setActiveTab('admin')} 
                className={`pb-5 pt-5 border-b-2 hover:text-red-600 transition-colors pointer-events-auto ${activeTab === 'admin' ? 'text-red-600 border-red-600 font-extrabold' : 'text-slate-500 border-transparent'}`}
              >
                🛡️ Admin
              </button>
            )}
          </nav>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Bell Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer flex items-center justify-center"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 flex flex-col max-h-[420px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    🔔 Notification Center
                  </span>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[10px] text-slate-400 font-bold">No notifications yet</p>
                      <p className="text-[9px] text-slate-400/75 mt-0.5 leading-relaxed">Task approvals, rejections, and welcome alerts will show here!</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-3 rounded-xl border text-left transition-all relative group ${
                          notif.read 
                            ? 'bg-slate-50/50 border-slate-150' 
                            : 'bg-indigo-50/20 border-indigo-100 ring-1 ring-indigo-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 leading-tight">
                            {notif.title}
                          </span>
                          <button 
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-dashed border-slate-100">
                          <span className="text-[8px] text-slate-400 font-extrabold font-mono">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                          {!notif.read && (
                            <button 
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Logout Button */}
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-600 font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Column Container Body */}
      <main className="flex-1 flex max-w-[1360px] w-full mx-auto overflow-hidden">
        
        {/* LEFT NAV SIDEBAR - styled exactly like the video */}
        <aside id="olike-sidebar" className="hidden md:flex w-64 bg-slate-50 border-r border-slate-200 p-5 flex-col gap-5 flex-shrink-0 overflow-y-auto">
          
          {/* User Profile Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-xl flex items-center justify-center shadow-sm mb-2 uppercase">
              {currentUser?.displayName ? currentUser.displayName.slice(0, 2) : (currentUser?.email ? currentUser.email.slice(0, 2) : 'OM')}
            </div>
            
            <span className="text-sm font-black text-slate-800 leading-tight block truncate max-w-full capitalize">
              {currentUser?.displayName || currentUser?.email?.split('@')[0] || "Olike Member"}
            </span>
            <span className="text-[10px] text-slate-400 font-bold leading-none block mt-1 truncate max-w-full">
              @{currentUser?.email?.split('@')[0] || "olike_user"}
            </span>
            
            <div className="w-full border-t border-slate-100 my-3"></div>
            
            <div className="text-[10px] text-slate-500 font-extrabold flex items-center justify-center gap-1.5">
              <span>0 Followers</span>
              <span className="text-slate-300">•</span>
              <span>0 Following</span>
            </div>
          </div>

          {/* Descriptive Items List */}
          <div className="flex flex-col gap-4 text-slate-600 pr-1">
            <div 
              onClick={() => setActiveTab('tasks')}
              className="flex gap-3 items-start cursor-pointer group hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent p-2 rounded-xl transition-all"
            >
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Coins className="h-4 w-4" />
              </div>
              <p className="text-[11px] leading-snug font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Earn daily by performing social media tasks on your social media pages.
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('advertise')}
              className="flex gap-3 items-start cursor-pointer group hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent p-2 rounded-xl transition-all"
            >
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600 shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <Megaphone className="h-4 w-4" />
              </div>
              <p className="text-[11px] leading-snug font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Get people to repost your adverts and perform social tasks on your social media pages.
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('marketplace')}
              className="flex gap-3 items-start cursor-pointer group hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent p-2 rounded-xl transition-all"
            >
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <p className="text-[11px] leading-snug font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Take advantage of our huge traffic to advertise and sell anything on the Olike Market.
              </p>
            </div>

            {isUserAdmin && (
              <div 
                onClick={() => setActiveTab('admin')}
                className="flex gap-3 items-start cursor-pointer group hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent p-2 rounded-xl transition-all border-red-150 bg-red-50/10"
              >
                <div className="p-2 bg-red-50 rounded-lg text-red-600 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Shield className="h-4 w-4" />
                </div>
                <p className="text-[11px] leading-snug font-bold text-red-700 group-hover:text-red-900 transition-colors">
                  Access Administrator Terminal to approve proof uploads, manage users, and adjust balances.
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <p className="text-center text-[10px] text-slate-400 font-mono">SECURE WALLET SYSTEM</p>
          </div>
        </aside>

        {/* WORKSPACE MAIN BODY SCREEN CONTENT AREA */}
        <section id="olike-main-workspace" className="flex-1 p-4 sm:p-6 flex flex-col overflow-y-auto space-y-6 pb-24 sm:pb-6">
          
          {/* TAB 1: OVERVIEW / DASHBOARD SCREEN - styled exactly like the video */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in" id="screen-overview">
              
              {/* Labeled Balance Block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm max-w-xl mx-auto flex flex-col items-center w-full">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">My Balance</span>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-sans tracking-tight mb-5">
                  ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="flex gap-3 w-full max-w-xs justify-center">
                  <button 
                    onClick={() => {
                      setActiveTab('wallet');
                      setWalletSubTab('deposit');
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Fund
                  </button>
                  <button 
                    onClick={() => setActiveTab('wallet')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-lg uppercase tracking-wider transition-all border border-slate-200 cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Metric indicators Row (3 cards) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto w-full pt-1">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-wider block truncate">Total Earnings</span>
                  <span className="text-[10px] xs:text-xs sm:text-sm font-extrabold text-slate-700 block mt-1 font-mono truncate" title={`₦${transactions.filter(t => t.type === 'earn').reduce((acc, t) => acc + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                    ₦{transactions.filter(t => t.type === 'earn').reduce((acc, t) => acc + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-wider block truncate">Pending</span>
                  <span className="text-[10px] xs:text-xs sm:text-sm font-extrabold text-slate-700 block mt-1 font-mono truncate">
                    ₦0.00
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-wider block truncate">Active Spent</span>
                  <span className="text-[10px] xs:text-xs sm:text-sm font-extrabold text-slate-700 block mt-1 font-mono truncate" title={`₦${transactions.filter(t => t.type === 'withdraw' || t.type === 'upgrade').reduce((acc, t) => acc + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
                    ₦{transactions.filter(t => t.type === 'withdraw' || t.type === 'upgrade').reduce((acc, t) => acc + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Daily Earnings Chart Block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto w-full">
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Daily Earnings Performance
                    </h3>
                    <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Visualize your earnings over the last 7 days.</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                    7 Days Tracked
                  </span>
                </div>

                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getEarningsChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={8}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `₦${v}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`₦${value.toLocaleString()}`, 'Earnings']}
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Bar 
                        dataKey="Earnings" 
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section Header Title block */}
              <div className="text-center py-4">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">Welcome to Olike</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Please select what you want to do on Olike today</p>
              </div>

              {/* Dual Large Column Bento Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pb-8">
                {/* Block 1: Social Media Advertisers */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all">
                  <div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">For Social Media Users and Advertisers</span>
                    <h4 className="text-lg font-black text-slate-800 leading-snug mt-2">
                      Buy Social Media Engagements and Get People to Post Your Adverts on Their Social Pages.
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-3 text-slate-500">
                      Get real, active Nigerian users to follow your pages, like posts, subscribe to channels, or post your banners on their WhatsApp status.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('advertise')}
                    className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Advertise
                  </button>
                </div>

                {/* Block 2: Performers */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-pink-400 hover:shadow-md transition-all">
                  <div>
                    <span className="text-[9px] font-black text-pink-600 uppercase tracking-widest">For Performers</span>
                    <h4 className="text-lg font-black text-slate-800 leading-snug mt-2">
                      Get Paid for Posting Adverts and Engagements on Your Social Media.
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-3 text-slate-500">
                      Perform simple tasks such as following handles, liking posts, commenting, or sharing posts on your social channels to earn steady daily commissions.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className="w-full mt-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md shadow-pink-600/10 cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              </div>

              {/* Leaderboard Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto w-full">
                <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-500 border border-amber-100">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Referral Leaderboard
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Top referrers ranked by successful referrals</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-[10px] text-indigo-750 font-black uppercase tracking-wider">Live Stats</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  🎁 <span className="font-extrabold text-indigo-950">Referral Program Active:</span> Earn <span className="text-indigo-600 font-extrabold">₦250.00</span> for every referred user who activates their profile. Your referrals get <span className="text-emerald-600 font-extrabold">₦150.00</span> signup bonus instantly!
                </p>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-400">No referrals recorded on the board yet.</p>
                    <p className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer mt-1" onClick={() => setActiveTab('wallet')}>
                      Be the first to invite friends!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {leaderboard.slice(0, 10).map((user, idx) => {
                      const isMe = user.userId === currentUser?.uid;
                      const rank = idx + 1;
                      
                      let rankBadge = null;
                      if (rank === 1) {
                        rankBadge = <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full">1st 👑</span>;
                      } else if (rank === 2) {
                        rankBadge = <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded-full">2nd 🥈</span>;
                      } else if (rank === 3) {
                        rankBadge = <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-black px-2 py-0.5 rounded-full">3rd 🥉</span>;
                      } else {
                        rankBadge = <span className="text-slate-400 font-mono font-bold text-xs">#{rank}</span>;
                      }

                      return (
                        <div 
                          key={user.id || idx} 
                          className={`flex items-center justify-between py-3 px-2 rounded-xl transition-colors ${isMe ? 'bg-indigo-50/50 border border-indigo-100/50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 flex justify-center items-center">
                              {rankBadge}
                            </div>
                            <div className="min-w-0">
                              <span className={`text-xs font-bold text-slate-800 truncate block ${isMe ? 'text-indigo-950 font-black' : ''}`}>
                                {user.name} {isMe && <span className="text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1">You</span>}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                                ID: {user.userId.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-slate-800 block">
                              {user.referralCount}
                            </span>
                            <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">
                              {user.referralCount === 1 ? 'Referral' : 'Referrals'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: ACTIVE EARN MONEY / PERFORM MICRO TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-fade-in" id="screen-tasks">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Earn Daily Revenue</h2>
                    <p className="text-xs text-slate-500 font-bold mt-1">Perform social engagement campaigns specified by real advertisers. Complete and submit validation screenshots!</p>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 rounded-xl px-4 py-2 text-xs">
                    <span className="text-indigo-600 font-black uppercase">Your Payout Rating:</span>
                    <span className="font-mono font-black text-indigo-900">{isPremium ? 'Double (2.0× Premium Active)' : 'Standard (1.0× Member)'}</span>
                  </div>
                </div>

                {/* Filter and task container */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {tasks.map((task) => {
                    const dynamicPayout = isPremium ? task.payout * 2 : task.payout;
                    return (
                      <div 
                        key={task.id}
                        className={`bg-white border hover:border-indigo-400 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${task.status !== 'available' ? 'opacity-55 scale-[0.98]' : ''}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl bg-slate-100 rounded-xl p-2.5 shrink-0 shadow-sm">{task.platformIcon}</span>
                              <div>
                                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">{task.platform}</h3>
                                <p className="text-[10px] text-slate-400 font-semibold font-mono">{task.type} Campaign</p>
                              </div>
                            </div>
                            
                            <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-full border ${
                              task.status === 'available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                              task.status === 'approved' ? 'bg-green-100 border-green-200 text-green-700' :
                              'bg-indigo-50 border-indigo-100 text-indigo-600'
                            }`}>
                              {task.status === 'available' ? 'Available' : task.status === 'approved' ? 'Verified' : 'Submitted'}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Instruction Target</span>
                          <p className="text-xs font-bold text-slate-700 leading-normal mt-1 mb-4 h-12 overflow-hidden line-clamp-2">
                            {task.description}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 mb-4">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Payout Rate</span>
                              <span className="text-sm font-black text-green-600 font-mono">₦{dynamicPayout.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Slots Left</span>
                              <span className="text-sm font-black text-slate-700 font-mono">{task.slotsLeft} users</span>
                            </div>
                          </div>
                        </div>

                        {task.status === 'available' ? (
                          <button 
                            onClick={() => setSelectedTask(task)}
                            className="w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                          >
                            Execute Task
                          </button>
                        ) : (
                          <div className="w-full text-center py-2 bg-slate-100 border border-slate-200 text-slate-500 font-extrabold text-xs rounded-xl px-1.5 flex items-center justify-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Campaign Completed</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUY ENGAGEMENT / LAUNCH CAMPAIGNS (ADVERTISE) */}
          {activeTab === 'advertise' && (
            <div className="space-y-6 animate-fade-in" id="screen-advertise">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form column */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-lg font-black text-indigo-950">Advertise on Olike</h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">Get authentic, targeted Nigerian social media followers, post likes, account subscribers, or reviews instantly.</p>
                  
                  {advError && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2 items-start animate-fade-in">
                      <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <h4 className="font-bold">Campaign Launch Warning</h4>
                        <p className="leading-relaxed mt-0.5 font-semibold">{advError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={submitAdvertiseCampaign} className="space-y-4 mt-6">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Platform Channel</label>
                        <select 
                          value={advPlatform}
                          onChange={(e) => {
                            const nextPlatform = e.target.value as any;
                            setAdvPlatform(nextPlatform);
                            const actions = PLATFORM_ACTIONS[nextPlatform] || [];
                            if (actions.length > 0) {
                              setAdvType(actions[0].value as any);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none shadow-inner cursor-pointer"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Twitter">Twitter / X</option>
                          <option value="TikTok">TikTok</option>
                          <option value="YouTube">YouTube</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Website">Website</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Action Target Type</label>
                        <select 
                          value={advType}
                          onChange={(e) => setAdvType(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none shadow-inner cursor-pointer"
                        >
                          {(PLATFORM_ACTIONS[advPlatform] || []).map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Campaign Title & Target Instructions</label>
                      <textarea
                        rows={3}
                        value={advDescription}
                        onChange={(e) => setAdvDescription(e.target.value)}
                        placeholder="e.g. Follow the professional handle @tech_nigeria to get access to custom giveaways"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl p-3 text-xs font-bold outline-none shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Your Account / Post URL</label>
                      <input
                        type="text"
                        value={advUrl}
                        onChange={(e) => setAdvUrl(e.target.value)}
                        placeholder="e.g. https://instagram.com/tech_nigeria"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-3 text-xs font-bold outline-none shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Targeted Influencer engagement quantity</label>
                        <input
                          type="number"
                          value={advSlots}
                          onChange={(e) => setAdvSlots(Math.max(10, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none shadow-inner"
                        />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Campaign Budget</span>
                        <span className="text-base font-black text-indigo-900 font-mono">
                          ₦{(advSlots * (pricingGrid.find(r => r.id === advType)?.advertiserRate ?? 12.00)).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">
                          ₦{(pricingGrid.find(r => r.id === advType)?.advertiserRate ?? 12.00)}/influencer follow action rate
                        </span>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
                    >
                      Fund & Kickoff Campaign
                    </button>
                  </form>
                </div>

                {/* Info and helper column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-100 mb-2">Social Traffic Pricing Grid</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold mb-4">
                      Olike targets active Nigerian profiles ensuring elite visibility metrics. Here are standard influencer action guidelines:
                    </p>

                    <div className="space-y-2.5 font-mono text-[11px] border-t border-slate-800 pt-3">
                      {pricingGrid.map((rate) => (
                        <div key={rate.id} className="flex justify-between items-center text-slate-300">
                          <span>{rate.label}</span>
                          <div className="text-right">
                            <span className="font-extrabold text-white block">Ad: ₦{rate.advertiserRate.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 block">Earn: ₦{rate.earnerRate.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">💡 Campaign Performance tips</h4>
                    <p className="text-xs text-slate-500 leading-normal font-medium">
                      Make your instructions simple and specific. If targeting custom requirements (like subscribing to channel), provide the specific name and handle, as users must verify with proof.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DIRECT P2P ADVERTISE / DIRECT MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="space-y-6 animate-fade-in" id="screen-marketplace">
              
              {/* Flex grids headers layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual List */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-800">Direct eCommerce Marketplace</h2>
                      <p className="text-xs text-slate-500 font-bold mt-1">Directly purchase physical commodities from active Nigerian builders or list your own details for others to buy!</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {marketplace.map((item) => (
                      <div key={item.id} className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-250/60 p-4 transition-all flex flex-col justify-between">
                        <div>
                          <div className="h-44 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-5xl shadow-inner relative overflow-hidden">
                            <span>{item.image}</span>
                            <span className="absolute top-2 right-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                          </div>

                          <div className="mt-3">
                            <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Seller: {item.seller}</p>
                            <p className="text-xs text-slate-500 leading-normal mt-2 h-12 overflow-hidden line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Direct Price</span>
                            <span className="text-sm font-black text-indigo-950 font-mono">
                              ₦{item.price.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex gap-1.5">
                            <a 
                              href={`https://wa.me/${item.contact.replace(/\s+/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase transition-colors"
                            >
                              WhatsApp
                            </a>
                            <button 
                              onClick={() => buyMarketplaceItem(item)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer"
                            >
                              Buy
                            </button>
                            {isUserAdmin && (
                              <button 
                                onClick={() => deleteMarketplaceItem(item.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 hover:text-red-750 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer flex items-center justify-center"
                                title="Delete Listing"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form to Post item on marketplace */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                    📣 Post Marketplace Listing
                  </h3>

                  <form onSubmit={submitMarketplaceItem} className="space-y-4 mt-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Item Title</label>
                      <input
                        type="text"
                        value={marketTitle}
                        onChange={(e) => setMarketTitle(e.target.value)}
                        placeholder="e.g. Vintage leather boots"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Naira Price (₦)</label>
                        <input
                          type="number"
                          value={marketPrice || ''}
                          onChange={(e) => setMarketPrice(parseInt(e.target.value) || 0)}
                          placeholder="₦15,000"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                        <select 
                          value={marketCategory}
                          onChange={(e) => setMarketCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-inner"
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Fashion">Fashion</option>
                          <option value="Cosmetics">Cosmetics</option>
                          <option value="Digital Services">Digital Info</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div className="col-span-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp / Phone Contact</label>
                        <input
                          type="text"
                          value={marketContact}
                          onChange={(e) => setMarketContact(e.target.value)}
                          placeholder="+234 81..."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Emoji</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={marketImage}
                          onChange={(e) => setMarketImage(e.target.value)}
                          placeholder="👟"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none text-center shadow-inner"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Brief Info / Descriptions</label>
                      <textarea
                        rows={3}
                        value={marketDescription}
                        onChange={(e) => setMarketDescription(e.target.value)}
                        placeholder="e.g. Size 44, original packaging, no scrapes."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl p-3 text-xs font-bold outline-none shadow-inner"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Publish Marketplace Listing
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: WALLET & CASH OUT withdrawal FORM SCREEN */}
          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-fade-in" id="screen-wallet">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Cash out or Deposit form card */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  {/* Sub-tabs header */}
                  <div className="flex border-b border-slate-100 pb-3 mb-5 gap-4">
                    <button
                      type="button"
                      onClick={() => setWalletSubTab('deposit')}
                      className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        walletSubTab === 'deposit'
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                    >
                      💳 Fund Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletSubTab('withdraw')}
                      className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        walletSubTab === 'withdraw'
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                    >
                      🏦 Secure Cashout
                    </button>
                  </div>

                  {/* SUB-TAB 1: DEPOSIT / FUNDING SCREEN */}
                  {walletSubTab === 'deposit' && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="border-b border-slate-100 pb-3">
                        <h2 className="text-lg font-black text-slate-800">Secure Wallet Deposit</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          Load money instantly into your Olike balance using Paystack. 
                          Supports Card payments, Bank Transfers, USSD, and QR.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                            Enter Amount to Fund (₦)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-500 font-mono">₦</span>
                            <input
                              type="number"
                              min={100}
                              value={fundingAmount}
                              onChange={(e) => setFundingAmount(e.target.value.replace(/\D/g, ''))}
                              placeholder="Minimum deposit amount is 100"
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold outline-none shadow-inner font-mono text-slate-800"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">
                            Minimum deposit: <span className="text-slate-700 font-black">₦100</span>. Zero Hidden Fees.
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Quick-Select Presets
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[1000, 2000, 5000, 10000, 20000].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setFundingAmount(preset.toString())}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                  fundingAmount === preset.toString()
                                    ? 'bg-indigo-50 border-indigo-350 text-indigo-700 font-black scale-102 shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                +₦{preset.toLocaleString()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Summary Block */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">Funding Amount</span>
                            <span className="text-slate-800 font-black font-mono">
                              ₦{(parseFloat(fundingAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-slate-150 pt-2">
                            <span className="text-slate-700 font-black">Net Wallet Credit</span>
                            <span className="text-indigo-600 font-black font-mono">
                              ₦{(parseFloat(fundingAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Payment trigger */}
                        <button
                          type="button"
                          disabled={isFundingLoading || !fundingAmount || parseFloat(fundingAmount) < 100}
                          onClick={() => fundWalletWithPaystack(parseFloat(fundingAmount))}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isFundingLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Initializing secure pay...</span>
                            </>
                          ) : (
                            <span>🚀 Initialize Secure Deposit</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: WITHDRAWAL / CASHOUT SCREEN */}
                  {walletSubTab === 'withdraw' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="border-b border-slate-100 pb-4 mb-4">
                        <h2 className="text-lg font-black text-slate-800">Secure Bank Withdrawal</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">Cash out your social performance commissions directly to any authentic Nigerian Bank Account instantly.</p>
                      </div>

                      {cashoutError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2 items-start mb-4 animate-fade-in">
                          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                          <div>
                            <h4 className="font-bold">Withdrawal Exception Block</h4>
                            <p className="leading-relaxed mt-0.5 font-semibold text-red-600">{cashoutError}</p>
                          </div>
                        </div>
                      )}

                      {!paidOnetimeFee ? (
                        <div className="bg-slate-50 rounded-2xl border border-indigo-100 p-6 space-y-4 animate-fade-in">
                          <div className="flex gap-3 items-start">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                              <Shield className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-800">One-Time Verification Fee Required</h3>
                              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                                Every new Olike earner must pay a one-time wallet verification and spam-prevention fee of <strong className="text-indigo-600 font-extrabold">₦1,000.00</strong> before their first withdrawal can be authorized. This verifies your wallet identity and authenticates your payout routing channel.
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-slate-200/60 pt-4 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Your Wallet Balance</span>
                              <span className="text-sm font-black text-slate-800 font-mono">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            {balance >= 1000 ? (
                              <button
                                type="button"
                                onClick={payOnetimeVerificationFee}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                              >
                                Pay Verification Fee (₦1,000)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setWalletSubTab('deposit')}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-emerald-650/10 cursor-pointer"
                              >
                                Deposit ₦{Math.max(100, 1000 - balance).toLocaleString()} to Pay
                              </button>
                            )}
                          </div>
                          {balance < 1000 && (
                            <p className="text-[10px] text-amber-600 font-bold leading-normal">
                              ⚠️ Your balance is insufficient. Please perform enough social tasks to accumulate ₦1,000.00 or click above to fund your wallet instantly via Paystack.
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Wallet balance breakdown and Referral lock notice */}
                          {referees.length > 0 && (
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 rounded-2xl border border-slate-200 p-4 space-y-3.5 mb-4 shadow-sm animate-fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Withdrawable Balance Breakdown</span>
                                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                  ● Activated Account
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 divide-x divide-slate-200">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Balance</span>
                                  <span className="text-xs font-black text-slate-800 font-mono block">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="space-y-1 pl-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Locked Commission</span>
                                  <span className="text-xs font-black text-red-600 font-mono block">
                                    ₦{(referees.filter(ref => !ref.paidOnetimeFee).length * 250.00).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="space-y-1 pl-3">
                                  <span className="text-[9px] font-bold text-indigo-500 uppercase block">Withdrawable</span>
                                  <span className="text-xs font-black text-indigo-700 font-mono block">
                                    ₦{Math.max(0, balance - referees.filter(ref => !ref.paidOnetimeFee).length * 250.00).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              {referees.filter(ref => !ref.paidOnetimeFee).length > 0 && (
                                <p className="text-[9px] text-red-500 font-bold leading-normal">
                                  Notice: ₦{(referees.filter(ref => !ref.paidOnetimeFee).length * 250.00).toLocaleString()} is locked because {referees.filter(ref => !ref.paidOnetimeFee).length} of your referred friend(s) have not completed their one-time verification fee.
                                </p>
                              )}
                            </div>
                          )}

                          <form onSubmit={submitWithdrawal} className="space-y-4">
                            
                            {/* Saved Beneficiaries section */}
                            {savedAccounts.length > 0 && (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Saved Beneficiaries (Tap to load)</span>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                  {savedAccounts.map((acc) => (
                                    <div 
                                      key={acc.id} 
                                      onClick={() => {
                                        setCashoutBank(acc.bankName);
                                        setCashoutAccountNumber(acc.accountNumber);
                                        setCashoutAccountName(acc.accountName);
                                        showToast(`Loaded ${acc.accountName}'s details!`);
                                      }}
                                      className="bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 text-left transition-all cursor-pointer group shadow-sm max-w-[240px]"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs font-bold text-slate-800 block truncate leading-tight capitalize">{acc.accountName}</span>
                                        <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5 leading-none">
                                          {acc.bankName.replace(/Bank/i, '').trim()} · <span className="font-mono">{acc.accountNumber}</span>
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Delete saved account "${acc.accountName}"?`)) {
                                            deleteSavedAccount(acc.id);
                                          }
                                        }}
                                        className="text-slate-400 hover:text-red-500 p-1 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                        title="Delete saved account"
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Beneficiary Bank</label>
                              <select 
                                value={cashoutBank}
                                onChange={(e) => setCashoutBank(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none shadow-inner"
                              >
                                {NIGERIAN_BANKS.map((bank) => (
                                  <option key={bank} value={bank}>{bank}</option>
                                ))}
                              </select>
                            </div>
         
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">NUBAN Account Number</label>
                                <input
                                  type="text"
                                  maxLength={10}
                                  value={cashoutAccountNumber}
                                  onChange={(e) => setCashoutAccountNumber(e.target.value.replace(/\D/g, ''))}
                                  placeholder="e.g. 0123456789"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none shadow-inner"
                                />
                              </div>
         
                              <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Beneficiary Owner Name (NUBAN Validated)</label>
                                <input
                                  type="text"
                                  value={cashoutAccountName}
                                  onChange={(e) => setCashoutAccountName(e.target.value)}
                                  placeholder="e.g. Obinna Opara"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none shadow-inner"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={saveCurrentAccount}
                                  onChange={(e) => setSaveCurrentAccount(e.target.checked)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-600">Save details on withdrawal</span>
                              </label>
                              <button
                                type="button"
                                onClick={handleSaveBankDetails}
                                disabled={savingAccountLoading}
                                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-sm shrink-0 disabled:opacity-50"
                              >
                                {savingAccountLoading ? "Saving..." : "💾 Save details now"}
                              </button>
                            </div>
         
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amount to withdraw (₦)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-550 font-mono">₦</span>
                                <input
                                  type="number"
                                  value={cashoutAmount || ''}
                                  onChange={(e) => setCashoutAmount(parseFloat(e.target.value) || 0)}
                                  placeholder="Minimum 1,000.00"
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold outline-none shadow-inner"
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-1 font-semibold leading-relaxed">
                                Notice: Fast instant routing withdrawal charges is ₦100 fixed flat commission.
                              </span>
                            </div>
         
                            <button 
                              type="submit"
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                            >
                              Authorize Wallet Cashout Transfer
                            </button>
                          </form>

                          {/* Referrals Status List */}
                          {referees.length > 0 && (
                            <div className="mt-6 border-t border-slate-100 pt-5 space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                👥 Referrals & Commission Status
                              </h3>
                              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                {referees.map((ref) => {
                                  const isActivated = ref.paidOnetimeFee === true;
                                  return (
                                    <div key={ref.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                                      <div>
                                        <p className="font-bold text-slate-800">{ref.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium font-mono">{ref.email}</p>
                                      </div>
                                      <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                          isActivated 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                                        }`}>
                                          {isActivated ? '✅ Activated (₦250 Claimed)' : '⏳ Pending (₦250 Locked)'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Transaction history ledger lines */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">
                      📓 Wallet Balance ledger
                    </h3>

                    <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px] mt-4">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.date} · {tx.id}</p>
                          </div>

                          <div className="text-right">
                            <span className={`text-xs font-black font-mono block ${
                              tx.type === 'earn' || tx.type === 'deposit' ? 'text-green-600' : 'text-slate-700'
                            }`}>
                              {tx.type === 'earn' || tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </span>
                            <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                              tx.status === 'successful' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center mt-5">
                    <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block">Wallet Balance</span>
                    <span className="text-lg font-black text-indigo-900 font-mono">
                      ₦{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>

              {/* Dedicated Past Cashouts / Withdrawals Tracker */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-6">
                <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-rose-500" />
                      Track Cashout Requests
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Monitor the processing status of your past bank withdrawals.</p>
                  </div>
                  <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    {transactions.filter(t => t.type === 'withdraw').length} Requests
                  </span>
                </div>

                {transactions.filter(t => t.type === 'withdraw').length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-bold">No withdrawal requests found.</p>
                    <p className="text-[10px] text-slate-500 mt-1">Your past cashouts will show up here with their live status updates.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                          <th className="py-2.5">ID</th>
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">Description</th>
                          <th className="py-2.5">Amount</th>
                          <th className="py-2.5 text-right">Processing Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.filter(t => t.type === 'withdraw').map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-mono text-[10px] text-slate-500">{tx.id}</td>
                            <td className="py-3 font-bold text-slate-600">{tx.date}</td>
                            <td className="py-3">
                              <div className="font-bold text-slate-700">{tx.description}</div>
                            </td>
                            <td className="py-3 font-black text-rose-600 font-mono">
                              -₦{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right font-bold">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                tx.status === 'successful' ? 'bg-green-50 text-green-700 border border-green-100' :
                                tx.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                                'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  tx.status === 'successful' ? 'bg-green-500' :
                                  tx.status === 'pending' ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`} />
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Referral & Invite Rewards Program */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl border border-indigo-150 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <Award className="h-3.5 w-3.5" />
                    Referral Program Active
                  </div>
                  <h3 className="text-base font-black text-indigo-950">
                    Invite Your Friends & Earn Big Commission 💸
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Share your unique referral code or link with others. For every active Nigerian earner who signs up using your code, they receive an instant <strong className="text-indigo-900 font-bold">₦150.00 sign-up bonus</strong>, and you earn <strong className="text-emerald-700 font-black">₦250.00 cash rewards</strong> instantly credited to your wallet balance!
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center gap-4 shrink-0 shadow-sm">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Your Referral Code</span>
                    <span className="text-sm font-black text-slate-800 font-mono tracking-wide block select-all bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 mt-1">
                      {userReferralCode || 'loading...'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <button
                      onClick={copyRefLink}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest py-3 px-5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span>🔗 Copy Invite Link</span>
                    </button>
                    {copiedId === 'ref' && (
                      <span className="text-[9px] text-emerald-600 font-black tracking-wider uppercase text-center mt-1 animate-pulse">
                        Copied Link!
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: ADMINISTRATIVE CENTRAL CONTROLLER */}
          {activeTab === 'admin' && isUserAdmin && (
            <div className="space-y-6 animate-fade-in" id="screen-admin">
              
              {/* Header block */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Shield className="h-40 w-40" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse">
                        Administrator Console
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">
                      Olike System Operations Tower
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1 max-w-xl">
                      Real-time visibility over transactions, task fulfillment, verified profiles, and global system health.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (confirm("Create 5 generic test submissions for testing?")) {
                          INITIAL_SUBMISSIONS.forEach(async (sub) => {
                            const customId = `sub-test-${Math.floor(1000 + Math.random() * 9000)}`;
                            await setDoc(doc(db, "submissions", customId), {
                              ...sub,
                              id: customId,
                              createdAt: new Date().toISOString()
                            });
                          });
                          showToast("Created test submissions successfully!");
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all border border-slate-700 shadow-sm cursor-pointer"
                    >
                      ⚡ Inject Test Submissions
                    </button>
                  </div>
                </div>
              </div>

              {/* Operations Metrics Panel Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Managed Profiles</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {allProfiles.length}
                  </span>
                  <span className="text-[9px] text-green-600 font-bold block mt-1.5">● Real-time synced</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aggregate Ledger Capital</span>
                  <span className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
                    ₦{allProfiles.reduce((sum, p) => sum + (p.balance ?? 0), 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1.5">Total platform funds</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pending Proof Uploads</span>
                  <span className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                    {submissions.filter(s => s.status === 'pending').length}
                  </span>
                  <span className="text-[9px] text-amber-500 font-bold block mt-1.5">Awaiting validation review</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pending Withdrawals</span>
                  <span className="text-2xl font-black text-rose-500 font-mono tracking-tight">
                    {allTransactions.filter(t => t.type === 'withdraw' && t.status === 'pending').length}
                  </span>
                  <span className="text-[9px] text-rose-450 font-bold block mt-1.5">Awaiting payment payout</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Ad Campaigns</span>
                  <span className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
                    {tasks.length}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1.5">Global earn items</span>
                </div>
              </div>

              {/* Main operations body grids */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT BLOCK: Task Submissions Approval Queue + Campaign Creator (col-span-7) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Withdrawal Requests Queue Container */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" id="admin-withdrawal-queue">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                      <div>
                        <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          💸 Withdrawal Requests Queue
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Review, approve, and process user bank cashout requests in real-time.
                        </p>
                      </div>

                      <div className="flex bg-slate-100 rounded-lg p-0.5">
                        {(['pending', 'successful', 'failed', 'all'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setAdminWithdrawFilter(filter)}
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all capitalize cursor-pointer ${
                              adminWithdrawFilter === filter 
                                ? 'bg-white text-slate-800 shadow-sm font-extrabold' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto pr-1">
                      {allTransactions.filter(t => t.type === 'withdraw' && (adminWithdrawFilter === 'all' ? true : t.status === adminWithdrawFilter)).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-400 font-bold">No withdrawal requests found</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-semibold">There are no withdrawals matching the selected filter.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {allTransactions
                            .filter(t => t.type === 'withdraw' && (adminWithdrawFilter === 'all' ? true : t.status === adminWithdrawFilter))
                            .map((tx) => {
                              const userProfile = allProfiles.find(p => p.id === tx.userId);
                              return (
                                <div key={tx.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 px-2 rounded-xl transition-all">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                                        ID: {tx.id}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                        tx.status === 'pending' ? 'bg-amber-150 text-amber-800 animate-pulse border border-amber-200' : 
                                        (tx.status === 'successful' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                      }`}>
                                        {tx.status}
                                      </span>
                                    </div>

                                    <div>
                                      <h4 className="text-xs font-black text-slate-800">
                                        {tx.description}
                                      </h4>
                                      <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                                        Requester: <span className="text-indigo-650 font-black">{userProfile?.name || 'Unknown User'}</span> ({userProfile?.email || 'No email'})
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-semibold">
                                        User Wallet Balance: <span className="font-mono text-slate-600 font-bold">₦{(userProfile?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                      </p>
                                    </div>

                                    <div className="text-[10px] text-slate-450 font-semibold">
                                      Requested Date: {tx.date}
                                    </div>
                                  </div>

                                  <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Cashout Amount</span>
                                      <span className="text-sm font-black text-rose-600 font-mono">
                                        ₦{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>

                                    {tx.status === 'pending' && (
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={() => handleRejectWithdrawal(tx)}
                                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-red-200 cursor-pointer"
                                        >
                                          Decline & Refund
                                        </button>
                                        <button
                                          onClick={() => handleApproveWithdrawal(tx)}
                                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer"
                                        >
                                          Approve Payment
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Submissions Queue Container */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                      <div>
                        <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          🛡️ Proof Verification Queue
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Review submitted social media evidence screenshots and usernames.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        {/* View Mode switcher */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => setAdminViewMode('list')}
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer ${
                              adminViewMode === 'list' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            List
                          </button>
                          <button
                            onClick={() => setAdminViewMode('gallery')}
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer ${
                              adminViewMode === 'gallery' 
                                ? 'bg-white text-indigo-650 shadow-sm font-extrabold' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Gallery Grid
                          </button>
                        </div>

                        {/* Status Filter */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                          {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setAdminSubFilter(filter)}
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition-all capitalize cursor-pointer ${
                                adminSubFilter === filter 
                                  ? 'bg-white text-slate-800 shadow-sm font-extrabold' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Submissions List / Gallery */}
                    <div className="max-h-[580px] overflow-y-auto pr-1">
                      {submissions.filter(s => adminSubFilter === 'all' ? true : s.status === adminSubFilter).length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <p className="text-xs font-bold">No proof submissions found</p>
                          <p className="text-[10px] mt-1">There are no submissions matching your filter in this cluster.</p>
                        </div>
                      ) : adminViewMode === 'gallery' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {submissions
                            .filter(s => adminSubFilter === 'all' ? true : s.status === adminSubFilter)
                            .map((sub) => (
                              <div key={sub.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
                                {/* Large screenshot preview container */}
                                <div className="relative h-44 w-full bg-slate-900 group overflow-hidden">
                                  <img 
                                    src={sub.screenshot} 
                                    alt="Verification Proof" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-zoom-in"
                                    onClick={() => window.open(sub.screenshot, '_blank')}
                                    title="Click to view full size image in new tab"
                                  />
                                  <div className="absolute top-2 left-2 bg-slate-950/80 text-[8px] font-mono font-black text-slate-300 px-2 py-0.5 rounded backdrop-blur-xs">
                                    ID: {sub.id}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-slate-950/80 text-[10px] font-mono font-black text-green-400 px-2 py-0.5 rounded backdrop-blur-xs">
                                    ₦{sub.payout.toLocaleString()}
                                  </div>
                                  <div className="absolute bottom-2 left-2 bg-slate-950/80 text-[8px] font-black text-slate-300 px-2 py-0.5 rounded backdrop-blur-xs uppercase tracking-wider">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString() : 'Unknown'}
                                  </div>
                                </div>

                                {/* Body metadata */}
                                <div className="p-3.5 flex flex-col justify-between flex-1 bg-white">
                                  <div className="space-y-1.5 mb-3">
                                    <h4 className="text-xs font-black text-slate-800 line-clamp-1" title={sub.taskName}>
                                      {sub.taskName}
                                    </h4>
                                    <div className="text-[10px] text-slate-500 font-bold">
                                      Applicant: <span className="text-indigo-650 font-black">{sub.userName}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                      <span className="text-[9px] text-indigo-600 font-extrabold font-mono bg-indigo-50/70 border border-indigo-100 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                        @{sub.handle}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                        sub.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' : 
                                        (sub.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200')
                                      }`}>
                                        {sub.status}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Fast action approval buttons */}
                                  {sub.status === 'pending' && (
                                    <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                                      <button
                                        onClick={() => handleRejectSubmission(sub.id)}
                                        className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-red-200 cursor-pointer text-center"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleApproveSubmission(sub)}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-green-600/10 cursor-pointer text-center"
                                      >
                                        Approve
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {submissions
                            .filter(s => adminSubFilter === 'all' ? true : s.status === adminSubFilter)
                            .map((sub) => (
                              <div key={sub.id} className="bg-slate-50 border border-slate-200/65 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start justify-between hover:border-indigo-200 transition-all bg-white">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                                      ID: {sub.id}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                      sub.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                                      (sub.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                                    }`}>
                                      {sub.status}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-black text-slate-800">
                                      {sub.taskName}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                                      Applicant: <span className="text-indigo-650 font-black">{sub.userName}</span> ({sub.userEmail})
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-bold">
                                      Social Handle: <span className="text-indigo-600 font-extrabold font-mono bg-indigo-50 px-1.5 py-0.5 rounded">{sub.handle}</span>
                                    </p>
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-semibold">
                                    Submitted: {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString() : 'Unknown'}
                                  </div>
                                </div>

                                {/* Screenshot Proof Preview & Actions */}
                                <div className="flex flex-col items-end gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-200/60 pt-3 md:pt-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Reward Payout</span>
                                      <span className="text-xs font-black text-green-600 font-mono">
                                        +₦{sub.payout.toLocaleString()}
                                      </span>
                                    </div>
                                    <img 
                                      src={sub.screenshot} 
                                      alt="Verification Proof" 
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-lg object-cover border border-slate-300 hover:scale-150 transition-all cursor-zoom-in"
                                      onClick={() => window.open(sub.screenshot, '_blank')}
                                    />
                                  </div>

                                  {sub.status === 'pending' && (
                                    <div className="flex gap-1.5 w-full md:w-auto">
                                      <button
                                        onClick={() => handleRejectSubmission(sub.id)}
                                        className="flex-1 md:flex-none px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-red-200 shadow-sm cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleApproveSubmission(sub)}
                                        className="flex-1 md:flex-none px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-green-600/10 cursor-pointer"
                                      >
                                        Approve & Credit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deploy Custom Global Ad Campaign Container */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4 mb-4">
                      📢 Deploy New Social Media Campaign
                    </h3>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!adminDescription.trim()) {
                          alert("Please fill campaign task description.");
                          return;
                        }
                        handleCreateGlobalTask(
                          adminPlatform,
                          adminType,
                          adminDescription,
                          adminPayout,
                          adminUrl,
                          adminSlots
                        );
                        setAdminDescription('');
                        setAdminUrl('');
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Platform</label>
                          <select
                            value={adminPlatform}
                            onChange={(e) => {
                              const nextPlatform = e.target.value as any;
                              setAdminPlatform(nextPlatform);
                              const actions = PLATFORM_ACTIONS[nextPlatform] || [];
                              if (actions.length > 0) {
                                setAdminType(actions[0].value as any);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="Instagram">📸 Instagram</option>
                            <option value="Twitter">🐦 Twitter</option>
                            <option value="TikTok">🎵 TikTok</option>
                            <option value="YouTube">▶️ YouTube</option>
                            <option value="WhatsApp">💬 WhatsApp</option>
                            <option value="Website">🌐 Website</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Action Type Required</label>
                          <select
                            value={adminType}
                            onChange={(e) => setAdminType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                          >
                            {(PLATFORM_ACTIONS[adminPlatform] || []).map((action) => (
                              <option key={action.value} value={action.value}>
                                {action.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">User Payout Reward (₦)</label>
                          <input
                            type="number"
                            required
                            value={adminPayout}
                            onChange={(e) => setAdminPayout(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Slots Capacity</label>
                          <input
                            type="number"
                            required
                            value={adminSlots}
                            onChange={(e) => setAdminSlots(parseInt(e.target.value) || 100)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Social Media Campaign Link / URL</label>
                        <input
                          type="url"
                          placeholder="https://instagram.com/p/..."
                          value={adminUrl}
                          onChange={(e) => setAdminUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Task Instructions (Description)</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="e.g. Follow @nzeh.m on Instagram and submit your handle name as verification proof."
                          value={adminDescription}
                          onChange={(e) => setAdminDescription(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl p-3 text-xs font-bold outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        Publish & Deploy Global Campaign
                      </button>
                    </form>
                  </div>

                  {/* Active Global Campaigns Manager */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4 mb-4">
                      📋 Deployed Campaigns Control
                    </h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {tasks.length === 0 ? (
                        <p className="text-[11px] text-slate-400 font-bold">No active global campaigns currently deployed.</p>
                      ) : (
                        tasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg shrink-0">{task.platformIcon}</span>
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-black text-slate-800 truncate">{task.platform} {task.type}</h4>
                                <p className="text-[9px] text-slate-400 font-semibold truncate max-w-[280px]">{task.description}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded">
                                    Payout: ₦{task.payout.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-amber-650 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded">
                                    Slots left: {task.slotsLeft}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteCampaign(task.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer shrink-0"
                              title="Delete Deployed Campaign"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pricing Grid Management editor */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4 mb-4">
                      ⚙️ Edit Social Traffic Pricing Grid
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mb-4 leading-normal">
                      Configure the default rates advertisers pay (Advertiser Rate) and what Olike earners receive (Earner Payout Rate) for each action.
                    </p>
                    <div className="space-y-4">
                      {pricingGrid.map((rate, index) => (
                        <div key={rate.id} className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800">{rate.label} ({rate.id})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Advertiser Rate (₦)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={rate.advertiserRate}
                                onChange={(e) => {
                                  const updated = [...pricingGrid];
                                  updated[index].advertiserRate = parseFloat(e.target.value) || 0;
                                  setPricingGrid(updated);
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Earner Payout (₦)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={rate.earnerRate}
                                onChange={(e) => {
                                  const updated = [...pricingGrid];
                                  updated[index].earnerRate = parseFloat(e.target.value) || 0;
                                  setPricingGrid(updated);
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={async () => {
                          if (!isUserAdmin) return;
                          try {
                            await setDoc(doc(db, "config", "pricing"), { grid: pricingGrid });
                            showToast("Pricing Grid updated and synchronized successfully!");
                          } catch (e) {
                            console.error("Error saving pricing grid:", e);
                            alert("Error saving Pricing Grid to database.");
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
                      >
                        Save Pricing Grid & Sync Deployed Rates
                      </button>
                    </div>
                  </div>

                </div>

                {/* RIGHT BLOCK: Managed User Base Registry (col-span-5) */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div>
                      <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest">
                        👥 Managed Members Registry
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Manage user accounts, adjust wallet limits, and assign staff credentials.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 overflow-y-auto max-h-[700px] pr-1">
                      {allProfiles.map((profile) => (
                        <div key={profile.id} className="py-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-slate-800">
                                  {profile.name}
                                </h4>
                                {profile.isAdmin && (
                                  <span className="bg-red-50 text-red-755 border border-red-100 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded">
                                    Admin
                                  </span>
                                )}
                                {profile.isPremium && (
                                  <span className="bg-indigo-50 text-indigo-755 border border-indigo-100 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded">
                                    Premium
                                  </span>
                                )}
                                {profile.blocked && (
                                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[7px] font-black uppercase tracking-wider px-1  py-0.5 rounded animate-pulse">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">
                                {profile.email || "no-email@olike.pro"}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-800 font-mono block">
                                ₦{(profile.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Quick Admin tools drawer for this specific user */}
                          <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-2.5 space-y-2">
                            {editingUserId === profile.id ? (
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1.5 text-[10px] font-black text-slate-400 font-mono">₦</span>
                                  <input
                                    type="number"
                                    value={editBalanceInput}
                                    onChange={(e) => setEditBalanceInput(e.target.value)}
                                    placeholder="Enter new balance"
                                    className="w-full bg-white border border-slate-200 focus:border-indigo-400 rounded-lg pl-6 pr-2 py-1 text-[10px] font-bold outline-none"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const val = parseFloat(editBalanceInput);
                                    if (isNaN(val)) {
                                      alert("Please input a valid numeric balance.");
                                      return;
                                    }
                                    handleModifyUserBalance(profile.id, profile.name, val);
                                    setEditingUserId(null);
                                    setEditBalanceInput('');
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUserId(null);
                                    setEditBalanceInput('');
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <button
                                  onClick={() => {
                                    setEditingUserId(profile.id);
                                    setEditBalanceInput((profile.balance ?? 0).toString());
                                  }}
                                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all shadow-sm cursor-pointer"
                                >
                                  ✏️ Balance
                                </button>

                                <button
                                  onClick={() => handleToggleUserAdmin(profile.id, profile.name, profile.isAdmin ?? false)}
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all border shadow-sm cursor-pointer ${
                                    profile.isAdmin 
                                      ? 'bg-red-50 text-red-755 border-red-200 hover:bg-red-100' 
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {profile.isAdmin ? '⚠️ Revoke Admin' : '🛡️ Make Admin'}
                                </button>

                                <button
                                  onClick={() => handleToggleBlockUser(profile.id, profile.name, profile.blocked ?? false)}
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all border shadow-sm cursor-pointer ${
                                    profile.blocked 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  {profile.blocked ? '✅ Unblock' : '🚫 Block'}
                                </button>

                                <button
                                  onClick={() => handleDeleteUserProfile(profile.id, profile.name)}
                                  className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all shadow-sm cursor-pointer"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </section>

        {/* RIGHT SIDEBAR - styled exactly like the video */}
        <aside id="olike-right-sidebar" className="hidden lg:flex w-72 bg-white border-l border-slate-200 p-5 flex-col flex-shrink-0 overflow-y-auto">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Recent Activities</h3>
          <p className="text-[10px] text-slate-400 font-bold leading-none mt-1">See what other people are doing on Olike</p>

          <div className="w-full border-t border-slate-100 my-4"></div>

          {/* Dynamic Mock Activity list */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                io
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">
                  <span className="font-extrabold text-slate-900">@ibe_obinna</span> from Enugu just updated bank records.
                </p>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">30 secs ago</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-pink-50 border border-pink-200 text-pink-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                ca
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">
                  <span className="font-extrabold text-slate-900">@chioma_ade</span> just received <span className="text-emerald-600 font-bold">₦1,200.00</span> for Twitter Likes task.
                </p>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">2 mins ago</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                yo
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">
                  <span className="font-extrabold text-slate-900">@yomi_f</span> just launched a new <span className="text-indigo-600 font-bold">Followers Campaign</span>.
                </p>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">5 mins ago</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                al
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">
                  <span className="font-extrabold text-slate-900">@aliu_k</span> just withdrew <span className="text-slate-900 font-black">₦15,000.00</span> to Access Bank.
                </p>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">12 mins ago</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                fe
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700">
                  <span className="font-extrabold text-slate-900">@femi_og</span> just upgraded to <span className="text-amber-600 font-bold">Olike Influencer Club</span>.
                </p>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">20 mins ago</span>
              </div>
            </div>
          </div>

          <div className="w-full border-t border-slate-100 my-4"></div>

          {/* Sidebar Footer links and Copyright */}
          <div className="space-y-3.5 text-slate-400">
            <div className="flex gap-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 justify-center">
              <a href="#about" className="hover:text-slate-800 transition-colors">About</a>
              <span>·</span>
              <a href="#support" className="hover:text-slate-800 transition-colors">Support</a>
              <span>·</span>
              <a href="#terms" className="hover:text-slate-800 transition-colors">Terms</a>
              <span>·</span>
              <a href="#privacy" className="hover:text-slate-800 transition-colors">Privacy</a>
            </div>
            <div className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide leading-relaxed">
              © {new Date().getFullYear()} Olike International Ltd.<br />Secure Cloud-Synced Ledger System.
            </div>
          </div>
        </aside>

      </main>
 
      {/* Mobile Bottom Navigation Bar */}
      <div id="olike-mobile-nav" className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex md:hidden items-center justify-around px-2 z-40">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
            activeTab === 'overview' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
        </button>
 
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
            activeTab === 'tasks' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Coins className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Earn</span>
        </button>
 
        <button 
          onClick={() => setActiveTab('advertise')}
          className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
            activeTab === 'advertise' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Megaphone className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Ad</span>
        </button>
 
        <button 
          onClick={() => setActiveTab('marketplace')}
          className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
            activeTab === 'marketplace' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Market</span>
        </button>
 
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
            activeTab === 'wallet' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Smartphone className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">More</span>
        </button>

        {isUserAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center gap-1.5 w-14 transition-all duration-200 ${
              activeTab === 'admin' ? 'text-red-600 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Admin</span>
          </button>
        )}
      </div>

      {/* MODAL 1: CHOOSE TARGET TASK DETAIL INSTRUCTION & PROOF WORK SUBMITTER */}
      {selectedTask && (
        <div id="modal-task-detail" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{selectedTask.platformIcon}</span>
                <div>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">
                    Perform {selectedTask.platform} {selectedTask.type}
                  </h3>
                  <p className="text-[10px] text-slate-404 font-extrabold tracking-wide font-mono">
                    Olike micro-verified campaign
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs flex gap-3 items-start">
                <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-indigo-950">How To Complete This Task:</h4>
                  <ul className="list-decimal list-inside space-y-1 text-indigo-900 font-semibold mt-1">
                    <li>Click start task link to open profile directly</li>
                    <li>Click follow/like appropriately</li>
                    <li>Come back to this page and enter your handle username as proof! and also send a screenshot</li>
                  </ul>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Campaign Targeted Link</span>
                <a 
                  href={selectedTask.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-lg border border-transparent transition-all"
                >
                  <span>{selectedTask.platform === 'Website' ? 'Open Website Link' : 'Open Target Profile Profile'}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <form onSubmit={executeProofSubmission} className="space-y-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {selectedTask.platform === 'Website' ? 'Your Verification Details / Username' : 'Your Social Media Handle (Username)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={taskProofHandle}
                    onChange={(e) => setTaskProofHandle(e.target.value)}
                    placeholder={selectedTask.platform === 'Website' ? 'e.g. Registered with name/email' : 'e.g. @obinna_codes'}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-3 text-xs font-bold outline-none shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Proof Screenshot (Upload File or Paste Image URL)
                  </label>
                  
                  {/* Drag and Drop Container */}
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTaskProofScreenshot(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    onClick={() => {
                      document.getElementById('screenshot-file-input')?.click();
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400'
                    }`}
                  >
                    <input
                      id="screenshot-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setTaskProofScreenshot(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    
                    {taskProofScreenshot ? (
                      <div className="relative w-full max-w-[140px] group" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={taskProofScreenshot}
                          alt="Uploaded proof"
                          referrerPolicy="no-referrer"
                          className="w-full h-24 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setTaskProofScreenshot('')}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-colors text-[10px] leading-none"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-600">
                          Drag and drop screenshot here, or <span className="text-indigo-600">click to browse</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          PNG, JPG or JPEG format supported
                        </p>
                      </>
                    )}
                  </div>

                  {/* Fallback Text Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Or paste direct image URL here..."
                      value={taskProofScreenshot.startsWith('data:') ? '' : taskProofScreenshot}
                      onChange={(e) => setTaskProofScreenshot(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs font-bold outline-none"
                    />
                    {taskProofScreenshot && !taskProofScreenshot.startsWith('data:') && (
                      <button
                        type="button"
                        onClick={() => setTaskProofScreenshot('')}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Your Payoff Commission</span>
                    <span className="text-lg font-black text-green-600 font-mono">
                      ₦{(isPremium ? selectedTask.payout * 2 : selectedTask.payout).toFixed(2)}
                    </span>
                  </div>

                  <button 
                    type="submit"
                    disabled={submittingProof}
                    className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-green-600/10"
                  >
                    {submittingProof ? 'Verifying...' : 'Submit Submissions'}
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: UPGRADE TO PREMIUM MODAL */}
      {isUpgradingModal && (
        <div id="modal-premium-upgrade" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">
                  Olike Premium Influencer
                </h3>
              </div>
              <button 
                onClick={() => setIsUpgradingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-normal font-medium">
                Verify your account to join the elite group of publishers and influencers. Upgrade fee is ₦1,000.00 flat lifetime price.
              </p>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-xs">
                <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider">Unrivaled Premium Perks:</h4>
                <ul className="space-y-1.5 text-indigo-900 font-bold">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-indigo-600 stroke-[3]" />
                    <span>2.0× Double (2x) payout rate on all microtasks</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-indigo-600 stroke-[3]" />
                    <span>Priority task approval status within 1 hour</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-indigo-600 stroke-[3]" />
                    <span>Naira (₦) affiliate direct credit payout (₦500/user)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification Fee</span>
                  <span className="text-lg font-black text-indigo-950 font-mono">₦1,000.00</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsUpgradingModal(false)}
                    className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={activatePremiumClub}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Confirm Upgrade
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
