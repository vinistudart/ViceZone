const productImages = {
  'PlayStation 5 Slim': 'assets/produtos/playstation-5-slim.webp',
  'EA Sports FC 26': 'assets/produtos/fc26.webp',
  'GeForce RTX 5070': 'assets/produtos/rtx-5070.webp',
  'Nintendo Switch OLED': 'assets/produtos/nintendo-switch-oled.png',
  'The Legend of Zelda': 'assets/produtos/zelda-tears-of-the-kingdom.webp',
  'PlayStation 2 Slim': 'assets/produtos/ps2-fat.webp',
  'Super Nintendo': 'assets/produtos/super-nintendo.webp',
  'Memória RAM 32GB DDR4': 'assets/produtos/memoria-ram-32gb-ddr4.webp',
  'Xbox Series X': 'assets/produtos/xbox-series-x.webp',
  'GTA Vice City': 'assets/produtos/gta-vice-city-ps2.png',
  'SSD NVMe 1TB': 'assets/produtos/ssd-nvme-1tb.webp',
  'Nintendo 64': 'assets/produtos/nintendo-64.png'
};

const productsGrid = document.getElementById('productsGrid');
const catalogMessage = document.getElementById('catalogMessage');
const searchInput = document.getElementById('searchInput');
const searchWrap = document.getElementById('searchWrap');
const searchToggle = document.getElementById('searchToggle');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const categoryCards = [...document.querySelectorAll('[data-category-card]')];
const footerCategoryLinks = [...document.querySelectorAll('[data-footer-category]')];

const openCartButton = document.getElementById('openCart');
const closeCartButton = document.getElementById('closeCart');
const cartSidebar = document.getElementById('cartSidebar');
const overlay = document.getElementById('overlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutButton = document.getElementById('checkoutButton');
const checkoutMessage = document.getElementById('checkoutMessage');
const customerName = document.getElementById('customerName');
const toast = document.getElementById('toast');

let products = [];
let cart = [];
let selectedCategory = 'Todos';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}

