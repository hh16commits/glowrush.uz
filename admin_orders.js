/* =================== Constants & State =================== */
const LS_ORDERS = "glowrush_orders_v1";
const LS_PRODUCTS = "glowrush_products_v1";

let currentPage = 1, pageSize = 10;
let currentSort = { field: "date", asc: false };
let currentFilter = { status: "", search: "" };

/* =================== Helpers =================== */
function loadOrders() { return JSON.parse(localStorage.getItem(LS_ORDERS) || "[]"); }
function saveOrders(orders) { localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

function loadProducts() { return JSON.parse(localStorage.getItem(LS_PRODUCTS) || "[]"); }
function saveProducts(products) { localStorage.setItem(LS_PRODUCTS, JSON.stringify(products)); }

function fmtSom(n) { return Number(n).toLocaleString() + " сум"; }
function escapeHtml(s) { return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"); }
function downloadBlob(content, filename, mime) { 
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* =================== KPI =================== */
function updateKpi(orders){
  document.getElementById("kpi-total").textContent = orders.length;
  document.getElementById("kpi-sum").textContent = fmtSom(orders.reduce((a,o)=>a+(o.total||0),0));
  document.getElementById("kpi-done").textContent = orders.filter(o=>o.status==="done").length;
  document.getElementById("kpi-canceled").textContent = orders.filter(o=>o.status==="canceled").length;
}

/* =================== Render Orders =================== */
function renderOrders(){
  const orders = loadOrders();
  updateKpi(orders);

  let filtered = orders.filter(o=>{
    if(currentFilter.status && o.status!==currentFilter.status) return false;
    if(currentFilter.search){
      const q = currentFilter.search.toLowerCase();
      return (String(o.name)+String(o.phone)+String(o.address)+String(o.items)).toLowerCase().includes(q);
    }
    return true;
  });

  filtered.sort((a,b)=>{
    let av = a[currentSort.field], bv = b[currentSort.field];
    if(currentSort.field==="total"){ av=+av||0; bv=+bv||0; }
    if(av<bv) return currentSort.asc?-1:1;
    if(av>bv) return currentSort.asc?1:-1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  if(currentPage>totalPages) currentPage = totalPages;
  const pageItems = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

  const tbody = document.getElementById("orders-body");
  tbody.innerHTML = "";

  if(!pageItems.length) tbody.innerHTML=`<tr><td colspan="9" class="empty">Нет заказов</td></tr>`;
  else pageItems.forEach(o=>{
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${escapeHtml(o.id)}</td>
      <td>${escapeHtml(o.date)}</td>
      <td>${escapeHtml(o.name)}</td>
      <td>${escapeHtml(o.phone)}</td>
      <td>${escapeHtml(o.address)}</td>
      <td>${escapeHtml(o.items)}</td>
      <td>${fmtSom(o.total)}</td>
      <td><span class="status ${o.status}">${o.status}</span></td>
      <td>
        <button class="done" data-id="${o.id}">✔</button>
        <button class="cancel" data-id="${o.id}">✖</button>
        <button class="print" data-id="${o.id}">🖨</button>
        <button class="edit" data-id="${o.id}">✎</button>
        <button class="delete" data-id="${o.id}">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(totalPages);
}

/* =================== Render Products =================== */
function renderProducts(){
  const products = loadProducts();
  const tbody = document.getElementById("products-body");
  tbody.innerHTML = "";

  if(!products.length) tbody.innerHTML=`<tr><td colspan="6" class="empty">Нет продуктов</td></tr>`;
  else products.forEach(p=>{
    const tr = document.createElement("tr");
    const imgTag = p.photo ? `<img src="${p.photo}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">` : "";
    tr.innerHTML=`
      <td>${p.id}</td>
      <td>${imgTag}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${fmtSom(p.price)}</td>
      <td>${escapeHtml(p.desc)}</td>
      <td>
        <button class="edit-product" data-id="${p.id}">✎</button>
        <button class="delete-product" data-id="${p.id}">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =================== Orders Actions =================== */
function updateStatus(id,status){
  const orders=loadOrders();
  const order=orders.find(o=>String(o.id)===String(id));
  if(!order) return;
  order.status=status;
  saveOrders(orders);
  renderOrders();
}
function deleteOrder(id){
  const orders=loadOrders().filter(o=>String(o.id)!==String(id));
  saveOrders(orders);
  renderOrders();
}
function printOrder(id){
  const o = loadOrders().find(x=>String(x.id)===String(id));
  if(!o) return alert("❌ Заказ не найден");
  const orderUrl=`http://glowrush.uz/orders/id/${o.id}`;
  const qrApi=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(orderUrl)}&color=000000`;
  const printWin=window.open("","_blank");
  printWin.document.write(`
    <html><head><title>Заказ ${o.id}</title>
    <style>
      body{font-family:Arial;padding:20px;}
      h1,h2{text-align:center;}
      .order-info{margin:20px 0;padding:18px;border:1px solid #ccc;border-radius:8px;}
      .order-info p{margin:6px 0;}
      .qr{display:flex;justify-content:center;margin-top:20px;}
      .qr img{width:150px;height:150px;}
    </style></head>
    <body>
      <h1>✨ Glowrush</h1>
      <h2>Заказ № ${o.id}</h2>
      <div class="order-info">
        <p><b>Дата:</b> ${o.date}</p>
        <p><b>Клиент:</b> ${o.name}</p>
        <p><b>Телефон:</b> ${o.phone}</p>
        <p><b>Адрес:</b> ${o.address}</p>
        <p><b>Товары:</b> ${o.items}</p>
        <p><b>Сумма:</b> ${fmtSom(o.total)}</p>
        <p><b>Статус:</b> ${o.status}</p>
      </div>
      <div class="qr"><img src="${qrApi}"></div>
      <script>window.onload=()=>window.print()</script>
    </body></html>
  `);
  printWin.document.close();
}

/* =================== Products Actions =================== */
function deleteProduct(id){
  const products=loadProducts().filter(p=>String(p.id)!==String(id));
  saveProducts(products);
  renderProducts();
}
function openEditProduct(id){
  const p = loadProducts().find(p=>String(p.id)===String(id));
  if(!p) return;
  document.getElementById("product-modal-title").textContent="Редактировать продукт";
  document.getElementById("product-id").value=p.id;
  document.getElementById("product-name").value=p.name;
  document.getElementById("product-price").value=p.price;
  document.getElementById("product-desc").value=p.desc;
  document.getElementById("product-modal").style.display="flex";
}

/* =================== Modals =================== */
function openOrderModal(id=null){
  document.getElementById("order-form").reset();
  document.getElementById("order-modal-title").textContent=id?"Редактировать заказ":"Новый заказ";
  document.getElementById("order-id").value=id||"";
  if(id){
    const o=loadOrders().find(x=>String(x.id)===String(id));
    if(!o) return;
    document.getElementById("order-name").value=o.name;
    document.getElementById("order-phone").value=o.phone;
    document.getElementById("order-address").value=o.address;
    document.getElementById("order-items").value=o.items;
    document.getElementById("order-total").value=o.total;
    document.getElementById("order-status").value=o.status;
  }
  document.getElementById("order-modal").style.display="flex";
}
function openProductModal(){
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value="";
  document.getElementById("product-modal-title").textContent="Новый продукт";
  document.getElementById("product-modal").style.display="flex";
}

/* =================== Event Listeners =================== */
document.querySelectorAll(".tab").forEach(tab=>{
  tab.onclick=()=>{ 
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(c=>c.style.display="none");
    document.getElementById(tab.dataset.tab+"-tab").style.display="block";
    document.getElementById("add-order").style.display=tab.dataset.tab==="orders"?"inline-block":"none";
    document.getElementById("add-product").style.display=tab.dataset.tab==="products"?"inline-block":"none";
  };
});

document.querySelectorAll(".modal .close").forEach(c=>c.onclick=e=>{ c.closest(".modal").style.display="none"; });
window.onclick=e=>{ if(e.target.classList.contains("modal")) e.target.style.display="none"; };

document.getElementById("add-order").onclick=()=>openOrderModal();
document.getElementById("add-product").onclick=()=>openProductModal();

document.getElementById("order-form").onsubmit= e=>{
  e.preventDefault();
  const orders=loadOrders();
  const id=document.getElementById("order-id").value;
  const orderData={
    id:id||Date.now(),
    date:id?orders.find(o=>o.id==id).date:new Date().toLocaleString(),
    name:document.getElementById("order-name").value,
    phone:document.getElementById("order-phone").value,
    address:document.getElementById("order-address").value,
    items:document.getElementById("order-items").value,
    total:+document.getElementById("order-total").value,
    status:document.getElementById("order-status").value
  };
  if(id){ const idx=orders.findIndex(o=>o.id==id); orders[idx]=orderData; } else orders.push(orderData);
  saveOrders(orders);
  document.getElementById("order-modal").style.display="none";
  renderOrders();
};

document.getElementById("product-form").onsubmit= async e=>{
  e.preventDefault();
  const products=loadProducts();
  const id=document.getElementById("product-id").value;
  let photo="";
  const file=document.getElementById("product-photo").files[0];
  if(file){
    photo=await new Promise(resolve=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.readAsDataURL(file); });
  }
  const productData={
    id:id||Date.now(),
    name:document.getElementById("product-name").value,
    price:+document.getElementById("product-price").value,
    desc:document.getElementById("product-desc").value,
    photo:photo
  };
  if(id){
    const idx=products.findIndex(p=>p.id==id);
    if(!photo) productData.photo=products[idx].photo;
    products[idx]=productData;
  } else products.push(productData);
  saveProducts(products);
  document.getElementById("product-modal").style.display="none";
  renderProducts();
};

document.addEventListener("click",e=>{
  const btn=e.target.closest("button");
  if(!btn) return;
  const id=btn.dataset.id;
  if(btn.classList.contains("done")) updateStatus(id,"done");
  if(btn.classList.contains("cancel")) updateStatus(id,"canceled");
  if(btn.classList.contains("delete")) deleteOrder(id);
  if(btn.classList.contains("print")) printOrder(id);
  if(btn.classList.contains("edit")) openOrderModal(id);
  if(btn.classList.contains("edit-product")) openEditProduct(id);
  if(btn.classList.contains("delete-product")) deleteProduct(id);
});

document.getElementById("filter-status").onchange=e=>{currentFilter.status=e.target.value; currentPage=1; renderOrders();}
document.getElementById("search").oninput=e=>{currentFilter.search=e.target.value; currentPage=1; renderOrders();}
document.querySelectorAll("th[data-sort]").forEach(th=>{
  th.onclick=()=>{ const f=th.dataset.sort; currentSort.field===f?currentSort.asc=!currentSort.asc:(currentSort.field=f,currentSort.asc=true); renderOrders(); };
});

document.getElementById("mass-done").onclick=()=>{ saveOrders(loadOrders().map(o=>({...o,status:"done"}))); renderOrders(); }
document.getElementById("mass-cancel").onclick=()=>{ saveOrders(loadOrders().map(o=>({...o,status:"canceled"}))); renderOrders(); }
document.getElementById("mass-print").onclick=()=>{
  const orders=loadOrders(); if(!orders.length) return alert("Нет заказов");
  const printWin=window.open("","_blank");
  let html=`<html><head><title>Все заказы</title><style>body{font-family:Arial;padding:20px;}.order-info{margin:20px 0;padding:18px;border:1px solid #ccc;border-radius:8px;}</style></head><body><h1>Все заказы</h1>`;
  orders.forEach(o=>{
    const qr=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`http://glowrush.uz/orders/id/${o.id}`)}&color=000000`;
    html+=`<div class="order-info">
      <p><b>ID:</b> ${o.id}</p>
      <p><b>Дата:</b> ${o.date}</p>
      <p><b>Клиент:</b> ${o.name}</p>
      <p><b>Телефон:</b> ${o.phone}</p>
      <p><b>Адрес:</b> ${o.address}</p>
      <p><b>Товары:</b> ${o.items}</p>
      <p><b>Сумма:</b> ${fmtSom(o.total)}</p>
      <p><b>Статус:</b> ${o.status}</p>
      <div><img src="${qr}" style="width:150px;height:150px;"></div>
    </div><hr>`;
  });
  html+=`<script>window.onload=()=>window.print()</script></body></html>`;
  printWin.document.write(html); printWin.document.close();
};

document.getElementById("export-json").onclick=()=>downloadBlob(JSON.stringify({orders:loadOrders(),products:loadProducts()},null,2),"glowrush.json","application/json");
document.getElementById("export-zip").onclick=async()=>{
  const zip=new JSZip();
  zip.file("orders.json",JSON.stringify(loadOrders(),null,2));
  zip.file("products.json",JSON.stringify(loadProducts(),null,2));
  const blob=await zip.generateAsync({type:"blob"});
  downloadBlob(blob,"glowrush.zip","application/zip");
};
document.getElementById("import-zip").addEventListener("change",async e=>{
  const file=e.target.files[0]; if(!file) return;
  try{
    const zip=await JSZip.loadAsync(file);
    const ordersEntry=zip.file(/orders\.json$/i)?.[0];
    const productsEntry=zip.file(/products\.json$/i)?.[0];
    if(ordersEntry){ const text=await ordersEntry.async("string"); saveOrders(JSON.parse(text)); }
    if(productsEntry){ const text=await productsEntry.async("string"); saveProducts(JSON.parse(text)); }
    renderOrders(); renderProducts(); alert("✅ Импорт завершен");
  }catch(err){ console.error(err); alert("❌ Ошибка импорта"); }
  finally{ e.target.value=""; }
});
document.getElementById("clear-all").onclick=()=>{ if(confirm("Очистить все данные?")){ localStorage.removeItem(LS_ORDERS); localStorage.removeItem(LS_PRODUCTS); renderOrders(); renderProducts(); } };

/* =================== Pagination =================== */
function renderPagination(totalPages){
  const container=document.getElementById("pagination");
  container.innerHTML="";
  for(let p=1;p<=totalPages;p++){
    const btn=document.createElement("button");
    btn.className="page-btn"+(p===currentPage?" active":"");
    btn.textContent=p;
    btn.onclick=()=>{ currentPage=p; renderOrders(); };
    container.appendChild(btn);
  }
}

/* =================== Initialize =================== */
renderOrders();
renderProducts();
