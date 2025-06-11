import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';

// --- Iconos (Lucide) ---
const Icon = ({ path, className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  store: "M18 6L18 4H6L6 6M6 6L6 20H18V6M6 6H2M18 6H22",
  key: "M14 21v-4.99L21 7h-4V3H7v4H3l7 9.01V21h4z",
  book: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  check: "M20 6 9 17l-5-5",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-6a1 1 0 0 1 0-2 1 1 0 0 1 0 2v3a1 1 0 0 1 0 2h-1a1 1 0 0 1 0-2h1V11z",
  layout: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  settings: "M12.22 2h-4.44a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2H2.78a2 2 0 0 0-1.73 1l-.25.44a2 2 0 0 1 0 2l.25.44a2 2 0 0 1 1.73 1v4.44a2 2 0 0 0 2 2h.78a2 2 0 0 1 1.73 1l.25.44a2 2 0 0 1 0 2l-.25.44a2 2 0 0 1-1.73 1h-.78a2 2 0 0 0-2 2v.78a2 2 0 0 1-1 1.73l-.44.25a2 2 0 0 1-2 0l-.44-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0-2-2h-4.44a2 2 0 0 0-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1h.78a2 2 0 0 0 2-2v-4.44a2 2 0 0 0-2-2h-.78a2 2 0 0 1-1.73-1l-.25-.44a2 2 0 0 1 0-2l.25-.44a2 2 0 0 1 1.73-1H12.22z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  cart: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18",
  clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
};

// --- Componente Principal ---
export default function App() {
  const [view, setView] = useState('dashboard');
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [config, setConfig] = useState({});
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [stats, setStats] = useState({ recoveredValue: 0, recoveredCarts: 0 });
  const [status, setStatus] = useState('inactive');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    try {
      // MUY IMPORTANTE: Rellena estos datos con los de tu proyecto de Firebase
      const localFirebaseConfig = { 
        apiKey: "AIzaSyBCAir0LMGqsUYRK933P-CqWa2zGbki3yQ", // <-- Pega tu API Key de Firebase
        authDomain: "soporteecommerceai.firebaseapp.com",
        projectId: "soporteecommerceai",
        storageBucket: "soporteecommerceai.appspot.com",
        messagingSenderId: "16186429362", // <-- Pega tu Messaging Sender ID
        appId: "1:16186429362:web:91a216598899088753deab" // <-- Pega tu App ID
      };
      const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : localFirebaseConfig;
      const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
      
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestoreDb);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (authError) {
            console.error("Error en el intento de inicio de sesión:", authError);
            setMessage({ type: 'error', text: `Error de autenticación: ${authError.message}` });
            setIsAuthReady(true);
          }
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setMessage({ type: 'error', text: `Error al inicializar Firebase. Revisa que has pegado bien los datos en localFirebaseConfig. Error: ${error.message}` });
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (db && userId && isAuthReady) {
      const configRef = doc(db, "clientes", userId);
      const unsubscribe = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
          setConfig(docSnap.data());
          setStatus(docSnap.data().status || 'inactive');
        }
      }, (error) => console.error("Error fetching config:", error));
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady]);

  useEffect(() => {
    if (db && userId && isAuthReady) {
      const cartsRef = collection(db, "carritosAbandonados");
      const q = query(cartsRef, where("tiendaId", "==", userId));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let totalValue = 0;
        let recoveredCount = 0;
        const cartsData = [];
        querySnapshot.forEach((doc) => {
          const cart = { id: doc.id, ...doc.data() };
          cartsData.push(cart);
          if (cart.recuperado === true) {
            recoveredCount++;
            const cartValue = cart.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            totalValue += cartValue;
          }
        });
        cartsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setAbandonedCarts(cartsData);
        setStats({ recoveredValue: totalValue, recoveredCarts: recoveredCount });
      }, (error) => console.error("Error fetching abandoned carts:", error));
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady]);

  if (!isAuthReady) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      {message && message.type === 'error' && (
         <div className="absolute top-0 left-0 w-full h-full bg-gray-900/90 flex items-center justify-center z-50 p-4">
            <div className="bg-red-900/50 border border-red-700 p-8 rounded-lg text-center max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Error de Conexión</h2>
                <p className="break-words">{message.text}</p>
                <button onClick={() => setMessage(null)} className="mt-6 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded">
                  Entendido
                </button>
            </div>
        </div>
      )}
      <div className="flex">
        <nav className="w-64 bg-gray-950/50 p-4 border-r border-gray-800 h-screen sticky top-0 flex flex-col">
          <h1 className="text-2xl font-bold text-white mb-10">Asistente AI</h1>
          <ul>
            <NavItem icon={<Icon path={ICONS.layout} />} label="Dashboard" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={<Icon path={ICONS.settings} />} label="Configuración" isActive={view === 'configuracion'} onClick={() => setView('configuracion')} />
          </ul>
           <div className="mt-auto text-xs text-gray-600">
             <p className="font-semibold text-gray-500">USER ID</p>
             <p className="break-words">{userId}</p>
           </div>
        </nav>
        <main className="flex-1 p-8 overflow-y-auto h-screen">
          {view === 'dashboard' && <DashboardView stats={stats} carts={abandonedCarts} />}
          {view === 'configuracion' && <ConfigView config={config} db={db} userId={userId} setMessage={setMessage} />}
        </main>
      </div>
       {message && message.type === 'success' && <Notification message={message} onDismiss={() => setMessage(null)} />}
    </div>
  );
}

