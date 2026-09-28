(function () {
    "use strict";

    if (localStorage.getItem("sesionActiva") !== "true") {
        window.location.replace("login.html");
        return;
    }

    const form = document.getElementById("registrationForm");
    const birthDate = document.getElementById("birthDate");
    const ageResult = document.getElementById("ageResult");
    const representativeSection = document.getElementById("representativeSection");
    const representativeFields = [
        document.getElementById("representativeName"),
        document.getElementById("representativeDocument"),
        document.getElementById("relationship"),
        document.getElementById("representativeContact"),
        document.getElementById("representativePdf")
    ];
    const documentType = document.getElementById("documentType");
    const documentNumber = document.getElementById("documentNumber");
    const phone = document.getElementById("phone");
    const patientType = document.getElementById("patientType");
    const originHelp = document.getElementById("originHelp");
    const representativePdf = document.getElementById("representativePdf");
    const fileTitle = document.getElementById("fileTitle");
    const fileDescription = document.getElementById("fileDescription");
    const fileLabel = document.getElementById("representativeFileLabel");
    const fileError = document.getElementById("fileError");
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    let patientIsMinor = false;

    function safeParse(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function calculateAge(dateString) {
        if (!dateString) return null;
        const birth = new Date(`${dateString}T12:00:00`);
        const now = new Date();
        if (Number.isNaN(birth.getTime()) || birth > now) return null;
        let age = now.getFullYear() - birth.getFullYear();
        const monthDifference = now.getMonth() - birth.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birth.getDate())) age -= 1;
        return age;
    }

    function updateAgeValidation() {
        const age = calculateAge(birthDate.value);
        patientIsMinor = age !== null && age < 18;
        representativeSection.hidden = !patientIsMinor;
        document.getElementById("observationsNumber").textContent = patientIsMinor ? "4" : "3";
        representativeFields.forEach(function (field) {
            field.required = patientIsMinor;
            if (!patientIsMinor) clearFieldError(field);
        });

        if (age === null) {
            ageResult.className = "age-result";
            ageResult.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">cake</span><div><small>Edad calculada</small><strong>Selecciona una fecha válida</strong></div>`;
            return;
        }

        ageResult.className = `age-result ${patientIsMinor ? "minor" : "adult"}`;
        ageResult.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${patientIsMinor ? "family_restroom" : "verified_user"}</span><div><small>Edad calculada</small><strong>${age} años · ${patientIsMinor ? "Menor de edad" : "Mayor de edad"}</strong></div>`;
    }

    function errorElement(field) {
        const wrapper = field.closest(".form-field");
        return wrapper ? wrapper.querySelector(".field-error") : null;
    }

    function setFieldError(field, message) {
        field.classList.add("invalid");
        field.setAttribute("aria-invalid", "true");
        const target = errorElement(field);
        if (target) target.textContent = message;
    }

    function clearFieldError(field) {
        field.classList.remove("invalid");
        field.removeAttribute("aria-invalid");
        const target = errorElement(field);
        if (target) target.textContent = "";
    }

    function validateRequired(field, message) {
        clearFieldError(field);
        if (!String(field.value || "").trim()) {
            setFieldError(field, message || "Este campo es obligatorio.");
            return false;
        }
        return true;
    }

    function validateForm() {
        let valid = true;
        const required = [
            [document.getElementById("firstNames"), "Ingresa los nombres."],
            [document.getElementById("lastNames"), "Ingresa los apellidos."],
            [documentNumber, "Ingresa el documento."],
            [birthDate, "Selecciona la fecha de nacimiento."],
            [patientType, "Selecciona el tipo de paciente."],
            [document.getElementById("gender"), "Selecciona el género."],
            [phone, "Ingresa un número de contacto."],
            [document.getElementById("email"), "Ingresa el correo electrónico."]
        ];

        required.forEach(function (entry) {
            if (!validateRequired(entry[0], entry[1])) valid = false;
        });

        const age = calculateAge(birthDate.value);
        if (birthDate.value && age === null) {
            setFieldError(birthDate, "La fecha no puede ser futura.");
            valid = false;
        }

        if (documentNumber.value.trim()) {
            const documentValid = documentType.value === "Cédula"
                ? /^\d{10}$/.test(documentNumber.value.trim())
                : /^[A-Za-z0-9-]{5,20}$/.test(documentNumber.value.trim());
            if (!documentValid) {
                setFieldError(documentNumber, documentType.value === "Cédula" ? "La cédula debe tener 10 dígitos." : "Ingresa un pasaporte válido.");
                valid = false;
            }
        }

        if (phone.value && !/^\d{10}$/.test(phone.value)) {
            setFieldError(phone, "El teléfono debe tener 10 dígitos.");
            valid = false;
        }

        const email = document.getElementById("email");
        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            setFieldError(email, "Ingresa un correo válido.");
            valid = false;
        }

        const duplicate = safeParse("usuarios", []).some(function (patient) {
            return String(patient.cedula).toLowerCase() === documentNumber.value.trim().toLowerCase();
        });
        if (duplicate) {
            setFieldError(documentNumber, "Ya existe un paciente con este documento.");
            valid = false;
        }

        fileError.textContent = "";
        fileLabel.classList.remove("invalid");
        if (patientIsMinor) {
            representativeFields.slice(0, 4).forEach(function (field) {
                if (!validateRequired(field)) valid = false;
            });
            const representativeDocument = document.getElementById("representativeDocument");
            const representativeContact = document.getElementById("representativeContact");
            if (representativeDocument.value && !/^\d{10}$/.test(representativeDocument.value)) {
                setFieldError(representativeDocument, "La cédula debe tener 10 dígitos.");
                valid = false;
            }
            if (representativeContact.value && !/^\d{10}$/.test(representativeContact.value)) {
                setFieldError(representativeContact, "El contacto debe tener 10 dígitos.");
                valid = false;
            }
            const file = representativePdf.files[0];
            const isPdf = file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
            if (!file || !isPdf) {
                fileError.textContent = "Adjunta obligatoriamente la cédula del representante en PDF.";
                fileLabel.classList.add("invalid");
                valid = false;
            } else if (file.size > 5 * 1024 * 1024) {
                fileError.textContent = "El archivo supera el máximo de 5 MB.";
                fileLabel.classList.add("invalid");
                valid = false;
            }
        }

        return valid;
    }

    function saveRepresentativeFile(recordId, file) {
        if (!file || !window.indexedDB) return Promise.resolve();
        return new Promise(function (resolve, reject) {
            const request = indexedDB.open("SaludUnemiDocumentos", 3);
            request.onupgradeneeded = function () {
                if (!request.result.objectStoreNames.contains("representantes")) {
                    request.result.createObjectStore("representantes");
                }
                if (!request.result.objectStoreNames.contains("consentimientos")) {
                    request.result.createObjectStore("consentimientos");
                }
                if (!request.result.objectStoreNames.contains("evaluaciones")) {
                    request.result.createObjectStore("evaluaciones");
                }
            };
            request.onerror = function () { reject(request.error); };
            request.onsuccess = function () {
                const database = request.result;
                const transaction = database.transaction("representantes", "readwrite");
                transaction.objectStore("representantes").put(file, recordId);
                transaction.oncomplete = function () { database.close(); resolve(); };
                transaction.onerror = function () { database.close(); reject(transaction.error); };
            };
        });
    }

    function showToast(message, tone) {
        toastMessage.textContent = message;
        toast.dataset.tone = tone || "success";
        toast.classList.add("visible");
    }

    async function savePatient(event) {
        event.preventDefault();
        if (!validateForm()) {
            const firstInvalid = form.querySelector(".invalid");
            if (firstInvalid) firstInvalid.focus();
            showToast("Revisa los campos marcados antes de continuar.", "warning");
            return;
        }

        const id = `usuario-${Date.now()}`;
        const firstNames = document.getElementById("firstNames").value.trim();
        const lastNames = document.getElementById("lastNames").value.trim();
        const file = patientIsMinor ? representativePdf.files[0] : null;
        const patient = {
            id: id,
            nombres: firstNames,
            apellidos: lastNames,
            nombre: `${firstNames} ${lastNames}`,
            tipoDocumento: documentType.value,
            cedula: documentNumber.value.trim(),
            fechaNacimiento: birthDate.value,
            tipoPaciente: patientType.value,
            sexo: document.getElementById("gender").value,
            carreraProcedencia: document.getElementById("origin").value.trim(),
            telefono: phone.value.trim(),
            correo: document.getElementById("email").value.trim(),
            observaciones: document.getElementById("observations").value.trim(),
            fechaRegistro: new Date().toISOString(),
            estado: "Activo",
            representante: patientIsMinor ? {
                nombres: document.getElementById("representativeName").value.trim(),
                cedula: document.getElementById("representativeDocument").value.trim(),
                parentesco: document.getElementById("relationship").value,
                contacto: document.getElementById("representativeContact").value.trim(),
                documentoPdf: file.name,
                documentoId: id,
                documentoTamano: file.size
            } : null
        };

        const patients = safeParse("usuarios", []);
        patients.unshift(patient);
        localStorage.setItem("usuarios", JSON.stringify(patients));

        try {
            await saveRepresentativeFile(id, file);
        } catch (error) {
            const updatedPatients = safeParse("usuarios", []).filter(function (item) { return item.id !== id; });
            localStorage.setItem("usuarios", JSON.stringify(updatedPatients));
            showToast("No fue posible guardar el PDF. Intenta nuevamente.", "warning");
            return;
        }

        showToast("Paciente registrado correctamente.");
        window.setTimeout(function () {
            window.location.href = "dashboard.html#usuarios";
        }, 1400);
    }

    function setupCurrentUser() {
        const user = safeParse("usuarioActual", { nombre: "Administrador UNEMI" });
        const names = String(user.nombre || "Administrador UNEMI").split(/\s+/).filter(Boolean);
        document.getElementById("currentUserName").textContent = user.nombre || "Administrador UNEMI";
        document.getElementById("userInitials").textContent = names.slice(0, 2).map(function (name) { return name[0]; }).join("").toUpperCase();
    }

    function setupNavigation() {
        document.getElementById("menuButton").addEventListener("click", function () {
            document.body.classList.toggle("sidebar-collapsed");
        });
        document.getElementById("attentionToggle").addEventListener("click", function () {
            const submenu = document.getElementById("attentionSubmenu");
            const open = submenu.classList.toggle("is-open");
            this.setAttribute("aria-expanded", String(open));
            this.querySelector(".nav-chevron").textContent = open ? "keyboard_arrow_up" : "keyboard_arrow_down";
        });
        const userButton = document.getElementById("userMenuButton");
        const userPopover = document.getElementById("userPopover");
        userButton.addEventListener("click", function () {
            const open = userPopover.hidden;
            userPopover.hidden = !open;
            userButton.setAttribute("aria-expanded", String(open));
        });
        document.getElementById("logoutButton").addEventListener("click", function () {
            localStorage.removeItem("sesionActiva");
            localStorage.removeItem("usuarioActual");
            window.location.replace("login.html");
        });
    }

    birthDate.max = new Date().toISOString().split("T")[0];
    birthDate.addEventListener("change", updateAgeValidation);
    documentType.addEventListener("change", function () {
        documentNumber.value = "";
        documentNumber.placeholder = documentType.value === "Cédula" ? "10 dígitos" : "Número de pasaporte";
        documentNumber.maxLength = documentType.value === "Cédula" ? 10 : 20;
        clearFieldError(documentNumber);
    });
    documentNumber.addEventListener("input", function () {
        if (documentType.value === "Cédula") this.value = this.value.replace(/\D/g, "");
    });
    [phone, document.getElementById("representativeDocument"), document.getElementById("representativeContact")].forEach(function (field) {
        field.addEventListener("input", function () { this.value = this.value.replace(/\D/g, ""); });
    });
    patientType.addEventListener("change", function () {
        originHelp.textContent = patientType.value === "Externo"
            ? "Para pacientes externos, registra la institución o procedencia."
            : "Para pacientes internos, registra su carrera o unidad UNEMI.";
    });
    representativePdf.addEventListener("change", function () {
        fileError.textContent = "";
        fileLabel.classList.remove("invalid");
        const file = representativePdf.files[0];
        if (!file) {
            fileTitle.textContent = "Adjuntar cédula del representante";
            fileDescription.textContent = "Solo PDF · máximo recomendado 5 MB";
            fileLabel.classList.remove("has-file");
            return;
        }
        fileTitle.textContent = file.name;
        fileDescription.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · listo para guardar`;
        fileLabel.classList.add("has-file");
    });
    form.querySelectorAll("input, select, textarea").forEach(function (field) {
        field.addEventListener("input", function () { clearFieldError(field); });
        field.addEventListener("change", function () { clearFieldError(field); });
    });
    form.addEventListener("submit", savePatient);

    setupCurrentUser();
    setupNavigation();
    updateAgeValidation();
}());