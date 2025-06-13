import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';

// --- Iconos (Lucide) ---
const Icon = ({ path, className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  layout: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  settings: "M12.22 2h-4.44a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2H2.78a2 2 0 0 0-1.73 1l-.25.44a2 2 0 0 1 0 2l.25.44a2 2 0 0 1 1.73 1v4.44a2 2 0 0 0 2 2h.78a2 2 0 0 1 1.73 1l.25.44a2 2 0 0 1 0 2l-.25.44a2 2 0 0 1-1.73 1h-.78a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0-2-2h-4.44a2 2 0 0 0-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1h.78a2 2 0 0 0 2-2v-4.44a2 2 0 0 0-2-2h-.78a2 2 0 0 1-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1H12.22z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  cart: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  store: "M18 6L18 4H6L6 6M6 6L6 20H18V6M6 6H2M18 6H22",
  key: "M14 21v-4.99L21 7h-4V3H7v4H3l7 9.01V21h4z",
  book: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  check: "M20 6 9 17l-5-5",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
  email: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14"
};

let db;
let auth;

const initializeFirebase = () => {
  try {
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_API_KEY,
      authDomain: process.env.REACT_APP_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_PROJECT_ID,
      storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_APP_ID,
    };
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config not found. Make sure environment variables are set.");
        return;
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) { console.error("Error initializing Firebase:", error); }
};

initializeFirebase();

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center"><Spinner isLarge={true} /></div>;
  
  return user ? <MainApp user={user} /> : <AuthFlow />;
}

// --- Componentes de UI reutilizables ---
const Spinner = ({ isLarge = false }) => (
    <div className="flex justify-center items-center">
        <svg className={`animate-spin ${isLarge ? 'h-8 w-8' : 'h-5 w-5'} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const NavItem = ({ icon, label, isActive, onClick }) => (
    <li className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center gap-4 transition-colors ${isActive ? 'bg-indigo-600/30 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`} onClick={onClick}>
      {icon}
      <span className="font-semibold">{label}</span>
    </li>
);

// --- Flujo de Autenticación (Login / Registro) ---
const AuthFlow = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');

  const handleAuthError = (err) => {
      console.error("Error de autenticación:", err.code, err.message);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("Este email ya está registrado. Por favor, inicia sesión.");
          break;
        case 'auth/invalid-email':
          setError("El formato del email no es válido.");
          break;
        case 'auth/weak-password':
          setError("La contraseña es demasiado débil (mín. 6 caracteres).");
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Email o contraseña incorrectos.");
          break;
        default:
          setError(`Error: ${err.message}`);
          break;
      }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2">Asistente AI</h1>
        <p className="text-gray-400 text-center mb-8">La herramienta para recuperar carritos y automatizar el soporte.</p>
        
        {isLoginView ? <LoginView onError={handleAuthError} /> : <RegisterView onError={handleAuthError} />}
        {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}

        <p className="text-center text-sm text-gray-500 mt-6">
          {isLoginView ? "¿No tienes cuenta? " : "¿Ya tienes una cuenta? "}
          <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-semibold text-indigo-400 hover:text-indigo-300">
            {isLoginView ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
};

const LoginView = ({ onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      onError(err);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Iniciar Sesión</h2>
      <AuthInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" icon={<Icon path={ICONS.email} />} />
      <AuthInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon={<Icon path={ICONS.lock} />} />
      <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-600 flex items-center justify-center gap-2">
        {loading ? <Spinner/> : 'Entrar'}
      </button>
    </form>
  );
};