// --- Vistas y Componentes ---
const DashboardView = ({ stats, carts }) => (
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
      <tbody>
        {carts.slice(0, 10).map(cart => (
          <tr key={cart.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
            <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${cart.recuperado ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{cart.recuperado ? 'Recuperado' : 'Pendiente'}</span></td>
            <td className="p-4 font-mono text-sm">{cart.cliente ? cart.cliente.replace('whatsapp:', '') : 'N/A'}</td>
            <td className="p-4">€{cart.productos ? cart.productos.reduce((s, i) => s + (i.precio * i.cantidad), 0).toFixed(2) : '0.00'}</td>
            <td className="p-4 text-sm text-gray-400">{cart.timestamp ? new Date(cart.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
            <td className="p-4 text-sm text-gray-300">{cart.productos ? cart.productos.map(p => p.nombre).join(', ') : 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </table>{carts.length === 0 && <p className="p-4 text-center text-gray-500">Aún no hay actividad de carritos para mostrar.</p>}</div></div>
  </div>
);

const ConfigView = ({ config, db, userId, setMessage }) => {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { setFormData(config); }, [config]);
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  const handleCopyToClipboard = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setMessage({ type: 'success', text: '¡API Key copiada!' });
      } catch (err) {
        setMessage({ type: 'error', text: 'No se pudo copiar la clave.' });
      }
      document.body.removeChild(textArea);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    let finalApiKey = formData.apiKey;
    if (!finalApiKey) {
      if (window.crypto && window.crypto.randomUUID) {
        finalApiKey = window.crypto.randomUUID();
      } else {
        finalApiKey = 'fallback-' + Date.now() + Math.random().toString(36).substring(2, 15);
      }
    }
    const configData = { ...formData, apiKey: finalApiKey, status: 'active', lastUpdated: new Date().toISOString() };
    try {
        const configRef = doc(db, "clientes", userId);
        await setDoc(configRef, configData, { merge: true });
        setMessage({ type: 'success', text: '¡Configuración guardada!' });
        setFormData(configData);
    } catch(error) {
        console.error("Error saving config:", error);
        setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
        setIsSaving(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Configuración del Asistente</h2>
      <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Input id="nombre" label="Nombre de tu e-commerce" value={formData.nombre || ''} onChange={handleChange} placeholder="Ej: Tienda de Moda" icon={<Icon path={ICONS.store} />} />
            <Input id="whatsapp" label="Nº de WhatsApp de Twilio" value={formData.whatsapp || ''} onChange={handleChange} placeholder="whatsapp:+14155238886" icon={<Icon path={ICONS.key} />} />
            {formData.apiKey && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2">
                        <span className="text-indigo-400"><Icon path={ICONS.key}/></span>Tu API Key Universal
                    </h3>
                    <div className="flex items-center gap-2">
                        <input type="text" value={formData.apiKey} readOnly className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 font-mono"/>
                        <button type="button" onClick={() => handleCopyToClipboard(formData.apiKey)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors" title="Copiar al portapapeles"><Icon path={ICONS.clipboard} className="w-5 h-5"/></button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Usa esta clave en la cabecera 'X-API-Key' de tus webhooks.</p>
                </div>
            )}
          </div>
          <div className="flex flex-col">
             <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3 mb-2"><span className="text-indigo-400"><Icon path={ICONS.book}/></span>Base de Conocimiento (FAQs)</h3>
            <Textarea id="faqs" label="Pega aquí tus preguntas y respuestas." value={formData.faqs || ''} onChange={handleChange} rows={10} />
          </div>
        </div>
        <footer className="p-6 bg-gray-900/50 border-t border-gray-700 flex items-center justify-end">
          <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2">
            {isSaving ? <Spinner /> : <Icon path={ICONS.check} className="w-5 h-5"/>}
            {isSaving ? 'Guardando...' : 'Guardar y Generar Clave'}
          </button>
        </footer>
      </form>
    </div>
  );
};
const NavItem = ({ icon, label, isActive, onClick }) => (
  <li className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center gap-4 transition-colors ${isActive ? 'bg-indigo-600/30 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`} onClick={onClick}>
    {icon}
    <span className="font-semibold">{label}</span>
  </li>
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
const Spinner = () => (
  <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);
const Notification = ({ message, onDismiss }) => {
  useEffect(() => { const timer = setTimeout(() => onDismiss(), 4000); return () => clearTimeout(timer); }, [onDismiss]);
  return (<div className={`fixed bottom-5 right-5 flex items-center gap-4 p-4 rounded-lg shadow-lg z-50 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}><Icon path={message.type === 'success' ? ICONS.check : ICONS.info} className="w-6 h-6" /><p>{message.text}</p></div>);
};
