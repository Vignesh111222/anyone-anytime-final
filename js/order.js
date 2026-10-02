import { getOrder, fetchProducts } from './lib/data.js';
import { API_BASE } from './config.js';
import { renderHeader, renderBottomNav } from './components/UI.js';
import { cartStore } from './store/cartStore.js';

const statuses = [
    { key: 'received', label: 'Ordered' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
];

function getStatusIndex(status) {
    if (status === 'cancelled') return -1;
    return statuses.findIndex(s => s.key === status);
}

function renderTimeline(order) {
    if (order.status === 'cancelled') {
        return `
            <div class="bg-red-50 text-red-600 p-4 rounded-xl flex flex-col items-center justify-center gap-2 mb-8 text-center">
                <div class="flex items-center gap-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span class="font-bold">Order Cancelled</span>
                </div>
                ${order.rejection_reason ? `<p class="text-sm font-medium mt-1">Reason: ${order.rejection_reason}</p>` : ''}
            </div>
        `;
    }

    const currentIndex = getStatusIndex(order.status);
    
    let html = '<div class="pl-4 sm:pl-8 py-2 mb-8" id="timeline-container">';
    
    statuses.forEach((status, index) => {
        const isPast = index < currentIndex;
        const isActive = index === currentIndex;
        const isLast = index === statuses.length - 1;
        
        html += `
            <div class="relative flex items-start mb-8 last:mb-0">
                ${!isLast ? `<div class="timeline-line ${isPast || isActive ? 'active' : ''}"></div>` : ''}
                <div class="timeline-dot ${isPast || isActive ? 'active' : ''} mt-1"></div>
                <div class="ml-6">
                    <h3 class="text-sm font-bold ${isActive ? 'brand-text' : (isPast ? 'text-gray-900' : 'text-gray-400')}">${status.label}</h3>
                    ${isActive ? `<p class="text-xs text-gray-500 mt-1">${getStatusDescription(status.key)}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function getStatusDescription(status) {
    switch(status) {
        case 'received': return 'We have received your order and are verifying it.';
        case 'preparing': return 'Your snacks are being packed.';
        case 'out_for_delivery': return 'Your order is on the way to your room.';
        case 'delivered': return 'Enjoy your snacks!';
        default: return '';
    }
}

async function renderPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const app = document.getElementById('app');

    if (!orderId) {
        app.innerHTML = `
            ${renderHeader()}
            <div class="text-center py-20 px-4">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                <a href="index.html" class="inline-block brand-bg text-white font-medium px-6 py-2.5 rounded-full btn-hover">Go Home</a>
            </div>
            ${renderBottomNav()}
        `;
        return;
    }

    app.innerHTML = `
        ${renderHeader()}
        <div id="order-content" class="max-w-2xl mx-auto px-4 py-8">
            <div class="animate-pulse text-center py-10">Loading order...</div>
        </div>
        ${renderBottomNav()}
    `;

    try {
        let order = await getOrder(orderId);
        if (!order) throw new Error('Not found');

        // Fetch product names once
        const productsList = await fetchProducts();
        const getProductName = (id) => {
            const p = productsList.find(x => x.id === id);
            return p ? p.name : 'Unknown Item';
        };

        const updateUI = (currentOrder) => {
            const container = document.getElementById('order-content');
            if(!container) return;

            const itemsHtml = currentOrder.items.map(item => `
                <div class="flex justify-between items-center">
                    <span class="text-gray-700 font-medium">${getProductName(item.product_id)} <span class="text-gray-400">× ${item.quantity}</span></span>
                    <span class="font-medium text-gray-900">₹${item.price * item.quantity}</span>
                </div>
            `).join('');
            
            container.innerHTML = `
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900">Order Placed!</h1>
                    <p class="text-gray-500 mt-1">Your snacks are on the way to Room <span class="font-bold text-gray-900">${currentOrder.room_number}</span></p>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Order Number</p>
                            <p class="font-bold text-gray-900 mt-1">#${currentOrder.id}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Total Amount</p>
                            <p class="font-bold brand-text mt-1 text-lg">₹${currentOrder.total_amount}</p>
                        </div>
                    </div>

                    <h2 class="font-bold text-gray-900 mb-4">Track Order</h2>
                    <div id="timeline-wrapper">
                        ${renderTimeline(currentOrder)}
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                    <h2 class="font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">Order Items</h2>
                    <div class="space-y-3 text-sm">
                        ${itemsHtml}
                    </div>
                </div>
                
                <div class="text-center pb-8">
                    <a href="index.html" class="inline-block bg-white text-gray-800 border border-gray-200 font-medium px-8 py-3 rounded-xl shadow-sm btn-hover hover:bg-gray-50 transition-colors">Continue Shopping</a>
                </div>
            `;
        };

        updateUI(order);

        // Polling for real-time updates
        setInterval(async () => {
            try {
                const updatedOrder = await getOrder(orderId);
                if (updatedOrder && updatedOrder.status !== order.status) {
                    order = updatedOrder;
                    // Update the timeline only (not the whole page)
                    const wrapper = document.getElementById('timeline-wrapper');
                    if (wrapper) {
                        wrapper.innerHTML = renderTimeline(order);
                    }
                }
            } catch(e) {}
        }, 3000);

    } catch (err) {
        document.getElementById('order-content').innerHTML = '<div class="text-center text-red-500 py-10">Failed to load order.</div>';
    }

    cartStore.notify(); // Initialize cart badge
}

document.addEventListener('DOMContentLoaded', renderPage);
