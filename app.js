function App() {
    try {
        const [cartItems, setCartItems] = React.useState([]);
        const [isCartOpen, setIsCartOpen] = React.useState(false);
        const [isAuthOpen, setIsAuthOpen] = React.useState(false);
        const [selectedProduct, setSelectedProduct] = React.useState(null);
        const [user, setUser] = React.useState(null);
        const [initialized, setInitialized] = React.useState(false);
        const [editingProduct, setEditingProduct] = React.useState(null);
        const [productData, setProductData] = React.useState([]); // Inicialmente vacío
        const [products2, setProducts2] = React.useState([]);
        const [products3, setProducts3] = React.useState([]); // <-- NUEVO para concentré
        const [currentView, setCurrentView] = React.useState('home'); // 'home', 'profile', 'about', 'concentre'
        const [loadingProducts, setLoadingProducts] = React.useState(true);
        const [loadingProducts2, setLoadingProducts2] = React.useState(false);
        const [adminOrders, setAdminOrders] = React.useState([]);
        const [showUserOrderProfile, setShowUserOrderProfile] = React.useState(null); // {user, order}
        const [profileTab, setProfileTab] = React.useState('profile'); // Nuevo estado para la pestaña activa del perfil

        // Notification state for chat messages
        const [chatNotifications, setChatNotifications] = React.useState([]);
        const [showNotifPopup, setShowNotifPopup] = React.useState(false);

        // Mueve isAdmin aquí para que esté disponible antes de los useEffect
        const isAdmin = user?.email === 'admin1@gmail.com';

        React.useEffect(() => {
            let mounted = true;

            const initializeApp = async () => {
                try {
                    const { user } = await getCurrentUser();
                    if (mounted) {
                        setUser(user);
                        setInitialized(true);
                    }
                } catch (error) {
                    console.error('Failed to initialize app:', error);
                    if (mounted) {
                        setInitialized(true);
                    }
                }
            };

            initializeApp();

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (mounted) {
                    setUser(session?.user ?? null);
                }
            });

            return () => {
                mounted = false;
                subscription?.unsubscribe();
            };
        }, []);

        // Nuevo useEffect para cargar productos desde Supabase
        React.useEffect(() => {
            let mounted = true;
            const fetchProducts = async () => {
                setLoadingProducts(true);
                try {
                    const { data, error } = await supabase.from('products').select('*');
                    if (error) throw error;
                    if (mounted) setProductData(data || []);
                } catch (error) {
                    console.error('Error fetching products:', error);
                    if (mounted) setProductData([]);
                } finally {
                    if (mounted) setLoadingProducts(false);
                }
            };
            fetchProducts();
            return () => { mounted = false; };
        }, []);

        // Cargar productos de products2 para la sección À propos
        React.useEffect(() => {
            let mounted = true;
            async function fetchProducts2() {
                setLoadingProducts2(true);
                try {
                    const { data, error } = await supabase.from('products2').select('*');
                    if (error) throw error;
                    if (mounted) setProducts2(data || []);
                } catch (error) {
                    if (mounted) setProducts2([]);
                } finally {
                    if (mounted) setLoadingProducts2(false);
                }
            }
            // Cargar siempre los productos2, no solo cuando currentView === 'about'
            fetchProducts2();
            return () => { mounted = false; };
        }, []);

        // Cargar productos de products3 para la sección Concentré
        React.useEffect(() => {
            let mounted = true;
            async function fetchProducts3() {
                try {
                    const { data, error } = await supabase.from('products3').select('*');
                    if (error) throw error;
                    if (mounted) setProducts3(data || []);
                } catch (error) {
                    if (mounted) setProducts3([]);
                }
            }
            fetchProducts3();
            return () => { mounted = false; };
        }, []);

        // Fetch orders for admin
        React.useEffect(() => {
            if (!isAdmin) return;
            let mounted = true;
            const fetchOrders = async () => {
                // Solo trae los pedidos, no intentes join con profiles
                const { data: orders, error } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (mounted) setAdminOrders(!error && orders ? orders : []);
            };
            fetchOrders();
            return () => { mounted = false; };
        }, [isAdmin]);

        // Notification polling for unread chat messages (show only if unread, never show if read)
        React.useEffect(() => {
            let interval = null;
            async function pollChatNotifications() {
                if (!user) {
                    setChatNotifications([]);
                    return;
                }
                let notif = null;
                if (isAdmin) {
                    // Admin: get latest unread message from any user
                    const { data, error } = await supabase
                        .from('messages')
                        .select('id, sender_id, message, created_at, read')
                        .eq('receiver_id', user.id)
                        .eq('read', false)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (!error && Array.isArray(data) && data.length > 0) {
                        const msg = data[0];
                        notif = { ...msg };
                    }
                } else {
                    // User: get latest unread message from admin (solo si unread)
                    let adminId = null;
                    // Busca el admin por email usando get_all_users
                    const { data: usersData } = await supabase.rpc('get_all_users');
                    if (Array.isArray(usersData)) {
                        const adminUser = usersData.find(u => u.email === 'admin1@gmail.com');
                        if (adminUser) adminId = adminUser.id;
                    }
                    if (adminId) {
                        const { data, error } = await supabase
                            .from('messages')
                            .select('id, sender_id, message, created_at, read')
                            .eq('receiver_id', user.id)
                            .eq('sender_id', adminId)
                            .eq('read', false)
                            .order('created_at', { ascending: false })
                            .limit(1);
                        if (!error && Array.isArray(data) && data.length > 0) {
                            const msg = data[0];
                            notif = { ...msg };
                        }
                    }
                }
                setChatNotifications(notif ? [notif] : []);
            }
            pollChatNotifications();
            interval = setInterval(pollChatNotifications, 3000);
            return () => {
                if (interval) clearInterval(interval);
            };
        }, [user, isAdmin]);

        // Handler for notification icon click
        const handleNotifClick = async (notif) => {
            if (!user) {
                setIsAuthOpen(true);
                return;
            }
            // Si hay mensaje, márcalo como leído y navega
            if (notif) {
                await supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('id', notif.id);
                if (isAdmin) {
                    setCurrentView('profile');
                    setProfileTab('users');
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openChatWithUser', { detail: { userId: notif.sender_id, highlight: true } }));
                    }, 100);
                } else {
                    setCurrentView('profile');
                    setProfileTab('chat');
                }
            } else {
                // Si no hay mensaje, solo navega
                if (isAdmin) {
                    setCurrentView('profile');
                    setProfileTab('users');
                } else {
                    setCurrentView('profile');
                    setProfileTab('chat');
                }
            }
        };

        // State for popup data
        const [notifPopupData, setNotifPopupData] = React.useState(null);

        // Handler for popup click (navigate)
        const handleNotifPopupNavigate = () => {
            setShowNotifPopup(false);
            if (isAdmin) {
                setCurrentView('profile');
                setProfileTab('users');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('openChatWithUser', { detail: { userId: notifPopupData.sender_id } }));
                }, 100);
            } else {
                setCurrentView('profile');
                setProfileTab('chat');
            }
        };

        const handleAddToCart = (product) => {
            if (!user) {
                setIsAuthOpen(true);
                return;
            }
            setCartItems(prevItems => addToCart(prevItems, product));
        };

        const handleUpdateQuantity = (productId, quantity) => {
            setCartItems(prevItems => updateQuantity(prevItems, productId, quantity));
        };

        const handleRemoveItem = (productId) => {
            setCartItems(prevItems => removeFromCart(prevItems, productId));
        };

        const handleSignOut = async () => {
            const { error } = await signOut();
            if (!error) {
                setCartItems([]);
                setCurrentView('home');
                window.location.reload(); // <-- recarga después de sign out
            }
        };

        const handleProductPreview = (product) => {
            setSelectedProduct(product);
        };

        const handleEditProduct = (product) => {
            setEditingProduct(product);
        };

        const handleUpdateProduct = (updatedProduct) => {
            setProductData(prevProducts => 
                prevProducts.map(product => 
                    product.id === updatedProduct.id ? updatedProduct : product
                )
            );
            setEditingProduct(null);
        };

        const handleProfileClick = () => {
            setCurrentView('profile');
            setProfileTab('profile');
        };

        // Nuevo: manejar click en Contact
        const handleContactClick = () => {
            if (user && !isAdmin) {
                setCurrentView('profile');
                setProfileTab('chat');
            } else {
                // Si es admin o no hay usuario, scroll normal
                const element = document.getElementById('contact');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        // Handler para mostrar productos principales
        const handleHomeClick = () => {
            setCurrentView('home');
        };

        // Handler para mostrar la sección de productos2 (À propos)
        const handleAboutClick = () => {
            setCurrentView('about');
        };

        // Handler para mostrar la sección de products3 (Concentré)
        const handleConcentreClick = () => {
            setCurrentView('concentre');
        };

        // Handler to clear notifications
        const handleClearNotifs = () => {
            setChatNotifications([]);
            setShowNotifPopup(false);
        };

        const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        

        if (!initialized) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-gray-600"></i>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            );
        }

        return (
            <div data-name="app">
                {/* Floating Chat Notification Icon - always visible except in profile */}
                {currentView !== 'profile' && (
                <div
                    style={{
                        position: 'fixed',
                        right: '24px',
                        bottom: '120px',
                        zIndex: 9999,
                        display: 'block'
                    }}
                >
                    <button
                        className={`rounded-full shadow-lg flex items-center justify-center p-3 transition relative
                            ${chatNotifications.length > 0 ? 'bg-black text-yellow-400 hover:bg-gray-800' : 'bg-white text-gray-400 border border-gray-300 hover:bg-gray-100'}`}
                        style={{ minWidth: 36, minHeight: 36, fontSize: 16 }}
                        onClick={() => handleNotifClick(chatNotifications[0])}
                        aria-label="Chat Notification"
                    >
                        <i className="fas fa-comments"></i>
                        {chatNotifications.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-xs text-white rounded-full px-1.5 py-0.5">
                                1
                            </span>
                        )}
                    </button>
                </div>
                )}
                <Navbar 
                    cartCount={cartItemCount}
                    onCartClick={() => setIsCartOpen(true)}
                    user={user}
                    onAuthClick={() => setIsAuthOpen(true)}
                    onSignOut={handleSignOut}
                    onProfileClick={handleProfileClick}
                    onHomeClick={handleHomeClick}
                    onAboutClick={handleAboutClick}
                    onConcentreClick={handleConcentreClick} // <-- NUEVO
                    currentView={currentView}
                    onContactClick={handleContactClick}
                />
                {currentView !== 'profile' && <Hero isAdmin={isAdmin} />}
                {currentView === 'home' ? (
                    <React.Fragment>
                        <div id="products">
                            {loadingProducts ? (
                                <div className="flex justify-center items-center py-10">
                                    <i className="fas fa-spinner fa-spin text-2xl text-gray-600"></i>
                                    <span className="ml-2 text-gray-600">Cargando productos...</span>
                                </div>
                            ) : (
                                <ProductGrid 
                                    products={productData}
                                    onAddToCart={handleAddToCart}
                                    onPreview={handleProductPreview}
                                    isAdmin={isAdmin}
                                    onEdit={handleEditProduct}
                                    onProductAdded={async () => {
                                        setLoadingProducts(true);
                                        const { data, error } = await supabase.from('products').select('*');
                                        setProductData(data || []);
                                        setLoadingProducts(false);
                                    }}
                                    tableName="products"
                                />
                            )}
                        </div>
                    </React.Fragment>
                ) : currentView === 'about' ? (
                    <React.Fragment>
                        <div id="about">
                            {/* MISMA ESTRUCTURA Y VISUALIDAD QUE EN Produits */}
                            <ProductGrid
                                products={products2}
                                onAddToCart={handleAddToCart}
                                onPreview={handleProductPreview}
                                isAdmin={isAdmin}
                                onEdit={handleEditProduct}
                                onProductAdded={async () => {
                                    setLoadingProducts2(true);
                                    const { data, error } = await supabase.from('products2').select('*');
                                    setProducts2(data || []);
                                    setLoadingProducts2(false);
                                }}
                                tableName="products2"
                            />
                            {products2.length === 0 && !loadingProducts2 && (
                                <div className="text-center text-gray-500 py-12">
                                    Il n'y a pas encore de produits. Utilisez le bouton pour en ajouter de nouveaux.
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                ) : currentView === 'concentre' ? (
                    <React.Fragment>
                        <div id="concentre">
                            <ProductGrid
                                products={products3}
                                onAddToCart={handleAddToCart}
                                onPreview={handleProductPreview}
                                isAdmin={isAdmin}
                                onEdit={handleEditProduct}
                                onProductAdded={async () => {
                                    const { data, error } = await supabase.from('products3').select('*');
                                    setProducts3(data || []);
                                }}
                                tableName="products3"
                            />
                            {products3.length === 0 && (
                                <div className="text-center text-gray-500 py-12">
                                    Il n'y a pas encore de produits. Utilisez le bouton pour en ajouter de nouveaux.
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                ) : currentView === 'profile' && user ? (
                    <Profile
                        user={user}
                        onBack={handleHomeClick}
                        onUpdate={() => window.location.reload()}
                        adminOrders={isAdmin ? adminOrders : undefined}
                        onUserOrderClick={(order) => setShowUserOrderProfile(order)}
                        initialTab={profileTab}
                    />
                ) : null}
                
                <Cart 
                    isOpen={isCartOpen}
                    onClose={() => setIsCartOpen(false)}
                    items={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    user={user}
                    onOrderPlaced={() => setCartItems([])}
                />
                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                />
                {selectedProduct && (
    <ProductPreview
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isAdmin={isAdmin} // <-- agrega esta línea
    />
)}
                {editingProduct && (
                    <ProductEditModal
                        product={editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSave={handleUpdateProduct}
                    />
                )}
                {/* Admin user order profile modal */}
                {showUserOrderProfile && (
                    <UserOrderProfileModal
                        order={showUserOrderProfile}
                        onClose={() => setShowUserOrderProfile(null)}
                    />
                )}
                <Footer />
            </div>
        );
    } catch (error) {
        console.error('App component error:', error);
        reportError(error);
        return null;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
