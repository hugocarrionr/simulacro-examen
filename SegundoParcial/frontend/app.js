// --- 1. CONFIGURACIÓN ---
// Asegúrate de que esta URL es la de TU Render (HTTPS y sin barra al final)
const API_URL = "https://simulacro-examen.onrender.com"; 

const CLOUD_NAME = "dly4a0pgx"; // <--- ¡RELLENA ESTO!
const CLOUDINARY_PRESET = "examen_preset"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

let map, marker;

// --- 2. FUNCIONES DE AUTENTICACIÓN ---

// ¡ESTA ES LA FUNCIÓN QUE FALTABA Y DABA EL ERROR!
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Lógica del Login (solo se activa si existe el formulario)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const res = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData
            });
            if (!res.ok) throw new Error('Credenciales incorrectas');
            
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            window.location.href = 'index.html'; // Redirigir al mapa
        } catch (err) {
            console.error(err);
            if(errorMsg) { 
                errorMsg.style.display = 'block'; 
                errorMsg.innerText = "Usuario o contraseña incorrectos"; 
            }
        }
    });
}

// --- 3. MAPA ---
function initMap() {
    // Si no hay div de mapa, salimos (para que no de error en login.html)
    if (!document.getElementById('map')) return;

    map = L.map('map').setView([40.4168, -3.7038], 5); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OSM'
    }).addTo(map);
    
    // Click en el mapa
    map.on('click', function(e) {
        if(document.getElementById('caja-crear').style.display === 'none') return;
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        ponerMarcadorFormulario(lat, lng);
    });
}

function ponerMarcadorFormulario(lat, lng) {
    document.getElementById('lat').value = lat.toFixed(6);
    document.getElementById('lng').value = lng.toFixed(6);
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
}

// --- 4. GEOCODING ---
async function autocompletarCoords() {
    const sitio = document.getElementById('nombre').value;
    if (!sitio) return alert("Escribe una ciudad");
    const btn = document.querySelector('button[onclick="autocompletarCoords()"]');
    if(btn) { btn.innerText = "Buscando..."; btn.disabled = true; }

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${sitio}`);
        const data = await res.json();
        if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            ponerMarcadorFormulario(lat, lon);
            if(map) map.setView([lat, lon], 10);
        } else {
            alert("Sitio no encontrado");
        }
    } catch (e) {
        alert("Error Geocoding");
    } finally {
        if(btn) { btn.innerText = "📍 Buscar"; btn.disabled = false; }
    }
}

// --- 5. SUBIDA Y CREACIÓN ---
async function subirImagen(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    try {
        const res = await fetch(CLOUDINARY_URL, {method: 'POST', body: formData});
        return (await res.json()).secure_url;
    } catch (e) { return null; }
}

async function crearLugar() {
    const nombre = document.getElementById('nombre').value;
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const fileInput = document.getElementById('imagen');
    const token = localStorage.getItem('token');

    if (!nombre || !lat) return alert("Faltan datos");

    let imagenUrl = "";
    if (fileInput.files.length > 0) {
        const btn = document.querySelector('button[onclick="crearLugar()"]');
        btn.innerText = "Subiendo..."; btn.disabled = true;
        imagenUrl = await subirImagen(fileInput.files[0]);
        btn.innerText = "Guardar"; btn.disabled = false;
    }

    const datos = {
        nombre, 
        descripcion: document.getElementById('descripcion').value,
        latitud: parseFloat(lat), 
        longitud: parseFloat(lng), 
        imagen_url: imagenUrl
    };

    try {
        const res = await fetch(`${API_URL}/lugares`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(datos)
        });
        if (res.ok) { alert("Guardado"); location.reload(); }
        else { alert("Error al guardar"); }
    } catch (e) { alert("Error de conexión"); }
}

// --- 6. CARGA DE DATOS ---
async function cargarLugares(emailTarget = null) {
    let url = `${API_URL}/lugares`;
    if (emailTarget) url += `?email=${emailTarget}`;
    
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
        if(!res.ok) return; // Si falla, simplemente no muestra nada (evita errores feos)
        const lugares = await res.json();
        
        if(map) {
            map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
        }
        
        const div = document.getElementById('lista-lugares');
        if(div) {
            div.innerHTML = "<h3>Lugares</h3>";
            lugares.forEach(l => {
                const img = l.imagen_url ? `<img src="${l.imagen_url}" style="width:100px;display:block;">` : '';
                div.innerHTML += `<div style="border-bottom:1px solid #ccc; margin:5px;"><b>${l.nombre}</b><br>${l.descripcion||''}${img}</div>`;
                if(map) L.marker([l.latitud, l.longitud]).addTo(map).bindPopup(`<b>${l.nombre}</b><br>${img}`);
            });
        }
    } catch(e) { console.log("No se pudieron cargar lugares"); }
}

async function cargarHistorialVisitas() {
    try {
        const res = await fetch(`${API_URL}/mis-visitas`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
        if(!res.ok) return;
        const visitas = await res.json();
        const ul = document.getElementById('ul-visitas');
        if(ul) {
            ul.innerHTML = "";
            visitas.forEach(v => ul.innerHTML += `<li>${v.visitante} - ${new Date(v.fecha).toLocaleDateString()}</li>`);
        }
    } catch(e) {}
}

async function verUsuario() {
    const email = document.getElementById('emailBusqueda').value;
    if(!email) return;
    document.getElementById('caja-crear').style.display = 'none';
    const h1 = document.querySelector('h1');
    if(h1) h1.innerText = `Mapa de: ${email}`;
    await cargarLugares(email);
    alert(`Viendo mapa de ${email}`);
}

async function verMio() {
    document.getElementById('caja-crear').style.display = 'block';
    const h1 = document.querySelector('h1');
    if(h1) h1.innerText = "Mi Mapa";
    await cargarLugares();
}

// --- 7. INICIALIZACIÓN ---
// Dejamos esto limpio. El checkAuth ya lo hace el HTML en la línea 68.
window.onload = function() {
    // Si estamos en login, no hacemos nada
    if (window.location.pathname.includes('login.html')) return;

    // Ejecutamos la carga inicial
    // (checkAuth se ejecuta desde el HTML si está ahí, o lo llamamos aquí por seguridad)
    checkAuth(); 
    initMap();
    cargarLugares();
    cargarHistorialVisitas();
};