const RegisterView = ({ onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (password.length < 6) {
      onError({ code: 'auth/weak-password' });
      setLoading(false);
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      onError(err);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Crear Cuenta</h2>
      <AuthInput id="email-reg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" icon={<Icon path={ICONS.email} />} />
      <AuthInput id="password-reg" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" icon={<Icon path={ICONS.lock} />} />
      <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-500 disabled:bg-gray-600 flex items-center justify-center gap-2">
        {loading ? <Spinner/> : 'Registrarse'}
      </button>
    </form>
  );
};


// --- Aplicación Principal (Después del Login) ---
const MainApp = ({ user }) => {
  const [view, setView] = useState('dashboard');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [config, setConfig] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('unknown');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('payment_success')) {
        setPaymentStatus('success');
        window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "clientes", user.uid), (doc) => {
        if (doc.exists()) {
            setConfig(doc.data());
        } else {
            setConfig({ plan: 'none' }); 
        }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    if (pathParts[0] === 'conversations' && pathParts[1]) {
      const convoId = decodeURIComponent(pathParts[1]);
      handleViewConversation(convoId);
    }
  }, []); 

  const handleViewConversation = (convoId) => {
    setActiveConversationId(convoId);
    setView('conversationDetail');
  };
  
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (config === null) {
      return <div className="bg-gray-900 min-h-screen flex items-center justify-center"><Spinner isLarge={true} /></div>;
  }
  
  if (paymentStatus === 'success' && (!config.plan || config.plan === 'none')) {
      return <PaymentSuccessView />;
  }

  if (!config.plan || config.plan === 'none') {
      return <SubscriptionFlow user={user} />;
  }
  
  const renderView = () => {
    switch(view) {
      case 'dashboard': return <DashboardView userId={user.uid} />;
      case 'conversations': return <ConversationsView userId={user.uid} onViewConversation={handleViewConversation} />;
      case 'conversationDetail': return <ConversationDetailView conversationId={activeConversationId} onBack={() => setView('conversations')} />;
      case 'configuracion': return <ConfigView userId={user.uid} config={config} />;
      default: return <DashboardView userId={user.uid} />;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="flex">
        <nav className="w-64 bg-gray-950/50 p-4 border-r border-gray-800 h-screen sticky top-0 flex flex-col">
           <div>
            <h1 className="text-2xl font-bold text-white mb-2">Asistente AI</h1>
            <p className="text-xs text-gray-400 truncate mb-10" title={user.email}>{user.email}</p>
          </div>
          <ul>
            <NavItem icon={<Icon path={ICONS.layout} />} label="Dashboard" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={<Icon path={ICONS.message} />} label="Conversaciones" isActive={view.startsWith('conversation')} onClick={() => setView('conversations')} />
            <NavItem icon={<Icon path={ICONS.settings} />} label="Configuración" isActive={view === 'configuracion'} onClick={() => setView('configuracion')} />
          </ul>
           <div className="mt-auto">
             <NavItem icon={<Icon path={ICONS.logout} />} label="Cerrar Sesión" isActive={false} onClick={handleLogout} />
           </div>
        </nav>
        <main className="flex-1 p-8 overflow-y-auto h-screen">{renderView()}</main>
      </div>
    </div>
  );
};

// --- Vistas de la Aplicación ---

const DashboardView = ({ userId }) => {
    const [stats, setStats] = useState({ recoveredValue: 0, recoveredCarts: 0 });
    const [carts, setCarts] = useState([]);
    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, "carritosAbandonados"), where("tiendaId", "==", userId), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalValue = 0, recoveredCount = 0;
            const cartsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            cartsData.forEach(cart => {
                if (cart.recuperado) {
                    recoveredCount++;
                    totalValue += cart.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                }
            });
            setCarts(cartsData);
            setStats({ recoveredValue: totalValue, recoveredCarts: recoveredCount });
        });
        return () => unsubscribe();
    }, [userId]);
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Dashboard de Rendimiento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<Icon path={ICONS.dollar} />} label="Ingresos Recuperados" value={`€${stats.recoveredValue.toFixed(2)}`} color="text-green-400" />
                <StatCard icon={<Icon path={ICONS.cart} />} label="Carritos Salvados" value={stats.recoveredCarts} color="text-blue-400" />
                <StatCard icon={<Icon path={ICONS.zap} />} label="Total Carritos Gestionados" value={carts.length} color="text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Actividad Reciente de Carritos</h3>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700"><div className="overflow-x-auto"><table className="w-full text-left">
                <thead className="border-b border-gray-700"><tr><th className="p-4">Estado</th><th className="p-4">Cliente</th><th className="p-4">Valor</th><th className="p-4">Fecha</th><th className="p-4">Productos</th></tr></thead>
                <tbody>{carts.slice(0, 10).map(cart => (<tr key={cart.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors"><td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${cart.recuperado ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{cart.recuperado ? 'Recuperado' : 'Pendiente'}</span></td><td className="p-4 font-mono text-sm">{cart.cliente ? cart.cliente.replace('whatsapp:', '') : 'N/A'}</td><td className="p-4">€{cart.productos ? cart.productos.reduce((s, i) => s + (i.precio * i.cantidad), 0).toFixed(2) : '0.00'}</td><td className="p-4 text-sm text-gray-400">{cart.timestamp ? new Date(cart.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</td><td className="p-4 text-sm text-gray-300">{cart.productos ? cart.productos.map(p => p.nombre).join(', ') : 'N/A'}</td></tr>))}</tbody>
            </table>{carts.length === 0 && <p className="p-4 text-center text-gray-500">Aún no hay actividad de carritos para mostrar.</p>}</div></div>
        </div>
    );
};

const ConversationsView = ({ userId, onViewConversation }) => {
  const [conversations, setConversations] = useState([]);
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'conversaciones'), where('tiendaId', '==', userId), orderBy('lastUpdate', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [userId]);
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Últimas Conversaciones</h2>
      <div className="space-y-4">{conversations.map(convo => (<div key={convo.id} onClick={() => onViewConversation(convo.id)} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"><p className="font-bold text-lg flex items-center gap-2"><Icon path={ICONS.user} className="w-5 h-5"/> Cliente: {convo.customerPhone.replace('whatsapp:', '')}</p><p className="text-sm text-gray-400">Última actualización: {convo.lastUpdate ? new Date(convo.lastUpdate.seconds * 1000).toLocaleString() : 'N/A'}</p></div>))}{conversations.length === 0 && <p className="text-center text-gray-500 py-8">No hay conversaciones para mostrar.</p>}</div>
    </div>
  );
};

const ConversationDetailView = ({ conversationId, onBack }) => {
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        if (!conversationId) return;
        const messagesRef = collection(db, 'conversaciones', conversationId, 'mensajes');
        const q = query(messagesRef, orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });
        return () => unsubscribe();
    }, [conversationId]);
    return (
        <div>
            <button onClick={onBack} className="mb-6 text-indigo-400 hover:text-indigo-300">&larr; Volver a todas las conversaciones</button>
            <h2 className="text-3xl font-bold mb-6">Detalle de la Conversación</h2>
            <div className="space-y-4">{messages.map(msg => (<div key={msg.id} className={`flex ${msg.author === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-xl p-4 rounded-lg ${msg.author === 'user' ? 'bg-gray-700' : 'bg-indigo-600'}`}><p>{msg.text}</p></div></div>))}</div>
        </div>
    );
};

