import { fetchProducts } from './lib/data.js';
import { API_BASE } from './config.js';

let currentView = 'orders';
let allOrders = [];
let allProducts = [];

async function fetchData(forceInventoryRender = false) {
    try {
        const [ordersRes, products] = await Promise.all([
            fetch(`${API_BASE}/api/orders`),
            fetchProducts()
        ]);
        allOrders = await ordersRes.json();
        allProducts = products;

        // Don't re-render while modals are open
        const rejectModal = document.getElementById('reject-modal');
        const deleteModal = document.getElementById('delete-modal');
        if (rejectModal && !rejectModal.classList.contains('hidden')) return;
        if (deleteModal && !deleteModal.classList.contains('hidden')) return;

        render(forceInventoryRender);
    } catch(err) {
        console.error(err);
    }
}

function updateOrderStatus(id, status, reason = null) {
    const payload = { status };
    if (reason) payload.reason = reason;
    
    fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    }).then(() => fetchData(false));
}

// Exposed for the modal in seller.html (non-module script cannot call module functions directly)
window._doReject = (id, reason) => {
    updateOrderStatus(id, 'cancelled', reason);
};

function updateProductAvailability(id, available, stock) {
    const p = allProducts.find(x => String(x.id) === String(productId));
    if (!p) return;
    p.available = available;
    p.stock_quantity = stock;
    
    fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(p)
    }).then(() => fetchData());
}

