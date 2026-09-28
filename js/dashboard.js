(function () {
    "use strict";

    if (localStorage.getItem("sesionActiva") !== "true") {
        window.location.replace("login.html");
        return;
    }

    const contentRoot = document.getElementById("contentRoot");
    const sectionTitle = document.getElementById("sectionTitle");
    const sectionDescription = document.getElementById("sectionDescription");
    const sectionBreadcrumb = document.getElementById("sectionBreadcrumb");
    const sectionAction = document.getElementById("sectionAction");
    const globalSearch = document.getElementById("globalSearch");
    const recordDialog = document.getElementById("recordDialog");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogContent = document.getElementById("dialogContent");
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    const today = toISODate(new Date());
    let currentSection = "Inicio";
    let toastTimer;

    const areas = {
        "Clínica": ["Dra. Elena Ruiz", "Dr. Mateo Vera"],
        "Psicopedagogía": ["Mgs. Andrea Molina", "Lcda. Sofía Cedeño"],
        "Psicométrica": ["Ps. Carlos Zambrano", "Ps. Valeria Paz"],
        "Refuerzo": ["Mgs. Luis Andrade", "Lcda. Paula Moreira"]
    };

    const areaColors = {
        "Clínica": "#0284c7",
        "Psicopedagogía": "#059669",
        "Psicométrica": "#7c3aed",
        "Refuerzo": "#f59e0b"
    };

    const samplePatients = [
        { id: "demo-1", nombres: "Daniela", apellidos: "Mendoza Ruiz", nombre: "Daniela Mendoza Ruiz", tipoDocumento: "Cédula", cedula: "0952147856", fechaNacimiento: "2003-05-18", sexo: "Femenino", tipoPaciente: "Interno", telefono: "0994125821", correo: "dmendoza@unemi.edu.ec", estado: "Activo", carreraProcedencia: "Ingeniería Industrial" },
        { id: "demo-2", nombres: "Carlos", apellidos: "Paredes León", nombre: "Carlos Paredes León", tipoDocumento: "Cédula", cedula: "0928741963", fechaNacimiento: "2001-11-02", sexo: "Masculino", tipoPaciente: "Interno", telefono: "0983157742", correo: "cparedes@unemi.edu.ec", estado: "Activo", carreraProcedencia: "Psicología" },
        { id: "demo-3", nombres: "Sofía", apellidos: "Torres Vera", nombre: "Sofía Torres Vera", tipoDocumento: "Cédula", cedula: "0945872319", fechaNacimiento: "2011-04-27", sexo: "Femenino", tipoPaciente: "Externo", telefono: "0974126608", correo: "familia.torres@email.com", estado: "Activo", representante: { nombres: "María Vera", cedula: "0912587463", parentesco: "Madre", contacto: "0974126608", documentoPdf: "cedula_representante.pdf" } },
        { id: "demo-4", nombres: "Miguel", apellidos: "Ortega Loor", nombre: "Miguel Ortega Loor", tipoDocumento: "Pasaporte", cedula: "EC1845209", fechaNacimiento: "1998-08-14", sexo: "Masculino", tipoPaciente: "Externo", telefono: "0961124008", correo: "miguel.ortega@email.com", estado: "Inactivo" },
        { id: "demo-5", nombres: "Andrea", apellidos: "Salazar Pico", nombre: "Andrea Salazar Pico", tipoDocumento: "Cédula", cedula: "0958874210", fechaNacimiento: "2004-02-09", sexo: "Femenino", tipoPaciente: "Interno", telefono: "0991036782", correo: "asalazar@unemi.edu.ec", estado: "Activo", carreraProcedencia: "Educación" }
    ];

    const attentionSeries = {
        labels: ["Abr", "May", "Jun", "Jul", "Ago", "Sep"],
        values: {
            "Clínica": [312, 338, 354, 371, 396, 420],
            "Psicopedagogía": [274, 295, 316, 329, 347, 365],
            "Psicométrica": [142, 156, 169, 177, 186, 198],
            "Refuerzo": [196, 207, 224, 238, 251, 265]
        }
    };

    const sectionData = {
        Inicio: { title: "Dashboard", description: "Indicadores transversales de Salud y Desarrollo Humano.", breadcrumb: "Panel principal", action: "Nuevo usuario", icon: "person_add" },
        Usuarios: { title: "Gestión de usuarios", description: "Directorio general de pacientes internos y externos.", breadcrumb: "Usuarios / Directorio", action: "Nuevo usuario", icon: "person_add" },
        Agendamiento: { title: "Agendamiento integrado", description: "Disponibilidad centralizada, citas y notificaciones.", breadcrumb: "Agenda / Calendario", action: "Agendar cita", icon: "event_available" },
        Clínica: { title: "Psicología clínica", description: "Procesos psicológicos, sesiones y documentación técnica del área clínica.", breadcrumb: "Atenciones / Clínica", action: "Nueva atención", icon: "add" },
        Psicopedagógica: { title: "Atención psicopedagógica", description: "Acompañamiento, orientación y seguimiento estudiantil.", breadcrumb: "Atenciones / Psicopedagogía", action: "Nueva atención", icon: "add" },
        Psicométrica: { title: "Evaluación psicométrica", description: "Aplicación y seguimiento de evaluaciones psicométricas.", breadcrumb: "Atenciones / Psicométrica", action: "Nueva evaluación", icon: "add" },
        Refuerzo: { title: "Refuerzo académico", description: "Programas de acompañamiento y refuerzo académico.", breadcrumb: "Atenciones / Refuerzo", action: "Nuevo proceso", icon: "add" },
        Derivaciones: { title: "Derivaciones", description: "Asignaciones y transferencias entre áreas y especialistas.", breadcrumb: "Procesos / Derivaciones", action: "Nueva derivación", icon: "add" },
        Informes: { title: "Informes técnicos", description: "Compilación cualitativa del expediente y anexos de evaluación.", breadcrumb: "Expediente / Informes", action: "Generar PDF", icon: "picture_as_pdf" },
        Reportes: { title: "Reportes", description: "Estadísticas institucionales con filtros cruzados y exportación a Excel.", breadcrumb: "Análisis / Reportes", action: "Exportar Excel", icon: "table_view" },
        Administración: { title: "Administración", description: "Configuración operativa del sistema.", breadcrumb: "Sistema / Administración", action: "Configurar", icon: "settings" }
    };

    const hashSections = {
        inicio: "Inicio",
        usuarios: "Usuarios",
        agendamiento: "Agendamiento",
        clinica: "Clínica",
        psicopedagogica: "Psicopedagógica",
        psicometrica: "Psicométrica",
        refuerzo: "Refuerzo",
        derivaciones: "Derivaciones",
        informes: "Informes",
        reportes: "Reportes",
        administracion: "Administración"
    };

    const dashboardState = {
        view: localStorage.getItem("dashboardVista") || "Jefatura",
        period: "2026-09",
        area: "Todas"
    };

    const directoryState = { query: "", type: "Todos", status: "Todos" };

    const clinicalSectionAreas = {
        "Clínica": "Clínica",
        "Psicopedagógica": "Psicopedagogía",
        "Psicométrica": "Psicométrica",
        "Refuerzo": "Refuerzo"
    };

    let clinicalProcesses;
    let institutionalReports;

    const scheduleState = {
        patientId: "",
        area: "Clínica",
        specialist: areas["Clínica"][0],
        date: today,
        time: "",
        channel: "WhatsApp",
        calendarMode: "month",
        availabilityMode: false,
        rebookingId: null
    };

    function safeParse(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function toISODate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function addDays(dateString, amount) {
        const date = new Date(`${dateString}T12:00:00`);
        date.setDate(date.getDate() + amount);
        return toISODate(date);
    }

    function formatDate(dateString, options) {
        return new Intl.DateTimeFormat("es-EC", options || { day: "2-digit", month: "short", year: "numeric" })
            .format(new Date(`${dateString}T12:00:00`));
    }

    function patientName(patient) {
        return patient.nombre || `${patient.nombres || ""} ${patient.apellidos || ""}`.trim();
    }

    function getPatients() {
        const stored = safeParse("usuarios", []);
        const merged = [...stored, ...samplePatients];
        const seen = new Set();

        return merged.filter(function (patient) {
            const key = String(patient.cedula || patient.id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(function (patient) {
            return {
                ...patient,
                id: String(patient.id || patient.cedula),
                tipoPaciente: patient.tipoPaciente || "Interno",
                tipoDocumento: patient.tipoDocumento || "Cédula",
                estado: patient.estado || "Activo"
            };
        });
    }

    function getAppointments() {
        return safeParse("citas", []).map(function (appointment) {
            return {
                ...appointment,
                patientId: String(appointment.patientId || appointment.pacienteId || ""),
                patientName: appointment.patientName || appointment.pacienteNombre || "Paciente",
                specialist: appointment.specialist || appointment.especialista || "Profesional por asignar",
                date: appointment.date || appointment.fecha,
                time: appointment.time || appointment.hora,
                status: appointment.status || appointment.estado || "Programada"
            };
        });
    }

    function getBlocks() {
        return safeParse("bloquesDisponibilidad", []);
    }

    function seedDemoData() {
        if (!localStorage.getItem("citas")) {
            const demoAppointments = [
                { id: "cita-demo-1", patientId: "demo-1", patientName: "Daniela Mendoza Ruiz", area: "Clínica", specialist: "Dra. Elena Ruiz", date: today, time: "08:00", status: "Programada", channel: "Correo institucional", notified: true },
                { id: "cita-demo-2", patientId: "demo-2", patientName: "Carlos Paredes León", area: "Clínica", specialist: "Dra. Elena Ruiz", date: today, time: "10:15", status: "Programada", channel: "WhatsApp", notified: true },
                { id: "cita-demo-3", patientId: "demo-3", patientName: "Sofía Torres Vera", area: "Psicopedagogía", specialist: "Mgs. Andrea Molina", date: today, time: "14:00", status: "Programada", channel: "WhatsApp", notified: true },
                { id: "cita-demo-4", patientId: "demo-5", patientName: "Andrea Salazar Pico", area: "Psicométrica", specialist: "Ps. Valeria Paz", date: addDays(today, 1), time: "09:30", status: "Programada", channel: "Correo institucional", notified: true },
                { id: "cita-demo-5", patientId: "demo-4", patientName: "Miguel Ortega Loor", area: "Refuerzo", specialist: "Mgs. Luis Andrade", date: addDays(today, 2), time: "15:30", status: "Programada", channel: "WhatsApp", notified: true },
                { id: "cita-demo-6", patientId: "demo-4", patientName: "Miguel Ortega Loor", area: "Clínica", specialist: "Dr. Mateo Vera", date: addDays(today, -3), time: "11:00", status: "Ausente", channel: "WhatsApp", notified: true }
            ];
            localStorage.setItem("citas", JSON.stringify(demoAppointments));
        }

        if (!localStorage.getItem("derivaciones")) {
            localStorage.setItem("derivaciones", JSON.stringify([
                { id: "der-demo-1", patientId: "demo-3", patientName: "Sofía Torres Vera", area: "Clínica", destination: "Psicopedagogía", specialist: "Mgs. Andrea Molina", scope: "Interna", status: "Nueva", date: today },
                { id: "der-demo-2", patientId: "demo-2", patientName: "Carlos Paredes León", area: "Clínica", destination: "Psicométrica", specialist: "Ps. Carlos Zambrano", scope: "Interna", status: "Nueva", date: addDays(today, -1) },
                { id: "der-demo-3", patientId: "demo-4", patientName: "Miguel Ortega Loor", area: "Clínica", destination: "Red externa convenida", specialist: "Centro especializado", scope: "Externa", status: "Remitida", date: addDays(today, -4) }
            ]));
        }

        if (!localStorage.getItem("historialCitas")) {
            localStorage.setItem("historialCitas", JSON.stringify([
                { id: "mov-demo-1", appointmentId: "cita-demo-4", patientId: "demo-5", patientName: "Andrea Salazar Pico", area: "Psicométrica", specialist: "Ps. Valeria Paz", type: "Reagendada", oldDate: addDays(today, -2), oldTime: "08:45", newDate: addDays(today, 1), newTime: "09:30", changedAt: new Date().toISOString() }
            ]));
        }

        if (!localStorage.getItem("notificaciones")) {
            localStorage.setItem("notificaciones", JSON.stringify([
                { id: "not-demo-1", title: "Nueva derivación asignada", detail: "Sofía Torres · Psicopedagogía", date: new Date().toISOString(), read: false },
                { id: "not-demo-2", title: "Agenda actualizada", detail: "2 citas programadas para hoy", date: new Date().toISOString(), read: false }
            ]));
        }
    }

    function showToast(message, tone) {
        toastMessage.textContent = message;
        toast.dataset.tone = tone || "success";
        toast.classList.add("visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            toast.classList.remove("visible");
        }, 3200);
    }

    function setupCurrentUser() {
        const user = safeParse("usuarioActual", { nombre: "Administrador UNEMI", rol: "Jefe de Área" });
        const names = String(user.nombre || "Administrador UNEMI").split(/\s+/).filter(Boolean);
        const initials = names.slice(0, 2).map(function (name) { return name[0]; }).join("").toUpperCase();
        document.getElementById("currentUserName").textContent = user.nombre || "Administrador UNEMI";
        document.getElementById("currentUserRole").textContent = dashboardState.view === "Jefatura" ? "Vista de Jefatura" : "Vista de Especialista";
        document.getElementById("userInitials").textContent = initials;
    }

    function metricCard(icon, label, value, detail, tone) {
        return `
            <article class="kpi-card kpi-${tone}">
                <div class="kpi-heading">
                    <span class="kpi-icon material-symbols-outlined" aria-hidden="true">${icon}</span>
                    <span>${escapeHTML(label)}</span>
                </div>
                <strong>${escapeHTML(value)}</strong>
                <small>${escapeHTML(detail)}</small>
            </article>
        `;
    }

    function getFilteredMetrics() {
        const base = dashboardState.period === "2026-07"
            ? { attentions: 1015, scheduled: 71, active: 286, closed: 729, referrals: 151 }
            : dashboardState.period === "2026-08"
                ? { attentions: 1136, scheduled: 79, active: 298, closed: 838, referrals: 169 }
                : { attentions: 1248, scheduled: 86, active: 312, closed: 936, referrals: 186 };
        const factors = { "Clínica": 0.34, "Psicopedagogía": 0.29, "Psicométrica": 0.16, "Refuerzo": 0.21 };
        const factor = factors[dashboardState.area] || 1;

        return Object.fromEntries(Object.entries(base).map(function (entry) {
            return [entry[0], Math.round(entry[1] * factor)];
        }));
    }

    function buildBarChart(selectedArea) {
        const visibleAreas = selectedArea === "Todas" ? Object.keys(areas) : [selectedArea];
        const maxValue = Math.max(...visibleAreas.flatMap(function (area) { return attentionSeries.values[area]; }));

        const bars = attentionSeries.labels.map(function (label, monthIndex) {
            return `
                <div class="chart-column">
                    <div class="bar-cluster">
                        ${visibleAreas.map(function (area) {
                            const value = attentionSeries.values[area][monthIndex];
                            const height = Math.max(8, Math.round((value / maxValue) * 100));
                            return `<span class="bar-fill" title="${escapeHTML(area)}: ${value}" style="height:${height}%; background:${areaColors[area]}"></span>`;
                        }).join("")}
                    </div>
                    <span class="chart-label">${label}</span>
                </div>
            `;
        }).join("");

        return `
            <article class="panel chart-panel chart-wide">
                <div class="panel-heading">
                    <div>
                        <span class="eyebrow">Tendencia semestral</span>
                        <h2>Evolución mensual de atenciones</h2>
                    </div>
                    <span class="status-badge positive"><span class="material-symbols-outlined">trending_up</span> 12,4%</span>
                </div>
                <div class="chart-legend">
                    ${visibleAreas.map(function (area) {
                        return `<span><i style="background:${areaColors[area]}"></i>${escapeHTML(area)}</span>`;
                    }).join("")}
                </div>
                <div class="bar-chart" role="img" aria-label="Atenciones mensuales por área">${bars}</div>
            </article>
        `;
    }

    function donutPanel(title, centerLabel, segments) {
        const total = segments.reduce(function (sum, segment) { return sum + segment.value; }, 0) || 1;
        let current = 0;
        const gradient = segments.map(function (segment) {
            const start = current;
            current += (segment.value / total) * 100;
            return `${segment.color} ${start}% ${current}%`;
        }).join(", ");

        return `
            <article class="panel donut-panel">
                <div class="panel-heading compact"><h2>${escapeHTML(title)}</h2></div>
                <div class="donut-content">
                    <div class="donut" style="background:conic-gradient(${gradient})">
                        <div><strong>${escapeHTML(centerLabel)}</strong><span>Total</span></div>
                    </div>
                    <div class="donut-legend">
                        ${segments.map(function (segment) {
                            const percentage = Math.round((segment.value / total) * 100);
                            return `<div><span><i style="background:${segment.color}"></i>${escapeHTML(segment.label)}</span><strong>${percentage}%</strong></div>`;
                        }).join("")}
                    </div>
                </div>
            </article>
        `;
    }

    function dashboardFilters() {
        const isSpecialist = dashboardState.view === "Especialista";
        return `
            <div class="dashboard-toolbar">
                <div class="segmented-control" aria-label="Tipo de vista">
                    <button type="button" data-dashboard-view="Jefatura" class="${!isSpecialist ? "active" : ""}">Jefatura</button>
                    <button type="button" data-dashboard-view="Especialista" class="${isSpecialist ? "active" : ""}">Especialista</button>
                </div>
                <div class="filter-group">
                    <label>Período
                        <select id="periodFilter">
                            <option value="2026-07" ${dashboardState.period === "2026-07" ? "selected" : ""}>Julio 2026</option>
                            <option value="2026-08" ${dashboardState.period === "2026-08" ? "selected" : ""}>Agosto 2026</option>
                            <option value="2026-09" ${dashboardState.period === "2026-09" ? "selected" : ""}>Septiembre 2026</option>
                        </select>
                    </label>
                    <label>Área
                        <select id="areaFilter" ${isSpecialist ? "disabled" : ""}>
                            <option value="Todas">Todas las áreas</option>
                            ${Object.keys(areas).map(function (area) {
                                return `<option value="${escapeHTML(area)}" ${dashboardState.area === area ? "selected" : ""}>${escapeHTML(area)}</option>`;
                            }).join("")}
                        </select>
                    </label>
                </div>
            </div>
        `;
    }

    function renderDashboard() {
        if (dashboardState.view === "Especialista") {
            dashboardState.area = "Clínica";
            renderSpecialistDashboard();
            return;
        }

        const metrics = getFilteredMetrics();
        const patients = getPatients();
        const internal = patients.filter(function (patient) { return patient.tipoPaciente === "Interno"; }).length;
        const women = patients.filter(function (patient) { return patient.sexo === "Femenino"; }).length;
        const men = patients.filter(function (patient) { return patient.sexo === "Masculino"; }).length;
        const active = patients.filter(function (patient) { return patient.estado === "Activo"; }).length;

        contentRoot.innerHTML = `
            ${dashboardFilters()}
            <section class="view-banner">
                <div>
                    <span class="eyebrow">Vista transversal</span>
                    <h2>Panorama institucional</h2>
                    <p>Datos consolidados de ${dashboardState.area === "Todas" ? "todas las áreas" : dashboardState.area.toLowerCase()} para el período seleccionado.</p>
                </div>
                <span class="view-mark material-symbols-outlined" aria-hidden="true">monitoring</span>
            </section>
            <div class="kpi-grid">
                ${metricCard("group", "Total de atenciones", metrics.attentions.toLocaleString("es-EC"), "+12% frente al período anterior", "blue")}
                ${metricCard("event_available", "Citas programadas", metrics.scheduled, "18 confirmadas para hoy", "teal")}
                ${metricCard("pending_actions", "Procesos activos", metrics.active, "Seguimiento interdisciplinario", "violet")}
                ${metricCard("task_alt", "Procesos cerrados", metrics.closed, "75% de resolución", "green")}
                ${metricCard("sync_alt", "Derivaciones", metrics.referrals, "66 pendientes de recepción", "orange")}
                ${metricCard("school", "Pacientes UNEMI", `${Math.round((internal / patients.length) * 100)}%`, `${internal} internos · ${patients.length - internal} externos`, "navy")}
            </div>
            <div class="analytics-grid">
                ${buildBarChart(dashboardState.area)}
                ${donutPanel("Internos y externos", patients.length, [
                    { label: "Internos UNEMI", value: internal, color: "#0284c7" },
                    { label: "Externos", value: patients.length - internal, color: "#f59e0b" }
                ])}
                ${donutPanel("Distribución por género", patients.length, [
                    { label: "Femenino", value: women, color: "#db2777" },
                    { label: "Masculino", value: men, color: "#2563eb" },
                    { label: "Otro", value: Math.max(0, patients.length - women - men), color: "#14b8a6" }
                ])}
                ${donutPanel("Estado de pacientes", patients.length, [
                    { label: "Activos", value: active, color: "#059669" },
                    { label: "Inactivos", value: patients.length - active, color: "#cbd5e1" }
                ])}
            </div>
        `;
        setupDashboardFilters();
    }

    function renderSpecialistDashboard() {
        const specialist = "Dra. Elena Ruiz";
        const appointments = getAppointments().filter(function (appointment) {
            return appointment.specialist === specialist && appointment.date === today;
        }).sort(function (a, b) { return a.time.localeCompare(b.time); });
        const referrals = safeParse("derivaciones", []).filter(function (referral) {
            return referral.destination === "Clínica" || referral.specialist === specialist;
        });
        const activePatients = new Set(getAppointments().filter(function (appointment) {
            return appointment.specialist === specialist && appointment.status === "Programada";
        }).map(function (appointment) { return appointment.patientId; })).size;

        contentRoot.innerHTML = `
            ${dashboardFilters()}
            <section class="view-banner specialist-banner">
                <div class="specialist-profile">
                    <span class="avatar large">ER</span>
                    <div>
                        <span class="eyebrow">Vista de Especialista · Clínica</span>
                        <h2>Dra. Elena Ruiz</h2>
                        <p>Tu agenda, pacientes en curso y derivaciones asignadas.</p>
                    </div>
                </div>
                <span class="status-badge available"><i></i> Disponible hoy</span>
            </section>
            <div class="kpi-grid specialist-kpis">
                ${metricCard("today", "Mis citas de hoy", appointments.length, `${appointments.filter(function (item) { return item.status === "Programada"; }).length} programadas`, "blue")}
                ${metricCard("clinical_notes", "Pacientes en curso", activePatients || 24, "4 requieren seguimiento", "green")}
                ${metricCard("notification_important", "Nuevas derivaciones", referrals.length || 2, "Asignadas a tu bandeja", "orange")}
            </div>
            <div class="specialist-grid">
                <article class="panel agenda-panel">
                    <div class="panel-heading">
                        <div><span class="eyebrow">${formatDate(today, { weekday: "long", day: "numeric", month: "long" })}</span><h2>Citas del día</h2></div>
                        <button class="text-button" type="button" data-go-schedule>Ver agenda</button>
                    </div>
                    <div class="agenda-list">
                        ${appointments.length ? appointments.map(function (appointment) {
                            return `<div class="agenda-item"><time>${escapeHTML(appointment.time)}</time><span class="agenda-line"></span><div><strong>${escapeHTML(appointment.patientName)}</strong><small>${escapeHTML(appointment.area)} · ${escapeHTML(appointment.status)}</small></div><span class="status-badge programmed">Programada</span></div>`;
                        }).join("") : `<div class="empty-state compact"><span class="material-symbols-outlined">event_available</span><p>No tienes citas programadas para hoy.</p></div>`}
                    </div>
                </article>
                <article class="panel referral-panel">
                    <div class="panel-heading compact"><div><span class="eyebrow">Bandeja personal</span><h2>Derivaciones nuevas</h2></div></div>
                    <div class="referral-list">
                        ${(referrals.length ? referrals : safeParse("derivaciones", []).slice(0, 2)).map(function (referral) {
                            return `<div class="referral-item"><span class="material-symbols-outlined">forward_to_inbox</span><div><strong>${escapeHTML(referral.patientName)}</strong><small>Desde ${escapeHTML(referral.area)} · ${formatDate(referral.date)}</small></div><span class="status-badge new">Nueva</span></div>`;
                        }).join("")}
                    </div>
                </article>
                ${buildBarChart("Clínica")}
            </div>
        `;
        setupDashboardFilters();
        const goSchedule = contentRoot.querySelector("[data-go-schedule]");
        if (goSchedule) goSchedule.addEventListener("click", function () { selectSection("Agendamiento"); });
    }

    function setupDashboardFilters() {
        contentRoot.querySelectorAll("[data-dashboard-view]").forEach(function (button) {
            button.addEventListener("click", function () {
                dashboardState.view = button.dataset.dashboardView;
                dashboardState.area = dashboardState.view === "Especialista" ? "Clínica" : "Todas";
                localStorage.setItem("dashboardVista", dashboardState.view);
                setupCurrentUser();
                renderDashboard();
            });
        });

        document.getElementById("periodFilter").addEventListener("change", function (event) {
            dashboardState.period = event.target.value;
            renderDashboard();
        });

        document.getElementById("areaFilter").addEventListener("change", function (event) {
            dashboardState.area = event.target.value;
            renderDashboard();
        });
    }

    function renderUsers() {
        contentRoot.innerHTML = `
            <section class="directory-toolbar">
                <label class="directory-search">
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input id="directorySearch" type="search" placeholder="Buscar por nombre, cédula o pasaporte" value="${escapeHTML(directoryState.query)}">
                </label>
                <label>Clasificación
                    <select id="patientTypeFilter">
                        <option value="Todos">Todos</option>
                        <option value="Interno" ${directoryState.type === "Interno" ? "selected" : ""}>Internos</option>
                        <option value="Externo" ${directoryState.type === "Externo" ? "selected" : ""}>Externos</option>
                    </select>
                </label>
                <label>Estado
                    <select id="patientStatusFilter">
                        <option value="Todos">Todos</option>
                        <option value="Activo" ${directoryState.status === "Activo" ? "selected" : ""}>Activos</option>
                        <option value="Inactivo" ${directoryState.status === "Inactivo" ? "selected" : ""}>Inactivos</option>
                    </select>
                </label>
                <span class="directory-count" id="directoryCount"></span>
            </section>
            <section class="panel directory-panel">
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Paciente</th><th>Documento</th><th>Tipo</th><th>Contacto</th><th>Estado</th><th><span class="sr-only">Opciones</span></th></tr></thead>
                        <tbody id="directoryRows"></tbody>
                    </table>
                </div>
            </section>
        `;

        const search = document.getElementById("directorySearch");
        const type = document.getElementById("patientTypeFilter");
        const status = document.getElementById("patientStatusFilter");
        search.addEventListener("input", function (event) { directoryState.query = event.target.value; renderDirectoryRows(); });
        type.addEventListener("change", function (event) { directoryState.type = event.target.value; renderDirectoryRows(); });
        status.addEventListener("change", function (event) { directoryState.status = event.target.value; renderDirectoryRows(); });
        document.getElementById("directoryRows").addEventListener("click", handlePatientAction);
        renderDirectoryRows();
    }

    function renderDirectoryRows() {
        const query = directoryState.query.trim().toLowerCase();
        const patients = getPatients().filter(function (patient) {
            const matchesQuery = !query || `${patientName(patient)} ${patient.cedula}`.toLowerCase().includes(query);
            const matchesType = directoryState.type === "Todos" || patient.tipoPaciente === directoryState.type;
            const matchesStatus = directoryState.status === "Todos" || patient.estado === directoryState.status;
            return matchesQuery && matchesType && matchesStatus;
        });

        document.getElementById("directoryCount").textContent = `${patients.length} inscritos`;
        document.getElementById("directoryRows").innerHTML = patients.length ? patients.map(function (patient) {
            const name = patientName(patient);
            const initials = name.split(/\s+/).slice(0, 2).map(function (part) { return part[0]; }).join("").toUpperCase();
            return `
                <tr>
                    <td><div class="patient-cell"><span class="patient-avatar">${escapeHTML(initials)}</span><div><strong>${escapeHTML(name)}</strong><small>${escapeHTML(patient.sexo || "Sin especificar")} · ${calculateAge(patient.fechaNacimiento)} años</small></div></div></td>
                    <td><strong class="document-number">${escapeHTML(patient.cedula)}</strong><small>${escapeHTML(patient.tipoDocumento)}</small></td>
                    <td><span class="type-badge ${patient.tipoPaciente.toLowerCase()}">${escapeHTML(patient.tipoPaciente)}</span></td>
                    <td><span>${escapeHTML(patient.telefono || "Sin teléfono")}</span><small>${escapeHTML(patient.correo || "Sin correo")}</small></td>
                    <td><span class="status-badge ${patient.estado.toLowerCase()}"><i></i>${escapeHTML(patient.estado)}</span></td>
                    <td>
                        <details class="row-menu">
                            <summary aria-label="Opciones para ${escapeHTML(name)}"><span class="material-symbols-outlined">more_vert</span></summary>
                            <div>
                                <button type="button" data-patient-action="view" data-patient-id="${escapeHTML(patient.id)}"><span class="material-symbols-outlined">folder_open</span>Ver expediente</button>
                                <button type="button" data-patient-action="schedule" data-patient-id="${escapeHTML(patient.id)}"><span class="material-symbols-outlined">event_available</span>Agendar cita</button>
                                <button type="button" data-patient-action="reschedule" data-patient-id="${escapeHTML(patient.id)}"><span class="material-symbols-outlined">edit_calendar</span>Reagendar</button>
                                <button type="button" data-patient-action="refer" data-patient-id="${escapeHTML(patient.id)}"><span class="material-symbols-outlined">sync_alt</span>Derivar</button>
                                <button type="button" data-patient-action="history" data-patient-id="${escapeHTML(patient.id)}"><span class="material-symbols-outlined">history</span>Historial</button>
                            </div>
                        </details>
                    </td>
                </tr>
            `;
        }).join("") : `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">person_search</span><h3>Sin resultados</h3><p>Prueba con otro nombre, documento o filtro.</p></div></td></tr>`;
    }

    function calculateAge(dateString) {
        if (!dateString) return "--";
        const birth = new Date(`${dateString}T12:00:00`);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const monthDifference = now.getMonth() - birth.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birth.getDate())) age -= 1;
        return age;
    }

    function handlePatientAction(event) {
        const button = event.target.closest("[data-patient-action]");
        if (!button) return;
        const patient = getPatients().find(function (item) { return item.id === button.dataset.patientId; });
        if (!patient) return;
        const actionName = button.dataset.patientAction;

        if (actionName === "view" || actionName === "history") {
            showPatientDialog(patient, actionName);
            return;
        }

        if (actionName === "schedule") {
            scheduleState.patientId = patient.id;
            scheduleState.rebookingId = null;
            selectSection("Agendamiento");
            return;
        }

        if (actionName === "reschedule") {
            const appointment = getAppointments().find(function (item) { return item.patientId === patient.id && item.status === "Programada"; });
            if (!appointment) {
                showToast("Este paciente no tiene una cita programada para reagendar.", "warning");
                return;
            }
            Object.assign(scheduleState, { patientId: patient.id, area: appointment.area, specialist: appointment.specialist, date: appointment.date, time: appointment.time, rebookingId: appointment.id });
            selectSection("Agendamiento");
            return;
        }

        if (actionName === "refer") {
            const referrals = safeParse("derivaciones", []);
            referrals.unshift({ id: `der-${Date.now()}`, patientId: patient.id, patientName: patientName(patient), area: "Clínica", destination: "Psicopedagogía", specialist: "Mgs. Andrea Molina", scope: "Interna", status: "Nueva", date: today });
            localStorage.setItem("derivaciones", JSON.stringify(referrals));
            addNotification("Derivación generada", `${patientName(patient)} · Psicopedagogía`);
            showToast("Paciente derivado a Psicopedagogía.");
        }
    }

    function showPatientDialog(patient, mode) {
        const appointments = getAppointments().filter(function (item) { return item.patientId === patient.id; });
        dialogTitle.textContent = mode === "history" ? `Historial de ${patientName(patient)}` : patientName(patient);
        dialogContent.innerHTML = mode === "history"
            ? `<div class="history-list">${appointments.length ? appointments.map(function (appointment) { return `<div><span class="material-symbols-outlined">event_note</span><div><strong>${formatDate(appointment.date)} · ${escapeHTML(appointment.time)}</strong><p>${escapeHTML(appointment.area)} con ${escapeHTML(appointment.specialist)}</p></div><span class="status-badge programmed">${escapeHTML(appointment.status)}</span></div>`; }).join("") : `<div class="empty-state compact"><span class="material-symbols-outlined">history</span><p>No hay atenciones registradas todavía.</p></div>`}</div>`
            : `<div class="record-grid"><div><span>Documento</span><strong>${escapeHTML(patient.tipoDocumento)} · ${escapeHTML(patient.cedula)}</strong></div><div><span>Clasificación</span><strong>${escapeHTML(patient.tipoPaciente)}</strong></div><div><span>Fecha de nacimiento</span><strong>${formatDate(patient.fechaNacimiento)} · ${calculateAge(patient.fechaNacimiento)} años</strong></div><div><span>Contacto</span><strong>${escapeHTML(patient.telefono || "No registrado")}</strong></div><div><span>Correo</span><strong>${escapeHTML(patient.correo || "No registrado")}</strong></div><div><span>Estado</span><strong>${escapeHTML(patient.estado)}</strong></div></div>${patient.representante ? `<section class="record-representative"><span class="eyebrow">Representante legal</span><strong>${escapeHTML(patient.representante.nombres)}</strong><p>${escapeHTML(patient.representante.parentesco)} · ${escapeHTML(patient.representante.contacto)}</p><span class="file-chip"><span class="material-symbols-outlined">picture_as_pdf</span>${escapeHTML(patient.representante.documentoPdf || "Documento registrado")}</span></section>` : ""}`;
        recordDialog.showModal();
    }

    function getAvailableHours(dateString) {
        const day = new Date(`${dateString}T12:00:00`).getDay();
        if (day === 0 || day === 6) return [];
        return ["08:00", "08:45", "09:30", "10:15", "11:00", "14:00", "14:45", "15:30", "16:15"];
    }

    function getSlotState(hour) {
        const busy = getAppointments().some(function (appointment) {
            return appointment.id !== scheduleState.rebookingId && appointment.specialist === scheduleState.specialist && appointment.date === scheduleState.date && appointment.time === hour && appointment.status === "Programada";
        });
        const blocked = getBlocks().some(function (block) {
            return block.specialist === scheduleState.specialist && block.date === scheduleState.date && block.time === hour;
        });
        return busy ? "busy" : blocked ? "blocked" : "free";
    }

    function renderCalendar() {
        if (scheduleState.calendarMode === "week") return renderWeekCalendar();
        const selected = new Date(`${scheduleState.date}T12:00:00`);
        const year = selected.getFullYear();
        const month = selected.getMonth();
        const firstDay = new Date(year, month, 1);
        const offset = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const appointments = getAppointments();
        let cells = "";

        for (let index = 0; index < 42; index += 1) {
            const day = index - offset + 1;
            if (day < 1 || day > daysInMonth) {
                cells += `<span class="calendar-day muted" aria-hidden="true"></span>`;
                continue;
            }
            const date = toISODate(new Date(year, month, day));
            const count = appointments.filter(function (item) { return item.date === date; }).length;
            const isPast = date < today;
            cells += `<button type="button" class="calendar-day ${date === scheduleState.date ? "selected" : ""} ${date === today ? "today" : ""} ${isPast ? "past" : ""}" data-calendar-date="${date}" ${isPast ? "disabled" : ""}><span>${day}</span>${count ? `<i>${count}</i>` : ""}</button>`;
        }

        return `<div class="calendar-month-label">${new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(selected)}</div><div class="calendar-weekdays"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div><div class="month-grid">${cells}</div>`;
    }

    function renderWeekCalendar() {
        const selected = new Date(`${scheduleState.date}T12:00:00`);
        const mondayOffset = (selected.getDay() + 6) % 7;
        const monday = new Date(selected);
        monday.setDate(selected.getDate() - mondayOffset);
        const appointments = getAppointments();
        const days = Array.from({ length: 7 }, function (_, index) {
            const dateObject = new Date(monday);
            dateObject.setDate(monday.getDate() + index);
            const date = toISODate(dateObject);
            const count = appointments.filter(function (item) { return item.date === date; }).length;
            const isPast = date < today;
            return `<button type="button" class="week-day ${date === scheduleState.date ? "selected" : ""} ${isPast ? "past" : ""}" data-calendar-date="${date}" ${isPast ? "disabled" : ""}><span>${new Intl.DateTimeFormat("es-EC", { weekday: "short" }).format(dateObject)}</span><strong>${dateObject.getDate()}</strong><small>${count ? `${count} citas` : "Libre"}</small></button>`;
        }).join("");
        return `<div class="calendar-month-label">Semana del ${formatDate(toISODate(monday), { day: "numeric", month: "long" })}</div><div class="week-grid">${days}</div>`;
    }

    function renderSlots() {
        const hours = getAvailableHours(scheduleState.date);
        if (!hours.length) return `<div class="empty-state compact"><span class="material-symbols-outlined">event_busy</span><p>No existe jornada configurada para fines de semana.</p></div>`;
        const visibleHours = scheduleState.availabilityMode
            ? hours
            : hours.filter(function (hour) { return getSlotState(hour) === "free"; });
        if (!visibleHours.length) return `<div class="empty-state compact"><span class="material-symbols-outlined">event_busy</span><p>No quedan horarios libres para este profesional en la fecha seleccionada.</p></div>`;
        return `<div class="slot-grid">${visibleHours.map(function (hour) {
            const state = getSlotState(hour);
            const selected = scheduleState.time === hour;
            const disabled = !scheduleState.availabilityMode && state !== "free";
            const label = state === "busy" ? "Ocupado" : state === "blocked" ? "Bloqueado" : "Disponible";
            return `<button type="button" class="time-slot ${state} ${selected ? "selected" : ""}" data-slot-time="${hour}" ${disabled ? "disabled" : ""}><strong>${hour}</strong><small>${label}</small></button>`;
        }).join("")}</div>`;
    }

    function renderScheduling() {
        const patients = getPatients();
        const specialists = areas[scheduleState.area];
        if (!specialists.includes(scheduleState.specialist)) scheduleState.specialist = specialists[0];
        const upcoming = getAppointments().filter(function (item) { return item.date >= today && item.status === "Programada"; }).sort(function (a, b) { return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`); }).slice(0, 5);

        contentRoot.innerHTML = `
            ${scheduleState.rebookingId ? `<div class="inline-alert warning"><span class="material-symbols-outlined">edit_calendar</span><div><strong>Modo reagendamiento</strong><p>Selecciona una nueva fecha y un horario libre para actualizar la cita.</p></div><button type="button" id="cancelReschedule">Cancelar</button></div>` : ""}
            <div class="schedule-layout">
                <section class="panel appointment-form-panel">
                    <div class="panel-heading"><div><span class="eyebrow">Nueva cita</span><h2>Datos del agendamiento</h2></div><span class="step-badge">1</span></div>
                    <form id="appointmentForm" class="appointment-form">
                        <label class="field full">Paciente
                            <select id="appointmentPatient" required>
                                <option value="">Selecciona un paciente</option>
                                ${patients.map(function (patient) { return `<option value="${escapeHTML(patient.id)}" ${scheduleState.patientId === patient.id ? "selected" : ""}>${escapeHTML(patientName(patient))} · ${escapeHTML(patient.cedula)}</option>`; }).join("")}
                            </select>
                        </label>
                        <label class="field">Área requerida
                            <select id="appointmentArea">${Object.keys(areas).map(function (area) { return `<option value="${escapeHTML(area)}" ${scheduleState.area === area ? "selected" : ""}>${escapeHTML(area)}</option>`; }).join("")}</select>
                        </label>
                        <label class="field">Profesional
                            <select id="appointmentSpecialist">${specialists.map(function (specialist) { return `<option value="${escapeHTML(specialist)}" ${scheduleState.specialist === specialist ? "selected" : ""}>${escapeHTML(specialist)}</option>`; }).join("")}</select>
                        </label>
                        <label class="field">Fecha
                            <input id="appointmentDate" type="date" min="${today}" value="${scheduleState.date}" required>
                        </label>
                        <label class="field">Notificar por
                            <select id="notificationChannel">
                                <option value="WhatsApp" ${scheduleState.channel === "WhatsApp" ? "selected" : ""}>WhatsApp</option>
                                <option value="Correo institucional" ${scheduleState.channel === "Correo institucional" ? "selected" : ""}>Correo institucional</option>
                            </select>
                        </label>
                        <div class="selected-slot full"><span class="material-symbols-outlined">schedule</span><div><small>Horario seleccionado</small><strong>${scheduleState.time || "Elige un horario disponible"}</strong></div></div>
                        <button class="primary-button full submit-appointment" type="submit"><span class="material-symbols-outlined">event_available</span>${scheduleState.rebookingId ? "Confirmar reagendamiento" : "Guardar y notificar"}</button>
                        <p class="form-footnote full"><span class="material-symbols-outlined">picture_as_pdf</span>Al confirmar se descargará automáticamente la constancia en PDF.</p>
                    </form>
                </section>

                <section class="panel calendar-panel">
                    <div class="panel-heading">
                        <div><span class="eyebrow">Disponibilidad centralizada</span><h2>Calendario</h2></div>
                        <div class="segmented-control small"><button type="button" data-calendar-mode="month" class="${scheduleState.calendarMode === "month" ? "active" : ""}">Mes</button><button type="button" data-calendar-mode="week" class="${scheduleState.calendarMode === "week" ? "active" : ""}">Semana</button></div>
                    </div>
                    <div class="calendar-shell" id="calendarShell">${renderCalendar()}</div>
                    <div class="availability-heading">
                        <div><h3>Horarios de ${escapeHTML(scheduleState.specialist)}</h3><p>${formatDate(scheduleState.date, { weekday: "long", day: "numeric", month: "long" })}</p></div>
                        <label class="switch-control"><input id="availabilityMode" type="checkbox" ${scheduleState.availabilityMode ? "checked" : ""}><span></span><b>Gestionar bloqueos</b></label>
                    </div>
                    <div id="slotContainer">${renderSlots()}</div>
                    <div class="slot-legend"><span><i class="free"></i>Libre</span><span><i class="busy"></i>Ocupado</span><span><i class="blocked"></i>Bloqueado</span></div>
                </section>
            </div>

            <section class="panel upcoming-panel">
                <div class="panel-heading"><div><span class="eyebrow">Próximas atenciones</span><h2>Citas programadas</h2></div><span class="directory-count">${upcoming.length} próximas</span></div>
                <div class="upcoming-grid">${upcoming.map(function (appointment) { return `<article><time><strong>${formatDate(appointment.date, { day: "2-digit" })}</strong><span>${formatDate(appointment.date, { month: "short" })}</span></time><div><strong>${escapeHTML(appointment.patientName)}</strong><small>${escapeHTML(appointment.area)} · ${escapeHTML(appointment.specialist)}</small></div><span>${escapeHTML(appointment.time)}</span><span class="status-badge programmed">Programada</span></article>`; }).join("")}</div>
            </section>
        `;
        setupSchedulingEvents();
    }

    function setupSchedulingEvents() {
        document.getElementById("appointmentPatient").addEventListener("change", function (event) { scheduleState.patientId = event.target.value; });
        document.getElementById("appointmentArea").addEventListener("change", function (event) {
            scheduleState.area = event.target.value;
            scheduleState.specialist = areas[scheduleState.area][0];
            scheduleState.time = "";
            renderScheduling();
        });
        document.getElementById("appointmentSpecialist").addEventListener("change", function (event) { scheduleState.specialist = event.target.value; scheduleState.time = ""; renderScheduling(); });
        document.getElementById("appointmentDate").addEventListener("change", function (event) { scheduleState.date = event.target.value; scheduleState.time = ""; renderScheduling(); });
        document.getElementById("notificationChannel").addEventListener("change", function (event) { scheduleState.channel = event.target.value; });
        document.getElementById("availabilityMode").addEventListener("change", function (event) { scheduleState.availabilityMode = event.target.checked; scheduleState.time = ""; renderScheduling(); });

        contentRoot.querySelectorAll("[data-calendar-mode]").forEach(function (button) {
            button.addEventListener("click", function () { scheduleState.calendarMode = button.dataset.calendarMode; renderScheduling(); });
        });
        contentRoot.querySelectorAll("[data-calendar-date]").forEach(function (button) {
            button.addEventListener("click", function () { scheduleState.date = button.dataset.calendarDate; scheduleState.time = ""; renderScheduling(); });
        });
        contentRoot.querySelectorAll("[data-slot-time]").forEach(function (button) {
            button.addEventListener("click", function () {
                const hour = button.dataset.slotTime;
                if (scheduleState.availabilityMode) {
                    toggleAvailabilityBlock(hour);
                    return;
                }
                scheduleState.time = hour;
                renderScheduling();
            });
        });
        document.getElementById("appointmentForm").addEventListener("submit", saveAppointment);
        const cancel = document.getElementById("cancelReschedule");
        if (cancel) cancel.addEventListener("click", function () { scheduleState.rebookingId = null; scheduleState.time = ""; renderScheduling(); });
    }

    function toggleAvailabilityBlock(hour) {
        const blocks = getBlocks();
        const index = blocks.findIndex(function (block) { return block.specialist === scheduleState.specialist && block.date === scheduleState.date && block.time === hour; });
        if (index >= 0) {
            blocks.splice(index, 1);
            showToast(`Horario ${hour} habilitado.`);
        } else if (getSlotState(hour) === "busy") {
            showToast("No puedes bloquear un horario con una cita programada.", "warning");
            return;
        } else {
            blocks.push({ id: `block-${Date.now()}`, specialist: scheduleState.specialist, date: scheduleState.date, time: hour });
            showToast(`Horario ${hour} bloqueado.`);
        }
        localStorage.setItem("bloquesDisponibilidad", JSON.stringify(blocks));
        renderScheduling();
    }

    function saveAppointment(event) {
        event.preventDefault();
        if (!scheduleState.patientId || !scheduleState.time) {
            showToast("Selecciona el paciente y un horario libre.", "warning");
            return;
        }
        if (getSlotState(scheduleState.time) !== "free") {
            showToast("Ese horario acaba de ocuparse. Elige otro disponible.", "warning");
            renderScheduling();
            return;
        }

        const patient = getPatients().find(function (item) { return item.id === scheduleState.patientId; });
        let appointments = getAppointments();
        const previousAppointment = scheduleState.rebookingId
            ? appointments.find(function (item) { return item.id === scheduleState.rebookingId; })
            : null;
        if (scheduleState.rebookingId) appointments = appointments.filter(function (item) { return item.id !== scheduleState.rebookingId; });
        const appointment = {
            id: scheduleState.rebookingId || `cita-${Date.now()}`,
            patientId: patient.id,
            patientName: patientName(patient),
            area: scheduleState.area,
            specialist: scheduleState.specialist,
            date: scheduleState.date,
            time: scheduleState.time,
            status: "Programada",
            channel: scheduleState.channel,
            notified: true,
            createdAt: new Date().toISOString()
        };
        appointments.push(appointment);
        localStorage.setItem("citas", JSON.stringify(appointments));
        if (previousAppointment) {
            const history = safeParse("historialCitas", []);
            history.unshift({
                id: `mov-${Date.now()}`,
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                patientName: appointment.patientName,
                area: appointment.area,
                specialist: appointment.specialist,
                type: "Reagendada",
                oldDate: previousAppointment.date,
                oldTime: previousAppointment.time,
                newDate: appointment.date,
                newTime: appointment.time,
                changedAt: new Date().toISOString()
            });
            localStorage.setItem("historialCitas", JSON.stringify(history));
            const processes = safeParse("procesosClinicos", []);
            processes.forEach(function (process) {
                process.sessions.forEach(function (session) {
                    if (session.appointmentId === appointment.id) {
                        session.date = appointment.date;
                        session.time = appointment.time;
                    }
                });
            });
            localStorage.setItem("procesosClinicos", JSON.stringify(processes));
        }
        addNotification("Cita programada", `${appointment.patientName} · ${formatDate(appointment.date)} ${appointment.time}`);
        createAppointmentPdf(appointment, patient);
        scheduleState.rebookingId = null;
        scheduleState.time = "";
        showToast(`Cita programada y notificación enviada por ${appointment.channel}.`);
        renderScheduling();
    }

    function addNotification(title, detail) {
        const notifications = safeParse("notificaciones", []);
        notifications.unshift({ id: `not-${Date.now()}`, title: title, detail: detail, date: new Date().toISOString(), read: false });
        localStorage.setItem("notificaciones", JSON.stringify(notifications));
        renderNotifications();
    }

    function normalizePdfText(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/([()\\])/g, "\\$1");
    }

    function createAppointmentPdf(appointment, patient) {
        const lines = [
            { text: "UNEMI - SALUD Y DESARROLLO HUMANO", size: 18, y: 790 },
            { text: "CONSTANCIA DE CITA PROGRAMADA", size: 14, y: 754 },
            { text: `Codigo: ${appointment.id}`, size: 10, y: 720 },
            { text: `Paciente: ${patientName(patient)}`, size: 12, y: 680 },
            { text: `Documento: ${patient.tipoDocumento || "Documento"} ${patient.cedula}`, size: 11, y: 656 },
            { text: `Area: ${appointment.area}`, size: 11, y: 620 },
            { text: `Especialista: ${appointment.specialist}`, size: 11, y: 596 },
            { text: `Fecha: ${formatDate(appointment.date)} a las ${appointment.time}`, size: 11, y: 572 },
            { text: "Estado: PROGRAMADA", size: 11, y: 536 },
            { text: `Notificacion: ${appointment.channel}`, size: 10, y: 512 },
            { text: "Presentarse 10 minutos antes con su documento de identidad.", size: 10, y: 462 },
            { text: "Documento generado automaticamente por el Sistema de Salud UNEMI.", size: 9, y: 92 }
        ];
        const stream = lines.map(function (line) {
            return `BT /F1 ${line.size} Tf 1 0 0 1 52 ${line.y} Tm (${normalizePdfText(line.text)}) Tj ET`;
        }).join("\n");
        const objects = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        ];
        let pdf = "%PDF-1.4\n%UNEMI\n";
        const offsets = [0];
        objects.forEach(function (object, index) {
            offsets.push(pdf.length);
            pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });
        const xrefOffset = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach(function (offset) { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
        const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `constancia-${appointment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function renderGenericSection(name) {
        const area = name === "Psicopedagógica" ? "Psicopedagogía" : name;
        const isArea = Object.prototype.hasOwnProperty.call(areas, area);
        contentRoot.innerHTML = `
            <section class="view-banner generic-banner">
                <div><span class="eyebrow">Módulo operativo</span><h2>${escapeHTML(sectionData[name].title)}</h2><p>${escapeHTML(sectionData[name].description)}</p></div>
                <span class="view-mark material-symbols-outlined">${isArea ? "clinical_notes" : "dashboard_customize"}</span>
            </section>
            <div class="kpi-grid compact-grid">
                ${metricCard("pending_actions", "Procesos activos", isArea ? "24" : "38", "En seguimiento", "blue")}
                ${metricCard("task_alt", "Cerrados este mes", isArea ? "67" : "92", "Dentro del objetivo", "green")}
                ${metricCard("schedule", "Tiempo promedio", "3,2 días", "Hasta resolución", "orange")}
            </div>
            <section class="panel placeholder-panel"><span class="material-symbols-outlined">construction</span><div><h2>Módulo preparado para la siguiente etapa</h2><p>La navegación y la estructura visual ya están integradas. En esta entrega priorizamos Dashboard, Usuarios y Agendamiento.</p></div></section>
        `;
    }

    function openSchedulingForArea(area) {
        scheduleState.area = area;
        scheduleState.specialist = areas[area][0];
        scheduleState.patientId = "";
        scheduleState.date = today;
        scheduleState.time = "";
        scheduleState.rebookingId = null;
        selectSection("Agendamiento");
    }

    function selectSection(name, updateHash) {
        const section = sectionData[name] ? name : "Inicio";
        const data = sectionData[section];
        currentSection = section;
        sectionTitle.textContent = data.title;
        sectionDescription.textContent = data.description;
        sectionBreadcrumb.textContent = data.breadcrumb;
        sectionAction.disabled = false;
        sectionAction.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${data.icon}</span><span>${escapeHTML(data.action)}</span>`;
        document.querySelectorAll(".sidebar a[data-section]").forEach(function (link) { link.classList.toggle("active", link.dataset.section === section); });

        if (section === "Inicio") renderDashboard();
        else if (section === "Usuarios") renderUsers();
        else if (section === "Agendamiento") renderScheduling();
        else if (clinicalSectionAreas[section]) clinicalProcesses.renderArea(clinicalSectionAreas[section], section);
        else if (section === "Informes") institutionalReports.renderInformes();
        else if (section === "Reportes") institutionalReports.renderReportes();
        else renderGenericSection(section);

        if (updateHash !== false) {
            const slug = Object.keys(hashSections).find(function (key) { return hashSections[key] === section; }) || "inicio";
            history.replaceState(null, "", `#${slug}`);
        }
    }

    function renderNotifications() {
        const notifications = safeParse("notificaciones", []);
        const unread = notifications.filter(function (item) { return !item.read; }).length;
        const count = document.getElementById("notificationCount");
        count.textContent = unread > 9 ? "9+" : unread;
        count.hidden = unread === 0;
        document.getElementById("notificationList").innerHTML = notifications.length ? notifications.slice(0, 5).map(function (item) {
            return `<article><span class="material-symbols-outlined">${item.title.includes("deriv") || item.title.includes("Deriv") ? "sync_alt" : "event_available"}</span><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.detail)}</p></div></article>`;
        }).join("") : `<p class="popover-empty">No hay notificaciones nuevas.</p>`;
    }

    function setupNavigation() {
        document.querySelectorAll(".sidebar a[data-section]").forEach(function (link) {
            link.addEventListener("click", function (event) { event.preventDefault(); selectSection(link.dataset.section); });
        });
        document.getElementById("menuButton").addEventListener("click", function () { document.body.classList.toggle("sidebar-collapsed"); });
        document.getElementById("attentionToggle").addEventListener("click", function () {
            const submenu = document.getElementById("attentionSubmenu");
            const isOpen = submenu.classList.toggle("is-open");
            this.setAttribute("aria-expanded", String(isOpen));
            this.querySelector(".nav-chevron").textContent = isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down";
        });
        sectionAction.addEventListener("click", function () {
            if (currentSection === "Inicio" || currentSection === "Usuarios") {
                window.location.href = "registro.html";
            } else if (currentSection === "Agendamiento") {
                document.getElementById("appointmentPatient").focus();
            } else if (clinicalSectionAreas[currentSection]) {
                clinicalProcesses.handlePrimaryAction();
            } else if (currentSection === "Informes" || currentSection === "Reportes") {
                institutionalReports.handlePrimaryAction(currentSection);
            } else {
                showToast(`${sectionData[currentSection].action}: flujo listo para continuar.`, "info");
            }
        });
        globalSearch.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && globalSearch.value.trim()) {
                directoryState.query = globalSearch.value.trim();
                selectSection("Usuarios");
            }
        });
    }

    function setupPopovers() {
        const notificationButton = document.getElementById("notificationButton");
        const notificationPopover = document.getElementById("notificationPopover");
        const userMenuButton = document.getElementById("userMenuButton");
        const userPopover = document.getElementById("userPopover");

        notificationButton.addEventListener("click", function () {
            const willOpen = notificationPopover.hidden;
            notificationPopover.hidden = !willOpen;
            userPopover.hidden = true;
            notificationButton.setAttribute("aria-expanded", String(willOpen));
        });
        userMenuButton.addEventListener("click", function () {
            const willOpen = userPopover.hidden;
            userPopover.hidden = !willOpen;
            notificationPopover.hidden = true;
            userMenuButton.setAttribute("aria-expanded", String(willOpen));
        });
        document.getElementById("logoutButton").addEventListener("click", function () {
            localStorage.removeItem("sesionActiva");
            localStorage.removeItem("usuarioActual");
            window.location.replace("login.html");
        });
        document.getElementById("closeDialogButton").addEventListener("click", function () { recordDialog.close(); });
        recordDialog.addEventListener("click", function (event) { if (event.target === recordDialog) recordDialog.close(); });
    }

    seedDemoData();
    clinicalProcesses = window.createClinicalProcessModule({
        contentRoot,
        sectionAction,
        areas,
        today,
        addDays,
        formatDate,
        escapeHTML,
        patientName,
        getPatients,
        getAppointments,
        getBlocks,
        showToast,
        addNotification,
        openScheduling: openSchedulingForArea
    });
    clinicalProcesses.seedDemoProcesses();
    institutionalReports = window.createInstitutionalReportsModule({
        contentRoot,
        sectionAction,
        areas,
        today,
        formatDate,
        escapeHTML,
        patientName,
        getPatients,
        getAppointments,
        getDashboardView: function () { return dashboardState.view; },
        showToast
    });
    setupCurrentUser();
    setupNavigation();
    setupPopovers();
    renderNotifications();
    const initialSection = hashSections[window.location.hash.slice(1).toLowerCase()] || "Inicio";
    selectSection(initialSection, false);
}());