const ConfigView = ({ userId, config }) => {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => { setFormData(config); }, [config]);
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  const handleCopyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        setMessage({ type: 'success', text: '¡API Key copiada!' });
      }, () => { setMessage({ type: 'error', text: 'No se pudo copiar.' }); });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    let finalConfig = {...formData};
    if (!finalConfig.apiKey) {
      if (window.crypto && window.crypto.randomUUID) {
        finalConfig.apiKey = window.crypto.randomUUID();
      } else {
        finalConfig.apiKey = 'fb-' + Date.now() + Math.random().toString(36).substring(2, 15);
      }
    }
    try {
        await setDoc(doc(db, "clientes", userId), finalConfig, { merge: true });
        setMessage({ type: 'success', text: '¡Configuración guardada!' });
        setFormData(finalConfig);
    } catch(error) { setMessage({ type: 'error', text: 'Error al guardar.' });
    } finally { setIsSaving(false); }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Configuración</h2>
      <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Input id="nombre" label="Nombre de tu e-commerce" value={formData.nombre || ''} onChange={handleChange} placeholder="Ej: Tienda de Moda" icon={<Icon path={ICONS.store} />} />
            <Input id="whatsapp" label="Nº de WhatsApp de Twilio" value={formData.whatsapp || ''} onChange={handleChange} placeholder="whatsapp:+14155238886" icon={<Icon path={ICONS.key} />} />
            <Input id="telefonoAlertas" label="Teléfono para Alertas (dueño)" value={formData.telefonoAlertas || ''} onChange={handleChange} placeholder="34666111222" icon={<Icon path={ICONS.phone} />} />
            {formData.apiKey && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400"><Icon path={ICONS.key}/></span>Tu API Key Universal</h3>
                <div className="flex items-center gap-2"><input type="text" value={formData.apiKey} readOnly className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 font-mono"/><button type="button" onClick={() => handleCopyToClipboard(formData.apiKey)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md"><Icon path={ICONS.clipboard} className="w-5 h-5"/></button></div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
             <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400"><Icon path={ICONS.book}/></span>Base de Conocimiento (FAQs)</h3>
            <Textarea id="faqs" label="Pega aquí tus preguntas y respuestas." value={formData.faqs || ''} onChange={handleChange} rows={10} />
          </div>
        </div>
        <footer className="p-6 bg-gray-900/50 border-t border-gray-700 flex items-center justify-end">
          <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-600 flex items-center gap-2">
            {isSaving ? <Spinner /> : <Icon path={ICONS.check} className="w-5 h-5"/>}
            {isSaving ? 'Guardando...' : 'Guardar y Generar Clave'}
          </button>
        </footer>
      </form>
      {message && <Notification message={message} onDismiss={() => setMessage(null)}/>}
    </div>
  );
};

