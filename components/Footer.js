function Footer() {
    try {
        return (
            <footer id="contact" data-name="footer" className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div data-name="footer-about" className="space-y-4">
                            <h3 className="text-xl font-semibold mb-4">À propos de nous</h3>
                            <p className="text-gray-400 leading-relaxed">
                            Discover our exclusive selection of e-liquids, designed to offer you an unforgettable vaping experience. Take advantage of our special offers and enjoy irresistible flavors.
                            </p>
                            
                        </div>
                        <div data-name="footer-links">
                            <h3 className="text-xl font-semibold mb-4">Liens rapides</h3>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Maison</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Produits</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">À propos</a></li>
                                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div data-name="footer-contact" className="space-y-4">
                            <h3 className="text-xl font-semibold mb-4">Contact</h3>
                            <div className="space-y-3 text-gray-400">
                                <p className="flex items-center">
                                    <i className="fas fa-envelope mr-3"></i>
                                    info@OrioVape.com
                                </p>
                                <p className="flex items-center">
                                <li>
                                <a href="https://wa.me/212673594906" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                                    <i className="fas fa-phone mr-2"></i> +212 673-594906
                                </a>
                            </li>
                                </p>
                                <p className="flex items-center">
                                    <i className="fas fa-map-marker-alt mr-3"></i>
                                    123 Store Street, City
                                </p>
                                
                            </div>
                        </div>
                        <div>
                        <h4 data-name="social-media" className="text-xl font-semibold mb-4">Suivez-nous</h4>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-facebook"></i></a>
                            <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-twitter"></i></a>
                            <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-instagram"></i></a>
                            <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-linkedin"></i></a>
                        </div>
                    </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 OrioVape. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        );
    } catch (error) {
        console.error('Footer component error:', error);
        reportError(error);
        return null;
    }
}
