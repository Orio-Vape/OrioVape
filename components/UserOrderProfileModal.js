function UserOrderProfileModal({ order, onClose }) {
    // Validaciones defensivas
    if (!order || typeof order !== 'object') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <button
                        className="absolute top-3 right-3 text-gray-500 hover:text-black"
                        onClick={onClose}
                        type="button"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                    <div className="text-red-500 font-bold text-lg">Order data not available.</div>
                </div>
            </div>
        );
    }

    const user = order.user_info && typeof order.user_info === 'object' ? order.user_info : {};
    const address = order.address && typeof order.address === 'object' ? order.address : {};
    const items = Array.isArray(order.items) ? order.items : [];
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-2xl p-4 sm:p-8 relative overflow-y-auto max-h-[95vh] sm:max-h-[90vh]">
                <button
                    className="absolute top-3 right-3 text-gray-500 hover:text-black"
                    onClick={onClose}
                    type="button"
                >
                    <i className="fas fa-times"></i>
                </button>
                {/* User Info */}
                <div className="flex flex-col items-center mb-8">
                    <img
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || order.user_id || 'User')}&background=random`}
                        alt={user.username || order.user_id || 'User'}
                        className="w-24 h-24 rounded-full mb-3 object-cover border-4 border-gray-200 shadow"
                        style={{ maxWidth: '96px', maxHeight: '96px' }}
                    />
                    <div className="font-bold text-2xl text-center break-all">{user.username || order.user_id || 'User'}</div>
                    <div className="text-gray-500 text-center break-all">{user.email || ''}</div>
                </div>
                {/* Products */}
                <div className="mb-8">
                    <h3 className="font-semibold text-lg mb-3 text-center border-b pb-2">Products</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.length > 0 ? items.map((item, idx) => (
                            <div key={idx} className="flex items-center bg-gray-50 rounded-lg p-3 shadow-sm">
                                <img src={item.image_url || item.image} alt={item.name} className="w-16 h-16 object-contain rounded mr-4 border" />
                                <div>
                                    <div className="font-medium text-base">{item.name}</div>
                                    <div className="text-gray-500 text-sm">x{item.quantity}</div>
                                    {item.strength && (
                                        <div className="text-xs text-gray-700 mt-1">
                                            <span className="font-semibold">Concentration:</span> {item.strength}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-gray-400 col-span-full text-center">No products in this order.</div>
                        )}
                    </div>
                </div>
                {/* Address */}
                <div className="mb-8">
                    <h3 className="font-semibold text-lg mb-3 text-center border-b pb-2">Shipping Address</h3>
                    <div className="bg-gray-50 rounded-lg p-5 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">Street Address</label>
                                <input
                                    type="text"
                                    value={address.street_address || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">City</label>
                                <input
                                    type="text"
                                    value={address.city || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">State/Province</label>
                                <input
                                    type="text"
                                    value={address.state_province || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">Postal Code</label>
                                <input
                                    type="text"
                                    value={address.postal_code || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={address.country || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-base text-gray-800 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={address.phone_number || '-'}
                                    readOnly
                                    className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Total */}
                <div className="flex justify-center items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-black bg-gray-100 px-8 py-4 rounded-lg text-center shadow">
                        Total: MAD{total.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserOrderProfileModal;