function renderSummary() {
    const today = new Date().toISOString().split('T')[0];
    const newOrders = allOrders.filter(o => o.status === 'received').length;
    const preparing = allOrders.filter(o => o.status === 'preparing').length;
    const outForDelivery = allOrders.filter(o => o.status === 'out_for_delivery').length;
    
    const todayDelivered = allOrders.filter(o => o.created_at.startsWith(today) && o.status === 'delivered');
    const todayRevenue = todayDelivered.reduce((sum, o) => sum + o.total_amount, 0);
    const todayProfit  = todayDelivered.reduce((sum, o) => sum + (o.total_profit || 0), 0);

    const container = document.getElementById('summary-cards');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
            <p class="text-xs text-gray-500 uppercase font-bold mb-1">New Orders</p>
            <p class="text-2xl font-black text-gray-900">${newOrders}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Preparing</p>
            <p class="text-2xl font-black text-gray-900">${preparing}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Out For Delivery</p>
            <p class="text-2xl font-black text-gray-900">${outForDelivery}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Today's Sales</p>
            <p class="text-2xl font-black text-gray-900">₹${todayRevenue}</p>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-600">
            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Today's Profit</p>
            <p class="text-2xl font-black ${todayProfit >= 0 ? 'text-green-600' : 'text-red-600'}">₹${todayProfit}</p>
        </div>
    `;
}

function getProductName(id) {
    const p = allProducts.find(x => String(x.id) === String(id));
    return p ? p.name : 'Unknown';
}

function renderOrdersView() {
    const activeOrders = allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    
    if (activeOrders.length === 0) {
        return `<div class="text-center py-20 text-gray-500">No active orders right now.</div>`;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${activeOrders.map(order => `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <span class="font-bold text-gray-900">Room ${order.room_number}</span>
                            <span class="text-sm text-gray-500 ml-2">(${order.customer_name})</span>
                            <div class="text-sm text-gray-600 mt-1 flex items-center gap-1 font-medium">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                                ${order.phone || 'N/A'}
                            </div>
                        </div>
                        <span class="text-xs font-bold px-2 py-1 rounded-full ${getStatusStyle(order.status)}">${order.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="p-4">
                        <p class="text-xs text-gray-500 mb-3">${new Date(order.created_at).toLocaleTimeString()}</p>
                        <ul class="space-y-2 mb-4 text-sm">
                            ${order.items.map(i => `
                                <li class="flex justify-between">
                                    <span>${i.quantity}x ${getProductName(i.product_id)}</span>
                                </li>
                            `).join('')}
                        </ul>
                        <div class="border-t border-gray-100 pt-3 flex justify-between items-center mb-4">
                            <span class="font-bold text-gray-900">Total: ₹${order.total_amount}</span>
                        </div>
                        <div class="flex gap-2">
                            ${getActionButtons(order)}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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

function getActionButtons(order) {
    if (order.status === 'received') {
        return `
            <button class="flex-1 bg-[#800000] text-white py-2 rounded font-medium text-sm hover:bg-red-900 transition-colors" onclick="window.updateStatus('${order.id}', 'preparing')">Accept</button>
            <button class="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-medium text-sm hover:bg-red-50 hover:text-red-600 transition-colors" onclick="window.openRejectModal('${order.id}')">Reject</button>
        `;
    } else if (order.status === 'preparing') {
        return `<button class="w-full bg-yellow-500 text-white py-2 rounded font-medium text-sm hover:bg-yellow-600 transition-colors" onclick="window.updateStatus('${order.id}', 'out_for_delivery')">Out for Delivery</button>`;
    } else if (order.status === 'out_for_delivery') {
        return `<button class="w-full bg-green-500 text-white py-2 rounded font-medium text-sm hover:bg-green-600 transition-colors" onclick="window.updateStatus('${order.id}', 'delivered')">Mark Delivered</button>`;
    }
    return '';
}

function renderInventoryView() {
    // Build a card-based layout that's easier to read and works on mobile
    return `
        <div class="mb-6">
            <!-- Add New Product Card -->
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-6">
                <h3 class="font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Add New Product
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <label class="text-xs font-medium text-gray-600 block mb-1">Product Name *</label>
                        <input type="text" id="new-name" placeholder="e.g. Pringles" class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="text-xs font-medium text-gray-600 block mb-1">Cost Price (₹)</label>
                        <input type="number" id="new-cost-price" placeholder="0" class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-[#800000] block mb-1">Selling Price (₹) * <span class="font-normal text-gray-400">(shown to customer)</span></label>
                        <input type="number" id="new-price" placeholder="20" class="w-full border border-[#800000]/30 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]">
                    </div>
                    <div>
                        <label class="text-xs font-medium text-gray-600 block mb-1">Stock Quantity *</label>
                        <input type="number" id="new-stock" placeholder="50" class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="text-xs font-medium text-gray-600 block mb-1">Category</label>
                        <select id="new-category" class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Chips">Chips</option>
                            <option value="Biscuits">Biscuits</option>
                            <option value="Chocolates">Chocolates</option>
                            <option value="Drinks">Drinks</option>
                            <option value="Instant Food">Instant Food</option>
                            <option value="Other Snacks" selected>Other Snacks</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-medium text-gray-600 block mb-1">Product Photo</label>
                        <div class="flex items-center gap-2">
                            <label class="cursor-pointer flex items-center gap-2 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span id="new-image-label">Choose photo</span>
                                <input type="file" id="new-image-file" accept="image/*" class="hidden" onchange="window.previewNewImage(this)">
                            </label>
                            <img id="new-image-preview" src="" alt="" class="hidden w-10 h-10 rounded object-cover border border-gray-200">
                        </div>
                    </div>
                    <div class="flex items-end">
                        <button onclick="window.addNewProduct()" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                            Add Item
                        </button>
                    </div>
                </div>
            </div>

            <!-- Existing Products Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${allProducts.map(p => `
                    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div class="relative h-36 bg-gray-50 group">
                            <img id="preview-${p.id}" src="${p.image || 'https://via.placeholder.com/150'}" 
                                 alt="${p.name}" class="w-full h-full object-cover">
                            <label class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center text-white text-xs font-medium gap-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                Change Photo
                                <input type="file" accept="image/*" class="hidden" onchange="window.changeProductImage('${p.id}', this)">
                            </label>
                            <span class="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${p.available ? 'In Stock' : 'Out'}
                            </span>
                        </div>
                        <div class="p-3 space-y-2">
                            <p class="font-semibold text-sm text-gray-900 truncate">${p.name}</p>
                            <div class="flex gap-2">
                                <div class="flex-1">
                                    <label class="text-[10px] text-gray-500 font-medium">Cost ₹</label>
                                    <input type="number" value="${p.cost_price || 0}" id="cost-${p.id}" placeholder="0" class="w-full border border-gray-200 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                </div>
                                <div class="flex-1">
                                    <label class="text-[10px] text-[#800000] font-bold">Sell ₹</label>
                                    <input type="number" value="${p.price}" id="price-${p.id}" class="w-full border border-[#800000]/30 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#800000]">
                                </div>
                                <div class="flex-1">
                                    <label class="text-[10px] text-gray-500 font-medium">Stock</label>
                                    <input type="number" min="0" value="${p.stock_quantity}" id="stock-${p.id}" 
                                           oninput="window.syncAvailFromStock('${p.id}', this.value)"
                                           class="w-full border border-gray-200 rounded p-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#800000]">
                                </div>
                            </div>
                            <div class="flex gap-2 items-center">
                                <select id="avail-${p.id}" onchange="window.syncSelectStyle('${p.id}')" class="flex-1 border border-gray-200 rounded p-1 text-xs ${p.available ? 'text-green-600' : 'text-red-600'} focus:outline-none">
                                    <option value="true" ${p.available ? 'selected' : ''}>✅ Available</option>
                                    <option value="false" ${!p.available ? 'selected' : ''}>❌ Out of Stock</option>
                                </select>
                            </div>
                            <div class="flex gap-2 pt-1">
                                <button onclick="window.deleteProduct('${p.id}')" class="flex-1 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                    Delete
                                </button>
                                <button onclick="window.saveInventory('${p.id}')" class="flex-1 bg-[#800000] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-900 transition-colors">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}


function renderHistoryView() {
    const pastOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
    
    if (pastOrders.length === 0) {
        return `<div class="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">No order history yet.</div>`;
    }

    // Sort descending (newest first)
    pastOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Group by Date
    const grouped = {};
    pastOrders.forEach(o => {
        const d = new Date(o.created_at);
        // Format: "Mon, Oct 12, 2026"
        const dateKey = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(o);
    });

    let html = '';
    for (const [date, orders] of Object.entries(grouped)) {
        html += `
            <div class="mb-8 last:mb-0">
                <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    ${date}
                </h4>
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[640px]">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase">Order ID</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase">Time</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase">Customer</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase">Room</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase text-right">Sales</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase text-right">Profit</th>
                                    <th class="p-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${orders.map(o => {
                                    const time = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const profit = o.total_profit || 0;
                                    return `
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="p-3 text-sm font-medium text-gray-900">${o.id}</td>
                                        <td class="p-3 text-sm text-gray-500">${time}</td>
                                        <td class="p-3 text-sm text-gray-700">
                                            <div>${o.customer_name}</div>
                                            <div class="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 font-medium">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                                                ${o.phone || 'N/A'}
                                            </div>
                                        </td>
                                        <td class="p-3 text-sm text-gray-700">${o.room_number}</td>
                                        <td class="p-3 text-sm font-bold text-gray-900 text-right">${o.status === 'cancelled' ? '-' : `&#8377;${o.total_amount}`}</td>
                                        <td class="p-3 text-sm font-bold text-right ${o.status === 'cancelled' ? 'text-gray-400' : (profit >= 0 ? 'text-green-600' : 'text-red-500')}">${o.status === 'cancelled' ? '-' : `&#8377;${profit}`}</td>
                                        <td class="p-3 text-center"><span class="text-[10px] font-bold px-2 py-1 rounded-full ${getStatusStyle(o.status)}">${o.status.toUpperCase()}</span></td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                ${(() => {
                                    const delivered = orders.filter(o => o.status === 'delivered');
                                    const dayRevenue = delivered.reduce((s, o) => s + o.total_amount, 0);
                                    const dayProfit  = delivered.reduce((s, o) => s + (o.total_profit || 0), 0);
                                    return `
                                    <tr class="bg-green-50 border-t-2 border-green-200">
                                        <td colspan="4" class="p-3 text-sm font-bold text-gray-700">
                                            Day Total <span class="text-xs font-normal text-gray-500 ml-1">(${delivered.length} delivered)</span>
                                        </td>
                                        <td class="p-3 text-sm font-black text-gray-900 text-right">₹${dayRevenue}</td>
                                        <td class="p-3 text-sm font-black text-right ${dayProfit >= 0 ? 'text-green-600' : 'text-red-500'}">₹${dayProfit}</td>
                                        <td></td>
                                    </tr>
                                    `;
                                })()}
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    return html;
}

function renderSalesReportView() {
    const delivered = allOrders.filter(o => o.status === 'delivered');
    if (delivered.length === 0) {
        return `<div class="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">No sales data available yet.</div>`;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const calcStats = (startDate) => {
        const filtered = delivered.filter(o => new Date(o.created_at) >= startDate);
        const revenue = filtered.reduce((sum, o) => sum + o.total_amount, 0);
        const profit = filtered.reduce((sum, o) => sum + (o.total_profit || 0), 0);
        return { orders: filtered.length, revenue, profit };
    };

    const weekly = calcStats(oneWeekAgo);
    const monthly = calcStats(oneMonthAgo);
    const yearly = calcStats(startOfYear);

    const renderStatCard = (title, stats, icon) => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    ${icon}
                </div>
                <h3 class="font-bold text-gray-800 text-lg">${title}</h3>
            </div>
            <div class="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Orders</p>
                    <p class="font-bold text-xl text-gray-900 mt-1">${stats.orders}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Sales</p>
                    <p class="font-bold text-xl text-gray-900 mt-1">&#8377;${stats.revenue}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Profit</p>
                    <p class="font-bold text-xl ${stats.profit >= 0 ? 'text-green-600' : 'text-red-500'} mt-1">&#8377;${stats.profit}</p>
                </div>
            </div>
        </div>
    `;

    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${renderStatCard('Past 7 Days', weekly, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>')}
            ${renderStatCard('Past 30 Days', monthly, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>')}
            ${renderStatCard('This Year', yearly, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>')}
        </div>
    `;
}

function render(forceInventory = false) {
    renderSummary();
    const container = document.getElementById('view-container');
    const title = document.getElementById('page-title');
    
    if (currentView === 'orders') {
        title.innerText = 'Incoming Orders';
        container.innerHTML = renderOrdersView();
    } else if (currentView === 'inventory') {
        title.innerText = 'Inventory Management';
        // Only redraw inventory if explicitly requested (tab switch or save action)
        // or if it's currently empty (first load).
        if (forceInventory || !container.innerHTML.trim()) {
            container.innerHTML = renderInventoryView();
        }
    } else if (currentView === 'history') {
        title.innerText = 'Order History';
        container.innerHTML = renderHistoryView();
    } else if (currentView === 'sales') {
        title.innerText = 'Sales Report';
        container.innerHTML = renderSalesReportView();
    }
}

// Converts a File object to base64 data URI
function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Global exposure for inline onclick handlers
window.updateStatus = updateOrderStatus;

// Auto-sync availability dropdown when stock changes
window.syncAvailFromStock = (id, stockValue) => {
    const select = document.getElementById(`avail-${id}`);
    if (!select) return;
    const stock = parseInt(stockValue, 10);
    
    if (stock === 0) {
        select.value = "false";
    } else if (stock > 0 && select.value === "false") {
        select.value = "true";
    }
    window.syncSelectStyle(id);
};

// Update dropdown text color based on selection
window.syncSelectStyle = (id) => {
    const select = document.getElementById(`avail-${id}`);
    if (!select) return;
    if (select.value === "true") {
        select.classList.remove('text-red-600');
        select.classList.add('text-green-600');
    } else {
        select.classList.remove('text-green-600');
        select.classList.add('text-red-600');
    }
};

// Preview new product image when file selected
window.previewNewImage = (input) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('new-image-preview');
        const label = document.getElementById('new-image-label');
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        label.textContent = file.name.length > 15 ? file.name.substring(0, 15) + '…' : file.name;
    };
    reader.readAsDataURL(file);
};

// Change photo for an existing product - immediately save to backend
window.changeProductImage = async (productId, input) => {
    const file = input.files[0];
    if (!file) return;
    
    const base64 = await fileToBase64(file);
    
    // Update preview immediately
    const preview = document.getElementById(`preview-${productId}`);
    if (preview) preview.src = base64;
    
    // Save to backend
    const p = allProducts.find(x => x.id === productId);
    if (!p) return;
    p.image = base64;
    
    fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(p)
    }).then(() => fetchData(true));
};

