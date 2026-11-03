
const generateBtn = document.getElementById("generateBtn");
const tasksInput = document.getElementById("tasks");
const startTimeInput = document.getElementById("startTime");
const resultSection = document.getElementById("resultSection");
const scheduleResult = document.getElementById("scheduleResult");
const newScheduleBtn = document.getElementById("newScheduleBtn");


// ГЕНЕРАЦІЯ РОЗКЛАДУ

generateBtn.addEventListener("click", async () => {
    const tasks = tasksInput.value.trim();
    const startTime = startTimeInput.value;

    if (!tasks) {
        alert("Спочатку введи свої завдання!");
        tasksInput.focus();
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "✦ Створюємо твій розклад...";

    resultSection.classList.remove("hidden");
    scheduleResult.textContent = "ШІ планує твій день...";

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tasks: tasks,
                start_time: startTime
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Сталася помилка.");
        }

        renderSchedule(data.schedule);

        // Очищення поля після успішної генерації
        tasksInput.value = "";

    } catch (error) {
        scheduleResult.innerHTML = "";

        const message = document.createElement("div");
        message.className = "error-message";
        message.textContent = error.message;

        scheduleResult.appendChild(message);

    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML =
            '<span>✦</span> Створити мій розклад <span class="arrow">→</span>';
    }
});


// СТВОРЕННЯ НОВОГО РОЗКЛАДУ

newScheduleBtn.addEventListener("click", () => {
    // Очищаємо поле завдань
    tasksInput.value = "";

    // Приховуємо попередній розклад
    resultSection.classList.add("hidden");

    // Очищаємо старий результат
    scheduleResult.innerHTML = "";

    // Повертаємо сторінку вгору
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    // Фокусуємо поле завдань
    tasksInput.focus();
});


// ВІДОБРАЖЕННЯ РОЗКЛАДУ