async function loadProducts() {
  catalogMessage.classList.add('hidden');
  productsGrid.innerHTML = '<div class="empty-products">Carregando catálogo...</div>';

  try {
    const response = await fetch('/api/produtos', { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error('A rota /api/produtos não retornou JSON. Abra a loja por http://localhost:8080 e não pelo Live Server.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.erro || 'Não foi possível carregar os produtos.');
    }

    // Os dados comerciais continuam vindo da API/PostgreSQL.
    // As imagens são arquivos estáticos entregues pelo Nginx.
    products = data.map((product) => ({
      ...product,
      imagem: productImages[product.nome] || null
    }));
    syncCartWithProducts();
    renderProducts();
    renderCart();
  } catch (error) {
    products = [];
    productsGrid.innerHTML = '<div class="empty-products">Catálogo temporariamente indisponível.</div>';
    catalogMessage.textContent = error.message;
    catalogMessage.classList.remove('hidden');
  }
}

function getFilteredProducts() {
  const term = normalizeText(searchInput.value.trim());

  return products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'Todos' ||
      normalizeText(product.categoria) === normalizeText(selectedCategory);

    const matchesSearch =
      !term ||
      normalizeText(product.nome).includes(term) ||
      normalizeText(product.categoria).includes(term) ||
      normalizeText(product.badge).includes(term);

    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const list = getFilteredProducts();

  if (!list.length) {
    productsGrid.innerHTML = '<div class="empty-products">Nenhum produto encontrado.</div>';
    return;
  }

  productsGrid.innerHTML = list.map((product, index) => {
    const outOfStock = Number(product.estoque) <= 0;
    const oldPrice = product.preco_antigo == null
      ? ''
      : `<del>${money.format(Number(product.preco_antigo))}</del>`;

    return `
      <article class="product-card ${index === 2 ? 'highlight' : ''}">
        <div class="product-media" style="--product-color:${escapeHtml(product.cor || '#12152b')}">
          <span class="product-badge">${escapeHtml(product.badge || 'VICE ZONE')}</span>
          ${product.imagem
            ? `<img class="product-image" src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}" loading="lazy">`
            : `<span class="product-emoji">${escapeHtml(product.emoji || product.icone || '🎮')}</span>`
          }
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHtml(product.categoria)}</span>
          <h3>${escapeHtml(product.nome)}</h3>
          <div class="product-price-row">
            <strong>${money.format(Number(product.preco))}</strong>
            ${oldPrice}
          </div>
          <button
            type="button"
            class="add-cart-button"
            data-add-product="${product.id}"
            ${outOfStock ? 'disabled' : ''}
          >
            ${outOfStock ? 'SEM ESTOQUE' : 'ADICIONAR AO CARRINHO'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function selectCategory(category, scroll = true) {
  selectedCategory = category;

  filterButtons.forEach((button) => {
    button.classList.toggle(
      'active',
      normalizeText(button.dataset.category) === normalizeText(category)
    );
  });

  renderProducts();

  if (scroll) {
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
  }
}

function syncCartWithProducts() {
  cart = cart
    .map((item) => {
      const product = products.find((p) => Number(p.id) === Number(item.produto_id));
      if (!product || Number(product.estoque) <= 0) return null;
      return {
        produto_id: Number(item.produto_id),
        quantidade: Math.min(Number(item.quantidade), Number(product.estoque))
      };
    })
    .filter(Boolean);
}

function addToCart(productId) {
  const product = products.find((item) => Number(item.id) === Number(productId));
  if (!product || Number(product.estoque) <= 0) return;

  const existing = cart.find((item) => Number(item.produto_id) === Number(productId));
  if (existing) {
    if (existing.quantidade >= Number(product.estoque)) {
      showToast('Você já adicionou todo o estoque disponível desse produto.');
      return;
    }
    existing.quantidade += 1;
  } else {
    cart.push({ produto_id: Number(productId), quantidade: 1 });
  }

  renderCart();
  showToast(`${product.nome} adicionado ao carrinho.`);
}

function changeQuantity(productId, amount) {
  const cartItem = cart.find((item) => Number(item.produto_id) === Number(productId));
  const product = products.find((item) => Number(item.id) === Number(productId));
  if (!cartItem || !product) return;

  const nextQuantity = cartItem.quantidade + amount;
  if (nextQuantity <= 0) {
    cart = cart.filter((item) => Number(item.produto_id) !== Number(productId));
  } else {
    cartItem.quantidade = Math.min(nextQuantity, Number(product.estoque));
  }

  renderCart();
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    const product = products.find((p) => Number(p.id) === Number(item.produto_id));
    if (!product) return total;
    return total + Number(product.preco) * Number(item.quantidade);
  }, 0);
}

function renderCart() {
  const quantity = cart.reduce((sum, item) => sum + Number(item.quantidade), 0);
  cartCount.textContent = quantity;
  cartTotal.textContent = money.format(getCartTotal());
  checkoutButton.disabled = cart.length === 0;

  if (!cart.length) {
    cartItems.innerHTML = '<div class="empty-cart">Seu carrinho está vazio.<br>Escolha um produto da Vice Zone.</div>';
    return;
  }

  cartItems.innerHTML = cart.map((item) => {
    const product = products.find((p) => Number(p.id) === Number(item.produto_id));
    if (!product) return '';

    return `
      <div class="cart-item">
        <div class="cart-item-icon">
          ${product.imagem
            ? `<img class="cart-item-image" src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}">`
            : escapeHtml(product.emoji || product.icone || '🎮')
          }
        </div>
        <div>
          <h4>${escapeHtml(product.nome)}</h4>
          <p>${money.format(Number(product.preco))}</p>
        </div>
        <div class="qty-controls">
          <button type="button" data-qty="-1" data-product-id="${product.id}">−</button>
          <span>${item.quantidade}</span>
          <button type="button" data-qty="1" data-product-id="${product.id}">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function openCart() {
  cartSidebar.classList.add('open');
  cartSidebar.setAttribute('aria-hidden', 'false');
  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  cartSidebar.classList.remove('open');
  cartSidebar.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
}

async function checkout() {
  const cliente = customerName.value.trim();

  checkoutMessage.className = 'checkout-message hidden';
  checkoutMessage.textContent = '';

  if (!cliente) {
    checkoutMessage.textContent = 'Digite o nome para registrar o pedido.';
    checkoutMessage.className = 'checkout-message error';
    customerName.focus();
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.textContent = 'SALVANDO PEDIDO...';

  try {
    const response = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente, itens: cart })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('A API não retornou JSON. Acesse a loja em http://localhost:8080.');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Não foi possível registrar o pedido.');

    checkoutMessage.innerHTML = `Pedido <strong>#${data.id}</strong> registrado no PostgreSQL. Total: <strong>${money.format(Number(data.total))}</strong>.`;
    checkoutMessage.className = 'checkout-message';
    cart = [];
    renderCart();
    await loadProducts();

    setTimeout(() => closeCart(), 2200);
  } catch (error) {
    checkoutMessage.textContent = error.message;
    checkoutMessage.className = 'checkout-message error';
  } finally {
    checkoutButton.disabled = cart.length === 0;
    checkoutButton.textContent = 'FINALIZAR COMPRA';
  }
}

productsGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-product]');
  if (!button) return;
  addToCart(Number(button.dataset.addProduct));
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-qty]');
  if (!button) return;
  changeQuantity(Number(button.dataset.productId), Number(button.dataset.qty));
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => selectCategory(button.dataset.category, false));
});

categoryCards.forEach((card) => {
  card.addEventListener('click', () => selectCategory(card.dataset.categoryCard));
});

footerCategoryLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    selectCategory(link.dataset.footerCategory);
  });
});

document.getElementById('exploreRetro').addEventListener('click', () => selectCategory('Retrô'));

searchToggle.addEventListener('click', () => {
  searchWrap.classList.toggle('open');
  if (searchWrap.classList.contains('open')) setTimeout(() => searchInput.focus(), 50);
});

searchInput.addEventListener('input', renderProducts);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    searchInput.value = '';
    searchWrap.classList.remove('open');
    renderProducts();
  }
});

openCartButton.addEventListener('click', openCart);
closeCartButton.addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
checkoutButton.addEventListener('click', checkout);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCart();
});

document.getElementById('newsletterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.getElementById('newsletterEmail');
  showToast(`Inscrição simulada para ${email.value}.`);
  email.value = '';
});

renderCart();
loadProducts();
