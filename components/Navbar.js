function Navbar({ cartCount, onCartClick, user, onAuthClick, onSignOut, onProfileClick, onContactClick, onHomeClick, onAboutClick, onConcentreClick }) {
    try {
        const scrollToSection = (id) => {
            if (id === 'top') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const element = document.getElementById(id);
                if (element) {
                    const navbarHeight = 64;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        };

        // State for notification dropdown
        const [showNotifications, setShowNotifications] = React.useState(false);
        const notificationRef = React.useRef(null);

        // Close notifications when clicking outside
        React.useEffect(() => {
            function handleClickOutside(event) {
                if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                    setShowNotifications(false);
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, []);

        const toggleNotifications = () => {
            setShowNotifications(!showNotifications);
        };

        // Asegura que onContactClick siempre sea una función
        const handleContact = onContactClick || (() => {});

        // Nuevo: scroll a secciones específicas
        const handleMaison = () => {
            // Scroll al hero (arriba)
            const hero = document.querySelector('[data-name="hero"]');
            if (hero) {
                hero.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (typeof onHomeClick === 'function') onHomeClick();
        };
        const handleProduits = () => {
            // Scroll a la sección de productos
            const products = document.getElementById('products');
            if (products) {
                products.scrollIntoView({ behavior: 'smooth' });
            }
            if (typeof onHomeClick === 'function') onHomeClick();
        };
        // Nuevo handler para À propos: cambia vista y hace scroll en un solo click
        const handleAPropos = () => {
            if (typeof onAboutClick === 'function') onAboutClick();
            setTimeout(() => {
                const about = document.getElementById('about');
                if (about) {
                    about.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100); // Espera a que la vista cambie/renderice
        };

        // Nuevo handler para Concentré: cambia vista y hace scroll en un solo click
        const handleConcentre = () => {
            if (typeof onConcentreClick === 'function') onConcentreClick();
            setTimeout(() => {
                const concentre = document.getElementById('concentre');
                if (concentre) {
                    concentre.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100); // Espera a que la vista cambie/renderice
        };

        // Estado para el nombre de la marca y edición
        const [brandName, setBrandName] = React.useState('OrioVape'); // Valor inicial rápido
        const [editingBrand, setEditingBrand] = React.useState(false);
        const [brandInput, setBrandInput] = React.useState('');
        const [brandLoading, setBrandLoading] = React.useState(false);

        // Determina si es admin
        const isAdmin = user?.email === 'admin1@gmail.com';

        // Cargar nombre de marca desde Supabase
        React.useEffect(() => {
            let mounted = true;
            async function fetchBrandName() {
                try {
                    const { data, error } = await supabase
                        .from('settings')
                        .select('brand_name')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    if (!error && data && data.brand_name && mounted) {
                        setBrandName(data.brand_name);
                    }
                } catch (e) {
                    // No cambiar el valor inicial si falla
                }
            }
            fetchBrandName();
            return () => { mounted = false; };
        }, []);

        // Guardar nuevo nombre en Supabase (solo update, no insert)
        const handleSaveBrand = async () => {
            setBrandLoading(true);
            try {
                // Busca el registro más reciente
                const { data, error } = await supabase
                    .from('settings')
                    .select('id')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (!error && data && data.id) {
                    // Actualiza el nombre de la marca
                    await supabase
                        .from('settings')
                        .update({ brand_name: brandInput })
                        .eq('id', data.id);
                    setBrandName(brandInput);
                } else {
                    alert('No existe un registro de configuración para actualizar.');
                }
                setEditingBrand(false);
            } catch (e) {
                alert('Erreur lors de lenregistrement du nom de la marque');
            }
            setBrandLoading(false);
        };

        return (
            <nav data-name="navbar" className="navbar-fixed bg-white/80 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div data-name="logo" className="flex items-center">
                            <button
                                onClick={() => scrollToSection('top')}
                                className="flex items-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0f0f0f] to-[#010101] hover:text-blue-600 transition-all duration-300"
                                data-name="logo"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-leaf brand-icon mr-2 text-[#0f0f0f]">
                                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                                </svg>
                                <span className="ml-2 flex items-center">
                                    {brandName}
                                    {isAdmin && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setBrandInput(brandName);
                                                setEditingBrand(true);
                                            }}
                                            className="ml-2 px-2 py-1 border rounded text-xs hover:bg-gray-100"
                                            title="Edit brand name"
                                        >
                                            Modifier
                                        </button>
                                    )}
                                </span>
                            </button>
                        </div>

                        <div data-name="nav-links" className="hidden md:flex items-center space-x-8">
                            <button onClick={handleMaison} className="text-gray-600 hover:text-blue-600 transition-colors" style={{ fontWeight: 600 }}>Maison</button>
                            <button onClick={handleProduits} className="text-gray-600 hover:text-blue-600 transition-colors" style={{ fontWeight: 600 }}>Liquide</button>
                            <button onClick={handleAPropos} className="text-gray-600 hover:text-blue-600 transition-colors" style={{ fontWeight: 600 }}>Jetables</button>
                            <button 
                                onClick={handleConcentre}
                                className="text-gray-600 hover:text-blue-600 transition-colors"
                                style={{ fontWeight: 600 }}
                            >
                                Concentré
                            </button>
                            <button 
                                onClick={handleContact}
                                className="text-gray-600 hover:text-blue-600 transition-colors" 
                                style={{ fontWeight: 600 }}
                            >
                                Contact
                            </button>
                        </div>

                        <div data-name="nav-actions" className="flex items-center space-x-2">
                            {user ? (
                                <button
                                    onClick={onProfileClick}
                                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors md:hidden"
                                >
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt={user.user_metadata.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                </button>
                            ) : (
                                <button
                                    onClick={onAuthClick}
                                    className="text-gray-600 hover:text-blue-600 transition-colors md:hidden"
                                >
                                    <i className="fas fa-user"></i>
                                </button>
                            )}
                            
                            {/* Notification Bell - Only visible on desktop */}
                            <div className="relative hidden md:block" ref={notificationRef}>
                                <button
                                    onClick={toggleNotifications}
                                    className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                                    aria-label="Notifications"
                                >
                                    <i className="fas fa-bell text-xl"></i>
                                    
                                </button>
                                
                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200 max-h-96 overflow-y-auto">
                                        <div className="px-4 py-2 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-gray-800">Notifications</h3>
                                                
                                            </div>
                                        </div>
                                        <div className="p-4 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center py-5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                                <p className="text-sm">Aucune notification pour le moment</p>
                                                <p className="text-xs text-gray-400 mt-1">Nous vous avertirons lorsque quelque chose arrivera</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 border-t border-gray-200 text-center">
                                            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                Effacer toutes les notifications
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={onCartClick}
                                className="relative p-2 text-gray-600 hover:text-gray-900"
                            >
                                <i className="fas fa-shopping-cart text-xl"></i>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            {user ? (
                                <div className="hidden md:flex items-center space-x-2">
                                    <button
                                        onClick={onProfileClick}
                                        className="flex items-center space-x-2"
                                    >
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt={user.user_metadata.username}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <span className="text-sm text-gray-600">
                                            {user.user_metadata.username || user.email}
                                        </span>
                                    </button>
                                    <button
                                        onClick={onSignOut}
                                        className="text-xs bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors border border-gray-600" // Added border
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onAuthClick}
                                    className="hidden md:block text-xs bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 transition-colors border border-gray-600" // Added border
                                >
                                    Sign In
                                </button>
                            )}
                            {/* Replace hamburger with sign in/out button */}
                            {user ? (
                                <button
                                    onClick={onSignOut}
                                    className="md:hidden text-xs bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 transition-colors border border-gray-600" // Added border
                                >
                                    Sign Out
                                </button>
                            ) : (
                                <button
                                    onClick={onAuthClick}
                                    className="md:hidden text-xs bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 transition-colors border border-gray-600" // Added border
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Navigation from Header (with User info) */}
                    <div className="md:hidden flex justify-around pt-4 pb-2 items-center border-t border-gray-100 mt-2">
                        <button onClick={handleMaison} className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors">
                            {/* Imagen personalizada para Maison */}
                            <img
                                src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//home-button.png"
                                alt="Maison"
                                className="h-5 w-5 object-contain"
                                style={{ marginBottom: '0px' }}
                            />
                            <span className="text-xs mt-1">Maison</span>
                        </button>
                        <button onClick={handleProduits} className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors">
                            {/* Imagen personalizada para líquido, más grande y color normal */}
                            <img
                                src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//cherry-juice.png"
                                alt="Liquide"
                                className="h-5 w-5 object-contain"
                                style={{ marginBottom: '0px' }}
                            />
                            <span className="text-xs mt-1">Liquide</span>
                        </button>
                        <button onClick={handleAPropos} className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors">
                            {/* Imagen personalizada para jetables, más grande y color normal */}
                            <img
                                src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//vaping.png"
                                alt="Jetables"
                                className="h-5 w-5 object-contain rounded-full"
                                style={{ marginBottom: '0px' }}
                            />
                            <span className="text-xs mt-1">Jetables</span>
                        </button>
                        <button 
                            onClick={handleConcentre}
                            className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            {/* Puedes poner un icono personalizado aquí */}
                            <img
                                src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//vape-liquid.png"
                                alt="Concentré"
                                className="h-5 w-5 object-contain"
                                style={{ marginBottom: '0px' }}
                            />
                            <span className="text-xs mt-1">Concentré</span>
                        </button>
                        <button 
                            onClick={handleContact}
                            className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            {/* Imagen personalizada para Contact */}
                            <img
                                src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//chat.png"
                                alt="Contact"
                                className="h-5 w-5 object-contain"
                                style={{ marginBottom: '0px' }}
                            />
                            <span className="text-xs mt-1">Contact</span>
                        </button>
                        <div className="relative" ref={notificationRef}>
                            <button 
                                onClick={toggleNotifications} 
                                className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                {/* Imagen personalizada para Notifs */}
                                <img
                                    src="https://lsasgzpvzxpmdqbocfzw.supabase.co/storage/v1/object/public/products//notification%20(1).png"
                                    alt="Notifs"
                                    className="h-5 w-5 object-contain"
                                    style={{ marginBottom: '0px' }}
                                />
                                <span className="text-xs mt-1">Notifs</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Notification Panel - Separate from navigation to ensure proper positioning */}
                {showNotifications && (
                    <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex items-center justify-center">
                        <div
                            className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-slide-up flex flex-col"
                            style={{
                                minHeight: '340px',
                                maxWidth: '95vw',
                                position: 'relative',
                                margin: '0 auto',
                                top: '160px', // Más abajo aún
                            }}
                        >
                            {/* Barra superior tipo "handle" */}
                            <div className="flex flex-col items-center pt-6 pb-2 border-b border-gray-100 relative">
                                <div className="w-14 h-1.5 bg-gray-300 rounded-full mb-2"></div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1 tracking-wide">Notifications</h3>
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-700"
                                    aria-label="Cerrar"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            {/* Contenido de notificaciones */}
                            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center">
                                <div className="flex flex-col items-center justify-center w-full">
                                    <div className="bg-white rounded-full p-4 mb-4 shadow border border-gray-200 flex items-center justify-center">
                                        <i className="fas fa-bell text-blue-500 text-4xl"></i>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800 mb-2 text-center">Aucune notification pour le moment</p>
                                    <p className="text-base text-gray-500 text-center mb-4">Nous vous avertirons lorsque quelque chose arrivera.<br />Restez à l'écoute!</p>
                                    <button
                                        className="mt-2 px-6 py-2 bg-black text-white rounded-full font-medium shadow hover:bg-gray-800 transition"
                                        onClick={() => setShowNotifications(false)}
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                        <style>
                        {`
                        @keyframes slide-up {
                            from { transform: translateY(100%); }
                            to { transform: translateY(0); }
                        }
                        .animate-slide-up {
                            animation: slide-up 0.25s cubic-bezier(.4,1.4,.6,1) both;
                        }
                        `}
                        </style>
                    </div>
                )}

                {/* Modal flotante para editar el nombre de la marca */}
                {editingBrand && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30" style={{paddingTop: '8rem'}}>
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs relative mt-8">
                            <h3 className="text-lg font-bold mb-4 text-center">Modifier le nom de la marque</h3>
                            <input
                                type="text"
                                value={brandInput}
                                onChange={e => setBrandInput(e.target.value)}
                                className="border px-3 py-2 rounded w-full text-base font-bold mb-4"
                                disabled={brandLoading}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setEditingBrand(false)}
                                    className="px-4 py-2 border rounded text-sm"
                                    disabled={brandLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveBrand}
                                    className="px-4 py-2 bg-black text-white rounded text-sm"
                                    disabled={brandLoading || !brandInput.trim()}
                                >
                                    {brandLoading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                            <button
                                onClick={() => setEditingBrand(false)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                                aria-label="Cerrar"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )}
            </nav>
        );
    } catch (error) {
        console.error('Navbar component error:', error);
        reportError(error);
        return null;
    }
}