import { cartStore } from './store/cartStore.js';
import { saveOrder } from './lib/data.js';
import { renderHeader, renderBottomNav, showToast } from './components/UI.js';

function renderCartItems() {
    const items = cartStore.items;
    
    if (items.length === 0) {
        return `
            <div class="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto">
                <div class="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-2">Your cart is empty.</h2>
                <p class="text-gray-500 mb-6 text-sm">Add some snacks and they'll appear here.</p>
                <a href="index.html" class="inline-block brand-bg text-white font-medium px-6 py-2.5 rounded-full btn-hover shadow-sm">Browse Snacks</a>
            </div>
        `;
    }

    let itemsHtml = items.map(item => {
        return `
            <div class="flex items-center gap-3 sm:gap-4 py-4 border-b border-gray-100 last:border-0 relative">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg bg-gray-50 flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-gray-900 truncate pr-6">${item.name}</h3>
                    <p class="text-sm font-bold text-gray-900 mt-1">₹${item.price}</p>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <button class="remove-btn text-gray-400 hover:text-red-500 p-1 absolute top-3 right-0" data-id="${item.product_id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <div class="flex items-center gap-3 bg-gray-50 rounded-full border border-gray-200 px-2 py-1 mt-4">
                        <button class="qty-btn w-6 h-6 flex items-center justify-center text-gray-600 rounded-full hover:bg-gray-200" data-id="${item.product_id}" data-change="-1">-</button>
                        <span class="text-sm font-medium w-4 text-center">${item.quantity}</span>
                        <button class="qty-btn w-6 h-6 flex items-center justify-center text-gray-600 rounded-full hover:bg-gray-200" data-id="${item.product_id}" data-change="1">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-2 border-b border-gray-100 pb-3">Your Cart</h2>
            ${itemsHtml}
        </div>
    `;
}

function renderCheckoutForm() {
    if (cartStore.items.length === 0) return '';
    
    const subtotal = cartStore.getTotalPrice();

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 sticky top-20">
            <h2 class="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Delivery Details</h2>
            <form id="checkout-form">
                <div class="space-y-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
                        <input type="text" id="cust-name" required placeholder="Enter your full name" class="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition-colors text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Hostel Room Number <span class="text-red-500">*</span></label>
                        <input type="text" id="cust-room" required placeholder="e.g. B-312" class="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition-colors text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number <span class="text-gray-400 text-xs font-normal">(optional)</span></label>
                        <input type="tel" id="cust-phone" placeholder="10-digit number" class="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition-colors text-sm">
                    </div>
                </div>

                <div class="border-t border-gray-100 pt-4 mb-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-3">Order Summary</h2>
                    <div class="space-y-2 text-sm text-gray-600 mb-3">
                        <div class="flex justify-between">
                            <span>Subtotal</span>
                            <span class="font-medium text-gray-900">₹${subtotal}</span>
                        </div>
                        <div class="flex justify-between text-[#800000]">
                            <span>Delivery Fee</span>
                            <span class="font-medium">Free</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-lg font-bold text-gray-900 pt-3 border-t border-gray-100 border-dashed">
                        <span>Total</span>
                        <span>₹${subtotal}</span>
                    </div>
                </div>

                <button type="submit" id="checkout-btn" class="w-full brand-bg text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 btn-hover shadow-md">
                    <span>Place Order - ₹${subtotal}</span>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </form>
        </div>
    `;
}

function renderPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHeader('cart')}
        <div class="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-6 hidden sm:block">Checkout</h1>
            <div class="flex flex-col lg:flex-row gap-6">
                <div class="flex-1">
                    <div id="cart-items-container">
                        ${renderCartItems()}
                    </div>
                </div>
                <div class="lg:w-96" id="checkout-container">
                    ${renderCheckoutForm()}
                </div>
            </div>
        </div>
        ${renderBottomNav('cart')}
    `;
    attachEvents();
    cartStore.notify(); // Initialize cart badge
}

function attachEvents() {
    // Quantity adjustments
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const change = parseInt(e.currentTarget.dataset.change);
            const item = cartStore.items.find(
    i => String(i.product_id) === String(id)
);
            if (item) {
                cartStore.updateQuantity(id, item.quantity + change);
                updatePage();
            }
        });
    });

    // Remove item
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            cartStore.removeItem(id);
            updatePage();
            showToast('Item removed');
        });
    });

    // Checkout form
    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('checkout-btn');
            const name = document.getElementById('cust-name').value;
            const room = document.getElementById('cust-room').value;
            const phone = document.getElementById('cust-phone').value;

            if (!name || !room) {
                showToast('Name and Room Number are required');
                return;
            }

            // Create Order
            const order = {
                customer_name: name,
                room_number: room,
                phone: phone,
                total_amount: cartStore.getTotalPrice(),
                items: cartStore.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price }))
            };

            btn.disabled = true;
            btn.innerHTML = 'Processing...';

            try {
                const result = await saveOrder(order);
                cartStore.clearCart();
                
                // Save order ID to localStorage for history
                const myOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
                myOrders.push(result.id);
                localStorage.setItem('myOrders', JSON.stringify(myOrders));
                
                window.location.href = `order.html?id=${result.id}`;
            } catch (err) {
                showToast(err.message || "Couldn't place your order. Please try again.");
                btn.disabled = false;
                btn.innerHTML = `<span>Place Order - ₹${order.total_amount}</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
            }
        });
    }
}

function updatePage() {
    const itemsContainer = document.getElementById('cart-items-container');
    const checkoutContainer = document.getElementById('checkout-container');
    if (itemsContainer && checkoutContainer) {
        itemsContainer.innerHTML = renderCartItems();
        checkoutContainer.innerHTML = renderCheckoutForm();
        attachEvents();
    }
}

// Subscribe to store changes to keep UI sync in case of multi-tab
cartStore.subscribe(() => {
    // only update if not currently typing in form to prevent losing focus
    if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
        updatePage();
    }
});

document.addEventListener('DOMContentLoaded', renderPage);
