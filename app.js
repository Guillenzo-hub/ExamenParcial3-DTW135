const App = {
    currentLevel: 1,
    completedLevels: new Set(),
    location: null,
    photoData: null,
    worker: null,
    level5Stats: null,
    level5Data: null,

    init() {
        this.loadState();
        this.bindEvents();
        this.restoreButtons();
        this.showLevel(1);
        this.updateProgress();
        if (this.photoData) {
            this.displaySavedPhoto();
        }
    },

    loadState() {
        try {
            const saved = localStorage.getItem('escapeRoomCompleted');
            if (saved) {
                JSON.parse(saved).forEach(l => {
                    if (l >= 1 && l <= 5) this.completedLevels.add(l);
                });
            }
            const loc = localStorage.getItem('escapeRoomLocation');
            if (loc) {
                this.location = JSON.parse(loc);
            }
            const photo = localStorage.getItem('escapeRoomPhoto');
            if (photo) {
                this.photoData = photo;
            }
        } catch (e) { }
    },

    saveCompleted() {
        localStorage.setItem('escapeRoomCompleted', JSON.stringify([...this.completedLevels]));
    },

    restoreButtons() {
        for (const level of this.completedLevels) {
            const nextBtn = document.querySelector(`.next-level-btn[data-next="${level + 1}"]`);
            if (nextBtn) nextBtn.disabled = false;
        }
        if (this.completedLevels.has(5)) {
            const btn5 = document.querySelector('.next-level-btn[data-next="complete"]');
            if (btn5) btn5.disabled = false;
        }
    },

    bindEvents() {
        document.getElementById('getLocationBtn').addEventListener('click', () => this.getLocation());
        document.getElementById('drawMapBtn').addEventListener('click', () => this.drawMap());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('photoUpload').addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('processLevel4Btn').addEventListener('click', () => this.processLevel4());
        document.getElementById('processLevel5Btn').addEventListener('click', () => this.processLevel5());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());

        document.querySelectorAll('.next-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const next = e.currentTarget.dataset.next;
                if (next === 'complete') {
                    this.showCompletion();
                } else {
                    this.goToLevel(parseInt(next));
                }
            });
        });

        document.querySelectorAll('.prev-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.goToLevel(parseInt(e.currentTarget.dataset.prev));
            });
        });
    },

    showLevel(num) {
        document.querySelectorAll('.level-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(`level${num}`);
        if (section) {
            section.classList.add('active');
            this.currentLevel = num;
        }
        document.getElementById('levelBadge').textContent = `Nivel ${num}/5`;

        if (num === 2 && this.completedLevels.has(2)) {
            this.drawMapInstant();
            const b2 = document.getElementById('drawMapBtn');
            b2.disabled = true;
            b2.innerHTML = '<i class="bi bi-check-circle"></i> Mapa Dibujado';
        } else if (num === 2 && this.location) {
            document.getElementById('drawMapBtn').disabled = false;
        }

        if (num === 3 && this.photoData) {
            this.displaySavedPhoto();
            const btn = document.getElementById('captureBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-camera-fill"></i> Recapturar';
        }
    },

    goToLevel(num) {
        if (num > 1 && !this.completedLevels.has(num - 1)) {
            this.showAlert('Debes completar el nivel anterior primero.', 'warning');
            return;
        }
        
        // MODIFICACIÓN NIVEL 3: Apagar cámara si salimos del nivel 3
        if (num !== 3 && this.currentLevel === 3) {
            this.stopCamera();
        }
        
        this.showLevel(num);
    },

    updateProgress() {
        const pct = (this.completedLevels.size / 5) * 100;
        document.getElementById('progressBar').style.width = `${pct}%`;
    },

    showAlert(msg, type = 'danger') {
        const container = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    },

    completeLevel(num) {
        this.completedLevels.add(num);
        this.saveCompleted();
        this.updateProgress();
        const btn = document.querySelector(`.next-level-btn[data-next="${num + 1}"]`);
        if (btn) btn.disabled = false;
        if (num === 5) {
            const btn5 = document.querySelector('.next-level-btn[data-next="complete"]');
            if (btn5) btn5.disabled = false;
        }
        this.showAlert(`Nivel ${num} completado!`, 'success');
    },

    // LEVEL 1
    getLocation() {
        const btn = document.getElementById('getLocationBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Obteniendo...';

        if (!navigator.geolocation) {
            this.showGeoError('Geolocalización no soportada en este navegador.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
            return;
        }

        const options = {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.setLocation(pos.coords.latitude, pos.coords.longitude, btn);
            },
            (err) => {
                console.warn('Geolocation error:', err.code, err.message);
                if (err.code === err.PERMISSION_DENIED) {
                    this.showGeoError('Permiso denegado. Activa la geolocalización en tu navegador.');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
                    return;
                }
                this.tryIpFallback(btn);
            },
            options
        );
    },

    setLocation(lat, lng, btn) {
        this.location = { lat, lng };
        localStorage.setItem('escapeRoomLocation', JSON.stringify(this.location));
        document.getElementById('latitude').textContent = lat.toFixed(6);
        document.getElementById('longitude').textContent = lng.toFixed(6);
        document.getElementById('locationResult').classList.remove('d-none');
        document.getElementById('locationError').classList.add('d-none');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Ubicación Obtenida';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
        this.completeLevel(1);
    },

    async tryIpFallback(btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Intentando por IP...';
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                this.setLocation(data.latitude, data.longitude, btn);
            } else {
                this.showGeoError('No se pudo determinar tu ubicación. En Firefox, ve a about:config y verifica que geo.enabled = true.');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
            }
        } catch (e) {
            console.error('IP fallback error:', e);
            this.showGeoError('No se pudo determinar tu ubicación. En Firefox, ve a about:config y verifica que geo.enabled = true.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
        }
    },

    showGeoError(msg) {
        const el = document.getElementById('locationError');
        el.textContent = msg;
        el.classList.remove('d-none');
        document.getElementById('locationResult').classList.add('d-none');
    },

    // LEVEL 2
    drawMap(redraw = false) {
        if (!this.location) {
            this.showAlert('Debes completar el Nivel 1 primero.', 'warning');
            return;
        }
        if (this.completedLevels.has(2) && !redraw) {
            this.drawMapInstant();
            return;
        }
        if (this.mapInterval) {
            clearInterval(this.mapInterval);
            this.mapInterval = null;
        }

        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const btn = document.getElementById('drawMapBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Dibujando...';

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        const status = document.getElementById('canvasStatus');
        status.className = 'text-muted small';

        const steps = [
            {
                label: 'Avenida Principal',
                draw: () => {
                    // Calle central
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(295, 0, 10, h);

                    // Nombre de calle
                    ctx.save();
                    ctx.translate(300, 300);
                    ctx.rotate(Math.PI / 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('AVENIDA CENTRAL', 0, 3);
                    ctx.restore();
                }
            },
            {
                label: 'Calles del lado izquierdo',
                draw: () => {
                    ctx.fillStyle = '#4f4f4f';
                    ctx.fillRect(0, 190, 295, 15);
                    ctx.fillRect(0, 395, 295, 15);

                    // Nombres de calles
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('CALLE NORTE', 147, 201);
                    ctx.fillText('CALLE SUR', 147, 406);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Zona Recreativa Oeste y Lago',
                draw: () => {
                    // Zona Recreativa Oeste
                    ctx.fillStyle = '#abebc6';
                    ctx.fillRect(10, 10, 275, 170);
                    ctx.fillStyle = '#196f3d';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText('ZONA RECREATIVA', 200, 160);

                    // Lago Artificial
                    ctx.fillStyle = '#5dade2';
                    ctx.beginPath();
                    ctx.arc(110, 95, 60, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#1b4f72';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('LAGO', 110, 90);
                    ctx.fillText('ARTIFICIAL', 110, 105);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Zona Recreativa Este (Nueva)',
                draw: () => {
                    // Zona Recreativa Este (Recuadro que va debajo de la diagonal superior)
                    ctx.fillStyle = '#abebc6';
                    ctx.fillRect(325, 70, 255, 185);
                    ctx.fillStyle = '#196f3d';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText('ZONA RECREATIVA', 345, 230);
                }
            },
            {
                label: 'Zona Comercial',
                draw: () => {
                    ctx.fillStyle = '#9fa8da';
                    ctx.fillRect(10, 215, 275, 170);
                    ctx.fillStyle = '#1a237e';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('ZONA COMERCIAL', 147, 305);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Parque Nacional',
                draw: () => {
                    ctx.fillStyle = '#abebc6';
                    ctx.fillRect(10, 420, 275, 170);
                    ctx.fillStyle = '#196f3d';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('PARQUE NACIONAL', 147, 510);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Calle Diagonal Superior (Por encima de Zona Recreativa)',
                draw: () => {
                    // Se dibuja aquí para que quede encima del recuadro verde recreativo
                    ctx.strokeStyle = '#4f4f4f';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(300, 90);
                    ctx.lineTo(600, 190);
                    ctx.stroke();

                    // Nombre de calle diagonal
                    ctx.save();
                    ctx.translate(450, 140);
                    ctx.rotate(0.32175);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('AV. DIAGONAL NORTE', 0, 3);
                    ctx.restore();
                }
            },
            {
                label: 'Calles del lado derecho',
                draw: () => {
                    ctx.fillStyle = '#4f4f4f';
                    ctx.fillRect(305, 270, 295, 12);
                    ctx.fillRect(305, 375, 295, 12);
                    ctx.fillRect(305, 480, 295, 12);
                    ctx.fillRect(445, 270, 12, 222);

                    // Nombre de calle vertical
                    ctx.save();
                    ctx.translate(451, 380);
                    ctx.rotate(Math.PI / 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 7px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('PASAJE RESIDENCIAL', 0, 3);
                    ctx.restore();
                    // Nombres de calles horizontales (mostrado solo una vez a la derecha)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '7px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Calle de la Paz', 520, 279);
                    ctx.fillText('Calle de la Unión', 520, 384);
                    ctx.fillText('Calle de la Libertad', 520, 489);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Zonas Residenciales',
                draw: () => {
                    ctx.fillStyle = '#fff9c4';
                    ctx.fillRect(315, 290, 120, 75);
                    ctx.fillRect(467, 290, 120, 75);
                    ctx.fillRect(315, 395, 120, 75);
                    ctx.fillRect(467, 395, 120, 75);
                    ctx.fillStyle = '#7f8c8d';
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('ZONA RESIDENCIAL', 375, 332);
                    ctx.fillText('ZONA RESIDENCIAL', 527, 332);
                    ctx.fillText('ZONA RESIDENCIAL', 375, 437);
                    ctx.fillText('ZONA RESIDENCIAL', 527, 437);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Calle Diagonal Inferior',
                draw: () => {
                    ctx.strokeStyle = '#4f4f4f';
                    ctx.lineWidth = 12;
                    ctx.beginPath();
                    ctx.moveTo(450, 490);
                    ctx.lineTo(515, 600);
                    ctx.stroke();

                    // Nombre de diagonal inferior
                    ctx.save();
                    ctx.translate(482, 545);
                    ctx.rotate(1.037);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('PASEO DEL SUR', 0, 3);
                    ctx.restore();
                }
            },
            {
                label: 'Tu ubicacion',
                draw: () => {
                    let px = { x: w / 2, y: h / 2 };
                    let latStr = '';
                    let lngStr = '';
                    if (this.location) {
                        const lat = this.location.lat;
                        const lng = this.location.lng;
                        latStr = lat.toFixed(6);
                        lngStr = lng.toFixed(6);
                        if (lat >= 13.0 && lat <= 14.6 && lng >= -90.5 && lng <= -87.4) {
                            px.x = ((lng - (-90.5)) / (-87.4 - (-90.5))) * w;
                            px.y = (1 - (lat - 13.0) / (14.6 - 13.0)) * h;
                        } else {
                            const latFract = Math.abs(lat) % 1;
                            const lngFract = Math.abs(lng) % 1;
                            px.x = 80 + latFract * (w - 160);
                            px.y = 80 + lngFract * (h - 160);
                        }
                        px.x = Math.max(60, Math.min(w - 60, px.x));
                        px.y = Math.max(60, Math.min(h - 60, px.y));
                    }
                    ctx.beginPath();
                    ctx.arc(px.x, px.y, 8, 0, Math.PI * 2);
                    ctx.fillStyle = '#e53935';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(px.x, px.y, 16, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(229, 57, 53, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#e53935';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Tu Ubicacion', px.x, px.y - 22);
                    if (latStr && lngStr) {
                        ctx.font = '9px sans-serif';
                        ctx.fillStyle = '#37474f';
                        ctx.fillText(`(${latStr}, ${lngStr})`, px.x, px.y - 10);
                    }
                    ctx.textAlign = 'left';
                }
            }
        ];
        let i = 0;
        this.mapInterval = setInterval(() => {
            if (i >= steps.length) {
                clearInterval(this.mapInterval);
                this.mapInterval = null;
                status.textContent = 'Mapa dibujado correctamente con tu ubicación marcada.';
                status.classList.remove('text-muted');
                status.classList.add('text-success', 'fw-bold');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Mapa Dibujado';
                this.completeLevel(2);
                return;
            }
            status.textContent = `Dibujando: ${steps[i].label}...`;
            steps[i].draw();
            i++;
        }, 200);
    },
    drawMapInstant() {
        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const status = document.getElementById('canvasStatus');
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        // Avenida Principal
        ctx.fillStyle = '#000000';
        ctx.fillRect(295, 0, 10, h);

        ctx.save();
        ctx.translate(300, 300);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AVENIDA CENTRAL', 0, 3);
        ctx.restore();
        // Calles rectas
        ctx.fillStyle = '#4f4f4f';
        ctx.fillRect(305, 270, 295, 12);
        ctx.fillRect(305, 375, 295, 12);
        ctx.fillRect(305, 480, 295, 12);
        ctx.fillRect(445, 270, 12, 222);
        ctx.fillRect(0, 190, 295, 15);
        ctx.fillRect(0, 395, 295, 15);

        // Nombres calles rectas izquierdas
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CALLE NORTE', 147, 201);
        ctx.fillText('CALLE SUR', 147, 406);
        // Nombres calles rectas derechas
        ctx.save();
        ctx.translate(451, 380);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PASAJE RESIDENCIAL', 0, 3);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Calle de la Paz', 520, 279);
        ctx.fillText('Calle de la Unión', 520, 384);
        ctx.fillText('Calle de la Libertad', 520, 489);
        ctx.textAlign = 'left';
        // Zona Recreativa Oeste y Lago
        ctx.fillStyle = '#abebc6';
        ctx.fillRect(10, 10, 275, 170);
        ctx.fillStyle = '#196f3d';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('ZONA RECREATIVA', 200, 160);

        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.arc(110, 95, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b4f72';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LAGO', 110, 90);
        ctx.fillText('ARTIFICIAL', 110, 105);
        ctx.textAlign = 'left';
        // Zona Recreativa Este (Nueva)
        ctx.fillStyle = '#abebc6';
        ctx.fillRect(325, 70, 255, 185);
        ctx.fillStyle = '#196f3d';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('ZONA RECREATIVA', 345, 230);
        // Zona Comercial
        ctx.fillStyle = '#9fa8da';
        ctx.fillRect(10, 215, 275, 170);
        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ZONA COMERCIAL', 147, 305);
        ctx.textAlign = 'left';
        // Parque Nacional
        ctx.fillStyle = '#abebc6';
        ctx.fillRect(10, 420, 275, 170);
        ctx.fillStyle = '#196f3d';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PARQUE NACIONAL', 147, 510);
        ctx.textAlign = 'left';
        // Calle
        ctx.strokeStyle = '#4f4f4f';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(300, 90);
        ctx.lineTo(600, 190);
        ctx.moveTo(450, 490);
        ctx.lineTo(515, 600);
        ctx.stroke();
        // Nombre diagonal superior
        ctx.save();
        ctx.translate(450, 140);
        ctx.rotate(0.32175);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AV. DIAGONAL NORTE', 0, 3);
        ctx.restore();
        // Nombre diagonal inferior
        ctx.save();
        ctx.translate(482, 545);
        ctx.rotate(1.037);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PASEO DEL SUR', 0, 3);
        ctx.restore();
        // Bloques Residenciales
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(315, 290, 120, 75);
        ctx.fillRect(467, 290, 120, 75);
        ctx.fillRect(315, 395, 120, 75);
        ctx.fillRect(467, 395, 120, 75);
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ZONA RESIDENCIAL', 375, 332);
        ctx.fillText('ZONA RESIDENCIAL', 527, 332);
        ctx.fillText('ZONA RESIDENCIAL', 375, 437);
        ctx.fillText('ZONA RESIDENCIAL', 527, 437);
        ctx.textAlign = 'left';
        // ubicacion
        let px = { x: w / 2, y: h / 2 };
        let latStr = '';
        let lngStr = '';
        if (this.location) {
            const lat = this.location.lat;
            const lng = this.location.lng;
            latStr = lat.toFixed(6);
            lngStr = lng.toFixed(6);
            if (lat >= 13.0 && lat <= 14.6 && lng >= -90.5 && lng <= -87.4) {
                px.x = ((lng - (-90.5)) / (-87.4 - (-90.5))) * w;
                px.y = (1 - (lat - 13.0) / (14.6 - 13.0)) * h;
            } else {
                const latFract = Math.abs(lat) % 1;
                const lngFract = Math.abs(lng) % 1;
                px.x = 80 + latFract * (w - 160);
                px.y = 80 + lngFract * (h - 160);
            }
            px.x = Math.max(60, Math.min(w - 60, px.x));
            px.y = Math.max(60, Math.min(h - 60, px.y));
        }
        ctx.beginPath();
        ctx.arc(px.x, px.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#e53935';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px.x, px.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(229, 57, 53, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#e53935';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tu Ubicacion', px.x, px.y - 22);
        if (latStr && lngStr) {
            ctx.font = '9px sans-serif';
            ctx.fillStyle = '#37474f';
            ctx.fillText(`(${latStr}, ${lngStr})`, px.x, px.y - 10);
        }
        ctx.textAlign = 'left';

        status.textContent = 'Mapa (nivel completado)';
        status.classList.remove('text-muted');
        status.classList.add('text-success', 'fw-bold');
    },

    // LEVEL 3
    async startCamera() {
        const startBtn = document.getElementById('startCameraBtn');
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Iniciando...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const video = document.getElementById('video');
            video.srcObject = stream;
            video.play();
            document.getElementById('captureBtn').disabled = false;
            document.getElementById('cameraError').classList.add('d-none');
            document.getElementById('cameraFallback').classList.add('d-none');
            startBtn.innerHTML = '<i class="bi bi-check-circle"></i> Cámara Activa';
            startBtn.classList.remove('btn-warning');
            startBtn.classList.add('btn-success');
            if (this.photoData) {
                this.displaySavedPhoto();
            }
        } catch (err) {
            let msg = '';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Permiso denegado. Permite el acceso a la cámara en tu navegador.';
            } else if (err.name === 'NotFoundError') {
                msg = 'Cámara no encontrada. Puedes subir una imagen como evidencia.';
                document.getElementById('cameraFallback').classList.remove('d-none');
            } else {
                msg = 'Error al acceder a la cámara: ' + err.message;
            }
            const errEl = document.getElementById('cameraError');
            errEl.textContent = msg;
            errEl.classList.remove('d-none');
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i> Reintentar Cámara';
        }
    },

    capturePhoto() {
        const video = document.getElementById('video');

        // NUEVO SEGURO: Evitar tomar una foto negra si la cámara está apagada
        if (!video.srcObject) {
            this.showAlert('Por favor, inicia la cámara primero antes de capturar.', 'warning');
            return;
        }

        const canvas = document.getElementById('photoCanvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // MODIFICACIÓN NIVEL 3: Compresión JPEG al 60%
        this.photoData = canvas.toDataURL('image/jpeg', 0.6);
        
        try {
            localStorage.setItem('escapeRoomPhoto', this.photoData);
        } catch(err) {
            this.showAlert('Error: La imagen es demasiado pesada para la memoria local.', 'danger');
            return;
        }

        this.displaySavedPhoto();
        if (!this.completedLevels.has(3)) {
            this.completeLevel(3);
            document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Capturar Otra';
        } else {
            document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Recapturar';
        }
    },

    displaySavedPhoto() {
        const canvas = document.getElementById('photoCanvas');
        const placeholder = document.getElementById('photoPlaceholder');
        canvas.classList.remove('d-none');
        placeholder.classList.add('d-none');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = this.photoData;
    },

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('photoCanvas');
                // MODIFICACIÓN NIVEL 3: Redimensionar y comprimir la foto subida manualmente
                const scale = Math.min(800 / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                this.photoData = canvas.toDataURL('image/jpeg', 0.6);
                
                try {
                    localStorage.setItem('escapeRoomPhoto', this.photoData);
                    this.displaySavedPhoto();
                    document.getElementById('cameraError').classList.add('d-none');
                    if (!this.completedLevels.has(3)) {
                        this.completeLevel(3);
                        document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Capturar Otra';
                    }
                } catch(err) {
                    this.showAlert('Error de memoria local al procesar la imagen.', 'danger');
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    },

    // MODIFICACIÓN NIVEL 3: Apagar hardware de la cámara y resetear el botón visual
    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }

        // NUEVO SEGURO: Regresar el botón a color amarillo para que sepas que debes encenderla de nuevo
        const startBtn = document.getElementById('startCameraBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i> Iniciar Cámara';
            startBtn.classList.remove('btn-success');
            startBtn.classList.add('btn-warning');
        }
    },

    // ============ LEVEL 4 ============
    processLevel4() {
        const btn = document.getElementById('processLevel4Btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generando datos...';

        const progressContainer = document.getElementById('progressContainer4');
        const progressBar = document.getElementById('progressBar4');
        const statsContainer = document.getElementById('statsContainer4');
        progressContainer.classList.remove('d-none');
        statsContainer.classList.add('d-none');
        progressBar.classList.remove('bg-success');
        progressBar.classList.add('progress-bar-animated');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        const total = 20000;
        const data = Array.from({ length: total }, () => ({
            temperature: 15 + Math.random() * 30,
            humidity: 30 + Math.random() * 70
        }));

        if (this.worker) {
            this.worker.terminate();
        }
        this.worker = new Worker('worker.js');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando en Worker...';

        this.worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
                progressBar.style.width = msg.progress + '%';
                progressBar.textContent = msg.progress + '%';
            } else if (msg.type === 'result') {
                const s = msg.stats;
                document.getElementById('avgTemp4').textContent = s.avgTemp + '°C';
                document.getElementById('avgHum4').textContent = s.avgHum + '%';
                document.getElementById('maxTemp4').textContent = s.maxTemp + '°C';
                document.getElementById('maxHum4').textContent = s.maxHum + '%';
                document.getElementById('minTemp4').textContent = s.minTemp + '°C';
                document.getElementById('minHum4').textContent = s.minHum + '%';
                statsContainer.classList.remove('d-none');
                progressBar.classList.remove('progress-bar-animated');
                progressBar.style.width = '100%';
                progressBar.textContent = 'Completado';
                progressBar.classList.add('bg-success');
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Procesado';
                this.worker.terminate();
                this.worker = null;
                this.completeLevel(4);
            }
        };

        this.worker.onerror = (error) => {
            console.error('Worker level 4 error:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-gear-fill"></i> Reintentar Procesamiento';
            progressBar.classList.remove('progress-bar-animated');
            this.showAlert('No se pudieron procesar los datos del nivel 4.', 'danger');
            this.worker.terminate();
            this.worker = null;
        };

        this.worker.postMessage({ type: 'level4', data });
    },

    // LEVEL 5
    processLevel5() {
        const btn = document.getElementById('processLevel5Btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generando 250,000 registros...';

        const progressContainer = document.getElementById('progressContainer5');
        const progressBar = document.getElementById('progressBar5');
        progressContainer.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        const total = 250000;
        const data = [];

        setTimeout(() => {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

            for (let i = 0; i < total; i++) {
                let temp = 10 + Math.random() * 35;
                let hum = 20 + Math.random() * 80;
                let pres = 980 + Math.random() * 60;

                if (Math.random() < 0.05) {
                    temp = -Math.random() * 10;
                }
                if (Math.random() < 0.05) {
                    hum = -Math.random() * 10;
                }
                if (Math.random() < 0.05) {
                    pres = -Math.random() * 10;
                }

                data.push({ temperature: temp, humidity: hum, pressure: pres });
            }

            this.level5Data = data;

            this.worker = new Worker('worker.js');

            this.worker.onmessage = (e) => {
                const msg = e.data;
                if (msg.type === 'progress') {
                    progressBar.style.width = msg.progress + '%';
                    progressBar.textContent = msg.progress + '%';
                } else if (msg.type === 'result') {
                    const s = msg.stats;
                    document.getElementById('avgTemp5').textContent = s.avgTemp + 'C';
                    document.getElementById('avgHum5').textContent = s.avgHum + '%';
                    document.getElementById('avgPres5').textContent = s.avgPres + ' hPa';
                    document.getElementById('medianTemp5').textContent = s.medianTemp + 'C';
                    document.getElementById('maxHum5').textContent = s.maxHum + '%';
                    document.getElementById('maxPres5').textContent = s.maxPres + ' hPa';
                    document.getElementById('stdDevTemp5').textContent = s.stdDevTemp;
                    document.getElementById('stdDevHum5').textContent = s.stdDevHum;
                    document.getElementById('stdDevPres5').textContent = s.stdDevPres;
                    document.getElementById('topTemps5').textContent = s.top10Temps.join(', ');
                    document.getElementById('topPress5').textContent = s.top10Press.join(', ');
                    document.getElementById('validCount5').textContent = s.validCount.toLocaleString();
                    document.getElementById('qualityValid5').textContent = s.validCount.toLocaleString();
                    document.getElementById('qualityInvalid5').textContent = (s.totalCount - s.validCount).toLocaleString();
                    document.getElementById('qualityBadTemp5').textContent = s.invalidTemp.toLocaleString();
                    document.getElementById('qualityBadHum5').textContent = s.invalidHum.toLocaleString();
                    document.getElementById('qualityBadPres5').textContent = s.invalidPres.toLocaleString();
                    document.getElementById('qualityPct5').textContent = (s.validCount / s.totalCount * 100).toFixed(1) + '%';

                    this.renderScatterPlot(s.scatterSample);
                    this.renderHistogram(s.tempDistribution);
                    this.renderSampleTable(s.sampleRecords);

                    document.getElementById('statsContainer5').classList.remove('d-none');
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.style.width = '100%';
                    progressBar.textContent = 'Completado';
                    progressBar.classList.add('bg-success');
                    btn.innerHTML = '<i class="bi bi-check-circle"></i> Procesado';
                    this.level5Stats = s;
                    this.completeLevel(5);
                }
            };

            this.worker.postMessage({ type: 'level5', data });
        }, 100);
    },

    renderScatterPlot(samples) {
        const canvas = document.getElementById('scatterCanvas5');
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, w, h);

        let minT = Infinity, maxT = -Infinity;
        let minH = Infinity, maxH = -Infinity;
        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (s.t < minT) minT = s.t;
            if (s.t > maxT) maxT = s.t;
            if (s.h < minH) minH = s.h;
            if (s.h > maxH) maxH = s.h;
        }

        const pad = 45;
        const plotW = w - pad * 2;
        const plotH = h - pad * 2;

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const x = pad + ((s.t - minT) / (maxT - minT || 1)) * plotW;
            const y = pad + plotH - ((s.h - minH) / (maxH - minH || 1)) * plotH;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = s.v ? '#28a745' : '#dc3545';
            ctx.fill();
        }

        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Temperatura', w / 2, h - 5);
        ctx.save();
        ctx.translate(12, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Humedad', 0, 0);
        ctx.restore();

        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(minT.toFixed(1), pad - 4, h - pad + 3);
        ctx.fillText(maxT.toFixed(1), pad + plotW, h - pad + 3);
        ctx.textAlign = 'center';
        ctx.fillText(maxH.toFixed(1), pad - 4, pad + 8);
        ctx.fillText(minH.toFixed(1), pad - 4, h - pad + 3);

        ctx.fillStyle = '#28a745';
        ctx.textAlign = 'left';
        ctx.font = '9px sans-serif';
        ctx.fillRect(pad, h - pad + 8, 8, 8);
        ctx.fillText(' Validos', pad + 10, h - pad + 16);
        ctx.fillStyle = '#dc3545';
        ctx.fillRect(pad + 70, h - pad + 8, 8, 8);
        ctx.fillText(' Invalidos', pad + 80, h - pad + 16);
    },

    renderHistogram(dist) {
        const canvas = document.getElementById('histogramCanvas5');
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, w, h);

        const labels = ['<0', '0-10', '10-15', '15-20', '20-25', '25-30', '30-35', '35+'];
        const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997', '#17a2b8', '#007bff', '#6f42c1'];
        const barCount = dist.length;
        const pad = 35;
        const plotW = w - pad * 2;
        const plotH = h - pad * 2;

        let maxVal = 0;
        for (let i = 0; i < dist.length; i++) {
            if (dist[i] > maxVal) maxVal = dist[i];
        }

        const barW = Math.floor(plotW / barCount) - 4;

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();

        for (let i = 0; i < barCount; i++) {
            const barH = (dist[i] / maxVal) * plotH;
            const x = pad + i * (plotW / barCount) + 2;
            const y = h - pad - barH;

            ctx.fillStyle = colors[i];
            ctx.fillRect(x, y, barW, barH);

            ctx.fillStyle = '#666';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + barW / 2, h - pad + 12);

            ctx.fillStyle = '#333';
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText(dist[i].toLocaleString(), x + barW / 2, y - 4);
        }

        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Rango de Temperatura (C)', w / 2, h - 2);
    },

    renderSampleTable(records) {
        const tbody = document.querySelector('#sampleTable5 tbody');
        tbody.innerHTML = '';
        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + r.t + ' C</td><td>' + r.h + '%</td><td>' + r.p + ' hPa</td>';
            tbody.appendChild(tr);
        }
    },

    // EXPORT
    exportJSON() {
        if (!this.level5Stats) {
            this.showAlert('No hay datos para exportar.', 'warning');
            return;
        }
        const jsonStr = JSON.stringify(this.level5Stats, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portal_cuantico_estadisticas.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showAlert('JSON exportado correctamente.', 'success');
    },

    exportData() {
        if (!this.level5Data) {
            this.showAlert('No hay datos para exportar.', 'warning');
            return;
        }
        const validos = this.level5Data.filter(function(d) {
            return d.temperature >= 0 && d.humidity >= 0 && d.pressure >= 0;
        });
        const jsonStr = JSON.stringify(validos, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'datos_validos_250k.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showAlert(validos.length.toLocaleString() + ' registros exportados.', 'success');
    },

    showCompletion() {
        const main = document.querySelector('main');
        main.innerHTML = `
            <div class="card shadow text-center">
                <div class="card-body py-5">
                    <div class="display-1 text-success mb-3"><i class="bi bi-check2-circle"></i></div>
                    <h2 class="mb-3">¡Felicidades!</h2>
                    <p class="lead">Has completado los 5 niveles y recuperado el acceso al sistema.</p>
                    <div class="row justify-content-center mt-4">
                        <div class="col-md-6">
                            <ul class="list-group">
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 1: El Guardián de la Ubicación
                                    <span class="badge bg-success rounded-pill"><i class="bi bi-check2"></i></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 2: El Cartografo Perdido
                                    <span class="badge bg-success rounded-pill"><i class="bi bi-check2"></i></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 3: La Evidencia del Explorador
                                    <span class="badge bg-success rounded-pill"><i class="bi bi-check2"></i></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 4: El Nucleo de Procesamiento
                                    <span class="badge bg-success rounded-pill"><i class="bi bi-check2"></i></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 5: El Portal Cuantico
                                    <span class="badge bg-success rounded-pill"><i class="bi bi-check2"></i></span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-lg mt-4" onclick="localStorage.clear(); location.reload()">
                        <i class="bi bi-arrow-counterclockwise"></i> Jugar de Nuevo
                    </button>
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());