export function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span> ${message}`;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function renderHeader(activePage = 'home') {
    return `
    <header class="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="index.html" class="flex items-center gap-2">
                <img src="images/logo.png" alt="Anyone Anytime" class="h-10 w-10 object-contain rounded-full shadow-sm" onerror="this.src='https://via.placeholder.com/40x40?text=Logo'">
                <span class="font-bold text-lg brand-text hidden sm:block">Anyone Anytime</span>
            </a>
            
            <div class="flex-1 max-w-md mx-4 hidden sm:block">
                ${activePage === 'home' ? `
                <div class="relative">
                    <input type="text" id="desktop-search" placeholder="Search snacks..." class="w-full bg-gray-100 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm">
                    <svg class="w-4 h-4 text-gray-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                ` : ''}
            </div>

            <div class="flex items-center gap-6">
                <a href="history.html" class="hidden sm:flex text-sm font-medium ${activePage === 'history' ? 'brand-text' : 'text-gray-600 hover:text-gray-900'} transition-colors">
                    My Orders
                </a>
                <a href="cart.html" class="relative p-2 text-gray-700 hover:text-[#800000] transition-colors btn-hover">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span id="cart-count-badge" class="absolute top-0 right-0 bg-[#800000] text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center" style="display:none;">0</span>
                </a>
            </div>
        </div>
    </header>
    `;
}

export function renderBottomNav(activePage = 'home') {
    return `
    <nav class="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
        <div class="flex justify-around items-center h-16">
            <a href="index.html" class="flex flex-col items-center justify-center w-full h-full text-xs font-medium ${activePage === 'home' ? 'brand-text' : 'text-gray-500'}">
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                Shop
            </a>
            <a href="history.html" class="flex flex-col items-center justify-center w-full h-full text-xs font-medium ${activePage === 'history' ? 'brand-text' : 'text-gray-500'}">
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                Orders
            </a>
            <a href="cart.html" class="flex flex-col items-center justify-center w-full h-full text-xs font-medium ${activePage === 'cart' ? 'brand-text' : 'text-gray-500'} relative">
                <div class="relative">
                    <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                Cart
            </a>
        </div>
    </nav>
    `;
}
