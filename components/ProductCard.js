function ProductCard({ product, onAddToCart, onPreview }) {
    try {
        return (
            <div data-name="product-card" className="product-card bg-white rounded-xl shadow-sm overflow-hidden">
                <div data-name="product-image" className="relative">
                    <img 
                        src={product.image_url ? product.image_url : (product.image ? product.image : '/placeholder.png')}
                        alt={product.name}
                        className="product-image w-full cursor-pointer"
                        onClick={() => onPreview(product)}
                        style={{ objectFit: 'contain', height: '200px', background: '#f9f9f9' }}
                    />
                    {product.isNew && (
                        <span className="product-badge bg-black text-white text-xs font-medium">
                            NEW
                        </span>
                    )}
                </div>
                <div className="p-4">
                    <h3 
                        className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-gray-600"
                        onClick={() => onPreview(product)}
                    >
                        {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">MAD{product.price}</span>
                        <button 
                            onClick={() => onAddToCart(product)}
                            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('ProductCard component error:', error);
        reportError(error);
        return null;
    }
}
