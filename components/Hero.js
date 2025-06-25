function Hero({ isAdmin }) {
    try {
        // Slides iniciales para mostrar instantáneamente (puedes personalizar)
        const initialSlides = [
            {
                id: 1,
                title: "Bienvenue chez OrioVape",
                description: "Découvrez nos e-liquides exclusifs et profitez d'une expérience de vape inoubliable.",
                image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
            },
            {
                id: 2,
                title: "Offres Spéciales",
                description: "Profitez de nos offres spéciales sur une sélection irrésistible de saveurs.",
                image_url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80"
            }
        ];
        const [slides, setSlides] = React.useState(initialSlides);
        const [currentSlide, setCurrentSlide] = React.useState(0);
        const [loading, setLoading] = React.useState(true);
        const [showModal, setShowModal] = React.useState(false);
        const [editingSlide, setEditingSlide] = React.useState(null);
        const [form, setForm] = React.useState({ title: '', description: '', image: null, imageUrl: '' });
        const [uploading, setUploading] = React.useState(false);
        const fileInputRef = React.useRef(null);

        // Cargar slides desde Supabase
        React.useEffect(() => {
            let mounted = true;
            async function fetchSlides() {
                setLoading(true);
                const { data, error } = await supabase
                    .from('publicites')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(5);
                if (!error && mounted && data && data.length > 0) {
                    setSlides(data);
                }
                setLoading(false);
            }
            fetchSlides();
            return () => { mounted = false; };
        }, []);

        // Auto-slide
        React.useEffect(() => {
            if (slides.length === 0) return;
            const timer = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % slides.length);
            }, 5000);
            return () => clearInterval(timer);
        }, [slides]);

        const goToSlide = (index) => setCurrentSlide(index);
        const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
        const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

        // Modal handlers
        const openAddModal = () => {
            setEditingSlide(null);
            setForm({ title: '', description: '', image: null, imageUrl: '' });
            setShowModal(true);
        };
        const openEditModal = (slide) => {
            setEditingSlide(slide);
            setForm({ title: slide.title, description: slide.description, image: null, imageUrl: slide.image_url });
            setShowModal(true);
        };
        const closeModal = () => {
            setShowModal(false);
            setForm({ title: '', description: '', image: null, imageUrl: '' });
            setEditingSlide(null);
        };

        // Form handlers
        const handleFormChange = (e) => {
            const { name, value } = e.target;
            setForm(prev => ({ ...prev, [name]: value }));
        };
        const handleFileChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setForm(prev => ({ ...prev, image: file, imageUrl: URL.createObjectURL(file) }));
            }
        };

        // Guardar slide (add o edit)
        const handleSave = async (e) => {
            e.preventDefault();
            setUploading(true);
            let imageUrl = form.imageUrl;
            try {
                // Si hay nueva imagen, subirla
                if (form.image) {
                    const ext = form.image.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                    const { error: uploadError } = await supabase
                        .storage
                        .from('publicites')
                        .upload(fileName, form.image, { upsert: true });
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('publicites')
                        .getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
                if (editingSlide) {
                    // Editar
                    const { error } = await supabase
                        .from('publicites')
                        .update({
                            title: form.title,
                            description: form.description,
                            image_url: imageUrl
                        })
                        .eq('id', editingSlide.id);
                    if (error) throw error;
                } else {
                    // Agregar
                    if (slides.length >= 5) throw new Error('Maximum 5 slides allowed');
                    const { error } = await supabase
                        .from('publicites')
                        .insert([{
                            title: form.title,
                            description: form.description,
                            image_url: imageUrl
                        }]);
                    if (error) throw error;
                }
                // Refrescar slides
                const { data } = await supabase
                    .from('publicites')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(5);
                setSlides(data || []);
                closeModal();
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                setUploading(false);
            }
        };

        // Eliminar slide
        const handleDelete = async (slide) => {
            if (!window.confirm('Delete this slide?')) return;
            await supabase.from('publicites').delete().eq('id', slide.id);
            const { data } = await supabase
                .from('publicites')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(5);
            setSlides(data || []);
            setShowModal(false);
        };

        return (
            <section data-name="hero" className="hero-section mt-10 relative w-full">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="relative h-96 md:h-[380px] w-full rounded-lg overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <i className="fas fa-spinner fa-spin text-2xl text-gray-600"></i>
                            </div>
                        ) : slides.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                No slides yet.
                            </div>
                        ) : slides.map((slide, index) => (
                            <div 
                                key={slide.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                            >
                                <img 
                                    src={slide.image_url}
                                    alt={slide.title}
                                    className="w-full h-full object-cover object-center"
                                    loading={index === 0 ? "eager" : "lazy"}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                <div className="absolute top-1/2 transform -translate-y-1/2 left-[6%] right-0 p-6 text-white">
                                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                                        {slide.title}
                                    </h1>
                                    <p className="text-base mb-6 max-w-xl">
                                        {slide.description}
                                    </p>
                                    <button 
                                        onClick={() => {
                                            const productsSection = document.getElementById('products');
                                            if (productsSection) {
                                                const navbarHeight = 64;
                                                const elementPosition = productsSection.getBoundingClientRect().top;
                                                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
                                                window.scrollTo({
                                                    top: offsetPosition,
                                                    behavior: 'smooth'
                                                });
                                            }
                                        }}
                                        className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Shop Now
                                    </button>
                                </div>
                            </div>
                        ))}
                        {/* Flechas de navegación */}
                        <button 
                            onClick={prevSlide}
                            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-20"
                            aria-label="Previous Slide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
                            </svg>
                        </button>
                        <button 
                            onClick={nextSlide}
                            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-20"
                            aria-label="Next Slide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                            </svg>
                        </button>
                        {/* Slide indicators */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    className={`w-3 h-3 rounded-full ${currentSlide === index ? 'bg-white' : 'bg-gray-400/60'}`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                    {/* Botones admin al final del hero-section */}
                    {isAdmin && (
                        <div className="flex flex-row gap-2 justify-start mt-6">
                            <button
                                onClick={openAddModal}
                                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-xs sm:text-base w-max"
                                style={{boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}
                                disabled={slides.length >= 5}
                            >
                                + Ajouter une publicité
                            </button>
                            {slides.length > 0 && (
                                <button
                                    onClick={() => openEditModal(slides[currentSlide])}
                                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-xs sm:text-base w-max"
                                >
                                    Modifier
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {/* Modal para agregar/editar */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 w-[95vw] max-w-xs sm:max-w-md relative mx-2">
                            <button
                                onClick={closeModal}
                                className="absolute top-2 right-2 text-gray-500 hover:text-black"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold mb-4">{editingSlide ? 'Modifier la diapositive' : 'Ajouter une diapositive'}</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Image</label>
                                    <div
                                        className="mb-2 flex flex-col items-center justify-center w-40 h-40 border rounded-lg bg-gray-50 cursor-pointer mx-auto"
                                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                        tabIndex={0}
                                        style={{outline: 'none'}}
                                    >
                                        {form.imageUrl ? (
                                            <img
                                                src={form.imageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            <>
                                                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                                                <span className="text-xs text-gray-400">Upload image</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Titre</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={form.title}
                                        onChange={handleFormChange}
                                        className="w-full border px-3 py-2 rounded text-sm"
                                        required
                                        disabled={uploading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                        className="w-full border px-3 py-2 rounded text-base"
                                        required
                                        disabled={uploading}
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        type="submit"
                                        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 text-xs sm:text-base"
                                        disabled={uploading}
                                    >
                                        {uploading ? 'Saving...' : 'Save'}
                                    </button>
                                    {editingSlide && (
                                        <button
                                            type="button"
                                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-400 text-xs sm:text-base"
                                            onClick={() => handleDelete(editingSlide)}
                                            disabled={uploading}
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </section>
        );
    } catch (error) {
        console.error('Hero component error:', error);
        reportError(error);
        return null;
    }
}