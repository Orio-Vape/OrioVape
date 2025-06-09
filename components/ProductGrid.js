function ProductGrid({ products, onAddToCart, onPreview, isAdmin, onEdit, onProductAdded, tableName }) {
    const [formData, setFormData] = React.useState({
        name: '',
        description: '',
        image_url: '',
        featured: false, 
        price1: '',
        price2: '',
        price3: '',
        enablePrice1: true,
        enablePrice2: false,
        enablePrice3: false,
    });
    const [error, setError] = React.useState('');
    const [uploading, setUploading] = React.useState(false);
    const [preview, setPreview] = React.useState(null);
    const [showAddModal, setShowAddModal] = React.useState(false);

    
    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setFormData({
            name: '',
            description: '',
            image_url: '',
            featured: false, // Reset
            // Precios múltiples y flags de activación
            price1: '',
            price2: '',
            price3: '',
            enablePrice1: true,
            enablePrice2: false,
            enablePrice3: false,
        });
        setPreview(null);
        setError('');
    };

    const handleImageChange = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            // Preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);

            setUploading(true);
            setError('');

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                image_url: publicUrl
            }));
        } catch (error) {
            setError('Error uploading image: ' + error.message);
            console.error('Error uploading image:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Nuevo: función para marcar solo un producto como destacado
    const handleFeaturedChange = async (checked) => {
        if (checked) {
            // Desmarcar todos los productos en la base de datos
            await supabase.from('products').update({ featured: false }).neq('id', null);
        }
        setFormData(prev => ({
            ...prev,
            featured: checked
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.image_url) {
                throw new Error('Please upload an image');
            }
            if (!formData.name || !formData.description) {
                throw new Error('Please fill in all fields');
            }
            // Validación: al menos un precio habilitado y definido
            if (
                (!formData.enablePrice1 || !formData.price1) &&
                (!formData.enablePrice2 || !formData.price2) &&
                (!formData.enablePrice3 || !formData.price3)
            ) {
                throw new Error('Debes ingresar al menos un precio habilitado');
            }
            // Si el producto es destacado, desmarcar los demás antes de insertar
            if (formData.featured) {
                await supabase.from('products').update({ featured: false }).neq('id', null);
            }
            const { data, error } = await supabase
                .from(tableName || 'products')
                .insert([{
                    name: formData.name,
                    description: formData.description,
                    image_url: formData.image_url,
                    featured: !!formData.featured,
                    // Guardar precios y flags
                    price1: formData.enablePrice1 ? parseFloat(formData.price1) : null,
                    price2: formData.enablePrice2 ? parseFloat(formData.price2) : null,
                    price3: formData.enablePrice3 ? parseFloat(formData.price3) : null,
                    enablePrice1: !!formData.enablePrice1,
                    enablePrice2: !!formData.enablePrice2,
                    enablePrice3: !!formData.enablePrice3,
                }])
                .select();
            if (error) throw error;
            handleCloseAddModal();
            // Forzar recarga de productos tras agregar uno nuevo
            if (onProductAdded) {
                await onProductAdded();
            }
        } catch (error) {
            setError(error.message);
            console.error('Error adding product:', error);
        }
    };

    // Siempre usa la tabla 'products2' para agregar/eliminar productos en esta sección
    const handleAddProduct = async (newProduct) => {
        const { error } = await supabase.from('products2').insert([newProduct]);
        if (!error && onProductAdded) onProductAdded();
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('¿Eliminar este producto?')) return;
        const { error } = await supabase.from('products2').delete().eq('id', productId);
        if (!error && onProductAdded) onProductAdded();
    };

    // Modal fuera del render principal para evitar recreación
    const AddProductModal = showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button
                    className="absolute top-3 right-3 text-gray-500 hover:text-black"
                    onClick={handleCloseAddModal}
                    type="button"
                >
                    <i className="fas fa-times"></i>
                </button>
                <h2 className="text-xl font-bold mb-4 text-center">Ajouter un nouveau produit</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col items-center">
                        {preview ? (
                            <div className="mb-2">
                                <img src={preview} alt="Preview" className="w-40 h-40 object-contain rounded-lg border" />
                            </div>
                        ) : (
                            <div className="mb-2 flex flex-col items-center justify-center w-40 h-40 border rounded-lg bg-gray-50 cursor-pointer"
                                onClick={() => document.getElementById('add-product-image-input').click()}>
                                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                                <span className="text-xs text-gray-400">Upload image</span>
                            </div>
                        )}
                        <input
                            id="add-product-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={uploading}
                        />
                    </div>
                    <input
                        type="text"
                        name="name"
                        placeholder="Nom du produit"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                        autoFocus
                    />
                    {/* Precios múltiples con checkboxes */}
                    <div className="space-y-2">
                        {tableName === 'products2' ? (
                            // Jetables: solo % y textos personalizados
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice1"
                                        id="enablePrice1"
                                        checked={formData.enablePrice1}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice1" className="text-sm">Prix ​​pour 0%</label>
                                    <input
                                        type="number"
                                        name="price1"
                                        placeholder="Prix (MAD)"
                                        value={formData.price1}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice1}
                                        disabled={!formData.enablePrice1}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice2"
                                        id="enablePrice2"
                                        checked={formData.enablePrice2}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice2" className="text-sm">Prix ​​pour 3%</label>
                                    <input
                                        type="number"
                                        name="price2"
                                        placeholder="Prix (MAD)"
                                        value={formData.price2}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice2}
                                        disabled={!formData.enablePrice2}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice3"
                                        id="enablePrice3"
                                        checked={formData.enablePrice3}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice3" className="text-sm">Prix ​​pour 5%</label>
                                    <input
                                        type="number"
                                        name="price3"
                                        placeholder="Prix (MAD)"
                                        value={formData.price3}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice3}
                                        disabled={!formData.enablePrice3}
                                    />
                                </div>
                            </>
                        ) : (
                            // Liquide: deja los mg como estaban
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice1"
                                        id="enablePrice1"
                                        checked={formData.enablePrice1}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice1" className="text-sm">Prix ​​pour 0mg, 3mg, 6mg</label>
                                    <input
                                        type="number"
                                        name="price1"
                                        placeholder="Prix (MAD)"
                                        value={formData.price1}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice1}
                                        disabled={!formData.enablePrice1}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice2"
                                        id="enablePrice2"
                                        checked={formData.enablePrice2}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice2" className="text-sm">Prix ​​pour 12mg</label>
                                    <input
                                        type="number"
                                        name="price2"
                                        placeholder="Prix (MAD)"
                                        value={formData.price2}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice2}
                                        disabled={!formData.enablePrice2}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="enablePrice3"
                                        id="enablePrice3"
                                        checked={formData.enablePrice3}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="enablePrice3" className="text-sm">Prix ​​pour 25mg</label>
                                    <input
                                        type="number"
                                        name="price3"
                                        placeholder="Prix (MAD)"
                                        value={formData.price3}
                                        onChange={handleChange}
                                        className="border rounded px-2 py-1 w-28 ml-2"
                                        min="0"
                                        step="0.01"
                                        required={formData.enablePrice3}
                                        disabled={!formData.enablePrice3}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <textarea
                        name="description"
                        placeholder="Description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                        required
                    />
                    {/* Nuevo checkbox para destacar */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="featured"
                            id="featured"
                            checked={formData.featured}
                            onChange={e => handleFeaturedChange(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="featured" className="text-sm text-gray-700 select-none">
                            (Afficher le produit en premier)
                        </label>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition"
                        disabled={uploading}
                    >
                        {uploading ? 'Subiendo...' : 'Ajouter un produit'}
                    </button>
                </form>
            </div>
        </div>
    ) : null;

    try {
        // Ordenar productos: destacados primero, luego el resto, ambos por id descendente (más nuevo primero)
        const sortedProducts = products
            ? [...products]
                .sort((a, b) => {
                    // Primero destacados
                    if ((b.featured ? 1 : 0) - (a.featured ? 1 : 0) !== 0) {
                        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
                    }
                    // Entre destacados o no destacados, los más nuevos primero por id
                    if (b.id && a.id && b.id !== a.id) {
                        return b.id - a.id;
                    }
                    // Si no hay id, fallback a nombre
                    return a.name.localeCompare(b.name);
                })
            : [];

        return (
            <section id="products" data-name="product-grid" className="py-5">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2
                            className={
                                `text-3xl font-bold text-gray-800 inline-block flex-1
                                ${isAdmin
                                    ? 'text-left sm:text-center'
                                    : 'text-center mx-auto'}`
                            }
                        >
                            Produits de qualité
                        </h2>
                        {isAdmin && (
                            <button
                                className="bg-black text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition flex items-center gap-2"
                                onClick={() => setShowAddModal(true)}
                                type="button"
                            >
                                <i className="fas fa-plus"></i>
                                Ajouter un produit
                            </button>
                        )}
                    </div>
                    {/* Renderizado de productos */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sortedProducts && sortedProducts.length > 0 ? (
                            sortedProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`
                                        bg-white rounded-xl shadow
                                        flex flex-col items-stretch group relative
                                        min-h-[260px] h-full
                                        p-2
                                        md:p-5 md:min-h-[370px]
                                    `}
                                >
                                    {/* Imagen y eliminar solo admin */}
                                    <div className={`
                                        relative w-full flex justify-center items-center
                                        mb-2 md:mb-4
                                    `}>
                                        <img
                                            src={product.image_url || product.image}
                                            alt={product.name}
                                            className={`
                                                w-full object-contain rounded bg-gray-50
                                                h-40 md:h-56
                                            `}
                                            onClick={() => onPreview && onPreview({ ...product, tableName })}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {isAdmin && (
                                            <button
                                                className={`
                                                    absolute top-1 right-1 md:top-2 md:right-2
                                                    bg-white/90 p-1 md:p-2 rounded-full text-gray-800
                                                    hover:bg-red-500 hover:text-white shadow transition
                                                `}
                                                onClick={() => handleDeleteProduct(product.id)}
                                                type="button"
                                            >
                                                <i className="fas fa-trash text-xs md:text-base"></i>
                                            </button>
                                        )}
                                    </div>
                                    {/* Nombre y descripción alineados a la izquierda */}
                                    <div className="flex-1 flex flex-col justify-between w-full text-left">
                                        <h3
                                            className={`
                                                font-semibold text-base md:text-lg text-gray-800
                                                mb-1 md:mb-2 cursor-pointer hover:underline break-words
                                            `}
                                            onClick={() => onPreview && onPreview(product)}
                                            style={{ wordBreak: 'break-word' }}
                                        >
                                            {product.name}
                                        </h3>
                                        <p
                                            className={`
                                                text-gray-600 text-xs md:text-base
                                                mb-1 md:mb-2 line-clamp-2 break-words
                                            `}
                                            style={{ minHeight: '2em' }}
                                        >
                                            {product.description}
                                        </p>
                                    </div>
                                    {/* Precio abajo a la izquierda y botón a la derecha */}
                                    <div className="flex flex-row items-center justify-between w-full mt-auto pt-1 md:pt-2 gap-1">
                                        <span className="text-black font-bold text-base md:text-xl block">
                                            {product.price1 != null ? `MAD${product.price1}` : '-'}
                                        </span>
                                        <button
                                            className={`
                                                bg-black text-white rounded
                                                px-2 py-1 text-xs w-auto
                                                md:w-auto md:px-5 md:py-2 md:text-base
                                                hover:bg-gray-800 transition
                                            `}
                                            // Cambia aquí: muestra el preview en vez de añadir al carrito directamente
                                            onClick={() => onPreview && onPreview({ ...product, tableName })}
                                            type="button"
                                        >
                                            <i className="fas mr-1"></i>Ajouter panier
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center text-gray-500 py-10">
                                No hay productos disponibles.
                            </div>
                        )}
                    </div>
                </div>
                {/* Modal para agregar producto */}
                {isAdmin && AddProductModal}
            </section>
        );
    } catch (error) {
        console.error('ProductGrid component error:', error);
        reportError(error);
        return null;
    }
}