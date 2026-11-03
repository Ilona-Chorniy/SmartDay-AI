
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
) if api_key else None


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate_schedule():
    if not client:
        return jsonify({"error": "API-ключ Groq не налаштований."}), 500

    data = request.get_json() or {}

    tasks = data.get("tasks", "").strip()
    start_time = data.get("start_time", "09:00")

    if not tasks:
        return jsonify({"error": "Введи свої завдання."}), 400

    prompt = f"""
Ти — професійний AI-планувальник дня.

Створи реалістичний розклад українською мовою.

Початок дня: {start_time}

Завдання:
{tasks}

Поверни виключно JSON без Markdown та додаткового тексту.

Використовуй таку структуру:

{{
  "summary": "Короткий опис дня",
  "total_hours": "7 год",
  "task_count": 5,
  "break_time": "1 год",
  "tasks": [
    {{
      "start": "09:00",
      "end": "11:30",
      "title": "Підготовка до іспиту",
      "duration": "2 год 30 хв",
      "type": "task",
      "priority": "high",
      "note": "Повтори основні теми та виконай практичні завдання."
    }},
    {{
      "start": "11:30",
      "end": "11:45",
      "title": "Перерва",
      "duration": "15 хв",
      "type": "break",
      "priority": "low",
      "note": "Відпочинь, випий води та трохи розімнися."
    }}
  ],
  "motivation": "Мотиваційна фраза на день"
}}

Правила:
- Додай усі завдання користувача.
- Розстав час послідовно.
- Додай перерви.
- Не вигадуй зайвих основних завдань.
- Для type використовуй task або break.
- Для priority використовуй high, medium або low.
- Для КОЖНОГО завдання обов'язково створи примітку в полі note.
- Примітка має бути конкретною, корисною та відповідати саме цьому завданню.
- Не використовуй загальні фрази на кшталт "Виконай це завдання".
- Для перерв також створи відповідну примітку.
- Поверни тільки коректний JSON.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Ти створюєш структуровані плани дня у форматі JSON. Кожне завдання повинно мати змістовну примітку."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=4000
        )

        result = response.choices[0].message.content.strip()

        if result.startswith("```"):
            result = result.split("\n", 1)[1]
            result = result.rsplit("```", 1)[0].strip()

        schedule = json.loads(result)

        # Додаткова генерація приміток, якщо модель їх пропустила
        tasks_without_notes = [
            (index, task)
            for index, task in enumerate(schedule.get("tasks", []))
            if not task.get("note") or not task["note"].strip()
        ]

        if tasks_without_notes:
            titles = [
                task.get("title", "")
                for _, task in tasks_without_notes
            ]

            notes_prompt = f"""
Створи коротку корисну примітку українською мовою
для кожного завдання зі списку.

Завдання:
{json.dumps(titles, ensure_ascii=False)}

Поверни JSON-масив рядків у тому самому порядку.
Кожна примітка має відповідати конкретному завданню.
Не повторюй назву завдання.
Поверни тільки JSON.
"""

            try:
                notes_response = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[
                        {
                            "role": "system",
                            "content": "Ти створюєш короткі примітки до завдань."
                        },
                        {
                            "role": "user",
                            "content": notes_prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )

                notes_result = notes_response.choices[0].message.content.strip()

                if notes_result.startswith("```"):
                    notes_result = notes_result.split("\n", 1)[1]
                    notes_result = notes_result.rsplit("```", 1)[0].strip()

                generated_notes = json.loads(notes_result)

                for position, (index, task) in enumerate(tasks_without_notes):
                    if position < len(generated_notes):
                        task["note"] = generated_notes[position]

            except Exception:
                app.logger.exception("Не вдалося додатково згенерувати примітки")

        return jsonify({"schedule": schedule})

    except Exception:
        app.logger.exception("Помилка генерації розкладу")
        return jsonify({
            "error": "Не вдалося створити розклад. Спробуй ще раз."
        }), 500


# Генерація примітки до відредагованого завдання
@app.route("/generate-note", methods=["POST"])
def generate_note():
    if not client:
        return jsonify({"error": "API-ключ Groq не налаштований."}), 500

    data = request.get_json() or {}
    title = data.get("title", "").strip()

    if not title:
        return jsonify({"error": "Вкажи назву завдання."}), 400

    prompt = f"""
Ти — AI-помічник для планування дня.

Створи коротку, зрозумілу та корисну примітку
до завдання українською мовою.

Назва завдання: {title}

Правила:
- Примітка має відповідати саме назві завдання.
- Одне коротке речення.
- Не повторюй назву завдання дослівно.
- Не додавай час, тривалість або зайві пояснення.
- Поверни тільки текст примітки.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "Ти створюєш короткі примітки до завдань."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=150
        )

        note = response.choices[0].message.content.strip()

        return jsonify({"note": note})

    except Exception:
        app.logger.exception("Помилка генерації примітки")
        return jsonify({
            "error": "Не вдалося створити примітку."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)
