import { supabase } from '../utils/supabase';

function ProductPreview({ product, onClose, onAddToCart, isAdmin, onImageUpdated }) {
    try {
        const [activeImage, setActiveImage] = React.useState(product.image_url || product.image);
        const [quantity, setQuantity] = React.useState(1);
        const [addingToCart, setAddingToCart] = React.useState(false);
        const [addedToCart, setAddedToCart] = React.useState(false);
        const [isFavorite, setIsFavorite] = React.useState(false);
        const [showFileInput, setShowFileInput] = React.useState(false);
        const [selectedStrength, setSelectedStrength] = React.useState('0mg');
        const [showFullScreenImage, setShowFullScreenImage] = React.useState(false);
        const fileInputRef = React.useRef(null);

        if (!product) return null;
        const handleEditClick = () => {
            setShowFileInput(true);
            setTimeout(() => fileInputRef.current?.click(), 100);
        };

        const handleFileChange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            // Eliminar imagen anterior si es del bucket
            if (product.image && product.image.startsWith("https://")) {
                const oldPath = product.image.split("/product/")[1];
                if (oldPath) {
                    await supabase.storage.from("product").remove([oldPath]);
                }
            }
            // Subir nueva imagen
            const fileExt = file.name.split('.').pop();
            const fileName = `${product.id}_${Date.now()}.${fileExt}`;
            const { data, error } = await supabase.storage.from("product").upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });
            if (error) {
                alert("Error subiendo imagen");
                return;
            }
            // Obtener URL pública
            const { data: urlData } = supabase.storage.from("product").getPublicUrl(fileName);
            setActiveImage(urlData.publicUrl);
            setShowFileInput(false);
            if (onImageUpdated) onImageUpdated(product.id, urlData.publicUrl);
        };

        // Corrige las imágenes adicionales para el preview
        const additionalImages = [
            product.image_url || product.image,
            product.image_url || product.image, // View2 igual a la principal si no hay más
            product.image_url || product.image  // View3 igual a la principal si no hay más
        ];

        const incrementQuantity = () => setQuantity(prev => prev + 1);
        const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

        // Determinar qué concentraciones mostrar según los precios habilitados
        let availableStrengths = [];
        let defaultStrength = '';
        if (product.tableName === 'products2') {
            // Jetables: % en vez de mg
            if (product.enablePrice1 !== false && product.price1 != null) {
                availableStrengths.push('0%');
                defaultStrength = '0%';
            }
            if (product.enablePrice2 && product.price2 != null) {
                availableStrengths.push('3%');
                if (!defaultStrength) defaultStrength = '3%';
            }
            if (product.enablePrice3 && product.price3 != null) {
                availableStrengths.push('5%');
                if (!defaultStrength) defaultStrength = '5%';
            }
        } else if (product.tableName === 'products3') {
            // Concentré: NO hay concentraciones, solo precio
            availableStrengths = [];
            defaultStrength = '';
        } else {
            // Liquide: mg
            if (product.enablePrice1 !== false && product.price1 != null) {
                availableStrengths.push('0mg', '3mg', '6mg');
                defaultStrength = '0mg';
            }
            if (product.enablePrice2 && product.price2 != null) {
                availableStrengths.push('12mg');
                if (!defaultStrength) defaultStrength = '12mg';
            }
            if (product.enablePrice3 && product.price3 != null) {
                availableStrengths.push('25mg');
                if (!defaultStrength) defaultStrength = '25mg';
            }
        }

        // Inicializa la concentración seleccionada al primer valor disponible
        React.useEffect(() => {
            setSelectedStrength(defaultStrength);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [product.id]);

        // Determinar el precio según la concentración seleccionada
        let displayPrice = product.price;
        if (product.tableName === 'products2') {
            if (selectedStrength === '0%' && product.enablePrice1 && product.price1 != null) {
                displayPrice = product.price1;
            } else if (selectedStrength === '3%' && product.enablePrice2 && product.price2 != null) {
                displayPrice = product.price2;
            } else if (selectedStrength === '5%' && product.enablePrice3 && product.price3 != null) {
                displayPrice = product.price3;
            }
        } else if (product.tableName === 'products3') {
            // Concentré: solo price1
            displayPrice = product.price1;
        } else {
            if (['0mg', '3mg', '6mg'].includes(selectedStrength) && product.enablePrice1 && product.price1 != null) {
                displayPrice = product.price1;
            } else if (selectedStrength === '12mg' && product.enablePrice2 && product.price2 != null) {
                displayPrice = product.price2;
            } else if (selectedStrength === '25mg' && product.enablePrice3 && product.price3 != null) {
                displayPrice = product.price3;
            }
        }

        const handleAddToCart = () => {
            if (addingToCart) return; // Prevenir múltiples clics

            setAddingToCart(true);

            // Crear objeto de producto con la información necesaria para el carrito
            const productToAdd = {
                id: product.id,
                name: product.name,
                price: displayPrice,
                image: product.image_url || product.image,
                quantity: quantity,
                // Solo agrega strength si corresponde
                ...(product.tableName !== 'products3' && { strength: selectedStrength })
            };

            onAddToCart(productToAdd);

            setAddedToCart(true);
            setAddingToCart(false);

            setTimeout(() => {
                setAddedToCart(false);
            }, 2000);
        };

        return (
            <>
                {/* Fullscreen image modal for mobile */}
                {showFullScreenImage && (
                    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
                        <button
                            className="absolute top-4 left-4 bg-white/80 text-black rounded-full px-4 py-2 font-semibold shadow-lg md:hidden"
                            onClick={() => setShowFullScreenImage(false)}
                        >
                            <i className="fas fa-arrow-left mr-2"></i> Retour
                        </button>
                        <img
                            src={activeImage}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ width: '100vw', height: '100vh' }}
                            onClick={() => setShowFullScreenImage(false)}
                        />
                    </div>
                )}
                <div data-name="product-preview" className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Overlay con cierre al hacer clic */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
                    
                    {/* Contenedor principal con centrado y padding responsivo */}
                    <div className="fixed inset-0 z-10 flex items-center justify-center p-2 sm:p-4 md:p-6">
                        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] md:max-h-[90vh]">
                            {/* Grid layout que se convierte en columna en móvil */}
                            <div className="flex flex-col md:grid md:grid-cols-2">
                                {/* Sección de imagen - altura fija en móvil, auto en desktop */}
                                <div className="relative bg-gray-50 h-[40vh] md:h-auto">
                                    <button 
                                        onClick={onClose}
                                        className="absolute top-4 right-4 z-10 bg-white/90 p-2 rounded-full text-gray-800 hover:bg-white shadow-md transition-all"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    {/* Solo la imagen principal, sin miniaturas */}
                                    <img 
                                        src={activeImage} 
                                        alt={product.name}
                                        className="w-full h-[40vh] md:h-[520px] md:max-h-[520px] object-contain p-2 md:p-4 mx-auto cursor-pointer"
                                        onClick={() => {
                                            // Solo activar fullscreen en mobile (md:hidden)
                                            if (window.innerWidth < 768) setShowFullScreenImage(true);
                                        }}
                                    />
                                    {/* Botón de favorito o editar según admin */}
                                    {isAdmin ? (
                                        <>
                                            
                                            
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => setIsFavorite(!isFavorite)}
                                            className="absolute top-4 left-4 z-10 bg-white/90 p-2 rounded-full text-gray-800 hover:bg-white shadow-md transition-all"
                                        >
                                            <i className={`fas fa-heart ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}></i>
                                        </button>
                                    )}
                                    
                                    {product.isNew && (
                                        <span className="absolute top-16 left-4 bg-black text-white px-3 py-1 rounded-full text-sm font-medium">
                                            NUEVO
                                        </span>
                                    )}
                                    
                                    {product.discount && (
                                        <span className="absolute top-4 right-16 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                            {product.discount}% OFF
                                        </span>
                                    )}
                                    
                                    {/* Eliminadas las miniaturas View1, View2, View3 */}
                                </div>
                                
                                {/* Sección de detalles del producto - con scrolling interno */}
                                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[55vh] md:max-h-[90vh]">
                                    {/* Breadcrumb - Opcional */}
                                    {product.category && (
                                        <div className="text-sm text-blue-600 mb-2 font-medium">
                                            <span>{product.category}</span>
                                        </div>
                                    )}
                                    
                                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{product.name}</h2>
                                    
                                    {/* Calificación */}
                                    <div className="flex items-center mb-4">
                                        <div className="flex text-yellow-400 mr-2">
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star"></i>
                                            <i className="fas fa-star-half-alt"></i>
                                        </div>
                                        <span className="text-gray-500 text-sm">(128 avis)</span>
                                    </div>
                                    
                                    <p className="text-gray-600 mb-6 text-base sm:text-lg leading-relaxed">{product.description}</p>
                                    
                                    {/* Precios y selector de cantidad */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">MAD{displayPrice}</span>
                                            {product.originalPrice && (
                                                <span className="text-gray-500 line-through text-sm">MAD{product.originalPrice}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center">
                                            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                                <button 
                                                    onClick={decrementQuantity}
                                                    className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                                                    aria-label="Disminuir cantidad"
                                                >
                                                    <i className="fas fa-minus"></i>
                                                </button>
                                                <span className="px-4 sm:px-6 py-2 border-x border-gray-300 font-medium">{quantity}</span>
                                                <button 
                                                    onClick={incrementQuantity}
                                                    className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                                                    aria-label="Aumentar cantidad"
                                                >
                                                    <i className="fas fa-plus"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Selector de concentración SOLO si no es products3 */}
                                    {product.tableName !== 'products3' && (
                                        <div className="mb-6">
                                            <label className="block font-semibold mb-2">Concentration</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {availableStrengths.map(strength => (
                                                    <button
                                                        key={strength}
                                                        type="button"
                                                        className={`px-4 py-2 rounded-full border font-medium transition-colors ${
                                                            selectedStrength === strength
                                                                ? 'bg-black text-white border-black'
                                                                : 'bg-white text-black border-gray-300 hover:bg-gray-100'
                                                        }`}
                                                        onClick={() => setSelectedStrength(strength)}
                                                    >
                                                        {strength}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Botón de añadir al carrito */}
                                    <button 
                                        onClick={handleAddToCart}
                                        disabled={addingToCart}
                                        className="w-full bg-black text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-gray-800 transition-all mb-6 flex items-center justify-center font-medium text-base sm:text-lg shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {addingToCart ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Ajout au panier...
                                            </>
                                        ) : addedToCart ? (
                                            <>
                                                <i className="fas fa-check mr-2"></i>
                                                Ajouté au panier!
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-shopping-cart mr-2"></i>
                                                Ajouter au panier
                                            </>
                                        )}
                                    </button>
                                    
                                    <div className="space-y-6">
                                        {/* Características principales - Grid adaptable */}
                                        {product.features && product.features.length > 0 && (
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Características principales</h3>
                                                <ul className="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {product.features?.map((feature, index) => (
                                                        <li key={index} className="flex items-start">
                                                            <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                                                            <span className="text-gray-600 text-sm sm:text-base">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {/* Envío y devoluciones - Grid adaptable */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="bg-gray-50 p-3 rounded-xl">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Expédition</h3>
                                                <div className="flex items-center text-gray-600 text-sm sm:text-base">
                                                    <i className="fas fa-truck text-blue-600 mr-2"></i>
                                                    <span>Arrive dans 24 heures</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Retours</h3>
                                                <div className="flex items-center text-gray-600 text-sm sm:text-base">
                                                    <i className="fas fa-undo text-blue-600 mr-2"></i>
                                                    <span>1 jours pour les retours</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    } catch (error) {
        console.error('ProductPreview component error:', error);
        reportError(error);
        return null;
    }
}

export default ProductPreview;