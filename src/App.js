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

// --- Iconos (Lucide) ---
const Icon = ({ path, className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  // ... (iconos omitidos por brevedad)
  layout: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  settings: "M12.22 2h-4.44a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2H2.78a2 2 0 0 0-1.73 1l-.25.44a2 2 0 0 1 0 2l.25.44a2 2 0 0 1 1.73 1v4.44a2 2 0 0 0 2 2h.78a2 2 0 0 1 1.73 1l.25.44a2 2 0 0 1 0 2l-.25.44a2 2 0 0 1-1.73 1h-.78a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0-2-2h-4.44a2 2 0 0 0-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1h.78a2 2 0 0 0 2-2v-4.44a2 2 0 0 0-2-2h-.78a2 2 0 0 1-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1H12.22z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  store: "M18 6L18 4H6L6 6M6 6L6 20H18V6M6 6H2M18 6H22",
  key: "M14 21v-4.99L21 7h-4V3H7v4H3l7 9.01V21h4z",
  book: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  check: "M20 6 9 17l-5-5",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
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
    if (!firebaseConfig.apiKey) return;
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) { console.error("Error initializing Firebase:", error); }
};

initializeFirebase();

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

  if (loading) return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center"><Spinner /></div>;
  
  return user ? <MainApp user={user} /> : <AuthFlow />;
}

const MainApp = ({ user }) => {
  const [view, setView] = useState('dashboard');
  const [activeConversationId, setActiveConversationId] = useState(null);

  const handleViewConversation = (convoId) => {
    setActiveConversationId(convoId);
    setView('conversationDetail');
  };

  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <DashboardView userId={user.uid} />;
      case 'conversations':
        return <ConversationsView userId={user.uid} onViewConversation={handleViewConversation} />;
      case 'conversationDetail':
        return <ConversationDetailView conversationId={activeConversationId} onBack={() => setView('conversations')} />;
      case 'configuracion':
        return <ConfigView userId={user.uid} />;
      default:
        return <DashboardView userId={user.uid} />;
    }
  }

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
             <NavItem icon={<Icon path={ICONS.logout} />} label="Cerrar Sesión" isActive={false} onClick={() => signOut(auth)} />
           </div>
        </nav>
        <main className="flex-1 p-8 overflow-y-auto h-screen">{renderView()}</main>
      </div>
    </div>
  );
};

const ConversationsView = ({ userId, onViewConversation }) => {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'conversaciones'), 
      where('tiendaId', '==', userId),
      orderBy('lastUpdate', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(convos);
    });
    return () => unsubscribe();
  }, [userId]);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Últimas Conversaciones</h2>
      <div className="space-y-4">
        {conversations.map(convo => (
          <div key={convo.id} onClick={() => onViewConversation(convo.id)} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors">
            <p className="font-bold text-lg flex items-center gap-2"><Icon path={ICONS.user} className="w-5 h-5"/> Cliente: {convo.customerPhone.replace('whatsapp:', '')}</p>
            <p className="text-sm text-gray-400">Última actualización: {convo.lastUpdate ? new Date(convo.lastUpdate.seconds * 1000).toLocaleString() : 'N/A'}</p>
          </div>
        ))}
        {conversations.length === 0 && <p className="text-center text-gray-500 py-8">No hay conversaciones para mostrar.</p>}
      </div>
    </div>
  );
};

