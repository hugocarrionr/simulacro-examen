// --- ¡IMPORTANTE! RELLENA ESTO CON TUS DATOS ---
const API_URL = "http://localhost:8000"; // <--- Tu URL de Render (sin barra al final)

const CLOUD_NAME = "dly4a0pgx"; // <--- ¡RELLENA ESTO!
const CLOUDINARY_PRESET = "examen_preset"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

let map, marker;

// --- AUTH ---
function checkAuth() {
    if (!localStorage.getItem('token')) window.location.href = 'login.html';
}
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

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
            if (!res.ok) throw new Error('Error');
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            window.location.href = 'index.html';
        } catch (err) {
            if(errorMsg) { errorMsg.style.display = 'block'; errorMsg.innerText = "Error login"; }
        }
    });
}

// --- MAPA ---
function initMap() {
    if (!document.getElementById('map')) return;
    map = L.map('map').setView([40.4168, -3.7038], 5); // Vista inicial (España aprox)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: 'OSM'}).addTo(map);
    
    map.on('click', function(e) {
        // Solo permitimos poner marcadores si estamos viendo NUESTRO mapa
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

// --- GEOCODING (NUEVO) ---
// Usa la API gratuita de Nominatim (OpenStreetMap)
async function autocompletarCoords() {
    const sitio = document.getElementById('nombre').value;
    if (!sitio) return alert("Escribe primero el nombre de la ciudad o país");

    const btn = document.querySelector('button[onclick="autocompletarCoords()"]');
    btn.innerText = "Buscando...";
    btn.disabled = true;

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${sitio}`);
        const data = await res.json();

        if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            ponerMarcadorFormulario(lat, lon);
            map.setView([lat, lon], 10);
        } else {
            alert("No se encontraron coordenadas para ese sitio.");
        }
    } catch (e) {
        console.error(e);
        alert("Error al conectar con servicio de Geocoding");
    } finally {
        btn.innerText = "📍 Buscar Coordenadas Automáticas";
        btn.disabled = false;
    }
}

// --- CLOUDINARY ---
async function subirImagen(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    try {
        const res = await fetch(CLOUDINARY_URL, {method: 'POST', body: formData});
        const data = await res.json();
        return data.secure_url;
    } catch (e) { console.error(e); return null; }
}

// --- CRUD LUGARES ---
async function crearLugar() {
    const nombre = document.getElementById('nombre').value;
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const fileInput = document.getElementById('imagen');
    const token = localStorage.getItem('token');

    if (!nombre || !lat) return alert("Faltan datos (nombre o coordenadas)");

    let imagenUrl = "";
    if (fileInput.files.length > 0) {
        document.querySelector('button[onclick="crearLugar()"]').innerText = "Subiendo...";
        imagenUrl = await subirImagen(fileInput.files[0]);
    }

    const datos = {
        nombre: nombre,
        descripcion: document.getElementById('descripcion').value,
        latitud: parseFloat(lat),
        longitud: parseFloat(lng),
        imagen_url: imagenUrl
    };

    const res = await fetch(`${API_URL}/lugares`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("Guardado!");
        location.reload();
    } else {
        alert("Error al guardar");
        document.querySelector('button[onclick="crearLugar()"]').innerText = "Guardar Lugar";
    }
}

// --- LÓGICA DE VISITAS Y CARGA ---

// 1. Ver mapa de otro usuario
async function verUsuario() {
    const email = document.getElementById('emailBusqueda').value;
    if(!email) return alert("Escribe un email");
    
    // Ocultamos el formulario de crear porque no es nuestro mapa
    document.getElementById('caja-crear').style.display = 'none';
    document.querySelector('h1').innerText = `Mapa de: ${email}`;
    
    await cargarLugares(email);
    alert(`Estás visitando el mapa de ${email}. Se registrará tu visita.`);
}

// 2. Volver a mi mapa
async function verMio() {
    document.getElementById('caja-crear').style.display = 'block';
    document.getElementById('emailBusqueda').value = "";
    document.querySelector('h1').innerText = "Mi Mapa (Simulacro)";
    await cargarLugares(); // Sin argumentos carga el mío
}

// 3. Cargar Lugares (Míos o de otro)
async function cargarLugares(emailTarget = null) {
    let url = `${API_URL}/lugares`;
    // Si hay emailTarget, lo añadimos a la URL para que el backend sepa que es una visita
    if (emailTarget) {
        url += `?email=${emailTarget}`;
    }
    
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const lugares = await res.json();
        
        // Limpiar marcadores del mapa anterior
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        const div = document.getElementById('lista-lugares');
        div.innerHTML = "<h3>Lugares en el Mapa</h3>";
        
        if(lugares.length === 0) div.innerHTML += "<p>No hay lugares guardados.</p>";

        lugares.forEach(l => {
            const imgHtml = l.imagen_url ? `<img src="${l.imagen_url}" style="max-width:200px; display:block; margin-top:5px; border-radius:4px;">` : '';
            
            // Añadir a la lista
            div.innerHTML += `
                <div style="border-bottom:1px solid #ccc; padding:10px; background:#fff; margin-bottom:5px;">
                    <b>${l.nombre}</b> <span style="color:gray; font-size:0.8em;">(${l.latitud}, ${l.longitud})</span>
                    <br>${l.descripcion || ''}
                    <br>${imgHtml}
                </div>`;
            
            // Añadir al mapa
            const popup = `<b>${l.nombre}</b><br>${l.descripcion || ''}<br>${imgHtml}`;
            L.marker([l.latitud, l.longitud]).addTo(map).bindPopup(popup);
        });

    } catch(e) {
        console.error(e);
        alert("Error cargando lugares");
    }
}

// 4. Historial de Visitas (Quién me visitó)
async function cargarHistorialVisitas() {
    try {
        const res = await fetch(`${API_URL}/mis-visitas`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const visitas = await res.json();
        const ul = document.getElementById('ul-visitas');
        ul.innerHTML = "";
        
        if (visitas.length === 0) {
            ul.innerHTML = "<li>Nadie ha visitado tu mapa todavía 😢</li>";
            return;
        }

        visitas.forEach(v => {
            // Formatear fecha bonita
            const fecha = new Date(v.fecha).toLocaleString();
            ul.innerHTML += `<li><b>${v.visitante}</b> visitó tu mapa el ${fecha}</li>`;
        });
    } catch(e) {
        console.error("Error cargando historial", e);
    }
}