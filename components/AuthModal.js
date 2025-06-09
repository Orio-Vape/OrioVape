function AuthModal({ isOpen, onClose }) {
    try {
        const [mode, setMode] = React.useState('signin');
        const [formData, setFormData] = React.useState({
            email: '',
            password: '',
            username: ''
        });
        const [error, setError] = React.useState('');
        const [loading, setLoading] = React.useState(false);

        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);

            try {
                if (mode === 'signup') {
                    const { data, error } = await signUp(
                        formData.email, 
                        formData.password,
                        formData.username
                    );
                    if (error) throw error;
                    window.location.reload(); // Recarga inmediatamente, no muestra modal ni mensajes
                    // onClose(); // No necesario, la recarga lo oculta todo
                } else {
                    const { data, error } = await signIn(
                        formData.email, 
                        formData.password
                    );
                    if (error) throw error;
                    window.location.reload(); // Recarga inmediatamente, no muestra modal ni mensajes
                    // onClose(); // No necesario, la recarga lo oculta todo
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const toggleMode = () => {
            setMode(prev => prev === 'signin' ? 'signup' : 'signin');
            setError('');
        };

        if (!isOpen) return null;

        return (
            <div data-name="auth-modal" className="auth-modal-container">
                <div className="auth-overlay" onClick={onClose}></div>
                <div className="auth-modal">
                    <div className="auth-form bg-white rounded-xl shadow-xl p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {mode === 'signin' ? 'Se connecter' : 'Create Account'}
                            </h2>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom d'utilisateur
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black"
                                        disabled={loading}
                                        placeholder="Choisissez un nom d'utilisateur"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black"
                                    disabled={loading}
                                    placeholder="your.email@gmail.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="form-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black"
                                    disabled={loading}
                                    placeholder="8+ caractères avec lettres et chiffres"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        {mode === 'signin' ? 'Se connecter...' : 'Creating Account...'}
                                    </span>
                                ) : (
                                    mode === 'signin' ? 'Se connecter' : 'Créer un compte'
                                )}
                            </button>
                        </form>

                        <div className="mt-6">
                            <p className="text-center text-gray-600">
                                {mode === 'signin' ? (
                                    <>
                                        Vous n'avez pas de compte ?{' '}
                                        <button 
                                            onClick={toggleMode}
                                            className="text-black font-medium hover:underline"
                                        >
                                            Registre
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{' '}
                                        <button 
                                            onClick={toggleMode}
                                            className="text-black font-medium hover:underline"
                                        >
                                            Se connecter
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                        
                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">
                                        Ou continuez avec
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button className="flex justify-center items-center py-2 px-4 border rounded-lg hover:bg-gray-50">
                                    <i className="fab fa-google text-red-500 mr-2"></i>
                                    Google
                                </button>
                                <button className="flex justify-center items-center py-2 px-4 border rounded-lg hover:bg-gray-50">
                                    <i className="fab fa-facebook text-blue-600 mr-2"></i>
                                    Facebook
                                </button>
                            </div>
                        </div>
                        
                        {mode === 'signin' && (
                            <div className="mt-6 text-center">
                                <button className="text-sm text-gray-600 hover:text-black">
                                    Mot de passe oublié?
                                </button>
                            </div>
                        )}
                        
                        {mode === 'signup' && (
                            <div className="mt-6 text-xs text-gray-500 text-center">
                                By creating an account, you agree to our{' '}
                                <button className="text-black hover:underline">Terms of Service</button>{' '}
                                and{' '}
                                <button className="text-black hover:underline">Privacy Policy</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('AuthModal component error:', error);
        reportError(error);
        return null;
    }
}
