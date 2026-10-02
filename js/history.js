import { getOrder } from './lib/data.js';
import { renderHeader, renderBottomNav } from './components/UI.js';
import { cartStore } from './store/cartStore.js';

async function fetchMyOrders() {
    const myOrderIds = JSON.parse(localStorage.getItem('myOrders') || '[]');
    if (myOrderIds.length === 0) return [];
    
    // Fetch all in parallel
    const promises = myOrderIds.map(id => getOrder(id).catch(() => null));
    const orders = await Promise.all(promises);
    
    // Filter out nulls (deleted/invalid orders) and sort by newest first
    return orders.filter(o => o !== null).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getStatusStyle(status) {
    switch(status) {
        case 'received': return 'bg-blue-100 text-blue-700';
        case 'preparing': return 'bg-yellow-100 text-yellow-700';
        case 'out_for_delivery': return 'bg-purple-100 text-purple-700';
        case 'delivered': return 'bg-green-100 text-green-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

async function renderPage() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        ${renderHeader('history')}
        <div class="max-w-4xl mx-auto px-4 py-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-6">My Past Orders</h1>
            <div id="orders-container" class="space-y-4">
                <div class="animate-pulse text-center py-10">Loading orders...</div>
            </div>
        </div>
        ${renderBottomNav('history')}
    `;

    cartStore.notify(); // Initialize cart badge

    const container = document.getElementById('orders-container');
    const orders = await fetchMyOrders();

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-2">No past orders</h2>
                <p class="text-gray-500 mb-6 text-sm">You haven't placed any orders yet.</p>
                <a href="index.html" class="inline-block brand-bg text-white font-medium px-6 py-2.5 rounded-full btn-hover shadow-sm">Start Shopping</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <a href="order.html?id=${order.id}" class="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Order #${order.id}</span>
                    <p class="text-sm text-gray-600 mt-1">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div class="flex flex-col items-end gap-1 text-right">
                    <span class="text-xs font-bold px-3 py-1 rounded-full ${getStatusStyle(order.status)}">
                        ${order.status === 'received' ? 'ORDERED' : order.status.replace('_', ' ').toUpperCase()}
                    </span>
                    ${order.rejection_reason ? `<span class="text-xs text-red-500 font-medium">Reason: ${order.rejection_reason}</span>` : ''}
                </div>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                <span class="text-gray-600 text-sm">${order.items.length} item(s)</span>
                <span class="font-bold text-gray-900">₹${order.total_amount}</span>
            </div>
        </a>
    `).join('');
}

document.addEventListener('DOMContentLoaded', renderPage);
