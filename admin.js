const LS_ORDERS="glowrush_orders_v1",LS_PRODUCTS="glowrush_products_v1",LS_CLIENTS="glowrush_clients_v1";
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const fmt=n=>(+n||0).toLocaleString()+" сум",uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}},write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function escapeHtml(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}

// 🌙 Тема
(function(){
  const r=document.documentElement;
  const saved=localStorage.getItem("theme")||"dark";
  if(saved==="light")r.classList.add("light");
  $("#toggle-theme").onclick=()=>{r.classList.toggle("light");localStorage.setItem("theme",r.classList.contains("light")?"light":"dark")};
  $("#theme-select")?.addEventListener("change",e=>{
    e.target.value==="light"?r.classList.add("light"):r.classList.remove("light");
    localStorage.setItem("theme",e.target.value);
  });
})();

// 📑 Навигация
$("#nav-tabs").onclick=e=>{
  const b=e.target.closest(".tab"); if(!b)return;
  $$(".tab").forEach(t=>t.classList.remove("active")); b.classList.add("active");
  $$(".tab-panel").forEach(p=>p.classList.remove("active")); $("#panel-"+b.dataset.tab).classList.add("active");
  if(b.dataset.tab==="dashboard")renderDashboard();
  if(b.dataset.tab==="products")renderProducts();
  if(b.dataset.tab==="clients")renderClients();
  if(b.dataset.tab==="stats")renderStats();
};