const SubscriptionFlow = ({ user }) => {
    const [loadingPriceId, setLoadingPriceId] = useState(null);
    // --- ¡IMPORTANTE! ---
    // Pega aquí los IDs de los precios que has creado en tu panel de Stripe.
    const plans = {
        esencial: 'price_1Pxxxxxxxxxxxxxxxxx', 
        profesional: 'price_1Pyyyyyyyyyyyyyyyy',
        premium: 'price_1Pzzzzzzzzzzzzzzzz'
    };
    const handleSubscribe = async (priceId) => {
        if (!priceId.startsWith('price_')) {
            alert("El ID del plan no está configurado. Por favor, contacta con soporte.");
            return;
        }
        setLoadingPriceId(priceId);
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const response = await fetch(`${backendUrl}/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, userId: user.uid })
        });
        const session = await response.json();
        if (session.error) {
            alert(session.error.message);
            setLoadingPriceId(null);
            return;
        }
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({ sessionId: session.sessionId });
        if (error) {
            alert(error.message);
            setLoadingPriceId(null);
        }
    };
    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
            <h1 className="text-4xl font-bold mb-4">Elige tu Plan</h1>
            <p className="text-gray-400 mb-8">¡Estás a un paso de potenciar tu e-commerce!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
                <PlanCard title="Esencial" price="29€" features={['25 Recuperaciones/mes', 'IA para FAQs', 'Alertas a un humano']} onSubscribe={() => handleSubscribe(plans.esencial)} loading={loadingPriceId === plans.esencial} />
                <PlanCard title="Profesional" price="49€" features={['100 Recuperaciones/mes', 'IA (1000 convers)', 'Historial de Chats', 'Soporte prioritario']} onSubscribe={() => handleSubscribe(plans.profesional)} loading={loadingPriceId === plans.profesional} recommended />
                <PlanCard title="Premium" price="99€" features={['Recuperaciones Ilimitadas', 'Conversaciones Ilimitadas', 'Live Chat (Próx.)', 'IA con Stock (Próx.)']} onSubscribe={() => handleSubscribe(plans.premium)} loading={loadingPriceId === plans.premium} />
            </div>
        </div>
    );
};

const PaymentSuccessView = () => {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = '/'; 
        }, 5000); 

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
            <div className="text-center">
                <Icon path={ICONS.check} className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold mb-4">¡Pago Completado!</h1>
                <p className="text-gray-400 mb-8">Estamos activando tu plan. Serás redirigido al panel de control en unos segundos.</p>
                <div className="flex justify-center">
                   <Spinner isLarge={true} />
                </div>
            </div>
        </div>
    );
};

const PlanCard = ({ title, price, features, onSubscribe, loading, recommended = false }) => (
    <div className={`p-8 rounded-lg border ${recommended ? 'border-indigo-500' : 'border-gray-700'} bg-gray-800/50 flex flex-col`}>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-4xl font-bold my-4">{price}<span className="text-lg text-gray-400">/mes</span></p>
        <ul className="space-y-2 mb-8 flex-grow">
            {features.map(feature => (
                <li key={feature} className="flex items-center gap-3"><Icon path={ICONS.check} className="w-5 h-5 text-green-400"/><span>{feature}</span></li>
            ))}
        </ul>
        <button onClick={onSubscribe} disabled={loading} className={`w-full py-3 font-semibold rounded-lg flex items-center justify-center ${recommended ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'}`}>{loading ? <Spinner /> : 'Suscribirse'}</button>
    </div>
);
const AuthInput = ({ id, type, value, onChange, placeholder, icon }) => (
  <div className="relative">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">{icon}</span>
    <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-800 border border-gray-700 rounded-md pl-10 pr-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
  </div>
);
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex items-center gap-6"><div className={`p-3 bg-gray-900 rounded-full ${color}`}>{React.cloneElement(icon, { className: 'w-8 h-8' })}</div><div><p className="text-gray-400 text-sm">{label}</p><p className="text-3xl font-bold">{value}</p></div></div>
);
const Input = ({ id, label, value, onChange, placeholder, icon }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400">{icon}</span>{label}</h3>
    <input id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
  </div>
);
const Textarea = ({ id, label, value, onChange, rows=8 }) => (
  <div className="flex flex-col h-full">
    <label htmlFor={id} className="text-sm font-medium text-gray-400 mb-2">{label}</label>
    <textarea id={id} value={value} onChange={onChange} rows={rows} className="flex-grow w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
  </div>
);
const Notification = ({ message, onDismiss }) => {
  useEffect(() => { const timer = setTimeout(() => onDismiss(), 4000); return () => clearTimeout(timer); }, [onDismiss]);
  return (<div className={`fixed bottom-5 right-5 flex items-center gap-4 p-4 rounded-lg shadow-lg z-50 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}><Icon path={ICONS.check} className="w-5 h-5" /><p>{message.text}</p></div>);
};