const ConversationDetailView = ({ conversationId, onBack }) => {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const messagesRef = collection(db, 'conversaciones', conversationId, 'mensajes');
        const q = query(messagesRef, orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [conversationId]);
    
    return (
        <div>
            <button onClick={onBack} className="mb-6 text-indigo-400 hover:text-indigo-300">&larr; Volver a todas las conversaciones</button>
            <h2 className="text-3xl font-bold mb-6">Detalle de la Conversación</h2>
            <div className="space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.author === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xl p-4 rounded-lg ${msg.author === 'user' ? 'bg-gray-700' : 'bg-indigo-600'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConfigView = ({ userId }) => {
  const [config, setConfig] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
      const unsub = onSnapshot(doc(db, "clientes", userId), (doc) => {
          if (doc.exists()) setConfig(doc.data());
      });
      return () => unsub();
  }, [userId]);

  const handleChange = (e) => setConfig(prev => ({ ...prev, [e.target.id]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    let finalConfig = {...config};
    if (!finalConfig.apiKey) finalConfig.apiKey = crypto.randomUUID();
    try {
        await setDoc(doc(db, "clientes", userId), finalConfig, { merge: true });
        setMessage({ type: 'success', text: '¡Configuración guardada!' });
    } catch(error) {
        setMessage({ type: 'error', text: 'Error al guardar.' });
    } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Configuración</h2>
      <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Input id="nombre" label="Nombre de tu e-commerce" value={config.nombre || ''} onChange={handleChange} placeholder="Ej: Tienda de Moda" icon={<Icon path={ICONS.store} />} />
            <Input id="whatsapp" label="Nº de WhatsApp de Twilio" value={config.whatsapp || ''} onChange={handleChange} placeholder="whatsapp:+14155238886" icon={<Icon path={ICONS.key} />} />
            <Input id="telefonoAlertas" label="Teléfono para Alertas (dueño)" value={config.telefonoAlertas || ''} onChange={handleChange} placeholder="34666111222" icon={<Icon path={ICONS.phone} />} />
            {config.apiKey && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400"><Icon path={ICONS.key}/></span>Tu API Key Universal</h3>
                <div className="flex items-center gap-2"><input type="text" value={config.apiKey} readOnly className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 font-mono"/><button type="button" onClick={() => navigator.clipboard.writeText(config.apiKey)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md"><Icon path={ICONS.clipboard} className="w-5 h-5"/></button></div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
             <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400"><Icon path={ICONS.book}/></span>Base de Conocimiento (FAQs)</h3>
            <Textarea id="faqs" label="Pega aquí tus preguntas y respuestas." value={config.faqs || ''} onChange={handleChange} rows={10} />
          </div>
        </div>
        <footer className="p-6 bg-gray-900/50 border-t border-gray-700 flex items-center justify-end">
          <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-600 flex items-center gap-2">
            {isSaving ? <Spinner /> : <Icon path={ICONS.check} className="w-5 h-5"/>}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </footer>
      </form>
      {message && <Notification message={message} onDismiss={() => setMessage(null)}/>}
    </div>
  );
};


// El resto de componentes (DashboardView, AuthFlow, etc.) se mantienen igual, pero se omiten aquí por brevedad.
// Solo se incluye lo modificado o lo necesario para el contexto completo de MainApp y la nueva funcionalidad.
// Los componentes de UI (Input, NavItem, etc.) no cambian.

const DashboardView = ({ userId }) => {
    const [stats, setStats] = useState({ recoveredValue: 0, recoveredCarts: 0 });
    const [carts, setCarts] = useState([]);
    useEffect(() => {
        const q = query(collection(db, "carritosAbandonados"), where("tiendaId", "==", userId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            let totalValue = 0, recoveredCount = 0;
            const cartsData = [];
            querySnapshot.forEach((doc) => {
                const cart = { id: doc.id, ...doc.data() };
                cartsData.push(cart);
                if (cart.recuperado) {
                    recoveredCount++;
                    totalValue += cart.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                }
            });
            cartsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setCarts(cartsData);
            setStats({ recoveredValue: totalValue, recoveredCarts: recoveredCount });
        });
        return () => unsubscribe();
    }, [userId]);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Dashboard de Rendimiento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* StatCards */}
            </div>
            <h3 className="text-2xl font-bold mb-4">Actividad Reciente de Carritos</h3>
            {/* Tabla de Carritos */}
        </div>
    );
};

const AuthFlow = () => { /* ... */ return <div>Auth Flow</div> };
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);
const NavItem = ({ icon, label, isActive, onClick }) => (
  <li className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center gap-4 transition-colors ${isActive ? 'bg-indigo-600/30 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`} onClick={onClick}>
    {icon}
    <span className="font-semibold">{label}</span>
  </li>
);
const Notification = ({ message, onDismiss }) => {
  useEffect(() => { const timer = setTimeout(() => onDismiss(), 4000); return () => clearTimeout(timer); }, [onDismiss]);
  return (<div className={`fixed bottom-5 right-5 flex items-center gap-4 p-4 rounded-lg shadow-lg z-50 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}><Icon path={ICONS.check} className="w-5 h-5" /><p>{message.text}</p></div>);
};
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
