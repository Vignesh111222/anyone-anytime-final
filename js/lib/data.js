import { API_BASE } from '../config.js';

export const categories = [
    'All', 'Chips', 'Biscuits', 'Chocolates', 'Drinks', 'Instant Food', 'Other Snacks'
];

export async function fetchProducts() {
    const res = await fetch(`${API_BASE}/api/products`);
    return await res.json();
}

export async function getProduct(id) {
    const products = await fetchProducts();
    return products.find(p => p.id === id);
}

export async function saveOrder(orderData) {
    const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order');
    return data;
}

export async function getOrder(id) {
    const res = await fetch(`${API_BASE}/api/orders/${id}`);
    if (res.status === 404) return null;
    return await res.json();
}
