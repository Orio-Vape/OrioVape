function Profile({ user, onBack, onUpdate, adminOrders, onUserOrderClick, initialTab }) {
    try {
        const [activeTab, setActiveTab] = React.useState(initialTab || 'profile');
        const [isEditing, setIsEditing] = React.useState(false);
        const [formData, setFormData] = React.useState({
            username: user?.user_metadata?.username || '',
            address: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
            cardNumber: user?.user_metadata?.cardNumber || '',
            cardName: user?.user_metadata?.cardName || '',
            cardExpiry: user?.user_metadata?.cardExpiry || '',
            cardCVC: user?.user_metadata?.cardCVC || '',
            phone: ''
        });
        const [error, setError] = React.useState('');
        const [loading, setLoading] = React.useState(false);
        const [saveSuccess, setSaveSuccess] = React.useState(false);
        const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
        const [addressLocked, setAddressLocked] = React.useState(false);
        const [userOrders, setUserOrders] = React.useState([]);
        const [users, setUsers] = React.useState([]);
        const [selectedChatUser, setSelectedChatUser] = React.useState(null);
        const [chatMessages, setChatMessages] = React.useState([]);
        const [chatInput, setChatInput] = React.useState('');
        const [chatLoading, setChatLoading] = React.useState(false);
        const fileInputRef = React.useRef(null);
        const [previewImage, setPreviewImage] = React.useState(user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.username || 'User')}&background=random`);
        const [usersWithNewMessages, setUsersWithNewMessages] = React.useState([]); // <-- NUEVO
        const [highlightUserId, setHighlightUserId] = React.useState(null); // <-- NUEVO

        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handlePhotoClick = () => {
            fileInputRef.current.click();
        };

        const handlePhotoChange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("Image file is too large. Maximum size is 5MB.");
                return;
            }

            // Check file type
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                setError("Only JPEG, PNG, and GIF images are allowed.");
                return;
            }

            // Show preview immediately
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);

            setUploadingPhoto(true);
            setError('');

            try {
                // Create a unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                // Upload to Supabase Storage
                const { data, error: uploadError } = await supabase.storage
                    .from('profile')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('profile')
                    .getPublicUrl(filePath);

                // Update user metadata with new avatar URL
                const { error: updateError } = await updateProfile(user.id, {
                    ...user.user_metadata,
                    avatar_url: publicUrl
                });

                if (updateError) throw updateError;

                // Update local state
                setPreviewImage(publicUrl);
                if (onUpdate) onUpdate();
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } catch (err) {
                setError(`Failed to upload image: ${err.message}`);
                console.error('Photo upload error:', err);
                // Revert to previous image if upload failed
                setPreviewImage(user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.username || 'User')}&background=random`);
            } finally {
                setUploadingPhoto(false);
            }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            setSaveSuccess(false);

            try {
                validateUsername(formData.username);
                
                // Mask card number for storage
                let updatedData = { ...formData };
                if (updatedData.cardNumber) {
                    const last4 = updatedData.cardNumber.slice(-4);
                    updatedData.maskedCardNumber = `**** **** **** ${last4}`;
                }

                const { error } = await updateProfile(user.id, updatedData);
                if (error) throw error;
                
                setIsEditing(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                
                if (onUpdate) onUpdate();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Cargar dirección existente al montar
        React.useEffect(() => {
            async function fetchAddress() {
                // Cambia la consulta a user_id (uuid), no id (bigint)
                const { data, error } = await supabase
                    .from('Address')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.street_address || '',
                        city: data.city || '',
                        state: data.state_province || '',
                        postalCode: data.postal_code || '',
                        country: data.country || '',
                        phone: data.phone_number || ''
                    }));
                    setAddressLocked(true);
                }
            }
            if (user?.id) fetchAddress();
        }, [user?.id]);

        const handleAddressSubmit = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            setSaveSuccess(false);

            try {
                if (addressLocked) return;

                // Inserta sin el campo id, usa user_id (uuid)
                const { error } = await supabase
                    .from('Address')
                    .insert([{
                        user_id: user.id, // user_id debe ser uuid en la tabla
                        street_address: formData.address,
                        city: formData.city,
                        state_province: formData.state,
                        postal_code: formData.postalCode,
                        country: formData.country,
                        phone_number: formData.phone
                    }]);
                if (error) throw error;

                setAddressLocked(true);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                if (onUpdate) onUpdate();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Cargar órdenes del usuario al montar o cuando cambie el usuario
        React.useEffect(() => {
            async function fetchUserOrders() {
                if (!user?.id) return;
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (!error && data) setUserOrders(data);
            }
            fetchUserOrders();
        }, [user?.id]);

        const isAdmin = user?.email === 'admin1@gmail.com';

        // Para admin: obtener usuarios únicos de los pedidos (usando user_info, user_metadata o email del pedido)
// y además, mostrar todos los usuarios registrados aunque no hayan hecho pedidos
React.useEffect(() => {
    async function fetchAllUsers() {
        if (!isAdmin) {
            setUsers([]);
            return;
        }

        // 1. Usuarios de pedidos (user_info)
        const seen = new Set();
        const uniqueUsers = [];
        if (Array.isArray(adminOrders)) {
            for (const order of adminOrders) {
                let info = {};
                if (order.user_info && typeof order.user_info === 'object' && Object.keys(order.user_info).length > 0) {
                    info = order.user_info;
                } else if (order.user_metadata && typeof order.user_metadata === 'object' && Object.keys(order.user_metadata).length > 0) {
                    info = order.user_metadata;
                } else {
                    info = {
                        email: order.email || '',
                        username: '',
                        avatar_url: ''
                    };
                }
                const key = info.email || order.user_id;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    uniqueUsers.push({
                        id: order.user_id,
                        email: info.email || '',
                        username: info.username || '',
                        avatar_url: info.avatar_url
                    });
                }
            }
        }

        // 2. Usuarios registrados en auth (aunque no hayan hecho pedidos)
        let allAuthUsers = [];
        try {
            const { data, error } = await supabase.rpc('get_all_users');
            if (!error && Array.isArray(data)) {
                allAuthUsers = await Promise.all(
                    data
                        .filter(u => u.email !== 'admin1@gmail.com')
                        .map(async u => {
                            // user_metadata puede venir como string JSON o como objeto
                            let meta = u.user_metadata;
                            if (typeof meta === 'string') {
                                try { meta = JSON.parse(meta); } catch { meta = {}; }
                            }
                            // El nombre real está en user_metadata.username (siempre existe y es obligatorio)
                            // Si no se obtiene, intenta obtenerlo directo de u.raw_user_meta_data?.username (por si Supabase lo guarda ahí)
                            let username = '';
                            if (meta && typeof meta === 'object' && typeof meta.username === 'string' && meta.username.trim() !== '') {
                                username = meta.username;
                            } else if (u.raw_user_meta_data && typeof u.raw_user_meta_data === 'object' && typeof u.raw_user_meta_data.username === 'string' && u.raw_user_meta_data.username.trim() !== '') {
                                username = u.raw_user_meta_data.username;
                            } else if (typeof u.username === 'string' && u.username.trim() !== '') {
                                username = u.username;
                            }
                            // Busca el avatar en Storage/profile
                            let avatar_url = meta?.avatar_url;
                            if (!avatar_url) {
                                const { data: list, error: listError } = await supabase
                                    .storage
                                    .from('profile')
                                    .list('', { search: u.id });
                                if (!listError && Array.isArray(list) && list.length > 0) {
                                    const { data: { publicUrl } } = supabase
                                        .storage
                                        .from('profile')
                                        .getPublicUrl(list[0].name);
                                    avatar_url = publicUrl;
                                }
                            }
                            if (!avatar_url) {
                                avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
                            }
                            return {
                                id: u.id,
                                email: u.email,
                                username: username,
                                avatar_url: avatar_url
                            };
                        })
                );
            }
        } catch (e) {
            // Si no tienes la función, ignora y solo muestra los de pedidos
        }

        // 3. Mezcla ambos, evitando duplicados por email o id
        for (const authUser of allAuthUsers) {
            const key = authUser.email || authUser.id;
            if (key && !seen.has(key)) {
                seen.add(key);
                uniqueUsers.push(authUser);
            }
        }

        setUsers(uniqueUsers);
    }
    fetchAllUsers();
}, [isAdmin, adminOrders]);

        // Para usuarios normales: obtener el admin por user_id directamente desde auth si no hay pedidos del admin
        const getAdminProfile = React.useCallback(async () => {
            // Busca el usuario admin por email usando get_all_users
            const { data: users, error } = await supabase.rpc('get_all_users');
            if (users && Array.isArray(users)) {
                const adminUser = users.find(u => u.email === 'admin1@gmail.com');
                if (adminUser) {
                    // user_metadata puede ser string o objeto
                    let meta = adminUser.user_metadata;
                    if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta); } catch { meta = {}; }
                    }
                    return {
                        id: adminUser.id,
                        email: adminUser.email,
                        ...meta
                    };
                }
            }
            // fallback: solo email
            return { id: null, email: 'admin1@gmail.com' };
        }, []);

        // Referencia para el área de mensajes del chat
        const chatMessagesRef = React.useRef(null);

        // Función para hacer scroll al último mensaje
        const scrollToBottom = () => {
            if (chatMessagesRef.current) {
                chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
            }
        };

        // Cargar mensajes del chat solo cuando se selecciona usuario (admin) o se entra a la pestaña chat (usuario normal)
        React.useEffect(() => {
            let isMounted = true;
            async function fetchMessages() {
                setChatLoading(true);
                let senderId, receiverId;
                if (isAdmin && selectedChatUser) {
                    senderId = user.id;
                    receiverId = selectedChatUser.id;
                } else if (!isAdmin && activeTab === 'chat') {
                    senderId = user.id;
                    const admin = await getAdminProfile();
                    receiverId = admin?.id;
                } else {
                    setChatMessages([]);
                    setChatLoading(false);
                    return;
                }
                if (!receiverId || !senderId) {
                    setChatMessages([]);
                    setChatLoading(false);
                    return;
                }
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
                    .order('created_at', { ascending: true });
                if (!error && isMounted) setChatMessages(data || []);
                setChatLoading(false);
            }
            if ((isAdmin && selectedChatUser) || (!isAdmin && activeTab === 'chat')) {
                fetchMessages();
            }
            // No polling, solo carga una vez al abrir chat
            return () => { isMounted = false; };
        }, [isAdmin, selectedChatUser, user?.id, getAdminProfile, activeTab]);

        // Polling para actualizar mensajes cada 3 segundos si el chat está abierto
        React.useEffect(() => {
            let interval = null;
            let stop = false;
            async function pollMessages() {
                if (stop) return;
                let senderId, receiverId;
                if (isAdmin && selectedChatUser) {
                    senderId = user.id;
                    receiverId = selectedChatUser.id;
                } else if (!isAdmin && activeTab === 'chat') {
                    senderId = user.id;
                    const admin = await getAdminProfile();
                    receiverId = admin?.id;
                } else {
                    return;
                }
                if (!receiverId || !senderId) return;
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
                    .order('created_at', { ascending: true });
                if (!error) setChatMessages(data || []);
            }
            if ((isAdmin && selectedChatUser) || (!isAdmin && activeTab === 'chat')) {
                interval = setInterval(pollMessages, 3000);
            }
            return () => {
                stop = true;
                if (interval) clearInterval(interval);
            };
        }, [isAdmin, selectedChatUser, user?.id, getAdminProfile, activeTab]);

        // Hacer scroll al último mensaje cuando los mensajes cambian
        React.useEffect(() => {
            scrollToBottom();
        }, [chatMessages, chatLoading, activeTab, selectedChatUser]);

        // Enviar mensaje y refrescar mensajes para ambos (admin y usuario)
        const handleSendMessage = async (e) => {
            e.preventDefault();
            if (!chatInput.trim()) return;
            let receiverId;
            if (isAdmin && selectedChatUser) {
                receiverId = selectedChatUser.id;
            } else if (!isAdmin) {
                const admin = await getAdminProfile();
                receiverId = admin?.id;
            }
            if (!receiverId || !user?.id) {
                return;
            }
            const messageToSend = chatInput;
            setChatInput(''); // Limpiar input inmediatamente

            // Agrega el mensaje localmente para feedback instantáneo
            setChatMessages(prev => [
                ...prev,
                {
                    sender_id: user.id,
                    receiver_id: receiverId,
                    message: messageToSend,
                    created_at: new Date().toISOString()
                }
            ]);

            // Inserta el mensaje con los IDs correctos
            await supabase
                .from('messages')
                .insert([{
                    sender_id: user.id,
                    receiver_id: receiverId,
                    message: messageToSend,
                    read: false
                }]);

            // Refresca mensajes en background (sin bloquear UI)
            let senderId = user.id;
            supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    setChatMessages(data || []);
                });

            // Si es admin, refresca la lista de usuarios con nuevos mensajes
            if (isAdmin) {
                setUsersWithNewMessages(prev => prev.filter(id => id !== receiverId));
            }
        };

        // Al seleccionar un usuario en la pestaña de usuarios (admin), marca los mensajes como leídos
        React.useEffect(() => {
            async function markMessagesAsRead() {
                if (isAdmin && selectedChatUser) {
                    await supabase
                        .from('messages')
                        .update({ read: true })
                        .eq('sender_id', selectedChatUser.id)
                        .eq('receiver_id', user.id)
                        .eq('read', false);
                    // Quita el usuario de la lista de nuevos mensajes
                    setUsersWithNewMessages(prev => prev.filter(id => id !== selectedChatUser.id));
                }
            }
            if (isAdmin && selectedChatUser) {
                markMessagesAsRead();
            }
        }, [isAdmin, selectedChatUser, user?.id]);

        // NUEVO: Poll para saber qué usuarios tienen mensajes no leídos para el admin
        React.useEffect(() => {
            let interval = null;
            let stop = false;
            async function pollNewMessages() {
                if (!isAdmin) return;
                // Busca mensajes no leídos para el admin (receiver_id = admin)
                const { data, error } = await supabase
                    .from('messages')
                    .select('sender_id, receiver_id, read, created_at')
                    .eq('receiver_id', user.id)
                    .eq('read', false)
                    .order('created_at', { ascending: false });
                if (!error && Array.isArray(data)) {
                    // Agrupa por sender_id
                    const uniqueSenders = [];
                    const seen = new Set();
                    for (const msg of data) {
                        if (!seen.has(msg.sender_id)) {
                            seen.add(msg.sender_id);
                            uniqueSenders.push(msg.sender_id);
                        }
                    }
                    setUsersWithNewMessages(uniqueSenders);
                }
            }
            if (isAdmin && activeTab === 'users') {
                pollNewMessages();
                interval = setInterval(pollNewMessages, 3000);
            }
            return () => {
                stop = true;
                if (interval) clearInterval(interval);
            };
        }, [isAdmin, user?.id, activeTab]);

        // Ordena usuarios: primero los que tienen mensajes nuevos
        const sortedUsers = React.useMemo(() => {
            if (!isAdmin) return users;
            const withNew = [];
            const withoutNew = [];
            for (const u of users) {
                if (usersWithNewMessages.includes(u.id)) {
                    withNew.push(u);
                } else {
                    withoutNew.push(u);
                }
            }
            // Los de mensajes nuevos primero
            return [...withNew, ...withoutNew];
        }, [users, usersWithNewMessages, isAdmin]);

        // Si cambia initialTab, actualiza la pestaña activa
        React.useEffect(() => {
            if (initialTab && initialTab !== activeTab) {
                setActiveTab(initialTab);
            }
        }, [initialTab]);
        
        // Listen for openChatWithUser event (for admin notification click)
        React.useEffect(() => {
            function handleOpenChatWithUser(e) {
                if (!isAdmin) return;
                if (activeTab !== 'users') setActiveTab('users');
                const userId = e.detail?.userId;
                if (userId) {
                    setTimeout(() => {
                        setSelectedChatUser(users.find(u => u.id === userId) || null);
                        // Highlight the user with red dot if highlight is true
                        if (e.detail?.highlight) setHighlightUserId(userId);
                    }, 50);
                }
            }
            window.addEventListener('openChatWithUser', handleOpenChatWithUser);
            return () => window.removeEventListener('openChatWithUser', handleOpenChatWithUser);
        }, [isAdmin, activeTab, users]);

        // Remove highlight after selecting user
        React.useEffect(() => {
            if (selectedChatUser && highlightUserId === selectedChatUser.id) {
                const timeout = setTimeout(() => setHighlightUserId(null), 2000);
                return () => clearTimeout(timeout);
            }
        }, [selectedChatUser, highlightUserId]);

        return (
            <div data-name="profile" className="profile-page pt-32 pb-16">
        {/* ↑↑↑ Cambia pt-24 por pt-32 para bajar el preview en mobile */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="profile-header-container">
                    <div className="profile-header relative">
                        <button 
                            onClick={onBack}
                            className="absolute top-4 left-4 bg-white/80 p-2 rounded-full text-gray-800 hover:bg-white z-10"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    <div className="profile-user-info">
                        <div className="profile-avatar-container">
                            <img 
                                src={previewImage}
                                alt={user.user_metadata.username || 'User'}
                                className="profile-avatar"
                            />
                            <button 
                                onClick={handlePhotoClick}
                                className="profile-avatar-edit"
                                disabled={uploadingPhoto}
                            >
                                {uploadingPhoto ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-camera"></i>
                                )}
                            </button>
                            <input 
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <div className="text-center mt-16 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user.user_metadata.username || 'User'}
                                {isAdmin && (
                                    <span className="ml-2 text-xs bg-black text-white px-2 py-1 rounded-full">
                                        Admin
                                    </span>
                                )}
                            </h2>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </div>
                
                <div className="profile-content">
                    <div className="profile-tabs sticky-tabs">
    <button 
        className={`tab-button ${activeTab === 'profile' ? 'active-tab' : ''}`}
        onClick={() => setActiveTab('profile')}
    >
        Profile
    </button>
    {!isAdmin && (
        <>
            <button 
                className={`tab-button ${activeTab === 'address' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('address')}
            >
                Address
            </button>
            <button 
                className={`tab-button ${activeTab === 'orders' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('orders')}
            >
                Orders
            </button>
            <button 
                className={`tab-button ${activeTab === 'chat' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('chat')}
            >
                Contact
            </button>
        </>
    )}
    {isAdmin && (
        <button 
            className={`tab-button ${activeTab === 'users' ? 'active-tab' : ''}`}
            onClick={() => {
                setActiveTab('users');
                setSelectedChatUser(null);
            }}
        >
            Users
        </button>
    )}
    {isAdmin && (
        <button 
            className={`tab-button ${activeTab === 'admin' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('admin')}
        >
            Admin
        </button>
    )}
</div>
                            
                            <div className="profile-tab-content px-6 py-8">
                                {saveSuccess && (
                                    <div className="bg-green-50 text-green-600 p-3 rounded mb-6 text-center">
                                        Your profile has been updated successfully!
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="bg-red-50 text-red-500 p-3 rounded mb-6 text-sm">
                                        {error}
                                    </div>
                                )}
                                
                                {activeTab === 'profile' && (
                                    <div>
                                        {isEditing ? (
                                            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Nom d'utilisateur
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                        disabled={loading}
                                                    />
                                                </div>
                                                <div className="flex space-x-4">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 text-base"
                                                    >
                                                        {loading ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditing(false)}
                                                        className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors text-base"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="space-y-8 max-w-3xl mx-auto">
                                                <div className="profile-stats">
                                                    <div className="p-4 hover:bg-gray-100 transition-colors rounded-lg">
                                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                                        <div className="text-sm text-gray-500">Orders</div>
                                                    </div>
                                                    <div className="p-4 hover:bg-gray-100 transition-colors rounded-lg">
                                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                                        <div className="text-sm text-gray-500">Reviews</div>
                                                    </div>
                                                    <div className="p-4 hover:bg-gray-100 transition-colors rounded-lg">
                                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                                        <div className="text-sm text-gray-500">Wishlist</div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="w-full bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-base"
                                                >
                                                    Modifier le profil
                                                </button>
                                                
                                                <div className="border-t pt-6">
                                                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Paramètres du compte</h3>
                                                    <div className="space-y-4">
                                                        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                                                            <i className="fas fa-bell mr-3 text-gray-600"></i>
                                                            <span>Notification</span>
                                                        </button>
                                                        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                                                            <i className="fas fa-lock mr-3 text-gray-600"></i>
                                                            <span>Confidentialité</span>
                                                        </button>
                                                        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                                                            <i className="fas fa-cog mr-3 text-gray-600"></i>
                                                            <span>Préférences</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {activeTab === 'address' && (
                                    <form onSubmit={handleAddressSubmit} className="space-y-6 max-w-3xl mx-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Address
                                                </label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="123 Main St"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="New York"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    State/Province
                                                </label>
                                                <input
                                                    type="text"
                                                    name="state"
                                                    value={formData.state}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="NY"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Postal Code
                                                </label>
                                                <input
                                                    type="text"
                                                    name="postalCode"
                                                    value={formData.postalCode}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="10001"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    name="country"
                                                    value={formData.country}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="United States"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-black text-base"
                                                    placeholder="+1 555 123 4567"
                                                    disabled={addressLocked}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || addressLocked}
                                            className="w-full bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 mt-4 text-base"
                                        >
                                            {addressLocked ? 'Adresse enregistrée (ne peut pas être modifiée)' : (loading ? 'Saving...' : 'Save Address')}
                                        </button>
                                    </form>
                                )}
                                
                                {activeTab === 'users' && isAdmin && (
    <div className="max-w-2xl mx-auto">
        <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center">
            <i className="fas fa-users text-gray-600 mr-2"></i>
            Users
        </h3>
        <div className="space-y-2">
            {sortedUsers.length === 0 && (
                <div className="text-gray-500 text-center py-8">No users found.</div>
            )}
            {sortedUsers.map(u => (
                <React.Fragment key={u.id}>
                    <div
                        className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition ${selectedChatUser?.id === u.id ? 'bg-gray-200' : ''}`}
                        onClick={() => setSelectedChatUser(selectedChatUser?.id === u.id ? null : u)}
                    >
                        <img
                            src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || u.email || 'User')}&background=random`}
                            alt={u.username || u.email || 'User'}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <div className="font-medium flex items-center">
                                {u.username || 'User'}
                                {(usersWithNewMessages.includes(u.id) || highlightUserId === u.id) && (
                                    <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full" title="New message"></span>
                                )}
                            </div>
                            <div className="text-gray-500 text-sm">{u.email}</div>
                        </div>
                    </div>
                    {selectedChatUser?.id === u.id && (
                        <div className="mt-4 mb-8 border-t pt-6">
                            <div
                                ref={chatMessagesRef}
                                className="bg-gray-50 rounded-lg p-2 sm:p-4 h-[60vh] sm:h-64 overflow-y-auto mb-4 hide-scrollbar"
                                style={{ maxHeight: '70vh' }}
                            >
                                {chatLoading ? (
                                    <div className="text-center text-gray-400 py-8">
                                        <i className="fas fa-spinner fa-spin"></i> Loading...
                                    </div>
                                ) : (
                                    chatMessages.length === 0 ? (
                                        <div className="text-gray-400 text-center py-8">No messages yet.</div>
                                    ) : (
                                        chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`mb-2 flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                                {msg.sender_id !== user.id ? (
                                                    // Mensaje recibido por el admin (usuario) muestra avatar del usuario
                                                    <div className="flex items-end gap-2">
                                                        <img
                                                            src={selectedChatUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChatUser.username || selectedChatUser.email || 'User')}&background=random`}
                                                            alt={selectedChatUser.username || selectedChatUser.email || 'User'}
                                                            className="w-7 h-7 rounded-full object-cover"
                                                        />
                                                        <div className="px-3 py-2 rounded-lg text-sm sm:text-base bg-gray-200 text-gray-900">
                                                            {msg.message}
                                                            <div className="text-xs text-gray-400 mt-1 text-right">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Mensaje enviado por el admin (muestra avatar del admin)
                                                    <div className="flex items-end gap-2 justify-end">
                                                        <div className="px-3 py-2 rounded-lg text-sm sm:text-base bg-black text-white">
                                                            {msg.message}
                                                            <div className="text-xs text-gray-400 mt-1 text-right">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <img
                                                            src={previewImage}
                                                            alt="Admin"
                                                            className="w-7 h-7 rounded-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-2 py-2 sm:px-3 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    disabled={chatLoading}
                                />
                                <button
                                    type="submit"
                                    className="bg-black text-white px-3 py-2 rounded-lg disabled:bg-gray-400 text-sm sm:text-base"
                                    disabled={chatLoading || !chatInput.trim()}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    </div>
)}
                                
                                {activeTab === 'chat' && !isAdmin && (
    <div className="max-w-2xl mx-auto">
        <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center">
            <i className="fas fa-comments text-gray-600 mr-2"></i>
            Parler à l'administrateur
        </h3>
        <div
            ref={chatMessagesRef}
            className="bg-gray-50 rounded-lg p-2 sm:p-4 h-[60vh] sm:h-64 overflow-y-auto mb-4 hide-scrollbar"
            style={{ maxHeight: '70vh' }}
        >
            {chatLoading ? (
                <div className="text-center text-gray-400 py-8">
                    <i className="fas fa-spinner fa-spin"></i> Loading...
                </div>
            ) : (
                chatMessages.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">Aucun message pour le moment.</div>
                ) : (
                    chatMessages.map((msg, idx) => {
                        // Busca el avatar real del admin
                        let adminUser = null;
                        for (let i = 0; i < users.length; i++) {
                            if (users[i].email && users[i].email.toLowerCase() === 'admin1@gmail.com') {
                                adminUser = users[i];
                                break;
                            }
                        }
                        const adminAvatar = adminUser && adminUser.avatar_url
                            ? adminUser.avatar_url
                            : `https://ui-avatars.com/api/?name=Admin&background=random`;
                        // Avatar del usuario actual
                        const userAvatar = user?.user_metadata?.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.username || 'User')}&background=random`;

                        return (
                            <div key={idx} className={`mb-2 flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender_id === user.id ? (
                                    // Mensaje enviado por el usuario (muestra avatar del usuario)
                                    <div className="flex items-end gap-2 justify-end">
                                        <div className="px-3 py-2 rounded-lg text-sm sm:text-base bg-black text-white">
                                            {msg.message}
                                            <div className="text-xs text-gray-400 mt-1 text-right">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <img
                                            src={userAvatar}
                                            alt={user.user_metadata.username || 'User'}
                                            className="w-7 h-7 rounded-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    // Mensaje recibido del admin (muestra avatar del admin)
                                    <div className="flex items-end gap-2">
                                        <img
                                            src={adminAvatar}
                                            alt="Admin"
                                            className="w-7 h-7 rounded-full object-cover"
                                        />
                                        <div className="px-3 py-2 rounded-lg text-sm sm:text-base bg-gray-200 text-gray-900">
                                            {msg.message}
                                            <div className="text-xs text-gray-400 mt-1 text-right">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )
            )}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
                type="text"
                className="flex-1 px-2 py-2 sm:px-3 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base"
                placeholder="Tapez un message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
            />
            <button
                type="submit"
                className="bg-black text-white px-3 py-2 rounded-lg disabled:bg-gray-400 text-sm sm:text-base"
                disabled={chatLoading || !chatInput.trim()}
            >
                Send
            </button>
        </form>
    </div>
)}
                                
                                {activeTab === 'orders' && !isAdmin && (
                                    <div className="max-w-3xl mx-auto">
                                        <div className="flex items-center space-x-2 mb-6">
                                            <i className="fas fa-shopping-bag text-gray-600"></i>
                                            <h3 className="font-semibold text-gray-900 text-lg">Historique des commandes</h3>
                                        </div>
                                        {userOrders.length === 0 ? (
                                            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                                                <i className="fas fa-shopping-bag text-5xl mb-4 text-gray-300"></i>
                                                <p className="mb-4">Aucune commande pour le moment</p>
                                                <button 
                                                    onClick={onBack}
                                                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                                >
                                                    Browse products
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {userOrders.map(order => (
                                                    <div key={order.id} className="bg-white rounded-lg shadow p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-gray-700 font-semibold">Commande #{order.id}</span>
                                                            <span className="text-gray-500 text-sm">{new Date(order.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 mb-2">
                                                            {(order.items || []).map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                                                                    <img src={item.image_url || item.image} alt={item.name} className="w-12 h-12 object-contain rounded" />
                                                                    <div>
                                                                        <div className="font-medium">{item.name}</div>
                                                                        <div className="text-gray-500 text-xs">x{item.quantity}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600 text-sm">Total:</span>
                                                            <span className="font-bold text-lg">
                                                                MAD{((order.items || []).reduce((sum, i) => sum + (i.price * i.quantity), 0)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {activeTab === 'admin' && isAdmin && (
    <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-2 mb-6">
            <i className="fas fa-shield-alt text-gray-600"></i>
            <h3 className="font-semibold text-gray-900 text-lg">Admin Dashboard</h3>
        </div>
        <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-lg mb-4">Gestion de produits</h4>
                <p className="text-gray-600 mb-4">Vous disposez de privilèges d'administrateur pour ajouter des produits.</p>
                <button 
                    onClick={onBack}
                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Go to Products
                </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-lg mb-4">Site Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-2xl font-bold">
                            {Array.isArray(adminOrders) && adminOrders.length > 0
                                ? adminOrders.flatMap(order => order.items || []).length
                                : 0}
                        </div>
                        <div className="text-gray-500 text-sm">Total Products</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-2xl font-bold">{adminOrders ? adminOrders.length : 0}</div>
                        <div className="text-gray-500 text-sm">Total des commandes</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-2xl font-bold">
                            {Array.isArray(users) ? users.length : 0}
                        </div>
                        <div className="text-gray-500 text-sm">Total Users</div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-lg mb-4">Commandes récentes</h4>
                <div className="space-y-4">
                    {adminOrders && adminOrders.length > 0 ? adminOrders.map(order => {
                        const userInfo = order.user_info || {};
                        return (
                        <div
                            key={order.id}
                            className="flex flex-col sm:flex-row items-center bg-white rounded-lg shadow p-4 gap-4 sm:gap-0"
                        >
                            <img
                                src={userInfo.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.username || order.user_id || 'User')}&background=random`}
                                alt={userInfo.username || order.user_id || 'User'}
                                className="w-16 h-16 sm:w-12 sm:h-12 rounded-full cursor-pointer object-cover mb-2 sm:mb-0"
                                onClick={() => onUserOrderClick(order)}
                            />
                            <div className="flex-1 w-full sm:ml-4 flex flex-col items-center sm:items-start">
                                <div className="font-semibold text-center sm:text-left break-all">{userInfo.username || order.user_id || 'User'}</div>
                                <div className="text-gray-500 text-sm text-center sm:text-left break-all">{userInfo.email || ''}</div>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                                    {(order.items || []).map((item, idx) => (
                                        <img key={idx} src={item.image_url || item.image} alt={item.name} className="w-8 h-8 object-contain rounded" />
                                    ))}
                                </div>
                            </div>
                            <div className="text-gray-400 text-xs mt-2 sm:mt-0 text-center sm:text-right w-full sm:w-auto">
                                {new Date(order.created_at).toLocaleString()}
                            </div>
                        </div>
                    )}) : (
                        <div className="text-gray-500 text-center">Aucune commande pour le moment.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Profile component error:', error);
        reportError(error);
        return null;
    }
}

/* Al final del archivo, agrega este CSS para ocultar el scrollbar pero permitir scroll */
<style>
{`
.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE 10+ */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Webkit */
}
`}
</style>
