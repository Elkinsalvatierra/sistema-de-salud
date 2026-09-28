(function () {
    "use strict";

    window.createClinicalProcessModule = function (dependencies) {
        const {
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
            openScheduling
        } = dependencies;

        const state = {
            area: "Clínica",
            sectionName: "Clínica",
            activeProcessId: null,
            activeSessionId: null,
            action: "",
            followupDate: addDays(today, 7),
            followupTime: "",
            referralArea: "Psicopedagogía",
            referralSpecialist: areas["Psicopedagogía"][0],
            referralDate: addDays(today, 7),
            referralTime: "",
            closureStatus: "Cerrado"
        };

        function getProcesses() {
            try {
                return JSON.parse(localStorage.getItem("procesosClinicos")) || [];
            } catch (error) {
                return [];
            }
        }

        function saveProcesses(processes) {
            localStorage.setItem("procesosClinicos", JSON.stringify(processes));
        }

        function saveAppointments(appointments) {
            localStorage.setItem("citas", JSON.stringify(appointments));
        }

        function getPatient(patientId) {
            return getPatients().find(function (patient) {
                return patient.id === patientId;
            });
        }

        function isClosed(process) {
            return process.status === "Cerrado" || process.status === "De Alta";
        }

        function attendedSessions(process) {
            return process.sessions.filter(function (session) {
                return session.status === "Atendida";
            });
        }

        function isFirstAreaSession(process, session) {
            const processes = getProcesses();
            return !processes.some(function (candidate) {
                if (candidate.patientId !== process.patientId || candidate.area !== process.area) return false;
                return candidate.sessions.some(function (candidateSession) {
                    return candidateSession.id !== session.id && candidateSession.status === "Atendida";
                });
            });
        }

        function hasValidatedConsent(process) {
            return process.consent && ["validated", "inherited"].includes(process.consent.status);
        }

        function sessionStatusClass(status) {
            if (status === "Atendida") return "attended";
            if (status === "Borrador") return "draft";
            return "scheduled";
        }

        function seedDemoProcesses() {
            if (localStorage.getItem("procesosClinicos")) return;
            const previousDate = addDays(today, -14);
            saveProcesses([
                {
                    id: "proceso-demo-clinica",
                    patientId: "demo-1",
                    patientName: "Daniela Mendoza Ruiz",
                    area: "Clínica",
                    specialist: "Dra. Elena Ruiz",
                    status: "Activo",
                    openedAt: new Date().toISOString(),
                    consent: { status: "pending", fileName: "", generatedAt: null, validatedAt: null },
                    sessions: [
                        { id: "sesion-demo-clinica-1", number: 1, appointmentId: "cita-demo-1", date: today, time: "08:00", status: "Programada", clinical: {}, decision: null }
                    ]
                },
                {
                    id: "proceso-demo-psico",
                    patientId: "demo-3",
                    patientName: "Sofía Torres Vera",
                    area: "Psicopedagogía",
                    specialist: "Mgs. Andrea Molina",
                    status: "Activo",
                    openedAt: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
                    consent: { status: "validated", fileName: "consentimiento_sofia_torres.pdf", generatedAt: previousDate, validatedAt: previousDate },
                    sessions: [
                        {
                            id: "sesion-demo-psico-1",
                            number: 1,
                            appointmentId: null,
                            date: previousDate,
                            time: "10:15",
                            status: "Atendida",
                            attendedAt: previousDate,
                            clinical: {
                                motivo: "Dificultades de adaptación y organización académica.",
                                evolucion: "La paciente identifica factores que afectan su planificación semanal.",
                                observaciones: "Participación activa durante la sesión.",
                                tecnicas: "Entrevista semiestructurada y psicoeducación sobre hábitos de estudio.",
                                impresion: "Respuesta adaptativa asociada a sobrecarga académica.",
                                acuerdos: "Aplicar una agenda semanal y registrar factores distractores."
                            },
                            decision: { type: "Seguimiento", date: today, time: "14:00" },
                            certificateAvailable: true
                        },
                        { id: "sesion-demo-psico-2", number: 2, appointmentId: "cita-demo-3", date: today, time: "14:00", status: "Programada", clinical: {}, decision: null }
                    ]
                }
            ]);
        }

        function renderArea(area, sectionName) {
            state.area = area;
            state.sectionName = sectionName;
            state.activeProcessId = null;
            state.activeSessionId = null;
            resetDecisionState();
            renderProcessList();
        }

        function resetDecisionState() {
            state.action = "";
            state.followupDate = addDays(today, 7);
            state.followupTime = "";
            state.referralArea = Object.keys(areas).find(function (area) { return area !== state.area; }) || "Psicopedagogía";
            state.referralSpecialist = areas[state.referralArea][0];
            state.referralDate = addDays(today, 7);
            state.referralTime = "";
            state.closureStatus = "Cerrado";
        }

        function setPrimaryAction(icon, text) {
            sectionAction.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span><span>${escapeHTML(text)}</span>`;
        }

        function renderProcessList() {
            state.activeProcessId = null;
            state.activeSessionId = null;
            setPrimaryAction("event_available", "Agendar primera sesión");
            const allProcesses = getProcesses();
            const processes = allProcesses.filter(function (process) { return process.area === state.area; });
            const usedAppointmentIds = new Set(allProcesses.flatMap(function (process) {
                return process.sessions.map(function (session) { return session.appointmentId; }).filter(Boolean);
            }));
            const pendingAppointments = getAppointments().filter(function (appointment) {
                return appointment.area === state.area && appointment.status === "Programada" && !usedAppointmentIds.has(appointment.id);
            });
            const activeCount = processes.filter(function (process) { return !isClosed(process); }).length;
            const closedCount = processes.length - activeCount;
            const pendingConsent = processes.filter(function (process) { return process.consent && process.consent.status !== "validated" && process.consent.status !== "inherited"; }).length;

            contentRoot.innerHTML = `
                <section class="process-overview">
                    <div>
                        <span class="eyebrow">Gestión por casos</span>
                        <h2>Procesos de ${escapeHTML(state.area)}</h2>
                        <p>Las atenciones se organizan por proceso y cada cita conserva su número de sesión.</p>
                    </div>
                    <span class="material-symbols-outlined" aria-hidden="true">clinical_notes</span>
                </section>
                <div class="kpi-grid compact-grid process-kpis">
                    ${processMetric("pending_actions", "Procesos activos", activeCount, "En seguimiento", "blue")}
                    ${processMetric("verified_user", "Consentimientos pendientes", pendingConsent, "Bloqueo legal activo", "orange")}
                    ${processMetric("task_alt", "Procesos cerrados", closedCount, "Cerrados o de alta", "green")}
                </div>
                <section class="panel process-list-panel">
                    <div class="panel-heading">
                        <div><span class="eyebrow">Expedientes por proceso</span><h2>Casos del área</h2></div>
                        <span class="directory-count">${processes.length} procesos</span>
                    </div>
                    <div class="process-table-wrap">
                        <table class="process-table">
                            <thead><tr><th>Paciente</th><th>Profesional</th><th>Sesiones</th><th>Consentimiento</th><th>Estado</th><th></th></tr></thead>
                            <tbody>
                                ${processes.length ? processes.map(renderProcessRow).join("") : `<tr><td colspan="6"><div class="empty-state compact"><span class="material-symbols-outlined">folder_off</span><p>No hay procesos creados en esta área.</p></div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </section>
                <section class="panel pending-process-panel" id="pendingProcessAppointments">
                    <div class="panel-heading">
                        <div><span class="eyebrow">Citas sin proceso</span><h2>Primeras atenciones por clasificar</h2></div>
                        <span class="directory-count">${pendingAppointments.length} pendientes</span>
                    </div>
                    <div class="pending-process-grid">
                        ${pendingAppointments.length ? pendingAppointments.map(function (appointment) {
                            return `<article><span class="appointment-date"><strong>${formatDate(appointment.date, { day: "2-digit" })}</strong><small>${formatDate(appointment.date, { month: "short" })}</small></span><div><strong>${escapeHTML(appointment.patientName)}</strong><small>${escapeHTML(appointment.specialist)} · ${escapeHTML(appointment.time)}</small></div><button type="button" data-create-process="${escapeHTML(appointment.id)}">Crear proceso</button></article>`;
                        }).join("") : `<div class="empty-state compact"><span class="material-symbols-outlined">event_available</span><p>Todas las citas del área ya están asociadas a un proceso.</p></div>`}
                    </div>
                </section>
            `;

            contentRoot.querySelectorAll("[data-open-process]").forEach(function (button) {
                button.addEventListener("click", function () { openProcess(button.dataset.openProcess); });
            });
            contentRoot.querySelectorAll("[data-create-process]").forEach(function (button) {
                button.addEventListener("click", function () { createProcessFromAppointment(button.dataset.createProcess); });
            });
        }

        function processMetric(icon, label, value, detail, tone) {
            return `<article class="kpi-card kpi-${tone}"><div class="kpi-heading"><span class="kpi-icon material-symbols-outlined">${icon}</span><span>${escapeHTML(label)}</span></div><strong>${value}</strong><small>${escapeHTML(detail)}</small></article>`;
        }

        function renderProcessRow(process) {
            const completed = attendedSessions(process).length;
            const consentValid = hasValidatedConsent(process);
            const statusClass = isClosed(process) ? "closed" : "active";
            return `
                <tr>
                    <td><div class="process-patient"><span>${escapeHTML(initials(process.patientName))}</span><div><strong>${escapeHTML(process.patientName)}</strong><small>Proceso ${escapeHTML(process.id.slice(-8))}</small></div></div></td>
                    <td><strong>${escapeHTML(process.specialist)}</strong><small>${escapeHTML(process.area)}</small></td>
                    <td><strong>${process.sessions.length}</strong><small>${completed} atendidas</small></td>
                    <td><span class="legal-status ${consentValid ? "valid" : "pending"}"><span class="material-symbols-outlined">${consentValid ? "verified_user" : "gpp_maybe"}</span>${consentValid ? "Validado" : "Pendiente"}</span></td>
                    <td><span class="process-status ${statusClass}"><i></i>${escapeHTML(process.status)}</span></td>
                    <td><button class="open-process-button" type="button" data-open-process="${escapeHTML(process.id)}">Abrir proceso<span class="material-symbols-outlined">arrow_forward</span></button></td>
                </tr>
            `;
        }

        function initials(name) {
            return String(name).split(/\s+/).slice(0, 2).map(function (part) { return part[0]; }).join("").toUpperCase();
        }

        function createProcessFromAppointment(appointmentId) {
            const appointment = getAppointments().find(function (item) { return item.id === appointmentId; });
            if (!appointment) {
                showToast("No se encontró la cita seleccionada.", "warning");
                return;
            }
            const processes = getProcesses();
            const previousValidated = processes.some(function (process) {
                return process.patientId === appointment.patientId && process.area === appointment.area && attendedSessions(process).length > 0 && hasValidatedConsent(process);
            });
            const process = {
                id: `proceso-${Date.now()}`,
                patientId: appointment.patientId,
                patientName: appointment.patientName,
                area: appointment.area,
                specialist: appointment.specialist,
                status: "Activo",
                openedAt: new Date().toISOString(),
                consent: previousValidated
                    ? { status: "inherited", fileName: "Consentimiento validado previamente en el área", validatedAt: new Date().toISOString() }
                    : { status: "pending", fileName: "", generatedAt: null, validatedAt: null },
                sessions: [{ id: `sesion-${Date.now()}`, number: 1, appointmentId: appointment.id, date: appointment.date, time: appointment.time, status: "Programada", clinical: {}, decision: null }]
            };
            processes.unshift(process);
            saveProcesses(processes);
            showToast(previousValidated ? "Proceso creado con consentimiento vigente." : "Proceso creado. La primera sesión requiere consentimiento.");
            openProcess(process.id);
        }

        function openProcess(processId, sessionId) {
            const process = getProcesses().find(function (item) { return item.id === processId; });
            if (!process) {
                renderProcessList();
                return;
            }
            state.activeProcessId = process.id;
            const selected = process.sessions.find(function (session) { return session.id === sessionId; })
                || process.sessions.find(function (session) { return session.status !== "Atendida"; })
                || process.sessions[process.sessions.length - 1];
            state.activeSessionId = selected.id;
            hydrateDecisionState(selected);
            renderProcessDetail();
        }

        function hydrateDecisionState(session) {
            resetDecisionState();
            if (!session.decision) return;
            state.action = session.decision.type || "";
            if (state.action === "Seguimiento") {
                state.followupDate = session.decision.date || addDays(today, 7);
                state.followupTime = session.decision.time || "";
            } else if (state.action === "Derivación") {
                state.referralArea = session.decision.area || state.referralArea;
                state.referralSpecialist = session.decision.specialist || areas[state.referralArea][0];
                state.referralDate = session.decision.date || addDays(today, 7);
                state.referralTime = session.decision.time || "";
            } else if (state.action === "Cierre") {
                state.closureStatus = session.decision.status || "Cerrado";
            }
        }

        function renderProcessDetail() {
            const process = getProcesses().find(function (item) { return item.id === state.activeProcessId; });
            if (!process) return renderProcessList();
            const session = process.sessions.find(function (item) { return item.id === state.activeSessionId; }) || process.sessions[process.sessions.length - 1];
            const patient = getPatient(process.patientId) || { nombre: process.patientName, cedula: "No registrado" };
            const firstAreaSession = isFirstAreaSession(process, session) && session.number === 1;
            const consentValid = hasValidatedConsent(process);
            const legalLocked = firstAreaSession && !consentValid;
            const processClosed = isClosed(process);
            const sessionAttended = session.status === "Atendida";
            const readOnly = processClosed || sessionAttended;
            setPrimaryAction("arrow_back", "Volver a procesos");

            contentRoot.innerHTML = `
                <div class="process-detail-toolbar">
                    <button type="button" id="backToProcesses"><span class="material-symbols-outlined">arrow_back</span>Procesos de ${escapeHTML(process.area)}</button>
                    <span>Expediente ${escapeHTML(process.id.slice(-8))}</span>
                </div>
                <section class="process-header ${processClosed ? "closed" : ""}">
                    <div class="process-identity"><span class="process-avatar">${escapeHTML(initials(process.patientName))}</span><div><span class="eyebrow">${firstAreaSession ? "Primera atención detectada en esta área" : "Proceso psicológico en continuidad"}</span><h2>${escapeHTML(process.patientName)}</h2><p>${escapeHTML(process.area)} · ${escapeHTML(process.specialist)}</p></div></div>
                    <div class="process-header-meta"><span class="process-status ${processClosed ? "closed" : "active"}"><i></i>${escapeHTML(process.status)}</span><small>Abierto ${formatDate(process.openedAt.slice(0, 10))}</small></div>
                </section>
                <div class="process-workspace">
                    <aside class="panel session-sidebar">
                        <div class="panel-heading compact"><div><span class="eyebrow">Secuencia del caso</span><h2>Sesiones</h2></div><span class="session-count">${process.sessions.length}</span></div>
                        <div class="session-timeline">
                            ${process.sessions.map(function (item) {
                                return `<button type="button" data-session-id="${escapeHTML(item.id)}" class="session-step ${item.id === session.id ? "active" : ""} ${sessionStatusClass(item.status)}"><span class="session-index">${item.number}</span><span><strong>Sesión ${item.number}</strong><small>${formatDate(item.date)} · ${escapeHTML(item.time)}</small><em>${escapeHTML(item.status)}</em></span></button>`;
                            }).join("")}
                        </div>
                        <div class="process-summary"><span>Atendidas<strong>${attendedSessions(process).length}</strong></span><span>Pendientes<strong>${process.sessions.filter(function (item) { return item.status !== "Atendida"; }).length}</strong></span></div>
                    </aside>
                    <div class="process-main">
                        ${renderLegalGate(process, patient, session, firstAreaSession, consentValid, processClosed)}
                        ${renderClinicalForm(process, session, legalLocked, readOnly)}
                    </div>
                </div>
            `;

            document.getElementById("backToProcesses").addEventListener("click", renderProcessList);
            contentRoot.querySelectorAll("[data-session-id]").forEach(function (button) {
                button.addEventListener("click", function () {
                    state.activeSessionId = button.dataset.sessionId;
                    const selectedSession = process.sessions.find(function (item) { return item.id === state.activeSessionId; });
                    hydrateDecisionState(selectedSession);
                    renderProcessDetail();
                });
            });
            setupLegalEvents(process, patient, firstAreaSession, consentValid, processClosed);
            setupClinicalEvents(process, session, legalLocked, readOnly);
        }

        function renderLegalGate(process, patient, session, firstAreaSession, consentValid, processClosed) {
            if (!firstAreaSession) {
                return `<section class="legal-gate verified"><span class="material-symbols-outlined">verified_user</span><div><strong>Filtro legal completado</strong><p>Este proceso ya cuenta con consentimiento válido para ${escapeHTML(process.area)}.</p></div><span class="legal-pill">Verificado</span></section>`;
            }
            const generated = process.consent && process.consent.status === "generated";
            if (consentValid) {
                return `<section class="legal-gate verified"><span class="material-symbols-outlined">verified_user</span><div><strong>Consentimiento informado validado</strong><p>${escapeHTML(process.consent.fileName || "Documento legal registrado")} · ${formatDate((process.consent.validatedAt || today).slice(0, 10))}</p></div><span class="legal-pill">Verificado</span></section>`;
            }
            return `
                <section class="legal-gate blocked">
                    <div class="legal-gate-heading"><span class="material-symbols-outlined">gpp_maybe</span><div><span class="eyebrow">Requisito legal obligatorio</span><h2>Primera atención en ${escapeHTML(process.area)}</h2><p>La historia clínica y el registro de sesión permanecerán bloqueados hasta validar el consentimiento firmado.</p></div><span class="legal-pill pending">Bloqueado</span></div>
                    <div class="legal-patient-preview"><span><small>Paciente</small><strong>${escapeHTML(patientName(patient))}</strong></span><span><small>Documento</small><strong>${escapeHTML(patient.cedula || "No registrado")}</strong></span>${patient.representante ? `<span><small>Representante</small><strong>${escapeHTML(patient.representante.nombres)}</strong></span>` : ""}</div>
                    ${generated ? `<div class="consent-generated"><span class="material-symbols-outlined">download_done</span><p><strong>Documento generado.</strong> Imprímelo, recoge las firmas y carga el PDF firmado para desbloquear la sesión.</p></div>` : ""}
                    <div class="legal-actions">
                        <button class="secondary-action" type="button" id="generateConsent" ${processClosed ? "disabled" : ""}><span class="material-symbols-outlined">description</span>Generar consentimiento informado</button>
                        <label class="upload-consent ${processClosed ? "disabled" : ""}"><input id="signedConsentInput" type="file" accept="application/pdf,.pdf" ${processClosed ? "disabled" : ""}><span class="material-symbols-outlined">upload_file</span><span><strong>Subir consentimiento firmado</strong><small>PDF · máximo 5 MB</small></span></label>
                    </div>
                    <p class="legal-error" id="legalError" role="alert"></p>
                </section>
            `;
        }

        function setupLegalEvents(process, patient, firstAreaSession, consentValid, processClosed) {
            if (!firstAreaSession || consentValid || processClosed) return;
            document.getElementById("generateConsent").addEventListener("click", function () {
                generateConsentPdf(process, patient);
                updateConsent(process.id, { status: "generated", generatedAt: new Date().toISOString() });
                showToast("Consentimiento generado. Carga la copia firmada para habilitar la sesión.", "info");
                renderProcessDetail();
            });
            document.getElementById("signedConsentInput").addEventListener("change", async function (event) {
                const file = event.target.files[0];
                const error = document.getElementById("legalError");
                error.textContent = "";
                if (!file || !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
                    error.textContent = "Selecciona un archivo válido en formato PDF.";
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    error.textContent = "El PDF supera el tamaño máximo de 5 MB.";
                    return;
                }
                try {
                    await storeConsentFile(process.id, file);
                    updateConsent(process.id, { status: "validated", fileName: file.name, fileSize: file.size, validatedAt: new Date().toISOString() });
                    showToast("Consentimiento validado. La historia clínica fue habilitada.");
                    renderProcessDetail();
                } catch (storageError) {
                    error.textContent = "No fue posible guardar el documento. Intenta nuevamente.";
                }
            });
        }

        function updateConsent(processId, changes) {
            const processes = getProcesses();
            const process = processes.find(function (item) { return item.id === processId; });
            if (!process) return;
            process.consent = { ...(process.consent || {}), ...changes };
            process.updatedAt = new Date().toISOString();
            saveProcesses(processes);
        }

        function storeConsentFile(processId, file) {
            if (!window.indexedDB) return Promise.reject(new Error("IndexedDB no disponible"));
            return new Promise(function (resolve, reject) {
                const request = indexedDB.open("SaludUnemiDocumentos", 3);
                request.onupgradeneeded = function () {
                    const database = request.result;
                    if (!database.objectStoreNames.contains("representantes")) database.createObjectStore("representantes");
                    if (!database.objectStoreNames.contains("consentimientos")) database.createObjectStore("consentimientos");
                    if (!database.objectStoreNames.contains("evaluaciones")) database.createObjectStore("evaluaciones");
                };
                request.onerror = function () { reject(request.error); };
                request.onsuccess = function () {
                    const database = request.result;
                    const transaction = database.transaction("consentimientos", "readwrite");
                    transaction.objectStore("consentimientos").put(file, processId);
                    transaction.oncomplete = function () { database.close(); resolve(); };
                    transaction.onerror = function () { database.close(); reject(transaction.error); };
                };
            });
        }

        function renderClinicalForm(process, session, legalLocked, readOnly) {
            const clinical = session.clinical || {};
            const lockReason = legalLocked ? "Completa el consentimiento informado para redactar la historia clínica." : "Este registro está cerrado y se conserva en modo de consulta.";
            return `
                <section class="panel clinical-record ${legalLocked ? "is-locked" : ""}">
                    <div class="panel-heading">
                        <div><span class="eyebrow">Registro técnico de Psicología</span><h2>Sesión ${session.number} · ${escapeHTML(session.status)}</h2></div>
                        <span class="session-date"><span class="material-symbols-outlined">calendar_today</span>${formatDate(session.date)} · ${escapeHTML(session.time)}</span>
                    </div>
                    ${legalLocked || readOnly ? `<div class="record-lock"><span class="material-symbols-outlined">${legalLocked ? "lock" : "lock_clock"}</span><p>${escapeHTML(lockReason)}</p></div>` : ""}
                    <form id="clinicalSessionForm" novalidate>
                        <fieldset ${legalLocked || readOnly ? "disabled" : ""}>
                            <div class="clinical-grid">
                                ${clinicalTextarea("clinicalReason", "Motivo de consulta", "Describe la demanda principal expresada por el paciente.", clinical.motivo, true)}
                                ${clinicalTextarea("clinicalEvolution", "Evolución", "Cambios observados desde la sesión anterior o durante el proceso.", clinical.evolucion, true)}
                                ${clinicalTextarea("clinicalObservations", "Observaciones", "Conducta, actitud, contexto y elementos relevantes.", clinical.observaciones, false)}
                                ${clinicalTextarea("clinicalTechniques", "Técnicas / Intervenciones aplicadas", "Detalla las técnicas psicológicas utilizadas durante la sesión.", clinical.tecnicas, true)}
                                ${clinicalTextarea("clinicalImpression", "Impresión diagnóstica / clínica", "Hipótesis y lectura clínica profesional, sin apartados médicos.", clinical.impresion, true)}
                                ${clinicalTextarea("clinicalAgreements", "Acuerdos para la próxima sesión", "Compromisos, tareas y objetivos definidos con el paciente.", clinical.acuerdos, true)}
                            </div>
                            <section class="decision-section">
                                <div class="decision-heading"><span class="eyebrow">Decisión post-sesión obligatoria</span><h3>¿Cómo continúa el flujo del paciente?</h3><p>Selecciona una opción antes de marcar la sesión como atendida.</p></div>
                                <div class="decision-options">
                                    ${decisionOption("Seguimiento", "event_repeat", "Continuar", "Agenda la siguiente sesión con el mismo especialista.")}
                                    ${decisionOption("Derivación", "sync_alt", "Derivar", "Transfiere y agenda con otra área o profesional.")}
                                    ${decisionOption("Cierre", "task_alt", "Cerrar proceso", "Finaliza el caso como cerrado o de alta.")}
                                </div>
                                <div id="decisionFields" class="decision-fields">${renderDecisionFields(process, session)}</div>
                            </section>
                        </fieldset>
                        <p class="clinical-form-error" id="clinicalFormError" role="alert"></p>
                        <div class="clinical-actions">
                            ${session.status === "Atendida" ? `<button class="secondary-action" type="button" id="downloadCertificate"><span class="material-symbols-outlined">download</span>Descargar certificado</button><button class="secondary-action" type="button" id="printCertificate"><span class="material-symbols-outlined">print</span>Imprimir certificado</button>` : `<button class="secondary-action" type="button" id="saveDraft" ${legalLocked || readOnly ? "disabled" : ""}><span class="material-symbols-outlined">save</span>Guardar borrador</button><button class="primary-button" type="submit" ${legalLocked || readOnly ? "disabled" : ""}><span class="material-symbols-outlined">task_alt</span>Guardar y marcar como Atendida</button>`}
                            ${isClosed(process) ? `<button class="closure-report-button" type="button" id="downloadClosureReport"><span class="material-symbols-outlined">description</span>Descargar informe de cierre</button>` : ""}
                        </div>
                    </form>
                </section>
            `;
        }

        function clinicalTextarea(id, label, placeholder, value, required) {
            return `<label class="clinical-field"><span>${escapeHTML(label)}${required ? " *" : ""}</span><textarea id="${id}" rows="5" placeholder="${escapeHTML(placeholder)}" ${required ? "required" : ""}>${escapeHTML(value || "")}</textarea><small></small></label>`;
        }

        function decisionOption(value, icon, title, description) {
            return `<label class="decision-option ${state.action === value ? "selected" : ""}"><input type="radio" name="postSessionAction" value="${value}" ${state.action === value ? "checked" : ""}><span class="material-symbols-outlined">${icon}</span><span><strong>${title}</strong><small>${description}</small></span></label>`;
        }

        function renderDecisionFields(process, session) {
            if (!state.action) return `<div class="decision-placeholder"><span class="material-symbols-outlined">account_tree</span><p>Selecciona Seguimiento, Derivación o Cierre para completar los datos correspondientes.</p></div>`;
            if (state.action === "Seguimiento") {
                return `
                    <div class="decision-panel followup-panel">
                        <div class="decision-panel-title"><span class="material-symbols-outlined">event_repeat</span><div><strong>Próxima sesión con ${escapeHTML(process.specialist)}</strong><small>Solo se muestran horarios libres del profesional.</small></div></div>
                        <label>Fecha de seguimiento<input id="followupDate" type="date" min="${today}" value="${state.followupDate}"></label>
                        <div class="mini-slot-section"><span>Horario disponible</span>${renderMiniSlots(process.specialist, state.followupDate, state.followupTime, "followup")}</div>
                    </div>
                `;
            }
            if (state.action === "Derivación") {
                const destinationAreas = Object.keys(areas).filter(function (area) { return area !== process.area; });
                if (!destinationAreas.includes(state.referralArea)) state.referralArea = destinationAreas[0];
                if (!areas[state.referralArea].includes(state.referralSpecialist)) state.referralSpecialist = areas[state.referralArea][0];
                return `
                    <div class="decision-panel referral-decision-panel">
                        <div class="decision-panel-title"><span class="material-symbols-outlined">sync_alt</span><div><strong>Derivación con cita inmediata</strong><small>La cita se agenda y el paciente queda notificado.</small></div></div>
                        <div class="decision-form-grid">
                            <label>Área de destino<select id="referralArea">${destinationAreas.map(function (area) { return `<option value="${escapeHTML(area)}" ${area === state.referralArea ? "selected" : ""}>${escapeHTML(area)}</option>`; }).join("")}</select></label>
                            <label>Especialista receptor<select id="referralSpecialist">${areas[state.referralArea].map(function (specialist) { return `<option value="${escapeHTML(specialist)}" ${specialist === state.referralSpecialist ? "selected" : ""}>${escapeHTML(specialist)}</option>`; }).join("")}</select></label>
                            <label>Fecha de la cita<input id="referralDate" type="date" min="${today}" value="${state.referralDate}"></label>
                        </div>
                        <div class="mini-slot-section"><span>Horarios libres de ${escapeHTML(state.referralSpecialist)}</span>${renderMiniSlots(state.referralSpecialist, state.referralDate, state.referralTime, "referral")}</div>
                    </div>
                `;
            }
            return `
                <div class="decision-panel closure-panel">
                    <div class="decision-panel-title"><span class="material-symbols-outlined">task_alt</span><div><strong>Cierre definitivo del proceso</strong><small>Bloqueará futuras ediciones y habilitará el informe de cierre.</small></div></div>
                    <div class="closure-options">
                        <label><input type="radio" name="closureStatus" value="Cerrado" ${state.closureStatus === "Cerrado" ? "checked" : ""}><span><strong>Cerrado</strong><small>Finalización administrativa del caso.</small></span></label>
                        <label><input type="radio" name="closureStatus" value="De Alta" ${state.closureStatus === "De Alta" ? "checked" : ""}><span><strong>De Alta</strong><small>Objetivos terapéuticos alcanzados.</small></span></label>
                    </div>
                    <div class="closure-warning"><span class="material-symbols-outlined">lock</span>Después de guardar, este proceso quedará disponible solo para consulta.</div>
                </div>
            `;
        }

        function renderMiniSlots(specialist, date, selectedTime, prefix) {
            const hours = availableHours(date).filter(function (hour) { return isTimeFree(specialist, date, hour); });
            if (!hours.length) return `<div class="no-mini-slots"><span class="material-symbols-outlined">event_busy</span>No hay horarios libres para esta fecha.</div>`;
            return `<div class="mini-slot-grid">${hours.map(function (hour) { return `<button type="button" data-${prefix}-time="${hour}" class="${selectedTime === hour ? "selected" : ""}">${hour}</button>`; }).join("")}</div>`;
        }

        function availableHours(date) {
            const day = new Date(`${date}T12:00:00`).getDay();
            if (day === 0 || day === 6) return [];
            return ["08:00", "08:45", "09:30", "10:15", "11:00", "14:00", "14:45", "15:30", "16:15"];
        }

        function isTimeFree(specialist, date, time) {
            const busy = getAppointments().some(function (appointment) {
                return appointment.specialist === specialist && appointment.date === date && appointment.time === time && appointment.status === "Programada";
            });
            const blocked = getBlocks().some(function (block) {
                return block.specialist === specialist && block.date === date && block.time === time;
            });
            return !busy && !blocked;
        }

        function setupClinicalEvents(process, session, legalLocked, readOnly) {
            const form = document.getElementById("clinicalSessionForm");
            if (!form) return;
            if (session.status === "Atendida") {
                document.getElementById("downloadCertificate").addEventListener("click", function () { downloadCertificate(process, session); });
                document.getElementById("printCertificate").addEventListener("click", function () { printCertificate(process, session); });
                const reportButton = document.getElementById("downloadClosureReport");
                if (reportButton) reportButton.addEventListener("click", function () { downloadClosureReport(process); });
                return;
            }
            if (legalLocked || readOnly) return;
            form.querySelectorAll('input[name="postSessionAction"]').forEach(function (input) {
                input.addEventListener("change", function () {
                    state.action = input.value;
                    if (state.action === "Seguimiento") state.followupTime = "";
                    if (state.action === "Derivación") state.referralTime = "";
                    form.querySelectorAll(".decision-option").forEach(function (option) { option.classList.toggle("selected", option.contains(input)); });
                    updateDecisionFields(process, session);
                });
            });
            document.getElementById("saveDraft").addEventListener("click", function () { saveDraft(process.id, session.id); });
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                markSessionAttended(process.id, session.id);
            });
            setupDecisionFieldEvents(process, session);
        }

        function updateDecisionFields(process, session) {
            document.getElementById("decisionFields").innerHTML = renderDecisionFields(process, session);
            setupDecisionFieldEvents(process, session);
        }

        function setupDecisionFieldEvents(process, session) {
            const followupDate = document.getElementById("followupDate");
            if (followupDate) followupDate.addEventListener("change", function () { state.followupDate = followupDate.value; state.followupTime = ""; updateDecisionFields(process, session); });
            document.querySelectorAll("[data-followup-time]").forEach(function (button) {
                button.addEventListener("click", function () { state.followupTime = button.dataset.followupTime; updateDecisionFields(process, session); });
            });
            const referralArea = document.getElementById("referralArea");
            if (referralArea) referralArea.addEventListener("change", function () { state.referralArea = referralArea.value; state.referralSpecialist = areas[state.referralArea][0]; state.referralTime = ""; updateDecisionFields(process, session); });
            const referralSpecialist = document.getElementById("referralSpecialist");
            if (referralSpecialist) referralSpecialist.addEventListener("change", function () { state.referralSpecialist = referralSpecialist.value; state.referralTime = ""; updateDecisionFields(process, session); });
            const referralDate = document.getElementById("referralDate");
            if (referralDate) referralDate.addEventListener("change", function () { state.referralDate = referralDate.value; state.referralTime = ""; updateDecisionFields(process, session); });
            document.querySelectorAll("[data-referral-time]").forEach(function (button) {
                button.addEventListener("click", function () { state.referralTime = button.dataset.referralTime; updateDecisionFields(process, session); });
            });
            document.querySelectorAll('input[name="closureStatus"]').forEach(function (input) {
                input.addEventListener("change", function () { state.closureStatus = input.value; });
            });
        }

        function collectClinicalData() {
            return {
                motivo: document.getElementById("clinicalReason").value.trim(),
                evolucion: document.getElementById("clinicalEvolution").value.trim(),
                observaciones: document.getElementById("clinicalObservations").value.trim(),
                tecnicas: document.getElementById("clinicalTechniques").value.trim(),
                impresion: document.getElementById("clinicalImpression").value.trim(),
                acuerdos: document.getElementById("clinicalAgreements").value.trim()
            };
        }

        function saveDraft(processId, sessionId) {
            const processes = getProcesses();
            const process = processes.find(function (item) { return item.id === processId; });
            const session = process && process.sessions.find(function (item) { return item.id === sessionId; });
            if (!session || isClosed(process)) return;
            session.clinical = collectClinicalData();
            session.status = "Borrador";
            session.updatedAt = new Date().toISOString();
            saveProcesses(processes);
            showToast("Borrador clínico guardado.");
            renderProcessDetail();
        }

        function validateSessionForm(process, session) {
            const requiredIds = ["clinicalReason", "clinicalEvolution", "clinicalTechniques", "clinicalImpression", "clinicalAgreements"];
            let valid = true;
            requiredIds.forEach(function (id) {
                const field = document.getElementById(id);
                const wrapper = field.closest(".clinical-field");
                wrapper.classList.remove("invalid");
                wrapper.querySelector("small").textContent = "";
                if (!field.value.trim()) {
                    wrapper.classList.add("invalid");
                    wrapper.querySelector("small").textContent = "Este campo es obligatorio para cerrar la sesión.";
                    valid = false;
                }
            });
            let message = "";
            if (!state.action) {
                message = "Selecciona una decisión post-sesión.";
                valid = false;
            } else if (state.action === "Seguimiento") {
                if (!state.followupDate || state.followupDate < today || !state.followupTime) {
                    message = "Selecciona una fecha futura y un horario libre para el seguimiento.";
                    valid = false;
                } else if (!isTimeFree(process.specialist, state.followupDate, state.followupTime)) {
                    message = "El horario de seguimiento ya no está disponible.";
                    valid = false;
                }
            } else if (state.action === "Derivación") {
                if (!state.referralArea || !state.referralSpecialist || !state.referralDate || state.referralDate < today || !state.referralTime) {
                    message = "Completa el área, especialista, fecha y horario de la derivación.";
                    valid = false;
                } else if (!isTimeFree(state.referralSpecialist, state.referralDate, state.referralTime)) {
                    message = "El horario del especialista receptor ya no está disponible.";
                    valid = false;
                }
            } else if (state.action === "Cierre" && !["Cerrado", "De Alta"].includes(state.closureStatus)) {
                message = "Selecciona el estado final del proceso.";
                valid = false;
            }
            document.getElementById("clinicalFormError").textContent = message;
            if (!valid) {
                const firstInvalid = document.querySelector(".clinical-field.invalid textarea");
                if (firstInvalid) firstInvalid.focus();
            }
            return valid;
        }

        function markSessionAttended(processId, sessionId) {
            let processes = getProcesses();
            const process = processes.find(function (item) { return item.id === processId; });
            const session = process && process.sessions.find(function (item) { return item.id === sessionId; });
            if (!process || !session || isClosed(process) || !validateSessionForm(process, session)) return;

            session.clinical = collectClinicalData();
            session.status = "Atendida";
            session.attendedAt = new Date().toISOString();
            session.certificateAvailable = true;
            session.decision = buildDecision();
            process.updatedAt = new Date().toISOString();
            updateRelatedAppointment(session.appointmentId, "Atendida");

            if (state.action === "Seguimiento") {
                const appointment = createAppointment(process.patientId, process.patientName, process.area, process.specialist, state.followupDate, state.followupTime);
                process.sessions.push({ id: `sesion-${Date.now()}`, number: Math.max(...process.sessions.map(function (item) { return item.number; })) + 1, appointmentId: appointment.id, date: appointment.date, time: appointment.time, status: "Programada", clinical: {}, decision: null });
                addNotification("Seguimiento programado", `${process.patientName} · ${formatDate(appointment.date)} ${appointment.time}`);
            } else if (state.action === "Derivación") {
                processes = createReferralFlow(processes, process, session);
            } else {
                process.status = state.closureStatus;
                process.closedAt = new Date().toISOString();
                process.closureReportAvailable = true;
            }

            saveProcesses(processes);
            state.activeSessionId = session.id;
            showToast(state.action === "Cierre" ? `Sesión atendida y proceso ${state.closureStatus.toLowerCase()}.` : "Sesión marcada como atendida. Certificado habilitado.");
            renderProcessDetail();
        }

        function buildDecision() {
            if (state.action === "Seguimiento") return { type: "Seguimiento", date: state.followupDate, time: state.followupTime };
            if (state.action === "Derivación") return { type: "Derivación", area: state.referralArea, specialist: state.referralSpecialist, date: state.referralDate, time: state.referralTime };
            return { type: "Cierre", status: state.closureStatus };
        }

        function updateRelatedAppointment(appointmentId, status) {
            if (!appointmentId) return;
            const appointments = getAppointments();
            const appointment = appointments.find(function (item) { return item.id === appointmentId; });
            if (appointment) {
                appointment.status = status;
                appointment.updatedAt = new Date().toISOString();
                saveAppointments(appointments);
            }
        }

        function createAppointment(patientId, name, area, specialist, date, time) {
            const appointment = { id: `cita-${Date.now()}-${Math.floor(Math.random() * 1000)}`, patientId: patientId, patientName: name, area: area, specialist: specialist, date: date, time: time, status: "Programada", channel: "WhatsApp", notified: true, createdAt: new Date().toISOString() };
            const appointments = getAppointments();
            appointments.push(appointment);
            saveAppointments(appointments);
            return appointment;
        }

        function createReferralFlow(processes, process, session) {
            const appointment = createAppointment(process.patientId, process.patientName, state.referralArea, state.referralSpecialist, state.referralDate, state.referralTime);
            let referrals;
            try { referrals = JSON.parse(localStorage.getItem("derivaciones")) || []; } catch (error) { referrals = []; }
            referrals.unshift({ id: `der-${Date.now()}`, patientId: process.patientId, patientName: process.patientName, area: process.area, destination: state.referralArea, specialist: state.referralSpecialist, scope: "Interna", status: "Agendada", date: state.referralDate, appointmentId: appointment.id, sourceProcessId: process.id, sourceSessionId: session.id });
            localStorage.setItem("derivaciones", JSON.stringify(referrals));

            let targetProcess = processes.find(function (candidate) {
                return candidate.patientId === process.patientId && candidate.area === state.referralArea && !isClosed(candidate);
            });
            if (targetProcess) {
                targetProcess.sessions.push({ id: `sesion-${Date.now()}-der`, number: Math.max(...targetProcess.sessions.map(function (item) { return item.number; })) + 1, appointmentId: appointment.id, date: appointment.date, time: appointment.time, status: "Programada", clinical: {}, decision: null });
                targetProcess.updatedAt = new Date().toISOString();
            } else {
                const priorValidated = processes.some(function (candidate) {
                    return candidate.patientId === process.patientId && candidate.area === state.referralArea && attendedSessions(candidate).length > 0 && hasValidatedConsent(candidate);
                });
                targetProcess = {
                    id: `proceso-${Date.now()}-der`, patientId: process.patientId, patientName: process.patientName, area: state.referralArea, specialist: state.referralSpecialist, status: "Activo", openedAt: new Date().toISOString(), sourceReferralId: referrals[0].id,
                    consent: priorValidated ? { status: "inherited", fileName: "Consentimiento validado previamente en el área", validatedAt: new Date().toISOString() } : { status: "pending", fileName: "", generatedAt: null, validatedAt: null },
                    sessions: [{ id: `sesion-${Date.now()}-der`, number: 1, appointmentId: appointment.id, date: appointment.date, time: appointment.time, status: "Programada", clinical: {}, decision: null }]
                };
                processes.push(targetProcess);
            }
            addNotification("Derivación agendada", `${process.patientName} · ${state.referralArea} · ${formatDate(state.referralDate)} ${state.referralTime}`);
            return processes;
        }

        function generateConsentPdf(process, patient) {
            const lines = [
                `Paciente: ${patientName(patient)}`,
                `Documento: ${patient.tipoDocumento || "Documento"} ${patient.cedula || "No registrado"}`,
                `Fecha de nacimiento: ${patient.fechaNacimiento ? formatDate(patient.fechaNacimiento) : "No registrada"}`,
                `Tipo de paciente: ${patient.tipoPaciente || "No registrado"}`,
                `Area de atencion: ${process.area}`,
                `Profesional responsable: ${process.specialist}`,
                patient.representante ? `Representante legal: ${patient.representante.nombres}` : "Paciente mayor de edad",
                patient.representante ? `Documento del representante: ${patient.representante.cedula}` : "",
                "",
                "Declaro haber recibido informacion clara sobre el proceso de atencion psicologica, sus objetivos, alcance, confidencialidad y limites legales.",
                "Autorizo voluntariamente el inicio del proceso y el tratamiento institucional de la informacion necesaria para la atencion.",
                "",
                "Firma del paciente o representante: ______________________________",
                "Firma del profesional: __________________________________________",
                `Fecha: ${formatDate(today)}`
            ];
            downloadPdf(`consentimiento-${process.id}.pdf`, "CONSENTIMIENTO INFORMADO", `Primera atención · ${process.area}`, lines);
        }

        function certificateLines(process, session) {
            return [
                `Se certifica que ${process.patientName} asistio a la Sesion ${session.number} de su proceso de atencion psicologica.`,
                "",
                `Area: ${process.area}`,
                `Profesional: ${process.specialist}`,
                `Fecha de atencion: ${formatDate(session.date)}`,
                `Hora: ${session.time}`,
                `Estado: ATENDIDA`,
                "",
                "Este certificado acredita exclusivamente la asistencia y no contiene informacion clinica confidencial."
            ];
        }

        function downloadCertificate(process, session) {
            downloadPdf(`certificado-asistencia-${process.id}-s${session.number}.pdf`, "CERTIFICADO DE ASISTENCIA", `Proceso ${process.id.slice(-8)}`, certificateLines(process, session));
        }

        function printCertificate(process, session) {
            const lines = certificateLines(process, session);
            const printWindow = window.open("", "_blank", "width=780,height=720");
            if (!printWindow) {
                showToast("El navegador bloqueó la ventana de impresión.", "warning");
                return;
            }
            printWindow.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Certificado de asistencia</title><style>body{font-family:Arial,sans-serif;padding:70px;color:#173447}h1{font-size:22px;color:#002e45;border-bottom:3px solid #ff6900;padding-bottom:16px}h2{font-size:14px;margin:25px 0}p{font-size:13px;line-height:1.8}.footer{margin-top:90px;border-top:1px solid #ccd7dc;padding-top:15px;font-size:10px;color:#657782}@media print{button{display:none}}</style></head><body><h1>UNEMI · Salud y Desarrollo Humano</h1><h2>CERTIFICADO DE ASISTENCIA</h2>${lines.map(function (line) { return `<p>${escapeHTML(line) || "&nbsp;"}</p>`; }).join("")}<p class="footer">Documento generado por el Sistema de Salud UNEMI.</p><script>window.onload=function(){window.print();}<\/script></body></html>`);
            printWindow.document.close();
        }

        function downloadClosureReport(process) {
            const completed = attendedSessions(process);
            const lastSession = completed[completed.length - 1];
            const lines = [
                `Paciente: ${process.patientName}`,
                `Area: ${process.area}`,
                `Profesional: ${process.specialist}`,
                `Estado final: ${process.status}`,
                `Fecha de cierre: ${formatDate((process.closedAt || today).slice(0, 10))}`,
                `Sesiones atendidas: ${completed.length}`,
                "",
                "Resumen de cierre:",
                lastSession && lastSession.clinical ? lastSession.clinical.evolucion : "Sin resumen registrado.",
                "",
                "Impresion clinica final:",
                lastSession && lastSession.clinical ? lastSession.clinical.impresion : "Sin impresion registrada.",
                "",
                "Acuerdos finales:",
                lastSession && lastSession.clinical ? lastSession.clinical.acuerdos : "Sin acuerdos registrados."
            ];
            downloadPdf(`informe-cierre-${process.id}.pdf`, "INFORME DE CIERRE", `Estado: ${process.status}`, lines);
        }

        function normalizePdfText(value) {
            return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/([()\\])/g, "\\$1");
        }

        function wrapPdfLine(value, maxLength) {
            const words = normalizePdfText(value).split(/\s+/);
            const lines = [];
            let current = "";
            words.forEach(function (word) {
                if (`${current} ${word}`.trim().length > maxLength && current) {
                    lines.push(current);
                    current = word;
                } else {
                    current = `${current} ${word}`.trim();
                }
            });
            lines.push(current);
            return lines;
        }

        function downloadPdf(fileName, title, subtitle, rows) {
            const textLines = [title, subtitle, "", ...rows].flatMap(function (row) { return wrapPdfLine(row, 82); }).slice(0, 43);
            const stream = textLines.map(function (line, index) {
                const size = index === 0 ? 17 : index === 1 ? 11 : 10;
                const y = 790 - (index * 17);
                return `BT /F1 ${size} Tf 1 0 0 1 52 ${y} Tm (${normalizePdfText(line)}) Tj ET`;
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
            objects.forEach(function (object, index) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
            const xrefOffset = pdf.length;
            pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
            offsets.slice(1).forEach(function (offset) { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
            pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
            const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }

        function handlePrimaryAction() {
            if (state.activeProcessId) {
                renderProcessList();
                return;
            }
            openScheduling(state.area);
        }

        return {
            seedDemoProcesses,
            renderArea,
            renderProcessList,
            handlePrimaryAction,
            isDetailOpen: function () { return Boolean(state.activeProcessId); }
        };
    };
}());