window.saveInventory = (id) => {
    const p = allProducts.find(x => String(x.id) === String(id));;
    if (!p) return;
    
    const stockEl = document.getElementById(`stock-${id}`);
    if (!stockEl.value || isNaN(stockEl.value)) {
        alert("Please enter a valid stock number");
        return;
    }
    
    p.stock_quantity = parseInt(stockEl.value, 10);
    p.available = document.getElementById(`avail-${id}`).value === 'true';
    p.price = parseInt(document.getElementById(`price-${id}`).value, 10) || 0;
    p.cost_price = parseInt(document.getElementById(`cost-${id}`).value, 10) || 0;
    // image is saved separately via changeProductImage
    
    fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(p)
    }).then(() => fetchData(true));
};

// Replaced by window._doDelete which is triggered by the custom modal
window.deleteProduct = (id) => {
    const p = allProducts.find(x => String(x.id) === String(id));
    if (!p) return;

    const confirmed = confirm(`Remove "${p.name}" from the customer panel?`);

    if (!confirmed) return;

    fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE'
    })
    .then(async res => {
        if (res.ok) {
            alert(`${p.name} deleted successfully.`);
            return fetchData(true);
        }

        // Product is probably used in an old order.
        // Keep the product in the database but hide it from customers.
        const updateRes = await fetch(`${API_BASE}/api/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                available: false,
                stock_quantity: 0
            })
        });

        if (!updateRes.ok) {
            throw new Error('Failed to remove product');
        }

        alert(`${p.name} has been removed from the customer panel.`);
        return fetchData(true);
    })
    .catch(err => {
        console.error(err);
        alert(err.message);
    });
};
window.addNewProduct = async () => {
    const name = document.getElementById('new-name').value;
    const price = parseInt(document.getElementById('new-price').value, 10);
    const cost_price = parseInt(document.getElementById('new-cost-price').value, 10) || 0;
    const stock_quantity = parseInt(document.getElementById('new-stock').value, 10);
    const category = document.getElementById('new-category').value;
    const fileInput = document.getElementById('new-image-file');
    
    if (!name || isNaN(price)) {
        alert("Name and Selling Price are required.");
        return;
    }
    
    let imageData = 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(name);
    if (fileInput.files[0]) {
        imageData = await fileToBase64(fileInput.files[0]);
    }
    
    fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            name,
            image: imageData,
            price,
            cost_price,
            stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity,
            category,
            available: !isNaN(stock_quantity) && stock_quantity > 0,
            description: ''
        })
    }).then(() => fetchData(true));
};

// Nav clicks
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset classes
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.className = 'nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100';
        });
        // Set active class
        const target = e.currentTarget;
        target.className = 'nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium brand-bg text-white';
        currentView = target.dataset.target;
        render(true);
    });
});

fetchData(true);
setInterval(() => fetchData(false), 3000); // Poll every 3 seconds for new orders
