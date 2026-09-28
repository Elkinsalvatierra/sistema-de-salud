(function () {
    "use strict";

    window.createInstitutionalReportsModule = function (dependencies) {
        const {
            contentRoot,
            sectionAction,
            areas,
            today,
            formatDate,
            escapeHTML,
            patientName,
            getPatients,
            getAppointments,
            getDashboardView,
            showToast
        } = dependencies;

        const reportState = {
            from: `${today.slice(0, 7)}-01`,
            to: endOfMonth(today),
            area: "Todas",
            specialist: "Todos",
            patientType: "Todos",
            tab: "Atenciones"
        };

        const informeState = {
            selectedProcessId: "",
            form: null
        };

        function safeParse(key, fallback) {
            try {
                return JSON.parse(localStorage.getItem(key)) || fallback;
            } catch (error) {
                return fallback;
            }
        }

        function endOfMonth(dateString) {
            const parts = dateString.split("-").map(Number);
            const end = new Date(parts[0], parts[1], 0);
            return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
        }

        function getProcesses() {
            return safeParse("procesosClinicos", []);
        }

        function getPatient(patientId) {
            return getPatients().find(function (patient) { return patient.id === patientId; });
        }

        function getAttendedSessions(process) {
            return (process.sessions || []).filter(function (session) { return session.status === "Atendida"; });
        }

        function getAttachments(processId) {
            return safeParse("documentosEvaluacion", []).filter(function (item) { return item.processId === processId; });
        }

        function getDrafts() {
            return safeParse("informesTecnicos", []);
        }

        function defaultReportForm(process) {
            const attended = getAttendedSessions(process);
            return {
                reportType: "Informe psicológico institucional",
                addressee: "Jefatura de Salud y Desarrollo Humano",
                purpose: "Sistematización técnica del proceso de atención",
                conclusions: "",
                recommendations: "",
                sessionIds: attended.map(function (session) { return session.id; }),
                status: "Borrador"
            };
        }

        function loadReportForm(process) {
            const saved = getDrafts().find(function (draft) { return draft.processId === process.id; });
            const base = defaultReportForm(process);
            if (!saved) return base;
            return {
                ...base,
                ...saved,
                sessionIds: Array.isArray(saved.sessionIds) ? saved.sessionIds : base.sessionIds
            };
        }

        function setPrimaryAction(icon, text) {
            sectionAction.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span><span>${escapeHTML(text)}</span>`;
        }

        function renderInformes() {
            setPrimaryAction("picture_as_pdf", "Generar PDF");
            const processes = getProcesses().slice().sort(function (a, b) {
                return String(b.updatedAt || b.openedAt || "").localeCompare(String(a.updatedAt || a.openedAt || ""));
            });

            if (!processes.length) {
                contentRoot.innerHTML = `<section class="panel empty-state"><span class="material-symbols-outlined">folder_off</span><h3>No existen procesos clínicos</h3><p>Los informes se habilitan cuando el paciente cuenta con un proceso de atención.</p></section>`;
                return;
            }

            if (!processes.some(function (process) { return process.id === informeState.selectedProcessId; })) {
                const preferred = processes.find(function (process) { return getAttendedSessions(process).length > 0; }) || processes[0];
                informeState.selectedProcessId = preferred.id;
                informeState.form = loadReportForm(preferred);
            }

            const process = processes.find(function (item) { return item.id === informeState.selectedProcessId; });
            if (!informeState.form) informeState.form = loadReportForm(process);
            const patient = getPatient(process.patientId) || { id: process.patientId, nombre: process.patientName, tipoPaciente: "No registrado" };
            const attended = getAttendedSessions(process);
            const attachments = getAttachments(process.id);
            const lastSaved = getDrafts().find(function (draft) { return draft.processId === process.id; });

            contentRoot.innerHTML = `
                <section class="report-context-bar" aria-label="Selección de expediente">
                    <label class="report-context-main">Proceso clínico
                        <select id="reportProcessSelect">
                            ${processes.map(function (item) {
                                const sessionCount = getAttendedSessions(item).length;
                                return `<option value="${escapeHTML(item.id)}" ${item.id === process.id ? "selected" : ""}>${escapeHTML(item.patientName)} · ${escapeHTML(item.area)} · ${sessionCount} ${sessionCount === 1 ? "sesión" : "sesiones"}</option>`;
                            }).join("")}
                        </select>
                    </label>
                    <div class="context-stat"><span>Estado</span><strong class="report-state ${process.status === "Activo" ? "active" : "closed"}">${escapeHTML(process.status)}</strong></div>
                    <div class="context-stat"><span>Responsable</span><strong>${escapeHTML(process.specialist)}</strong></div>
                    <div class="context-stat"><span>Última versión</span><strong>${lastSaved && lastSaved.generatedAt ? formatDate(lastSaved.generatedAt.slice(0, 10)) : "Sin generar"}</strong></div>
                </section>

                <div class="institutional-layout">
                    <div class="institutional-main">
                        <section class="panel report-builder-panel">
                            <div class="panel-heading">
                                <div><span class="eyebrow">Expediente técnico</span><h2>Compilación del informe</h2></div>
                                <span class="confidential-pill"><span class="material-symbols-outlined">lock</span>Confidencial</span>
                            </div>
                            <form id="technicalReportForm" class="technical-report-form" novalidate>
                                <label class="field">Formato institucional
                                    <select id="reportType">
                                        ${["Informe psicológico institucional", "Informe de evolución", "Informe de cierre", "Informe psicopedagógico"].map(function (type) { return `<option value="${escapeHTML(type)}" ${informeState.form.reportType === type ? "selected" : ""}>${escapeHTML(type)}</option>`; }).join("")}
                                    </select>
                                </label>
                                <label class="field">Dirigido a *
                                    <input id="reportAddressee" type="text" maxlength="120" value="${escapeHTML(informeState.form.addressee)}" required>
                                </label>
                                <label class="field full">Finalidad del informe *
                                    <input id="reportPurpose" type="text" maxlength="180" value="${escapeHTML(informeState.form.purpose)}" required>
                                </label>
                                <fieldset class="session-selector full">
                                    <legend>Sesiones que integran el documento *</legend>
                                    ${attended.length ? attended.map(function (session) {
                                        return `<label><input type="checkbox" data-report-session value="${escapeHTML(session.id)}" ${informeState.form.sessionIds.includes(session.id) ? "checked" : ""}><span><strong>Sesión ${session.number}</strong><small>${formatDate(session.date)} · ${escapeHTML(session.time)}</small></span></label>`;
                                    }).join("") : `<div class="inline-empty"><span class="material-symbols-outlined">pending_actions</span><span>No hay sesiones marcadas como atendidas.</span></div>`}
                                </fieldset>
                                <label class="clinical-field full"><span>Conclusiones profesionales *</span><textarea id="reportConclusions" rows="5" required placeholder="Sintetiza los hallazgos y la evolución relevante.">${escapeHTML(informeState.form.conclusions)}</textarea><small></small></label>
                                <label class="clinical-field full"><span>Recomendaciones</span><textarea id="reportRecommendations" rows="4" placeholder="Registra orientaciones y acciones sugeridas.">${escapeHTML(informeState.form.recommendations)}</textarea><small></small></label>
                                <p class="clinical-form-error full" id="technicalReportError" role="alert"></p>
                                <div class="report-form-actions full">
                                    <button class="secondary-action" id="saveReportDraft" type="button"><span class="material-symbols-outlined">save</span>Guardar borrador</button>
                                    <button class="primary-button" type="submit" ${attended.length ? "" : "disabled"}><span class="material-symbols-outlined">picture_as_pdf</span>Generar PDF institucional</button>
                                </div>
                            </form>
                        </section>

                        <section class="panel attachment-panel">
                            <div class="panel-heading">
                                <div><span class="eyebrow">Documentación complementaria</span><h2>Evaluaciones y pruebas escaneadas</h2></div>
                                <span class="attachment-count">${attachments.length} ${attachments.length === 1 ? "archivo" : "archivos"}</span>
                            </div>
                            <form id="attachmentForm" class="attachment-form" novalidate>
                                <label class="field">Tipo de anexo
                                    <select id="attachmentCategory">
                                        <option>Evaluación física</option>
                                        <option>Prueba psicométrica</option>
                                        <option>Informe externo</option>
                                        <option>Otro documento</option>
                                    </select>
                                </label>
                                <label class="field">Nombre del documento *
                                    <input id="attachmentTitle" type="text" maxlength="100" placeholder="Ej. Inventario de ansiedad">
                                </label>
                                <label class="attachment-picker" id="attachmentPicker">
                                    <input id="attachmentFile" type="file" accept="application/pdf,.pdf">
                                    <span class="material-symbols-outlined">upload_file</span>
                                    <span><strong id="attachmentFileName">Seleccionar PDF</strong><small>Máximo 10 MB</small></span>
                                </label>
                                <button class="secondary-action" type="submit"><span class="material-symbols-outlined">add</span>Adjuntar</button>
                                <p class="attachment-error" id="attachmentError" role="alert"></p>
                            </form>
                            <div class="attachment-list">
                                ${attachments.length ? attachments.map(renderAttachment).join("") : `<div class="inline-empty"><span class="material-symbols-outlined">scan</span><span>Sin evaluaciones físicas ni pruebas psicométricas adjuntas.</span></div>`}
                            </div>
                        </section>
                    </div>

                    <aside class="panel report-preview-panel">
                        <div class="panel-heading compact"><div><span class="eyebrow">Vista previa</span><h2>Documento institucional</h2></div><span class="material-symbols-outlined preview-icon">description</span></div>
                        <div id="reportPreview">${renderReportPreview(process, patient)}</div>
                    </aside>
                </div>
            `;

            setupInformeEvents(process);
        }

        function renderAttachment(item) {
            return `
                <article class="attachment-item">
                    <span class="attachment-icon material-symbols-outlined">picture_as_pdf</span>
                    <div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.category)} · ${formatFileSize(item.size)} · ${formatDate(item.uploadedAt.slice(0, 10))}</small><span>${escapeHTML(item.fileName)}</span></div>
                    <button class="icon-button" type="button" data-download-attachment="${escapeHTML(item.id)}" title="Descargar PDF" aria-label="Descargar ${escapeHTML(item.title)}"><span class="material-symbols-outlined">download</span></button>
                    <button class="icon-button danger" type="button" data-delete-attachment="${escapeHTML(item.id)}" title="Eliminar anexo" aria-label="Eliminar ${escapeHTML(item.title)}"><span class="material-symbols-outlined">delete</span></button>
                </article>
            `;
        }

        function formatFileSize(size) {
            if (!Number.isFinite(size)) return "Tamaño no disponible";
            if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }

        function renderReportPreview(process, patient) {
            const selected = getAttendedSessions(process).filter(function (session) { return informeState.form.sessionIds.includes(session.id); });
            const identification = `${patient.tipoDocumento || "Documento"}: ${patient.cedula || "No registrado"} · ${patient.tipoPaciente || "No registrado"}`;
            return `
                <article class="report-paper">
                    <header><strong>UNIVERSIDAD ESTATAL DE MILAGRO</strong><span>Salud y Desarrollo Humano</span><i></i></header>
                    <h3>${escapeHTML(informeState.form.reportType)}</h3>
                    <dl>
                        <div><dt>Paciente</dt><dd>${escapeHTML(patientName(patient))}</dd></div>
                        <div><dt>Identificación</dt><dd>${escapeHTML(identification)}</dd></div>
                        <div><dt>Área</dt><dd>${escapeHTML(process.area)}</dd></div>
                        <div><dt>Profesional</dt><dd>${escapeHTML(process.specialist)}</dd></div>
                        <div><dt>Dirigido a</dt><dd>${escapeHTML(informeState.form.addressee || "Pendiente")}</dd></div>
                        <div><dt>Finalidad</dt><dd>${escapeHTML(informeState.form.purpose || "Pendiente")}</dd></div>
                    </dl>
                    <section><h4>Registro consolidado</h4>${selected.length ? selected.map(function (session) { return `<div class="preview-session"><strong>Sesión ${session.number} · ${formatDate(session.date)}</strong><p>${escapeHTML(session.clinical && session.clinical.evolucion || "Sin evolución registrada.")}</p></div>`; }).join("") : `<p>Selecciona al menos una sesión atendida.</p>`}</section>
                    <section><h4>Conclusiones</h4><p>${formatPreviewText(informeState.form.conclusions || "Pendientes de completar.")}</p></section>
                    <section><h4>Recomendaciones</h4><p>${formatPreviewText(informeState.form.recommendations || "Sin recomendaciones registradas.")}</p></section>
                    <footer>Documento confidencial · Sistema de Salud UNEMI</footer>
                </article>
            `;
        }

        function formatPreviewText(value) {
            return escapeHTML(value).replace(/\n/g, "<br>");
        }

        function syncReportFormFromDom() {
            const type = document.getElementById("reportType");
            if (!type || !informeState.form) return;
            informeState.form.reportType = type.value;
            informeState.form.addressee = document.getElementById("reportAddressee").value.trim();
            informeState.form.purpose = document.getElementById("reportPurpose").value.trim();
            informeState.form.conclusions = document.getElementById("reportConclusions").value.trim();
            informeState.form.recommendations = document.getElementById("reportRecommendations").value.trim();
            informeState.form.sessionIds = Array.from(document.querySelectorAll("[data-report-session]:checked")).map(function (input) { return input.value; });
        }

        function refreshReportPreview(process) {
            syncReportFormFromDom();
            const patient = getPatient(process.patientId) || { nombre: process.patientName };
            const preview = document.getElementById("reportPreview");
            if (preview) preview.innerHTML = renderReportPreview(process, patient);
        }

        function setupInformeEvents(process) {
            document.getElementById("reportProcessSelect").addEventListener("change", function (event) {
                informeState.selectedProcessId = event.target.value;
                const selected = getProcesses().find(function (item) { return item.id === informeState.selectedProcessId; });
                informeState.form = loadReportForm(selected);
                renderInformes();
            });

            ["reportType", "reportAddressee", "reportPurpose", "reportConclusions", "reportRecommendations"].forEach(function (id) {
                document.getElementById(id).addEventListener(id === "reportType" ? "change" : "input", function () { refreshReportPreview(process); });
            });
            document.querySelectorAll("[data-report-session]").forEach(function (input) {
                input.addEventListener("change", function () { refreshReportPreview(process); });
            });

            document.getElementById("saveReportDraft").addEventListener("click", function () { saveReport(process, false); });
            document.getElementById("technicalReportForm").addEventListener("submit", function (event) {
                event.preventDefault();
                generateInstitutionalPdf(process);
            });

            const fileInput = document.getElementById("attachmentFile");
            fileInput.addEventListener("change", function () {
                const file = fileInput.files[0];
                document.getElementById("attachmentFileName").textContent = file ? file.name : "Seleccionar PDF";
                if (file && !document.getElementById("attachmentTitle").value.trim()) {
                    document.getElementById("attachmentTitle").value = file.name.replace(/\.pdf$/i, "");
                }
            });
            document.getElementById("attachmentForm").addEventListener("submit", function (event) { void uploadAttachment(event, process); });
            contentRoot.querySelectorAll("[data-download-attachment]").forEach(function (button) {
                button.addEventListener("click", function () { void downloadAttachment(button.dataset.downloadAttachment); });
            });
            contentRoot.querySelectorAll("[data-delete-attachment]").forEach(function (button) {
                button.addEventListener("click", function () { void deleteAttachment(button.dataset.deleteAttachment); });
            });
        }

        function validateReport(process) {
            syncReportFormFromDom();
            const error = document.getElementById("technicalReportError");
            const required = [
                ["reportAddressee", informeState.form.addressee],
                ["reportPurpose", informeState.form.purpose],
                ["reportConclusions", informeState.form.conclusions]
            ];
            document.querySelectorAll("#technicalReportForm .invalid").forEach(function (field) { field.classList.remove("invalid"); });
            const missing = required.find(function (item) { return !item[1]; });
            if (missing) {
                const input = document.getElementById(missing[0]);
                input.closest("label").classList.add("invalid");
                input.focus();
                error.textContent = "Completa los campos obligatorios antes de generar el informe.";
                return false;
            }
            const attendedIds = new Set(getAttendedSessions(process).map(function (session) { return session.id; }));
            if (!informeState.form.sessionIds.length || informeState.form.sessionIds.some(function (id) { return !attendedIds.has(id); })) {
                error.textContent = "Selecciona al menos una sesión atendida válida.";
                return false;
            }
            error.textContent = "";
            return true;
        }

        function saveReport(process, generated) {
            syncReportFormFromDom();
            const drafts = getDrafts();
            const existingIndex = drafts.findIndex(function (draft) { return draft.processId === process.id; });
            const previous = existingIndex >= 0 ? drafts[existingIndex] : {};
            const record = {
                ...previous,
                ...informeState.form,
                id: previous.id || `inf-${Date.now()}`,
                processId: process.id,
                patientId: process.patientId,
                patientName: process.patientName,
                area: process.area,
                specialist: process.specialist,
                status: generated ? "Generado" : "Borrador",
                updatedAt: new Date().toISOString(),
                generatedAt: generated ? new Date().toISOString() : previous.generatedAt || null
            };
            if (existingIndex >= 0) drafts.splice(existingIndex, 1, record);
            else drafts.unshift(record);
            localStorage.setItem("informesTecnicos", JSON.stringify(drafts));
            informeState.form = { ...record };
            if (!generated) showToast("Borrador del informe guardado.");
            return record;
        }

        function generateInstitutionalPdf(process) {
            if (!validateReport(process)) return;
            const patient = getPatient(process.patientId) || { nombre: process.patientName };
            const sessions = getAttendedSessions(process).filter(function (session) { return informeState.form.sessionIds.includes(session.id); });
            const report = saveReport(process, true);
            const attachments = getAttachments(process.id);
            const lines = buildInstitutionalReportLines(process, patient, sessions, attachments, report);
            const safeName = String(process.patientName || "paciente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
            downloadMultipagePdf(`informe-${safeName || process.id}.pdf`, report.reportType, lines);
            showToast("Informe institucional generado en PDF.");
            renderInformes();
        }

        function buildInstitutionalReportLines(process, patient, sessions, attachments, report) {
            const lines = [
                { text: report.reportType.toUpperCase(), style: "title" },
                { text: `Código de proceso: ${process.id}`, style: "meta" },
                { text: `Fecha de emisión: ${formatDate(today)}`, style: "meta" },
                { text: "1. IDENTIFICACIÓN", style: "section" },
                { text: `Paciente: ${patientName(patient)}` },
                { text: `Documento: ${patient.tipoDocumento || "Documento"} ${patient.cedula || "No registrado"}` },
                { text: `Tipo de paciente: ${patient.tipoPaciente || "No registrado"}` },
                { text: `Área: ${process.area}` },
                { text: `Profesional responsable: ${process.specialist}` },
                { text: `Dirigido a: ${report.addressee}` },
                { text: `Finalidad: ${report.purpose}` },
                { text: "2. REGISTRO TÉCNICO CONSOLIDADO", style: "section" }
            ];

            sessions.forEach(function (session) {
                const clinical = session.clinical || {};
                lines.push({ text: `Sesión ${session.number} · ${formatDate(session.date)} · ${session.time}`, style: "subsection" });
                lines.push({ text: `Motivo de consulta: ${clinical.motivo || "No registrado"}` });
                lines.push({ text: `Evolución: ${clinical.evolucion || "No registrada"}` });
                if (clinical.observaciones) lines.push({ text: `Observaciones: ${clinical.observaciones}` });
                lines.push({ text: `Técnicas e intervenciones: ${clinical.tecnicas || "No registradas"}` });
                lines.push({ text: `Impresión clínica: ${clinical.impresion || "No registrada"}` });
                lines.push({ text: `Acuerdos: ${clinical.acuerdos || "No registrados"}` });
            });

            lines.push({ text: "3. CONCLUSIONES PROFESIONALES", style: "section" });
            lines.push({ text: report.conclusions });
            lines.push({ text: "4. RECOMENDACIONES", style: "section" });
            lines.push({ text: report.recommendations || "No se registran recomendaciones adicionales." });
            lines.push({ text: "5. ANEXOS DEL EXPEDIENTE", style: "section" });
            if (attachments.length) {
                attachments.forEach(function (item, index) { lines.push({ text: `${index + 1}. ${item.title} · ${item.category} · ${item.fileName}` }); });
            } else {
                lines.push({ text: "Sin anexos registrados al momento de la emisión." });
            }
            lines.push({ text: "Firma del profesional: _________________________________________", style: "signature" });
            lines.push({ text: `${process.specialist} · ${process.area}`, style: "meta" });
            return lines;
        }

        function normalizePdfText(value) {
            return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/([()\\])/g, "\\$1");
        }

        function wrapPdfEntries(entries, maxLength) {
            return entries.flatMap(function (entry) {
                const words = normalizePdfText(entry.text).split(/\s+/).filter(Boolean);
                const wrapped = [];
                let current = "";
                words.forEach(function (word) {
                    if (`${current} ${word}`.trim().length > maxLength && current) {
                        wrapped.push({ text: current, style: entry.style || "body" });
                        current = word;
                    } else {
                        current = `${current} ${word}`.trim();
                    }
                });
                wrapped.push({ text: current, style: entry.style || "body" });
                return wrapped;
            });
        }

        function downloadMultipagePdf(fileName, documentTitle, entries) {
            const bodyLines = wrapPdfEntries(entries, 88);
            const pages = [];
            for (let index = 0; index < bodyLines.length; index += 34) pages.push(bodyLines.slice(index, index + 34));
            if (!pages.length) pages.push([]);

            const regularFontNumber = 3 + pages.length * 2;
            const boldFontNumber = regularFontNumber + 1;
            const objects = [];
            objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
            const kids = pages.map(function (_, index) { return `${3 + index * 2} 0 R`; }).join(" ");
            objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;

            pages.forEach(function (pageLines, pageIndex) {
                const pageObjectNumber = 3 + pageIndex * 2;
                const contentObjectNumber = pageObjectNumber + 1;
                const commands = [
                    "0.02 0.19 0.31 rg",
                    `BT /F2 14 Tf 1 0 0 1 48 805 Tm (${normalizePdfText("UNIVERSIDAD ESTATAL DE MILAGRO")}) Tj ET`,
                    `BT /F1 9 Tf 1 0 0 1 48 790 Tm (${normalizePdfText("Salud y Desarrollo Humano · Documento técnico confidencial")}) Tj ET`,
                    "0.05 0.47 0.68 RG 1.2 w 48 780 m 547 780 l S"
                ];
                let y = 758;
                pageLines.forEach(function (line) {
                    const style = line.style || "body";
                    const bold = ["title", "section", "subsection"].includes(style);
                    const size = style === "title" ? 13 : style === "section" ? 10.5 : style === "subsection" ? 10 : 9.3;
                    if (style === "section" || style === "title") y -= 5;
                    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 0.08 0.16 0.22 rg 1 0 0 1 52 ${y} Tm (${normalizePdfText(line.text)}) Tj ET`);
                    y -= style === "section" || style === "title" ? 19 : 16;
                });
                commands.push("0.78 0.83 0.85 RG 0.5 w 48 40 m 547 40 l S");
                commands.push(`BT /F1 8 Tf 0.35 0.42 0.45 rg 1 0 0 1 48 25 Tm (${normalizePdfText(documentTitle)}) Tj ET`);
                commands.push(`BT /F1 8 Tf 0.35 0.42 0.45 rg 1 0 0 1 482 25 Tm (Pagina ${pageIndex + 1} de ${pages.length}) Tj ET`);
                const stream = commands.join("\n");
                objects[pageObjectNumber - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontNumber} 0 R /F2 ${boldFontNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
                objects[contentObjectNumber - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
            });
            objects[regularFontNumber - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
            objects[boldFontNumber - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

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
            downloadBlob(new Blob([pdf], { type: "application/pdf" }), fileName);
        }

        function openDocumentDatabase() {
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
                request.onsuccess = function () { resolve(request.result); };
            });
        }

        async function putEvaluation(id, file) {
            const database = await openDocumentDatabase();
            return new Promise(function (resolve, reject) {
                const transaction = database.transaction("evaluaciones", "readwrite");
                transaction.objectStore("evaluaciones").put(file, id);
                transaction.oncomplete = function () { database.close(); resolve(); };
                transaction.onerror = function () { database.close(); reject(transaction.error); };
            });
        }

        async function getEvaluation(id) {
            const database = await openDocumentDatabase();
            return new Promise(function (resolve, reject) {
                const transaction = database.transaction("evaluaciones", "readonly");
                const request = transaction.objectStore("evaluaciones").get(id);
                request.onsuccess = function () { database.close(); resolve(request.result); };
                request.onerror = function () { database.close(); reject(request.error); };
            });
        }

        async function removeEvaluation(id) {
            const database = await openDocumentDatabase();
            return new Promise(function (resolve, reject) {
                const transaction = database.transaction("evaluaciones", "readwrite");
                transaction.objectStore("evaluaciones").delete(id);
                transaction.oncomplete = function () { database.close(); resolve(); };
                transaction.onerror = function () { database.close(); reject(transaction.error); };
            });
        }

        async function uploadAttachment(event, process) {
            event.preventDefault();
            const title = document.getElementById("attachmentTitle").value.trim();
            const category = document.getElementById("attachmentCategory").value;
            const file = document.getElementById("attachmentFile").files[0];
            const error = document.getElementById("attachmentError");
            const validPdf = file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
            if (!title) {
                error.textContent = "Ingresa un nombre para el documento.";
                document.getElementById("attachmentTitle").focus();
                return;
            }
            if (!validPdf) {
                error.textContent = "Selecciona un archivo válido en formato PDF.";
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                error.textContent = "El archivo supera el máximo de 10 MB.";
                return;
            }
            error.textContent = "";
            const id = `eval-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            try {
                await putEvaluation(id, file);
                const attachments = safeParse("documentosEvaluacion", []);
                attachments.unshift({ id: id, processId: process.id, patientId: process.patientId, title: title, category: category, fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() });
                localStorage.setItem("documentosEvaluacion", JSON.stringify(attachments));
                showToast("Anexo PDF guardado en el expediente.");
                renderInformes();
            } catch (storageError) {
                error.textContent = "No fue posible guardar el PDF. Intenta nuevamente.";
            }
        }

        async function downloadAttachment(id) {
            const metadata = safeParse("documentosEvaluacion", []).find(function (item) { return item.id === id; });
            if (!metadata) return;
            try {
                const file = await getEvaluation(id);
                if (!file) throw new Error("Archivo no encontrado");
                downloadBlob(file, metadata.fileName);
            } catch (error) {
                showToast("No se encontró el archivo PDF en este navegador.", "warning");
            }
        }

        async function deleteAttachment(id) {
            const metadata = safeParse("documentosEvaluacion", []).find(function (item) { return item.id === id; });
            if (!metadata || !window.confirm(`¿Eliminar el anexo “${metadata.title}”?`)) return;
            try {
                await removeEvaluation(id);
                const attachments = safeParse("documentosEvaluacion", []).filter(function (item) { return item.id !== id; });
                localStorage.setItem("documentosEvaluacion", JSON.stringify(attachments));
                showToast("Anexo eliminado del expediente.");
                renderInformes();
            } catch (error) {
                showToast("No fue posible eliminar el anexo.", "warning");
            }
        }

        function renderReportes() {
            if (getDashboardView && getDashboardView() !== "Jefatura") {
                setPrimaryAction("lock", "Acceso restringido");
                sectionAction.disabled = true;
                contentRoot.innerHTML = `<section class="panel restricted-report-view"><span class="material-symbols-outlined">admin_panel_settings</span><div><span class="eyebrow">Permiso institucional</span><h2>Reportes disponibles para Jefatura</h2><p>La consulta cuantitativa y la exportación administrativa requieren la vista de Jefatura.</p></div></section>`;
                return;
            }
            setPrimaryAction("table_view", "Exportar Excel");
            const data = buildFilteredData();
            const metrics = calculateReportMetrics(data);
            const specialists = getSpecialists();

            contentRoot.innerHTML = `
                <section class="panel report-filter-panel">
                    <div class="report-filter-heading"><div><span class="eyebrow">Motor administrativo</span><h2>Consulta institucional</h2></div><span class="management-view"><span class="material-symbols-outlined">admin_panel_settings</span>Vista de Jefatura</span></div>
                    <div class="report-filter-grid">
                        <label>Desde<input id="reportDateFrom" type="date" value="${reportState.from}"></label>
                        <label>Hasta<input id="reportDateTo" type="date" value="${reportState.to}"></label>
                        <label>Área<select id="reportArea"><option value="Todas">Todas las áreas</option>${Object.keys(areas).map(function (area) { return `<option value="${escapeHTML(area)}" ${reportState.area === area ? "selected" : ""}>${escapeHTML(area)}</option>`; }).join("")}</select></label>
                        <label>Responsable<select id="reportSpecialist"><option value="Todos">Todos</option>${specialists.map(function (specialist) { return `<option value="${escapeHTML(specialist)}" ${reportState.specialist === specialist ? "selected" : ""}>${escapeHTML(specialist)}</option>`; }).join("")}</select></label>
                        <label>Tipo de paciente<select id="reportPatientType"><option value="Todos">Todos</option><option value="Interno" ${reportState.patientType === "Interno" ? "selected" : ""}>Interno UNEMI</option><option value="Externo" ${reportState.patientType === "Externo" ? "selected" : ""}>Externo</option></select></label>
                        <button class="text-button reset-report-filters" id="resetReportFilters" type="button"><span class="material-symbols-outlined">filter_alt_off</span>Limpiar</button>
                    </div>
                    <p class="report-filter-error" id="reportFilterError" role="alert"></p>
                </section>

                <section class="report-kpi-grid">
                    ${reportMetric("event_note", "Citas registradas", metrics.totalAppointments, "En el período", "blue")}
                    ${reportMetric("edit_calendar", "Reagendadas", metrics.rescheduled, "Movimientos registrados", "violet")}
                    ${reportMetric("person_off", "Ausencias", metrics.absent, `${metrics.absenceRate}% de ausentismo`, "orange")}
                    ${reportMetric("move_up", "Derivaciones internas", metrics.internalReferrals, "Entre áreas UNEMI", "green")}
                    ${reportMetric("open_in_new", "Derivaciones externas", metrics.externalReferrals, "Redes externas", "red")}
                </section>

                <div class="report-chart-grid">
                    <section class="panel report-chart-panel">
                        <div class="panel-heading compact"><div><span class="eyebrow">Distribución</span><h2>Citas por área</h2></div><span class="chart-total">${metrics.totalAppointments} citas</span></div>
                        ${renderAreaBars(data.appointments)}
                    </section>
                    <section class="panel report-chart-panel patient-chart-panel">
                        <div class="panel-heading compact"><div><span class="eyebrow">Segmentación</span><h2>Tipo de paciente</h2></div></div>
                        ${renderPatientDonut(data.appointments)}
                    </section>
                    <section class="panel report-chart-panel">
                        <div class="panel-heading compact"><div><span class="eyebrow">Flujo</span><h2>Destino de derivaciones</h2></div></div>
                        ${renderReferralBars(metrics)}
                    </section>
                </div>

                <section class="panel report-detail-panel">
                    <div class="report-tabs" role="tablist" aria-label="Detalle del reporte">
                        ${["Atenciones", "Derivaciones", "Procesos"].map(function (tab) { return `<button type="button" role="tab" aria-selected="${reportState.tab === tab}" class="${reportState.tab === tab ? "active" : ""}" data-report-tab="${tab}">${tab}<span>${getTabCount(tab, data)}</span></button>`; }).join("")}
                    </div>
                    <div class="report-table-heading"><div><span class="eyebrow">Detalle filtrado</span><h2>${escapeHTML(reportState.tab)}</h2></div><button class="secondary-action compact-action" type="button" data-export-reports><span class="material-symbols-outlined">table_view</span>Exportar Excel</button></div>
                    <div class="table-wrap">${renderReportTable(data)}</div>
                </section>
            `;
            setupReportEvents();
        }

        function reportMetric(icon, label, value, detail, tone) {
            return `<article class="report-kpi ${tone}"><span class="material-symbols-outlined">${icon}</span><div><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong><p>${escapeHTML(detail)}</p></div></article>`;
        }

        function getSpecialists() {
            return Array.from(new Set([
                ...Object.values(areas).flat(),
                ...getAppointments().map(function (item) { return item.specialist; }),
                ...getProcesses().map(function (item) { return item.specialist; }),
                ...safeParse("derivaciones", []).map(function (item) { return item.specialist; })
            ].filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, "es"); });
        }

        function patientTypeFor(patientId) {
            const patient = getPatient(patientId);
            return patient ? patient.tipoPaciente || "Interno" : "No registrado";
        }

        function inDateRange(date) {
            return Boolean(date) && date >= reportState.from && date <= reportState.to;
        }

        function matchesCommon(item) {
            const type = patientTypeFor(item.patientId);
            const matchesArea = reportState.area === "Todas" || item.area === reportState.area || item.destination === reportState.area;
            const matchesSpecialist = reportState.specialist === "Todos" || item.specialist === reportState.specialist;
            const matchesType = reportState.patientType === "Todos" || type === reportState.patientType;
            return matchesArea && matchesSpecialist && matchesType;
        }

        function referralScope(referral) {
            if (referral.scope) return referral.scope;
            return Object.prototype.hasOwnProperty.call(areas, referral.destination) ? "Interna" : "Externa";
        }

        function buildFilteredData() {
            const appointments = getAppointments().filter(function (item) { return inDateRange(item.date) && matchesCommon(item); });
            const referrals = safeParse("derivaciones", []).map(function (item) { return { ...item, scope: referralScope(item) }; }).filter(function (item) { return inDateRange(item.date) && matchesCommon(item); });
            const history = safeParse("historialCitas", []).filter(function (item) {
                const eventDate = String(item.changedAt || item.newDate || "").slice(0, 10);
                return item.type === "Reagendada" && inDateRange(eventDate) && matchesCommon(item);
            });
            const processes = getProcesses().filter(function (process) {
                if (!matchesCommon(process)) return false;
                const dates = (process.sessions || []).map(function (session) { return session.date; }).filter(Boolean);
                return dates.some(inDateRange) || inDateRange(String(process.openedAt || "").slice(0, 10)) || inDateRange(String(process.closedAt || "").slice(0, 10));
            });
            return { appointments: appointments, referrals: referrals, history: history, processes: processes };
        }

        function calculateReportMetrics(data) {
            const absent = data.appointments.filter(function (item) { return item.status === "Ausente"; }).length;
            const internalReferrals = data.referrals.filter(function (item) { return item.scope === "Interna"; }).length;
            const externalReferrals = data.referrals.filter(function (item) { return item.scope === "Externa"; }).length;
            return {
                totalAppointments: data.appointments.length,
                rescheduled: data.history.length,
                absent: absent,
                absenceRate: data.appointments.length ? Math.round((absent / data.appointments.length) * 100) : 0,
                internalReferrals: internalReferrals,
                externalReferrals: externalReferrals
            };
        }

        function renderAreaBars(appointments) {
            const counts = Object.keys(areas).map(function (area) {
                return { area: area, value: appointments.filter(function (item) { return item.area === area; }).length };
            });
            const maximum = Math.max(1, ...counts.map(function (item) { return item.value; }));
            return `<div class="horizontal-chart">${counts.map(function (item) { return `<div><span>${escapeHTML(item.area)}</span><i><b style="width:${(item.value / maximum) * 100}%"></b></i><strong>${item.value}</strong></div>`; }).join("")}</div>`;
        }

        function renderPatientDonut(appointments) {
            const internals = appointments.filter(function (item) { return patientTypeFor(item.patientId) === "Interno"; }).length;
            const externals = appointments.filter(function (item) { return patientTypeFor(item.patientId) === "Externo"; }).length;
            const total = internals + externals;
            const percentage = total ? Math.round((internals / total) * 100) : 0;
            return `<div class="patient-donut-layout"><div class="patient-donut" style="--internal-angle:${percentage * 3.6}deg"><span><strong>${total}</strong><small>registros</small></span></div><div class="donut-legend"><span><i class="internal"></i>Internos <strong>${internals}</strong></span><span><i class="external"></i>Externos <strong>${externals}</strong></span></div></div>`;
        }

        function renderReferralBars(metrics) {
            const maximum = Math.max(1, metrics.internalReferrals, metrics.externalReferrals);
            return `<div class="referral-comparison"><div><span>Internas</span><i><b class="internal" style="width:${(metrics.internalReferrals / maximum) * 100}%"></b></i><strong>${metrics.internalReferrals}</strong></div><div><span>Externas</span><i><b class="external" style="width:${(metrics.externalReferrals / maximum) * 100}%"></b></i><strong>${metrics.externalReferrals}</strong></div></div>`;
        }

        function getTabCount(tab, data) {
            if (tab === "Atenciones") return data.appointments.length + data.history.length;
            if (tab === "Derivaciones") return data.referrals.length;
            return data.processes.length;
        }

        function renderReportTable(data) {
            if (reportState.tab === "Derivaciones") return renderReferralTable(data.referrals);
            if (reportState.tab === "Procesos") return renderProcessTable(data.processes);
            return renderAppointmentTable(data.appointments, data.history);
        }

        function emptyReportRow(columns) {
            return `<tr><td colspan="${columns}"><div class="empty-state compact"><span class="material-symbols-outlined">search_off</span><p>No hay registros para los filtros seleccionados.</p></div></td></tr>`;
        }

        function renderAppointmentTable(appointments, history) {
            const rows = appointments.map(function (item) {
                return { date: item.date, time: item.time, patientName: item.patientName, patientId: item.patientId, area: item.area, specialist: item.specialist, status: item.status };
            }).concat(history.map(function (item) {
                return { date: String(item.changedAt || item.newDate).slice(0, 10), time: item.newTime || "--", patientName: item.patientName, patientId: item.patientId, area: item.area, specialist: item.specialist, status: "Reagendada" };
            })).sort(function (a, b) { return `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`); });
            return `<table class="data-table report-data-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Área</th><th>Responsable</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>${rows.length ? rows.map(function (item) { return `<tr><td><strong>${formatDate(item.date)}</strong><small>${escapeHTML(item.time || "--")}</small></td><td><strong>${escapeHTML(item.patientName)}</strong></td><td>${escapeHTML(item.area)}</td><td>${escapeHTML(item.specialist)}</td><td><span class="type-badge ${patientTypeFor(item.patientId).toLowerCase()}">${escapeHTML(patientTypeFor(item.patientId))}</span></td><td><span class="report-status ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td></tr>`; }).join("") : emptyReportRow(6)}</tbody></table>`;
        }

        function renderReferralTable(referrals) {
            return `<table class="data-table report-data-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Origen</th><th>Destino</th><th>Responsable</th><th>Alcance</th><th>Estado</th></tr></thead><tbody>${referrals.length ? referrals.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (item) { return `<tr><td><strong>${formatDate(item.date)}</strong></td><td><strong>${escapeHTML(item.patientName)}</strong><small>${escapeHTML(patientTypeFor(item.patientId))}</small></td><td>${escapeHTML(item.area)}</td><td>${escapeHTML(item.destination)}</td><td>${escapeHTML(item.specialist || "Por confirmar")}</td><td><span class="scope-badge ${item.scope.toLowerCase()}">${escapeHTML(item.scope)}</span></td><td><span class="report-status ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td></tr>`; }).join("") : emptyReportRow(7)}</tbody></table>`;
        }

        function renderProcessTable(processes) {
            return `<table class="data-table report-data-table"><thead><tr><th>Paciente</th><th>Área</th><th>Responsable</th><th>Tipo</th><th>Sesiones</th><th>Última atención</th><th>Estado</th></tr></thead><tbody>${processes.length ? processes.map(function (process) { const attended = getAttendedSessions(process); const last = attended[attended.length - 1]; return `<tr><td><strong>${escapeHTML(process.patientName)}</strong><small>${escapeHTML(process.id)}</small></td><td>${escapeHTML(process.area)}</td><td>${escapeHTML(process.specialist)}</td><td><span class="type-badge ${patientTypeFor(process.patientId).toLowerCase()}">${escapeHTML(patientTypeFor(process.patientId))}</span></td><td><strong>${attended.length}</strong><small>de ${(process.sessions || []).length}</small></td><td>${last ? formatDate(last.date) : "Sin atención"}</td><td><span class="report-status ${statusClass(process.status)}">${escapeHTML(process.status)}</span></td></tr>`; }).join("") : emptyReportRow(7)}</tbody></table>`;
        }

        function statusClass(status) {
            const value = String(status || "").toLowerCase();
            if (["atendida", "activo", "agendada", "programada"].includes(value)) return "positive";
            if (["ausente", "cerrado", "de alta", "remitida"].includes(value)) return "muted";
            if (value === "reagendada") return "warning";
            return "info";
        }

        function setupReportEvents() {
            const bindings = [
                ["reportDateFrom", "from"],
                ["reportDateTo", "to"],
                ["reportArea", "area"],
                ["reportSpecialist", "specialist"],
                ["reportPatientType", "patientType"]
            ];
            bindings.forEach(function (binding) {
                document.getElementById(binding[0]).addEventListener("change", function (event) {
                    reportState[binding[1]] = event.target.value;
                    if (reportState.from > reportState.to) {
                        document.getElementById("reportFilterError").textContent = "La fecha inicial no puede ser posterior a la fecha final.";
                        return;
                    }
                    renderReportes();
                });
            });
            document.getElementById("resetReportFilters").addEventListener("click", function () {
                reportState.from = `${today.slice(0, 7)}-01`;
                reportState.to = endOfMonth(today);
                reportState.area = "Todas";
                reportState.specialist = "Todos";
                reportState.patientType = "Todos";
                renderReportes();
            });
            contentRoot.querySelectorAll("[data-report-tab]").forEach(function (button) {
                button.addEventListener("click", function () { reportState.tab = button.dataset.reportTab; renderReportes(); });
            });
            contentRoot.querySelectorAll("[data-export-reports]").forEach(function (button) {
                button.addEventListener("click", exportReportWorkbook);
            });
        }

        function exportReportWorkbook() {
            if (reportState.from > reportState.to) {
                showToast("Corrige el rango de fechas antes de exportar.", "warning");
                return;
            }
            const data = buildFilteredData();
            const metrics = calculateReportMetrics(data);
            const workbook = buildWorkbook(data, metrics);
            downloadBlob(workbook, `reportes-unemi-${reportState.from}-${reportState.to}.xlsx`);
            showToast("Reporte Excel generado con resumen y detalle filtrado.");
        }

        function buildWorkbook(data, metrics) {
            const areaRows = Object.keys(areas).map(function (area) { return [area, data.appointments.filter(function (item) { return item.area === area; }).length]; });
            const summaryRows = [
                [xlsxCell("REPORTE INSTITUCIONAL UNEMI", "string", 1)],
                [xlsxCell("Salud y Desarrollo Humano", "string", 2)],
                [],
                [xlsxCell("Filtros aplicados", "string", 2)],
                ["Desde", xlsxCell(reportState.from, "date", 3)],
                ["Hasta", xlsxCell(reportState.to, "date", 3)],
                ["Área", reportState.area],
                ["Responsable", reportState.specialist],
                ["Tipo de paciente", reportState.patientType],
                [],
                [xlsxCell("Indicador", "string", 1), xlsxCell("Valor", "string", 1)],
                ["Citas registradas", metrics.totalAppointments],
                ["Citas reagendadas", metrics.rescheduled],
                ["Ausencias", metrics.absent],
                ["Tasa de ausentismo", xlsxCell(metrics.absenceRate / 100, "number", 4)],
                ["Derivaciones internas", metrics.internalReferrals],
                ["Derivaciones externas", metrics.externalReferrals],
                [],
                [xlsxCell("Citas por área", "string", 2)],
                [xlsxCell("Área", "string", 1), xlsxCell("Total", "string", 1)],
                ...areaRows
            ];

            const appointmentRows = [["Fecha", "Hora", "Paciente", "Documento", "Tipo", "Área", "Responsable", "Estado"]];
            data.appointments.forEach(function (item) {
                const patient = getPatient(item.patientId) || {};
                appointmentRows.push([xlsxCell(item.date, "date", 3), item.time || "", item.patientName, patient.cedula || "", patientTypeFor(item.patientId), item.area, item.specialist, item.status]);
            });
            data.history.forEach(function (item) {
                const patient = getPatient(item.patientId) || {};
                appointmentRows.push([xlsxCell(String(item.changedAt || item.newDate).slice(0, 10), "date", 3), item.newTime || "", item.patientName, patient.cedula || "", patientTypeFor(item.patientId), item.area, item.specialist, "Reagendada"]);
            });

            const referralRows = [["Fecha", "Paciente", "Documento", "Tipo", "Área origen", "Destino", "Responsable", "Alcance", "Estado"]];
            data.referrals.forEach(function (item) {
                const patient = getPatient(item.patientId) || {};
                referralRows.push([xlsxCell(item.date, "date", 3), item.patientName, patient.cedula || "", patientTypeFor(item.patientId), item.area, item.destination, item.specialist || "", item.scope, item.status]);
            });

            const processRows = [["Proceso", "Paciente", "Documento", "Tipo", "Área", "Responsable", "Sesiones atendidas", "Estado"]];
            data.processes.forEach(function (process) {
                const patient = getPatient(process.patientId) || {};
                processRows.push([process.id, process.patientName, patient.cedula || "", patientTypeFor(process.patientId), process.area, process.specialist, getAttendedSessions(process).length, process.status]);
            });

            return createXlsx([
                { name: "Resumen", rows: summaryRows, widths: [30, 24], freezeRow: 0, filterRow: 0 },
                { name: "Atenciones", rows: appointmentRows, widths: [14, 10, 28, 16, 14, 20, 25, 16], freezeRow: 1, filterRow: 1 },
                { name: "Derivaciones", rows: referralRows, widths: [14, 28, 16, 14, 20, 24, 25, 14, 16], freezeRow: 1, filterRow: 1 },
                { name: "Procesos", rows: processRows, widths: [24, 28, 16, 14, 20, 25, 18, 16], freezeRow: 1, filterRow: 1 }
            ]);
        }

        function xlsxCell(value, type, style) {
            return { value: value, type: type || "string", style: style || 0 };
        }

        function xmlEscape(value) {
            return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
        }

        function excelColumn(index) {
            let value = index + 1;
            let label = "";
            while (value > 0) {
                value -= 1;
                label = String.fromCharCode(65 + (value % 26)) + label;
                value = Math.floor(value / 26);
            }
            return label;
        }

        function excelDateSerial(dateString) {
            const parts = dateString.split("-").map(Number);
            return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000) + 25569;
        }

        function worksheetXml(sheet) {
            const rowXml = sheet.rows.map(function (row, rowIndex) {
                const cells = row.map(function (raw, columnIndex) {
                    const cell = raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, "value") ? raw : xlsxCell(raw, typeof raw === "number" ? "number" : "string", rowIndex === 0 && sheet.filterRow === 1 ? 1 : 0);
                    const reference = `${excelColumn(columnIndex)}${rowIndex + 1}`;
                    const style = cell.style ? ` s="${cell.style}"` : "";
                    if (cell.type === "number") return `<c r="${reference}"${style} t="n"><v>${Number(cell.value) || 0}</v></c>`;
                    if (cell.type === "date") return `<c r="${reference}"${style || ' s="3"'} t="n"><v>${excelDateSerial(cell.value)}</v></c>`;
                    return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.value)}</t></is></c>`;
                }).join("");
                return `<row r="${rowIndex + 1}">${cells}</row>`;
            }).join("");
            const columns = sheet.widths.map(function (width, index) { return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`; }).join("");
            const maxColumn = excelColumn(Math.max(0, ...sheet.rows.map(function (row) { return row.length - 1; })));
            const maxRow = Math.max(1, sheet.rows.length);
            const pane = sheet.freezeRow ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>` : "";
            const autoFilter = sheet.filterRow ? `<autoFilter ref="A${sheet.filterRow}:${maxColumn}${maxRow}"/>` : "";
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${maxColumn}${maxRow}"/><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columns}</cols><sheetData>${rowXml}</sheetData>${autoFilter}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
        }

        function createXlsx(sheets) {
            const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map(function (_, index) { return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; }).join("")}</Types>`;
            const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
            const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(function (sheet, index) { return `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`; }).join("")}</sheets></workbook>`;
            const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map(function (_, index) { return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`; }).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
            const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF003B5C"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF003B5C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F3F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD9E3E7"/></left><right style="thin"><color rgb="FFD9E3E7"/></right><top style="thin"><color rgb="FFD9E3E7"/></top><bottom style="thin"><color rgb="FFD9E3E7"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
            const files = [
                { name: "[Content_Types].xml", data: contentTypes },
                { name: "_rels/.rels", data: rootRels },
                { name: "xl/workbook.xml", data: workbook },
                { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
                { name: "xl/styles.xml", data: styles }
            ];
            sheets.forEach(function (sheet, index) { files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, data: worksheetXml(sheet) }); });
            return new Blob([createStoredZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        }

        function createStoredZip(files) {
            const encoder = new TextEncoder();
            const localParts = [];
            const centralParts = [];
            let offset = 0;
            const stamp = dosTimestamp(new Date());
            files.forEach(function (file) {
                const name = encoder.encode(file.name);
                const data = encoder.encode(file.data);
                const checksum = crc32(data);
                const local = new Uint8Array(30 + name.length + data.length);
                const localView = new DataView(local.buffer);
                localView.setUint32(0, 0x04034b50, true);
                localView.setUint16(4, 20, true);
                localView.setUint16(6, 0, true);
                localView.setUint16(8, 0, true);
                localView.setUint16(10, stamp.time, true);
                localView.setUint16(12, stamp.date, true);
                localView.setUint32(14, checksum, true);
                localView.setUint32(18, data.length, true);
                localView.setUint32(22, data.length, true);
                localView.setUint16(26, name.length, true);
                localView.setUint16(28, 0, true);
                local.set(name, 30);
                local.set(data, 30 + name.length);
                localParts.push(local);

                const central = new Uint8Array(46 + name.length);
                const centralView = new DataView(central.buffer);
                centralView.setUint32(0, 0x02014b50, true);
                centralView.setUint16(4, 20, true);
                centralView.setUint16(6, 20, true);
                centralView.setUint16(8, 0, true);
                centralView.setUint16(10, 0, true);
                centralView.setUint16(12, stamp.time, true);
                centralView.setUint16(14, stamp.date, true);
                centralView.setUint32(16, checksum, true);
                centralView.setUint32(20, data.length, true);
                centralView.setUint32(24, data.length, true);
                centralView.setUint16(28, name.length, true);
                centralView.setUint32(42, offset, true);
                central.set(name, 46);
                centralParts.push(central);
                offset += local.length;
            });
            const centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
            const end = new Uint8Array(22);
            const endView = new DataView(end.buffer);
            endView.setUint32(0, 0x06054b50, true);
            endView.setUint16(8, files.length, true);
            endView.setUint16(10, files.length, true);
            endView.setUint32(12, centralSize, true);
            endView.setUint32(16, offset, true);
            return concatenateBytes([...localParts, ...centralParts, end]);
        }

        function dosTimestamp(date) {
            return {
                time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
                date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
            };
        }

        const crcTable = Array.from({ length: 256 }, function (_, index) {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
            return value >>> 0;
        });

        function crc32(bytes) {
            let crc = 0xffffffff;
            bytes.forEach(function (byte) { crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); });
            return (crc ^ 0xffffffff) >>> 0;
        }

        function concatenateBytes(parts) {
            const size = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
            const result = new Uint8Array(size);
            let offset = 0;
            parts.forEach(function (part) { result.set(part, offset); offset += part.length; });
            return result;
        }

        function downloadBlob(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        }

        function handlePrimaryAction(section) {
            if (section === "Reportes") {
                exportReportWorkbook();
                return;
            }
            const process = getProcesses().find(function (item) { return item.id === informeState.selectedProcessId; });
            if (!process) {
                showToast("Selecciona un proceso clínico para generar el informe.", "warning");
                return;
            }
            generateInstitutionalPdf(process);
        }

        return {
            renderInformes,
            renderReportes,
            handlePrimaryAction
        };
    };
}());