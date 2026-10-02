class CartStore {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart') || '[]');
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.listeners.forEach(l => l(this.items));
        
        // Update global cart counter if it exists
        const count = this.getTotalCount();
        const badge = document.getElementById('cart-count-badge');
        if (badge) {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    addItem(product, quantity = 1) {
        if (!product || !product.available || product.stock_quantity <= 0) return false;

        const existingItem = this.items.find(item => item.product_id === product.id);
        
        // Check stock limit for existing items too (basic check)
        const currentQty = existingItem ? existingItem.quantity : 0;
        if (currentQty + quantity > product.stock_quantity) return false;

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                product_id: product.id,
                name: product.name,
                image: product.image,
                price: product.price,
                quantity: quantity
            });
        }
        this.notify();
        return true;
    }

    removeItem(productId) {
        this.items = this.items.filter(item => String(item.product_id) !== String(productId));
        this.notify();
    }

    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }
        const item = this.items.find(item => item.product_id === productId);
        if (item) {
            item.quantity = quantity;
            this.notify();
        }
    }

    clearCart() {
        this.items = [];
        this.notify();
    }

    getTotalCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
}

export const cartStore = new CartStore();