// 📊 Dashboard
function renderDashboard(){
  const orders=read(LS_ORDERS),prods=read(LS_PRODUCTS),cl=read(LS_CLIENTS);
  $("#kpi-orders").textContent=orders.length;
  $("#kpi-revenue").textContent=fmt(orders.filter(o=>o.status==="done").reduce((a,o)=>a+(+o.total||0),0));
  $("#kpi-products").textContent=prods.length;
  $("#kpi-clients").textContent=cl.length;

  const tbody=$("#dash-last-orders"); tbody.innerHTML="";
  const last=orders.slice(-5).reverse();
  if(!last.length){tbody.innerHTML=`<tr><td colspan="5" class="muted">Нет данных</td></tr>`}
  else last.forEach(o=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${o.id}</td><td>${o.date}</td><td>${o.name}</td><td>${fmt(o.total)}</td><td>${o.status}</td>`;
    tbody.appendChild(tr);
  });

  const counts={};
  orders.forEach(o=>{
    const items=(o.items||"").toLowerCase();
    prods.forEach(p=>{
      if(items.includes((p.title||"").toLowerCase())) counts[p.id]=(counts[p.id]||0)+1;
    });
  });
  const ul=$("#dash-top-products"); ul.innerHTML="";
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([id,c])=>{
    const p=prods.find(x=>x.id===id);
    ul.innerHTML+=`<li>${p?.title||"Товар"} — ${c}</li>`;
  });
  if(!ul.innerHTML)ul.innerHTML="<li class='muted'>Нет данных</li>";
}

// 🛒 Продукты
const prodForm=$("#product-form"),prodId=$("#prod-id"),prodTitle=$("#prod-title"),
prodPrice=$("#prod-price"),prodDesc=$("#prod-desc"),prodImage=$("#prod-image"),
prodPreview=$("#prod-preview"),prodSearch=$("#prod-search"),grid=$("#products-grid");

prodImage.onchange=()=>{
  const f=prodImage.files?.[0]; if(!f){prodPreview.innerHTML="Нет изображения";return}
  const r=new FileReader(); r.onload=e=>{
    prodPreview.innerHTML=`<img src="${e.target.result}">`;
    prodPreview.dataset.dataurl=e.target.result;
  }; r.readAsDataURL(f);
};
$("#prod-reset").onclick=()=>{
  prodId.value=prodTitle.value=prodPrice.value=prodDesc.value="";
  prodImage.value=""; prodPreview.innerHTML="Нет изображения";
  delete prodPreview.dataset.dataurl;
};
prodForm.onsubmit=e=>{
  e.preventDefault();
  const id=prodId.value||uid();
  const arr=read(LS_PRODUCTS,[]);
  const obj={id,title:prodTitle.value,price:+prodPrice.value||0,desc:prodDesc.value,image:prodPreview.dataset.dataurl||""};
  const ex=arr.find(p=>p.id===id);
  ex?Object.assign(ex,obj):arr.unshift(obj);
  write(LS_PRODUCTS,arr);
  renderProducts(); alert("✅ Сохранено"); $("#prod-reset").click();
};
function renderProducts(){
  const q=prodSearch.value.toLowerCase(),arr=read(LS_PRODUCTS,[]).filter(p=>p.title.toLowerCase().includes(q));
  grid.innerHTML=""; if(!arr.length){grid.innerHTML="<div class='muted'>Нет продуктов</div>";return}
  arr.forEach(p=>{
    grid.innerHTML+=`
      <div class="product-card">
        <img src="${p.image}" onerror="this.style.display='none'">
        <div class="content">
          <div class="title">${escapeHtml(p.title)}</div>
          <div class="price">${fmt(p.price)}</div>
          <div class="desc">${escapeHtml(p.desc||"")}</div>
          <div class="row">
            <button class="btn" onclick="editProduct('${p.id}')">✏</button>
            <button class="btn danger" onclick="deleteProduct('${p.id}')">🗑</button>
          </div>
        </div>
      </div>`;
  });
}
function editProduct(id){
  const p=read(LS_PRODUCTS,[]).find(x=>x.id===id); if(!p)return;
  prodId.value=p.id; prodTitle.value=p.title; prodPrice.value=p.price; prodDesc.value=p.desc;
  prodPreview.innerHTML=p.image?`<img src="${p.image}">`:"Нет изображения";
  if(p.image)prodPreview.dataset.dataurl=p.image;
}
function deleteProduct(id){
  if(!confirm("Удалить продукт?"))return;
  write(LS_PRODUCTS,read(LS_PRODUCTS,[]).filter(p=>p.id!==id));
  renderProducts();
}

// 👥 Клиенты
function renderClients(){
  const arr=read(LS_CLIENTS,[]); const tbody=$("#clients-body"); tbody.innerHTML="";
  if(!arr.length){tbody.innerHTML=`<tr><td colspan="4" class="muted">Нет данных</td></tr>`;return}
  arr.forEach(c=>{
    tbody.innerHTML+=`<tr><td>${escapeHtml(c.name)}</td><td>${c.phone}</td><td>${c.address}</td><td>${c.orders||0}</td></tr>`;
  });
}

// 📈 Статистика
function renderStats(){
  const orders=read(LS_ORDERS); const done=orders.filter(o=>o.status==="done");
  const revenue=done.reduce((a,o)=>a+(+o.total||0),0);
  const canceled=orders.filter(o=>o.status==="canceled").length;
  const avg=done.length?Math.round(revenue/done.length):0;
  $("#stat-revenue").textContent=fmt(revenue);
  $("#stat-canceled").textContent=canceled;
  $("#stat-avg").textContent=fmt(avg);
}

// ⚙ Настройки
$("#clear-products").onclick=()=>{if(confirm("Очистить продукты?")){localStorage.removeItem(LS_PRODUCTS);renderProducts()}};
$("#clear-clients").onclick=()=>{if(confirm("Очистить клиентов?")){localStorage.removeItem(LS_CLIENTS);renderClients()}};
$("#clear-all").onclick=()=>{if(confirm("Сбросить всё?")){localStorage.clear();location.reload()}};

// Экспорт / Импорт заказов
$("#export-orders-json").onclick=()=>{
  const data=JSON.stringify(read(LS_ORDERS),null,2);
  downloadBlob(data,"orders.json","application/json");
};
$("#export-orders-zip").onclick=async()=>{
  const zip=new JSZip(); zip.file("orders.json",JSON.stringify(read(LS_ORDERS),null,2));
  const blob=await zip.generateAsync({type:"blob"}); downloadBlob(blob,"orders.zip","application/zip");
};
$("#import-orders-zip").onchange=async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{
    const zip=await JSZip.loadAsync(file);
    const entry=zip.file(/orders\.json$/i)[0];
    if(!entry){alert("❌ В архиве нет orders.json");return}
    const text=await entry.async("string"); const data=JSON.parse(text);
    if(Array.isArray(data)){write(LS_ORDERS,data);alert(`✅ Импортировано: ${data.length}`)}
  }catch(err){console.error(err);alert("Ошибка импорта")}
  finally{e.target.value=""}
};
$("#clear-orders").onclick=()=>{if(confirm("Очистить заказы?")){localStorage.removeItem(LS_ORDERS)}};

// Helpers
function downloadBlob(content,filename,mime){
  const blob=content instanceof Blob?content:new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

// Init
renderDashboard();