function renderSchedule(schedule) {
    scheduleResult.innerHTML = "";

    // Прогрес виконання
    const progressSection = document.createElement("div");
    progressSection.className = "progress-section";

    const progressHeader = document.createElement("div");
    progressHeader.className = "progress-header";

    const progressTitle = document.createElement("h3");
    progressTitle.textContent = "Твій прогрес сьогодні";

    const progressPercent = document.createElement("span");
    progressPercent.className = "progress-percent";
    progressPercent.textContent = "0%";

    progressHeader.append(progressTitle, progressPercent);

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";

    progressBar.appendChild(progressFill);

    const progressCount = document.createElement("p");
    progressCount.className = "progress-count";
    progressCount.textContent = "Виконано 0 завдань";

    progressSection.append(
        progressHeader,
        progressBar,
        progressCount
    );

    scheduleResult.appendChild(progressSection);

    // Статистика дня
    const stats = document.createElement("div");
    stats.className = "schedule-stats";

    const statItems = [
        { icon: "◷", value: schedule.total_hours, label: "Заплановано" },
        {
            icon: "✓",
            value: schedule.tasks.filter(task => task.type !== "break").length,
            label: "Завдань"
        },
        { icon: "☕", value: schedule.break_time, label: "Перерви" }
    ];

    statItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "stat-card";

        const icon = document.createElement("span");
        icon.className = "stat-icon";
        icon.textContent = item.icon;

        const value = document.createElement("strong");
        value.textContent = item.value;

        const label = document.createElement("small");
        label.textContent = item.label;

        card.append(icon, value, label);
        stats.appendChild(card);
    });

    scheduleResult.appendChild(stats);

    // Короткий опис
    if (schedule.summary) {
        const summary = document.createElement("p");
        summary.className = "schedule-summary";
        summary.textContent = schedule.summary;
        scheduleResult.appendChild(summary);
    }

    // Список завдань
    const timeline = document.createElement("div");
    timeline.className = "timeline";

    let completedTasks = 0;
    let celebrationShown = false;

    const taskCountElement = stats.querySelectorAll("strong")[1];

    function getMainTasks() {
        return schedule.tasks.filter(task => task.type !== "break");
    }

    // Оновлення прогресу
    function updateProgress() {
        const total = getMainTasks().length;

        const percent = total > 0
            ? Math.round((completedTasks / total) * 100)
            : 0;

        progressPercent.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;

        progressCount.textContent =
            `Виконано ${completedTasks} із ${total} завдань`;

        taskCountElement.textContent = total;

        if (percent === 100 && total > 0) {
            progressTitle.textContent = "Усі завдання виконано! 🎉";
            progressSection.classList.add("all-completed");

            if (!celebrationShown) {
                celebrationShown = true;
                showCelebration(progressSection);
            }

        } else {
            progressTitle.textContent = "Твій прогрес сьогодні";
            progressSection.classList.remove("all-completed");
        }
    }

    // Створення карток завдань
    schedule.tasks.forEach(task => {
        const card = document.createElement("div");

        card.className = task.type === "break"
            ? "timeline-card break-card"
            : "timeline-card";

        const top = document.createElement("div");
        top.className = "timeline-top";

        const time = document.createElement("span");
        time.className = "task-time";
        time.textContent = `${task.start} – ${task.end}`;

        const priority = document.createElement("span");

        const priorities = {
            high: "Високий пріоритет",
            medium: "Середній пріоритет",
            low: task.type === "break"
                ? "Перерва"
                : "Низький пріоритет"
        };

        priority.className = `priority priority-${task.priority}`;
        priority.textContent =
            priorities[task.priority] || "Завдання";

        top.append(time, priority);

        const title = document.createElement("h3");
        title.textContent = task.title;

        const details = document.createElement("div");
        details.className = "task-details";
        details.textContent = `◷ ${task.duration}`;

        const note = document.createElement("p");
        note.className = "task-note";
        note.textContent = task.note || "";

        card.append(top, title, details, note);

        // Кнопки для основних завдань
        if (task.type !== "break") {
            const actions = document.createElement("div");
            actions.className = "task-actions";

            // Кнопка виконання
            const completeBtn = document.createElement("button");
            completeBtn.className = "complete-btn";
            completeBtn.type = "button";

            const checkIcon = document.createElement("span");
            checkIcon.className = "check-icon";
            checkIcon.textContent = "✓";

            const btnText = document.createElement("span");
            btnText.textContent = "Виконано";

            completeBtn.append(checkIcon, btnText);

            completeBtn.addEventListener("click", () => {
                const isCompleted = card.classList.toggle("completed");

                if (isCompleted) {
                    completedTasks++;
                    btnText.textContent = "Завдання виконано";
                } else {
                    completedTasks--;
                    btnText.textContent = "Виконано";
                }

                completeBtn.classList.toggle("is-done", isCompleted);

                updateProgress();
            });

            // Кнопка редагування
            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.type = "button";
            editBtn.textContent = "✏️ Редагувати";

            // Форма редагування
            const editForm = document.createElement("form");
            editForm.className = "task-edit-form";
            editForm.style.display = "none";

            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.value = task.title;
            titleInput.placeholder = "Назва завдання";
            titleInput.required = true;

            const durationInput = document.createElement("input");
            durationInput.type = "text";
            durationInput.value = task.duration;
            durationInput.placeholder = "Тривалість";
            durationInput.required = true;

            const noteInput = document.createElement("textarea");
            noteInput.value = task.note || "";
            noteInput.placeholder = "Примітка до завдання";

            const formButtons = document.createElement("div");
            formButtons.className = "edit-form-buttons";

            const saveBtn = document.createElement("button");
            saveBtn.type = "submit";
            saveBtn.className = "save-btn";
            saveBtn.textContent = "💾 Зберегти";

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "cancel-btn";
            cancelBtn.textContent = "Скасувати";

            formButtons.append(saveBtn, cancelBtn);

            editForm.append(
                titleInput,
                durationInput,
                noteInput,
                formButtons
            );

            editBtn.addEventListener("click", () => {
                const isHidden = editForm.style.display === "none";

                editForm.style.display = isHidden ? "flex" : "none";
                editBtn.textContent = isHidden
                    ? "✏️ Закрити редагування"
                    : "✏️ Редагувати";

                if (isHidden) {
                    titleInput.value = task.title;
                    durationInput.value = task.duration;
                    noteInput.value = task.note || "";
                    titleInput.focus();
                }
            });

            // Збереження змін та генерація примітки
            editForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const newTitle = titleInput.value.trim();
                const newDuration = durationInput.value.trim();
                const newNote = noteInput.value.trim();

                if (!newTitle) {
                    alert("Назва завдання не може бути порожньою!");
                    titleInput.focus();
                    return;
                }

                if (!newDuration) {
                    alert("Вкажи тривалість завдання!");
                    durationInput.focus();
                    return;
                }

                const titleChanged = newTitle !== task.title;
                const noteChanged = newNote !== (task.note || "");

                saveBtn.disabled = true;

                try {
                    let finalNote = newNote;

                    // Автоматична генерація примітки
                    if (titleChanged && !noteChanged) {
                        saveBtn.textContent = "✦ Генеруємо примітку...";

                        const response = await fetch("/generate-note", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                title: newTitle
                            })
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                data.error || "Не вдалося створити примітку."
                            );
                        }

                        finalNote = data.note;
                    }

                    // Оновлюємо завдання
                    task.title = newTitle;
                    task.duration = newDuration;
                    task.note = finalNote;

                    title.textContent = task.title;
                    details.textContent = `◷ ${task.duration}`;
                    note.textContent = task.note;

                    noteInput.value = finalNote;

                    editForm.style.display = "none";
                    editBtn.textContent = "✏️ Редагувати";

                } catch (error) {
                    alert(error.message);

                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "💾 Зберегти";
                }
            });

            // Скасування редагування
            cancelBtn.addEventListener("click", () => {
                titleInput.value = task.title;
                durationInput.value = task.duration;
                noteInput.value = task.note || "";

                editForm.style.display = "none";
                editBtn.textContent = "✏️ Редагувати";
            });

            // Кнопка видалення
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.type = "button";
            deleteBtn.textContent = "🗑 Видалити";

            deleteBtn.addEventListener("click", () => {
                const confirmed = confirm(
                    `Ти справді хочеш видалити завдання "${task.title}"?`
                );

                if (!confirmed) return;

                if (card.classList.contains("completed")) {
                    completedTasks--;
                }

                const index = schedule.tasks.indexOf(task);

                if (index !== -1) {
                    schedule.tasks.splice(index, 1);
                }

                card.remove();

                updateProgress();
            });

            actions.append(editBtn, deleteBtn);

            card.append(completeBtn, actions, editForm);
        }

        timeline.appendChild(card);
    });

    scheduleResult.appendChild(timeline);

    // Мотивація
    if (schedule.motivation) {
        const motivation = document.createElement("div");
        motivation.className = "motivation-card";

        const motivationTitle = document.createElement("h3");
        motivationTitle.textContent = "✦ Ти все зможеш!";

        const motivationText = document.createElement("p");
        motivationText.textContent = schedule.motivation;

        motivation.append(motivationTitle, motivationText);
        scheduleResult.appendChild(motivation);
    }

    updateProgress();
}


