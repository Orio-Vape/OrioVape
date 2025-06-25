function addToCart(items, product) {
    const existingItem = items.find(item => item.id === product.id);
    // Asegura que la imagen esté siempre presente en el producto del carrito
    const image = product.image_url || product.image || '/placeholder.png';
    if (existingItem) {
        return items.map(item =>
            item.id === product.id
                ? { ...item, quantity: item.quantity + 1, image }
                : item
        );
    }
    return [...items, { ...product, image, quantity: 1 }];
}

function updateQuantity(items, productId, quantity) {
    if (quantity < 1) {
        return removeFromCart(items, productId);
    }
    return items.map(item =>
        item.id === productId
            ? { ...item, quantity }
            : item
    );
}

function removeFromCart(items, productId) {
    return items.filter(item => item.id !== productId);
}
