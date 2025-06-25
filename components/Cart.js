function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, user, onOrderPlaced }) {
    try {
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const [notification, setNotification] = React.useState(null);
        const [checkingOut, setCheckingOut] = React.useState(false);

        const handleCheckout = async () => {
            if (!user) {
                setNotification({ type: 'error', message: 'You must be logged in.' });
                return;
            }
            setCheckingOut(true);
            setNotification(null);
            try {
                // Fetch address
                const { data: address, error: addressError } = await supabase
                    .from('Address')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (addressError || !address) {
                    setNotification({ type: 'error', message: 'Please fill in your address before ordering.' });
                    setCheckingOut(false);
                    return;
                }
                // Save order (make sure items/address are JSON)
                const { error: orderError } = await supabase
                    .from('orders')
                    .insert([{
                        user_id: user.id,
                        items: items, // If column is JSON, this is fine
                        address: address, // If column is JSON, this is fine
                        user_info: {
                            username: user.user_metadata?.username || '',
                            email: user.email || '',
                            avatar_url: user.user_metadata?.avatar_url || ''
                        },
                        created_at: new Date().toISOString()
                    }]);
                if (orderError) {
                    console.error('Order insert error:', orderError);
                    setNotification({ type: 'error', message: 'Failed to place order.' });
                    setCheckingOut(false);
                    return;
                }
                setNotification({ type: 'success', message: 'Order placed successfully! Your order will be shipped.' });
                if (onOrderPlaced) onOrderPlaced();
            } catch (err) {
                console.error('Order placement exception:', err);
                setNotification({ type: 'error', message: 'Failed to place order.' });
            } finally {
                setCheckingOut(false);
            }
        };

        return (
            <div data-name="cart" className={`${isOpen ? 'visible' : 'hidden'}`}>
                {/* Overlay con z-index alto para que esté por encima de todos los elementos */}
                <div 
                    className={`cart-overlay fixed inset-0 bg-black/50 z-50 ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'} transition-opacity duration-300`}
                    onClick={onClose}
                ></div>
                
                {/* Drawer con z-index más alto que el overlay y transición para deslizamiento */}
                <div 
                    className={`cart-drawer fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-lg font-semibold">Panier</h2>
                            <button 
                                onClick={onClose} 
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                                aria-label="Close cart"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <p className="text-center text-gray-500">Votre panier est vide</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id + (item.strength || '')} className="flex items-center py-4 border-b">
                                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded"/>
                                        <div className="ml-4 flex-1">
                                            <h3 className="font-medium">{item.name}</h3>
                                            <p className="text-gray-500">MAD{item.price}</p>
                                            {item.strength && (
                                                <p className="text-xs text-gray-700 mt-1">
                                                    <span className="font-semibold">Concentration:</span> {
                                                        // Mostrar % si es Jetables, mg si es Liquide
                                                        (item.strength.endsWith('%') ? item.strength : item.strength)
                                                    }
                                                </p>
                                            )}
                                            <div className="flex items-center mt-2">
                                                <button 
                                                    onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 border rounded-full"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <span className="mx-3 min-w-[20px] text-center">{item.quantity}</span>
                                                <button 
                                                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 border rounded-full"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700 ml-4 p-2"
                                            aria-label="Remove item"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t">
                            {/* Notification */}
                            {notification && (
                                <div className={`mb-4 p-3 rounded text-center ${notification.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                    {notification.message}
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-semibold">Total:</span>
                                <span className="font-bold">MAD{total.toFixed(2)}</span>
                            </div>
                            <button 
                                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={items.length === 0 || checkingOut}
                                onClick={async () => {
                                    await handleCheckout();
                                    // Clear cart if success
                                    if (notification?.type !== 'error') {
                                        setTimeout(() => {
                                            if (notification?.type === 'success') {
                                                onClose();
                                                if (onOrderPlaced) onOrderPlaced(); // parent clears cart
                                            }
                                        }, 1200);
                                    }
                                }}
                            >
                                {checkingOut ? 'Processing...' : 'Vérifier'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Cart component error:', error);
        reportError(error);
        return null;
    }
}