// СВЯТКОВА АНІМАЦІЯ

function showCelebration(progressSection) {
    const container = document.createElement("div");
    container.className = "confetti-container";

    const colors = [
        "#8871cf",
        "#b7a1ed",
        "#f5a6c8",
        "#65bd83",
        "#ffd166",
        "#ff8a80"
    ];

    for (let i = 0; i < 100; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti";

        piece.style.left = Math.random() * 100 + "%";

        piece.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];

        piece.style.animationDelay =
            Math.random() * 1.5 + "s";

        piece.style.animationDuration =
            (2 + Math.random() * 2) + "s";

        container.appendChild(piece);
    }

    document.body.appendChild(container);

    // Святкове повідомлення
    const message = document.createElement("div");
    message.className = "celebration-message";

    const heading = document.createElement("h2");
    heading.textContent = "🎉 Чудова робота";

    const text = document.createElement("p");
    text.textContent =
        "Усі завдання виконано! Пишайся собою 💜";

    message.append(heading, text);

    progressSection.after(message);

    setTimeout(() => {
        container.remove();
    }, 5000);
}


// ПЕРЕМИКАЧ ТЕМИ

const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("smartday-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeToggle.textContent = "☀";
    themeToggle.setAttribute("aria-label", "Увімкнути світлу тему");
}

themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-theme");

    if (isDark) {
        localStorage.setItem("smartday-theme", "dark");
        themeToggle.textContent = "☀";
        themeToggle.setAttribute("aria-label", "Увімкнути світлу тему");
    } else {
        localStorage.setItem("smartday-theme", "light");
        themeToggle.textContent = "☾";
        themeToggle.setAttribute("aria-label", "Увімкнути темну тему");
    }
});
