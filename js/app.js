import { fetchProducts, categories } from './lib/data.js';
import { cartStore } from './store/cartStore.js';
import { renderHeader, renderBottomNav, showToast } from './components/UI.js';

let currentCategory = 'All';
let searchQuery = '';
let products = [];

function renderHero() {
    return `
        <div class="brand-bg text-white py-8 px-4 text-center rounded-b-3xl shadow-md sm:rounded-none sm:py-12">
            <h1 class="text-2xl sm:text-4xl font-bold mb-2">Snacks delivered to your room.</h1>
            <p class="text-sm sm:text-base opacity-90 max-w-lg mx-auto">Order your favourite snacks without the WhatsApp confusion.</p>
            
            <div class="mt-6 max-w-md mx-auto relative sm:hidden">
                <input type="text" id="mobile-search" placeholder="Search snacks..." class="w-full bg-white text-gray-800 rounded-full py-3 px-5 pl-12 focus:outline-none shadow-sm text-sm">
                <svg class="w-5 h-5 text-gray-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
        </div>
    `;
}

function renderCategories() {
    return `
        <div class="py-4 px-4 sticky top-16 bg-[#faf8f5] z-30 shadow-sm border-b border-gray-100/50">
            <div class="flex overflow-x-auto gap-2 hide-scrollbar max-w-6xl mx-auto">
                ${categories.map(cat => `
                    <button class="category-btn whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${currentCategory === cat ? 'brand-bg text-white' : 'bg-white text-gray-600 border border-gray-200'}" data-cat="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderProductCard(product) {
    const isOutOfStock = !product.available || product.stock_quantity <= 0;
    const stock = product.stock_quantity;
    const isLowStock = !isOutOfStock && stock <= 5;
    const cartItem = cartStore.items.find(i => i.product_id === product.id);
    
    return `
        <div class="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col card-hover">
            <div class="h-32 sm:h-48 overflow-hidden bg-gray-50 relative">
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy">
                ${isOutOfStock ? `
                    <div class="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span class="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Out of Stock</span>
                    </div>
                ` : isLowStock ? `
                    <div class="absolute top-2 right-2">
                        <span class="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Only ${stock} left!</span>
                    </div>
                ` : ''}
            </div>
            <div class="p-3 sm:p-4 flex flex-col flex-1">
                <h3 class="font-semibold text-gray-800 text-sm sm:text-base leading-tight">${product.name}</h3>
                <p class="text-xs text-gray-500 mt-1 line-clamp-1">${product.description}</p>
                <div class="mt-1 flex items-center gap-1">
                    ${isOutOfStock 
                        ? `<span class="text-xs text-red-500 font-medium">Out of stock</span>`
                        : `<span class="text-xs ${isLowStock ? 'text-orange-500' : 'text-green-600'} font-medium">${stock} in stock</span>`
                    }
                </div>
                <div class="mt-auto pt-3 flex items-center justify-between">
                    <span class="font-bold text-gray-900 text-sm sm:text-base">₹${product.price}</span>
                    ${cartItem ? `
                        <div class="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                            <button class="cart-minus-btn px-3 py-1.5 text-[#800000] hover:bg-gray-200 transition-colors" data-id="${product.id}" data-qty="${cartItem.quantity}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                            </button>
                            <span class="px-2 font-bold text-sm min-w-[1.5rem] text-center">${cartItem.quantity}</span>
                            <button class="cart-plus-btn px-3 py-1.5 text-[#800000] hover:bg-gray-200 transition-colors" data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}' ${cartItem.quantity >= stock ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                        </div>
                    ` : `
                        <button class="add-to-cart-btn w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-1.5 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'brand-bg text-white btn-hover shadow-sm'}" data-id="${product.id}" data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}' ${isOutOfStock ? 'disabled' : ''}>
                            <span class="hidden sm:inline">Add</span>
                            <svg class="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderProductGrid() {
    let filtered = products;
    if (currentCategory !== 'All') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
        return `
            <div class="py-12 text-center px-4 max-w-6xl mx-auto">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 inline-block">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 class="text-lg font-medium text-gray-900">No snacks found.</h3>
                    <p class="text-sm text-gray-500 mt-1">Try another search or category.</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="p-4 max-w-6xl mx-auto">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                ${filtered.map(renderProductCard).join('')}
            </div>
        </div>
    `;
}

async function renderPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHeader('home')}
        ${renderHero()}
        ${renderCategories()}
        <div id="product-grid-container" class="min-h-[200px] flex items-center justify-center">
            <div class="animate-pulse flex flex-col items-center">
                <div class="w-10 h-10 border-4 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-4 text-gray-500 text-sm">Loading snacks...</p>
            </div>
        </div>
        ${renderBottomNav('home')}
    `;
    
    // Fetch real data
    const loadData = async () => {
        try {
            products = await fetchProducts();
            updateGrid();
        } catch (err) {
            document.getElementById('product-grid-container').innerHTML = '<p class="text-center text-red-500 py-10">Failed to load snacks.</p>';
        }
    };
    
    await loadData();
    
    // Poll every 5 seconds to keep stock and availability in sync
    setInterval(async () => {
        try {
            products = await fetchProducts();
            updateGrid();
        } catch(e) {}
    }, 5000);
    
    attachEvents();
    cartStore.notify(); // Initialize cart badge
}

function attachEvents() {
    // Categories
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentCategory = e.target.dataset.cat;
            updateGrid();
            renderCategoriesBar(); // Update active state visually
        });
    });

    // Search Desktop & Mobile
    const desktopSearch = document.getElementById('desktop-search');
    const mobileSearch = document.getElementById('mobile-search');
    const handleSearch = (e) => {
        searchQuery = e.target.value;
        if(desktopSearch && e.target !== desktopSearch) desktopSearch.value = searchQuery;
        if(mobileSearch && e.target !== mobileSearch) mobileSearch.value = searchQuery;
        updateGrid();
    };
    if (desktopSearch) desktopSearch.addEventListener('input', handleSearch);
    if (mobileSearch) mobileSearch.addEventListener('input', handleSearch);
}

function attachCartEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const product = JSON.parse(e.currentTarget.dataset.product);
            if (cartStore.addItem(product, 1)) {
                showToast('Added to cart');
                updateGrid();
            }
        });
    });

    document.querySelectorAll('.cart-plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const product = JSON.parse(e.currentTarget.dataset.product);
            if (cartStore.addItem(product, 1)) {
                updateGrid();
            } else {
                showToast('Maximum stock reached');
            }
        });
    });

    document.querySelectorAll('.cart-minus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const currentQty = parseInt(e.currentTarget.dataset.qty, 10);
            cartStore.updateQuantity(id, currentQty - 1);
            updateGrid();
        });
    });
}

function updateGrid() {
    const container = document.getElementById('product-grid-container');
    if(container) {
        container.innerHTML = renderProductGrid();
        attachCartEvents();
    }
}

function renderCategoriesBar() {
    const container = document.querySelector('.sticky.top-16');
    if (container) {
        container.outerHTML = renderCategories();
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentCategory = e.target.dataset.cat;
                updateGrid();
                renderCategoriesBar();
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', renderPage);
